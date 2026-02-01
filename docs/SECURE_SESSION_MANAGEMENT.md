# Secure Session Management System - Phase 2 Authentication

## Overview

This document describes the comprehensive secure session management and MFA authentication system implemented for Wheels & Wins Phase 2 security hardening.

## Architecture

### Core Components

1. **Redis-based Session Manager** (`backend/app/services/auth/session_manager.py`)
   - Server-side session tracking
   - JWT ID (JTI) blacklisting
   - Automatic session cleanup
   - Concurrent session limits (max 3 per user)

2. **MFA Service** (`backend/app/services/auth/mfa_service.py`)
   - TOTP support using `pyotp`
   - QR code generation for authenticator apps
   - Backup codes for account recovery
   - Mandatory MFA for admin accounts

3. **Secure Token Storage** (`src/services/auth/secureAuthService.ts`)
   - HttpOnly cookies for token storage
   - CSRF protection mechanisms
   - Automatic token refresh
   - Secure session management

4. **Enhanced Auth Dependencies** (`backend/app/api/deps.py`)
   - Integrated session validation
   - MFA verification checks
   - Secure authentication flow

## Database Schema

### Required Tables

Run the SQL migration in `docs/sql-fixes/CREATE_SESSION_MFA_TABLES.sql`:

```sql
-- User MFA configuration
CREATE TABLE user_mfa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    secret TEXT NOT NULL,
    backup_codes JSONB DEFAULT '[]',
    enabled BOOLEAN DEFAULT FALSE,
    setup_date TIMESTAMPTZ,
    last_used TIMESTAMPTZ,
    UNIQUE(user_id)
);

-- Temporary MFA setup (for verification)
CREATE TABLE user_mfa_setup (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    secret TEXT NOT NULL,
    backup_codes JSONB DEFAULT '[]',
    setup_token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Session tracking
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    jti TEXT NOT NULL UNIQUE,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- JWT blacklist
CREATE TABLE token_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jti TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    blacklisted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    reason TEXT
);
```

## API Endpoints

### Authentication Endpoints

| Endpoint | Method | Description | Security |
|----------|--------|-------------|----------|
| `/api/v1/auth/login` | POST | Enhanced login with MFA support | Rate limited |
| `/api/v1/auth/logout` | POST | Session invalidation + JWT blacklisting | Authenticated |
| `/api/v1/auth/refresh` | POST | Secure token refresh | HttpOnly cookies |
| `/api/v1/auth/csrf-token` | GET | CSRF token generation | Public |

### MFA Endpoints

| Endpoint | Method | Description | Security |
|----------|--------|-------------|----------|
| `/api/v1/auth/mfa/setup` | POST | Initialize MFA setup | Authenticated |
| `/api/v1/auth/mfa/verify` | POST | Verify and enable MFA | Authenticated |
| `/api/v1/auth/mfa/status` | GET | Get MFA configuration | Authenticated |
| `/api/v1/auth/mfa/disable` | POST | Disable MFA | MFA required |
| `/api/v1/auth/mfa/regenerate-backup-codes` | POST | Generate new backup codes | MFA required |

### Session Management Endpoints

| Endpoint | Method | Description | Security |
|----------|--------|-------------|----------|
| `/api/v1/auth/sessions` | GET | List active sessions | Authenticated |
| `/api/v1/auth/sessions/{id}` | DELETE | Revoke specific session | Authenticated |
| `/api/v1/auth/security` | GET | Security overview | Authenticated |

## Frontend Components

### React Components

1. **MFASetup** (`src/components/auth/MFASetup.tsx`)
   - QR code display for authenticator apps
   - Manual secret key entry
   - Backup code download
   - Step-by-step setup flow

2. **MFAVerification** (`src/components/auth/MFAVerification.tsx`)
   - TOTP code input
   - Backup code verification
   - Tabbed interface for code types

3. **SessionManager** (`src/components/auth/SessionManager.tsx`)
   - Active session listing
   - Device information display
   - Individual session revocation
   - Bulk logout functionality

4. **SecuritySettings** (`src/components/auth/SecuritySettings.tsx`)
   - Comprehensive security dashboard
   - MFA status and controls
   - Session overview
   - Security recommendations

### React Hooks

1. **useSecureAuth** (`src/hooks/useSecureAuth.ts`)
   - Secure authentication state management
   - AuthProvider context component
   - Automatic token refresh

2. **useMFA**
   - MFA operations (setup, verify, disable)
   - Backup code management

3. **useSessionManagement**
   - Session listing and revocation
   - Security settings retrieval

## Security Features

### Session Security

- **Server-side tracking**: All sessions stored in Redis with metadata
- **Automatic expiry**: Sessions expire after 24 hours of inactivity
- **Session limits**: Maximum 3 concurrent sessions per user
- **Device tracking**: User agent, IP address, and device fingerprinting
- **Immediate revocation**: JWT blacklisting for instant session termination

### MFA Implementation

- **TOTP standard**: RFC 6238 compliant time-based codes
- **QR code generation**: Easy setup with authenticator apps
- **Backup codes**: 8 single-use recovery codes
- **Secure storage**: Backup codes hashed with SHA-256
- **Admin enforcement**: MFA required for all admin accounts

### Token Security

- **HttpOnly cookies**: Tokens not accessible to JavaScript
- **CSRF protection**: Anti-forgery tokens for state-changing operations
- **Automatic refresh**: Transparent token renewal before expiry
- **Secure flags**: SameSite=Strict, Secure, HttpOnly cookie attributes

## Configuration

### Environment Variables

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379

# Session Management
MAX_SESSIONS_PER_USER=3
SESSION_TIMEOUT_HOURS=24

# MFA Configuration
MFA_APP_NAME="Wheels & Wins"
MFA_ISSUER="wheelsandwins.com"
MFA_BACKUP_CODE_COUNT=8
MFA_BACKUP_CODE_LENGTH=8

# Security Settings
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Dependencies

Add to `backend/requirements.txt`:

```txt
pyotp>=2.9.0  # TOTP for MFA
qrcode[pil]>=7.4.0  # QR code generation
redis>=5.0.0  # Redis client for session management
aioredis==2.0.1  # Async Redis client
```

## Testing Plan

### Unit Tests

1. **Session Manager Tests**
   ```python
   test_create_session()
   test_session_expiry()
   test_session_limits()
   test_jwt_blacklisting()
   test_cleanup_expired_sessions()
   ```

2. **MFA Service Tests**
   ```python
   test_mfa_setup()
   test_totp_verification()
   test_backup_codes()
   test_qr_code_generation()
   test_admin_mfa_enforcement()
   ```

3. **Authentication Flow Tests**
   ```python
   test_secure_login()
   test_mfa_required_login()
   test_token_refresh()
   test_session_invalidation()
   test_csrf_protection()
   ```

### Integration Tests

1. **End-to-End Authentication Flow**
   - User registration → login → MFA setup → secure access
   - Token refresh and session management
   - Multi-device login and logout

2. **Security Scenarios**
   - Concurrent session limits
   - Session hijacking prevention
   - MFA bypass attempts
   - CSRF attack prevention

3. **Admin Security**
   - Mandatory MFA for admin accounts
   - Admin session monitoring
   - Privileged operation protection

## Deployment Instructions

### 1. Database Setup

Execute the SQL migration:

```bash
# In Supabase SQL Editor, run:
cat docs/sql-fixes/CREATE_SESSION_MFA_TABLES.sql
```

### 2. Redis Setup

Ensure Redis is running and accessible:

```bash
# Local development
redis-server

# Production (use managed Redis service)
# Update REDIS_URL environment variable
```

### 3. Backend Deployment

Install dependencies:

```bash
cd backend
pip install pyotp qrcode[pil] redis aioredis
```

### 4. Frontend Integration

Update authentication calls to use secure service:

```typescript
import { AuthProvider } from '@/hooks/useSecureAuth';

// Wrap app with AuthProvider
<AuthProvider>
  <App />
</AuthProvider>
```

## Monitoring and Metrics

### Security Metrics

- **Active sessions per user**: Monitor for abuse
- **MFA adoption rate**: Track security compliance
- **Failed MFA attempts**: Detect brute force attacks
- **Session anomalies**: Unusual device/location patterns

### Performance Metrics

- **Redis performance**: Session lookup times
- **Token refresh rates**: Automatic renewal success
- **MFA verification latency**: User experience impact

### Alerts

- **High failed MFA attempts**: Potential account compromise
- **Unusual session patterns**: Security investigation needed
- **Redis connectivity issues**: Session management degradation

## Security Considerations

### Threat Mitigation

1. **Session Hijacking**: Server-side session validation + device fingerprinting
2. **Token Theft**: HttpOnly cookies + CSRF protection
3. **Brute Force MFA**: Rate limiting + account lockout
4. **Session Fixation**: New session ID on authentication
5. **CSRF Attacks**: Anti-forgery tokens + SameSite cookies

### Best Practices

1. **Regular Security Audits**: Review active sessions and MFA status
2. **User Education**: Guide users on MFA setup and security practices
3. **Incident Response**: Automated alerts for suspicious activity
4. **Data Protection**: Encrypted session data and secure key management

## Maintenance

### Regular Tasks

- **Session cleanup**: Automated via Redis TTL and periodic cleanup
- **MFA audit**: Review user MFA status and enforcement
- **Security updates**: Keep dependencies updated
- **Monitoring review**: Analyze security metrics and alerts

### Troubleshooting

1. **Redis connectivity issues**: Check Redis URL and network connectivity
2. **MFA setup failures**: Verify QR code generation and TOTP library
3. **Session inconsistencies**: Review Redis data and cleanup procedures
4. **Token refresh problems**: Check cookie settings and CSRF tokens

## Migration from Legacy System

1. **Gradual rollout**: Enable for new users first
2. **Existing session handling**: Graceful degradation for old sessions
3. **MFA migration**: Optional MFA for existing users, mandatory for new
4. **Cookie transition**: Update frontend to use secure cookies
5. **Monitoring**: Track adoption and identify issues

This secure session management system provides enterprise-grade authentication security while maintaining usability and performance.