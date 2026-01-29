# PRD: PAM Financial Co-Pilot for Mobile Living

**Product:** Wheels & Wins PAM Assistant
**Feature:** Financial Co-Pilot MVP
**Version:** 1.0
**Date:** January 29, 2026
**Status:** In Development

---

## Executive Summary

Transform PAM from a limited RV-product advisor into a **Financial Co-Pilot for Mobile Living** - a contextual decision-making companion who applies specialized RV expertise to ALL purchase decisions, not just RV products.

**Mission:** Convert spending intent into optimal savings decisions with minimal cognitive load, always through the lens of mobile living expertise.

**Key Insight:** PAM won't become a generic price finder. She becomes the only AI that combines universal search capability with deep mobile living expertise.

---

## Strategic Vision

### Problem Statement

**Current State:**
- PAM limited to 81 affiliate products from internal catalog
- Users ask for products PAM can't find: "Find me the cheapest iPad" → "I can only help with RV products"
- Massive market opportunity missed - RVers need help with ALL purchases, not just RV-specific items
- Generic AI assistants lack mobile living context

**Market Opportunity:**
- RVers make thousands of purchase decisions annually across all categories
- Every purchase has mobile living considerations (power, space, connectivity, storage)
- No existing AI combines universal search with RV expertise
- Potential to become the go-to advisor for the entire mobile living market

### Product Definition

**PAM Financial Co-Pilot is:**
- Universal search capability with RV context intelligence
- Purchase decision advisor applying mobile living expertise to ANY product
- Savings attribution system tracking PAM's financial impact
- Trust-building transparency about affiliate relationships

**PAM is NOT:**
- Generic price comparison tool
- Affiliate product pusher
- Time-sensitive deal finder
- General shopping assistant

### Value Proposition

**For RVers:**
- "The only AI that understands how your mobile lifestyle affects every purchase decision"
- Expert guidance on power, storage, connectivity, durability for ANY product
- Savings tracking showing PAM's financial impact over time

**For Business:**
- Massive market expansion beyond 81 products to unlimited purchase advisory
- Revenue diversification through affiliate partnerships + PAM Pro subscriptions
- User engagement increase - PAM becomes daily financial companion

---

## User Stories & Use Cases

### Primary Use Cases

**UC1: Electronics Purchase with RV Context**
```
User: "Find me the cheapest iPad 10.2-inch 9th Gen 256GB Cellular + WiFi"

PAM Response:
"I found several iPad options for you. **RV Context**: For mobile living, the cellular model is ideal for GPS navigation when driving and works offline for entertainment. The 256GB storage helps with downloaded maps, movies, and apps for remote areas.

**Power Considerations**: iPad charging via USB won't strain your 12V system - draws about 10-12W max.

**Options I found**: New from Apple ($499), certified refurb from Apple ($429), used options on Swappa ($299-349). **Community Insight**: Popular with full-time RVers for navigation and entertainment.

*Note: We may earn commission on some links, but this context is based on mobile living needs.*"
```

**UC2: Food Shopping with Storage Context**
```
User: "What's the cheapest way to eat this week?"

PAM Response:
"I found several food cost strategies. **RV Context**: Factor in your limited refrigeration space and propane usage for cooking.

**Cost-Effective Options**: Walmart grocery pickup ($45-60/week per person), Costco bulk buying (if you have storage), local farmers markets for fresh produce.

**Storage Optimization**: Focus on pantry-stable items, one-pot meals to save propane, pre-prepped freezer meals for efficiency.

**Community Insight**: RVers typically spend 20-30% less on food with strategic shopping vs restaurants."
```

**UC3: Service Discovery with Mobile Context**
```
User: "Find me RV maintenance in Phoenix"

PAM Response:
"I found several RV service options in Phoenix. **Mobile Context**: Prioritizing mobile-accessible providers and locations that can handle your rig size.

**Options Found**: Desert RV Service (mobile repairs), Camping World Phoenix (full service), local mobile mechanics on RV forums.

**RV-Specific**: Check their experience with your rig type, parts availability, and emergency after-hours service."
```

### Secondary Use Cases

**UC4: Budget Impact Analysis**
- "How much could I save by switching to solar instead of generator?"
- "What's the real cost difference between boondocking vs RV parks?"

**UC5: Seasonal Purchase Planning**
- "Should I buy winter gear now or wait for spring sales?"
- "When's the best time to buy solar equipment?"

**UC6: Emergency Purchase Guidance**
- "I need emergency tire repair in rural Montana"
- "Find closest parts store with my water pump model"

---

## Technical Requirements

### Core System Architecture

**1. Intent Classification System**
```python
# File: app/services/pam/core/intent_classifier.py
# Purpose: Understand spending context and product categories
# Implementation: Rule-based keyword matching (no ML complexity)

Categories: electronics, food, fuel, accommodation, maintenance, services, recreation, safety, communication
RV Relevance: high, medium, low (based on mobile living impact)
```

**2. RV Context Knowledge Base**
```python
# File: app/services/pam/knowledge/rv_context.py
# Purpose: Mobile living expertise application
# Content: Structural knowledge only (no vendor-specific claims)

Electronics: "Consider cellular models for GPS, battery impact on 12V system"
Food: "Factor in propane usage, refrigeration space, storage constraints"
Services: "Look for mobile-accessible providers, remote-friendly locations"
```

**3. Enhanced Search Integration**
```python
# File: app/services/pam/tools/financial_copilot/enhanced_search.py
# Purpose: Combine web search + price comparison + RV context
# Function: Return search results WITH context intelligence

Integration: web_search (DuckDuckGo) + compare_prices (RapidAPI) + rv_context
Output: Search results with mobile living considerations overlaid
```

**4. Community Wisdom Layer**
```python
# File: app/services/pam/community/rv_insights.py
# Purpose: Surface what other RVers actually chose
# Safe Claims: "Popular with RVers", "Commonly discussed in forums", "RV-tested"
```

### API Requirements

**Environment Variables:**
```bash
RAPIDAPI_KEY=your_rapidapi_key_here  # Price comparison ($15/month)
# DuckDuckGo search (free, no auth needed)
```

**Database Integration:**
- Extend existing `pam_savings_events` table for attribution tracking
- Track search helpfulness, not purchase recommendations
- Monthly dashboard: "PAM helped you research X purchases this month"

**Tool Registration:**
- Register enhanced_search as PAM tool in tool_registry.py
- Include in SHOP capability group with appropriate priority
- Ensure compatibility with both Claude Sonnet 4.5 and GPT-5.1 fallback

---

## Success Metrics

### MVP Success Criteria (Phase 1A - Month 1)

**Primary Metrics:**
- **Context Helpfulness**: 80%+ of users say PAM's RV context was useful in their search
- **Search Functionality**: 95%+ of product searches return relevant results with context
- **Trust Building**: 70%+ of users find PAM's information accurate and helpful
- **Engagement**: Users return to PAM for purchase research (not just RV-specific items)

**Technical Metrics:**
- Search response time: <3 seconds average
- Tool integration success rate: >95%
- Error rate: <2% of searches fail

### MVP Validation Tests
```
Test 1: "I need an iPad for navigation"
Expected: Search results + context about cellular models, offline maps, power considerations

Test 2: "What's the cheapest way to eat this week?"
Expected: Food options + context about RV kitchen/storage limitations

Test 3: "Find me RV maintenance in Phoenix"
Expected: Service search + context about mobile accessibility, remote locations
```

### Long-term Success Metrics (6 months)

**Business Impact:**
- 40% increase in daily PAM usage
- 25% increase in user session duration
- 60% of PAM conversations include purchase research
- $50+ average monthly savings attribution per active user

**User Satisfaction:**
- 4.5+ star rating for PAM helpfulness
- 80%+ user retention month-over-month
- 70% of users recommend PAM to other RVers

---

## Implementation Timeline

### Phase 1A: Context-Aware Search (Week 1 - 16 hours)

**Day 1: Foundation (4 hours)**
- Intent classifier (keyword pattern matching)
- Basic RV context knowledge base

**Day 2-3: Integration (10 hours)**
- Fix web_search tool registration
- Create enhanced_search tool combining web search + RV context
- Add RAPIDAPI_KEY for price comparison

**Day 4: Testing (2 hours)**
- Integration testing with real scenarios
- Tool registration and PAM conversation testing

### Phase 1B: Community & Attribution (Week 2 - 12 hours)

**Day 1-2: Community Layer (8 hours)**
- RV insights system for community wisdom
- Safe claim generation ("Popular with RVers")

**Day 3: Attribution (4 hours)**
- Search helpfulness tracking
- Basic analytics dashboard preparation

### Phase 1C: Transparency & Trust (Week 2 - 4 hours)

**Day 1: Disclosure System (4 hours)**
- Affiliate revenue transparency
- Source diversity in recommendations

**Total MVP Effort: 32 hours over 2 weeks**

### Phase 2: Decision Support (Month 2 - Post-MVP)
**Only proceed if Phase 1 proves valuable**

- Simple New vs Used guidance
- Price tracking for timing recommendations
- Budget integration with existing PAM financial tools

---

## Risk Analysis & Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| API Dependencies | High | DuckDuckGo free fallback, RapidAPI as premium option |
| Search Quality | High | Manual verification of RV context initially, user feedback loops |
| Performance | Medium | Cache common searches, limit real-time API calls |
| Tool Integration | Medium | Comprehensive testing with both AI providers (Claude/OpenAI) |

### Product Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Expertise Dilution | High | Always apply RV lens - never become generic price tool |
| User Expectations | Medium | Clear positioning as "Financial Co-Pilot" not "Find Everything" |
| Trust Building | High | Start with categories where RV expertise clearly adds value |
| Affiliate Perception | Medium | Transparency policy, include non-affiliate options |

### Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Market Reception | High | MVP validation before full investment |
| Competition | Medium | Focus on unique RV expertise differentiator |
| Revenue Impact | Medium | Gradual transition, existing affiliate revenue maintained |

---

## Competitive Analysis

### Current Solutions

**Generic AI Assistants (ChatGPT, Claude):**
- ✅ Universal knowledge, good conversational AI
- ❌ No mobile living expertise, generic advice
- ❌ No purchase decision framework

**Price Comparison Tools (Google Shopping, PriceGrabber):**
- ✅ Good price discovery, wide product coverage
- ❌ No context intelligence, no RV considerations
- ❌ Poor conversational interface

**RV-Specific Resources (RV Forums, FMCA):**
- ✅ Deep community knowledge, real experiences
- ❌ Hard to search, information scattered
- ❌ No real-time price comparison

### PAM's Unique Value Proposition

**Only AI that combines:**
1. Universal search capability (any product, any category)
2. Deep mobile living expertise (power, space, storage, connectivity context)
3. Real community wisdom (what other RVers actually chose)
4. Transparent affiliate relationships
5. Savings attribution tracking

**Defensible Moat:**
- RV expertise requires deep domain knowledge (hard to replicate)
- Community trust built over time
- Integration with broader Wheels & Wins ecosystem

---

## User Experience Design

### Conversation Flow

**1. Intent Recognition**
```
User: "Find me a portable generator"
PAM: [Classifies as ELECTRONICS + HIGH RV Relevance]
```

**2. Context Application**
```
PAM: "I'll help you find a portable generator. For RV use, I'll focus on power output,
noise levels for campground compliance, fuel efficiency, and easy storage options."
```

**3. Search + Context Overlay**
```
PAM: "Found several options:

🔌 **Power Context**: Look for 2000W+ for AC units, 1000W for basic needs
🔇 **Noise Context**: Under 60dB for most campground quiet hours
⛽ **Fuel Context**: Inverter generators are more fuel-efficient for extended use

**Options Found**:
- Honda EU2200i: $1,100-1,200 (quietest, most reliable)
- Champion 2000W: $500-600 (budget option, louder)
- Westinghouse iGen2200: $600-700 (good middle ground)

**RV Community Insight**: Honda EU2200i most popular with full-timers for reliability
"
```

**4. Savings Attribution**
```
PAM: "Based on your research, I helped you compare 15 options. Would you like me to
track this as a potential savings opportunity?"
```

### Transparency Design

**Affiliate Disclosure Template:**
```
💡 **How PAM Works**: I recommend the best option for RV life based on mobile living needs.
We may earn commission on some links, but recommendations are based on RV expertise regardless of source.

✅ **Non-Affiliate Options Included**: [List of direct manufacturer/non-commission sources]
```

---

## Future Roadmap

### Phase 2: Enhanced Decision Support (Month 2-3)
- New vs Used purchase guidance based on user risk tolerance
- Price tracking with "wait vs buy now" recommendations
- Budget impact analysis for major purchases

### Phase 3: Proactive Intelligence (Month 4-6)
- Seasonal purchase timing recommendations ("Buy winter gear in spring")
- Route-based deal opportunities ("Costco membership worth it for your travel pattern")
- Subscription audit with mobile living considerations

### Phase 4: Lifestyle Optimization (Month 7-12)
- Total cost of ownership calculations for RV equipment
- Lifestyle-based purchase recommendations
- Predictive spending alerts and budget optimization

### Phase 5: Ecosystem Integration (Year 2)
- Integration with trip planning (buy supplies along route)
- Social community features (share purchases with RV friends)
- Advanced savings guarantee program

---

## Appendix

### Technical Implementation Details

**File Structure:**
```
backend/app/services/pam/
├── core/
│   ├── intent_classifier.py      # Spending intent analysis
│   └── disclosure.py             # Affiliate transparency
├── knowledge/
│   └── rv_context.py             # Mobile living expertise
├── community/
│   └── rv_insights.py            # Community wisdom layer
├── tools/financial_copilot/
│   └── enhanced_search.py        # Main search tool
└── tools/tool_registry.py        # Tool registration
```

**Dependencies:**
- Existing: web_search, compare_prices, auto_track_savings
- New: RapidAPI key for price comparison
- Infrastructure: DuckDuckGo (free), Supabase (existing)

### Validation Framework

**A/B Testing Plan:**
- Control: Current PAM (limited to affiliate products)
- Test: Financial Co-Pilot MVP
- Duration: 4 weeks
- Sample Size: 500 active PAM users (250 per group)

**Success Criteria:**
- 25% increase in PAM usage frequency
- 40% increase in average session duration
- 80% user satisfaction with new capabilities
- 60% of test users prefer Co-Pilot vs current PAM

---

**Document Control:**
- **Author**: Claude Sonnet 4 (PAM Implementation Agent)
- **Reviewers**: Product Team, Engineering Team
- **Approval**: Product Manager
- **Last Updated**: January 29, 2026
- **Next Review**: February 15, 2026 (Post-MVP Assessment)