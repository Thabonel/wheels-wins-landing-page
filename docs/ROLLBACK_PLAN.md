# PAM Deployment Rollback Plan

## 🚨 Emergency Rollback Procedures

This document outlines the comprehensive rollback procedures for the PAM system deployment. Use this plan when critical issues are detected in production that cannot be resolved through feature flags or hotfixes.

## 📋 Rollback Decision Criteria

### Immediate Rollback Required
Execute immediate rollback when any of these conditions occur:

- **Critical Security Vulnerability**: Authentication bypass, data exposure
- **System Downtime**: >5 minutes of complete service unavailability  
- **Data Corruption**: User data loss or corruption detected
- **Performance Degradation**: >50% increase in response times for >10 minutes
- **Error Rate Spike**: >20% error rate for >5 minutes
- **Memory Leak**: Memory usage increasing continuously beyond 200MB

### Consider Rollback
Evaluate rollback for these conditions:

- **Feature Failures**: Core PAM features not working for >25% of users
- **Browser Compatibility**: Major functionality broken in primary browsers
- **Voice Feature Issues**: Complete voice failure (can be mitigated with feature flags)
- **Accessibility Violations**: WCAG compliance failures (can be hotfixed)
- **Performance Issues**: 20-50% performance degradation

## 🔄 Rollback Strategies

### 1. Feature Flag Rollback (Preferred - 30 seconds)

**When to Use**: Minor feature issues, performance problems, specific feature failures

```bash
# Immediate feature disable via feature flags
curl -X POST https://api.wheelsandwins.com/admin/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "PAM_ENHANCED_UI": {"enabled": false, "rolloutPercentage": 0},
    "PAM_VOICE_FEATURES": {"enabled": false, "rolloutPercentage": 0},
    "PAM_PERFORMANCE_OPTIMIZATIONS": {"enabled": false, "rolloutPercentage": 0}
  }'
```

**Steps**:
1. Access admin panel or API
2. Disable problematic features
3. Verify user experience reverts to stable state
4. Monitor metrics for recovery

### 2. Gradual Rollback (2-5 minutes)

**When to Use**: Performance issues, compatibility problems

```bash
# Reduce rollout percentage gradually
# Week 4 (100%) → Week 3 (50%) → Week 2 (25%) → Week 1 (10%) → Off (0%)

# Reduce to 50%
curl -X POST https://api.wheelsandwins.com/admin/feature-flags \
  -d '{"PAM_ENHANCED_UI": {"rolloutPercentage": 50}}'

# Reduce to 25%
curl -X POST https://api.wheelsandwins.com/admin/feature-flags \
  -d '{"PAM_ENHANCED_UI": {"rolloutPercentage": 25}}'

# Disable completely
curl -X POST https://api.wheelsandwins.com/admin/feature-flags \
  -d '{"PAM_ENHANCED_UI": {"rolloutPercentage": 0}}'
```

### 3. Code Rollback (5-10 minutes)

**When to Use**: Critical bugs, security issues, system failures

#### Frontend Rollback (Netlify)

```bash
# Method 1: Revert to previous deployment
netlify api createSiteRevert --site-id $SITE_ID --deploy-id $PREVIOUS_DEPLOY_ID

# Method 2: Deploy from previous commit
git checkout $PREVIOUS_STABLE_COMMIT
npm run build:production
netlify deploy --prod --dir=dist

# Method 3: Emergency deployment from main branch
git checkout main
git revert $PROBLEMATIC_COMMIT_HASH
npm run build:production
netlify deploy --prod --dir=dist
```

#### Backend Rollback (Render)

```bash
# Method 1: Revert deployment via Render dashboard
# 1. Go to Render dashboard
# 2. Select service (pam-backend)
# 3. Click "Deployments" tab
# 4. Click "Rollback" on previous stable deployment

# Method 2: Deploy from previous commit
git checkout $PREVIOUS_STABLE_COMMIT
git push origin main --force  # Triggers auto-deploy

# Method 3: Emergency branch deployment
git checkout -b emergency-rollback
git revert $PROBLEMATIC_COMMIT_HASH
git push origin emergency-rollback
# Update Render to deploy from emergency-rollback branch
```

### 4. Full System Rollback (10-15 minutes)

**When to Use**: Complete system failure, multiple critical issues

```bash
# Complete rollback script
#!/bin/bash

echo "🚨 EXECUTING FULL PAM SYSTEM ROLLBACK"

# 1. Disable all PAM features
echo "Disabling all PAM features..."
curl -X POST https://api.wheelsandwins.com/admin/feature-flags/disable-all-pam

# 2. Revert frontend
echo "Rolling back frontend..."
netlify api createSiteRevert --site-id $NETLIFY_SITE_ID --deploy-id $STABLE_DEPLOY_ID

# 3. Revert backend
echo "Rolling back backend..."
git checkout $STABLE_BACKEND_COMMIT
git push origin main --force

# 4. Clear caches
echo "Clearing caches..."
curl -X POST https://api.wheelsandwins.com/admin/cache/clear

# 5. Notify team
echo "Sending notifications..."
curl -X POST $SLACK_WEBHOOK_URL \
  -d '{"text": "🚨 PAM SYSTEM ROLLBACK EXECUTED - All systems reverted to stable state"}'

echo "✅ Full rollback completed"
```

## 📊 Rollback Monitoring

### Immediate Checks (0-2 minutes)
```bash
# Health check script
#!/bin/bash

echo "🔍 POST-ROLLBACK HEALTH CHECKS"

# Check frontend
echo "Checking frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://wheelsandwins.com/health)
echo "Frontend: $FRONTEND_STATUS"

# Check backend  
echo "Checking backend..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://pam-backend.onrender.com/health)
echo "Backend: $BACKEND_STATUS"

# Check database
echo "Checking database..."
DB_STATUS=$(curl -s https://api.wheelsandwins.com/health/db | jq -r '.status')
echo "Database: $DB_STATUS"

# Check PAM functionality
echo "Checking PAM..."
PAM_STATUS=$(curl -s https://api.wheelsandwins.com/health/pam | jq -r '.status')
echo "PAM: $PAM_STATUS"

if [[ "$FRONTEND_STATUS" == "200" && "$BACKEND_STATUS" == "200" && "$DB_STATUS" == "healthy" && "$PAM_STATUS" == "healthy" ]]; then
  echo "✅ All systems healthy after rollback"
else
  echo "❌ Some systems still unhealthy - investigate immediately"
fi
```

### Performance Verification (2-10 minutes)
Monitor these metrics post-rollback:

- **Response Times**: Should return to baseline (<500ms)
- **Error Rates**: Should drop below 2%  
- **Memory Usage**: Should stabilize below 100MB
- **User Experience**: Monitor user feedback and support tickets

### Data Integrity Checks (5-15 minutes)
```sql
-- Check for data corruption after rollback
SELECT 
  COUNT(*) as total_conversations,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_conversations,
  COUNT(CASE WHEN response IS NULL THEN 1 END) as incomplete_conversations
FROM pam_conversations;

-- Verify user profiles are intact  
SELECT COUNT(*) as total_users, COUNT(CASE WHEN settings IS NOT NULL THEN 1 END) as users_with_settings
FROM profiles;

-- Check for failed transactions
SELECT COUNT(*) as failed_transactions 
FROM expenses 
WHERE created_at > NOW() - INTERVAL '1 hour' AND amount IS NULL;
```

## 🚨 Emergency Contacts

### Immediate Response Team
- **Technical Lead**: dev-team@wheelsandwins.com
- **DevOps Engineer**: ops@wheelsandwins.com  
- **Product Owner**: product@wheelsandwins.com
- **CEO/CTO**: leadership@wheelsandwins.com

### Escalation Matrix
1. **0-5 minutes**: Engineering team handles rollback
2. **5-15 minutes**: Technical lead + DevOps involved
3. **15+ minutes**: Product owner + Leadership notified
4. **30+ minutes**: All hands, customer communications

### Communication Channels
- **Internal**: Slack #pam-incidents channel
- **External**: Twitter @wheelsandwins, status page
- **Users**: In-app notifications, email if needed

## 📝 Rollback Checklist

### Pre-Rollback (1-2 minutes)
- [ ] **Confirm rollback criteria met** (severity, duration, impact)
- [ ] **Identify rollback strategy** (feature flags vs code vs full)
- [ ] **Notify team** in #pam-incidents Slack channel
- [ ] **Document issue** in incident tracking system
- [ ] **Prepare monitoring** dashboards and logs

### During Rollback (2-10 minutes)
- [ ] **Execute rollback** using appropriate strategy
- [ ] **Monitor rollback progress** via dashboards
- [ ] **Verify systems health** using health check scripts
- [ ] **Test critical user journeys** manually
- [ ] **Communicate progress** to team and stakeholders

### Post-Rollback (10-60 minutes)
- [ ] **Confirm stability** for 15+ minutes
- [ ] **Verify data integrity** using SQL checks
- [ ] **Check user experience** via support channels
- [ ] **Update status page** (if public communication needed)
- [ ] **Document lessons learned** for post-mortem
- [ ] **Plan fix strategy** and timeline for re-deployment

## 🔄 Recovery Procedures

### After Successful Rollback

1. **Root Cause Analysis** (1-4 hours)
   - Analyze logs and metrics during incident
   - Identify specific cause of the issue
   - Determine if issue was code, configuration, or environmental

2. **Fix Development** (4-24 hours)  
   - Develop and test fix in development environment
   - Validate fix resolves root cause
   - Ensure fix doesn't introduce new issues

3. **Re-deployment Strategy** (Plan)
   - Start with 10% feature flag rollout
   - Monitor for 2+ hours before increasing
   - Gradually increase to 25%, 50%, 100% over days
   - Have rollback plan ready for each phase

### Testing Before Re-deployment
```bash
# Pre-deployment validation checklist
npm run test                    # Unit tests
npm run test:integration       # Integration tests  
npm run e2e                    # End-to-end tests
npm run test:accessibility     # Accessibility tests
npm run quality:check:full     # Full quality check
npm run test:load             # Load testing
```

## 📊 Rollback Metrics

### Success Criteria
Rollback is considered successful when:
- **Error rate** < 2% for 15+ minutes
- **Response time** < 500ms 95th percentile
- **Memory usage** stable < 100MB
- **Zero data corruption** confirmed
- **User experience** restored to baseline
- **Support tickets** return to normal volume

### Recovery Time Objectives (RTO)
- **Feature Flag Rollback**: 30 seconds
- **Gradual Rollback**: 2-5 minutes  
- **Code Rollback**: 5-10 minutes
- **Full System Rollback**: 10-15 minutes
- **Complete Recovery**: 15-30 minutes

### Recovery Point Objectives (RPO)
- **Data Loss Tolerance**: 0 (no data loss acceptable)
- **Configuration Loss**: 5 minutes max
- **User Session Loss**: Acceptable (users can re-authenticate)

## 🎯 Prevention Measures

### Deployment Safety
- **Feature Flags**: All new features behind flags
- **Gradual Rollout**: Never deploy to 100% immediately  
- **Canary Deployments**: Test with small user subset
- **Blue-Green Deployments**: Zero-downtime deployments
- **Automated Testing**: Comprehensive test suite

### Monitoring & Alerting
- **Real-time Monitoring**: Performance, errors, user experience
- **Automated Alerts**: Immediate notification of issues
- **Health Checks**: Continuous system health validation
- **Circuit Breakers**: Automatic failure isolation

### Team Preparedness
- **Incident Response Training**: Regular rollback drills
- **Runbook Maintenance**: Keep procedures updated
- **On-call Rotation**: 24/7 incident response coverage
- **Post-mortems**: Learn from every incident

---

## 📞 Quick Reference

### Emergency Rollback Command
```bash
# One-line emergency rollback
curl -X POST https://api.wheelsandwins.com/admin/emergency-rollback \
  -H "Authorization: Bearer $EMERGENCY_TOKEN" \
  -d '{"reason": "critical-issue", "initiated_by": "ops-team"}'
```

### Health Check URL
```
https://api.wheelsandwins.com/health/comprehensive
```

### Status Page
```
https://status.wheelsandwins.com
```

**Remember**: It's better to rollback quickly and investigate than to let users suffer. When in doubt, roll back first, fix second.

---

**Document Version**: 1.0  
**Last Updated**: ${new Date().toLocaleString()}  
**Next Review**: 30 days post-deployment