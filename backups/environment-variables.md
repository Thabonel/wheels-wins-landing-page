# Environment Variables Backup

## Production Environment (Render)
```bash
# AI Provider Configuration (PRE-GEMINI STATE)
ANTHROPIC_API_KEY=sk-ant-...  # PRIMARY before Gemini
OPENAI_API_KEY=sk-...         # FALLBACK before Gemini

# Database & Infrastructure
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=...
REDIS_URL=redis://...

# Feature Flags
OBSERVABILITY_ENABLED=true
PAM_ENABLED=true
```

## Frontend Environment (Netlify)
```bash
# API Configuration
VITE_BACKEND_URL=https://pam-backend.onrender.com
VITE_PAM_WEBSOCKET_URL=wss://pam-backend.onrender.com/api/v1/pam/ws

# Authentication
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# AI Provider (PRE-GEMINI)
VITE_ANTHROPIC_API_KEY=sk-ant-...  # PRIMARY before Gemini
```

## Rollback Instructions
1. Remove GEMINI_API_KEY from Render dashboard
2. Remove VITE_GEMINI_API_KEY from Netlify dashboard
3. Restart backend services
4. Verify Claude is primary provider
