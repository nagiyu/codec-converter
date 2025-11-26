# Batch Worker - ビデオコーデックコンバータ

このディレクトリには、ビデオコーデック変換用の AWS Batch ワーカー実装が含まれています。

## 概要

Batch ワーカーは AWS Batch 上で実行される Docker コンテナで、ffmpeg を使用してビデオトランスコーディング操作を実行します。S3 からビデオをダウンロードし、ターゲットコーデックに変換し、結果を S3 にアップロードしながら DynamoDB でジョブステータスを更新します。

## 構成

```
batch/
├── Dockerfile          # ffmpeg と Node.js ランタイムを含むマルチステージコンテナイメージ
├── package.json        # Node.js 依存関係
├── tsconfig.json       # TypeScript 設定
├── src/
│   └── worker.ts       # バッチジョブのメインエントリポイント（TypeScript）
└── jobs/               # ジョブ定義と CI ヘルパー（将来用）
```

## 開発

TypeScript をローカルでビルド:

```bash
npm install
npm run build
```

ビルド後にローカルで実行:

```bash
npm start
```

## ビルド

Docker イメージをビルド:

```bash
docker build -t codec-converter-batch:latest .
```

## ローカル実行

必要な環境変数を設定して実行:

```bash
docker run --rm \
  -e INPUT_S3_BUCKET=my-bucket \
  -e INPUT_S3_KEY=input/video.mp4 \
  -e OUTPUT_S3_BUCKET=my-bucket \
  -e OUTPUT_S3_KEY=output/video-converted.mp4 \
  -e TARGET_CODEC=h264 \
  -e JOB_ID=job-123 \
  -e DYNAMODB_TABLE=Entities \
  -e AWS_REGION=us-east-1 \
  -e AWS_ACCESS_KEY_ID=... \
  -e AWS_SECRET_ACCESS_KEY=... \
  codec-converter-batch:latest
```

## 環境変数

ワーカーに必要な環境変数:

- `INPUT_S3_BUCKET`: ソース S3 バケット名
- `INPUT_S3_KEY`: ソース S3 オブジェクトキー
- `OUTPUT_S3_BUCKET`: 出力先 S3 バケット名
- `OUTPUT_S3_KEY`: 出力先 S3 オブジェクトキー
- `TARGET_CODEC`: ターゲットビデオコーデック（h264, vp9, av1, hevc）
- `JOB_ID`: DynamoDB でトラッキングする変換ジョブ ID
- `DYNAMODB_TABLE`: DynamoDB テーブル名（デフォルト: Entities）
- `AWS_REGION`: AWS リージョン

## デプロイ

イメージは CI/CD パイプラインによってビルドされ ECR にプッシュされ、AWS Batch ジョブ定義で参照されます。

デプロイ手順については `specs/001-video-codec-converter/quickstart.md` を参照してください。

## 実装状況

- [x] ディレクトリ構造の作成（T002）
- [x] ffmpeg を含む Dockerfile
- [x] エントリポイントスクリプトのスキャフォールド（TypeScript）
- [ ] 完全な変換実装（T019）
