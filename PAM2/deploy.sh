#!/bin/bash
# PAM 2.0 Deployment Script
# =========================

set -e

echo "🚀 PAM 2.0 Deployment Starting..."

# Configuration
ENVIRONMENT="${1:-staging}"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.${ENVIRONMENT}"

echo "📋 Environment: $ENVIRONMENT"

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file $ENV_FILE not found!"
    echo "Available environments:"
    ls .env.* 2>/dev/null || echo "No environment files found"
    exit 1
fi

# Load environment variables
set -a
source "$ENV_FILE"
set +a

echo "✅ Environment variables loaded from $ENV_FILE"

# Validate required environment variables
required_vars=(
    "PAM2_GEMINI_API_KEY"
    "PAM2_ENVIRONMENT"
)

echo "🔍 Validating required environment variables..."
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set!"
        exit 1
    fi
done

echo "✅ All required environment variables are set"

# Build and deploy
echo "🔨 Building Docker images..."
docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache

echo "🛑 Stopping existing services..."
docker-compose -f "$DOCKER_COMPOSE_FILE" down

echo "🚀 Starting PAM 2.0 services..."
docker-compose -f "$DOCKER_COMPOSE_FILE" up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Health check
echo "🩺 Performing health checks..."
for i in {1..30}; do
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        echo "✅ PAM 2.0 API is healthy!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Health check failed after 30 attempts"
        echo "📋 Service logs:"
        docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail=50
        exit 1
    fi
    echo "⏳ Attempt $i/30: Waiting for PAM 2.0 API..."
    sleep 2
done

# Show service status
echo "📊 Service Status:"
docker-compose -f "$DOCKER_COMPOSE_FILE" ps

echo ""
echo "🎉 PAM 2.0 Deployment Complete!"
echo "🌐 API: http://localhost:8000"
echo "📚 Documentation: http://localhost:8000/docs"
echo "❤️  Health: http://localhost:8000/health"
echo ""
echo "📋 Quick Commands:"
echo "  View logs: docker-compose logs -f"
echo "  Stop: docker-compose down"
echo "  Restart: docker-compose restart"
echo ""
echo "✨ PAM 2.0 is ready to serve!"