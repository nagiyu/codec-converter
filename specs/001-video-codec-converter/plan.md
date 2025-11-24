# 実装計画: [FEATURE]

**ブランチ**: `[###-feature-name]` | **日付**: [DATE] | **仕様**: [リンク]
**入力**: `/specs/[###-feature-name]/spec.md` からの機能仕様

**注**: このテンプレートは `/speckit.plan` コマンドによって生成されます。実行フローは `.specify/templates/commands/plan.md` を参照してください。

## サマリー

[機能仕様から抽出：主要要件と調査に基づく技術的アプローチ]

## 技術的コンテキスト

<!--
  ACTION REQUIRED: このセクションの内容をプロジェクトの技術詳細に差し替えてください。
  ここで提示している構成は、イテレーション作業を案内するための助言です。
-->

**言語/バージョン**: Next.js サーバーコンテナ用に Node.js 18.x ランタイムを想定（`Node >=18`）。
**Next.js バージョン**: 要確認（新規プロジェクトには Next.js 13/14 の App Router を推奨）。
**主要依存**: `next`, `react`, `@aws-sdk/client-s3`, `@aws-sdk/client-batch`, `@aws-sdk/client-ecr`, `multer`（または同等）および CI（GitHub Actions 等）。
**バッチワーカー実行環境**: `ffmpeg`（スタティックビルド）を含む Linux Docker イメージ（Debian/Ubuntu）と、ジョブエントリポイント向けの補助ランタイム（Node/Python/.NET 等）。
**コンテナ化/ビルド**: Next.js アプリ用のマルチステージ `Dockerfile`。コンテナは ECR にビルド/プッシュし、Next.js アプリは AWS Lambda コンテナランタイムを想定（Lambda サイズ制約に注意）。
**ストレージ**: アップロード元ファイルおよび変換結果は `S3` に保存。ジョブメタデータは `DynamoDB` に確定（テーブル設計は `data-model.md` を参照）。
**ジョブオーケストレーション**: 動画解析・変換ジョブは `AWS Batch` で実行。Batch ジョブは環境ごとに分けた ECR 上の Docker イメージを実行。
**デプロイターゲット**: Next.js アプリは ECR → Lambda のコンテナとしてデプロイし、CloudFront ディストリビューションを介してカスタムドメインで公開します（外部 DNS により取得したドメインを使用、ACM 証明書は既に登録済みとする）。バッチワーカーは ECR に配置し、AWS Batch のコンピュート環境で実行。
**認証/認可**: Web アプリへの認証は不要（パブリック）。S3 バケットアクセスは厳密に制限する：ブラウザは Next.js が発行する短寿命の事前署名 URL を使って直接アップロードする。ダウンロードは S3 URL を直接返さず、Next.js が `GET /download/{jobId}` のようなサーバ側プロキシで S3 からストリーミングして提供することで、S3 の存在を隠蔽する（サーバが `Content-Disposition: attachment` を付与してブラウザ標準ダウンロードを発動）。S3 バケットポリシーと IAM ロールにより、バケット操作は `Next.js` の Lambda 実行ロールおよび `AWS Batch` の実行ロールからのみ許可する。
**デプロイ / CI**: デプロイは GitHub Actions で自動化し、AWS リソースは CloudFormation（Change Sets）で管理します。主要ポイント:

- ブランチ戦略: `develop`（開発） / `master`（本番）を想定。
- 自動化ワークフロー（GitHub Actions）:
    - Lint・ユニットテスト実行
    - コンテナイメージをビルドして ECR にプッシュ（`web` と `batch`）
    - CloudFormation の Change Set を作成して差分を検証
    - Change Set 適用により Lambda（コンテナイメージ更新）、CloudFront ディストリビューション設定（カスタムドメイン、ACM 証明書の紐付け）、Batch ジョブ定義、DynamoDB テーブル、IAM ポリシー等をデプロイ
    - CloudFront のキャッシュ無効化（必要に応じて）を実行し、外部 DNS プロバイダ側でカスタムドメインの CNAME / ALIAS を CloudFront に向ける手順を確認する（ドメインは外部管理なので DNS 更新は外部プロセス）。
    - デプロイ後にスモークテスト（/health、簡易アップロード→ジョブ登録フロー）を実行
- セキュリティ: GitHub Actions から AWS へは OIDC を用いた短期認証を推奨し、Actions 用に最小権限の IAM ロールを作成する。Secrets は GitHub Secrets/Variables で管理する。
- 本番適用時は手動承認ステップ（approval）を入れ、追加の統合テストやロールバック手順を実行する。

補足:

- CloudFormation テンプレートはリポジトリで管理し、Pull Request によるレビューを必須とします。
- 失敗時のロールバック方針（前バージョンのイメージへ差し戻す、Change Set を取り消す等）をワークフローに組み込みます。
**テスト**: フロントエンドは `jest` + `@testing-library/react`、E2E は `playwright`。統合テストは開発用の AWS 環境で直接実行して検証する（実際の S3 / DynamoDB / Batch を使う）。
**ターゲットプラットフォーム**: AWS 上の Linux x86_64 コンテナ（Lambda コンテナイメージと Batch/ECS 実行）。
**パフォーマンス目標**: SLA/制約は要確認（初期案：<=100MB のアップロードで検出 <5s、変換 <5分）。
**制約**: CPU 集約型のトランスコーディングは AWS Batch にオフロードし、Lambda イメージは小さくステートレスに保つ。大きなペイロードは Lambda 経由させず、S3 事前署名アップロードを採用。
**スケール/スコープ**: MVP は低同時実行・アドホック変換。S3 + AWS Batch による水平スケールを見据えた設計。

## 憲章チェック（Constitution Check）

*このゲートは Phase 0 の調査に入る前に通過する必要があります。Phase 1 設計後に再確認してください。*

Phase 0 の調査に進む前に確認すべきゲート:

- 設計がプロジェクトの憲章（`.specify/memory/constitution.md`）に準拠しているか。もし憲章がテスト優先やライブラリ優先を義務付けている場合は、Phase 1 に該当アーティファクトを含めること。
- 大規模または非オープンなコンポーネント（例：クローズドソースの ffmpeg）を使用する場合は、用途を明記し正当化すること。
- インフラのデプロイマニフェストを作成する前に IAM とセキュリティ境界を定義すること（デフォルトで過剰な権限を与えない）。

未解決の憲章に関する質問は `NEEDS CLARIFICATION` として記録し、複雑性トラッキングで例外の必要性を正当化してください。

## プロジェクト構成

### ドキュメント（この機能）

```text
specs/[###-feature]/
├── plan.md              # 本ファイル（/speckit.plan コマンドの出力）
├── research.md          # Phase 0 の出力（/speckit.plan コマンド）
├── data-model.md        # Phase 1 の出力（/speckit.plan コマンド）
├── quickstart.md        # Phase 1 の出力（/speckit.plan コマンド）
├── contracts/           # Phase 1 の出力（/speckit.plan コマンド）
└── tasks.md             # Phase 2 の出力（/speckit.tasks コマンドで作成）
```

### ソースコード（リポジトリルート）
<!--
  ACTION REQUIRED: 下のプレースホルダツリーを機能の具体的なレイアウトに差し替えてください。不要な選択肢は削除し、実際のパスで拡張してください（例: apps/admin, packages/something）。納品される計画には Option ラベルを含めないでください。
-->

```text
web/nextjs/                # Next.js アプリ（フロントエンド + サーバレス API ルート）
├── Dockerfile             # Lambda デプロイ向けの本番用コンテナ
├── package.json
├── src/
│   ├── app/ or pages/     # Next.js のバージョンに依存（要確認）
│   ├── components/
│   └── services/          # AWS S3 / Batch 用のクライアントラッパー
└── tests/

batch/                     # Batch ワーカーのイメージとジョブ定義
├── Dockerfile             # ffmpeg とジョブエントリポイントを含むイメージ
├── src/                   # ジョブで使うヘルパースクリプト（Node/Python 等）
└── jobs/                  # ジョブ定義と ECR プッシュの CI ヘルパー

infra/                     # デプロイ用マニフェスト（SAM/CloudFormation/Terraform）
├── nextjs/                # Lambda コンテナ定義、IAM ポリシー、API Gateway
└── batch/                 # Batch コンピュート環境、ジョキュー、ジョブ定義
```

**構成決定**: 小規模モノレポ構成を採用し、トップレベルに `web/nextjs/`（Next.js アプリ）と `batch/`（Batch ワーカーとジョブコード）を配置します。これにより Docker ビルドコンテキストが分離され、ECR リポジトリの分離と CI/CD パイプラインが明確になります。

注: 現在のリポジトリには .NET ソリューションが含まれています。本計画では MVP のためにリポジトリルートに `web/nextjs/` と `batch/` ディレクトリを追加する想定です。必要に応じて後で別リポジトリに分割できます。

## 複雑性トラッキング

> **憲章チェックで違反がある場合のみ記入してください**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [明示的な憲章ルールが見つからない] | リポジトリの憲章ファイルはテンプレートであり、具体的なゲート（テスト、TDD、必須パターン）を列挙していないため。 | 推奨されるプラクティス（テスト、最小限の IAM、IaC）を適用し、逸脱が生じた場合は文書化してプロジェクト責任者へ確認する。

憲章の再確認結果: `.specify/memory/constitution.md` はプレースホルダテンプレートです。Phase 1 をブロックするような明示的な必須制約は見つかりませんでした。ガバナンスに関しては `NEEDS CLARIFICATION` として、TDD / ライブラリ優先 / 統合テストのゲートを適用すべきか保有者に確認してください。
