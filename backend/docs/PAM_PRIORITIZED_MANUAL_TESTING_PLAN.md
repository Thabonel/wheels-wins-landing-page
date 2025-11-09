# PAM Prioritized Manual Testing Plan

**Created**: January 2025
**Purpose**: Efficient manual testing strategy for 37 PAM tools
**Based on**: Coverage analysis (16% overall) + Critical functionality

---

## Executive Summary

**Test Status**:
- ✅ Automated tests: 25/53 passing (47%)
- ⚠️ Failures: 28 tests (trip, calendar, social tools)
- 📊 Coverage: 16% overall (543/3356 lines)
- 🎯 Manual testing: 37 tools across 8 categories

**Priority Strategy**:
- **P0 (Critical)**: Revenue-impacting, user-facing core features (13 tools)
- **P1 (High)**: Frequently used, data-sensitive features (12 tools)
- **P2 (Medium)**: Secondary features, nice-to-have (8 tools)
- **P3 (Low)**: Admin-only, rarely used (4 tools)

**Time Estimates**:
- P0: ~3 hours (15 min/tool × 13)
- P1: ~3 hours (15 min/tool × 12)
- P2: ~2 hours (15 min/tool × 8)
- P3: ~1 hour (15 min/tool × 4)
- **Total**: ~9 hours manual testing

---

## Coverage Analysis by Category

| Category | Automated Coverage | Manual Tests Needed | Priority Level |
|----------|-------------------|---------------------|----------------|
| **Budget** | 100% ✅ | 7 tools | P0-P1 (Critical) |
| **Trip** | 16-77% ⚠️ | 7 tools | P0-P1 (Critical) |
| **Calendar** | 12-23% ❌ | 3 tools | P1 (High) |
| **Social** | 25-31% ⚠️ | 9 tools | P1-P2 (High-Med) |
| **Profile** | Unknown | 5 tools | P1-P2 (High-Med) |
| **Community** | 0% ❌ | 2 tools | P2 (Medium) |
| **Admin** | Unknown | 2 tools | P3 (Low) |
| **Misc** | Unknown | 2 tools | P2 (Medium) |

---

## P0: Critical Priority (Test First)

**Time Estimate**: ~3 hours (~15 min per tool)
**Why Critical**: Revenue-impacting, user-facing core features, high usage frequency

### Budget Tools (4 tools)
Testing these validates PAM's core value proposition: saving users money.

#### 1. get_spending_summary ⭐⭐⭐
**Why**: Most frequently used budget query
**Test Input**: `PAM, show my spending summary for January 2025`
**Pass Criteria**:
- Returns total_spent as number
- Categories breakdown present
- Daily average calculated
- Response time < 3 seconds

**Expected Response**:
```json
{
  "success": true,
  "summary": {
    "total_spent": 2150.00,
    "period": "January 2025",
    "categories": {
      "fuel": {"amount": 450.00, "percentage": 20.9},
      "food": {"amount": 650.00, "percentage": 30.2}
    },
    "daily_average": 69.35
  }
}
```

#### 2. compare_vs_budget ⭐⭐⭐
**Why**: Critical for budget tracking alerts
**Test Input**: `PAM, am I over budget this month?`
**Pass Criteria**:
- Compares actual vs planned spending
- Shows remaining budget
- Alerts if over budget
- Response time < 3 seconds

#### 3. predict_end_of_month ⭐⭐⭐
**Why**: Helps users avoid overspending
**Test Input**: `PAM, will I stay under budget this month?`
**Pass Criteria**:
- Forecasts end-of-month spending
- Shows projected overage
- Confidence level provided
- Response time < 5 seconds

#### 4. find_savings_opportunities ⭐⭐⭐
**Why**: Directly drives PAM's value proposition
**Test Input**: `PAM, where can I save money?`
**Pass Criteria**:
- AI-powered recommendations
- Specific category suggestions
- Estimated savings amounts
- Actionable advice

---

### Trip Planning Tools (5 tools)

#### 5. find_rv_parks ⭐⭐⭐
**Why**: Core trip planning feature
**Test Input**: `PAM, find RV parks near Yellowstone with full hookups`
**Pass Criteria**:
- Returns 5+ nearby campgrounds
- Amenities filtering works
- Distance calculated correctly
- Price information present
- Response time < 5 seconds

**Expected Response**:
```json
{
  "success": true,
  "parks": [
    {
      "name": "Fishing Bridge RV Park",
      "distance_miles": 2.3,
      "amenities": ["water", "electric", "sewer", "dump"],
      "price_per_night": 89.00,
      "rating": 4.2
    }
  ],
  "total_found": 12
}
```

#### 6. get_weather_forecast ⭐⭐⭐
**Why**: Essential for trip planning safety
**Test Input**: `PAM, what's the weather forecast for Denver?`
**Pass Criteria**:
- 7-day forecast returned
- Current conditions included
- Temperature, conditions, wind
- Response time < 3 seconds

**Known Issue**: Missing `aiohttp` dependency (automated test failing)

#### 7. optimize_route ⭐⭐⭐
**Why**: Saves users money on fuel
**Test Input**: `PAM, optimize route from LA to Vegas through Grand Canyon`
**Pass Criteria**:
- Multi-stop route calculated
- Distance and time estimates
- Fuel cost estimate
- Waypoints listed
- Response time < 8 seconds

#### 8. calculate_gas_cost ⭐⭐
**Why**: Budget planning essential
**Test Input**: `PAM, how much gas for 500 miles at 10 MPG?`
**Pass Criteria**:
- Gallons calculated (500/10 = 50 gallons)
- Current gas prices used
- Total cost estimate
- Response time < 2 seconds

**Known Issue**: Decimal type mismatch (automated test failing)

#### 9. find_cheap_gas ⭐⭐⭐
**Why**: Immediate cost savings opportunity
**Test Input**: `PAM, find cheap gas near Phoenix`
**Pass Criteria**:
- 5+ gas stations returned
- Sorted by price (cheapest first)
- Distance from location
- Response time < 5 seconds

**Known Issue**: Mock data vs real API integration

---

### Calendar (1 tool)

#### 10. delete_calendar_event ⭐⭐
**Why**: Critical data deletion feature
**Test Input**: `PAM, delete my appointment on January 15th`
**Pass Criteria**:
- Event found and deleted
- Confirmation message
- Database updated
- Response time < 3 seconds

**Known Issue**: 403 RLS policy errors reported in previous issues

---

### Social (3 tools)

#### 11. message_friend ⭐⭐⭐
**Why**: Core community engagement
**Test Input**: `PAM, message John about the camping trip`
**Pass Criteria**:
- Message sent successfully
- Friend lookup works
- Database record created
- Response time < 3 seconds

#### 12. create_event ⭐⭐
**Why**: Meetup coordination
**Test Input**: `PAM, create meetup event for Saturday at Blue Mountains`
**Pass Criteria**:
- Event created in database
- Location attached
- Invitations can be sent
- Response time < 4 seconds

#### 13. get_feed ⭐⭐⭐
**Why**: Most frequently used social feature
**Test Input**: `PAM, show me recent posts from friends`
**Pass Criteria**:
- Returns 10-20 posts
- Sorted by recency
- Images loaded
- Response time < 4 seconds

---

## P1: High Priority (Test Second)

**Time Estimate**: ~3 hours (~15 min per tool)
**Why Important**: Frequently used features, data-sensitive operations

### Budget Tools (3 tools)

#### 14. update_budget
**Test Input**: `PAM, increase my food budget to $800`
**Pass Criteria**: Budget updated in database, confirmation message

#### 15. categorize_transaction
**Test Input**: `PAM, categorize this $120 expense`
**Pass Criteria**: AI categorization works, high confidence score

#### 16. export_budget_report
**Test Input**: `PAM, export my January expenses to PDF`
**Pass Criteria**: PDF generated, all expenses included

---

### Trip Planning Tools (2 tools)

#### 17. get_road_conditions
**Test Input**: `PAM, check road conditions on I-80`
**Pass Criteria**: Traffic, closures, hazards reported

#### 18. find_attractions
**Test Input**: `PAM, find attractions near Yellowstone`
**Pass Criteria**: POIs returned, distance calculated

---

### Calendar (2 tools)

#### 19. get_upcoming_events
**Test Input**: `PAM, show my upcoming events`
**Pass Criteria**: Next 7 days of events, sorted chronologically

#### 20. search_calendar_events
**Test Input**: `PAM, find my doctor appointments`
**Pass Criteria**: Keyword search works, relevant events returned

---

### Social (5 tools)

#### 21. comment_on_post
**Test Input**: `PAM, comment on Lisa's camping post`
**Pass Criteria**: Comment posted, notification sent

#### 22. search_posts
**Test Input**: `PAM, search posts about Yellowstone`
**Pass Criteria**: Keyword search works, relevant posts returned

#### 23. like_post
**Test Input**: `PAM, like Sarah's trip update`
**Pass Criteria**: Like recorded, count incremented

#### 24. follow_user
**Test Input**: `PAM, follow @rvtraveler123`
**Pass Criteria**: Follow relationship created, feed updated

#### 25. find_nearby_rvers
**Test Input**: `PAM, who's camping nearby?`
**Pass Criteria**: Location-based search, privacy respected

---

## P2: Medium Priority (Test Third)

**Time Estimate**: ~2 hours (~15 min per tool)
**Why Important**: Secondary features, nice-to-have functionality

### Trip Planning Tools (2 tools)

#### 26. estimate_travel_time
**Test Input**: `PAM, how long to drive to Vegas?`
**Pass Criteria**: Duration calculated, breaks factored

#### 27. save_favorite_spot
**Test Input**: `PAM, save this campground`
**Pass Criteria**: Location bookmarked, retrievable later

---

### Social (2 tools)

#### 28. share_location
**Test Input**: `PAM, share my current location`
**Pass Criteria**: Location shared, privacy settings respected

#### 29. delete_post
**Test Input**: `PAM, delete my post from yesterday`
**Pass Criteria**: Post deleted, images removed

---

### Community (2 tools)

#### 30. submit_tip
**Test Input**: `PAM, submit tip: Best camping in Blue Mountains`
**Pass Criteria**: Tip submitted, moderation queue entry

#### 31. search_tips
**Test Input**: `PAM, search community tips for Phoenix`
**Pass Criteria**: Relevant tips returned, sorted by votes

---

### Profile (2 tools)

#### 32. update_profile
**Test Input**: `PAM, update my email to new@example.com`
**Pass Criteria**: Profile updated, validation works

#### 33. get_user_stats
**Test Input**: `PAM, show my usage stats`
**Pass Criteria**: Stats displayed, accurate data

---

## P3: Low Priority (Test Last)

**Time Estimate**: ~1 hour (~15 min per tool)
**Why Low**: Admin-only, rarely used, non-critical

### Admin Tools (2 tools)

#### 34. add_knowledge (Admin only)
**Test Input**: `PAM, add knowledge: RV safety tips`
**Pass Criteria**: Admin permission check, knowledge added

#### 35. search_knowledge (Admin only)
**Test Input**: `PAM, search knowledge for maintenance tips`
**Pass Criteria**: Knowledge base search works

---

### Profile (2 tools)

#### 36. manage_privacy
**Test Input**: `PAM, make my location private`
**Pass Criteria**: Privacy settings updated

#### 37. export_data (GDPR)
**Test Input**: `PAM, export all my data`
**Pass Criteria**: Complete data export, JSON format

---

## Testing Methodology

### Setup
1. Open staging: https://wheels-wins-staging.netlify.app
2. Log in with test account
3. Open browser DevTools (Network tab)
4. Open CSV tracker: `PAM_MANUAL_TEST_TRACKER.csv`

### For Each Tool
1. **Send test input** to PAM chat
2. **Measure response time** (Network tab)
3. **Verify response** matches expected output
4. **Check database** (if applicable) via Supabase
5. **Record result** in CSV:
   - Status: Pass/Fail
   - Response time (ms)
   - Notes (any issues)
   - GitHub issue link (if bug found)

### Pass Criteria (General)
- ✅ Tool executes without errors
- ✅ Response contains expected data structure
- ✅ Response time within limit (see tool details)
- ✅ Database updated correctly (if applicable)

### Fail Criteria (General)
- ❌ Tool throws error or exception
- ❌ Response missing required fields
- ❌ Response time exceeds limit by >50%
- ❌ Database not updated (if applicable)

### Bug Reporting
If a tool fails:
1. Document error message in CSV Notes
2. Create GitHub issue: `gh issue create`
3. Label: `bug`, `pam`, `testing`
4. Link issue URL in CSV

---

## Efficiency Tips

### Batch Related Tests
- **Budget tools**: Test consecutively (same financial data context)
- **Trip tools**: Test with same route (Phoenix → Seattle)
- **Social tools**: Use same test post/friend for multiple operations

### Pre-populate Test Data
Before starting manual tests:
1. Create sample expenses (last 3 months)
2. Create sample budget ($3000/month)
3. Create sample trip (Phoenix → Seattle)
4. Create sample post with images
5. Add 2-3 test friends

### Quick Verification Scripts
```bash
# Check Supabase for expense creation
supabase db query "SELECT * FROM expenses WHERE user_id='test-user-id' ORDER BY created_at DESC LIMIT 5"

# Check calendar events
supabase db query "SELECT * FROM calendar_events WHERE user_id='test-user-id'"

# Check social posts
supabase db query "SELECT * FROM posts WHERE user_id='test-user-id' ORDER BY created_at DESC LIMIT 5"
```

---

## Expected Completion Timeline

### Day 1 (3-4 hours)
- ✅ P0 Critical tools (13 tools)
- 🎯 Goal: All core features working

### Day 2 (3-4 hours)
- ✅ P1 High priority tools (12 tools)
- 🎯 Goal: Frequent-use features validated

### Day 3 (2-3 hours)
- ✅ P2 Medium priority tools (8 tools)
- ✅ P3 Low priority tools (4 tools)
- 🎯 Goal: Complete coverage

### Post-Testing (1-2 hours)
- Create GitHub issues for all bugs
- Update coverage report
- Document findings in final summary

---

## Known Issues to Watch For

### From Automated Test Failures

1. **aiohttp dependency missing** (weather tools)
   - Symptom: `ModuleNotFoundError: No module named 'aiohttp'`
   - Impact: Weather forecast may not work
   - Workaround: Test with mock data

2. **Decimal type issues** (calculate_gas_cost)
   - Symptom: `unsupported operand type(s) for *: 'float' and 'decimal.Decimal'`
   - Impact: Gas cost calculations may fail
   - Workaround: Verify calculations manually

3. **Calendar RLS policies** (calendar events)
   - Symptom: 403 Forbidden errors
   - Impact: Calendar CRUD operations blocked
   - Workaround: Check Supabase RLS settings

4. **ValidationError exceptions** (trip tools)
   - Symptom: Tests expect exceptions but get error dicts
   - Impact: Validation may not raise errors
   - Workaround: Verify error responses return success: false

---

## Success Criteria

### Testing Complete When:
- ✅ All 37 tools tested (100% coverage)
- ✅ Pass/Fail recorded in CSV
- ✅ All bugs have GitHub issues
- ✅ Response times documented
- ✅ Final summary report created

### Quality Gates:
- **P0 tools**: 100% passing (critical)
- **P1 tools**: 90%+ passing (acceptable)
- **P2 tools**: 80%+ passing (acceptable)
- **P3 tools**: 70%+ passing (acceptable)

### Blocker Threshold:
If more than 3 P0 tools fail → STOP and fix before continuing

---

## Next Steps After Manual Testing

1. **Generate final test report** documenting:
   - Total pass rate (automated + manual)
   - Critical bugs found
   - Performance benchmarks
   - Coverage gaps

2. **Create bug fix roadmap** prioritizing:
   - P0 blockers (must fix before launch)
   - P1 high-impact bugs (fix ASAP)
   - P2 medium bugs (fix in next sprint)
   - P3 low priority (backlog)

3. **Update PAM documentation** with:
   - Known limitations
   - Workarounds for known issues
   - Performance expectations

4. **Plan integration tests** for:
   - Multi-tool workflows
   - Real API integrations
   - Load testing (100+ concurrent users)

---

**Last Updated**: January 2025
**Maintained By**: Development Team
**Review Schedule**: After each testing session
