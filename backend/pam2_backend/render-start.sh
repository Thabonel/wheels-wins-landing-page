#!/bin/bash
# PAM 2.0 Render Start Script
# ===========================

set -e

echo "🚀 Starting PAM 2.0 server on Render..."

# Set Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Copy staging environment if no .env exists
if [ ! -f .env ]; then
    echo "📋 Using staging environment configuration..."
    cp .env.staging .env
fi

# Start the server with production settings
echo "🌐 Starting PAM 2.0 API server..."
echo "   Host: 0.0.0.0"
echo "   Port: ${PORT:-8000}"
echo "   Workers: 1 (Render free tier)"

exec uvicorn pam_2.api.main:app \
    --host 0.0.0.0 \
    --port ${PORT:-8000} \
    --workers 1 \
    --timeout-keep-alive 30 \
    --log-level info \
    --no-access-log