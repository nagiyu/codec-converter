# クイックスタート — ローカル開発とデプロイ手順

## 概要
このクイックスタートでは、Next.js アプリをローカルで実行する方法、Docker イメージのビルド、ECR へのプッシュ、および AWS Batch ワーカー用イメージの準備手順を示します。

## ローカル開発（Next.js）

1. 依存関係をインストールします:

```bash
cd web/nextjs
npm install
```

2. Next.js の開発サーバーを起動します:

```bash
npm run dev
# or
next dev
```

3. API ルートを使って事前署名付きのアップロード URL を取得し、ステージング用の Batch キューへジョブを送信します。

## ローカル開発（Batch ワーカー）

1. 依存関係をインストールします:

```bash
cd batch
npm install
```

2. TypeScript をビルドします:

```bash
npm run build
```

3. ローカルでワーカーを実行します（テスト用）:

```bash
npm start
# または開発モード（ts-node）
npm run dev
```

## 本番コンテナのビルド

1. Web コンテナをビルドします:

```bash
cd web/nextjs
docker build -t codec-converter-web:latest .
```

2. バッチワーカー用イメージをビルドします（TypeScript の自動ビルドを含むマルチステージビルド）:

```bash
cd batch
docker build -t codec-converter-batch:latest .
```

## ECR へイメージをプッシュ（例）

1. ECR リポジトリ（存在しない場合）を作成します: `codec-converter-web`, `codec-converter-batch`。
2. 認証してプッシュします:

```bash
# aws-cli v2 の例
aws ecr get-login-password --region <REGION> | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com

docker tag codec-converter-web:latest <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/codec-converter-web:latest
docker push <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/codec-converter-web:latest

docker tag codec-converter-batch:latest <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/codec-converter-batch:latest
docker push <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/codec-converter-batch:latest
```

## Next.js を Lambda コンテナとしてデプロイ

SAM／CloudFormation／Terraform を使い、プッシュした ECR イメージを指す `ImageUri` を持つ Lambda 関数を作成し、パブリック公開のために **Lambda Function URL**（AuthType: NONE）を有効にします。最小限の IAM ロールをアタッチしてください:

- Lambda 用 IAM ロール: `batch:SubmitJob` を呼び出す権限、ジョブメタデータ用の `dynamodb:PutItem`/`UpdateItem`、および検証と出力生成のための適切な S3 権限（`s3:GetObject`/`s3:PutObject`）。Next.js はブラウザ向けアップロード用に事前署名された S3 URL を生成するべきです。事前署名付きアップロード自体は URL の署名で認証されます。

- S3 バケットポリシーはパブリックアクセスを拒否し、Lambda ロールと Batch ロールからの操作のみを許可するように設定してください（事前署名付き URL によるアップロードは短期間で有効な署名により認証されます）。

### サーバーサイドのストリーミングダウンロード（プロキシ）

S3 をユーザーから隠すために、S3 オブジェクトをクライアントへストリーム転送し、`Content-Disposition: attachment` を設定する Next.js の API ルートを実装します。

**実装ファイル**: `web/nextjs/src/app/api/download/[jobId]/route.ts`

**ガイダンス**:

- `GET /api/download/<jobId>` を実装し、以下を行います:
	- DynamoDB による `jobId` の検証（`status = succeeded`、TTL、所有権/権限の確認）。
	- `output_s3_key` に対して S3 の `GetObject` を呼び出し、レスポンスボディを HTTP レスポンスへストリーミングする。
	- ヘッダーを設定する: `Content-Type`、（可能であれば）`Content-Length`、および `Content-Disposition: attachment; filename="<name>"`。

- Lambda の考慮点: Lambda を経由したストリーミングは実行時間とネットワーク転送を消費します。MVP のファイル（<=100MB）程度であれば許容できますが、メモリとタイムアウトを調整してください。非常に大きなファイルや高トラフィックの場合は CloudFront + カスタムドメインへの移行を検討してください。

**使用例**:

```bash
# ジョブ ID を指定してダウンロード
curl -O http://localhost:3000/api/download/test-job-123
```

**本番環境への移行**:

1. AWS SDK をインストール:
   ```bash
   cd web/nextjs
   npm install @aws-sdk/client-s3
   ```

2. `route.ts` 内のスタブ関数を本番実装に置き換え（ファイル内のコメントを参照）

3. 環境変数を設定:
   ```bash
   export AWS_REGION=ap-northeast-1
   export OUTPUT_S3_BUCKET=your-output-bucket-name
   ```

**参考（Next.js App Router での実装例）**:

```typescript
// web/nextjs/src/app/api/download/[jobId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3Client = new S3Client({ region: process.env.AWS_REGION ?? 'ap-northeast-1' });

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
): Promise<NextResponse> {
  const { jobId } = await context.params;

  // 1. DynamoDB でジョブを検証（status = succeeded）
  const job = await getJobFromDynamoDB(jobId);
  if (!job || job.status !== 'succeeded') {
    return NextResponse.json({ error: 'Job not ready' }, { status: 403 });
  }

  // 2. S3 からオブジェクトを取得
  const response = await s3Client.send(new GetObjectCommand({
    Bucket: process.env.OUTPUT_S3_BUCKET,
    Key: job.outputS3Key,
  }));

  // 3. Node.js Readable を Web ReadableStream に変換
  const webStream = Readable.toWeb(response.Body as Readable) as ReadableStream<Uint8Array>;

  // 4. ヘッダーを設定してストリーミング
  const headers = new Headers();
  headers.set('Content-Type', response.ContentType ?? 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${job.outputFilename}"`);
  if (response.ContentLength) {
    headers.set('Content-Length', response.ContentLength.toString());
  }

  return new NextResponse(webStream, { status: 200, headers });
}
```

## Batch リソースのデプロイ

マネージドの Compute Environment、Job Queue、そして `codec-converter-batch` の ECR イメージを参照する Job Definition を作成します。ffmpeg を用いた処理に対応するために vCPU / メモリ / 一時ディスクを適切に設定してください。ジョブコンテナは入力/出力用の S3 Get/Put と進捗／ステータス更新用の DynamoDB 更新を許可する IAM ロールで実行する必要があります。Batch ジョブの実装言語は柔軟で、必要であれば `.NET` 実装でも構いません。

## 注意事項

- Batch ジョブロジックのローカルテストには、テスト用の S3 入力でジョブのエントリポイントをローカル実行する軽量スクリプト（Node/Python/.NET 等）の作成を検討してください。
- 反復開発を速めるために、100MB 未満の小さなサンプル動画を使用してください。
- 統合テスト: 開発用の AWS 環境で直接テストを実行し、S3 アップロード、DynamoDB のエントリ、Batch のサブミッション、エンドツーエンドの出力取得が検証できるようにしてください。
