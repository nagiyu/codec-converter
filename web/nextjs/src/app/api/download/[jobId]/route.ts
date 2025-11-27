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

import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { getConversionJobById } from "@/lib/dynamodb";

// ==================== 設定 ====================

// S3 バケット名（環境変数から取得）
const OUTPUT_BUCKET = process.env.OUTPUT_S3_BUCKET ?? "codec-converter-output";

// ==================== 型定義 ====================

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

// ==================== S3 クライアント ====================

/**
 * Create and configure the S3 client.
 */
function createS3Client(): S3Client {
  const config: ConstructorParameters<typeof S3Client>[0] = {
    region: process.env.AWS_REGION || "ap-northeast-1",
  };

  // Support local development with LocalStack
  if (process.env.S3_ENDPOINT) {
    config.endpoint = process.env.S3_ENDPOINT;
    config.forcePathStyle = true;
  }

  return new S3Client(config);
}

/**
 * Singleton S3 client instance.
 */
let s3Client: S3Client | null = null;

/**
 * Get the S3 client singleton.
 */
function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = createS3Client();
  }
  return s3Client;
}

// ==================== ヘルパー関数 ====================

/**
 * Determine content type based on target codec and container hint.
 */
function getContentType(
  targetCodec?: string,
  containerHint?: string
): string {
  // Use container hint if available
  if (containerHint) {
    switch (containerHint.toLowerCase()) {
      case "mp4":
        return "video/mp4";
      case "webm":
        return "video/webm";
      case "mkv":
        return "video/x-matroska";
      case "avi":
        return "video/x-msvideo";
      default:
        break;
    }
  }

  // Infer from target codec
  if (targetCodec) {
    switch (targetCodec.toLowerCase()) {
      case "h264":
      case "hevc":
        return "video/mp4";
      case "vp9":
      case "av1":
        return "video/webm";
      default:
        break;
    }
  }

  return "application/octet-stream";
}

/**
 * Get file extension based on target codec and container hint.
 */
function getFileExtension(
  targetCodec?: string,
  containerHint?: string
): string {
  // Use container hint if available
  if (containerHint) {
    return containerHint.toLowerCase();
  }

  // Infer from target codec
  if (targetCodec) {
    switch (targetCodec.toLowerCase()) {
      case "h264":
      case "hevc":
        return "mp4";
      case "vp9":
      case "av1":
        return "webm";
      default:
        break;
    }
  }

  return "mp4";
}

/**
 * S3 からオブジェクトを取得してストリーミングする
 */
async function getS3ObjectStream(
  bucket: string,
  key: string
): Promise<{
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: number;
} | null> {
  try {
    const client = getS3Client();
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    if (!response.Body) {
      return null;
    }

    // AWS SDK v3 の Body は Readable ストリーム（Node.js 環境）
    const nodeStream = response.Body as Readable;
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

    return {
      body: webStream,
      contentType: response.ContentType ?? "application/octet-stream",
      contentLength: response.ContentLength ?? 0,
    };
  } catch (error) {
    console.error("S3 GetObject error:", error);
    return null;
  }
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
  if (!jobId || typeof jobId !== "string" || jobId.length === 0) {
    return NextResponse.json(
      { error: "Invalid jobId parameter" },
      { status: 400 }
    );
  }

  try {
    // 2. DynamoDB からジョブ情報を取得
    const job = await getConversionJobById(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found", jobId },
        { status: 404 }
      );
    }

    // 3. ジョブのステータスを確認
    if (job.status !== "succeeded") {
      return NextResponse.json(
        {
          error: "Job is not ready for download",
          jobId,
          status: job.status,
          message:
            job.status === "failed"
              ? "The conversion job failed"
              : "The conversion is still in progress",
        },
        { status: 403 }
      );
    }

    // 4. 出力 S3 キーの確認
    if (!job.output_s3_key) {
      return NextResponse.json(
        { error: "Output file not available", jobId },
        { status: 404 }
      );
    }

    // 5. S3 からオブジェクトを取得
    const s3Object = await getS3ObjectStream(OUTPUT_BUCKET, job.output_s3_key);

    if (!s3Object) {
      return NextResponse.json(
        { error: "Failed to retrieve output file from storage", jobId },
        { status: 500 }
      );
    }

    // 6. ファイル名を決定
    const extension = getFileExtension(job.target_codec, job.container_hint);
    const filename = `output-${jobId}.${extension}`;
    // RFC 5987 に準拠したファイル名エンコーディング
    const encodedFilename = encodeURIComponent(filename);

    // 7. Content-Type を決定（S3 からのレスポンスを優先、なければ推測）
    const contentType =
      s3Object.contentType !== "application/octet-stream"
        ? s3Object.contentType
        : getContentType(job.target_codec, job.container_hint);

    // 8. レスポンスヘッダーを設定してストリーミング
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`
    );

    if (s3Object.contentLength > 0) {
      headers.set("Content-Length", s3Object.contentLength.toString());
    }

    // キャッシュを無効化（動的コンテンツのため）
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

    return new NextResponse(s3Object.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error processing download request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
