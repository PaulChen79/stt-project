# Database Migrations

This project uses plain SQL migrations for simplicity.

## Apply (local)
1. Ensure Postgres is running (via docker-compose).
2. Run the SQL file with psql:

```sh
psql "$DATABASE_URL" -f db/migrations/001_create_jobs.sql
```
