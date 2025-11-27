/**
 * サーバーサイドのダウンロードプロキシ
 *
 * このエンドポイントは S3 オブジェクトをクライアントへストリーミングし、
 * `Content-Disposition: attachment` を設定します。
 *
 * 実装のポイント:
 * - jobId を検証し、DynamoDB でジョブのステータス（succeeded）と権限を確認
 * - S3 から output_s3_key を取得してレスポンスへストリーミング
 * - 適切なヘッダーを設定: Content-Type, Content-Length, Content-Disposition
 *
 * Lambda の考慮点:
 * - Lambda 経由のストリーミングは実行時間とネットワーク転送を消費
 * - MVP（<=100MB）では許容可能だが、メモリとタイムアウトの調整が必要
 * - 大規模ファイルや高トラフィックの場合は CloudFront への移行を検討
 */

import { NextRequest, NextResponse } from 'next/server';
// 本番環境で使用する場合は @aws-sdk/client-s3 をインストールしてください
// import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// ==================== 設定 ====================

// S3 クライアント設定（本番用）
// const s3Client = new S3Client({ region: process.env.AWS_REGION ?? 'ap-northeast-1' });

// S3 バケット名（環境変数から取得）
const OUTPUT_BUCKET = process.env.OUTPUT_S3_BUCKET ?? 'codec-converter-output';

// ==================== 型定義 ====================

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

interface ConversionJob {
  jobId: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  outputS3Key?: string;
  outputFilename?: string;
  contentType?: string;
  contentLength?: number;
}

// ==================== ヘルパー関数（スタブ） ====================

/**
 * DynamoDB からジョブ情報を取得するスタブ
 * 本番環境では DynamoDB クライアントを使用して実装
 */
async function getJobFromDynamoDB(jobId: string): Promise<ConversionJob | null> {
  // TODO: 本番環境では DynamoDB から実際のジョブ情報を取得
  // import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
  //
  // const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
  // const result = await dynamoClient.send(new GetItemCommand({
  //   TableName: 'Entities',
  //   Key: { PK: { S: `JOB#${jobId}` }, SK: { S: 'METADATA' } },
  // }));
  //
  // if (!result.Item) return null;
  // return {
  //   jobId: result.Item.jobId.S,
  //   status: result.Item.status.S,
  //   outputS3Key: result.Item.outputS3Key?.S,
  //   outputFilename: result.Item.outputFilename?.S,
  //   contentType: result.Item.contentType?.S,
  //   contentLength: parseInt(result.Item.contentLength?.N ?? '0', 10),
  // };

  // スタブ: 開発/テスト用のダミーデータ
  if (jobId === 'test-job-123') {
    return {
      jobId: 'test-job-123',
      status: 'succeeded',
      outputS3Key: 'outputs/test-job-123/output.mp4',
      outputFilename: 'converted-video.mp4',
      contentType: 'video/mp4',
      contentLength: 1024 * 1024 * 10, // 10MB
    };
  }

  return null;
}

/**
 * S3 からオブジェクトを取得してストリーミングするスタブ
 * 本番環境では S3 クライアントを使用して実装
 */
async function getS3ObjectStream(
  bucket: string,
  key: string
): Promise<{
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: number;
} | null> {
  // TODO: 本番環境では S3 から実際のオブジェクトを取得
  // const s3Client = new S3Client({ region: process.env.AWS_REGION });
  // const response = await s3Client.send(new GetObjectCommand({
  //   Bucket: bucket,
  //   Key: key,
  // }));
  //
  // if (!response.Body) return null;
  //
  // // Node.js の Readable ストリームを Web ReadableStream に変換
  // const nodeStream = response.Body as NodeJS.ReadableStream;
  // const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
  //
  // return {
  //   body: webStream,
  //   contentType: response.ContentType ?? 'application/octet-stream',
  //   contentLength: response.ContentLength ?? 0,
  // };

  // スタブ: 開発/テスト用のダミーレスポンス
  console.log(`[STUB] S3 GetObject: bucket=${bucket}, key=${key}`);

  // ダミーのストリームを返す（テスト用）
  const dummyData = new TextEncoder().encode(
    'This is a placeholder for the actual video content.\n' +
      'In production, this would be the converted video file from S3.\n'
  );

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(dummyData);
      controller.close();
    },
  });

  return {
    body: stream,
    contentType: 'video/mp4',
    contentLength: dummyData.length,
  };
}

// ==================== メインハンドラー ====================

/**
 * GET /api/download/[jobId]
 *
 * 変換済みの出力ファイルをクライアントへストリーミングします。
 *
 * レスポンス:
 * - 200: ファイルのバイナリストリーム（Content-Disposition: attachment）
 * - 404: ジョブまたは出力が見つかりません
 * - 403: アクセス禁止（ジョブが完了していない、または権限がない）
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { jobId } = await context.params;

  // 1. 入力検証
  if (!jobId || typeof jobId !== 'string' || jobId.length === 0) {
    return NextResponse.json(
      { error: 'Invalid jobId parameter' },
      { status: 400 }
    );
  }

  // 2. DynamoDB からジョブ情報を取得
  const job = await getJobFromDynamoDB(jobId);

  if (!job) {
    return NextResponse.json(
      { error: 'Job not found', jobId },
      { status: 404 }
    );
  }

  // 3. ジョブのステータスを確認
  if (job.status !== 'succeeded') {
    return NextResponse.json(
      {
        error: 'Job is not ready for download',
        jobId,
        status: job.status,
        message:
          job.status === 'failed'
            ? 'The conversion job failed'
            : 'The conversion is still in progress',
      },
      { status: 403 }
    );
  }

  // 4. 出力 S3 キーの確認
  if (!job.outputS3Key) {
    return NextResponse.json(
      { error: 'Output file not available', jobId },
      { status: 404 }
    );
  }

  // 5. S3 からオブジェクトを取得
  const s3Object = await getS3ObjectStream(OUTPUT_BUCKET, job.outputS3Key);

  if (!s3Object) {
    return NextResponse.json(
      { error: 'Failed to retrieve output file from storage', jobId },
      { status: 500 }
    );
  }

  // 6. ファイル名を決定
  const filename = job.outputFilename ?? `output-${jobId}.mp4`;
  // RFC 5987 に準拠したファイル名エンコーディング
  const encodedFilename = encodeURIComponent(filename);

  // 7. レスポンスヘッダーを設定してストリーミング
  const headers = new Headers();
  headers.set('Content-Type', s3Object.contentType);
  headers.set(
    'Content-Disposition',
    `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`
  );

  if (s3Object.contentLength > 0) {
    headers.set('Content-Length', s3Object.contentLength.toString());
  }

  // キャッシュを無効化（動的コンテンツのため）
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  return new NextResponse(s3Object.body, {
    status: 200,
    headers,
  });
}

// ==================== S3 ストリーミングの本番実装例 ====================

/**
 * 本番環境での S3 ストリーミング実装例
 *
 * @aws-sdk/client-s3 をインストールした後、以下のコードを使用してください:
 *
 * ```typescript
 * import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
 * import { Readable } from 'stream';
 *
 * const s3Client = new S3Client({ region: process.env.AWS_REGION ?? 'ap-northeast-1' });
 *
 * async function getS3ObjectStream(bucket: string, key: string) {
 *   try {
 *     const response = await s3Client.send(new GetObjectCommand({
 *       Bucket: bucket,
 *       Key: key,
 *     }));
 *
 *     if (!response.Body) return null;
 *
 *     // AWS SDK v3 の Body は ReadableStream または Readable
 *     // Node.js 環境では Readable、ブラウザでは ReadableStream
 *     const nodeStream = response.Body as Readable;
 *     const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
 *
 *     return {
 *       body: webStream,
 *       contentType: response.ContentType ?? 'application/octet-stream',
 *       contentLength: response.ContentLength ?? 0,
 *     };
 *   } catch (error) {
 *     console.error('S3 GetObject error:', error);
 *     return null;
 *   }
 * }
 * ```
 */
