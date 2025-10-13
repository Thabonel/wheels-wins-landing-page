# PAM 2.0 Production Docker Image
# ================================

FROM python:3.12-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PAM2_ENVIRONMENT=production

# Create app user for security
RUN groupadd -r pam2 && useradd -r -g pam2 pam2

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY pam_2/ ./pam_2/
COPY .env.production .env

# Change ownership to app user
RUN chown -R pam2:pam2 /app

# Switch to app user
USER pam2

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Start command
CMD ["uvicorn", "pam_2.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]