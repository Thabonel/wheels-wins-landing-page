# PAM Proactive Trip Assistant - Test Plan

## Overview
Small but expansive test plan covering all new autonomous features implemented in the PAM Proactive Trip Assistant system.

## Test Environment
- **Staging Frontend:** https://wheels-wins-staging.netlify.app
- **Staging Backend:** https://wheels-wins-backend-staging.onrender.com
- **Test User:** Use existing user account or create test account

## 1. Service Health & Status Tests

### 1.1 Health Endpoints
```
✅ GET /health/proactive-assistant
   Expected: JSON with proactive_assistant, monitoring_status, service_status

✅ GET /health/proactive-assistant/metrics
   Expected: JSON with metrics, monitoring_cycles, notifications, external_apis

✅ GET /health/
   Expected: Basic health includes proactive assistant info
```

### 1.2 Service Lifecycle
```
✅ Backend startup logs show: "🚐 Proactive Trip Assistant Service initialized and started"
✅ Service status shows background_monitoring_active: true/false
✅ Monitoring metrics increment over time
```

## 2. Core Monitoring Foundation Tests

### 2.1 Calendar Event Detection
```
✅ Create calendar event with travel keywords ("trip", "travel", "vacation", "camping", "RV")
✅ Verify assistant detects travel events in monitoring cycle
✅ Test non-travel events are filtered out ("dentist appointment", "meeting")
```

### 2.2 Location Change Detection
```
✅ Mock location change (if possible) or verify location monitoring logic
✅ Check location change triggers in monitoring cycle
✅ Verify significant vs. insignificant location changes
```

### 2.3 Monitoring Cycle Execution
```
✅ Verify monitoring cycles run every 5 minutes (300s interval)
✅ Check cycle results include: calendar_events, location_changed, external_data
✅ Monitor background task remains active after startup
```

## 3. External API Integration Tests

### 3.1 Fuel Price API
```
✅ Test fuel price lookup for sample location (lat: 40.7128, lng: -74.0060)
✅ Verify rate limiting (max requests per API)
✅ Check error handling for API failures
✅ Validate fuel price data structure
```

### 3.2 Weather API Integration
```
✅ Test weather lookup for sample location
✅ Verify weather alert detection
✅ Check severe weather warning formatting
✅ Test weather recommendation generation
```

### 3.3 RV Park API Integration
```
✅ Test RV park search for sample dates and location
✅ Verify campground availability data
✅ Check booking deal detection
✅ Test distance/rating filtering
```

### 3.4 API Rate Limiting & Circuit Breaking
```
✅ Verify rate limits respected (fuel: 100/hour, weather: 1000/day, RV: 500/day)
✅ Test circuit breaker activation on repeated failures
✅ Check graceful degradation when APIs unavailable
```

## 4. Pattern Learning System Tests

### 4.1 Trip Pattern Analysis
```
✅ Test pattern analysis with sample trip data
✅ Verify detection of trip type preferences (national_park, beach, mountain)
✅ Check budget pattern recognition ($800-1500 range)
✅ Test seasonal preference detection
```

### 4.2 User Profiling
```
✅ Generate user profile from trip history
✅ Verify confidence scores calculation
✅ Check preference categorization (trip_type, budget_range, duration)
✅ Test profile update with new trip data
```

### 4.3 Prediction System
```
✅ Test next trip preference predictions
✅ Verify recommended destinations based on patterns
✅ Check optimal duration and budget suggestions
✅ Test seasonal timing recommendations
```

### 4.4 Memory Persistence (if available)
```
✅ Test pattern saving to memory-keeper
✅ Verify pattern loading from storage
✅ Check pattern update persistence
```

## 5. Tiered Autonomy System Tests

### 5.1 Action Classification
```
✅ Test FREE actions (cost: $0, impact: low) → AUTO execution
   - Send weather alerts
   - Traffic notifications
   - Basic route suggestions

✅ Test NOTIFY actions (cost: $1-50, impact: medium) → NOTIFY + execute
   - Book backup campsite ($35)
   - Reserve parking spot ($25)
   - Small booking fees

✅ Test APPROVAL actions (cost: $50+, impact: high) → APPROVAL required
   - RV upgrades ($120+)
   - Premium campgrounds ($75+)
   - Major booking changes
```

### 5.2 Spending Controls
```
✅ Verify daily spending limit enforcement ($200/day)
✅ Test weekly spending limit enforcement ($500/week)
✅ Check spending reset at midnight/weekly boundaries
✅ Test approval bypass for emergency actions
```

### 5.3 Autonomy Override Testing
```
✅ Test manual approval for notify-level actions
✅ Verify approval request formatting and user messaging
✅ Check timeout handling for approval requests
```

## 6. PAM Conversation Integration Tests

### 6.1 Proactive Conversation Initiation
```
✅ Test weather alert conversation with context and suggested actions
✅ Test fuel savings notification with location and pricing
✅ Test campground deal suggestion with booking details
✅ Test route optimization conversation with time savings
```

### 6.2 Conversation Templates
```
✅ Verify weather alert template formatting:
   "🌦️ Weather Alert: {warning}\nLocation: {location}\nRecommendation: {recommendation}"

✅ Verify fuel savings template formatting:
   "⛽ Fuel Savings Opportunity: {opportunity}\nEstimated savings: ${savings}\nAction: {action_required}"

✅ Verify campground deal template:
   "🏕️ Great Deal Found: {title}\n{description}\nExpires: {expires_at}"
```

### 6.3 PAM Message Bus Integration
```
✅ Test message delivery to PAM service
✅ Verify conversation ID generation
✅ Check message status tracking
✅ Test fallback handling when PAM unavailable
```

### 6.4 Notification Delivery Metrics
```
✅ Verify notification delivery tracking
✅ Check success/failure rate calculation
✅ Test delivery metrics in health endpoints
✅ Monitor notification queue processing
```

## 7. End-to-End Autonomous Scenarios

### 7.1 Complete Trip Planning Scenario
```
✅ User creates calendar event: "Road trip to Yellowstone June 15-20"
✅ System detects travel event in monitoring cycle
✅ System analyzes user's trip patterns (if historical data available)
✅ System fetches weather forecast for Yellowstone
✅ System finds fuel prices along route
✅ System searches RV parks near Yellowstone
✅ System initiates proactive conversation with suggestions
✅ System classifies and executes appropriate autonomy level actions
```

### 7.2 Real-Time Travel Assistance
```
✅ User location changes significantly (mock if needed)
✅ System detects location change
✅ System checks local fuel prices and weather
✅ System sends proactive fuel savings notification if good deals found
✅ System sends weather alerts if severe weather detected
```

### 7.3 Pattern Learning Evolution
```
✅ Test with multiple trip entries over time
✅ Verify pattern confidence increases with more data
✅ Check recommendation accuracy improves
✅ Test user preference adaptation
```

## 8. Performance & Reliability Tests

### 8.1 Background Monitoring Performance
```
✅ Monitor cycle duration stays under 30 seconds
✅ Verify no memory leaks in long-running monitoring
✅ Check graceful handling of API timeouts
✅ Test system recovery after temporary failures
```

### 8.2 Concurrent Operations
```
✅ Test multiple monitoring cycles don't interfere
✅ Verify thread safety in autonomy decisions
✅ Check PAM conversation queueing under load
```

### 8.3 Error Recovery
```
✅ Test recovery from external API failures
✅ Verify graceful degradation when memory-keeper unavailable
✅ Check system continues functioning with partial failures
```

## 9. Security & Privacy Tests

### 9.1 Data Handling
```
✅ Verify no sensitive data logged in plain text
✅ Check API keys properly masked in logs
✅ Test user data isolation in pattern learning
```

### 9.2 Autonomy Security
```
✅ Verify spending limits cannot be bypassed programmatically
✅ Check approval requests properly authenticated
✅ Test action audit trail generation
```

## 10. Integration Tests

### 10.1 Existing PAM Tool Integration
```
✅ Verify new autonomous features don't interfere with existing PAM tools
✅ Test conversation flow between autonomous and manual PAM interactions
✅ Check WebSocket stability with new background services
```

### 10.2 Database Integration
```
✅ Verify proper database connection handling
✅ Test RLS (Row Level Security) compliance
✅ Check no conflicts with existing user data
```

## Test Execution Checklist

### Pre-Test Setup
- [ ] Staging environment fully deployed
- [ ] Test user account created/available
- [ ] Health endpoints responding
- [ ] Backend logs accessible

### Core Functionality (Priority 1)
- [ ] Service health and lifecycle (Section 1)
- [ ] Basic monitoring cycle execution (Section 2.3)
- [ ] PAM conversation initiation (Section 6.1)
- [ ] Tiered autonomy classification (Section 5.1)

### Feature Completeness (Priority 2)
- [ ] External API integration (Section 3)
- [ ] Pattern learning system (Section 4)
- [ ] Complete autonomy controls (Section 5)
- [ ] All conversation templates (Section 6.2)

### Advanced Scenarios (Priority 3)
- [ ] End-to-end trip planning (Section 7.1)
- [ ] Real-time travel assistance (Section 7.2)
- [ ] Performance under load (Section 8)

### Security & Polish (Priority 4)
- [ ] Security and privacy compliance (Section 9)
- [ ] Integration with existing systems (Section 10)

## Success Criteria

**Minimum Viable (for production push):**
- All Priority 1 tests pass
- No critical errors in logs
- Service starts/stops cleanly
- Basic autonomous actions work

**Full Feature Complete:**
- All Priority 1-3 tests pass
- Performance within acceptable ranges
- Complete autonomous trip planning workflow functional

**Production Ready:**
- All priorities pass
- Security audit clean
- Load testing successful
- Documentation complete

## Notes

- **Manual Testing:** Focus on user experience and conversation quality
- **API Rate Limits:** Test with actual APIs if keys available, mock otherwise
- **Memory-Keeper:** Tests depend on memory-keeper availability in staging
- **Location Services:** May require mocking if GPS unavailable in staging environment

---

**Test Duration Estimate:** 2-4 hours for complete test plan execution
**Critical Path:** Sections 1, 2.3, 5.1, 6.1 (30 minutes for basic validation)