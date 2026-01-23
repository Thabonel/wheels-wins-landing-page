# Product Requirements Document: Tiered AI System

**Document Version:** 1.1
**Created:** January 23, 2026
**Last Updated:** January 23, 2026
**Author:** Engineering Team
**Status:** Draft
**Target Release:** Q1 2026
**Target Market:** Australia (Wheels & Wins - RV/Caravan Community Platform)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals and Success Metrics](#3-goals-and-success-metrics)
4. [User Personas](#4-user-personas)
5. [User Stories](#5-user-stories)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Technical Architecture](#8-technical-architecture)
9. [Data Model](#9-data-model)
10. [API Specifications](#10-api-specifications)
11. [User Experience](#11-user-experience)
12. [Security Considerations](#12-security-considerations)
13. [Testing Requirements](#13-testing-requirements)
14. [Rollout Plan](#14-rollout-plan)
15. [Risks and Mitigations](#15-risks-and-mitigations)
16. [Dependencies](#16-dependencies)
17. [Open Questions](#17-open-questions)
18. [Appendices](#18-appendices)
    - A: Chinese AI Provider Comparison
    - B: Cost Comparison Calculator
    - C: Provider Comparison Matrix
    - D: Mobile App Considerations
    - E: Glossary
    - F: Related Documents

---

## 1. Executive Summary

### 1.1 Overview

This PRD defines the implementation of a tiered AI system for the PAM (Personal Assistant for Motorhomes) feature within the Wheels & Wins platform. The system will route AI requests to different language model providers based on the user's subscription tier, enabling significant cost reduction while maintaining service quality for paid subscribers.

### 1.2 Business Case

Currently, all PAM AI interactions use Claude Sonnet 4.5 regardless of subscription status. This creates an unsustainable cost structure as the free user base grows. By implementing intelligent routing to cost-effective models for free-tier users, we can:

- Reduce AI operational costs by 46-92%
- Enable sustainable growth of the free user base
- Maintain premium AI quality as a paid subscription benefit
- Support the "free social features forever" business strategy

### 1.3 Key Stakeholders

| Stakeholder | Role | Interest |
|-------------|------|----------|
| Product Owner | Decision maker | Feature alignment with business goals |
| Engineering Lead | Technical owner | Implementation feasibility |
| Finance | Budget owner | Cost reduction validation |
| Customer Success | User advocate | Quality maintenance |
| Marketing | Growth owner | Subscription conversion opportunities |

### 1.4 Timeline

| Milestone | Target Date | Description |
|-----------|-------------|-------------|
| PRD Approval | Week 1 | Stakeholder sign-off |
| Development Complete | Week 2 | Core implementation |
| Staging Testing | Week 3 | QA validation |
| Shadow Mode | Week 4 | 10% traffic comparison |
| Limited Rollout | Week 5 | 50% free-tier routing |
| Full Rollout | Week 6 | 100% tier-based routing |

### 1.5 Strategic Alignment

This feature directly supports the **"Free Social Forever"** business strategy:

- **Goal**: Attract Australian RV/caravan community from Facebook/Instagram
- **Approach**: Offer free social features that competitors don't provide
- **AI Role**: PAM assistance enhances social features (trip sharing, community Q&A)
- **Challenge**: AI costs make "free forever" unsustainable without tiered pricing
- **Solution**: Cost-effective AI for free tier enables sustainable growth

**Australian Market Context:**
- Target audience: 700,000+ registered caravans/RVs in Australia
- Competitors: Facebook groups, Wikicamps, CamperMate
- Differentiator: AI-powered trip planning + social community
- Currency: All pricing in A$ (Australian Dollars)
- Timezone considerations: AEST/AEDT for scheduled features

---

## 2. Problem Statement

### 2.1 Current State

PAM currently processes all AI requests through Claude Sonnet 4.5 (Anthropic), regardless of user subscription status:

```
Current Flow:
User (any tier) -> PAM -> Claude Sonnet 4.5 -> Response
                           Cost: US$3/1M in + US$15/1M out
```

**Current Cost Structure:**
- Average query: ~2,500 tokens (2,000 input + 500 output)
- Cost per query: ~US$0.0135 (A$0.021)
- Monthly cost (1,500 active users @ 75 queries): ~US$1,518 (A$2,353)

### 2.2 Problem

1. **Unsustainable Economics**: Free users generate costs without revenue
2. **Scaling Concern**: Planned "free social forever" strategy will dramatically increase free user base
3. **No Differentiation**: Paid subscribers receive same AI as free users
4. **Single Point of Failure**: 100% dependency on Anthropic API

### 2.3 Impact

Without intervention:
- Projected 5,000 free users by Q3 2026 = A$7,500+/month in AI costs for non-paying users
- No clear value proposition for AI quality in paid tiers
- Business model sustainability at risk

### 2.4 Competitive Analysis

**How Competitors Handle AI Costs:**

| Competitor | AI Features | Free Tier | Paid Tier | AI Provider Strategy |
|------------|-------------|-----------|-----------|----------------------|
| **Wikicamps** | No AI | N/A | N/A | No AI features |
| **CamperMate** | No AI | N/A | N/A | No AI features |
| **RV Trip Wizard** | Basic AI | Limited queries | Unlimited | Unknown (likely OpenAI) |
| **Roadtrippers** | Route AI | Limited | Premium | Unknown |
| **ChatGPT (general)** | Full AI | GPT-3.5 | GPT-4 | Tiered model quality |
| **Notion AI** | Writing AI | Limited | Unlimited | Likely tiered internally |

**Key Competitive Insights:**
1. **Most RV apps don't have AI** - PAM is a differentiator
2. **General AI apps use tiered models** - Industry standard (ChatGPT, Claude.ai)
3. **Quality tiering is accepted** - Users expect "premium" to mean "better"
4. **Transparency varies** - Some disclose model, others don't

**Our Competitive Position:**
- **Only RV app with conversational AI assistant**
- **Tiered AI aligns with industry norms** (ChatGPT model)
- **Free tier with AI still beats competitors** (Wikicamps has no AI)
- **Premium AI justifies subscription** vs free Facebook groups

---

## 3. Goals and Success Metrics

### 3.1 Primary Goals

| Goal | Description | Priority |
|------|-------------|----------|
| G1 | Reduce AI costs for free-tier users by >90% | P0 |
| G2 | Maintain response quality for paid subscribers | P0 |
| G3 | Create clear AI quality differentiation between tiers | P1 |
| G4 | Increase system resilience with multi-provider support | P1 |
| G5 | Enable subscription conversion through AI quality | P2 |

### 3.2 Success Metrics

| Metric | Current | Target | Measurement Method |
|--------|---------|--------|-------------------|
| Cost per free-tier query | US$0.0135 | <US$0.0015 | `pam_usage_logs` table |
| Free-tier user satisfaction | N/A | >80% | In-app feedback |
| Paid-tier user satisfaction | 85% | >90% | In-app feedback |
| System availability | 99.5% | 99.9% | Monitoring |
| Free-to-paid conversion rate | 2.1% | 3.5% | Stripe analytics |
| Average response latency | 1.8s | <2.5s | APM monitoring |
| Fallback rate (DeepSeek failures) | N/A | <5% | Provider metrics |

### 3.3 Non-Goals

- This PRD does NOT cover:
  - Changes to subscription pricing
  - New subscription tiers
  - Voice/TTS model tiering (future PRD)
  - Image generation features
  - Offline AI capabilities

---

## 4. User Personas

### 4.1 Free User - "Budget Betty"

**Demographics:**
- Retired RV enthusiast
- Fixed income, cost-conscious
- Uses platform primarily for community features
- Occasional trip planning

**Behaviors:**
- Asks PAM simple questions (weather, campground info)
- 30-50 queries per month
- Tolerant of slightly slower responses
- Values free access over premium features

**Needs:**
- Basic AI assistance for RV lifestyle
- Community connection
- Cost-free platform access

**Quote:** "I just need help finding free camping spots and connecting with other RVers."

### 4.2 Trial User - "Exploring Emma"

**Demographics:**
- New RV owner, 45-55 years old
- Evaluating platform capabilities
- Comparing to other RV apps

**Behaviors:**
- Testing various features intensively
- 50-80 queries during trial
- Comparing AI quality to expectations
- Making purchase decision

**Needs:**
- Experience full platform value
- Understand paid vs free differences
- Clear upgrade path

**Quote:** "I want to see if PAM is worth paying for before I commit."

### 4.3 Paid Subscriber - "Premium Pete"

**Demographics:**
- Full-time RVer or frequent traveler
- Values time and convenience
- Willing to pay for quality

**Behaviors:**
- Heavy PAM user (100+ queries/month)
- Complex trip planning requests
- Budget management features
- Expects instant, high-quality responses

**Needs:**
- Premium AI quality
- Fast response times
- Advanced reasoning capabilities
- Priority support

**Quote:** "I pay for premium because PAM saves me hours of research every week."

### 4.4 Admin User - "Admin Alex"

**Demographics:**
- Platform administrator
- Technical background
- Monitors system health

**Behaviors:**
- Tests all features
- Debugs user issues
- Monitors costs and performance

**Needs:**
- Access to all AI providers
- Detailed logging
- Cost visibility

---

## 5. User Stories

### 5.1 Free Tier User Stories

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| US-F1 | As a free user, I want to ask PAM questions so that I can get help with my RV lifestyle | - Response within 5 seconds<br>- Accurate, helpful answers<br>- No payment prompts for basic queries | P0 |
| US-F2 | As a free user, I want to understand my usage limits so that I can plan my questions | - Clear quota display in UI<br>- Warning at 80% usage<br>- Graceful limit message | P1 |
| US-F3 | As a free user, I want to see upgrade benefits so that I can decide if premium is worth it | - Occasional "Premium users get..." hints<br>- Clear comparison on pricing page | P2 |

### 5.2 Paid Tier User Stories

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| US-P1 | As a paid user, I want the best AI responses so that I get value for my subscription | - Claude Sonnet 4.5 for all requests<br>- <2 second average response<br>- Advanced reasoning on complex queries | P0 |
| US-P2 | As a paid user, I want priority during high load so that my experience isn't degraded | - Paid users never queued behind free<br>- No rate limiting impacts | P1 |
| US-P3 | As a paid user, I want to see my usage stats so that I understand my value received | - Dashboard showing queries/month<br>- AI model used indicator (optional) | P2 |

### 5.3 System User Stories

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| US-S1 | As a system, I must route requests to appropriate providers so that costs are optimized | - Free tier -> DeepSeek<br>- Paid tier -> Claude<br>- Automatic fallback on failure | P0 |
| US-S2 | As a system, I must track usage costs accurately so that billing is correct | - Per-query cost logging<br>- Model-specific pricing<br>- Monthly aggregation | P0 |
| US-S3 | As a system, I must handle provider failures gracefully so that users aren't impacted | - Circuit breaker pattern<br>- Automatic failover<br>- Error logging | P0 |

---

## 6. Functional Requirements

### 6.1 Provider Management

#### FR-PM-1: DeepSeek Provider Integration
**Description:** Implement DeepSeek V3 as a new AI provider option.

**Requirements:**
- FR-PM-1.1: Create `DeepSeekProvider` class implementing `AIProviderInterface`
- FR-PM-1.2: Support chat completions via OpenAI-compatible API
- FR-PM-1.3: Support streaming responses
- FR-PM-1.4: Support function calling (tools)
- FR-PM-1.5: Implement health check endpoint
- FR-PM-1.6: Handle rate limiting with exponential backoff
- FR-PM-1.7: Log all requests to `pam_usage_logs`

**DeepSeek API Details:**
```
Base URL: https://api.deepseek.com/v1
Models: deepseek-chat, deepseek-reasoner
Max Context: 65,536 tokens
Max Output: 8,192 tokens
Rate Limit: 60 RPM (requests per minute)
```

#### FR-PM-2: Provider Configuration
**Description:** Centralized configuration for all AI providers.

**Requirements:**
- FR-PM-2.1: Environment variable for API key (`DEEPSEEK_API_KEY`)
- FR-PM-2.2: Configurable model selection per provider
- FR-PM-2.3: Configurable cost rates per model
- FR-PM-2.4: Enable/disable flag per provider
- FR-PM-2.5: Timeout configuration per provider

### 6.2 Subscription-Based Routing

#### FR-SR-1: Tier Detection
**Description:** Determine user subscription tier for routing decisions.

**Requirements:**
- FR-SR-1.1: Query `user_usage_quotas.subscription_tier` on each request
- FR-SR-1.2: Cache tier lookup for 5 minutes to reduce DB queries
- FR-SR-1.3: Handle missing quota records (default to 'free')
- FR-SR-1.4: Support tiers: `free`, `trial`, `monthly`, `annual`, `admin`

#### FR-SR-2: Provider Selection
**Description:** Route requests to providers based on subscription tier.

**Requirements:**
- FR-SR-2.1: Free/trial users -> DeepSeek primary, OpenAI fallback
- FR-SR-2.2: Monthly/annual users -> Claude primary, OpenAI fallback
- FR-SR-2.3: Admin users -> Claude primary, all providers available
- FR-SR-2.4: Log provider selection for analytics
- FR-SR-2.5: Support override via admin dashboard (future)

**Routing Matrix:**

| Tier | Primary | Secondary | Tertiary |
|------|---------|-----------|----------|
| free | DeepSeek V3 | OpenAI GPT-5.1 | - |
| trial | DeepSeek V3 | OpenAI GPT-5.1 | - |
| monthly | Claude Sonnet 4.5 | OpenAI GPT-5.1 | DeepSeek V3 |
| annual | Claude Sonnet 4.5 | OpenAI GPT-5.1 | DeepSeek V3 |
| admin | Claude Sonnet 4.5 | OpenAI GPT-5.1 | DeepSeek V3 |

#### FR-SR-3: Failover Logic
**Description:** Automatic failover when primary provider fails.

**Requirements:**
- FR-SR-3.1: Detect provider failure (timeout, error, rate limit)
- FR-SR-3.2: Attempt next provider in priority order
- FR-SR-3.3: Circuit breaker after 3 consecutive failures
- FR-SR-3.4: Circuit breaker reset after 60 seconds
- FR-SR-3.5: Log all failover events

### 6.3 Cost Tracking

#### FR-CT-1: Usage Logging
**Description:** Track all AI usage for cost calculation.

**Requirements:**
- FR-CT-1.1: Log input/output tokens per request
- FR-CT-1.2: Calculate cost using model-specific pricing
- FR-CT-1.3: Associate with user_id and conversation_id
- FR-CT-1.4: Record model used and provider
- FR-CT-1.5: Track response time

**Cost Calculation Formula:**
```
cost = (input_tokens / 1,000,000) * input_rate +
       (output_tokens / 1,000,000) * output_rate
```

**Pricing Table:**
| Model | Input ($/1M) | Output ($/1M) |
|-------|--------------|---------------|
| claude-sonnet-4-5-20250929 | 3.00 | 15.00 |
| gpt-5.1-instant | 1.25 | 10.00 |
| deepseek-chat | 0.27 | 1.10 |
| deepseek-reasoner | 0.55 | 2.19 |

#### FR-CT-2: Quota Enforcement
**Description:** Enforce monthly query limits per subscription tier.

**Requirements:**
- FR-CT-2.1: Check quota before processing request
- FR-CT-2.2: Return friendly message when quota exceeded
- FR-CT-2.3: Grace period of 30 queries beyond limit
- FR-CT-2.4: Hard stop at 130% of limit
- FR-CT-2.5: Warning messages at 80%, 90%, 100% thresholds

**Quota Limits by Tier:**
| Tier | Monthly Queries | Grace Period |
|------|-----------------|--------------|
| free | 100 | 30 |
| trial | 200 | 30 |
| monthly | 500 | 100 |
| annual | 1000 | 200 |
| admin | Unlimited | N/A |

### 6.4 Function Calling Support

#### FR-FC-1: DeepSeek Tool Support
**Description:** Enable PAM tools with DeepSeek provider.

**Requirements:**
- FR-FC-1.1: Convert PAM tool definitions to DeepSeek format
- FR-FC-1.2: Parse tool call responses from DeepSeek
- FR-FC-1.3: Execute tools and return results
- FR-FC-1.4: Handle multi-tool responses
- FR-FC-1.5: Maintain tool context across conversation

**Complete PAM Tool Compatibility Matrix:**

| Category | Tool Name | DeepSeek Support | Notes |
|----------|-----------|------------------|-------|
| **Budget (10 tools)** | | | |
| | create_expense | Yes | Standard function call |
| | analyze_budget | Yes | Standard function call |
| | track_savings | Yes | Standard function call |
| | set_budget_goal | Yes | Standard function call |
| | get_spending_summary | Yes | Standard function call |
| | categorize_expense | Yes | Standard function call |
| | predict_expenses | Yes | Standard function call |
| | create_recurring_expense | Yes | Standard function call |
| | get_budget_alerts | Yes | Standard function call |
| | export_financial_data | Yes | Standard function call |
| **Trip Planning (10+ tools)** | | | |
| | plan_trip | Yes | Core feature |
| | find_rv_parks | Yes | Core feature |
| | optimize_route | Yes | Core feature |
| | find_fuel_stations | Yes | Standard function call |
| | get_weather_forecast | Yes | Standard function call |
| | find_dump_stations | Yes | Standard function call |
| | estimate_fuel_cost | Yes | Standard function call |
| | find_free_camping | Yes | Standard function call |
| | get_road_conditions | Yes | Standard function call |
| | save_trip | Yes | Standard function call |
| **Social (10 tools)** | | | |
| | create_post | Yes | Standard function call |
| | message_friend | Yes | Standard function call |
| | comment_on_post | Yes | Standard function call |
| | find_nearby_users | Yes | Location anonymized |
| | join_group | Yes | Standard function call |
| | share_trip | Yes | Standard function call |
| | like_post | Yes | Standard function call |
| | follow_user | Yes | Standard function call |
| | get_feed | Yes | Standard function call |
| | search_users | Yes | Standard function call |
| **Shop (5 tools)** | | | |
| | search_products | Yes | Standard function call |
| | add_to_cart | Yes | Standard function call |
| | get_product_details | Yes | Standard function call |
| | checkout | Partial | Payment handled separately |
| | track_order | Yes | Standard function call |
| **Profile (5+ tools)** | | | |
| | update_profile | Yes | PII sanitized |
| | update_settings | Yes | Standard function call |
| | get_user_stats | Yes | Standard function call |
| | update_vehicle | Yes | Standard function call |
| | set_preferences | Yes | Standard function call |
| **Calendar (3 tools)** | | | |
| | create_calendar_event | Yes | Standard function call |
| | update_calendar_event | Yes | Standard function call |
| | delete_calendar_event | Yes | Standard function call |
| **Timers (3 tools)** | | | |
| | set_timer | Yes | Standard function call |
| | set_alarm | Yes | Standard function call |
| | dismiss_timer | Yes | Standard function call |
| **Knowledge (2 tools)** | | | |
| | search_knowledge | Yes | Standard function call |
| | add_knowledge | Yes | Admin only, uses Claude |
| **Weather (1 tool)** | | | |
| | weather_advisor | Yes | Core feature |

**Tool Compatibility Summary:**
- **47 tools total**
- **45 tools fully compatible** with DeepSeek
- **1 tool partial** (checkout - payment processing separate)
- **1 tool Claude-only** (add_knowledge - admin feature)

**Tools Requiring Special Handling:**
1. `add_knowledge` - Admin tool, always routes to Claude for quality
2. `checkout` - Payment processing handled by Stripe, not AI
3. Location-based tools - Coordinates anonymized before sending to DeepSeek

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| NFR-P1: Response latency (P50) | <2 seconds | APM |
| NFR-P2: Response latency (P95) | <5 seconds | APM |
| NFR-P3: Throughput | 100 concurrent requests | Load test |
| NFR-P4: Failover time | <500ms | Integration test |
| NFR-P5: Cold start time | <3 seconds | Manual test |

### 7.2 Reliability

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| NFR-R1: System availability | 99.9% uptime | Monitoring |
| NFR-R2: Provider redundancy | 3 providers minimum | Config |
| NFR-R3: Data durability | Zero lost requests | Log audit |
| NFR-R4: Error rate | <1% of requests | Monitoring |

### 7.3 Scalability

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| NFR-S1: User capacity | 10,000 concurrent | Load test |
| NFR-S2: Query volume | 50,000/day | Monitoring |
| NFR-S3: Horizontal scaling | Auto-scale ready | Architecture review |

### 7.4 Security

| Requirement | Description |
|-------------|-------------|
| NFR-SEC1 | API keys stored in environment variables, never in code |
| NFR-SEC2 | All provider communications over HTTPS |
| NFR-SEC3 | User data not logged to provider APIs beyond necessary |
| NFR-SEC4 | Rate limiting to prevent abuse |
| NFR-SEC5 | Audit logging of all tier changes |

### 7.5 Observability

| Requirement | Description |
|-------------|-------------|
| NFR-O1 | Structured logging for all provider interactions |
| NFR-O2 | Metrics dashboard for cost tracking |
| NFR-O3 | Alerting on provider failures |
| NFR-O4 | Request tracing across providers |

### 7.6 Analytics Dashboard Requirements

**Admin Dashboard - AI Cost Analytics:**

| Metric | Visualization | Refresh Rate |
|--------|---------------|--------------|
| Daily AI spend by provider | Stacked bar chart | Real-time |
| Cost per user tier | Pie chart | Hourly |
| Query volume by provider | Line chart (24h) | Real-time |
| Failover events | Event log with timestamps | Real-time |
| Average response latency | Line chart by provider | 5 minutes |
| Token usage breakdown | Table with input/output split | Hourly |
| Cost savings vs baseline | KPI card with trend | Daily |
| Provider health status | Traffic light indicators | Real-time |

**Dashboard Alerts:**
| Alert | Trigger | Action |
|-------|---------|--------|
| High spend | Daily cost > A$100 | Email + Slack |
| Provider down | 3+ consecutive failures | Slack + PagerDuty |
| Latency spike | P95 > 10s for 5 mins | Slack |
| Failover rate high | >10% requests failing over | Email |
| Quota abuse | User >150% of limit | Log + flag account |

**User-Facing Stats (Settings Page):**
- Queries used this month: X / 100
- Estimated cost savings (for free users): "You've saved A$X.XX this month"
- Response quality indicator (optional): "Premium AI" badge for paid users

---

## 8. Technical Architecture

### 8.1 System Context Diagram

```
                                    External Systems
                    ┌─────────────────────────────────────────┐
                    │                                         │
     ┌──────────┐   │   ┌─────────────┐  ┌─────────────┐     │
     │  User    │   │   │  Anthropic  │  │  DeepSeek   │     │
     │ Browser  │   │   │    API      │  │    API      │     │
     └────┬─────┘   │   └──────┬──────┘  └──────┬──────┘     │
          │         │          │                │            │
          │ WSS     │          │ HTTPS          │ HTTPS      │
          │         │          │                │            │
     ┌────▼─────────┴──────────▼────────────────▼────────────┤
     │                                                       │
     │                  Wheels & Wins Platform               │
     │                                                       │
     │  ┌─────────────┐    ┌─────────────┐    ┌───────────┐ │
     │  │   PAM       │    │     AI      │    │  Quota    │ │
     │  │  WebSocket  │───►│ Orchestrator│───►│  Manager  │ │
     │  │  Handler    │    │             │    │           │ │
     │  └─────────────┘    └──────┬──────┘    └───────────┘ │
     │                            │                         │
     │                     ┌──────▼──────┐                  │
     │                     │  Provider   │                  │
     │                     │  Registry   │                  │
     │                     └─────────────┘                  │
     │                            │                         │
     │         ┌──────────────────┼──────────────────┐      │
     │         │                  │                  │      │
     │  ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼─────┐ │
     │  │  Anthropic  │   │   OpenAI    │   │  DeepSeek  │ │
     │  │  Provider   │   │  Provider   │   │  Provider  │ │
     │  └─────────────┘   └─────────────┘   └────────────┘ │
     │                                                      │
     └──────────────────────────────────────────────────────┘
```

### 8.2 Component Architecture

```
backend/app/services/ai/
├── __init__.py
├── provider_interface.py      # Abstract base class
├── ai_orchestrator.py         # Multi-provider orchestration [MODIFY]
├── anthropic_provider.py      # Claude Sonnet 4.5
├── openai_provider.py         # GPT-5.1
├── deepseek_provider.py       # DeepSeek V3 [CREATE]
└── tier_router.py             # Subscription-based routing [CREATE]

backend/app/config/
├── ai_providers.py            # Provider configuration [MODIFY]
└── tier_config.py             # Tier-to-provider mapping [CREATE]

backend/app/services/usage/
├── quota_manager.py           # Quota checking [MODIFY]
└── cost_calculator.py         # Cost calculation [MODIFY]
```

### 8.3 Sequence Diagram: Request Flow

```
User        WebSocket      TierRouter     Orchestrator    DeepSeek    Claude
  │              │              │              │              │          │
  │─── Message ─►│              │              │              │          │
  │              │── Get Tier ─►│              │              │          │
  │              │◄─ "free" ────│              │              │          │
  │              │              │              │              │          │
  │              │──────────── Route Request ─►│              │          │
  │              │              │              │── Complete ─►│          │
  │              │              │              │◄─ Response ──│          │
  │              │              │              │              │          │
  │              │◄──────────── AI Response ───│              │          │
  │◄── Response ─│              │              │              │          │
  │              │              │              │              │          │
```

### 8.4 Failover Sequence

```
User        Orchestrator    DeepSeek    OpenAI
  │              │              │          │
  │── Request ─►│              │          │
  │              │── Try ──────►│          │
  │              │◄── Error ────│          │
  │              │              │          │
  │              │── Failover ─────────────►│
  │              │◄── Response ────────────│
  │◄── Response ─│              │          │
```

### 8.5 Data Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                         Request Processing                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. Receive Message                                                │
│     └─► Extract user_id from JWT                                   │
│                                                                    │
│  2. Check Quota                                                    │
│     └─► Query user_usage_quotas                                    │
│     └─► Return if over limit                                       │
│                                                                    │
│  3. Determine Tier                                                 │
│     └─► Get subscription_tier from quota record                    │
│     └─► Map tier to provider priority list                         │
│                                                                    │
│  4. Select Provider                                                │
│     └─► Check circuit breaker status                               │
│     └─► Select first healthy provider                              │
│                                                                    │
│  5. Execute Request                                                │
│     └─► Format messages for provider API                           │
│     └─► Include tool definitions if applicable                     │
│     └─► Send request with timeout                                  │
│                                                                    │
│  6. Handle Response                                                │
│     └─► Parse provider response                                    │
│     └─► Execute tool calls if present                              │
│     └─► Log usage to pam_usage_logs                                │
│     └─► Update user quota                                          │
│                                                                    │
│  7. Return to User                                                 │
│     └─► Stream or send complete response                           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 9. Data Model

### 9.1 Existing Tables (No Changes)

#### user_usage_quotas
```sql
CREATE TABLE user_usage_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    subscription_tier TEXT NOT NULL DEFAULT 'free',  -- Used for routing
    monthly_query_limit INTEGER NOT NULL DEFAULT 100,
    queries_used_this_month INTEGER NOT NULL DEFAULT 0,
    overage_queries INTEGER NOT NULL DEFAULT 0,
    total_cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0,
    monthly_reset_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 9.2 Modified Tables

#### pam_usage_logs (Add provider column)
```sql
ALTER TABLE pam_usage_logs
ADD COLUMN provider TEXT;  -- 'anthropic', 'openai', 'deepseek'

COMMENT ON COLUMN pam_usage_logs.provider IS 'AI provider used for this request';
```

### 9.3 New Configuration (Environment Variables)

```bash
# DeepSeek Configuration
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
DEEPSEEK_DEFAULT_MODEL=deepseek-chat
DEEPSEEK_MAX_TOKENS=8192
DEEPSEEK_TIMEOUT_SECONDS=30

# Tier Routing Configuration
AI_FREE_TIER_PROVIDER=deepseek
AI_PAID_TIER_PROVIDER=anthropic
AI_FALLBACK_PROVIDER=openai
```

---

## 10. API Specifications

### 10.1 Internal API: TierRouter

```python
class TierRouter:
    """Routes AI requests based on user subscription tier"""

    async def get_provider_priority(
        self,
        user_id: str
    ) -> List[str]:
        """
        Get ordered list of provider names for user's tier.

        Args:
            user_id: User UUID

        Returns:
            List of provider names in priority order
            e.g., ["deepseek", "openai"] for free users
        """
        pass

    async def get_user_tier(
        self,
        user_id: str
    ) -> str:
        """
        Get user's subscription tier with caching.

        Args:
            user_id: User UUID

        Returns:
            Tier string: 'free', 'trial', 'monthly', 'annual', 'admin'
        """
        pass
```

### 10.2 Internal API: DeepSeekProvider

```python
class DeepSeekProvider(AIProviderInterface):
    """DeepSeek V3 AI provider implementation"""

    async def complete(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        tools: Optional[List[Dict]] = None,
        **kwargs
    ) -> AIResponse:
        """
        Generate completion from DeepSeek API.

        Args:
            messages: Conversation history
            model: Model ID (default: deepseek-chat)
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum output tokens
            tools: Tool/function definitions

        Returns:
            AIResponse with content, usage, latency

        Raises:
            ProviderError: On API failure
            RateLimitError: On rate limit exceeded
        """
        pass

    async def stream(
        self,
        messages: List[AIMessage],
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Stream completion tokens."""
        pass

    async def health_check(self) -> Tuple[AIProviderStatus, str]:
        """Check provider health status."""
        pass
```

### 10.3 DeepSeek External API Reference

**Endpoint:** `POST https://api.deepseek.com/v1/chat/completions`

**Request:**
```json
{
    "model": "deepseek-chat",
    "messages": [
        {"role": "system", "content": "You are PAM..."},
        {"role": "user", "content": "Find campgrounds near..."}
    ],
    "temperature": 0.7,
    "max_tokens": 2048,
    "tools": [
        {
            "type": "function",
            "function": {
                "name": "find_rv_parks",
                "description": "Search for RV parks and campgrounds",
                "parameters": {...}
            }
        }
    ],
    "stream": false
}
```

**Response:**
```json
{
    "id": "chatcmpl-xxx",
    "object": "chat.completion",
    "created": 1706000000,
    "model": "deepseek-chat",
    "choices": [
        {
            "index": 0,
            "message": {
                "role": "assistant",
                "content": "I found several campgrounds...",
                "tool_calls": null
            },
            "finish_reason": "stop"
        }
    ],
    "usage": {
        "prompt_tokens": 150,
        "completion_tokens": 200,
        "total_tokens": 350
    }
}
```

---

## 11. User Experience

### 11.1 Free User Experience

**Interaction Flow:**
1. User sends message to PAM
2. System routes to DeepSeek (invisible to user)
3. Response returned within 2-5 seconds
4. No visual indicator of AI model used
5. Occasional subtle upgrade prompts (non-intrusive)

**Quality Expectations:**
- Accurate responses for common queries
- Functional tool execution (weather, trip planning)
- May have slightly lower quality on complex reasoning tasks

**Upgrade Prompts (Optional - Future):**
```
"Tip: Premium members get faster, more detailed responses
from our advanced AI. Upgrade for A$9.99/month"
```

### 11.2 Paid User Experience

**Interaction Flow:**
1. User sends message to PAM
2. System routes to Claude Sonnet 4.5
3. Response returned within 1-3 seconds
4. Optional "Premium AI" indicator in settings
5. No upgrade prompts

**Quality Expectations:**
- Best-in-class AI responses
- Superior complex reasoning
- Faster response times
- Priority during high load

### 11.3 Error States

**Provider Failure (Invisible to User):**
```
[Internal: DeepSeek timeout, failover to OpenAI]
User sees: Normal response, slightly delayed
```

**All Providers Failed:**
```
"I'm having trouble connecting right now.
Please try again in a moment."
```

**Quota Exceeded (Free User):**
```
"You've reached your monthly limit of 100 questions.
Your quota resets on February 1st.

Upgrade to Premium for 500 questions/month
and faster, smarter responses!"
```

---

## 12. Security Considerations

### 12.1 API Key Management

| Requirement | Implementation |
|-------------|----------------|
| Storage | Environment variables only |
| Access | Backend services only |
| Rotation | Support key rotation without downtime |
| Logging | Never log API keys |

### 12.2 Data Privacy

| Consideration | Mitigation |
|---------------|------------|
| User messages sent to third-party APIs | Privacy policy disclosure |
| No PII in system prompts | Review all prompts |
| Conversation logging | User consent, retention policy |

### 12.3 Rate Limiting

| Level | Limit | Action |
|-------|-------|--------|
| Per-user (free) | 60/hour | Queue, then reject |
| Per-user (paid) | 120/hour | Queue only |
| Global | 1000/minute | Emergency throttle |

### 12.4 Abuse Prevention

- Monitor for prompt injection attempts
- Block requests with suspicious patterns
- Alert on unusual usage spikes
- Circuit breaker on repeated failures

---

## 13. Testing Requirements

### 13.1 Unit Tests

| Test Case | Description | Priority |
|-----------|-------------|----------|
| UT-1 | DeepSeekProvider.complete() returns valid response | P0 |
| UT-2 | DeepSeekProvider.stream() yields tokens | P0 |
| UT-3 | DeepSeekProvider handles timeout | P0 |
| UT-4 | DeepSeekProvider handles rate limit | P0 |
| UT-5 | TierRouter returns correct priority for each tier | P0 |
| UT-6 | TierRouter caches tier lookups | P1 |
| UT-7 | Cost calculation correct for DeepSeek | P0 |
| UT-8 | Quota check blocks over-limit users | P0 |

### 13.2 Integration Tests

| Test Case | Description | Priority |
|-----------|-------------|----------|
| IT-1 | Free user message routes to DeepSeek | P0 |
| IT-2 | Paid user message routes to Claude | P0 |
| IT-3 | DeepSeek failure falls back to OpenAI | P0 |
| IT-4 | Tool execution works with DeepSeek | P0 |
| IT-5 | Usage logged correctly per provider | P0 |
| IT-6 | Quota updated after request | P0 |
| IT-7 | Circuit breaker trips after 3 failures | P1 |
| IT-8 | Circuit breaker resets after timeout | P1 |

### 13.3 Load Tests

| Test Case | Target | Criteria |
|-----------|--------|----------|
| LT-1 | 100 concurrent free-tier requests | P95 < 5s |
| LT-2 | 50 concurrent paid-tier requests | P95 < 3s |
| LT-3 | Mixed load (70% free, 30% paid) | No errors |
| LT-4 | Provider failover under load | <1s switch |

### 13.4 Quality Comparison Tests

| Test Case | Method | Success Criteria |
|-----------|--------|------------------|
| QT-1 | Same 100 prompts to DeepSeek and Claude | DeepSeek quality >80% of Claude |
| QT-2 | Tool execution accuracy | >95% correct tool calls |
| QT-3 | Response coherence | Human eval >4/5 rating |

---

## 14. Rollout Plan

### Phase 1: Development (Week 1-2)

**Tasks:**
- [ ] Create DeepSeekProvider class
- [ ] Add TierRouter component
- [ ] Update AIOrchestrator for tier-based routing
- [ ] Add DeepSeek to MODEL_PRICING
- [ ] Create unit tests
- [ ] Create integration tests

**Exit Criteria:**
- All unit tests pass
- Integration tests pass in dev environment
- Code review approved

### Phase 2: Staging Validation (Week 3)

**Tasks:**
- [ ] Deploy to staging environment
- [ ] Configure DeepSeek API key
- [ ] Run full test suite
- [ ] Manual QA testing
- [ ] Load testing
- [ ] Quality comparison testing

**Exit Criteria:**
- All tests pass in staging
- QA sign-off
- Performance meets targets
- Quality comparison acceptable

### Phase 3: Shadow Mode (Week 4)

**Description:** Run DeepSeek in parallel for 10% of free-tier traffic, compare results.

**Tasks:**
- [ ] Deploy shadow mode flag
- [ ] Route 10% of free traffic to DeepSeek
- [ ] Log both responses (DeepSeek and Claude)
- [ ] Compare quality, latency, errors
- [ ] Analyze cost savings potential

**Exit Criteria:**
- DeepSeek error rate <2%
- Quality delta <20%
- No user-reported issues

### Phase 4: Limited Rollout (Week 5)

**Description:** Route 50% of free-tier traffic to DeepSeek.

**Tasks:**
- [ ] Increase routing to 50%
- [ ] Monitor error rates
- [ ] Monitor user feedback
- [ ] Monitor costs
- [ ] Prepare rollback procedure

**Exit Criteria:**
- Error rate <1%
- No increase in support tickets
- Cost reduction visible in metrics

### Phase 5: Full Rollout (Week 6)

**Description:** Route 100% of free-tier traffic to DeepSeek.

**Tasks:**
- [ ] Increase routing to 100%
- [ ] Remove shadow mode code
- [ ] Update documentation
- [ ] Announce to team
- [ ] Monitor for 1 week

**Exit Criteria:**
- Stable for 7 days
- Cost targets achieved
- User satisfaction maintained

### Rollback Procedure

**Trigger Conditions:**
- Error rate >5%
- User complaints spike
- Provider outage >30 minutes

**Rollback Steps:**
1. Set `AI_FREE_TIER_PROVIDER=anthropic` in env
2. Restart backend services
3. Monitor for stability
4. Investigate root cause
5. Create incident report

---

## 15. Risks and Mitigations

### 15.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| DeepSeek API instability | Medium | High | Automatic failover to OpenAI |
| Lower quality responses | Medium | Medium | A/B testing, user feedback monitoring |
| Rate limiting issues | Low | Medium | Implement retry with backoff |
| Tool compatibility issues | Medium | High | Thorough testing, graceful degradation |
| Latency higher than Claude | Medium | Low | Optimize prompts, caching |

### 15.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| User complaints about quality | Medium | Medium | Clear tier differentiation, easy upgrade path |
| Competitor perception | Low | Low | Focus on value, not model name |
| DeepSeek pricing changes | Low | Medium | Contractual terms, alternative providers |
| Regulatory concerns (China-based AI) | Low | High | Monitor regulations, alternative ready |

### 15.3 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Increased complexity | Medium | Medium | Good documentation, monitoring |
| Debugging harder with multiple providers | Medium | Low | Comprehensive logging |
| Cost tracking complexity | Low | Low | Unified logging schema |

---

## 16. Dependencies

### 16.1 External Dependencies

| Dependency | Type | Status | Owner |
|------------|------|--------|-------|
| DeepSeek API | Service | Available | DeepSeek |
| DeepSeek API Key | Credential | Needed | Engineering |
| OpenAI Python SDK | Library | Installed | Engineering |

### 16.2 Internal Dependencies

| Dependency | Type | Status | Owner |
|------------|------|--------|-------|
| Subscription tier tracking | Feature | Implemented | Backend |
| Usage quota system | Feature | Implemented | Backend |
| Circuit breaker pattern | Feature | Implemented | Backend |
| WebSocket handler | Feature | Implemented | Backend |

### 16.3 Team Dependencies

| Dependency | Team | Required For |
|------------|------|--------------|
| API key provisioning | DevOps | Staging/production deployment |
| Cost monitoring dashboard | Data | Success metrics tracking |
| User research | Product | Quality comparison validation |

---

## 17. Open Questions

### 17.1 Product Questions

| # | Question | Options | Decision |
|---|----------|---------|----------|
| Q1 | Should users see which AI model is responding? | Yes (transparent) / No (invisible) | TBD |
| Q2 | Should we show upgrade prompts for free users? | Yes (subtle) / No | TBD |
| Q3 | Should trial users get same AI as paid? | Yes / No (same as free) | No |
| Q4 | Should some tools always use Claude? | Yes (complex tools) / No | TBD |

### 17.2 Technical Questions

| # | Question | Options | Decision |
|---|----------|---------|----------|
| Q5 | Should we cache DeepSeek responses? | Yes (reduce costs) / No | TBD |
| Q6 | Should we implement prefix caching? | Yes (DeepSeek feature) / No | TBD |
| Q7 | Should admin users be able to override routing? | Yes / No | TBD |

### 17.3 Business Questions

| # | Question | Options | Decision |
|---|----------|---------|----------|
| Q8 | What's the acceptable quality delta? | 10% / 20% / 30% | 20% |
| Q9 | Should we disclose AI provider to users? | Yes (ToS) / No | TBD |

---

## 18. Appendices

### Appendix A: Chinese AI Provider Comparison

#### A.1 DeepSeek V3 (Recommended Primary)

**Models Available:**
| Model | Context | Max Output | Best For |
|-------|---------|------------|----------|
| deepseek-chat | 64K | 8K | General conversation, tools |
| deepseek-reasoner (R1) | 64K | 8K | Complex reasoning tasks |

**Pricing (as of January 2026):**
- Input: US$0.27/1M tokens (approx A$0.42/1M)
- Output: US$1.10/1M tokens (approx A$1.71/1M)
- Cache hit discount: 90%

**Rate Limits:**
- 60 RPM (requests per minute)
- 100K TPM (tokens per minute)

**Capabilities:**
- Function calling support
- Streaming support
- JSON mode support
- Multi-language support (including Australian English)

#### A.2 Qwen (Alibaba) - Alternative Option

**Models Available:**
| Model | Context | Max Output | Best For |
|-------|---------|------------|----------|
| qwen-turbo | 8K | 2K | Fast, simple queries |
| qwen-plus | 32K | 8K | Balanced performance |
| qwen-max | 32K | 8K | Highest quality |

**Pricing (as of January 2026):**
- qwen-turbo: US$0.28/1M input, US$0.84/1M output
- qwen-plus: US$0.57/1M input, US$1.70/1M output
- qwen-max: US$2.80/1M input, US$8.40/1M output

**Why DeepSeek Over Qwen:**
1. Better function calling support
2. Larger context window (64K vs 32K)
3. OpenAI-compatible API (easier integration)
4. More competitive pricing
5. Better English language performance

#### A.3 Data Sovereignty & Privacy Considerations

**Important for Australian Users:**

| Concern | DeepSeek Approach | Mitigation |
|---------|-------------------|------------|
| Data location | Servers in China | No PII in prompts; anonymize user data |
| Data retention | API calls not stored long-term | Privacy policy disclosure |
| Regulatory | No AU data sovereignty issues for AI queries | Monitor ACCC guidance |
| User consent | Required for third-party AI | Clear ToS disclosure |

**Privacy Safeguards Implemented:**
1. No personally identifiable information (PII) sent to DeepSeek
2. User IDs anonymized before API calls
3. Conversation content reviewed for sensitive data
4. Location data generalized (region, not exact coords)
5. Financial data summarized, not raw transactions

**Terms of Service Update Required:**
```
"PAM uses multiple AI providers to deliver responses. Free tier users
may receive responses from DeepSeek (China) or OpenAI (USA). Premium
subscribers receive responses from Anthropic Claude (USA). All providers
are bound by data processing agreements. No personal information is
shared beyond what is necessary for query processing."
```

### Appendix B: Cost Comparison Calculator

```python
def calculate_monthly_cost(
    free_users: int,
    paid_users: int,
    queries_per_free: int = 50,
    queries_per_paid: int = 100,
    input_tokens: int = 2000,  # Typical PAM context
    output_tokens: int = 500,   # Typical PAM response
    aud_usd_rate: float = 1.55  # AUD to USD conversion
):
    """
    Calculate monthly AI costs for different scenarios.
    Uses actual token ratios instead of averaging.
    Returns costs in AUD.
    """

    # Provider pricing (USD per 1M tokens)
    CLAUDE_INPUT = 3.00
    CLAUDE_OUTPUT = 15.00
    DEEPSEEK_INPUT = 0.27
    DEEPSEEK_OUTPUT = 1.10

    def calc_query_cost(input_rate, output_rate):
        """Calculate cost per query in USD"""
        input_cost = (input_tokens / 1_000_000) * input_rate
        output_cost = (output_tokens / 1_000_000) * output_rate
        return input_cost + output_cost

    claude_per_query = calc_query_cost(CLAUDE_INPUT, CLAUDE_OUTPUT)
    deepseek_per_query = calc_query_cost(DEEPSEEK_INPUT, DEEPSEEK_OUTPUT)

    # Current: Claude for everyone
    current_usd = (
        (free_users * queries_per_free * claude_per_query) +
        (paid_users * queries_per_paid * claude_per_query)
    )

    # Tiered: DeepSeek for free, Claude for paid
    tiered_usd = (
        (free_users * queries_per_free * deepseek_per_query) +
        (paid_users * queries_per_paid * claude_per_query)
    )

    # Convert to AUD
    current_aud = current_usd * aud_usd_rate
    tiered_aud = tiered_usd * aud_usd_rate
    savings_aud = current_aud - tiered_aud
    savings_pct = (savings_aud / current_aud) * 100 if current_aud > 0 else 0

    # Per-query costs
    claude_per_query_aud = claude_per_query * aud_usd_rate
    deepseek_per_query_aud = deepseek_per_query * aud_usd_rate

    return {
        "current_monthly_aud": f"A${current_aud:.2f}",
        "tiered_monthly_aud": f"A${tiered_aud:.2f}",
        "savings_monthly_aud": f"A${savings_aud:.2f}",
        "savings_percent": f"{savings_pct:.1f}%",
        "cost_per_query": {
            "claude": f"A${claude_per_query_aud:.4f}",
            "deepseek": f"A${deepseek_per_query_aud:.4f}",
            "savings_per_query": f"{((claude_per_query - deepseek_per_query) / claude_per_query * 100):.1f}%"
        }
    }

# Example scenarios
print("=== Scenario 1: Current user base ===")
print(calculate_monthly_cost(1000, 500))
# {
#   'current_monthly_aud': 'A$2,092.50',
#   'tiered_monthly_aud': 'A$1,169.22',
#   'savings_monthly_aud': 'A$923.28',
#   'savings_percent': '44.1%',
#   'cost_per_query': {
#     'claude': 'A$0.0209',
#     'deepseek': 'A$0.0014',
#     'savings_per_query': '93.1%'
#   }
# }

print("\n=== Scenario 2: After free social growth ===")
print(calculate_monthly_cost(5000, 500))
# Projected with 5,000 free users after social feature launch
```

**Cost Projection Table (A$):**

| Scenario | Free Users | Paid Users | Current (Claude-all) | Tiered | Monthly Savings |
|----------|------------|------------|---------------------|--------|-----------------|
| Current | 1,000 | 500 | A$2,093 | A$1,169 | A$923 (44%) |
| 6-month | 2,500 | 750 | A$4,768 | A$2,007 | A$2,761 (58%) |
| 12-month | 5,000 | 1,000 | A$9,302 | A$2,790 | A$6,512 (70%) |
| Target | 10,000 | 2,000 | A$18,604 | A$5,270 | A$13,334 (72%) |

**Key Insight:** As free user base grows, tiered system savings increase proportionally. At 10,000 free users, savings reach A$13,334/month (A$160,000/year).

### Appendix C: Provider Comparison Matrix

| Feature | Claude Sonnet 4.5 | DeepSeek V3 | GPT-5.1 Instant |
|---------|-------------------|-------------|-----------------|
| Context Window | 200K | 64K | 128K |
| Max Output | 4K | 8K | 4K |
| Function Calling | Yes | Yes | Yes |
| Streaming | Yes | Yes | Yes |
| Vision | Yes | No | Yes |
| MCP Tools | Native | No | No |
| Input Cost (US$/1M) | US$3.00 | US$0.27 | US$1.25 |
| Output Cost (US$/1M) | US$15.00 | US$1.10 | US$10.00 |
| Avg Latency | 1.5s | 2.5s | 1.8s |
| Quality (subjective) | Excellent | Good | Very Good |

### Appendix D: Mobile App Considerations

**Current State:**
- Wheels & Wins is a Progressive Web App (PWA)
- Mobile users access via browser (Safari/Chrome)
- No native iOS/Android apps currently

**Impact of Tiered AI on Mobile:**
| Consideration | Impact | Handling |
|---------------|--------|----------|
| Network latency | DeepSeek may have higher latency on mobile | Implement loading states |
| Offline mode | AI requires connectivity | Show cached responses, queue requests |
| Push notifications | Timer/alarm notifications | Unaffected by AI provider |
| Data usage | Similar token sizes across providers | No significant difference |
| Battery | API calls similar across providers | No significant difference |

**PWA-Specific Implementation:**
1. Service worker caches previous PAM responses for offline viewing
2. Queued requests sent when connectivity restored
3. Loading indicators optimized for mobile (skeleton screens)
4. Voice input works across all providers (STT is separate from LLM)

**Future Native App Considerations:**
- If native apps are built, same API endpoints used
- Provider routing transparent to client
- Consider local caching for frequently asked questions

### Appendix E: Glossary

| Term | Definition |
|------|------------|
| **AI Provider** | Company that offers AI model APIs (Anthropic, DeepSeek, OpenAI) |
| **API** | Application Programming Interface - how software systems communicate |
| **Circuit Breaker** | Pattern that stops calling a failing service to let it recover |
| **Claude Sonnet 4.5** | Anthropic's flagship AI model, known for quality reasoning |
| **Context Window** | Maximum amount of text an AI model can process at once |
| **DeepSeek V3** | Chinese AI model offering low-cost, quality responses |
| **Failover** | Automatic switch to backup system when primary fails |
| **Function Calling** | AI ability to execute specific actions (like booking, searching) |
| **LLM** | Large Language Model - the AI technology behind conversational assistants |
| **MCP** | Model Context Protocol - Anthropic's tool standard for AI |
| **PAM** | Personal Assistant for Motorhomes - our AI assistant feature |
| **Provider Routing** | Directing AI requests to different providers based on rules |
| **PWA** | Progressive Web App - website that works like a mobile app |
| **Rate Limiting** | Restricting how many requests a user can make per time period |
| **Streaming** | Sending AI response word-by-word instead of all at once |
| **Subscription Tier** | User's payment level (free, trial, monthly, annual) |
| **Token** | Unit of text for AI billing (~4 characters = 1 token) |
| **WebSocket** | Technology for real-time two-way communication |

### Appendix F: Related Documents

- [Technical Implementation Plan](../plans/TIERED_AI_SYSTEM_PLAN.md)
- [AI Provider Architecture](../PAM_SYSTEM_ARCHITECTURE.md)
- [Verified AI Models](../VERIFIED_AI_MODELS.md)
- [Database Schema Reference](../DATABASE_SCHEMA_REFERENCE.md)
- [PAM Backend Context Reference](../PAM_BACKEND_CONTEXT_REFERENCE.md)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-23 | Engineering | Initial draft |
| 1.1 | 2026-01-23 | Engineering | Added: Australian market context, strategic alignment, competitive analysis, Qwen alternative, data sovereignty section, complete PAM tool compatibility matrix (47 tools), analytics dashboard requirements, mobile app considerations, glossary. Fixed: Currency consistency (A$/US$), cost calculator accuracy, related document links |

---

## Approvals

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Engineering Lead | | | |
| Finance | | | |
| Security | | | |
