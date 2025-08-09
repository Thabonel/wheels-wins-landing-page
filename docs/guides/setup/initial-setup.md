
# Initial Setup Guide

This guide walks you through setting up the PAM system from scratch.

## Prerequisites

- Node.js 18+ installed
- Git installed
- Access to Supabase project
- API keys for required services

## Frontend Setup

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Fill in required environment variables (see API Configuration guide)

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Backend Setup

1. **Navigate to Backend Directory**
   ```bash
   cd backend
   ```

2. **Install Python Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Configure all required API keys and database connections

4. **Start Backend Server**
   ```bash
   uvicorn app.main:app --reload
   ```

## Database Setup

1. **Supabase Configuration**
   - Create new Supabase project
   - Run database migrations
   - Set up authentication providers

2. **Initial Data**
   - Create admin user
   - Configure system settings
   - Set up content moderation rules

## Verification

- [ ] Frontend loads at `http://localhost:3000`
- [ ] Backend health check responds at `http://localhost:8000/api/health`
- [ ] Authentication flow works
- [ ] Database connections are successful

## Next Steps

- Review [API Configuration](./api-configuration.md)
- Set up [Platform Integrations](./platform-integrations.md)
- Read [Getting Started](../user-guides/getting-started.md) user guide
