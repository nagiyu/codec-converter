# クイックスタート — ローカル開発とデプロイ手順

## 概要
このクイックスタートでは、ビデオコーデックコンバータの開発環境セットアップ、ローカルでの実行方法、Docker イメージのビルド、ECR へのプッシュ、および AWS Batch ワーカー用イメージの準備手順を示します。

---

## 前提条件

ローカル開発には以下のツールが必要です：

| ツール | バージョン | 用途 |
|--------|---------|------|
| Node.js | >= 18.0.0 | Next.js と Batch ワーカーの実行 |
| npm | >= 9.0.0 | パッケージ管理 |
| Docker | >= 20.10 | コンテナビルドとローカル実行 |
| AWS CLI v2 | 最新 | AWS サービスとの連携 |
| ffmpeg | >= 5.0 | ローカルでの動画変換テスト（オプション） |

### インストール手順

**Node.js と npm**:
```bash
# nvm を使用する場合（推奨）
nvm install 18
nvm use 18

# または公式サイトからダウンロード
# https://nodejs.org/
```

**Docker**:
```bash
# Docker Desktop をインストール（macOS / Windows）
# https://www.docker.com/products/docker-desktop

# Linux の場合
sudo apt-get update
sudo apt-get install docker.io
sudo usermod -aG docker $USER
```

**AWS CLI**:
```bash
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# 設定
aws configure
```

**ffmpeg（ローカルテスト用、オプション）**:
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg
```

---

## 環境変数

### Next.js（Web アプリケーション）

Next.js アプリケーションには以下の環境変数が必要です。開発時は `web/nextjs/.env.local` ファイルに設定します。

> **Note**: `<ACCOUNT_ID>` は AWS アカウント ID に置き換えてください。  
> 確認コマンド: `aws sts get-caller-identity --query Account --output text`

```bash
# web/nextjs/.env.local

# AWS リージョン
AWS_REGION=ap-northeast-1

# S3 バケット設定
UPLOAD_S3_BUCKET=codec-converter-uploads-dev-<ACCOUNT_ID>
OUTPUT_S3_BUCKET=codec-converter-outputs-dev-<ACCOUNT_ID>

# DynamoDB テーブル
DYNAMODB_TABLE_NAME=Codec-Converter-Entities-dev

# AWS 認証（以下のいずれかの方法を使用）
# 方法 1: AWS CLI プロファイル（推奨）
AWS_PROFILE=default

# 方法 2: IAM ユーザーの認証情報（開発環境のみ、本番では使用しないでください）
# AWS_ACCESS_KEY_ID=<your-access-key>
# AWS_SECRET_ACCESS_KEY=<your-secret-key>

# AWS Batch 設定（ジョブ投入時に必要）
BATCH_JOB_QUEUE=codec-converter-queue-dev
BATCH_JOB_DEFINITION=codec-converter-job-def-dev
```

### Batch ワーカー

Batch ワーカーには以下の環境変数が必要です（AWS Batch ジョブ実行時に設定）。

```bash
# 入力ファイル情報
INPUT_S3_BUCKET=codec-converter-uploads-dev-<ACCOUNT_ID>
INPUT_S3_KEY=uploads/<job-id>/input.mp4

# 出力ファイル情報
OUTPUT_S3_BUCKET=codec-converter-outputs-dev-<ACCOUNT_ID>
OUTPUT_S3_KEY=outputs/<job-id>/output.mp4

# 変換設定
TARGET_CODEC=h264

# ジョブトラッキング
JOB_ID=<uuid>
DYNAMODB_TABLE=Codec-Converter-Entities-dev

# AWS 設定
AWS_REGION=ap-northeast-1
```

---

## ローカル開発（Next.js）

1. 依存関係をインストールします:

```bash
cd web/nextjs
npm install
```

2. 環境変数を設定します:

```bash
# 手動で .env.local を作成
cat > .env.local << 'EOF'
AWS_REGION=ap-northeast-1
UPLOAD_S3_BUCKET=codec-converter-uploads-dev-<ACCOUNT_ID>
OUTPUT_S3_BUCKET=codec-converter-outputs-dev-<ACCOUNT_ID>
DYNAMODB_TABLE_NAME=Codec-Converter-Entities-dev
AWS_PROFILE=default
EOF

# <ACCOUNT_ID> を実際の AWS アカウント ID に置き換えます
# 以下のコマンドで取得できます:
# aws sts get-caller-identity --query Account --output text
```

3. Next.js の開発サーバーを起動します:

```bash
npm run dev
```

4. ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

5. リントチェックを実行:

```bash
npm run lint
```

6. ビルド確認:

```bash
npm run build
```

### API エンドポイント（開発時）

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/api/upload` | POST | 事前署名付きアップロード URL を取得 |
| `/api/jobs` | POST | 変換ジョブを投入 |
| `/api/jobs/[jobId]` | GET | ジョブステータスを取得 |
| `/api/download/[jobId]` | GET | 変換済みファイルをダウンロード |

---

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
# 環境変数を設定してから実行
export INPUT_S3_BUCKET=codec-converter-uploads-dev-<ACCOUNT_ID>
export INPUT_S3_KEY=test/sample.mp4
export OUTPUT_S3_BUCKET=codec-converter-outputs-dev-<ACCOUNT_ID>
export OUTPUT_S3_KEY=test/sample-converted.mp4
export TARGET_CODEC=h264
export JOB_ID=test-job-001
export DYNAMODB_TABLE=Codec-Converter-Entities-dev
export AWS_REGION=ap-northeast-1

npm start
# または開発モード（ts-node）
npm run dev
```

---

## AWS インフラストラクチャのセットアップ

### CloudFormation を使用したリソース作成

最小限の AWS リソース（S3 バケット、DynamoDB テーブル）を作成します：

```bash
# 開発環境用スタックをデプロイ
aws cloudformation deploy \
  --template-file infra/cloudformation/minimal.yaml \
  --stack-name codec-converter-dev \
  --parameter-overrides Environment=dev \
  --capabilities CAPABILITY_IAM \
  --region ap-northeast-1

# 本番環境用スタックをデプロイ
aws cloudformation deploy \
  --template-file infra/cloudformation/minimal.yaml \
  --stack-name codec-converter-prod \
  --parameter-overrides Environment=prod \
  --capabilities CAPABILITY_IAM \
  --region ap-northeast-1
```

### 作成されるリソース

| リソース | 命名規則 | 説明 |
|---------|---------|------|
| S3 アップロードバケット | `codec-converter-uploads-{env}-{account_id}` | アップロードされた動画を保存（7日後に自動削除） |
| S3 出力バケット | `codec-converter-outputs-{env}-{account_id}` | 変換済み動画を保存（30日後に自動削除） |
| DynamoDB テーブル | `Codec-Converter-Entities-{env}` | VideoFile, ConversionJob を保存 |

### スタック出力の確認

```bash
aws cloudformation describe-stacks \
  --stack-name codec-converter-dev \
  --query 'Stacks[0].Outputs' \
  --output table
```

---

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

---

## DevContainer を使用した開発（推奨）

Visual Studio Code の DevContainer を使用すると、開発環境を簡単にセットアップできます。

### セットアップ

1. VS Code に [Dev Containers 拡張機能](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) をインストール

2. リポジトリを開き、コマンドパレット（`F1`）から `Dev Containers: Reopen in Container` を選択

3. Web 開発用の DevContainer には以下が含まれます：
    - Node.js 22
    - AWS CLI

### DevContainer の構成

```
.devcontainer/
├── spec-kit/        # 仕様書作成用
└── web/             # Web 開発用
    └── devcontainer.json
```

---

## トラブルシューティング

### よくある問題と解決方法

| 問題 | 解決方法 |
|------|---------|
| `npm install` で権限エラー | `sudo chown -R $USER:$USER node_modules` を実行 |
| AWS 認証エラー | `aws configure` で認証情報を再設定、または `.env.local` を確認 |
| DynamoDB テーブルが見つからない | CloudFormation スタックがデプロイされているか確認 |
| Docker ビルドが失敗する | Docker デーモンが起動しているか確認 |
| ポート 3000 が使用中 | 他のプロセスを停止するか、`PORT=3001 npm run dev` で別ポートを使用 |

### ログの確認

```bash
# Next.js 開発サーバーのログ
cd web/nextjs && npm run dev 2>&1 | tee dev.log

# Docker コンテナのログ
docker logs <container_id>

# AWS CloudFormation のイベント
aws cloudformation describe-stack-events \
  --stack-name codec-converter-dev \
  --query 'StackEvents[*].[ResourceType,ResourceStatus,ResourceStatusReason]' \
  --output table
```

---

## 注意事項

- Batch ジョブロジックのローカルテストには、テスト用の S3 入力でジョブのエントリポイントをローカル実行する軽量スクリプト（Node/Python/.NET 等）の作成を検討してください。
- 反復開発を速めるために、100MB 未満の小さなサンプル動画を使用してください。
- 統合テスト: 開発用の AWS 環境で直接テストを実行し、S3 アップロード、DynamoDB のエントリ、Batch のサブミッション、エンドツーエンドの出力取得が検証できるようにしてください。
