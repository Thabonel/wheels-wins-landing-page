#!/bin/bash

# Celery Beat Scheduler Startup Script for Production Deployment
# This script starts Celery Beat scheduler for PAM proactive tasks

set -e

# Environment setup
export PYTHONPATH="/opt/render/project/src:$PYTHONPATH"
export C_FORCE_ROOT=1

# Log startup
echo "Starting PAM Celery Beat Scheduler..."
echo "Environment: ${ENVIRONMENT:-production}"
echo "Redis URL: ${REDIS_URL}"
echo "Python Path: ${PYTHONPATH}"

# Remove existing beat schedule file if exists (fresh start on deployment)
rm -f /tmp/celerybeat-schedule

# Start Celery Beat
exec celery -A app.workers.celery beat \
  --loglevel=info \
  --schedule=/tmp/celerybeat-schedule \
  --pidfile=/tmp/celerybeat.pid