#!/usr/bin/env bash
set -euo pipefail

echo "🔍 PAM Backend Pre-flight Checks"

# Check if .env file exists
if [[ ! -f .env ]]; then
    echo "❌ .env file not found"
    echo "💡 Copy .env.example to .env and configure your environment variables"
    exit 1
fi

# Load environment variables from .env
export $(grep -v '^#' .env | grep -v '^$' | xargs)

# Environment validation
if [[ -z "${SUPABASE_URL:-}" ]]; then
    echo "❌ Missing SUPABASE_URL environment variable"
    echo "💡 Set SUPABASE_URL in your .env file"
    exit 1
fi

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]] || [[ "${SUPABASE_SERVICE_ROLE_KEY}" == "your_service_role_key_here_from_supabase_dashboard" ]]; then
    echo "❌ Missing or placeholder SUPABASE_SERVICE_ROLE_KEY"
    echo "💡 Set a real SUPABASE_SERVICE_ROLE_KEY in your .env file"
    echo "💡 Get it from: https://supabase.com/dashboard/project/kycoklimpzkyrecbjecn/settings/api"
    exit 1
fi

echo "✅ Required environment variables present"

# Check if virtual environment is activated
if [[ -z "${VIRTUAL_ENV:-}" ]]; then
    echo "❌ Virtual environment not activated"
    echo "💡 Run: source .venv/bin/activate"
    exit 1
fi

# Dependency validation
echo "🔍 Checking critical dependencies..."
python -c "
try:
    import yaml
    import PIL
    import anthropic
    import fastapi
    import uvicorn
    import supabase
    print('✅ Critical dependencies available')
except ImportError as e:
    print(f'❌ Missing critical dependency: {e}')
    print('💡 Run: pip install -r requirements.txt')
    exit(1)
" || exit 1

# Port availability
if lsof -Pi :8001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "❌ Port 8001 already in use"
    echo "💡 Kill existing processes: lsof -ti:8001 | xargs kill -9"
    exit 1
fi
echo "✅ Port 8001 available"

# Optional Redis check (graceful degradation)
if command -v redis-cli >/dev/null 2>&1; then
    if redis-cli ping >/dev/null 2>&1; then
        echo "✅ Redis available (tracking enabled)"
    else
        echo "⚠️  Redis not running (tracking disabled - this is OK)"
    fi
else
    echo "⚠️  Redis not installed (tracking disabled - this is OK)"
fi

echo "🚀 Pre-flight checks passed - ready for startup"