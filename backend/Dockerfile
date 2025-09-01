# syntax=docker/dockerfile:1
#################################################
#  Multi-stage Docker build for PAM Backend     #
#################################################

############# base – common bits #############
FROM python:3.11-slim AS base

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
        espeak \
        libespeak-dev \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd -r pamuser && useradd -r -g pamuser pamuser
WORKDIR /app

############# builder – install prod deps #############
FROM base AS builder

# Copy requirements first for layer-cache efficiency
COPY requirements.txt requirements-dev.txt ./

# Install only production deps into /install
RUN python -m pip install --upgrade pip \
 && python -m pip install --prefix=/install -r requirements.txt

############# development image (optional) #############
FROM base AS development
COPY requirements-dev.txt .
RUN python -m pip install --upgrade pip && pip install -r requirements-dev.txt
COPY . .
USER pamuser
EXPOSE 10000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000", "--reload"]

############# production (runtime) #############
FROM python:3.11-slim AS production

# Minimal runtime OS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        ffmpeg \
        libsndfile1 \
        espeak \
        libespeak-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/ .

# Copy site-packages from builder
COPY --from=builder /install /usr/local

# Switch to non-root
RUN groupadd -r pamuser && useradd -r -g pamuser pamuser \
 && chown -R pamuser:pamuser /app
USER pamuser

# Render uses port 10000
EXPOSE 10000

# Health-check Render can query
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:10000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000"]
