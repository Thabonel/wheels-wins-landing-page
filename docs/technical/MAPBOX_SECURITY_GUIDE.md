# Mapbox Security Implementation Guide

## Industry Standard Security Architecture (2025)

This guide implements **Mapbox's official security recommendations** for production applications.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │     Backend     │
│                 │    │                 │
│ Public Token    │    │ Secret Token    │
│ (pk.xxx)        │    │ (sk.xxx)        │
│                 │    │                 │
│ • Map rendering │    │ • API operations│
│ • Basic geocode │    │ • Advanced APIs │
│ • URL restricted│    │ • Full permissions│
└─────────────────┘    └─────────────────┘
```

## 🔑 Token Types & Usage

### Public Token (Frontend)
- **Environment Variable**: `VITE_MAPBOX_PUBLIC_TOKEN`
- **Format**: `pk.xxx...`
- **Scopes**: `styles:read`, `fonts:read`
- **Security**: URL-restricted, read-only
- **Usage**: Map initialization, tile loading, basic geocoding

### Secret Token (Backend)
- **Environment Variable**: `MAPBOX_SECRET_TOKEN`
- **Format**: `sk.xxx...`
- **Scopes**: Full permissions
- **Security**: Server-only, never exposed to client
- **Usage**: Advanced APIs, uploads, analytics

## 📁 Configuration Files

### Environment Variables

#### `.env` (Development)
```bash
# PUBLIC TOKEN: Frontend map rendering
VITE_MAPBOX_PUBLIC_TOKEN=pk.your_public_token_here

# Legacy token (backward compatibility)
VITE_MAPBOX_TOKEN=pk.your_legacy_token_here
```

#### `backend/.env` (Backend)
```bash
# SECRET TOKEN: Backend API operations
MAPBOX_SECRET_TOKEN=sk.your_secret_token_here

# Legacy support
MAPBOX_API_KEY=pk.your_legacy_token_here
```

### Production Deployment

#### Frontend (Vercel/Netlify)
```bash
VITE_MAPBOX_PUBLIC_TOKEN=pk.production_public_token
```

#### Backend (Render/Railway)
```bash
MAPBOX_SECRET_TOKEN=sk.production_secret_token
```

## 🛠️ Implementation

### Frontend Components

#### Using the Configuration Utility
```typescript
import { getMapboxPublicToken, isMapAvailable, initializeMapbox } from '@/utils/mapboxConfig';

// Initialize Mapbox
if (initializeMapbox()) {
  // Create map instance
}

// Check availability
const mapAvailable = isMapAvailable(isOffline);
```

#### Map Component Example
```typescript
import { getMapboxPublicToken } from '@/utils/mapboxConfig';

function MapComponent() {
  const token = getMapboxPublicToken();
  
  if (!token) {
    return <MapUnavailable />;
  }
  
  // Initialize map with token
  mapboxgl.accessToken = token;
  // ... rest of map initialization
}
```

### Backend Proxy

#### API Endpoint Usage
```typescript
// Frontend calls backend proxy instead of Mapbox directly
const data = await fetch('/api/v1/mapbox/geocoding/v5/forward', {
  headers: { 'Authorization': `Bearer ${userToken}` }
});
```

#### Backend Implementation
```python
# backend/app/api/v1/mapbox.py
MAPBOX_TOKEN = os.getenv("MAPBOX_SECRET_TOKEN")  # Secret token
# Proxy requests to Mapbox with server token
```

## 🔒 Security Best Practices

### 1. Token Separation
- ✅ **Public Token**: Frontend, URL-restricted, minimal scopes
- ✅ **Secret Token**: Backend only, full permissions
- ❌ **Never**: Use secret tokens in frontend code

### 2. URL Restrictions
Configure your public token with URL restrictions:
```
Development: http://localhost:*, https://localhost:*
Staging: https://*.staging.yourdomain.com
Production: https://yourdomain.com, https://www.yourdomain.com
```

### 3. Scope Management
- **Public Token Scopes**: `styles:read`, `fonts:read` only
- **Secret Token Scopes**: All required permissions
- **Principle**: Grant minimal necessary permissions

### 4. Token Rotation
- Rotate tokens regularly (quarterly recommended)
- Monitor usage analytics for unusual activity
- Use separate tokens per environment

## 🚀 Migration Guide

### From Legacy Token

#### Step 1: Create Public Token
1. Go to [Mapbox Account](https://account.mapbox.com/access-tokens/)
2. Create new token with scopes: `styles:read`, `fonts:read`
3. Add URL restrictions for your domains
4. Set as `VITE_MAPBOX_PUBLIC_TOKEN`

#### Step 2: Create Secret Token
1. Create new token with required scopes
2. Set as `MAPBOX_SECRET_TOKEN` in backend
3. Never expose this token to frontend

#### Step 3: Update Code
```typescript
// Before (legacy)
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// After (industry standard)
import { initializeMapbox } from '@/utils/mapboxConfig';
initializeMapbox();
```

## 🐛 Troubleshooting

### Map Shows "Missing Access Token"

1. **Check Environment Variables**
   ```bash
   echo $VITE_MAPBOX_PUBLIC_TOKEN
   # Should show: pk.xxx...
   ```

2. **Verify Token Format**
   - Public tokens start with `pk.`
   - Secret tokens start with `sk.`
   - No placeholder text like `your_token_here`

3. **Check URL Restrictions**
   - Ensure current domain is in token's allowed URLs
   - Use wildcard for development: `http://localhost:*`

4. **Debug Information**
   ```typescript
   import { getMapboxDebugInfo } from '@/utils/mapboxConfig';
   console.log(getMapboxDebugInfo());
   ```

### Common Issues

#### Token Not Loading
- **Cause**: Environment variable not set correctly
- **Solution**: Restart development server after setting variables

#### Map Fails to Initialize
- **Cause**: Invalid token or URL restriction
- **Solution**: Check token scopes and URL restrictions

#### Backend Proxy Errors
- **Cause**: Missing secret token in backend
- **Solution**: Set `MAPBOX_SECRET_TOKEN` in backend environment

## 📚 References

- [Mapbox Security Best Practices](https://docs.mapbox.com/help/troubleshooting/how-to-use-mapbox-securely/)
- [Token Management Guide](https://docs.mapbox.com/accounts/guides/tokens/)
- [URL Restrictions](https://blog.mapbox.com/url-restrictions-for-access-tokens-5f7f7eb90092)

## 🎯 Implementation Status

- ✅ **Public Token Configuration**: `VITE_MAPBOX_PUBLIC_TOKEN`
- ✅ **Secret Token Configuration**: `MAPBOX_SECRET_TOKEN`
- ✅ **Backend Proxy Service**: Full API coverage
- ✅ **Frontend Token Management**: Graceful fallback
- ✅ **Debug Information**: Comprehensive troubleshooting
- ✅ **Legacy Support**: Backward compatibility during migration
- ⏳ **URL Restrictions**: Configure in Mapbox dashboard
- ⏳ **Token Rotation**: Set up quarterly schedule

## 🔄 Next Steps

1. **Create Mapbox Tokens**:
   - Create public token with URL restrictions
   - Create secret token for backend
   
2. **Configure Environment**:
   - Set `VITE_MAPBOX_PUBLIC_TOKEN` in frontend
   - Set `MAPBOX_SECRET_TOKEN` in backend
   
3. **Test Implementation**:
   - Verify map loads correctly
   - Test backend proxy endpoints
   - Confirm debug information shows correct token source

4. **Monitor Usage**:
   - Set up Mapbox analytics monitoring
   - Schedule token rotation
   - Review usage patterns for security