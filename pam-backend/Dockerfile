# pam-backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install Python dependencies
COPY pam-backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend folder
COPY pam-backend/ .

EXPOSE 8000

# Start the app
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
