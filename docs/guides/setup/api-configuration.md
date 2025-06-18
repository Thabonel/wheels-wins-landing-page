
# API Configuration Guide

This guide covers configuring all API keys and external service integrations for PAM.

## Required API Keys

### OpenAI API
**Purpose**: Powers the PAM AI assistant
**Setup**:
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create new API key
3. Add to `.env` as `OPENAI_API_KEY`

### Supabase
**Purpose**: Database and authentication
**Setup**:
1. Create Supabase project
2. Get URL and anon key from project settings
3. Add to `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`

### Twilio (Optional)
**Purpose**: SMS notifications and 2FA
**Setup**:
1. Create Twilio account
2. Get Account SID and Auth Token
3. Add to `.env`:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`

### Stripe (Optional)
**Purpose**: Payment processing
**Setup**:
1. Create Stripe account
2. Get publishable and secret keys
3. Add to `.env`:
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`

## Environment Variables Template

```env
# Core Services
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...
SUPABASE_KEY=eyJ...

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET=your-jwt-secret

# Optional Services
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...

# Development
ENVIRONMENT=development
DEBUG=true
```

## Testing API Connections

Use the health check endpoints to verify API connections:

```bash
# Frontend API check
curl http://localhost:3000/api/health

# Backend API check
curl http://localhost:8000/api/health/detailed
```

## Security Best Practices

- Never commit API keys to version control
- Use different keys for development and production
- Rotate keys regularly
- Monitor API usage and billing
- Set up billing alerts for paid services

## Troubleshooting

See [API Errors](../troubleshooting/api-errors.md) for common API configuration issues.
