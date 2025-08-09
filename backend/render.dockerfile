# Dockerfile for Render.com deployment with Python 3.11 for Coqui TTS support
FROM python:3.11-slim

# Install system dependencies for audio processing and TTS engines
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    libsndfile1-dev \
    espeak-data \
    espeak \
    espeak-ng \
    espeak-ng-data \
    alsa-utils \
    pulseaudio \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directory for TTS cache
RUN mkdir -p /app/tts_cache

# Set environment variables for TTS
ENV TTS_PRIMARY_ENGINE=edge
ENV TTS_VOICE_DEFAULT=en-US-SaraNeural
ENV TTS_FALLBACK_ENABLED=true
ENV TORCH_NUM_THREADS=2
ENV OMP_NUM_THREADS=2

# Expose port (Render uses PORT environment variable)
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:10000/health || exit 1

# Start command (Render provides PORT environment variable)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000", "--workers", "1"]