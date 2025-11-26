---
description: "ビデオコーデックコンバータ機能のタスク一覧（自動生成）"
---

# タスク: ビデオコーデックコンバータ

**入力**：`/specs/001-video-codec-converter/` の設計ドキュメント

## フェーズ 1: セットアップ（共有インフラ）

- [x] T001 `web/nextjs/` のスキャフォールドを作成 (`Dockerfile` と `package.json`)（パス: `web/nextjs/`）
- [x] T002 `batch/` のスキャフォールドを作成 (`Dockerfile` と TypeScript の `src/` エントリポイント、GitHub Actions による Docker ビルド検証を含む）（パス: `batch/`）
- [x] T003 初期の CI ワークフロー骨子を追加（lint/test/build/push）`/.github/workflows/ci.yml`（パス: `.github/workflows/ci.yml`）
- [x] T004 機能用の `README.md` を追加（クイックスタートの参照を含む）（パス: `specs/001-video-codec-converter/quickstart.md`）
- [x] T005 リポジトリルートにリンティング／フォーマット／エディタ設定を追加（`.eslintrc.json`, `.prettierrc`, `.editorconfig`）

---

## フェーズ 2: 基盤（前提タスク）

- [ ] T006 [P] アップロード／出力用 S3 バケットの CloudFormation テンプレートを作成（`infra/nextjs/s3-buckets.yaml`）（パス: `infra/nextjs/s3-buckets.yaml`）
- [ ] T007 [P] 単一テーブル `Entities` 用の CloudFormation テンプレートを作成（`infra/dynamodb/entities-table.yaml`）（パス: `infra/dynamodb/entities-table.yaml`）
- [ ] T008 [P] Lambda と Batch 実行ロール用の IAM ポリシー例を実装（`infra/iam/lambda-batch-roles.yaml`）（パス: `infra/iam/lambda-batch-roles.yaml`）
- [ ] T009 `VideoFile`, `ConversionJob`, `Codec` の基本データモデルを作成（`web/nextjs/src/lib/models/`、ファイル: `videoFile.ts`, `conversionJob.ts`, `codec.ts`）
- [ ] T010 `contracts/upload-api.yaml` に対応する Next.js の API ルートスタブを作成：
    - `web/nextjs/src/app/api/presign-upload/route.ts`
    - `web/nextjs/src/app/api/submit-job/route.ts`
    - `web/nextjs/src/app/api/jobs/[jobId]/route.ts`
    - `web/nextjs/src/app/api/download/[jobId]/route.ts`
    - `web/nextjs/src/app/api/codecs/route.ts`

- [x] T011 [P] サーバーサイドのダウンロードプロキシ例を追加（`web/nextjs/src/app/api/download/[jobId]/route.ts`、`quickstart.md` にストリーミング案内あり）

---

## フェーズ 3: ユーザーストーリー 1 - 単一動画の変換（優先度: P1）[US1] 🎯 MVP

**ゴール**：単一動画をアップロードし、コーデックやメタデータを検出、変換後のターゲットコーデックを選択して変換を実行、ダウンロード可能な出力を提供する。

**独立テスト**：<=100MB のサンプル動画をアップロードし、コーデックとメタデータが表示され、ターゲットコーデックを選択後に変換が成功し再生可能な出力をダウンロードできること。

- [ ] T012 [US1] 事前署名アップロード情報を取得する `UploadService` スタブを作成（`web/nextjs/src/lib/services/uploadService.ts`、`presign-upload` 契約を使用）
- [ ] T013 [US1] `submit-job` を呼び出し `jobs/{jobId}` をポーリングする `JobService` スタブを作成（`web/nextjs/src/lib/services/jobService.ts`）
- [ ] T014 [US1] ファイルピッカーとコーデック選択を備えたクライアント UI ページを実装（`web/nextjs/src/app/(app)/convert/page.tsx`、パス: `web/nextjs/src/app/convert/page.tsx`）
- [ ] T015 [US1] `presign-upload` と `submit-job` のルートスタブにサーバー側統合を実装：入力検証と `VideoFile` / `ConversionJob` を DynamoDB に保存（パス: `web/nextjs/src/app/api/*.ts`）
- [ ] T016 [US1] `ConversionJob` のステータス更新フローを実装：Batch ジョブが進捗を DynamoDB に書き込み、`jobs/{jobId}` がステータスと `outputUrl` を返す（パス: `web/nextjs/src/app/api/jobs/[jobId]/route.ts`）
- [ ] T017 [US1] `ConversionJob` の状態を確認してから S3 オブジェクトをストリームするダウンロードプロキシエンドポイントを実装（パス: `web/nextjs/src/app/api/download/[jobId]/route.ts`）
- [ ] T018 [US1] クライアント側の進捗 UI と `jobs/{jobId}` / `download/{jobId}` に紐づくダウンロードボタンを追加（パス: `web/nextjs/src/app/convert/components/Progress.tsx`）
- [ ] T019 [US1] ffmpeg で変換し DynamoDB を更新する最小限の Batch ワーカ用 `Dockerfile` とエントリポイントスクリプトを作成（パス: `batch/Dockerfile`, `batch/src/worker.js`）

---

## フェーズ 4: ユーザーストーリー 2 - ドラッグ＆ドロップと進捗表示（優先度: P2）[US2]

**ゴール**：ドラッグ＆ドロップでのアップロードを有効にし、アップロードと変換の進捗（ETA 含む）を表示する。

**独立テスト**：ファイルをドラッグ＆ドロップしてアップロードが開始され、プログレスバーが更新され、変換完了時にダウンロードリンクが表示されることを確認する。

- [ ] T020 [P] [US2] ドラッグ＆ドロップ用コンポーネントを追加（`web/nextjs/src/app/convert/components/DropZone.tsx`）
- [ ] T021 [US2] `UploadService` にアップロード進捗報告を統合（パス: `web/nextjs/src/lib/services/uploadService.ts`）
- [ ] T022 [US2] `Progress.tsx` とユニットヘルパー（`web/nextjs/src/lib/utils/progress.ts`）に ETA 計算と UI を追加
- [ ] T023 [US2] ドラッグ＆ドロップ＋進捗シナリオの統合テスト骨子を追加（任意）（`specs/001-video-codec-converter/tests/integration/test_drag_drop.md`）

---

## フェーズ 5: ユーザーストーリー 3 - エラーハンドリングと未対応コーデック（優先度: P3）[US3]

**ゴール**：未対応のアップロードや変換失敗に対して明確なエラーメッセージと対処案を提供する。

**独立テスト**：破損または未対応のファイルをアップロードした際に、明確なエラー UI と推奨対応が表示されることを確認する。

- [ ] T024 [US3] `presign-upload` ルートでアップロードされたファイルの種類／サイズのサーバー側検証を実装（パス: `web/nextjs/src/app/api/presign-upload/route.ts`）
- [ ] T025 [US3] クライアント側のエラー UI とフォールバック案内を実装（`web/nextjs/src/app/convert/components/ErrorBanner.tsx`）
- [ ] T026 [US3] Batch ジョブ失敗時のログ／エラー収集を `batch/src/worker.js` に追加し、CloudWatch に関するドキュメントを `infra/` に記載

---

## フェーズ 6: 仕上げ & 横断的懸念

- [ ] T027 [P] ドキュメント：`specs/001-video-codec-converter/README.md` と `quickstart.md` を実行手順で更新
- [ ] T028 [P] サービスのユニットテスト骨子とサンプルテストを `web/nextjs/tests/` に追加（TDD 希望の場合）
- [ ] T029 セキュリティレビュー：S3 の事前署名 TTL や IAM の最小権限に関する簡易チェックリストを `specs/001-video-codec-converter/checklists/security.md` に追加
- [ ] T030 パフォーマンス：Batch ワーカーの簡易負荷スモーク用スクリプトを `batch/tools/bench.sh` に追加

---

## 依存関係と実行順序

- フェーズ 1（セットアップ）→ フェーズ 2（基盤）→ フェーズ 3+（ユーザーストーリー）
- 基盤タスク T006-T011 はユーザーストーリーのタスク T012+ の前に完了している必要がある
- 各ストーリー内では：モデル → サービス → API エンドポイント → UI → 統合 の順に進める

## 並列作業の例

- 複数開発者が並行して作業可能：
    - `web/nextjs/src/app/convert/*` の UI コンポーネント（T014, T018, T020）
    - `batch/*` のワーカーと Dockerfile（T019）
    - `infra/*` のテンプレート（T006-T008）

## 実装方針

- MVP 優先：まずフェーズ1＋フェーズ2 を実装し、US1（T012-T019）を完了して検証・デモする
- 段階的：US1 検証後に US2、続いて US3 を実装

## タスク概要

- ファイル: `specs/001-video-codec-converter/tasks.md`
- 合計タスク数: 30
- ストーリー毎のタスク数:
    - US1 (P1): 8 タスク (T012-T019)
    - US2 (P2): 4 タスク (T020-T023)
    - US3 (P3): 3 タスク (T024-T026)
    - セットアップ/基盤/仕上げ: 15 タスク (T001-T011, T027-T030)

## 各ストーリーの独立テスト基準

- US1: <=100MB のサンプルアップロードで 5 秒以内にコーデック検出；変換は目標時間内に完了し、選択したコーデックで再生可能な出力がダウンロードできること
- US2: ドラッグ＆ドロップでアップロードが開始され、進捗が表示され、最終的にダウンロード可能であること
- US3: 未対応／破損ファイルで明確なエラー表示と推奨対応が示されること

## MVP 提案

- MVP 範囲: ユーザーストーリー 1 のみ（単一動画変換） — T001-T011 と T012-T019 を実装して検証する

## フォーマット検証

- すべてのタスクは `- [ ]` 形式のチェックリストで記載され、Task ID とファイルパスを含む

