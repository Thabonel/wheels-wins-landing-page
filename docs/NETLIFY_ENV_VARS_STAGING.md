# Netlify Environment Variables - Staging

**Site**: wheels-wins-staging.netlify.app
**Branch**: staging
**Backend**: https://wheels-wins-backend-staging.onrender.com

## Required Environment Variables

### Critical for OpenAI Realtime PAM

```bash
VITE_API_BASE_URL=https://wheels-wins-backend-staging.onrender.com
```

**Purpose**: Tells the frontend where to send API requests (including OpenAI Realtime session creation)

**Without this**: Frontend defaults to `http://localhost:8000` which causes CSP errors

### Other Required Variables

Copy these from your production Netlify site:

```bash
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_ANTHROPIC_API_KEY=<your-anthropic-key>
VITE_GEMINI_API_KEY=<your-gemini-key>
VITE_MAPBOX_TOKEN=<your-mapbox-token>
OPENAI_API_KEY=<your-openai-key>
```

## How to Add/Update Variables

1. **Netlify Dashboard** → Select `wheels-wins-staging` site
2. **Site settings** → **Environment variables**
3. **Add/Edit variable**
4. **Important**: After adding variables:
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Clear cache and deploy site**
   - Wait for build to complete (2-3 minutes)

## Verification

After deployment completes, check the browser console:

**Before fix**:
```
Refused to connect to 'http://localhost:8000/api/v1/pam/realtime/create-session'
```

**After fix**:
```
✅ Got session token from backend
✅ Connected directly to OpenAI Realtime API
```

## Troubleshooting

### Still seeing localhost:8000?

1. **Check Netlify build logs** - verify environment variable is present
2. **Hard refresh browser** - Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. **Clear browser cache** completely
4. **Check Console** - look for "🔧 Environment Configuration Status"

### CSP Error?

If you see "Content Security Policy" error but with the correct URL, check `index.html` CSP meta tag includes the staging backend URL.

## Testing Checklist

After deployment:

- [ ] Hard refresh browser (Cmd+Shift+R)
- [ ] Login to staging site
- [ ] Open PAM
- [ ] Click voice mode button
- [ ] Check console for "✅ Got session token from backend"
- [ ] Verify OpenAI WebSocket connection succeeds
- [ ] Test voice interaction

---

**Last Updated**: October 18, 2025
**Status**: Required for OpenAI Realtime PAM launch
