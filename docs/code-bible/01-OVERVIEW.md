# 01 - System Overview

**Purpose:** Understand what Wheels & Wins is, why it exists, and who it serves.

---

## What is Wheels & Wins?

Wheels & Wins is a comprehensive platform designed specifically for RV travelers (full-time RVers, snowbirds, weekend warriors). The platform combines:

1. **PAM (Personal AI Manager)** - A voice-first AI assistant that helps RVers save money
2. **Wheels** - Trip planning with route optimization and campground discovery
3. **Wins** - Financial tracking to manage the RV lifestyle budget
4. **Social** - Community features to connect with fellow travelers
5. **Shop** - Curated RV products and affiliate marketplace

### The Core Value Proposition

> "PAM pays for herself" - The AI assistant tracks savings and proves ROI

Target: Save users more than $10/month (the subscription cost) through:
- Finding cheaper gas stations
- Optimizing routes
- Discovering budget-friendly campgrounds
- Reducing unnecessary expenses

---

## Business Model

| Revenue Stream | Description |
|----------------|-------------|
| Subscription | $10/month for PAM AI features |
| Affiliate Sales | Commission on shop products |
| Premium Features | Advanced trip planning, reports |

---

## User Personas

### 1. Full-Time RVers (Primary)
- **Profile:** Live in their RV year-round
- **Needs:** Budget management, route planning, community
- **Pain Points:** Unpredictable expenses, finding affordable camping
- **Usage:** Daily PAM interactions, extensive trip planning

### 2. Snowbirds (Secondary)
- **Profile:** Seasonal travelers (winter in south, summer in north)
- **Needs:** Long-distance trip planning, expense tracking
- **Pain Points:** Managing two locations, seasonal budget planning
- **Usage:** Seasonal heavy usage, trip-focused

### 3. Weekend Warriors (Tertiary)
- **Profile:** Use RV for weekend trips and vacations
- **Needs:** Quick trip suggestions, basic budgeting
- **Pain Points:** Limited time for planning
- **Usage:** Weekend bursts, quick queries

---

## Feature Summary

### PAM AI Assistant

| Feature | Description | Status |
|---------|-------------|--------|
| Voice Commands | "Hey PAM" wake word activation | Active |
| Budget Tools | 10 financial management tools | Active |
| Trip Tools | 10 travel planning tools | Active |
| Social Tools | 10 community interaction tools | Active |
| Shop Tools | 5 product search tools | Active |
| Profile Tools | 5 user management tools | Active |
| Savings Tracking | ROI calculation and celebration | Active |

### Wheels (Trip Planning)

| Feature | Description | Status |
|---------|-------------|--------|
| Route Planning | Multi-stop route optimization | Active |
| RV Park Search | Campground discovery with filters | Active |
| Gas Price Finder | Cheapest gas along routes | Active |
| Weather Forecasts | 7-day forecasts for destinations | Active |
| Road Conditions | Real-time road status | Active |
| Attractions | Points of interest discovery | Active |
| Favorite Spots | Bookmark locations | Active |

### Wins (Financial)

| Feature | Description | Status |
|---------|-------------|--------|
| Expense Tracking | Log and categorize expenses | Active |
| Budget Management | Set and track budgets | Active |
| Spending Analysis | Charts and insights | Active |
| Savings Tracking | PAM-assisted savings events | Active |
| End-of-Month Prediction | Spending forecasts | Active |
| Export Reports | PDF/CSV budget reports | Active |

### Social

| Feature | Description | Status |
|---------|-------------|--------|
| Community Feed | Share travel updates | Active |
| Direct Messages | Private communication | Active |
| Location Sharing | Share current spots | Active |
| Events | Community meetups | Active |
| Nearby RVers | Find travelers nearby | Active |

### Shop

| Feature | Description | Status |
|---------|-------------|--------|
| Product Search | RV gear and accessories | Active |
| Recommendations | AI-powered suggestions | Active |
| Affiliate Links | Amazon affiliate integration | Active |
| Product Details | Reviews and specifications | Active |

---

## Technology Choices

### Why These Technologies?

| Choice | Rationale |
|--------|-----------|
| **Claude Sonnet 4.5** | Best-in-class function calling, 200K context window |
| **React + TypeScript** | Type safety, large ecosystem, team expertise |
| **FastAPI** | Python async performance, automatic API docs |
| **Supabase** | PostgreSQL + RLS, real-time, generous free tier |
| **Netlify + Render** | Easy deployment, free tier for staging |
| **Mapbox** | Superior mapping for RV-specific routing |
| **Redis** | Fast caching for PAM context |

### AI Model Strategy

```
Primary:   Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)
           - Best for: Complex reasoning, function calling
           - Cost: $3/1M input + $15/1M output tokens
           - Context: 200K tokens

Fallback:  Gemini 3.0 Flash (gemini-3.0-flash)
           - Best for: Fast responses, everyday queries
           - Cost: Lower (free tier available)
           - Context: 1M tokens
```

---

## Project Timeline

### 2025 Milestones

| Date | Milestone |
|------|-----------|
| Oct 1 | PAM Rebuild Day 1-2: Core cleanup and architecture |
| Oct 2 | PAM Rebuild Day 3: Budget tools (10 tools) |
| Oct 3 | PAM Rebuild Day 4: Trip tools (10 tools) |
| Oct 4 | PAM Rebuild Day 5: Social/Shop/Profile tools (20 tools) |
| Oct 5 | PAM Rebuild Day 6: Voice integration |
| Oct 6 | PAM Rebuild Day 7: Polish and launch prep |
| Jan 12 | Production launch plan complete |
| Dec 21 | Code Bible documentation complete |

### Key Commits

| Commit | Description |
|--------|-------------|
| `a1010feb` | Gemini 3.0 Flash fallback update |
| `733a0ba5` | Claude API tool format fix |
| `82ed863f` | PAM Simple core brain implementation |
| `fa09d1ea` | Great Cleanup (hybrid system removal) |

---

## Success Metrics

### User Engagement
- Daily Active Users (DAU)
- Voice command usage rate
- Average session duration
- Feature adoption rates

### Financial Impact
- Average monthly savings per user
- Subscription conversion rate
- Affiliate revenue
- Cost per user (AI API costs)

### Technical Health
- API response times (<3s goal)
- Error rates (<1% goal)
- Voice round-trip time (<3s goal)
- Wake word accuracy (>85% goal)

---

## Contact and Resources

### Documentation
- `CLAUDE.md` - AI assistant instructions
- `docs/PAM_SYSTEM_ARCHITECTURE.md` - PAM technical details
- `backend/docs/architecture.md` - Backend architecture
- `backend/docs/api.md` - API documentation

### Support
- GitHub Issues: github.com/Thabonel/wheels-wins-landing-page/issues
- Email: support@wheelsandwins.com

### Environments
- Production: https://wheelsandwins.com
- Staging: https://wheels-wins-staging.netlify.app
- Backend Health: https://pam-backend.onrender.com/health
