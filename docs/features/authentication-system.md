
# Authentication System

## Overview
PAM uses Supabase Auth for user authentication with support for multiple authentication methods and enhanced security features.

## Features

### Authentication Methods
- **Email/Password**: Traditional email and password authentication
- **OAuth Providers**: Google, GitHub, and other social logins
- **Magic Links**: Passwordless authentication via email
- **Two-Factor Authentication (2FA)**: SMS-based 2FA for enhanced security

### Security Features
- JWT token-based authentication
- Row Level Security (RLS) policies
- Session management
- Active session monitoring
- Login history tracking
- Account security settings

## Components

### Core Auth Components
- `LoginForm.tsx` - Email/password login interface
- `SignupForm.tsx` - User registration form
- `OAuthButtons.tsx` - Social login buttons
- `PasswordInput.tsx` - Secure password input with visibility toggle

### Security Components
- `TwoFactorAuth.tsx` - 2FA setup and management
- `AccountSecurity.tsx` - Security settings dashboard
- `ActiveSessions.tsx` - Active session management
- `LoginHistory.tsx` - Login activity tracking

### Context & Hooks
- `AuthContext.tsx` - Global authentication state
- `useProfile.ts` - User profile management
- `useTwoFactorAuth.ts` - 2FA functionality
- `useActiveSessions.ts` - Session management
- `useLoginHistory.ts` - Login tracking

## User Journey

### Registration
1. User visits signup page
2. Fills out registration form
3. Email verification sent
4. Account activated upon verification
5. Optional 2FA setup

### Login
1. User enters credentials
2. Optional 2FA verification
3. JWT token issued
4. Session established
5. Redirect to dashboard

### Security Management
1. Access security settings
2. View active sessions
3. Configure 2FA
4. Review login history
5. Manage account security

## API Integration

### Supabase Auth
- User registration and login
- OAuth provider configuration
- Session management
- Password reset functionality

### Edge Functions
- `setup-2fa` - Two-factor authentication setup
- `verify-2fa` - 2FA verification
- `delete-user` - Account deletion

## Configuration

### Environment Variables
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

### Security Settings
- JWT expiration time
- Session timeout
- 2FA requirements
- Password complexity rules

## Troubleshooting

### Common Issues
- Redirect URL configuration
- OAuth provider setup
- Email verification delays
- 2FA code delivery issues

### Error Handling
- Invalid credentials
- Expired tokens
- Network connectivity
- Rate limiting
