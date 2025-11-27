# インフラストラクチャ チェックリスト

**目的**: CloudFormation テンプレートおよびインフラ関連ファイルの品質とCI統合を確保する
**作成日**: 2025-11-27
**対象**: `infra/` ディレクトリ配下のすべてのファイル

## CloudFormation テンプレート

### CI 検証要件

新しい CloudFormation テンプレートを追加する際は、以下を確認してください：

- [ ] テンプレートは `infra/` ディレクトリに配置されている（例: `infra/nextjs/`, `infra/dynamodb/`, `infra/iam/`）
- [ ] テンプレートのファイル拡張子は `.yaml`, `.yml`, または `.json` である
- [ ] `cfn-lint` でローカル検証を実施済み（`cfn-lint path/to/template.yaml`）
- [ ] CI ワークフロー（`.github/workflows/ci.yml`）の `validate-cloudformation` ジョブで自動検証される

### テンプレート品質チェック

- [ ] AWSTemplateFormatVersion と Description が記載されている
- [ ] パラメータには適切なデフォルト値と説明がある
- [ ] 出力（Outputs）にはエクスポート名が定義されている（クロススタック参照用）
- [ ] セキュリティベストプラクティスが適用されている：
    - [ ] S3 バケット: パブリックアクセスブロック、暗号化、HTTPS 必須
    - [ ] IAM ロール/ポリシー: 最小権限の原則
    - [ ] リソースタグ（Project, Environment 等）が付与されている

### ローカル検証コマンド

```bash
# cfn-lint のインストール
pip install cfn-lint

# 単一テンプレートの検証
cfn-lint infra/nextjs/s3-buckets.yaml

# 全テンプレートの検証
find ./infra -type f \( -name "*.yaml" -o -name "*.yml" -o -name "*.json" \) -exec cfn-lint {} \;
```

## CI パイプライン統合

`.github/workflows/ci.yml` には `validate-cloudformation` ジョブが含まれており、以下を実行します：

1. `infra/` ディレクトリ配下の全テンプレートを自動検出
2. `cfn-lint` による構文・ベストプラクティス検証
3. 検証失敗時は CI パイプライン全体が失敗

**重要**: 新しい CloudFormation テンプレートを追加する際、ci.yml への追加変更は不要です。
`infra/` ディレクトリに配置すれば自動的に検証対象となります。

## 関連タスク

- T006: S3 バケットの CloudFormation テンプレート（`infra/nextjs/s3-buckets.yaml`）
- T007: DynamoDB テーブルの CloudFormation テンプレート（`infra/dynamodb/entities-table.yaml`）
- T008: IAM ロール/ポリシーの CloudFormation テンプレート（`infra/iam/lambda-batch-roles.yaml`）
