# PAM Backend

This directory contains the FastAPI backend for Wheels and Wins. The service depends on several environment variables and Python dependencies.

## Required environment variables
Create a `.env` file in the `backend` folder and define at least the following keys:

- `ENVIRONMENT` – `development` or `production`.
- `SECRET_KEY` – secret used for signing tokens.
- `OPENAI_API_KEY` – API key for OpenAI.
- `SUPABASE_URL` – URL of your Supabase project.
- `SUPABASE_KEY` – Supabase service key.
- `SUPABASE_ANON_KEY` – Supabase anonymous key.
- `DATABASE_URL` – connection string for Postgres.
- `REDIS_URL` – Redis connection URL.
- `CORS_ORIGINS` – comma separated list of allowed origins.

Optional variables such as `SENTRY_DSN`, `LOG_LEVEL`, `MAPBOX_API_KEY`, `BACKEND_PORT`, etc. may also be defined. See `.env.production` for an extensive example.

## Installing dependencies
Use Python 3.11+. From the repository root:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

For development and testing also install:

```bash
pip install -r requirements-dev.txt
```

## Running the FastAPI server
Ensure your `.env` file is configured, then start the application:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The server will reload on code changes when `ENVIRONMENT` is set to `development`.

## Running tests
Install the dev requirements and invoke `pytest`:

```bash
pip install -r requirements.txt -r requirements-dev.txt
pytest
```

Integration and API tests are skipped by default. To run them set:

```bash
RUN_API_TESTS=1 RUN_INTEGRATION_TESTS=1 pytest
```
