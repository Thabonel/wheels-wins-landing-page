# syntax=docker/dockerfile:1
#################################################
#  Multi-stage Docker build for PAM Backend     #
#################################################

############# base – common bits #############
FROM python:3.11.9-slim AS base

# Environment
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# OS packages needed by TTS / ffmpeg, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        ffmpeg \
        libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd -r pamuser && useradd -r -g pamuser pamuser
WORKDIR /app

############# builder – install prod deps #############
FROM base AS builder

# Copy *only* the backend requirement files; gives Docker-layer cache hits
COPY backend/requirements.txt backend/requirements-*.txt ./backend/

# Install only production deps into /install
RUN python -m pip install --upgrade pip \
 && python -m pip install --prefix=/install -r backend/requirements.txt \
                 -r backend/requirements-optional.txt

############# production (runtime) #############
FROM base AS production

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code  
COPY backend/ ./backend/
WORKDIR /app/backend

# Switch to non-root for security
USER pamuser

# Expose port
EXPOSE 10000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:10000/health || exit 1

# Start command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000"]