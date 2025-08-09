# Development Setup Guide

## Quick Start

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Frontend will be available at http://localhost:8080
```

### Backend Development (Required for Full Functionality)

#### 1. Set up Python Environment
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### 2. Configure Environment Variables
```bash
cd backend
cp .env.example .env
# Edit .env with your actual Supabase credentials
```

#### 3. Start Backend Server
```bash
cd backend
uvicorn app.main:app --reload --port 8000
# Backend will be available at http://localhost:8000
```

## Common Issues

### CORS Errors ("Failed to load settings")

**Problem**: Frontend at localhost:8080 trying to connect to production backend
**Solution**: Use local backend for development

1. Update your `.env` file:
```env
VITE_BACKEND_URL=http://localhost:8000
VITE_PAM_WEBSOCKET_URL=ws://localhost:8000/api/v1/pam/ws
```

2. Start local backend:
```bash
cd backend && uvicorn app.main:app --reload --port 8000
```

### Environment Configuration

- **Local Development**: Use localhost URLs for both frontend and backend
- **Production**: Frontend uses production backend at https://pam-backend.onrender.com

## Development vs Production

| Environment | Frontend | Backend | Purpose |
|-------------|----------|---------|---------|
| Development | localhost:8080 | localhost:8000 | Local development |
| Production | wheelsandwins.com | pam-backend.onrender.com | Live site |

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run end-to-end tests
npm run e2e
```