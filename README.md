# codec-converter

ビデオコーデックコンバータ - 動画ファイルのコーデック変換 Web アプリケーション

## プロジェクト構成

このリポジトリには以下のコンポーネントが含まれています：

- `web/nextjs/` - Next.js ベースの Web アプリケーション（フロントエンド + サーバレス API）
- `batch/` - AWS Batch で実行されるワーカー
- `CodecConverter/` - .NET ベースのコーデックコンバータライブラリ
- `specs/` - 機能仕様とデザインドキュメント

## CI/CD パイプライン

### 概要

このリポジトリには 2 つのワークフローがあります：

#### CI パイプライン (`.github/workflows/ci.yml`)

Pull Request 時に実行される検証ワークフローです。

**実行内容：**
- **lint-nextjs**: Next.js アプリケーションの ESLint チェック
- **test-nextjs**: Next.js アプリケーションのユニットテスト
- **build-nextjs**: Next.js アプリケーションのビルド
- **docker-nextjs**: Next.js Docker イメージのビルド検証（プッシュなし）
- **lint-batch**: バッチワーカーのリントチェック
- **docker-batch**: バッチワーカー Docker イメージのビルド検証（プッシュなし）

**トリガー条件：**
- `develop`, `master` ブランチへの Pull Request
- 手動実行（workflow_dispatch）

#### Deploy パイプライン (`.github/workflows/deploy.yml`)

develop/master ブランチへのプッシュ時に実行されるデプロイワークフローです。

**実行内容：**
- **deploy-nextjs**: Next.js Docker イメージのビルドと ECR へのプッシュ
- **deploy-batch**: バッチワーカー Docker イメージのビルドと ECR へのプッシュ

**トリガー条件：**
- `master`, `develop` ブランチへの push
- 手動実行（workflow_dispatch）

**注意：** CI パイプラインで検証済みのコードに対してのみデプロイが実行されます。

### AWS ECR 連携の設定

Docker イメージを ECR にプッシュするには、以下の GitHub Secrets を設定してください：

- `AWS_ACCESS_KEY_ID` - AWS アクセスキー ID
- `AWS_SECRET_ACCESS_KEY` - AWS シークレットアクセスキー

設定後、deploy.yml 内のコメントアウトされた ECR 連携ステップを有効化してください。

## 開発

詳細な開発手順については、以下を参照してください：

- [クイックスタート](specs/001-video-codec-converter/quickstart.md)
- [実装計画](specs/001-video-codec-converter/plan.md)
- [タスク一覧](specs/001-video-codec-converter/tasks.md)