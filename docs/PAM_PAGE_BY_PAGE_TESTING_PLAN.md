# PAM Page-by-Page Testing Plan
**Date**: January 13, 2025
**Purpose**: Systematic testing and fixing of PAM functionality across all pages
**Approach**: Test one function per page, fix issues immediately, iterate until stable

---

## Testing Workflow

### Standard Process for Each Page
1. **Navigate** to the page in staging environment
2. **Open PAM** chat interface
3. **Ask** the specific test question for that page
4. **Observe** PAM's response:
   - Does PAM understand the context?
   - Does PAM select the correct tool?
   - Does the tool execute successfully?
   - Is the response natural and helpful?
5. **Verify** the action completed (check database, UI updates, etc.)
6. **If Broken**:
   - Identify the error (tool not called, wrong tool, execution failed, bad response)
   - Fix the issue (tool code, PAM core, function calling schema)
   - Redeploy to staging
   - Retest the same question
7. **If Working**: Document success and move to next page
8. **Repeat** until all pages pass

---

## Page-by-Page Test Cases

### 1. Home Page (/)
**Context**: Landing page, general introduction
**Test Question**:
```
"PAM, introduce yourself and tell me what you can help me with"
```

**Expected Behavior**:
- PAM explains she's the AI travel companion
- Lists capabilities: budget tracking, trip planning, social features, shopping
- Mentions she can save users money (pays for herself)
- Friendly, confident tone (not cutesy)

**Verifies**:
- ✅ Basic conversation working
- ✅ System prompt loaded correctly
- ✅ Claude Sonnet 4.5 integration operational
- ✅ WebSocket connection stable

**Tools Used**: None (conversational response)

---

### 2. Wheels Page (/wheels)
**Context**: Trip planning, route optimization, RV parks, weather, gas prices
**Test Question**:
```
"PAM, plan a trip from Phoenix, Arizona to Seattle, Washington with a budget of $2000"
```

**Expected Behavior**:
- PAM calls `plan_trip` tool with origin, destination, budget
- Returns trip summary with:
  - Total distance (miles)
  - Estimated gas cost
  - Recommended route overview
  - Budget breakdown
- Natural language explanation of the trip plan

**Verifies**:
- ✅ Trip planning tools operational
- ✅ Tool parameter extraction (location names, budget amount)
- ✅ Database writes (trip saved to user's trips)
- ✅ Multi-turn conversation (can ask follow-up questions)

**Tools Used**:
- `plan_trip` (primary)
- `calculate_gas_cost` (may be called internally)
- `estimate_travel_time` (may be called)

**Follow-up Tests** (if primary works):
- "What's the weather forecast for Seattle next week?"
- "Find RV parks with full hookups near Yellowstone"
- "Where's the cheapest gas along my route?"

---

### 3. Wins Page (/wins)
**Context**: Budget tracking, expense management, savings analysis
**Test Question**:
```
"PAM, add a $50 gas expense from yesterday at Shell station"
```

**Expected Behavior**:
- PAM calls `create_expense` tool with:
  - amount: 50.00
  - category: "fuel" or "gas"
  - description: "Shell station"
  - date: yesterday's date (calculated)
- Confirms expense added successfully
- Shows updated spending total for fuel category
- May mention budget impact

**Verifies**:
- ✅ Budget tools operational
- ✅ Database writes working (expense persisted)
- ✅ Date parsing (relative dates like "yesterday")
- ✅ Category auto-detection (gas = fuel category)
- ✅ Amount extraction from natural language

**Tools Used**:
- `create_expense` (primary)
- `get_spending_summary` (may be called to show updated totals)

**Follow-up Tests** (if primary works):
- "How much have I spent on gas this month?"
- "Am I over budget on anything?"
- "Track $15 savings - I found cheaper gas than usual"

---

### 4. Social Page (/social)
**Context**: Community posts, messaging, finding nearby RVers
**Test Question**:
```
"PAM, show me recent posts from other RV travelers in my area"
```

**Expected Behavior**:
- PAM calls `get_feed` tool with location filter
- Returns list of recent community posts:
  - Post content/text
  - Author name
  - Location (if shared)
  - Timestamp
- Explains what she found in natural language

**Verifies**:
- ✅ Social tools operational
- ✅ Location awareness (uses user's current location)
- ✅ Database reads working (fetching posts)
- ✅ Privacy filtering (only shows public posts)

**Tools Used**:
- `get_feed` (primary)
- `find_nearby_rvers` (may be called)

**Follow-up Tests** (if primary works):
- "Create a post: Just found an amazing free camping spot!"
- "Message John Doe about his campground recommendation"
- "Like the most recent post about Yosemite"

---

### 5. Shop Page (/shop)
**Context**: RV parts/gear shopping, product search, cart management
**Test Question**:
```
"PAM, search for RV water filters under $100"
```

**Expected Behavior**:
- PAM calls `search_products` tool with:
  - query: "RV water filters" or "water filters"
  - max_price: 100.00
- Returns list of matching products:
  - Product name
  - Price
  - Brief description
  - Availability
- Mentions how many results found

**Verifies**:
- ✅ Shop tools operational
- ✅ Product search working
- ✅ Price filtering functional
- ✅ Natural language to structured query conversion

**Tools Used**:
- `search_products` (primary)

**Follow-up Tests** (if primary works):
- "Add the top result to my cart"
- "Show me what's in my cart"
- "What's the total cost of my cart?"

---

### 6. You/Profile Page (/you)
**Context**: User settings, vehicle management, privacy controls
**Test Question**:
```
"PAM, update my RV type to Class A motorhome, 35 feet long"
```

**Expected Behavior**:
- PAM calls `create_vehicle` or `update_profile` tool with:
  - vehicle_type: "Class A" or "motorhome"
  - length: 35
  - length_unit: "feet"
- Confirms vehicle info updated
- May ask if user wants to set other vehicle details (weight, year, etc.)

**Verifies**:
- ✅ Profile tools operational
- ✅ Database updates working (vehicle info persisted)
- ✅ Unit extraction (35 feet)
- ✅ Type classification (Class A motorhome)

**Tools Used**:
- `create_vehicle` (primary)
- `update_profile` (alternative)

**Follow-up Tests** (if primary works):
- "Turn off location sharing for privacy"
- "Update my email notifications settings"
- "Show me my profile statistics"

---

### 7. Calendar (Embedded in You page)
**Context**: Event scheduling, reminders, trip dates
**Test Question**:
```
"PAM, add a doctor appointment next Tuesday at 2pm"
```

**Expected Behavior**:
- PAM calls `create_calendar_event` tool with:
  - title: "Doctor appointment"
  - start_date: next Tuesday's date + 2pm time (ISO format)
  - event_type: "personal" or "meeting"
- Confirms event added to calendar
- Shows the full date/time for verification

**Verifies**:
- ✅ Calendar tools operational
- ✅ Date parsing (relative dates: "next Tuesday")
- ✅ Time parsing (2pm → 14:00)
- ✅ Database writes (event persisted)
- ✅ Event type classification

**Tools Used**:
- `create_calendar_event` (primary)

**Follow-up Tests** (if primary works):
- "Schedule oil change for next Friday at 10am"
- "Add a camping trip from March 15-20"
- "What's on my calendar next week?"

---

## Quick Reference: Tools by Category

### Budget Tools (10)
- `create_expense` - Add expense entries
- `track_savings` - Log money PAM saved
- `analyze_budget` - Budget insights
- `get_spending_summary` - Spending breakdown
- `update_budget` - Modify budget limits
- `compare_vs_budget` - Actual vs planned
- `predict_end_of_month` - Spending forecasts
- `find_savings_opportunities` - AI suggestions
- `categorize_transaction` - Auto-categorize
- `export_budget_report` - Generate reports

### Trip Tools (12)
- `plan_trip` - Multi-stop route planning
- `find_rv_parks` - Search campgrounds
- `get_weather_forecast` - 7-day forecasts
- `calculate_gas_cost` - Estimate fuel costs
- `find_cheap_gas` - Locate cheapest stations
- `estimate_travel_time` - Calculate duration
- `find_attractions` - POI discovery
- `get_road_conditions` - Road status/closures
- `optimize_route` - Cost-effective routes
- `save_favorite_spot` - Bookmark locations
- `unit_conversion` - Convert measurements
- `update_vehicle_fuel_consumption` - Update MPG

### Social Tools (10)
- `create_post` - Share updates
- `get_feed` - Load social feed
- `message_friend` - Send DMs
- `comment_on_post` - Engage with posts
- `like_post` - React to content
- `follow_user` - Connect with RVers
- `search_posts` - Find content
- `find_nearby_rvers` - Discover local community
- `create_event` - Plan meetups
- `share_location` - Share current spot

### Shop Tools (5)
- `search_products` - Find RV parts/gear
- `add_to_cart` - Add items
- `get_cart` - View cart contents
- `checkout` - Complete purchase
- `track_order` - Check order status

### Profile Tools (6)
- `update_profile` - Modify user info
- `update_settings` - Change preferences
- `create_vehicle` - Add/update RV details
- `manage_privacy` - Control data sharing
- `export_data` - Download user data (GDPR)
- `get_user_stats` - View usage statistics

### Community Tools (2)
- `submit_tip` - Share travel tips
- `search_tips` - Find community tips

### Admin Tools (2)
- `add_knowledge` - Add to knowledge base
- `search_knowledge` - Search knowledge base

---

## Success Criteria Checklist

For each test, PAM must:
- [ ] Understand the page context
- [ ] Select the correct tool(s)
- [ ] Extract parameters accurately from natural language
- [ ] Execute tool successfully (no errors)
- [ ] Return valid data (not mock/placeholder)
- [ ] Provide natural, helpful response
- [ ] Persist changes (for write operations)
- [ ] Handle errors gracefully (if something fails)

---

## Common Issues to Watch For

### 1. Tool Not Called
**Symptoms**: PAM responds conversationally but doesn't take action
**Likely Causes**:
- Tool not registered in PAM core `_build_tools()`
- Tool description unclear (Claude doesn't know when to use it)
- Tool parameters unclear (Claude doesn't know how to call it)

**Fix**: Update tool schema in `backend/app/services/pam/core/pam.py`

### 2. Wrong Tool Called
**Symptoms**: PAM calls a tool but it's not the right one for the task
**Likely Causes**:
- Tool descriptions overlap or are ambiguous
- Context not clear enough for Claude to decide

**Fix**: Make tool descriptions more specific and distinct

### 3. Tool Execution Fails
**Symptoms**: PAM tries to call tool but gets error
**Likely Causes**:
- Tool function has bug
- Database connection issue
- Missing required parameter
- Wrong parameter type

**Fix**: Debug tool function in `backend/app/services/pam/tools/`

### 4. Tool Returns Mock Data
**Symptoms**: PAM calls tool successfully but returns placeholder/fake data
**Likely Causes**:
- External API not integrated yet (weather, gas prices)
- Database table empty (no user data yet)

**Fix**: Integrate real APIs or seed test data

### 5. Response Doesn't Make Sense
**Symptoms**: Tool executes correctly but PAM's explanation is wrong/confusing
**Likely Causes**:
- Tool return format unclear
- Claude misinterpreting tool results

**Fix**: Improve tool return format (clearer keys, better structure)

---

## Testing Environment

**Staging Frontend**: https://wheels-wins-staging.netlify.app
**Staging Backend**: https://wheels-wins-backend-staging.onrender.com

**Test User Credentials**: (Use existing staging test account)

**Required Setup**:
1. Login to staging frontend
2. Complete onboarding if new account
3. Add vehicle details (for trip planning tests)
4. Set current location (for social/trip tests)
5. Have PAM chat open and ready

---

## Debugging Tips

### Check WebSocket Connection
- Open browser DevTools → Network tab
- Filter: WS (WebSocket)
- Should see connection to `/api/v1/pam/ws/{user_id}`
- Status: 101 Switching Protocols (good) or 1005/1006 (connection failed)

### Check Tool Execution
- Open backend logs on Render dashboard
- Look for `[PAM] Executing tool: tool_name`
- Check for errors after tool execution

### Check Database Changes
- Use Supabase dashboard to verify writes
- Check tables: expenses, trips, calendar_events, etc.
- Verify user_id matches and data is correct

### Test Single Tool Directly
If PAM test fails, test the tool function directly:
```python
# backend/test_tool.py
from app.services.pam.tools.budget.create_expense import create_expense

result = await create_expense(
    user_id="test-uuid",
    amount=50.0,
    category="fuel",
    description="Test expense"
)
print(result)
```

---

## Iteration Strategy

### Priority Order (Complete in This Sequence)
1. **Home** - Most basic, must work first
2. **Wins** - Core feature (budget tracking)
3. **Wheels** - Core feature (trip planning)
4. **Social** - Community engagement
5. **Shop** - E-commerce
6. **Profile** - Settings management
7. **Calendar** - Event scheduling

### Fix-Test Cycle
1. Test page → Find issue
2. Fix issue → Redeploy staging (wait 5-10 min)
3. Hard refresh browser (clear cache)
4. Retest same page
5. If working → move to next page
6. If still broken → debug deeper

### When to Stop and Reassess
- If 3+ tools failing on same page → core issue with PAM
- If all tools failing → WebSocket or database issue
- If random/inconsistent failures → Claude API issue or timeout

---

## Final Checklist (After All Tests)

- [ ] All 7 pages tested
- [ ] All primary test questions working
- [ ] Follow-up questions tested for critical pages
- [ ] No errors in backend logs
- [ ] Database changes verified in Supabase
- [ ] WebSocket connection stable (no disconnects)
- [ ] Response times reasonable (<5 seconds)
- [ ] Natural language quality good (not robotic)
- [ ] Ready for production deployment

---

**Document Created**: January 13, 2025
**Last Updated**: January 13, 2025
**Author**: Claude Code
**Status**: Ready for use
