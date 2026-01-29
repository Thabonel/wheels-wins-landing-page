#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "🚀 Starting PAM Backend (Deterministic Mode)"
echo "📁 Working directory: $(pwd)"

# Kill any existing process on our port
echo "🧹 Cleaning up port 8001..."
lsof -ti:8001 | xargs kill -9 2>/dev/null || true
sleep 1

# Check for virtual environment
if [[ ! -d ".venv" ]]; then
    echo "❌ Virtual environment not found at .venv"
    echo "💡 Run setup first: ./setup-dev.sh"
    exit 1
fi

# Activate virtual environment
echo "🐍 Activating virtual environment..."
source .venv/bin/activate

# Pre-flight checks
echo "🔍 Running pre-flight checks..."
scripts/preflight-check.sh

# Load environment variables
export $(grep -v '^#' .env | grep -v '^$' | xargs)

# Start server with explicit configuration
echo "🌟 Starting backend on port 8001..."
echo "🔗 Health check: curl http://localhost:8001/health"
echo "🔗 API docs: http://localhost:8001/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8001 \
    --log-level info \
    --reload \
    --reload-dir app

echo "🛑 Backend stopped"