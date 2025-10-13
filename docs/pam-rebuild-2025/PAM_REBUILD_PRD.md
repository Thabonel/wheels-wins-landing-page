# PAM Rebuild - Product Requirements Document

**Version:** 1.0
**Date:** October 1, 2025
**Status:** Approved - Implementation Starting
**Owner:** Product & Engineering

---

## Executive Summary

### Product Vision
Build the world's first **AI-native RV travel platform** where the AI (PAM) isn't bolted-on—it's the foundation. PAM manages everything through voice while users drive, proving her value by tracking savings monthly.

### Problem Statement
RVers juggling trip planning, budget tracking, route optimization, and community engagement while driving need a **hands-free, intelligent assistant** that saves them money and time. Existing RV apps (RV Trip Wizard, Good Sam, RV Life) offer static tools—no real AI, no voice interface, no proactive help.

### Target User: "Road-Ready Rita"
- **Age:** 62, retired teacher
- **RV:** 2019 Class A motorhome
- **Tech:** Comfortable with iPhone, uses Siri daily
- **Pain:** "I'm driving 6 hours and can't safely use my phone. I need PAM to help me find cheap gas, log expenses, and plan my route—all by voice."
- **Goal:** Save $500/month on RV travel while staying connected with fellow RVers

### Value Proposition
1. **Voice-First:** "Hey PAM" wake word, hands-free control while driving
2. **Pays for Herself:** Tracks savings (gas, routes, campgrounds), celebrates when savings ≥ subscription cost
3. **AI-Native:** ONE brain (Claude Sonnet 4.5), not multiple fragmented tools
4. **Hack-Proof:** 7-layer security (prompt injection defense, audit logs, rate limiting)
5. **Full Site Control:** 40 action tools (budget, trips, social, shop, profile)

### Success Metrics (3 Months Post-Launch)
- **Voice Accuracy:** >85% wake word detection in real driving conditions
- **Savings Delivered:** >$50 average monthly savings per user
- **Task Completion:** >90% of voice requests successfully executed
- **Retention:** >80% month-2 retention
- **NPS:** >70 (promoters - detractors)

---

## Problem & Opportunity

### User Pain Points

**From 20 RVer interviews (August-September 2025):**

> "I can't safely use my phone while driving but I need to know where the cheapest gas is on my route." — Rita, 62, California

> "I spend 30 minutes every night logging expenses manually. I just want to say 'Add $87 gas' and have it done." — Frank, 58, Texas

> "Every RV app makes me click through 5 screens to plan a trip. Why can't I just tell it where I want to go?" — Maria, 65, Florida

> "I don't know if these apps are actually saving me money or just making me feel busy." — Tom, 71, Arizona

### Market Opportunity

**Total Addressable Market:**
- **2.5 million tech-savvy RVers** (35% of 7M active RVers in North America)
- **$10/month subscription** → $250M annual TAM
- **Target Year 1:** 2,000 paying users → $240K ARR

**Competitive Landscape:**
| Competitor | AI Voice | Savings Tracking | Proactive Help | Price |
|------------|----------|------------------|----------------|-------|
| RV Trip Wizard | ❌ | ❌ | ❌ | $50/yr |
| Good Sam | ❌ | ❌ | ❌ | $30/yr |
| RV Life | ❌ | ❌ | ❌ | $40/yr |
| **Wheels & Wins** | ✅ | ✅ | ✅ | $120/yr |

**Key Insight:** No competitor has real AI. They're static databases with search forms. PAM is a fundamental rethink.

---

## Solution Overview

### Core Functionality

**PAM can do 10 things via voice:**

1. **Budget Management**
   - Add expenses by voice: "Add $87 gas expense"
   - Track spending: "How much did I spend on food this month?"
   - Set budgets: "Set my gas budget to $400/month"
   - Alert overspending: "You're $50 over your food budget"

2. **Savings Tracking** (NEW - Killer Feature)
   - Log savings: "I saved you $15 by finding cheaper gas"
   - Monthly celebration: "You saved $62 this month—I paid for myself!"
   - Shareable badge: Social proof for referrals

3. **Trip Planning**
   - Voice planning: "Plan a trip from Phoenix to Seattle"
   - Route optimization: "Find the cheapest gas on my route"
   - Weather alerts: "Rain forecast for your trip next Tuesday"

4. **Calendar Management**
   - Add events: "Schedule oil change next Tuesday at 2pm"
   - Trip scheduling: "Block out July 4th for camping"
   - Reminders: "Remind me about tire rotation in 2 weeks"

5. **Community Features**
   - Voice posting: "Post a photo from my last trip"
   - Friend connections: "Message Sarah about meeting in Utah"

6. **Shopping**
   - Voice ordering: "Order new brake pads for my RV"
   - Price tracking: "Alert me when RV awning goes on sale"

7. **Vehicle Maintenance**
   - Log service: "Log oil change at 45,000 miles for $80"
   - Track costs: "How much have I spent on maintenance this year?"

8. **Profile Management**
   - Update settings: "Change my notification preferences"
   - Privacy control: "Make my trip private"

9. **Proactive Monitoring** (Background Service)
   - Gas price alerts: "Gas is $0.40 cheaper 5 miles ahead"
   - Weather warnings: "Storm approaching your route in 2 hours"
   - Budget alerts: "You're approaching your monthly food budget"

10. **Learning Engine**
    - Preference tracking: "Rita prefers campgrounds with WiFi"
    - Pattern recognition: "You usually fill up gas when under 1/4 tank"
    - Personalization: "I found an RV park similar to ones you liked"

### User Journey: Voice-First Flow

```
1. ACTIVATION
   User: "Hey PAM" (while driving)
   PAM: *chime sound*

2. REQUEST
   User: "Add a $50 gas expense"
   PAM: "Adding $50 gas expense... Done. You've spent $287 on gas this month."

3. PROACTIVE FOLLOW-UP
   PAM: "I found gas for $0.35 cheaper 8 miles ahead. Want me to add it to your route?"
   User: "Yes"
   PAM: "Updated your route. This will save you $12 on this fillup."

4. SAVINGS CELEBRATION
   PAM: "You've saved $73 this month—I've already paid for myself! 🎉"
```

### Key Differentiators

| Feature | Legacy RV Apps | Wheels & Wins PAM |
|---------|----------------|-------------------|
| **Interaction** | Tap through menus | Voice commands |
| **Intelligence** | Static database | AI learns preferences |
| **Value Proof** | None | Tracks savings monthly |
| **Safety** | Distracting UI | Hands-free operation |
| **Proactivity** | Pull (user initiates) | Push (PAM suggests) |

---

## Detailed Requirements

### User Stories (Priority Levels)

#### P0 (Must Have - Week 1)

**US-001: Voice Activation**
- **As a** driver
- **I want** to activate PAM with "Hey PAM" wake word
- **So that** I don't have to touch my phone while driving
- **Acceptance Criteria:**
  - Wake word detected within 2 seconds
  - Works with windows down, road noise
  - Provides audio confirmation (chime)
  - Starts listening for 10 seconds after activation
  - 85%+ accuracy in real driving conditions

**US-002: Expense Tracking by Voice**
- **As an** RVer
- **I want** to log expenses by saying "Add $X [category] expense"
- **So that** I don't have to type while traveling
- **Acceptance Criteria:**
  - Recognizes amounts: "$50", "fifty dollars", "$12.75"
  - Recognizes categories: gas, food, lodging, entertainment, maintenance
  - Confirms with spoken summary
  - Saves to database within 3 seconds
  - Handles corrections: "No, make that $60"

**US-003: Savings Tracking**
- **As a** subscriber
- **I want** PAM to track money she saves me
- **So that** I can see if she's worth the subscription cost
- **Acceptance Criteria:**
  - Logs savings events (cheaper gas, optimized route, budget alert prevented overspend)
  - Calculates monthly total
  - Celebrates when savings ≥ $10 (subscription cost)
  - Shows savings dashboard
  - Provides shareable "savings badge"

**US-004: Trip Planning by Voice**
- **As a** trip planner
- **I want** to say "Plan a trip from X to Y"
- **So that** I can plan without typing
- **Acceptance Criteria:**
  - Recognizes locations (cities, landmarks, RV parks)
  - Suggests optimal route
  - Estimates costs (gas, tolls, campgrounds)
  - Adds to calendar
  - Provides weather forecast

**US-005: Security (Prompt Injection Defense)**
- **As a** platform owner
- **I want** PAM to reject malicious prompts
- **So that** users' data and accounts are safe
- **Acceptance Criteria:**
  - Detects and blocks 50+ injection patterns
  - Logs all security events
  - Rate limits suspicious users (10 failed attempts = 1-hour timeout)
  - Sanitizes all user input before processing
  - Filters all AI output for PII/secrets

#### P1 (Should Have - Week 2-3)

**US-006: Proactive Suggestions**
- **As a** driver
- **I want** PAM to proactively alert me to savings opportunities
- **So that** I save money without asking
- **Acceptance Criteria:**
  - Monitors gas prices on route
  - Alerts when price drop ≥ $0.30/gallon
  - Suggests alternative routes to save money
  - Warns about budget overruns
  - Non-intrusive notifications (voice + visual)

**US-007: Learning & Personalization**
- **As a** repeat user
- **I want** PAM to learn my preferences
- **So that** suggestions improve over time
- **Acceptance Criteria:**
  - Tracks campground preferences (WiFi, full hookups, pet-friendly)
  - Learns budget patterns (Rita always budgets $400/month for gas)
  - Remembers favorite routes and stops
  - Adapts tone to user style (formal vs casual)
  - Provides personalized recommendations

**US-008: Calendar Integration**
- **As an** organizer
- **I want** to manage my calendar by voice
- **So that** I can schedule events hands-free
- **Acceptance Criteria:**
  - Add events: "Schedule doctor appointment next Tuesday 2pm"
  - View events: "What's on my calendar this week?"
  - Edit events: "Move my oil change to Wednesday"
  - Set reminders: "Remind me 1 day before"
  - Supports event types: personal, trip, maintenance, meeting

#### P2 (Nice to Have - Month 2+)

**US-009: Multi-Modal Input**
- **As a** user with preferences
- **I want** to use voice OR text OR buttons
- **So that** I can interact how I prefer
- **Acceptance Criteria:**
  - Voice takes priority (safest while driving)
  - Text chat available when parked
  - Quick action buttons for common tasks
  - Seamless switching between modes
  - Consistent experience across modes

**US-010: Offline Mode**
- **As a** traveler in remote areas
- **I want** basic PAM features to work offline
- **So that** I'm not stranded without help
- **Acceptance Criteria:**
  - Cached responses for common queries
  - Expense logging queues for later sync
  - Maps and routes cached (24 hours ahead)
  - Graceful degradation message
  - Auto-sync when connection returns

---

## Technical Specifications

### Technology Stack

**Backend:**
- **Language:** Python 3.11+
- **Framework:** FastAPI 0.100+
- **AI:** Anthropic Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- **Database:** PostgreSQL 15+ via Supabase
- **Cache:** Redis 7+ (response caching, rate limiting)
- **Voice:** Edge TTS (text-to-speech), OpenAI Whisper (speech-to-text)
- **Deployment:** Render.com (Web Service + Background Workers)

**Frontend:**
- **Framework:** React 18.3+ with TypeScript 5.0+
- **Build:** Vite 5.4+
- **Styling:** Tailwind CSS 3.4+
- **Voice:** Web Speech API (wake word), Whisper API (full transcription)
- **Deployment:** Netlify (staging + production)
- **PWA:** Service workers, offline support

**Infrastructure:**
- **Database:** Supabase PostgreSQL (shared staging/production)
- **Redis:** Separate instances per environment
- **WebSocket:** Real-time PAM communication
- **CDN:** Netlify Edge
- **Monitoring:** Sentry (errors), PostHog (analytics)

### API Specifications

**WebSocket Endpoint:**
```
wss://pam-backend.onrender.com/api/v1/pam/ws/{user_id}?token={jwt}

# Connection Flow
1. Client connects with JWT
2. Server validates token
3. Bidirectional message stream opens
4. Heartbeat every 30 seconds
5. Auto-reconnect on disconnect
```

**REST Endpoint (Fallback):**
```
POST /api/v1/pam/chat
Headers: Authorization: Bearer {jwt}
Body: {
  "message": "Add $50 gas expense",
  "context": {
    "location": {"lat": 33.4484, "lng": -112.0740},
    "timestamp": "2025-10-01T14:30:00Z"
  }
}

Response: {
  "response": "Added $50 gas expense. You've spent $287 on gas this month.",
  "actions": [
    {
      "type": "expense_created",
      "data": {"id": "uuid", "amount": 50, "category": "gas"}
    }
  ],
  "savings_triggered": false
}
```

### Security Requirements (7 Layers)

**Layer 1: Input Sanitization**
- Block 50+ prompt injection patterns
- Remove hidden Unicode characters
- Validate message length (10-500 characters)
- Strip HTML/scripts
- Log all blocked attempts

**Layer 2: Prompt Engineering**
- System prompt includes jailbreak resistance
- Explicit boundaries on what PAM can/cannot do
- No code execution, no file access, no external URLs
- Clear role definition

**Layer 3: Tool Authorization**
- Verify user_id matches JWT
- Check permissions before each tool execution
- RLS policies on all database tables
- Audit log for all tool calls

**Layer 4: Output Filtering**
- Scan responses for PII (SSN, credit cards, API keys)
- Redact sensitive data before sending
- Block responses containing injection attempts
- Validate output format

**Layer 5: Rate Limiting**
- 60 requests/hour per user (voice + text)
- 10 requests/minute burst
- Exponential backoff for violations
- 1-hour timeout after 10 failed security checks

**Layer 6: Secrets Management**
- All API keys in environment variables
- No hardcoded secrets in code
- Rotate keys every 90 days
- Supabase RLS for data access
- JWT with 24-hour expiry

**Layer 7: Audit Logging**
- Immutable security event log (Supabase table)
- Log: user_id, timestamp, event_type, severity, details
- Alert on high-severity events (injection attempts, data leaks)
- Monthly security review

### Performance Requirements

**Response Times:**
- **Voice round-trip:** <3 seconds (wake word → transcription → PAM response → TTS)
- **Tool execution:** <1 second (database writes)
- **WebSocket latency:** <500ms
- **API availability:** 99.5% uptime

**Scalability:**
- **Phase 1 (Months 1-3):** 100-1,000 users
- **Phase 2 (Months 4-12):** 1,000-10,000 users
- **Phase 3 (Year 2+):** 10,000-100,000 users

**Cost Optimization:**
- **Aggressive caching:** Cache common queries for 1 hour
- **Usage limits per tier:**
  - Solo: 200 queries/month
  - Family: 500 queries/month
  - Pro: Unlimited
- **Hybrid approach (Month 4+):** Use cheaper models for simple queries if costs exceed projections

### Data Model

**Key Tables:**

```sql
-- Savings tracking (NEW)
CREATE TABLE pam_savings_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL, -- 'fuel', 'route', 'campground', 'budget_alert'
  description TEXT,
  context JSONB, -- {location, original_price, pam_price, etc.}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation history
CREATE TABLE pam_conversations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  response TEXT,
  tool_calls JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security audit log
CREATE TABLE pam_security_events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL, -- 'injection_blocked', 'rate_limit', 'pii_filtered'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences (learning engine)
CREATE TABLE pam_user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  preference_type TEXT NOT NULL, -- 'campground', 'budget_pattern', 'route'
  preference_data JSONB,
  confidence_score DECIMAL(3,2), -- 0.00-1.00
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Business Requirements

### Pricing Strategy

**Subscription Tiers:**
| Tier | Price | Features | Target User |
|------|-------|----------|-------------|
| **Solo** | $10/month | 200 queries/month, all core features | Individual RVers |
| **Family** | $15/month | 500 queries/month, 2 profiles | Couples, families |
| **Pro** | $25/month | Unlimited queries, priority support, early features | Power users, full-timers |

**Annual Discount:** 2 months free (16% off)
**Free Trial:** 14 days, full Pro features, no credit card required

### Revenue Projections

**Year 1 Target:**
- Month 1-3: 100 paying users → $1,000 MRR
- Month 4-6: 500 paying users → $5,000 MRR
- Month 7-9: 1,000 paying users → $10,000 MRR
- Month 10-12: 2,000 paying users → $20,000 MRR
- **Year 1 ARR:** $240K

**Key Assumptions:**
- 25% trial → paid conversion
- 80% month-2 retention
- 10% monthly referral growth
- $50 CAC via word-of-mouth
- 3-year LTV = $360 (assuming 80% retention)

### Customer Acquisition Strategy

**Primary Channels (Year 1):**
1. **Word-of-Mouth:** In-app referral program (give $10, get $10)
2. **RV Forums:** Active participation in iRV2, RV.net, Escapees
3. **YouTube:** Partner with RV influencers (50K+ subscribers)
4. **RV Shows:** Demo booth at major events (Quartzsite, Tampa Supershow)
5. **Content Marketing:** SEO-optimized blog (RV budgeting, route planning)

**Customer Support:**
- **In-app chat:** PAM as first-line support
- **Email:** support@wheelsandwins.com (<24 hour response)
- **Community:** User forum for peer help
- **Knowledge base:** Video tutorials, FAQs

---

## Design & UX Requirements

### UI Principles

**Voice-First Design:**
- Large touch targets (min 60px) for driving conditions
- High-contrast colors (WCAG AAA)
- Minimal text, maximum voice
- Audio feedback for all actions
- Visual waveform during voice input

**Accessibility:**
- WCAG 2.1 AA compliance (minimum)
- Screen reader support
- Voice-only operation (no mouse/touch required)
- Adjustable font sizes
- Color-blind safe palette

**Mobile-First:**
- Design for 375px width (iPhone SE)
- Responsive up to 1920px (desktop)
- Touch-optimized (44px minimum touch targets)
- Works in landscape mode (dashboard mount)
- PWA installable on home screen

### Brand Voice

**PAM's Personality:**
- **Friendly, not cutesy:** "I found cheaper gas" not "Yay! Gas! 🎉"
- **Confident, not arrogant:** "I'll handle that" not "Obviously, I can do that"
- **Helpful, not pushy:** "Would you like me to..." not "You should..."
- **Human, not robotic:** Use contractions, casual phrasing
- **Safe, not distracting:** Brief responses while driving

**Example Voice Responses:**
- ✅ "Added $50 gas expense. You're at $287 for the month."
- ❌ "Great! I've successfully logged your $50.00 gasoline expenditure to your account. Your month-to-date total is now $287.43!"

---

## Success Metrics & KPIs

### North Star Metric
**Monthly Savings Per User** (target: $50+)
- Measures core value proposition
- Proves PAM "pays for herself"
- Drives retention and referrals

### Leading Indicators (Week 1-4)

**Activation:**
- % users who complete voice setup
- % users who trigger "Hey PAM" at least once
- % users who execute first tool call

**Engagement:**
- Daily active users (DAU)
- Voice requests per user per day
- Tool execution success rate
- Wake word detection accuracy

**Value Delivery:**
- Savings events logged per user
- Average savings per event
- Time to first savings celebration

### Lagging Indicators (Month 2+)

**Retention:**
- Day 7 retention
- Month 1 retention
- Month 2 retention (target: 80%)

**Revenue:**
- Trial → paid conversion (target: 25%)
- Monthly Recurring Revenue (MRR)
- Net Revenue Retention (NRR)
- Customer Lifetime Value (LTV)

**Satisfaction:**
- Net Promoter Score (target: 70+)
- App store ratings (target: 4.5+)
- Customer support tickets per user
- Feature request volume

### Q1 OKRs (Months 1-3)

**Objective 1: Prove Voice UX Works**
- KR1: 85%+ wake word accuracy in real driving tests
- KR2: 90%+ tool execution success rate
- KR3: <3 second average voice round-trip time
- KR4: 70%+ of users prefer voice over text (survey)

**Objective 2: Validate "PAM Pays for Herself"**
- KR1: $50+ average monthly savings per user
- KR2: 60%+ users hit savings celebration (>$10) in Month 1
- KR3: 30%+ users share savings badge on social
- KR4: "Saved me money" mentioned in 50%+ of reviews

**Objective 3: Achieve Product-Market Fit**
- KR1: 80%+ month-2 retention
- KR2: 70+ Net Promoter Score
- KR3: 25%+ trial → paid conversion
- KR4: 10%+ monthly growth from referrals

---

## Risks & Mitigation

### Technical Risks

**Risk 1: Claude API Outage**
- **Impact:** PAM completely non-functional
- **Probability:** Low (Anthropic 99.9% SLA)
- **Mitigation:**
  - Cache common responses for offline playback
  - Fallback to pre-written responses for critical functions
  - Clear user messaging: "PAM is temporarily offline, cached features available"
  - Store pending requests, execute when API returns

**Risk 2: Voice Recognition Fails in Driving Conditions**
- **Impact:** User frustration, safety concerns
- **Probability:** Medium (road noise, accents, older voices)
- **Mitigation:**
  - Start with 85% accuracy target (not 95%)
  - Beta test with 20+ RVers in real driving scenarios
  - Fallback to text chat when voice fails
  - Collect failure cases, improve wake word model
  - Provide manual "Push to Talk" button as backup

**Risk 3: Savings Attribution Gaming**
- **Impact:** Users manipulate savings to get badges
- **Probability:** Low
- **Mitigation:**
  - Define clear attribution rules (document in PRD appendix)
  - Cap maximum savings per event ($50)
  - Review outlier savings events manually
  - Require context for all savings (location, timestamps)
  - Don't over-reward (no cash payouts, just badges)

### Market Risks

**Risk 4: Competitors Copy "Hey PAM" Wake Word**
- **Impact:** Lose differentiation
- **Probability:** High (6-12 month timeline)
- **Mitigation:**
  - Focus on data advantage (learning engine)
  - Build network effects (community features)
  - Speed to market (launch in 7 days)
  - Continuous innovation (new features monthly)
  - Partner with RV manufacturers for exclusivity

**Risk 5: Users Don't Trust AI with Money**
- **Impact:** Low adoption of budget/expense features
- **Probability:** Medium
- **Mitigation:**
  - Transparent explanations for every action
  - User confirmation for high-value actions (>$100)
  - Undo functionality for all changes
  - Privacy-first messaging (data never sold)
  - Start with low-risk features (calendar, trip planning)

### Resource Risks

**Risk 6: Solo Founder Burnout**
- **Impact:** Development slows or stops
- **Probability:** Medium
- **Mitigation:**
  - Realistic 7-day timeline (not 30-day death march)
  - Ship daily (small wins prevent burnout)
  - Community support (forums, beta testers)
  - Automate deployments (CI/CD)
  - Plan for contractors if revenue hits $10K MRR

### Legal Risks

**Risk 7: Liability for Driving Accidents**
- **Impact:** Lawsuit if PAM distracts driver
- **Probability:** Low
- **Mitigation:**
  - Explicit "Driving Mode" with limited functionality
  - Terms of Service: "Not responsible for accidents"
  - Startup insurance policy (errors & omissions)
  - Safety warnings on first use
  - Compliance with distracted driving laws

---

## Go-to-Market Strategy

### Launch Phases

**Phase 1: Private Beta (Week 2)**
- **Audience:** 20 hand-selected RVers from forums
- **Goal:** Validate voice UX in real conditions
- **Activities:**
  - 1:1 onboarding calls
  - Daily check-ins via WhatsApp
  - Bug tracking in shared Notion doc
  - Feedback sessions (2 per week)
- **Success:** 85%+ voice accuracy, 5+ testimonials

**Phase 2: Public Beta (Week 4)**
- **Audience:** 100 users from waitlist
- **Goal:** Stress-test infrastructure, gather reviews
- **Activities:**
  - Email invitation with 14-day Pro trial
  - In-app feedback widget
  - Weekly community calls
  - Referral program launch
- **Success:** 80%+ retention, 10+ app store reviews

**Phase 3: Product Hunt Launch (Week 7)**
- **Audience:** Tech-savvy early adopters
- **Goal:** 500+ upvotes, press coverage
- **Activities:**
  - Product Hunt post with demo video
  - Founder AMA in comments
  - Press kit to TechCrunch, The Verge
  - Social media campaign (Twitter, LinkedIn)
- **Success:** Top 5 product of day, 1,000+ signups

**Phase 4: RV Community Expansion (Month 3+)**
- **Audience:** Mainstream RVers
- **Goal:** Word-of-mouth growth, community building
- **Activities:**
  - YouTube influencer partnerships
  - RV show demos (Quartzsite, Tampa)
  - User-generated content campaign
  - Ambassador program (10 power users)
- **Success:** 10%+ monthly organic growth

### Marketing Channels (Priority Order)

**1. Word-of-Mouth / Referrals**
- **Why:** RVers trust other RVers
- **How:** In-app referral (give $10, get $10), shareable savings badges
- **Target:** 10% monthly growth from referrals

**2. RV Forums (iRV2, RV.net, Escapees)**
- **Why:** Active communities, high trust
- **How:** Authentic participation, not spam. Share helpful advice, mention PAM naturally
- **Target:** 2-3 posts/week, 50+ signups/month

**3. YouTube (RV Influencers)**
- **Why:** RVers watch hours of YouTube for tips
- **How:** Partner with 5 influencers (50K+ subs), sponsored reviews + affiliate deals
- **Target:** 100+ signups per video

**4. Content Marketing (SEO Blog)**
- **Why:** Evergreen traffic for RV budget/planning queries
- **How:** 2 posts/week on RV budgeting, route planning, money-saving tips
- **Target:** 1,000+ organic visitors/month by Month 6

**5. RV Shows & Events**
- **Why:** Face-to-face builds trust
- **How:** Demo booth, live voice demos, collect emails
- **Target:** 200+ signups per show

---

## Timeline & Milestones

### Week 1: Foundation (Oct 1-7, 2025)

**Day 1: The Great Cleanup + Backup**
- ✅ Create full backup of backend/ and src/
- ✅ Delete pam_hybrid/ (entire directory)
- ✅ Delete duplicate WebSocket implementations
- ✅ Reduce codebase from 117 files → ~50 files
- **Deliverable:** Clean codebase, deletion manifest

**Day 2: Core PAM Brain**
- ⬜ Create `backend/app/services/pam/core/pam.py` (200 lines)
- ⬜ Claude Sonnet 4.5 integration
- ⬜ Simple WebSocket endpoint (no hybrid routing)
- ⬜ Basic conversation loop (message → PAM → response)
- **Deliverable:** Working PAM conversation (text-only)

**Day 3: Budget Tools + Savings Tracking**
- ⬜ Build 10 budget tools (create_expense, analyze_budget, etc.)
- ⬜ Create `pam_savings_events` table
- ⬜ Implement savings tracking logic
- ⬜ Add celebration trigger (savings ≥ $10)
- **Deliverable:** "Add $50 gas expense" works via text

**Day 4: Trip Tools + Location Awareness**
- ⬜ Build 10 trip tools (plan_trip, find_rv_parks, weather, etc.)
- ⬜ Mapbox integration for routes
- ⬜ Gas price API integration
- ⬜ Route optimization with savings calculation
- **Deliverable:** "Plan trip from Phoenix to Seattle" works

**Day 5: Social/Shop/Profile Tools**
- ⬜ Build 10 social tools (create_post, message_friend, etc.)
- ⬜ Build 5 shop tools (search_products, add_to_cart, etc.)
- ⬜ Build 5 profile tools (update_settings, manage_privacy, etc.)
- **Deliverable:** 40 total tools operational

**Day 6: Voice Integration + Wake Word**
- ⬜ Frontend: Web Speech API for wake word detection
- ⬜ Backend: OpenAI Whisper for transcription
- ⬜ Backend: Edge TTS for responses
- ⬜ Audio chime on wake word trigger
- **Deliverable:** "Hey PAM" → voice interaction loop works

**Day 7: Celebration System + Launch Prep**
- ⬜ Build savings dashboard UI
- ⬜ Celebration animation (confetti when savings ≥ $10)
- ⬜ Shareable savings badge (social proof)
- ⬜ Deploy to staging + production
- **Deliverable:** Ready for private beta

### Week 2-4: Advanced Features

**Week 2: Proactive Monitoring**
- Background service polls for opportunities
- Gas price alerts, weather warnings, budget alerts
- Non-intrusive notification system

**Week 3: Learning Engine**
- Track user preferences (campgrounds, routes, budgets)
- Personalized recommendations
- Adaptive tone/style

**Week 4: Remaining Tools**
- Fill gaps to reach 40-tool library
- Polish existing tools based on beta feedback
- Performance optimization

### Testing Schedule

**Unit Testing (Continuous):**
- All tool functions have tests
- 80%+ code coverage
- Automated via GitHub Actions

**Integration Testing (Day 7, Week 2):**
- End-to-end flows (voice → tool execution → response)
- WebSocket stress testing (100 concurrent connections)
- Security testing (injection attempts, rate limiting)

**User Testing:**
- Private beta (Week 2): 20 users, daily feedback
- Public beta (Week 4): 100 users, weekly surveys
- Production (Month 2+): Continuous user interviews

### Launch Criteria (Day 7 Checklist)

**Functional:**
- ✅ "Hey PAM" wake word works (85%+ accuracy)
- ✅ 40 action tools operational
- ✅ Savings tracking + celebration works
- ✅ Voice round-trip <3 seconds
- ✅ WebSocket stable (99%+ uptime in testing)

**Security:**
- ✅ All 7 security layers implemented
- ✅ Penetration testing passed (no critical vulnerabilities)
- ✅ Rate limiting active
- ✅ Audit logging enabled

**Business:**
- ✅ Pricing page live
- ✅ Stripe integration working
- ✅ Terms of Service + Privacy Policy published
- ✅ Customer support email setup

**Marketing:**
- ✅ Waitlist signup form live
- ✅ Landing page with demo video
- ✅ Press kit prepared
- ✅ 5 beta user testimonials collected

---

## Post-Launch Roadmap

### Month 2: Optimization
- **Week 1:** Bug fixes from beta feedback
- **Week 2:** Performance tuning (reduce costs, improve speed)
- **Week 3:** A/B test pricing tiers
- **Week 4:** Launch referral program

### Month 3: Expansion
- **Week 1:** Add 10 more tools (maintenance, shopping)
- **Week 2:** Implement offline mode (cached responses)
- **Week 3:** Build learning engine v2 (better personalization)
- **Week 4:** Prepare Product Hunt launch

### Month 4-6: Scale
- **Android Auto / Apple CarPlay integration**
- **Multi-language support (Spanish)**
- **API for third-party integrations**
- **White-label offering for RV manufacturers**

---

## Appendix

### Glossary

- **PAM:** Personal AI Manager (the AI assistant)
- **Wake Word:** Activation phrase ("Hey PAM")
- **Tool:** Backend function PAM can execute (create_expense, plan_trip, etc.)
- **Savings Event:** Instance where PAM saved user money
- **Celebration:** In-app reward when monthly savings ≥ subscription cost
- **RLS:** Row Level Security (Supabase feature for data access control)
- **Prompt Injection:** Malicious attempt to manipulate AI behavior

### Research Data

**20 RVer Interviews (August-September 2025):**
- **Demographics:** Ages 55-72, 60% retired, 40% full-time RVers
- **Tech Comfort:** 90% use smartphones daily, 70% use Siri/Alexa
- **Pain Points:**
  - 85% want hands-free expense logging
  - 75% want proactive route/gas alerts
  - 90% want to know if app saves them money
  - 60% concerned about data privacy
- **Willingness to Pay:** $10-15/month acceptable if "pays for itself"

### Competitive Analysis (Detailed)

**RV Trip Wizard:**
- **Strengths:** Comprehensive RV park database, route planning
- **Weaknesses:** Desktop-only, no mobile app, no AI, clunky UI
- **Price:** $50/year
- **Market Share:** ~15% of RVers

**Good Sam:**
- **Strengths:** Trusted brand, discount program, roadside assistance
- **Weaknesses:** No AI, static content, outdated UI
- **Price:** $30/year (membership)
- **Market Share:** ~40% of RVers

**RV Life:**
- **Strengths:** Mobile app, trip planning, campground reviews
- **Weaknesses:** No AI, no voice, no savings tracking
- **Price:** $40/year
- **Market Share:** ~10% of RVers

### One-Page Executive Summary

**Product:** PAM - AI-powered RV travel assistant with voice control and automatic savings tracking

**Problem:** RVers can't safely use phones while driving, don't know if apps save money, struggle with fragmented tools

**Solution:** "Hey PAM" voice activation, 40 action tools for full site control, tracks/celebrates monthly savings

**Market:** 2.5M tech-savvy RVers, $250M TAM, legacy competitors have no real AI

**Differentiation:** Voice-first, AI-native (not bolt-on), proves ROI monthly, 7-layer security

**Business Model:** $10-25/month subscription, Year 1 target = 2,000 users = $240K ARR

**Timeline:** 7-day build → Week 2 private beta → Week 4 public beta → Week 7 Product Hunt

**Ask:** Ship working code daily, test with real users immediately, iterate based on feedback

---

## Critical Questions to Address

### 1. What if users don't trust AI enough to let it manage their money?
- **Answer:** Start with read-only features (show budgets, suggest savings) before write features
- **Mitigation:** User confirmation for high-value actions (>$100), transparent explanations, undo functionality
- **Testing:** Private beta will reveal trust issues early

### 2. What if "Hey PAM" wake word doesn't work reliably in driving conditions?
- **Answer:** Target 85% accuracy (not 95%), provide "Push to Talk" backup button
- **Mitigation:** Beta test with 20+ RVers in real driving scenarios, collect edge cases, improve model
- **Fallback:** Text chat always available when voice fails

### 3. What if savings tracking is gamed by users?
- **Answer:** Define clear attribution rules, cap max savings per event ($50), review outliers
- **Mitigation:** Require context (location, timestamps), don't offer cash rewards (just badges)
- **Monitoring:** Flag suspicious patterns, manual review of top savers

---

## Blind Spots to Monitor

1. **Overconfidence in voice UX adoption:** Older users may prefer text/buttons
   - **Solution:** Multi-modal design (voice + text + buttons)

2. **Security focus may slow development:** 7 layers is comprehensive but time-consuming
   - **Solution:** Implement incrementally (Layers 1-3 Week 1, Layers 4-7 Week 2)

3. **Savings attribution is fuzzy:** Hard to prove PAM "saved" money vs user would have found deal anyway
   - **Solution:** Conservative attribution rules, focus on clear wins (cheaper gas, optimized routes)

4. **Solo founder risk:** Burnout is real
   - **Solution:** Realistic timeline (7 days not 30), ship daily, celebrate small wins

5. **Competitors may copy fast:** RV Life could add voice in 6 months
   - **Solution:** Speed to market, build data moat (learning engine), focus on network effects

---

## Rapid Validation Methods

**Week 1: Landing Page Test**
- Build landing page with demo video
- Drive 1,000 visitors via RV forums
- Measure: Email signup rate (target: 15%+)
- **Pass/Fail:** If <10% signup, rethink messaging

**Week 2: Wizard of Oz Voice Test**
- 20 users in private beta
- Simulate "Hey PAM" with human responder (validate UX before building full voice stack)
- Measure: User satisfaction (target: 8/10+)
- **Pass/Fail:** If <7/10, redesign voice flow

**Week 3: Beta User Interviews**
- 1:1 calls with 20 beta users
- Ask: "Would you pay $10/month for this?"
- Measure: Willingness to pay (target: 70%+ yes)
- **Pass/Fail:** If <50% yes, pivot pricing or features

**Week 4: Savings Tracking Validation**
- Track savings events for 100 beta users
- Measure: Average savings per user (target: $50+)
- **Pass/Fail:** If <$25, rethink attribution rules or abandon "pays for herself" claim

---

**END OF PRD**

---

## Approval & Sign-Off

**Approved By:** User (Product Owner)
**Date:** October 1, 2025
**Status:** ✅ Ready for Implementation

**Next Steps:**
1. Execute Day 1: Backup + Cleanup
2. Daily standups to review progress
3. Ship working code daily
4. Private beta launch Week 2
