#!/bin/bash
# Staging deployment fix script
# This script helps deploy to Render staging with memory optimization

echo "🚀 Preparing staging deployment with memory optimization..."

# Set staging environment
export ENVIRONMENT=staging
export DISABLE_SENTENCE_TRANSFORMERS=true
export USE_LIGHTWEIGHT_MODELS=true
export WEB_CONCURRENCY=1

echo "✅ Environment variables set for staging mode"

# Check if we have the staging config
if [ -f "app/core/staging_config.py" ]; then
    echo "✅ Staging configuration found"
else
    echo "❌ Staging configuration missing!"
    exit 1
fi

# Install requirements without heavy dependencies
echo "📦 Installing lightweight dependencies..."
pip install -r requirements.txt || {
    echo "❌ Failed to install dependencies"
    exit 1
}

# Start the application with staging optimizations
echo "🎯 Starting FastAPI with staging optimizations..."
cd backend 2>/dev/null || true
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}