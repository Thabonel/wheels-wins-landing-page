# PAM Quick Test Checklist

**Environment**: https://wheels-wins-staging.netlify.app
**Date**: January 15, 2025

---

## TASK 1: WebSocket Connection (P1) - 15 min

### Setup
1. Open staging frontend in Chrome
2. Login with test account
3. Open DevTools (F12) → Network tab → Filter: WS
4. Open PAM chat interface

### Tests
- [ ] WebSocket connects (Status: 101)
- [ ] Send "Hello PAM" → gets response
- [ ] Response time <3 seconds
- [ ] No console errors
- [ ] Send 5 more messages → all work
- [ ] Close tab → reopen → history loads
- [ ] Connection stable throughout

### Pass Criteria
All 7 items checked = PASS → Move to Task 2

---

## TASK 2: Budget Tools (P2) - 30 min

### Test Questions (say each to PAM)
- [ ] "Add $50 gas expense from yesterday"
- [ ] "Show my budget analysis"
- [ ] "How much have I saved this month?"
- [ ] "Update my fuel budget to $500"
- [ ] "Show spending breakdown"
- [ ] "Compare actual spending vs planned budget"
- [ ] "Forecast my end of month spending"
- [ ] "Find ways I can save money"
- [ ] "Categorize this $25 transaction as food"
- [ ] "Export my budget report"

### Pass Criteria
8/10 tools work correctly = PASS

---

## TASK 3: Trip Tools (P2) - 30 min

### Test Questions
- [ ] "Plan trip from Phoenix to Seattle under $2000"
- [ ] "Find RV parks near Yellowstone with hookups"
- [ ] "What's the weather forecast for Denver?"
- [ ] "Calculate gas cost for 500 miles at 10 MPG"
- [ ] "Find cheap gas stations near me"
- [ ] "Optimize route from LA to Vegas via Grand Canyon"
- [ ] "Check road conditions on I-80"
- [ ] "Find attractions near Yellowstone"
- [ ] "Travel time from Phoenix to Seattle with breaks"
- [ ] "Save this campground as favorite"
- [ ] "Update my RV fuel consumption to 12 MPG"
- [ ] "Convert 100 kilometers to miles"

### Pass Criteria
10/12 tools work correctly = PASS

---

## TASK 4: Voice Integration (P2) - 20 min

### Desktop Chrome
- [ ] Say "Hey PAM" → chime plays
- [ ] Say "Add $50 gas expense" → processed
- [ ] Hear TTS response
- [ ] Voice quality clear and natural

### Mobile Safari (if available)
- [ ] Wake word detection works
- [ ] Voice command works
- [ ] Note: Document any limitations

### Pass Criteria
Voice works on at least one browser = PASS

---

## TASK 5: Savings Celebration (P3) - 10 min

### Setup
- [ ] Manually add savings to reach $10 threshold
  - Use: "Track $10 savings - found cheaper gas"

### Tests
- [ ] Confetti animation plays
- [ ] Toast shows correct amount
- [ ] Share button appears
- [ ] Click share → generates badge
- [ ] Reload page → no duplicate celebration

### Pass Criteria
All 5 items work = PASS

---

## TASK 6: Performance (P1) - 15 min

### Metrics
- [ ] Average response time <3s (test 10 messages)
- [ ] No errors in 10 consecutive messages
- [ ] WebSocket stays connected (no disconnects)
- [ ] Backend logs show no errors (check Render)
- [ ] Database writes succeed (check Supabase)

### Pass Criteria
All metrics meet targets = PASS

---

## FINAL CHECKLIST

- [ ] All 6 tasks completed
- [ ] Results documented in PAM_TESTING_SESSION_JAN_15_2025.md
- [ ] Bugs logged as GitHub issues (if any)
- [ ] Beads tasks updated
- [ ] Ready for Day 2 (Beta Prep)

---

## Quick Commands

```bash
# Check backend health
curl https://wheels-wins-backend-staging.onrender.com/api/v1/pam/health | python3 -m json.tool

# Mark task complete in beads
/Users/thabonel/go/bin/bd update wheels-wins-landing-page-2 --status closed

# Update testing session doc
code docs/PAM_TESTING_SESSION_JAN_15_2025.md
```

---

**Total Time**: ~2 hours for all 6 tasks
**Environment**: Staging only (production after beta)
**Next**: Day 2 Beta Prep (after all tests pass)
