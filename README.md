# STT Summarization Server

A dockerized Node.js backend that accepts audio uploads, runs Whisper STT + OpenAI GPT-4 summarization asynchronously, and streams progress over WebSocket. Includes a minimal React demo UI.

## Requirements
- Docker + Docker Compose
- (Optional) psql client for running SQL migrations

## Quick Start
1. Copy env file:

```sh
cp .env.example .env
```

2. Start services:

```sh
docker-compose up --build
```

3. Apply migration (one-time):

```sh
psql "$DATABASE_URL" -f db/migrations/001_create_jobs.sql
```

## API
Base URL: `http://localhost:3000`

### Create Job
`POST /api/jobs`
- Content-Type: `multipart/form-data`
- Field: `file` (.wav/.mp3, max 20MB)

Response (202):
```json
{
  "job_id": "uuid",
  "status": "pending",
  "created_at": "2026-01-15T22:10:00Z"
}
```

### Get Job
`GET /api/jobs/:jobId`

Response (200):
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

### Health
`GET /api/health`

## WebSocket
- URL: `ws://localhost:3000/ws`
- Subscribe:

```json
{ "type": "subscribe", "job_id": "uuid" }
```

Events:
```json
{ "type": "status", "job_id": "uuid", "status": "pending|processing|completed|failed" }
{ "type": "progress", "job_id": "uuid", "stage": "transcribing|summarizing", "message": "..." }
{ "type": "result", "job_id": "uuid", "transcript": "...", "summary": "..." }
{ "type": "error", "job_id": "uuid", "error": "..." }
```

## Demo UI
Open `ui/index.html` in a browser. Update the API base if your backend runs elsewhere.

## Retention Policy
Jobs and files are cleaned up after 7 days by a daily cleanup worker.

## Architecture Docs
- Spec: `docs/spec.zh-TW.md`
- Structure: `docs/architecture/structure.md`
- Ports: `docs/architecture/ports-interfaces.md`
- ADRs: `docs/adr/`
