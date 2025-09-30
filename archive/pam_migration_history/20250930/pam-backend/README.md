
# PAM Backend - AI Agent with Full Website Control

High-performance FastAPI backend for PAM (Personal AI Manager), replacing the slow N8N system.

## Features
- ⚡ <500ms response time
- 🔐 JWT authentication
- 📊 Structured JSON logging
- 🚀 Horizontal scaling ready
- 🛡️ Built-in security & rate limiting

## Local Development

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your values
3. Install dependencies: `pip install -r requirements.txt`
4. Run the server: `uvicorn app.main:app --reload`

## Deployment to Render

1. Push to your GitHub repository
2. Connect to Render.com
3. Create a new Web Service
4. Connect your GitHub repo
5. Render will auto-deploy using `render.yaml`

## API Endpoints

- `GET /` - Root endpoint
- `GET /api/health` - Health check
- `GET /api/health/detailed` - Detailed health metrics
- `POST /api/chat/message` - Process chat messages
- `GET /api/chat/sessions/{session_id}` - Get session history

## Next Steps

1. Implement WebSocket support
2. Add Redis caching layer
3. Build orchestration system
4. Create UI control endpoints

## Architecture

```
pam-backend/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── core/
│   │   ├── config.py        # Settings and configuration
│   │   ├── security.py      # JWT authentication
│   │   └── logging.py       # JSON structured logging
│   ├── api/
│   │   ├── health.py        # Health check endpoints
│   │   └── chat.py          # Chat processing endpoints
│   └── database/
│       └── supabase_client.py # Supabase connection
├── requirements.txt         # Python dependencies
├── render.yaml             # Render.com deployment config
└── .env.example           # Environment variables template
```

## Environment Variables

- `ENVIRONMENT` - Current environment (development/production)
- `OPENAI_API_KEY` - OpenAI API key for chat processing
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `SECRET_KEY` - JWT signing secret
- `REDIS_URL` - Redis connection string (optional)
