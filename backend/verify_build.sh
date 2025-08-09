#!/bin/bash
set -e

echo "🔍 Verifying backend build and dependencies..."

# Change to backend directory
cd "$(dirname "$0")"

# Run smoke test
echo "🧪 Running smoke test..."
python test_smoke.py

# Test that the health endpoint can be imported
echo "🏥 Testing health endpoint..."
python -c "
from app.api.v1.health import health_check
print('✅ Health endpoint imported successfully')
"

# Test Celery worker can be imported
echo "🔄 Testing Celery worker..."
python -c "
from app.workers.celery import celery_app
print('✅ Celery worker imported successfully')
print(f'Broker: {celery_app.conf.broker_url}')
"

echo "✅ All verification checks passed!"
echo "🚀 Backend is ready for deployment to Render"