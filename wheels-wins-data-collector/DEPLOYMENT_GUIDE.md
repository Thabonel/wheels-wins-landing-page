# 🚀 Wheels & Wins Data Collector Deployment Guide

## 🎯 Goal: Achieve 500 Trips per Week

This guide will help you fix the data collector to meet the **500 trips/week target** that was failing (currently at ~5 trips/week).

## 🚨 Current Issue

The scraper was configured as **MONTHLY** instead of **WEEKLY**, causing massive underperformance:
- **Target**: 500 trips/week
- **Current**: ~5 trips/week (1% of target)
- **Root Cause**: Running monthly instead of weekly/daily

## ✅ Fixes Applied

### 1. Fixed Schedule Configuration
- Updated `render.yaml` to run **weekly** (`0 2 * * 0` - Sundays at 2 AM UTC)
- Created `render-daily.yaml` as backup option for daily collection
- Added `main_daily.py` for daily collection (~72 trips/day × 7 = 504/week)

### 2. Enhanced Collection Logic
- **Weekly target**: 500 trips
- **Daily target**: 72 trips (if running daily)
- Smart distribution across camping, parks, attractions
- Performance monitoring and alerts

### 3. Added Performance Monitoring
- Real-time tracking of 500/week target
- Performance alerts when below 400/week
- Weekly performance reports
- Health status monitoring

## 🔧 Deployment Options

### Option 1: Weekly Collection (Recommended)
**Best for stable, consistent collection**

1. **Update Render Configuration**:
   ```bash
   # In Render Dashboard:
   # 1. Go to wheels-wins-data-collector service
   # 2. Update cron schedule to: 0 2 * * 0
   # 3. Ensure command is: python main_autonomous.py
   ```

2. **Verify Environment Variables**:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_service_role_key
   COLLECTOR_ENV=production
   ```

### Option 2: Daily Collection (Backup)
**Use if weekly collection isn't hitting targets**

1. **Create New Service** in Render:
   - Use `render-daily.yaml` configuration
   - Schedule: `0 2 * * *` (daily at 2 AM UTC)
   - Command: `python main_daily.py`

## 🚀 Immediate Actions Required

### Step 1: Fix Current Schedule
```bash
# In Render Dashboard
1. Go to wheels-wins-data-collector
2. Settings → Cron Schedule
3. Change from: "0 2 1 * *" (monthly)
4. Change to: "0 2 * * 0" (weekly)
5. Save changes
```

### Step 2: Trigger Manual Run
```bash
# In Render Dashboard
1. Go to wheels-wins-data-collector
2. Click "Trigger Run" button
3. Monitor logs for successful collection
4. Should collect ~500 trips in one run
```

### Step 3: Monitor Performance
```bash
# Run performance check locally
cd wheels-wins-data-collector
python check_performance.py
```

## 📊 Expected Results After Fix

### Before Fix (Current):
- **Schedule**: Monthly (1st of month)
- **Collection**: ~106 total trips (5/week average)
- **Status**: 🔴 Critical failure (1% of target)

### After Fix (Expected):
- **Schedule**: Weekly (every Sunday)
- **Collection**: 500 trips/week
- **Status**: 🟢 Meeting target (100% performance)

## 🔍 Performance Monitoring

### Check Current Status
```bash
# Run the performance checker
python check_performance.py

# Expected output:
# 📊 WEEKLY PERFORMANCE REPORT
# Week Start    Trips    Days Active  Status
# 2025-01-12    487      1            ⚠️ Close to Target
# 2025-01-05    523      1            ✅ Target Met
```

### Health Indicators
- **🟢 Excellent**: 500+ trips/week, daily activity
- **🟡 Good**: 400-499 trips/week, regular activity
- **🟠 Warning**: 300-399 trips/week, irregular activity
- **🔴 Critical**: <300 trips/week or no activity >7 days

## 🛠️ Troubleshooting

### Issue: Still Not Collecting
```bash
# Check logs in Render dashboard
1. Go to service logs
2. Look for errors in collection
3. Verify API keys are working
4. Check database connection
```

### Issue: Low Collection Numbers
```bash
# Switch to daily collection
1. Deploy render-daily.yaml
2. Target: 72 trips/day × 7 = 504/week
3. More frequent runs = more reliable
```

### Issue: API Rate Limits
```bash
# Collection plan adjusts automatically:
# - Camping: High-value content (40-70% of target)
# - Parks: Government data (20-30% of target)
# - Attractions: Tourist spots (10-30% of target)
```

## 📈 Success Metrics

Track these metrics weekly:

1. **Volume**: 500+ trips collected per week
2. **Consistency**: <7 days between collections
3. **Quality**: >80% of trips have complete data
4. **Diversity**: Mix of camping, parks, attractions
5. **Geographic**: Coverage across target regions

## 🚨 Emergency Procedures

### If Scraper Goes Down
1. **Immediate**: Trigger manual run in Render
2. **Check**: Review error logs and environment variables
3. **Escalate**: Switch to daily collection if weekly fails
4. **Monitor**: Use performance checker to track recovery

### If Performance Drops
1. **Alert Threshold**: <400 trips/week triggers warning
2. **Action**: Investigate data sources and API limits
3. **Backup**: Switch collection strategy or add sources
4. **Recovery**: Aim to return to 500+/week within 2 weeks

## 📞 Support Contacts

- **Render Issues**: Check Render service status and documentation
- **Database Issues**: Verify Supabase connection and RLS policies
- **API Issues**: Check external service status (NPS, Recreation.gov, etc.)

---

## ✅ Deployment Checklist

- [ ] Update Render cron schedule to weekly
- [ ] Trigger manual run to test
- [ ] Monitor logs for successful collection
- [ ] Run performance check script
- [ ] Verify 500+ trips collected
- [ ] Set up regular monitoring
- [ ] Document any issues or optimizations

**Target Timeline**: Should see 500 trips/week within 1-2 collection cycles after deployment.

---

*Last Updated: January 2025*
*Target: 500 trips per week for Wheels & Wins platform*