# Edge Functions Deployment Guide
**Date**: January 10, 2025
**Status**: Ready for Staging Deployment

---

## 🎯 Quick Deployment (Recommended)

### **Option 1: Via Supabase Dashboard** (No Docker Required)

This is the fastest method and doesn't require Docker to be running.

#### **Step 1: Access Supabase Dashboard**
1. Go to https://app.supabase.com
2. Select project: **newwheelsandwins** (or your staging project)
3. Navigate to: **Edge Functions** (left sidebar)

#### **Step 2: Deploy pam-spend-summary**

1. Click **"New Function"** or **"Deploy New"**
2. Choose **"Upload File"** or use VS Code extension
3. Name: `pam-spend-summary`
4. Copy/paste the following files:

**Main File** (`index.ts`):
```
Location: supabase/functions/pam-spend-summary/index.ts
```

**Shared Types** (`_shared/types.ts`):
```
Location: supabase/functions/_shared/types.ts
```

**Shared Utils** (`_shared/utils.ts`):
```
Location: supabase/functions/_shared/utils.ts
```

5. Configure:
   - **Verify JWT**: ✅ **Enabled** (Required)
   - **Import Map**: Not needed (we use direct URLs)
   - **Environment Variables**: Already set (SUPABASE_URL, SUPABASE_ANON_KEY)

6. Click **"Deploy"**

#### **Step 3: Deploy pam-expense-create**

Repeat Step 2 with:
- Name: `pam-expense-create`
- File: `supabase/functions/pam-expense-create/index.ts`
- Shared files: Same `_shared/types.ts` and `_shared/utils.ts`
- **Verify JWT**: ✅ **Enabled**

#### **Step 4: Deploy pam-fuel-estimate**

Repeat Step 2 with:
- Name: `pam-fuel-estimate`
- File: `supabase/functions/pam-fuel-estimate/index.ts`
- Shared files: Same `_shared/types.ts` and `_shared/utils.ts`
- **Verify JWT**: ✅ **Enabled**

---

## 🐳 Option 2: Via CLI (Requires Docker)

If you prefer using the CLI and have Docker running:

### **Prerequisites:**
```bash
# 1. Start Docker Desktop
open -a Docker

# 2. Wait for Docker to start (check status bar)

# 3. Verify Docker is running
docker ps
```

### **Deploy Commands:**

```bash
# Deploy all 3 functions at once
cd /Users/thabonel/Code/wheels-wins-landing-page

supabase functions deploy pam-spend-summary
supabase functions deploy pam-expense-create
supabase functions deploy pam-fuel-estimate

# Or deploy all at once
supabase functions deploy
```

---

## ✅ Verify Deployment

### **1. Check Supabase Dashboard**

After deployment, verify in dashboard:
1. Go to **Edge Functions**
2. Should see 3 new functions:
   - `pam-spend-summary` (STATUS: ACTIVE)
   - `pam-expense-create` (STATUS: ACTIVE)
   - `pam-fuel-estimate` (STATUS: ACTIVE)

### **2. Test with curl**

**Get your JWT token:**
1. Open your app: https://wheels-wins-staging.netlify.app (or production)
2. Open DevTools → Application → Local Storage
3. Copy the JWT token from `supabase.auth.token`

**Test pam-spend-summary:**
```bash
TOKEN="your_jwt_token_here"

curl -X GET "https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/pam-spend-summary" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "current_month": "2025-01",
  "total": 1234.56,
  "by_category": [
    {
      "category": "gas",
      "amount": 450.00,
      "percentage": 36.4,
      "count": 12
    }
  ],
  "vs_last_month": -8.5,
  "top_expense": {
    "amount": 120.00,
    "description": "Diesel fill-up",
    "date": "2025-01-15"
  },
  "trend_7d": [45, 67, 23, 89, 34, 56, 78],
  "budget_remaining": 265.44
}
```

**Test pam-expense-create:**
```bash
curl -X POST "https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/pam-expense-create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 45.50,
    "category": "gas",
    "description": "Test expense via Edge Function"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "expense": {
    "id": 123,
    "user_id": "...",
    "amount": 45.50,
    "category": "gas",
    "date": "2025-01-10",
    "description": "Test expense via Edge Function",
    "created_at": "2025-01-10T14:30:00Z"
  },
  "message": "Expense of $45.50 logged for gas ($254.50 remaining)",
  "budget_status": {
    "category": "gas",
    "spent": 445.50,
    "limit": 700.00,
    "remaining": 254.50,
    "percentage_used": 63.6
  }
}
```

**Test pam-fuel-estimate:**
```bash
curl -X POST "https://kycoklimpzkyrecbjecn.supabase.co/functions/v1/pam-fuel-estimate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "distance_km": 450,
    "fuel_efficiency_l_per_100km": 12.5,
    "fuel_price_per_liter": 1.45
  }'
```

**Expected Response:**
```json
{
  "distance_km": 450,
  "fuel_needed_liters": 56.25,
  "estimated_cost": 81.56,
  "fuel_price_per_liter": 1.45,
  "fuel_efficiency": 12.5,
  "calculation": {
    "formula": "Fuel Needed (L) = (Distance × Efficiency) / 100; Cost = Fuel × Price",
    "steps": [
      "Step 1: Calculate fuel needed: (450 km × 12.5 L/100km) / 100 = 56.25 L",
      "Step 2: Calculate cost: 56.25 L × $1.45/L = $81.56"
    ]
  }
}
```

---

## 🔍 Monitor Deployment

### **View Logs:**

**In Supabase Dashboard:**
1. Go to **Edge Functions**
2. Click on function name (e.g., `pam-spend-summary`)
3. Click **"Logs"** tab
4. Watch for incoming requests

**Expected log entries:**
```json
{
  "level": "INFO",
  "function": "pam-spend-summary",
  "message": "Request received",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-10T14:30:00Z"
}
```

### **Check Performance:**

In dashboard, monitor:
- **Invocations**: Should see requests coming in
- **Execution Time**: Target <300ms
- **Error Rate**: Should be 0%
- **Status**: Should be "ACTIVE"

---

## 🚨 Troubleshooting

### **Error: "Function not found" (404)**

**Problem**: Function not deployed or wrong URL

**Solution:**
1. Check function is listed in dashboard
2. Verify URL format: `https://[PROJECT_REF].supabase.co/functions/v1/[FUNCTION_NAME]`
3. Correct project ref: `kycoklimpzkyrecbjecn`

### **Error: "Authentication required" (401)**

**Problem**: Missing or invalid JWT token

**Solution:**
1. Get fresh token from app (tokens expire after 1 hour)
2. Verify token format: `Bearer eyJhbGciOiJIUzI1NiIs...`
3. Check function has `verify_jwt = true` in config.toml

### **Error: "Internal server error" (500)**

**Problem**: Code error or missing dependencies

**Solution:**
1. Check function logs in dashboard
2. Look for error stack trace
3. Verify shared files (_shared/types.ts, _shared/utils.ts) were included
4. Check environment variables (SUPABASE_URL, SUPABASE_ANON_KEY)

### **Error: "Database error"**

**Problem**: Missing tables or RLS policies

**Solution:**
1. Verify `expenses` table exists
2. Verify `budgets` table exists (if using budget features)
3. Check RLS policies allow user to read/write their own data
4. Test query in Supabase SQL editor:
   ```sql
   SELECT * FROM expenses WHERE user_id = auth.uid() LIMIT 10;
   ```

---

## 📝 Post-Deployment Checklist

After successful deployment:

- [ ] All 3 functions show STATUS: ACTIVE in dashboard
- [ ] Test each function with curl (returns 200/201, not 404/500)
- [ ] Check logs show no errors
- [ ] Verify response times <300ms
- [ ] Confirm JWT authentication working
- [ ] Test with invalid token (should return 401)
- [ ] Test with missing required fields (should return 400)

---

## 🎯 Next Steps: Agent Reviews

Once deployment is verified, run specialized agent reviews:

```bash
# Launch agents in parallel (single message with multiple Task calls)
1. code-reviewer - Review deployed function code
2. security-auditor - Penetration testing, check vulnerabilities
3. performance-optimizer - Measure latency, check caching
4. database-architect - Verify queries and indexes
```

See **PRODUCT_ROADMAP.md** Week 1 for detailed agent review checklist.

---

## 📊 Success Metrics

After 24 hours of deployment, verify:

| Metric | Target | How to Check |
|--------|--------|--------------|
| Invocations | >0 | Dashboard → Functions → Metrics |
| P95 Latency | <300ms | Dashboard → Functions → Performance |
| Error Rate | <1% | Dashboard → Functions → Logs |
| Cache Hit Rate | >50% | Check response headers |

---

## 🔄 Rollback Plan

If deployment causes issues:

### **Option 1: Disable Function**
1. Dashboard → Edge Functions → [Function Name]
2. Click **"Disable"**
3. Function becomes inactive immediately

### **Option 2: Revert to Previous Version**
1. Dashboard → Edge Functions → [Function Name]
2. Click **"Versions"** tab
3. Select previous version
4. Click **"Deploy"**

### **Option 3: Delete Function**
1. Dashboard → Edge Functions → [Function Name]
2. Click **"Delete"**
3. Confirm deletion
4. Function completely removed

---

**Last Updated**: January 10, 2025
**Deployed By**: Claude Code + User
**Environment**: Staging (kycoklimpzkyrecbjecn)
