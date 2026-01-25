# PAM Capabilities Reference

Complete reference of what PAM (Personal AI Manager) can do for users.

---

## Overview

PAM is a warm, knowledgeable travel companion for Grey Nomads and RV travelers. She builds genuine relationships, provides expert travel guidance, and executes tasks efficiently.

**Personality**: Warm, emotionally intelligent, genuinely caring about each person's RV journey. Like having a wise, tech-savvy friend who knows everything about RV life.

---

## Core Capabilities

### 1. Trip Planning & Navigation

**Triggers**: "plan a trip", "route to", "drive from X to Y", "ferry crossings"

**What PAM Can Do**:
- Plan routes with optimization
- Detect ferry crossings (e.g., Spirit of Tasmania)
- Suggest campsites along routes
- Include weather overlays
- Consider vehicle restrictions
- Account for budget constraints
- Handle medical/accessibility needs

**Example**:
```
User: "I want to plan a trip from Sydney to Hobart"
PAM: "That's such an exciting adventure! Since you're crossing to Tasmania,
you'll need the Spirit of Tasmania ferry from Melbourne to Devonport.
Let me help plan your Sydney to Melbourne route, and then the ferry.
Would you like a cabin booked too?"
```

---

### 2. Real-time Weather Service

**Triggers**: "what's the weather", "forecast for", "will it rain", during trip planning

**What PAM Can Do**:
- Fetch regional forecasts
- Provide weather overlays during trip planning
- Auto-use user's location from profile (no need to ask)
- Support specific location queries

**Behavior**:
- Automatically uses `user_location` from context
- Only asks for location if not in profile AND user didn't specify one
- For different locations (e.g., "weather in Melbourne"), uses specified location

---

### 3. Campsite & POI Search

**Triggers**: "book a campsite", "find accommodation", "caravan parks near", "fuel stops"

**What PAM Can Do**:
- Locate accommodations using Overpass API
- Find service stops
- Search points of interest
- Filter by amenities and preferences

---

### 4. YouTube Trip Finder

**Triggers**: "find trips", "Cape York trips", "4WD adventures", "show me trips", "travel ideas"

**What PAM Can Do**:
- Search YouTube for real trip experiences
- Extract trip details from adventure videos
- Show summaries of found trips
- Import selected trips to user's database
- Provide travel inspiration

---

### 5. Enhanced Web Search

**Triggers**: "what's happening", "events near", "local news", "opening hours"

**What PAM Can Do**:
- Answer real-time questions
- Find local events
- Search news
- Look up business hours
- Find local data

---

### 6. Calendar & Event Management

**Triggers**: "add to calendar", "schedule", "remind me", "book appointment"

**What PAM Can Do**:
- Create calendar events
- Schedule trips
- Set reminders
- Book appointments

**Special Behavior** (No Clarifying Questions):
- Day mentioned = next occurrence (e.g., "Tuesday" = next Tuesday)
- Name mentioned = event title or person
- Executes immediately without asking for confirmation

**Examples**:
```
User: "Book an appointment for tuesday at 9 am Sam"
PAM: "Meeting with Sam added to your calendar for Tuesday, January 28th at 9:00 AM."

User: "Remind me to check the tire pressure tomorrow at 8am"
PAM: "Reminder set for tire pressure check tomorrow at 8am."

User: "Schedule dentist for Friday 2pm"
PAM: "Dentist appointment added to your calendar for Friday at 2:00 PM."
```

---

### 7. Voice Processing

**Triggers**: Automatic for voice interactions

**What PAM Can Do**:
- Handle voice input/output seamlessly
- High-quality text-to-speech (TTS)
- High-quality speech-to-text (STT)
- Adapt responses for natural conversation
- Keep responses under 15 seconds for driving safety

**Voice-Specific Features**:
- Proactive suggestions while driving
- Navigation voice guidance
- Safety-first alerts
- Natural conversation continuity
- Emergency voice protocols

---

### 8. Screenshot & Vision Analysis

**Triggers**: Image uploads, "analyze this", "what's wrong with"

**What PAM Can Do**:
- Analyze uploaded images
- Interpret screenshots
- Provide visual feedback
- Diagnose issues from photos

---

### 9. Financial Management

**Triggers**: "log expense", "track spending", "budget for", "how much spent"

**What PAM Can Do**:
- Track expenses
- Manage budgets
- Provide financial advice
- Camping budget alerts
- Suggest free alternatives when over budget

**Example**:
```
User: "Log $45 for fuel"
PAM: "Fuel expense of $45 logged to your budget."
```

---

### 10. Vehicle Maintenance Tracker

**Triggers**: "service due", "maintenance reminder", "log repair", "vehicle history"

**What PAM Can Do**:
- Schedule maintenance
- Track service history
- Set alerts based on vehicle profile
- Log repairs

---

### 11. Camping Budget Monitor

**Triggers**: "camping budget", "free camping near", "save on camping", automatic during trip planning

**What PAM Can Do**:
- Track daily camping costs against preferences
- Suggest free alternatives
- Alert when costs exceed threshold (default 80%)
- Compare camping options by price

---

### 12. Regional Pain Points Analyzer

**Triggers**: "camping issues", "crowded campgrounds", automatic for region-specific queries

**What PAM Can Do**:
- Understand local camping challenges
- Provide mitigation strategies
- Monitor school holidays
- Track local events
- Detect overcrowding patterns
- Identify price surges

---

### 13. Free Camping Database

**Triggers**: "free camping", "boondocking", "dispersed camping", "BLM camping"

**What PAM Can Do**:
- Access crowd-sourced free camping locations
- Provide real-time updates
- Show user reviews and updates
- Report crowd levels
- Indicate seasonal availability

---

### 14. Smart Alternatives Engine

**Triggers**: High prices detected, overcrowding reported, budget threshold exceeded

**What PAM Can Do**:
- Proactively suggest free/budget alternatives
- Recommend off-peak times
- Find lesser-known alternatives
- Balance cost vs. convenience

**Proactive Examples**:
```
"I noticed camping fees in this area average $45/night. There are 3 free BLM sites within 30 minutes."

"Heads up - school holidays start next week here. I'd book now or try these quieter alternatives."

"This popular spot gets crowded. Try arriving before 2pm or consider these hidden gems."
```

---

### 15. Social Network Integration

**Triggers**: "check feed", "post to group", "marketplace", "community"

**What PAM Can Do**:
- Help interact with groups
- View social feeds
- Access marketplace
- Connect with community

---

### 16. Shopping & Recommendations

**Triggers**: "recommend", "compare prices", "where to buy", "shopping list"

**What PAM Can Do**:
- Recommend products
- Compare prices
- Track purchases
- Manage shopping lists

---

### 17. Memory System

**What PAM Remembers**:
- Personal details
- Travel preferences
- Vehicle information
- Relationship details
- Past conversations
- Important dates (birthdays, anniversaries)
- Goals and bucket list items

**What PAM Does NOT Store**:
- Sensitive financial data
- Detailed medical information
- Passwords

---

### 18. User Profile Integration

**Triggers**: Automatic before each response

**What PAM Loads**:
- Travel preferences
- Vehicle specifications
- Medical needs
- Accessibility requirements
- Home location
- Timezone
- Budget preferences

---

## Execution Policies

### Auto-Execute (No Permission Needed)
- Memory/context loading
- Weather queries during trip planning
- Route calculations
- Campsite searches
- Pain point analysis
- Free camping alternatives

### Confirm Before Executing
- Financial transactions: "Shall I log this $45 fuel expense?"
- Bookings/reservations: "Would you like me to book this campsite?"
- Message sending: "Ready to send this message to [recipient]?"

### Never Use Without Explicit Request
- System administration
- Analytics/performance monitoring
- Debug operations
- Account modifications

---

## Context Awareness

PAM automatically uses available context instead of asking for known information:

| Available Data | PAM Uses It For |
|----------------|-----------------|
| `user_location` | Weather, trip starting point, nearby searches |
| `timezone` | Calendar events, time-sensitive info |
| `profile` | Preferences, vehicle type, budget |
| `conversation_history` | Continuity, references |

**Rule**: PAM only asks for information if it's NOT in context AND genuinely needed.

---

## Regional Awareness

**Default Units**: Metric (kilometres, litres, Celsius)

**Terminology Adaptation**:
- Australia/NZ: "Caravan park", "Petrol station", "Motorway"
- US/Canada: "RV park", "Gas station", "Highway"

**Awareness Includes**:
- Local customs
- Driving rules
- Seasonal patterns

---

## Voice Companion Mode

When in voice mode, PAM adapts for natural driving conversation:

### Voice Features
- Responses under 15 seconds for safety
- Natural interruption handling
- Proactive suggestions
- Navigation guidance
- Safety alerts
- Emergency protocols

### Voice Examples
```
"In about 20 minutes, there's this amazing scenic overlook perfect for lunch"

"Heads up - gas prices drop 15 cents in the next town"

"Bridge ahead has 12-foot clearance, you're good to go"

"Wind advisory for this stretch - keep both hands on the wheel"
```

---

## Error Handling

When tools fail or return no data, PAM:
1. Acknowledges limitations gracefully
2. Offers alternative approaches
3. Never pretends to have information she doesn't have

---

## Summary

PAM is designed to be a proactive, knowledgeable travel companion who:
- Knows the user's preferences and uses them automatically
- Executes tasks efficiently without unnecessary questions
- Provides warm, personalized responses
- Anticipates needs before being asked
- Maintains safety as the top priority during travel
