# Staging Authentication Fix Documentation

## Problem Solved
The staging site authentication was failing because OAuth redirect URLs were hardcoded to production (`https://wheelsandwins.com`), preventing staging from working properly.

## Solution Implemented
Fixed authentication to use dynamic URLs based on the current domain, allowing the SAME Supabase instance to work with multiple environments (production, staging, localhost).

### Code Changes Made

#### 1. **Login.tsx** (lines 38-39)
**Before:**
```typescript
const redirectUrl = window.location.hostname === 'localhost'
  ? `${window.location.origin}/you`
  : `https://wheelsandwins.com/you`;
```

**After:**
```typescript
const redirectUrl = `${window.location.origin}/you`;
```

#### 2. **Signup.tsx** (lines 28-29)
**Before:**
```typescript
const redirectUrl = window.location.hostname === 'localhost'
  ? `${window.location.origin}/onboarding`
  : `https://wheelsandwins.com/onboarding`;
```

**After:**
```typescript
const redirectUrl = `${window.location.origin}/onboarding`;
```

#### 3. **SignupForm.tsx** - Already correct ✅
```typescript
const redirectUrl = `${window.location.origin}/you`;
```

#### 4. **PasswordResetRequestForm.tsx** - Already correct ✅
```typescript
const redirectTo = `${window.location.origin}/update-password`;
```

## Supabase Configuration Required

### CRITICAL: Update Supabase Dashboard Settings

You must add the staging URLs to your Supabase project's authentication settings:

1. **Go to Supabase Dashboard** → Your Project → Authentication → URL Configuration

2. **Add these Redirect URLs** (keep existing ones):
   ```
   https://wheelsandwins.com/*
   https://staging--wheels-and-wins.netlify.app/*
   http://localhost:8080/*
   http://localhost:5173/*
   ```

3. **Site URL setting** - Keep as production:
   ```
   https://wheelsandwins.com
   ```

4. **For OAuth Providers (Google/Facebook)**:
   - Go to Authentication → Providers
   - For each provider, ensure the callback URL includes both domains
   - The callback URL format is:
     ```
     https://[your-project-ref].supabase.co/auth/v1/callback
     ```

### OAuth Provider Configuration

#### Google OAuth Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project → APIs & Services → Credentials
3. Edit your OAuth 2.0 Client
4. Add to **Authorized JavaScript origins**:
   ```
   https://staging--wheels-and-wins.netlify.app
   ```
5. Add to **Authorized redirect URIs**:
   ```
   https://[your-project-ref].supabase.co/auth/v1/callback
   ```

#### Facebook App Settings
1. Go to [Facebook Developers](https://developers.facebook.com)
2. Select your app → Settings → Basic
3. Add to **App Domains**:
   ```
   staging--wheels-and-wins.netlify.app
   ```
4. Under Facebook Login → Settings, ensure **Valid OAuth Redirect URIs** includes:
   ```
   https://[your-project-ref].supabase.co/auth/v1/callback
   ```

## Benefits of This Approach

✅ **Single Supabase Instance** - No database synchronization issues
✅ **No Schema Duplication** - One source of truth for database structure
✅ **Unified User Data** - Users exist in one place only
✅ **Environment Agnostic** - Code works on any domain automatically
✅ **Future Proof** - New staging/preview URLs work without code changes
✅ **Cost Effective** - No need for multiple Supabase projects

## Testing Checklist

After making the Supabase configuration changes:

- [ ] Test email/password login on staging
- [ ] Test email/password signup on staging
- [ ] Test Google OAuth on staging
- [ ] Test Facebook OAuth on staging
- [ ] Test password reset on staging
- [ ] Verify production still works
- [ ] Verify localhost development still works

## Deployment

1. **Deploy code changes** - Already done with this fix
2. **Update Supabase settings** - Follow configuration steps above
3. **Clear browser cache** - Important for OAuth redirects
4. **Test all auth flows** - Use checklist above

## Troubleshooting

If authentication still fails after these changes:

1. **Check browser console** for specific error messages
2. **Verify Supabase URL Configuration** includes staging domain
3. **Check OAuth provider settings** for both Google and Facebook
4. **Ensure environment variables** are set in Netlify staging:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. **Clear all cookies** for the staging domain and retry

## Important Notes

- The staging site uses the SAME Supabase database as production
- User accounts are shared between environments
- Be careful with data modifications in staging
- Consider using feature flags for staging-specific testing

## Contact for Issues

If you encounter issues after following this guide:
1. Check the browser console for specific errors
2. Verify all URLs are correctly configured in Supabase
3. Ensure OAuth providers have staging domain authorized