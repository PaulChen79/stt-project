# API 與資料模型設計

最後更新：2026-01-15

## 1. API 合約（REST）
Base path: `/api`

### 1.1 建立任務
`POST /api/jobs`
- Content-Type: `multipart/form-data`
- 欄位：`file`（.wav/.mp3，最大 20MB）
- 回傳 (202)：
```json
{
  "job_id": "uuid",
  "status": "processing",
  "created_at": "2026-01-15T22:10:00Z"
}
```
- 錯誤：
  - 400 `MISSING_FILE`
  - 413 `FILE_TOO_LARGE`
  - 415 `UNSUPPORTED_MEDIA_TYPE`

### 1.2 查詢任務
`GET /api/jobs/:jobId`
- 回傳 (200)：
```json
{
  "job_id": "uuid",
  "status": "pending|processing|completed|failed",
  "transcript": "string|null",
  "summary": "string|null",
  "error": "string|null",
  "created_at": "...",
  "updated_at": "..."
}
```
- 錯誤：
  - 404 `JOB_NOT_FOUND`

### 1.3 健康檢查
`GET /api/health` -> `200 OK`

## 2. WebSocket 合約
- 連線 URL：`ws://host/ws`
- Client 訂閱：
```json
{ "type": "subscribe", "job_id": "uuid" }
```
- Server 事件：
```json
{ "type": "status", "job_id": "uuid", "status": "pending|processing|completed|failed" }
{ "type": "progress", "job_id": "uuid", "stage": "transcribing|summarizing", "message": "..." }
{ "type": "result", "job_id": "uuid", "transcript": "...", "summary": "..." }
{ "type": "error", "job_id": "uuid", "error": "..." }
```

## 3. 錯誤回應格式（建議）
```json
{
  "error": {
    "code": "MISSING_FILE",
    "message": "file is required"
  }
}
```

## 4. 資料模型（Aggregate: Job）
- `id` (uuid)
- `status` (pending/processing/completed/failed)
- `original_filename` (text)
- `audio_path` (text)
- `transcript` (text, nullable)
- `summary` (text, nullable)
- `error` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `expires_at` (timestamp)

## 5. Ownership Map
- Service: STT Summarization Server
- Data ownership: `jobs` table and local audio files

## 6. Migration Plan
- v1: 建立 `jobs` table，含 `status`、`expires_at` 欄位與索引
  - 索引建議：`status`, `created_at`, `expires_at`

## 7. Versioning Strategy
- 本作業先採 `unversioned` 路徑（`/api`），維持向後相容。
- 若需演進，新增 `/api/v1` 並保留舊版一段時間。

## 8. Open Questions
- 無（沿用既有 spec）。

## HITL Gate（API/Data Contract）
請確認以上 API 合約、錯誤格式與資料模型是否同意。
