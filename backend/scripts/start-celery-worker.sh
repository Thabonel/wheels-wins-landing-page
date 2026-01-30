#!/bin/bash

# Celery Worker Startup Script for Production Deployment
# This script starts Celery workers with proper configuration for the PAM system

set -e

# Environment setup
export PYTHONPATH="/opt/render/project/src:$PYTHONPATH"
export C_FORCE_ROOT=1

# Log startup
echo "Starting PAM Celery Worker..."
echo "Environment: ${ENVIRONMENT:-production}"
echo "Redis URL: ${REDIS_URL}"
echo "Python Path: ${PYTHONPATH}"

# Start Celery worker
exec celery -A app.workers.celery worker \
  --loglevel=info \
  --concurrency=${CELERY_CONCURRENCY:-4} \
  --prefetch-multiplier=1 \
  --max-tasks-per-child=1000 \
  --pool=prefork \
  --hostname=pam-worker@%h