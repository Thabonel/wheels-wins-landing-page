# Claude Desktop Test Prompt for Calendar Read Access

## 🎯 Purpose
Test the newly implemented `get_calendar_events` tool that enables PAM to read existing calendar events. This fills the critical functional gap identified in the PAM audit where users couldn't ask "What are my upcoming appointments?"

## 📋 Prerequisites
- Access to Claude Desktop connected to PAM backend
- User account with some calendar events in the database
- PAM backend running on staging environment

## 🧪 Test Cases to Execute

### Test 1: Basic Calendar Query
**Prompt:**
```
What are my upcoming appointments? Show me what I have on my calendar.
```

**Expected Result:**
- PAM should use the new `get_calendar_events` tool
- Should return a list of upcoming calendar events (past events filtered out)
- Should show event details like title, date, time, description, location

### Test 2: Specific Date Range Query
**Prompt:**
```
What do I have scheduled for next week? Show me all my calendar events from Monday to Friday.
```

**Expected Result:**
- PAM should call `get_calendar_events` with appropriate start_date and end_date parameters
- Should only show events within the specified date range
- Should provide a clear summary of the week's schedule

### Test 3: Different Time Ranges
**Prompt:**
```
Show me:
1. What I have today
2. What I have tomorrow
3. What I have this weekend
```

**Expected Result:**
- PAM should make multiple calls to `get_calendar_events` with different date filters
- Should correctly parse relative dates (today, tomorrow, weekend)
- Should organize results clearly by timeframe

### Test 4: Event Type Filtering
**Prompt:**
```
Do I have any trips coming up? What about maintenance appointments?
```

**Expected Result:**
- PAM should filter events by event_type parameter
- Should distinguish between different types of events
- Should handle cases where no events of that type exist

### Test 5: Empty Results Handling
**Prompt:**
```
Do I have anything scheduled for next month?
```

**Expected Result (if no events exist):**
- PAM should gracefully handle empty results
- Should inform user that no events were found for that period
- Should not show errors or confusion

### Test 6: Past Events (if requested)
**Prompt:**
```
Show me what I had on my calendar last week. I want to see my past appointments.
```

**Expected Result:**
- PAM should include past events when explicitly requested
- Should use the `include_past=true` parameter
- Should clearly indicate these are past events

## ✅ Success Criteria

### ✅ Core Functionality
- [ ] PAM successfully calls the `get_calendar_events` tool
- [ ] Returns actual calendar events from the database
- [ ] Filters out past events by default
- [ ] Handles empty results gracefully
- [ ] Provides clear, formatted responses

### ✅ Advanced Features
- [ ] Date range filtering works correctly
- [ ] Event type filtering works
- [ ] Relative date parsing (today, tomorrow, next week)
- [ ] Can retrieve past events when requested
- [ ] Proper timezone handling

### ✅ Error Handling
- [ ] Graceful handling of invalid date ranges
- [ ] Clear error messages for malformed requests
- [ ] Proper fallback behavior if tool fails

### ✅ User Experience
- [ ] Natural language understanding of calendar queries
- [ ] Clear, well-formatted event information
- [ ] Helpful suggestions when no events found
- [ ] Consistent response format

## 🚨 Critical Test Cases

### Priority 1: Basic "What's on my calendar?" Query
This was the exact issue from the PAM audit - users couldn't ask about their schedule.

**Test Prompt:**
```
PAM, what do I have coming up? What's on my schedule?
```

**Success = Tool executes and returns calendar events**

### Priority 2: Appointment Planning
Users need this for planning around existing commitments.

**Test Prompt:**
```
I'm thinking of scheduling a meeting next Tuesday. What do I already have that day?
```

**Success = Shows specific day's events to help with scheduling**

### Priority 3: Travel Planning
Common use case for RV users planning trips around appointments.

**Test Prompt:**
```
I want to plan a trip for next month. Show me what appointments I have so I can plan around them.
```

**Success = Shows relevant month's events for trip planning**

## 🔍 What to Look For

### ✅ **Working Correctly:**
- Tool appears in PAM's function call logs
- Actual calendar data is retrieved and displayed
- Date filtering works as expected
- Response format is clear and helpful

### ❌ **Potential Issues:**
- Tool not being called (PAM uses other tools instead)
- Database connection errors
- Date parsing/timezone issues
- Empty or confusing responses
- Tool timeouts or failures

## 📊 Report Results

After testing, please report:

1. **Which test cases passed/failed**
2. **Exact PAM responses for each test**
3. **Any error messages or unexpected behavior**
4. **Overall user experience quality**
5. **Comparison to pre-implementation behavior**

## 🎉 Expected Improvement

**Before:** "I ran into an issue" when asking about calendar
**After:** Clear, helpful list of upcoming appointments and events

This implementation closes the critical gap where PAM could create, update, and delete calendar events but couldn't read them - now all CRUD operations are complete!