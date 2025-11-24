# データモデル

## エンティティ

### VideoFile
- `id`: string（UUID）
- `filename`: string
- `s3_key`: string
- `container`: string（例: `mp4`, `webm`）
- `video_codec`: string（例: `h264`, `vp9`, `av1`）
- `audio_codec`: string（任意）
- `duration_seconds`: number
- `resolution`: string（例: `1920x1080`）
- `file_size_bytes`: integer
- `upload_timestamp`: ISO 8601 タイムスタンプ
- `owner_id`: string（任意）
- `status`: enum（`uploaded`, `processing`, `ready`, `failed`）

検証ルール:
- `filename` は必須、最大 255 文字
- `s3_key` は必須
- `file_size_bytes` は 0 より大きいこと

### ConversionJob
- `id`: string（UUID）
- `video_file_id`: string（外部キー -> `VideoFile.id`）
- `target_codec`: string（いずれか: `h264`, `vp9`, `av1`, `hevc`）
- `container_hint`: string（例: `mp4`, `webm`）（任意）
- `status`: enum（`queued`, `running`, `succeeded`, `failed`）
- `progress_percent`: integer（0-100）
- `submitted_at`: ISO 8601 タイムスタンプ
- `started_at`: ISO 8601 タイムスタンプ（任意）
- `finished_at`: ISO 8601 タイムスタンプ（任意）
- `output_s3_key`: string（任意）
- `error_message`: string（任意）

検証ルール:
- `target_codec` はサポートされているコーデックのいずれかであること
- `video_file_id` は必須

### Codec
- `id`: string
- `name`: string（表示名）
- `code`: string（例: `h264`, `vp9`, `av1`, `hevc`）
- `recommended_container`: string（例: `mp4`, `webm`）

## リレーション
- 1 つの `VideoFile` は複数の `ConversionJob` を持つことができます。

## ストレージのマッピング（シングルテーブル設計）

- 本プロジェクトでは DynamoDB を単一テーブルで運用します。論理的には `VideoFile` や `ConversionJob` といった複数のエンティティを扱いますが、物理的には 1 つのテーブルに格納します。

- テーブル設計（推奨）:

    - テーブル名: `Entities`（任意）
    - パーティションキー（Partition Key）: `DataType` (string) — エンティティ種別（例: `VideoFile`, `ConversionJob`, `Codec`）
    - ソートキー（Sort Key）: `id` (string) — 各エンティティ内で一意な ID

    解説: `DataType` は RDS でいうテーブル名の役割を果たします。`id` はそのタイプ内で一意となる識別子です。これにより、タイプ単位の一覧取得（Query by `DataType`）やタイプ＋ID による単一取得が簡単になります。

### 例: アイテム表現

VideoFile の例:

```json
{
    "DataType": "VideoFile",
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "filename": "sample.mp4",
    "s3_key": "uploads/123e4567-e89b-12d3-a456-426614174000/sample.mp4",
    "video_codec": "h264",
    "file_size_bytes": 12345678,
    "upload_timestamp": "2025-11-24T12:00:00Z",
    "owner_id": "user-01"
}
```

ConversionJob の例:

```json
{
    "DataType": "ConversionJob",
    "id": "job-0001",
    "video_file_id": "123e4567-e89b-12d3-a456-426614174000",
    "target_codec": "vp9",
    "status": "succeeded",
    "output_s3_key": "outputs/job-0001/output.webm",
    "submitted_at": "2025-11-24T12:01:00Z",
    "finished_at": "2025-11-24T12:05:00Z",
    "download_allowed_until": "2025-12-01T12:00:00Z"
}
```

### アクセスパターンと補助インデックス

- `DataType` で Query すれば同種のアイテム一覧を取得できます（例: 全 `ConversionJob` を取得）。
- `video_file_id` で ConversionJob を検索するアクセスが必要なため、`GSI_VideoFileId`（パーティションキー: `video_file_id`, ソートキー: `submitted_at`）のような GSI を作成することを推奨します。
- `owner_id` で動画を検索するケースがある場合は `GSI_OwnerId`（パーティションキー: `owner_id`）を追加してください。

### TTL とライフサイクル

- ダウンロード期限や一時メタデータ管理には `expires_at`（ISO タイムスタンプ）属性を使用し、DynamoDB の TTL を有効にします。

### S3 マッピング

- ファイルは S3 に制御されたプレフィックスで保存します: `uploads/{videoFileId}/{filename}` および `outputs/{conversionJobId}/`。

### ダウンロードプロキシに関する注意点

- `ConversionJob.output_s3_key` は最終出力オブジェクトを参照している必要があります。Next.js のダウンロードプロキシはこのキーを参照してクライアントへストリーム配信します。
- サーバーは `ConversionJob.status === 'succeeded'` を検証し、古いアクセスを防ぐために `download_allowed_until`／`expires_at` を維持することを検討してください。
