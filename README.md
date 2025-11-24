# codec-converter

ビデオコーデックコンバータ - 動画ファイルのコーデック変換 Web アプリケーション

## プロジェクト構成

このリポジトリには以下のコンポーネントが含まれています：

- `web/nextjs/` - Next.js ベースの Web アプリケーション（フロントエンド + サーバレス API）
- `batch/` - AWS Batch で実行されるワーカー（予定）
- `CodecConverter/` - .NET ベースのコーデックコンバータライブラリ
- `specs/` - 機能仕様とデザインドキュメント

## CI/CD パイプライン

### 概要

`.github/workflows/ci.yml` に定義された CI パイプラインは以下のステージを実行します：

#### 1. Lint & Test
- **lint-nextjs**: Next.js アプリケーションの ESLint チェック
- **test-nextjs**: Next.js アプリケーションのユニットテスト
- **lint-batch**: バッチワーカーのリントチェック（実装予定）

#### 2. Build
- **build-nextjs**: Next.js アプリケーションのビルド
- ビルド成果物は GitHub Actions アーティファクトとして保存

#### 3. Docker Build & Push
- **docker-nextjs**: Next.js アプリケーションの Docker イメージビルド
- **docker-batch**: バッチワーカーの Docker イメージビルド
- ECR へのプッシュ機能（AWS 認証情報設定後に有効化）

### トリガー条件

CI パイプラインは以下の条件でトリガーされます：

- `master`, `develop`, `feature/**` ブランチへの push
- `master`, `develop` ブランチへの Pull Request
- 手動実行（workflow_dispatch）

### AWS ECR 連携の設定

Docker イメージを ECR にプッシュするには、以下の GitHub Secrets を設定してください：

- `AWS_ACCESS_KEY_ID` - AWS アクセスキー ID
- `AWS_SECRET_ACCESS_KEY` - AWS シークレットアクセスキー

設定後、ci.yml 内のコメントアウトされた ECR 連携ステップを有効化してください。

## 開発

詳細な開発手順については、以下を参照してください：

- [クイックスタート](specs/001-video-codec-converter/quickstart.md)
- [実装計画](specs/001-video-codec-converter/plan.md)
- [タスク一覧](specs/001-video-codec-converter/tasks.md)