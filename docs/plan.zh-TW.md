# 開發任務規劃與進度追蹤

最後更新：2026-01-15

## 狀態定義
- pending: 尚未開始
- in_progress: 進行中
- completed: 已完成

## 任務清單
1. 專案初始化與基礎結構（repo 結構、TS 設定、lint/format 基礎）
   - 狀態：completed
   - 產出：基礎目錄與開發工具設定
2. Docker Compose 與環境變數
   - 狀態：pending
   - 產出：`docker-compose.yml`、`Dockerfile`、`.env.example`
3. Postgres Schema 與 Migration
   - 狀態：pending
   - 產出：jobs table、migration 檔
4. Domain Entities / Value Objects / Ports
   - 狀態：pending
   - 產出：`Job` entity、`JobStatus`、ports 介面
5. Use Cases
   - 狀態：pending
   - 產出：CreateJob、GetJob、ProcessJob、CleanupExpiredJobs
6. Adapters: Repository / FileStorage / External AI
   - 狀態：pending
   - 產出：Postgres repo、local file storage、Whisper/OpenAI gateway
7. Queue/Worker Pipeline + Retry/DLQ
   - 狀態：pending
   - 產出：BullMQ worker、attempts=3、DLQ、失敗回補
8. API: Upload / Query / Health
   - 狀態：pending
   - 產出：Express routes、檔案限制 20MB、格式檢查
9. Realtime: WebSocket + Redis Pub/Sub
   - 狀態：pending
   - 產出：WS server、訂閱協定、狀態與進度推送
10. Retention Cleanup Job
   - 狀態：pending
   - 產出：定時清理 7 天以上任務與檔案
11. React 前端
   - 狀態：pending
   - 產出：上傳、狀態顯示、結果呈現、WS 連線
12. 文件補完
   - 狀態：pending
   - 產出：README、API 文件、架構圖連結
13. 測試與驗證
   - 狀態：pending
   - 產出：最小 smoke 測試與手動驗證步驟

## 依賴關係
- 3 依賴 2（DB 連線）
- 4 依賴 1
- 5 依賴 4
- 6 依賴 4
- 7 依賴 5/6
- 8 依賴 5/6
- 9 依賴 8/7
- 10 依賴 3/6
- 11 依賴 8/9
- 12 依賴 1-11

## 風險與關注點
- Whisper/OpenAI API rate limit 或超時
- WebSocket 連線穩定性與重連處理
- DLQ 重放與錯誤處理一致性

## HITL Gate
- Gate A：API/資料契約與錯誤處理規則確認
- Gate B：Worker retry/DLQ 與 WebSocket 回補策略確認
- Gate C：上線前驗證清單確認（README + docker-compose 一鍵啟動）

## 下一步
HITL Gate 已全數同意，可開始進入實作階段。
