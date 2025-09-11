# 🚀 PUSH TO MAIN DEPLOYMENT CHECKLIST

**CRITICAL**: Complete ALL items before pushing to main to prevent production crashes!

## ⚠️ **Why This Matters**

During staging development, we've hardcoded staging backend URLs to fix connection issues. **These MUST be reverted to production URLs before pushing to main**, otherwise the production frontend will try to connect to staging backend and fail.

---

## 📋 **PRE-DEPLOYMENT CHECKLIST**

### 🔧 **1. Frontend Environment Routing**

#### **A. Update API Base URL** (`src/services/api.ts`)

**CURRENT (Staging):**
```typescript
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 
  import.meta.env.VITE_BACKEND_URL || 
  (import.meta.env.VITE_ENVIRONMENT === 'staging' 
    ? 'https://wheels-wins-backend-staging.onrender.com'  // Staging backend
    : 'https://pam-backend.onrender.com');  // Production backend
```

**CHANGE TO (Production):**
```typescript
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 
  import.meta.env.VITE_BACKEND_URL || 
  'https://pam-backend.onrender.com';  // Always use production backend for main
```

#### **B. Update PAM Connection Service** (`src/services/pamConnectionService.ts`)

**CURRENT (Staging Priority):**
```typescript
private backends = [
  import.meta.env.VITE_BACKEND_URL || 'https://wheels-wins-backend-staging.onrender.com',
  import.meta.env.VITE_API_URL || 'https://wheels-wins-backend-staging.onrender.com', 
  'https://wheels-wins-backend-staging.onrender.com',
  'https://pam-backend.onrender.com'  // Production fallback
].filter(Boolean);
```

**CHANGE TO (Production Priority):**
```typescript  
private backends = [
  import.meta.env.VITE_BACKEND_URL || 'https://pam-backend.onrender.com',
  import.meta.env.VITE_API_URL || 'https://pam-backend.onrender.com',
  'https://pam-backend.onrender.com',  // Primary production
  'https://wheels-wins-backend-staging.onrender.com'  // Staging fallback for testing
].filter(Boolean);
```

---

### 🔍 **2. Verify Environment Variables**

#### **A. Netlify Environment Variables (Production)**
Ensure these are set in Netlify production site settings:
- `VITE_SUPABASE_URL` → Production Supabase URL
- `VITE_SUPABASE_ANON_KEY` → Production Supabase anon key  
- `VITE_MAPBOX_TOKEN` → Production Mapbox token
- `VITE_BACKEND_URL` → `https://pam-backend.onrender.com`
- `VITE_API_URL` → `https://pam-backend.onrender.com`

#### **B. Backend Environment Variables (pam-backend.onrender.com)**
Ensure these are set in Render production backend:
- `ELEVENLABS_API_KEY` → Production ElevenLabs key
- `OPENAI_API_KEY` → Production OpenAI key
- `SUPABASE_SERVICE_ROLE_KEY` → Production Supabase service key
- `DATABASE_URL` → Production database URL

---

### 🌐 **3. URL Mapping Verification**

| Environment | Frontend URL | Backend URL | Deployment |
|-------------|--------------|-------------|------------|
| **Production** | wheelsandwins.com | pam-backend.onrender.com | main → Netlify |
| **Staging** | wheels-wins-staging.netlify.app | wheels-wins-backend-staging.onrender.com | staging → Netlify |

**Critical**: Production frontend MUST connect to production backend!

---

### 🧪 **4. Testing Requirements**

Before pushing to main, test these on staging:

- [ ] **Authentication** works without errors
- [ ] **PAM Chat** connects and responds  
- [ ] **Voice Auto-send** functions properly
- [ ] **TTS/Voice Output** plays correctly
- [ ] **No 429 Rate Limiting** errors
- [ ] **No CORS** errors in browser console
- [ ] **WebSocket** connections establish successfully

---

### 📝 **5. Code Review Checklist**

Search codebase for hardcoded staging URLs:

```bash
# Search for staging URLs that should be production
grep -r "wheels-wins-backend-staging" src/
grep -r "wheels-wins-staging.netlify.app" src/  
grep -r "staging" src/services/
```

**Remove or fix any hardcoded staging references!**

---

### 🚨 **6. Critical Files to Review**

Double-check these files before pushing:

- [ ] `src/services/api.ts` - API_BASE_URL points to production
- [ ] `src/services/pamConnectionService.ts` - backends array prioritizes production
- [ ] `src/integrations/supabase/client.ts` - uses production Supabase
- [ ] No hardcoded staging URLs anywhere in `src/services/`
- [ ] Environment variables set correctly in Netlify production

---

## 🚀 **DEPLOYMENT PROCESS**

### **Step 1: Pre-flight Check**
```bash
# Run this before pushing to main
npm run quality:check:full
npm run build
```

### **Step 2: Update URLs for Production**
1. Edit `src/services/api.ts` - Change API_BASE_URL to production
2. Edit `src/services/pamConnectionService.ts` - Prioritize production backend
3. Search and replace any remaining staging URLs

### **Step 3: Test Build**
```bash
npm run build
# Verify build succeeds with production URLs
```

### **Step 4: Create Pull Request**
- Create PR from staging → main
- **Include this checklist in PR description**
- Get approval before merging
- **Never push directly to main**

### **Step 5: Post-Deployment Verification**
After merging to main, immediately test:
- [ ] wheelsandwins.com loads successfully
- [ ] Authentication works
- [ ] PAM connects without errors
- [ ] No console errors
- [ ] Voice functionality works

---

## 🔄 **ROLLBACK PLAN**

If production breaks after deployment:

1. **Immediate**: Revert the main branch to previous working commit
2. **Emergency**: Temporarily point production frontend to staging backend (if needed)
3. **Fix**: Correct the issues in staging branch first
4. **Redeploy**: Only push to main after staging is verified working

---

## 📚 **Environment Architecture Reference**

```
PRODUCTION SYSTEM:
Frontend: wheelsandwins.com (Netlify main)
    ↓
Backend: pam-backend.onrender.com  
    ↓
Database: Shared Supabase (production tables)

STAGING SYSTEM:  
Frontend: wheels-wins-staging.netlify.app (Netlify staging)
    ↓
Backend: wheels-wins-backend-staging.onrender.com
    ↓  
Database: Same Supabase (staging context)
```

---

## ⚡ **QUICK REFERENCE**

**Production URLs to USE:**
- Frontend: `wheelsandwins.com`
- Backend: `https://pam-backend.onrender.com`
- Health: `https://pam-backend.onrender.com/health`

**Staging URLs to AVOID in main:**
- ❌ `wheels-wins-staging.netlify.app`
- ❌ `https://wheels-wins-backend-staging.onrender.com`

---

## 🏁 **FINAL REMINDER**

> **The #1 cause of production crashes is staging URLs in main branch code!**
> 
> Always assume staging-specific changes need to be reverted for production.
> When in doubt, test the production build locally first.

---

**✅ Checklist completed? Safe to push to main!**
**❌ Missing items? Fix in staging first, then retry this checklist.**