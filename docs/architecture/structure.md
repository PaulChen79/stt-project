# 專案資料夾結構（Clean Architecture 建議）

```text
.
├── apps
│   ├── api
│   │   ├── main.ts
│   │   ├── routes
│   │   ├── ws
│   │   └── middleware
│   └── worker
│       ├── main.ts
│       └── jobs
├── src
│   ├── domain
│   │   ├── entities
│   │   │   └── Job.ts
│   │   ├── value-objects
│   │   │   └── JobStatus.ts
│   │   └── interfaces
│   │       └── ports
│   ├── usecases
│   │   ├── CreateJob.ts
│   │   ├── GetJob.ts
│   │   ├── ProcessJob.ts
│   │   └── CleanupExpiredJobs.ts
│   ├── adapters
│   │   ├── controllers
│   │   ├── repositories
│   │   ├── gateways
│   │   ├── queue
│   │   └── realtime
│   └── infrastructure
│       ├── db
│       ├── redis
│       ├── config
│       ├── logging
│       └── files
├── ui
├── docs
│   ├── adr
│   └── architecture
├── docker
└── README.md
```

## 說明
- `apps/api`: Express API 入口與 WS。
- `apps/worker`: 背景任務入口。
- `src/domain`: 核心 domain，無框架依賴。
- `src/usecases`: 應用層 use cases。
- `src/adapters`: 外部依賴實作（DB/Queue/WS）。
- `src/infrastructure`: 組態與基礎設施。
- `ui`: React 前端。
- `docs`: 規格、ADR、架構文件。
