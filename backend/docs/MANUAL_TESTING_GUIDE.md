# PAM Manual Testing Guide

**Purpose**: Step-by-step guide for executing manual tests on 37 PAM tools
**Time Required**: ~9 hours total (can be split across 3 days)
**Prerequisites**: Access to staging environment + test user credentials

---

## Quick Start

### 1. Environment Setup (5 minutes)

**Staging Access**:
- URL: https://wheels-wins-staging.netlify.app
- Test User: [Request credentials from team]

**Required Tools**:
- Web browser (Chrome recommended for DevTools)
- CSV editor (Excel, Google Sheets, or VS Code)
- Supabase access (for database verification)

**Open Files**:
1. This guide: `backend/docs/MANUAL_TESTING_GUIDE.md`
2. Testing plan: `backend/docs/PAM_PRIORITIZED_MANUAL_TESTING_PLAN.md`
3. Tracker CSV: `backend/docs/PAM_MANUAL_TEST_TRACKER.csv`

### 2. Pre-populate Test Data (15 minutes)

Before starting tests, create sample data in staging:

**Budget Data**:
```
1. Add 10 sample expenses (last 3 months)
   - Mix of categories: fuel, food, camping, maintenance
   - Range: $20 - $200 per expense
   
2. Create monthly budget: $3000
   - fuel: $500
   - food: $800
   - camping: $600
   - maintenance: $400
   - other: $700
```

**Trip Data**:
```
3. Plan sample trip: Phoenix → Seattle
   - Start: Phoenix, AZ
   - End: Seattle, WA
   - Waypoints: Flagstaff, Salt Lake City, Boise
   - Budget: $2000
```

**Social Data**:
```
4. Create sample post with 2 images
5. Add 2-3 test friends to network
```

### 3. Open Browser DevTools

**Chrome DevTools** (F12 or Cmd+Option+I):
1. Open "Network" tab
2. Filter by "Fetch/XHR"
3. Enable "Preserve log"
4. Keep DevTools open throughout testing

This allows you to:
- Measure response times
- See WebSocket messages
- Debug errors
- Verify API calls

---

## Testing Process (For Each Tool)

### Step 1: Send Test Input to PAM

1. Open PAM chat interface (staging)
2. Copy test input from CSV (column E)
3. Paste into PAM chat
4. Send message

**Example**:
```
Test Input: "PAM, show my spending summary for January 2025"
```

### Step 2: Measure Response Time

Watch DevTools Network tab:
1. Find the WebSocket or API request
2. Note the response time (in ms)
3. Record in CSV column H

**Expected Response Times**:
- Budget tools: 2-5 seconds
- Trip tools: 3-8 seconds
- Social tools: 2-4 seconds
- Admin tools: 3-5 seconds

### Step 3: Verify Response

Check PAM's response contains:
- ✅ No error messages
- ✅ Expected data structure (see plan for each tool)
- ✅ Reasonable data (not null/empty)
- ✅ Correct units and formatting

**Example Expected Response**:
```json
{
  "success": true,
  "summary": {
    "total_spent": 2150.00,
    "period": "January 2025",
    "categories": {...},
    "daily_average": 69.35
  }
}
```

### Step 4: Verify Database (If Applicable)

For tools that modify data (create, update, delete):

1. Open Supabase dashboard
2. Navigate to Table Editor
3. Check relevant table (expenses, calendar_events, posts, etc.)
4. Verify record exists with correct data

**Quick Verification Queries**:
```sql
-- Check recent expenses
SELECT * FROM expenses 
WHERE user_id='test-user-id' 
ORDER BY created_at DESC LIMIT 5;

-- Check calendar events
SELECT * FROM calendar_events 
WHERE user_id='test-user-id' 
ORDER BY created_at DESC LIMIT 5;

-- Check social posts
SELECT * FROM posts 
WHERE user_id='test-user-id' 
ORDER BY created_at DESC LIMIT 5;
```

### Step 5: Record Result in CSV

Update CSV row for the tool:

**Column G (Status)**: 
- "Pass" - Tool works as expected
- "Fail" - Tool has errors or missing data
- "Partial" - Tool works but with issues
- "Blocked" - Cannot test due to blocker

**Column H (Actual Response Time)**:
- Record in milliseconds (e.g., 2350)

**Column I (Pass/Fail Notes)**:
- If Pass: Brief note (e.g., "All data present, correct calculations")
- If Fail: Describe error (e.g., "Error: TypeError on line 42")
- If Partial: List issues (e.g., "Missing category breakdown")
- Include any unexpected behavior

**Column J (GitHub Issue)**:
- If tool failed, create GitHub issue and link URL

**Columns K-L (Tested By, Test Date)**:
- Your name/initials
- Date tested (YYYY-MM-DD)

### Step 6: Create GitHub Issue (If Failed)

If tool fails:

```bash
gh issue create \
  --title "PAM Tool Failure: [tool_name]" \
  --label "bug,pam,testing" \
  --body "**Tool**: [tool_name]
**Priority**: [P0/P1/P2/P3]
**Test Input**: [input from CSV]
**Error**: [error message]
**Expected**: [expected behavior]
**Actual**: [actual behavior]
**Response Time**: [ms]
**Tested By**: [your name]
**Date**: [YYYY-MM-DD]

**Steps to Reproduce**:
1. Log into staging
2. Send message: '[test input]'
3. Observe error

**DevTools Output**:
```
[paste error from console]
```

**Database State**:
[relevant database query results]"
```

Copy GitHub issue URL and paste into CSV column J.

---

## Testing Strategy

### Priority Order (P0 → P3)

**Day 1 (3-4 hours)**: Test all 13 P0 (Critical) tools
- These are revenue-impacting and user-facing
- **STOP if >3 P0 tools fail** - critical blockers must be fixed first
- Goal: 100% P0 pass rate

**Day 2 (3-4 hours)**: Test all 12 P1 (High) tools
- Frequently used features
- Goal: 90%+ P1 pass rate

**Day 3 (2-3 hours)**: Test 8 P2 (Medium) + 4 P3 (Low) tools
- Secondary and admin-only features
- Goal: 80%+ P2 pass rate, 70%+ P3 pass rate

### Batch Similar Tests

**Budget Tools** (Test 1-4, 14-16 together):
- Use same financial data context
- Verify totals match across tools
- Check for consistency

**Trip Tools** (Test 5-9, 17-18, 26-27 together):
- Use same route: Phoenix → Seattle
- Verify distance calculations consistent
- Check gas cost math

**Social Tools** (Test 11-13, 21-25, 28-29 together):
- Use same test post for multiple operations
- Use same test friend for messaging
- Check notification triggers

### Known Issues to Watch For

From automated test failures:

1. **aiohttp dependency missing** (Tool #6)
   - Symptom: ModuleNotFoundError when calling weather API
   - Workaround: May return mock data instead

2. **Decimal type mismatch** (Tool #8)
   - Symptom: TypeError in gas cost calculation
   - Check: Verify calculation manually

3. **Calendar RLS policies** (Tool #10)
   - Symptom: 403 Forbidden errors
   - Status: Should be fixed (Task #18 complete)
   - If fails: Check Supabase RLS policies

4. **ValidationError handling** (Trip tools)
   - Tests expect exceptions but get error dicts
   - Check: Verify error responses have success: false

---

## Quality Gates

### After P0 Testing (Day 1)

**BLOCKER CHECK**:
- If >3 P0 tools fail → STOP
- Create GitHub issues for all failures
- Escalate to team lead
- Fix critical bugs before continuing

**If Pass**:
- 13/13 P0 tools passing → Proceed to Day 2
- 10-12/13 passing → Review failures, proceed with caution
- <10/13 passing → STOP, fix blockers

### After P1 Testing (Day 2)

**Quality Check**:
- Expected: 90%+ P1 pass rate (11/12 tools)
- If below 80%: Review and prioritize fixes
- Document any workarounds for partial passes

### After P2/P3 Testing (Day 3)

**Final Check**:
- P2: Target 80%+ (7/8 tools)
- P3: Target 70%+ (3/4 tools)
- Total: Target 85%+ overall (32/37 tools)

---

## Post-Testing Tasks

### 1. Calculate Final Metrics

```
Total Tools: 37
P0 Passing: __/13 (___%)
P1 Passing: __/12 (___%)
P2 Passing: __/8 (___%)
P3 Passing: __/4 (___%)

Overall Pass Rate: __/37 (___%)
```

### 2. Categorize Failures

**Blockers** (must fix before launch):
- [List P0 failures]

**High Priority** (fix ASAP):
- [List P1 failures]

**Medium Priority** (fix in next sprint):
- [List P2 failures]

**Low Priority** (backlog):
- [List P3 failures]

### 3. Create Final Report

Create: `PAM_MANUAL_TESTING_RESULTS_2025-MM-DD.md`

Include:
- Test execution dates
- Overall pass/fail metrics
- Performance benchmarks (avg response times)
- Critical bugs found (with GitHub issues)
- Known limitations
- Recommended fixes

### 4. Update Documentation

Update the following docs:
- PAM_SYSTEM_ARCHITECTURE.md (known limitations)
- README.md (any workarounds)
- CLAUDE.md (testing status)

---

## Troubleshooting

### PAM Not Responding

**Check**:
1. Backend health: https://wheels-wins-backend-staging.onrender.com/api/health
2. WebSocket connection in DevTools Network tab
3. Browser console for errors

**Fix**:
- Refresh page
- Clear browser cache
- Check if backend is down (check Render dashboard)

### Database Connection Issues

**Check**:
1. Supabase dashboard accessible
2. RLS policies enabled for test user
3. Test user has correct permissions

**Fix**:
- Verify test user ID in database
- Check RLS policy queries
- Run SQL verification queries

### Response Times Too Slow

**Expected**:
- Budget tools: 2-5s
- Trip tools: 3-8s
- Social tools: 2-4s

**If >50% slower**:
- Note in CSV (partial pass)
- Check backend logs for slow queries
- Verify external API responses

### Tool Returns Error

**Capture**:
1. Screenshot of PAM response
2. DevTools Network tab (request/response)
3. Browser console errors
4. Backend logs (if accessible)

**Record**:
- Exact error message in CSV Notes
- Create GitHub issue with full details
- Mark as "Fail" in status

---

## Tips for Efficient Testing

### Speed Tips

1. **Copy test inputs**: Have CSV open, copy-paste test inputs quickly
2. **Use keyboard shortcuts**: Cmd+Tab to switch apps, Cmd+C/V for copy-paste
3. **Batch database checks**: Verify multiple records at once with SQL queries
4. **Pre-write GitHub issues**: Have issue template ready to fill in

### Accuracy Tips

1. **Take notes**: Jot down any unexpected behavior immediately
2. **Screenshot errors**: Capture error messages for documentation
3. **Verify data**: Double-check database records before marking "Pass"
4. **Measure carefully**: Note exact response times from DevTools

### Organization Tips

1. **One tool at a time**: Don't skip around priority levels
2. **Mark as you go**: Update CSV immediately after each test
3. **Save frequently**: Commit CSV changes regularly
4. **Take breaks**: 10-min break every hour to stay focused

---

## Success Checklist

Before considering testing complete:

- [ ] All 37 tools tested (Status column filled)
- [ ] Response times recorded for all tools
- [ ] Pass/Fail notes documented for failed tools
- [ ] GitHub issues created for all failures
- [ ] Database verified for CRUD operations
- [ ] Tested By and Date columns filled
- [ ] CSV saved and committed to repo
- [ ] Final metrics calculated
- [ ] Summary report created
- [ ] Team notified of results

---

## Next Steps After Testing

1. **Review with team**: Present findings in standup/meeting
2. **Prioritize fixes**: Create sprint backlog for bug fixes
3. **Update roadmap**: Adjust launch timeline if needed
4. **Plan integration tests**: Multi-tool workflows, load testing
5. **Document workarounds**: For any known limitations

---

**Questions?** Contact: [Team Lead/Project Manager]

**Last Updated**: Generated November 6, 2025
**Maintained By**: Development Team
