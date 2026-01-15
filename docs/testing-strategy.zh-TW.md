# 測試策略

最後更新：2026-01-15

## 1. 風險對應測試類型
- 外部 API 失敗（Whisper/OpenAI）：以 gateway 單元測試 + 錯誤情境 mock。
- 任務狀態一致性：use case 單元測試與 repository adapter 測試。
- Queue/Worker 重試與 DLQ：use case 單元測試（mock 外部依賴）。
- WebSocket 即時事件：不納入測試範圍（依需求精簡）。

## 2. 測試類型與覆蓋目標
- Unit（僅針對 domain layer）
  - domain/entities, usecases
  - 覆蓋率目標：核心 use case 70%+

## 3. 測試資料策略
- 使用 fixture 音檔（小檔 .wav）
- 模擬外部 API 回應（避免實際成本）

## 4. Coverage 優先順序
1. CreateJob / ProcessJob / GetJob
2. Retry/DLQ 與失敗狀態回補
3. Retention cleanup

## 5. 測試工具建議
- Jest 或 Vitest（擇一）

## 6. 測試缺口
- 整合測試與合約測試不納入（依需求精簡）。
- UI 端到端測試暫不納入（後續可補）。

## HITL Gate（Test Plan）
請確認以上測試策略與覆蓋目標是否同意。
