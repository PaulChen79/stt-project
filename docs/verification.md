# 測試與驗證

## 單元測試
```sh
PATH=/Users/paul/.nvm/versions/node/v18.20.7/bin:$PATH \
  /Users/paul/.nvm/versions/node/v18.20.7/bin/npm test
```

## Docker Compose 驗證
1. 啟動服務：
```sh
docker-compose up --build
```

2. 套用 migration：
```sh
psql "$DATABASE_URL" -f db/migrations/001_create_jobs.sql
```

3. 健康檢查：
```sh
curl http://localhost:3000/api/health
```

4. 建立任務（上傳音檔）：
```sh
curl -F "file=@./sample.wav" http://localhost:3000/api/jobs
```

5. 查詢任務：
```sh
curl http://localhost:3000/api/jobs/<job_id>
```

## WebSocket 驗證（手動）
- 使用瀏覽器或 WS 工具連線 `ws://localhost:3000/ws`
- 發送：
```json
{ "type": "subscribe", "job_id": "<job_id>" }
```
- 觀察 status/progress/result/error 事件
