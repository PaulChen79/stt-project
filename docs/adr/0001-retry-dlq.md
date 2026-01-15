# ADR-0001: Job Retry 3 次後進入 DLQ 並標記失敗

## Status
- accepted

## Context
- STT/LLM 呼叫可能因暫時性錯誤失敗。
- 需要有一致的重試與失敗處理流程，並確保狀態可被前端回補。

## Decision
- BullMQ job 設定 `attempts=3`，可搭配固定或指數 backoff。
- 當重試用盡時，job 進入 DLQ。
- 系統需將該 job 狀態回補為 `failed`，並記錄錯誤訊息。
- WebSocket 訂閱時應先讀取 DB 最新狀態，若已 `failed` 則立即推送失敗事件。

## Consequences
- 優點：避免暫時性錯誤造成永久失敗；狀態一致且可回補。
- 缺點/風險：重試會增加成本與處理時間；若錯誤為永久性，可能造成無效重試。
- 對未來維護的影響：需維護 DLQ 監控與手動重放機制（可選）。

## Alternatives Considered
- 不重試，直接失敗：簡單但失敗率高。
- 無限制重試：資源消耗大，可能造成雪崩。

## References
- `docs/spec.zh-TW.md`
