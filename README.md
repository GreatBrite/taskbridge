# TaskBridge Mini App

TaskBridge is a Telegram Mini App MVP for matching customers with contractors for simple local work: moving help, handyman tasks, childcare, dog walking, and cleaning.

## What is implemented

- React + Vite Telegram Mini App frontend.
- FastAPI backend with Telegram `initData` validation and development auth fallback.
- PostgreSQL-ready SQLAlchemy models for users, contractor profiles, jobs, translations, offers, chats, messages, ratings, notifications, and audit logs.
- Core workflow: draft job, brief assistant, publish, contractor feed, offer, select offer, private chat, completion, rating.
- aiogram bot entrypoint with `/start` and Mini App button.
- Docker Compose with Postgres, Redis, backend, frontend, and optional bot profile.
- Pytest coverage for Telegram signature validation and the customer/contractor workflow.

## Local development

```bash
cp .env.example .env
docker compose up --build backend frontend
```

Frontend will be available at `http://localhost:8013`; backend healthcheck at `http://localhost:8012/api/health`.

The frontend uses `Authorization: dev 1001` when it is opened outside Telegram. Real Telegram Mini App requests use `Authorization: tma <initData>`.

## Running tests

```bash
cd backend
python -m pytest
```

## Bot

The bot requires `TELEGRAM_BOT_TOKEN`. It is excluded from the default compose run to avoid accidental polling with an empty token:

```bash
docker compose --profile bot up --build bot
```

## Production notes

- Store `TELEGRAM_BOT_TOKEN`, `DEEPL_API_KEY`, database credentials, and any future LLM keys only in environment/secret storage.
- Keep `DEV_AUTH_ENABLED=false` in production.
- Configure nginx so `/api/` proxies to the backend and all other routes serve the built frontend.
