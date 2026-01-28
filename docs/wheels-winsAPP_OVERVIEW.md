# Wheels & Wins - Complete Application Overview

**Last Updated**: January 28, 2026
**Version**: 2.0
**Status**: Production Active

---

## Table of Contents

1. [What is Wheels & Wins?](#what-is-wheels--wins)
2. [Target Audience](#target-audience)
3. [Core Philosophy](#core-philosophy)
4. [Application Modules](#application-modules)
5. [Technology Stack](#technology-stack)
6. [System Architecture](#system-architecture)
7. [Key Features](#key-features)
8. [AI Integration (PAM)](#ai-integration-pam)
9. [Data Flow](#data-flow)
10. [Infrastructure](#infrastructure)
11. [Security & Privacy](#security--privacy)
12. [Mobile Experience](#mobile-experience)
13. [Future Roadmap](#future-roadmap)

---

## What is Wheels & Wins?

**Wheels & Wins** is a comprehensive lifestyle management platform for RV enthusiasts, designed to help users manage three core aspects of RV life:

- **Wheels**: Trip planning, route optimization, RV park discovery, vehicle maintenance, fuel tracking
- **Wins**: Financial management, budget tracking, expense categorization, income tracking, savings goals
- **Social**: Community engagement, trip sharing, friend connections, photo sharing, marketplace

The platform is powered by **PAM (Personal Assistant Manager)**, an AI assistant that understands context across all three domains and helps users make better decisions about their RV lifestyle.

---

## Target Audience

### Primary Users
- **Full-time RVers**: Living the RV lifestyle permanently
- **Part-time RVers**: Weekend warriors and seasonal travelers
- **Aspiring RVers**: Planning the transition to RV life
- **RV Renters**: Testing the lifestyle before committing

### User Demographics
- Age range: 35-70 years old
- Tech comfort: Moderate to high
- Income level: Middle to upper-middle class
- Geographic: Primarily USA, Canada, Australia

### User Needs
- Simplify complex trip planning
- Track and manage RV expenses
- Connect with like-minded community
- Access intelligent assistance for decisions
- Maintain vehicle and equipment
- Discover new destinations

---

## Core Philosophy

### Design Principles
1. **Human-Centered**: Warm, approachable design that feels handcrafted, not corporate
2. **Context-Aware**: AI understands where you are, what you're doing, and what you need
3. **Privacy-First**: User data stays private, no selling or sharing without consent
4. **Mobile-First**: Optimized for on-the-road use, works offline when needed
5. **Community-Driven**: Built with and for the RV community

### Brand Values
- **Adventure**: Encouraging exploration and discovery
- **Freedom**: Supporting independent lifestyle choices
- **Community**: Fostering connections between travelers
- **Sustainability**: Promoting responsible travel and living
- **Authenticity**: Real experiences, real people, real advice

---

## Application Modules

### 1. Wheels (Trip Planning & Vehicle Management)

#### Trip Planning
- **Interactive Map Interface**: Powered by Mapbox
- **Route Optimization**: Considers RV size, weight restrictions, road conditions
- **Waypoint Management**: Add/remove stops, optimize route order
- **RV Park Discovery**: 12,000+ campgrounds with real reviews
- **Weather Integration**: Real-time weather along route
- **Saved Trips**: Store and share favorite routes

#### Vehicle Maintenance
- **Maintenance Schedule Tracker**: Tire rotations, oil changes, inspections
- **Service Reminders**: Automated alerts based on mileage/time
- **Maintenance History**: Complete service log with receipts
- **Equipment Manager**: Track all RV equipment and gear
- **Shakedown Trip Logger**: Document issues during test trips

#### Fuel Tracking
- **Smart Fuel Entry**: Auto-calculate volume, price, or total cost
- **Consumption Tracking**: MPG/L per 100km with "filled to top" logic
- **Fuel Cost Analysis**: Average price, total spent, efficiency trends
- **Regional Pricing**: Location-aware pricing data
- **Receipt Storage**: Photo upload for expense tracking

#### Transition Planning
- **Planning Dashboard**: Step-by-step transition from house to RV
- **Task Management**: Organize pre-departure tasks
- **Budget Planning**: Financial preparation tools
- **Timeline Tracking**: Countdown to departure date
- **Equipment Checklist**: What to buy, sell, or keep

### 2. Wins (Financial Management)

#### Budget Management
- **Income Tracking**: Multiple income streams (work, rental, investments)
- **Expense Categorization**: RV-specific categories (fuel, campgrounds, maintenance)
- **Budget Creation**: Set limits per category
- **Spending Alerts**: Notifications when approaching limits
- **Variance Analysis**: Actual vs. budgeted spending

#### Financial Overview
- **Dashboard**: Real-time financial health snapshot
- **Charts & Visualizations**: Spending trends, category breakdowns
- **Net Worth Tracking**: Assets minus liabilities
- **Cash Flow Analysis**: Money in vs. money out
- **Custom Date Ranges**: View any time period

#### Savings Goals
- **Goal Creation**: Name, target amount, deadline
- **Progress Tracking**: Visual progress bars
- **Automated Savings**: Set recurring contributions
- **Goal Prioritization**: Rank goals by importance
- **Achievement Celebrations**: Milestone notifications

#### Bank Statement Processing
- **Automated Import**: CSV, PDF, Excel support
- **Smart Categorization**: AI-powered expense classification
- **Duplicate Detection**: Prevent double-entry
- **Data Privacy**: All processing done locally
- **Bulk Editing**: Mass category reassignment

### 3. Social (Community & Sharing)

#### Feed
- **Community Posts**: Share experiences, photos, tips
- **Engagement**: Likes, comments, shares
- **Content Types**: Text, photos, trip shares, check-ins
- **Filtering**: Friends only, public, specific topics
- **Real-time Updates**: Live feed refresh

#### Friends & Connections
- **Friend Search**: Find other RVers by location, interests
- **Connection Requests**: Send/accept friend requests
- **Mutual Connections**: See shared friends
- **Privacy Controls**: Choose what friends can see
- **Messaging**: Direct messages (planned)

#### Trip Sharing
- **Public Trip Library**: Browse community-shared routes
- **Trip Details**: Full itinerary, stops, recommendations
- **Reviews & Ratings**: Rate and review shared trips
- **Save for Later**: Bookmark interesting trips
- **Social Proof**: See how many have completed trip

#### Marketplace (Coming Soon)
- **Buy/Sell RV Gear**: Equipment, furniture, accessories
- **Service Directory**: Mechanics, repair shops, mobile services
- **Location-Based**: Find items/services near you
- **User Ratings**: Trust scores and reviews
- **Secure Transactions**: Payment protection

### 4. PAM (Personal Assistant Manager)

#### AI Capabilities
- **47 Function Tools**: Integrated across all modules
- **Natural Language**: Conversational interface
- **Context-Aware**: Knows your location, preferences, history
- **Proactive Suggestions**: Anticipates needs
- **Voice Activation**: "Hey Pam" wake word detection

#### Core Functions
- **Trip Planning**: "Plan a trip from Austin to Yellowstone"
- **Budget Help**: "How much did I spend on fuel last month?"
- **Social Posting**: "Post a photo from my current location"
- **Maintenance Reminders**: "When is my next oil change?"
- **Weather Updates**: "What's the weather along my route?"
- **RV Park Recommendations**: "Find dog-friendly campgrounds nearby"

#### Integration Layers
- **Database**: Direct access to user data (RLS protected)
- **External APIs**: Weather, maps, pricing data
- **Function Calling**: Claude 3.5 Sonnet for intelligent tool use
- **Memory System**: Remembers conversation context
- **Error Recovery**: Graceful fallbacks and retry logic

### 5. Shop (Affiliate Products)

#### Product Categories
- **RV Equipment**: Levelers, surge protectors, accessories
- **Electronics**: Solar panels, inverters, batteries
- **Camping Gear**: Chairs, tables, outdoor equipment
- **Books & Manuals**: RV guides, maintenance manuals
- **Digital Products**: E-books, courses, software

#### Features
- **Curated Selection**: Hand-picked quality products
- **Honest Reviews**: Real user experiences
- **Price Tracking**: Historical pricing data
- **Affiliate Links**: Support platform through purchases
- **Category Filtering**: Easy product discovery

---

## Technology Stack

### Frontend
- **Framework**: React 18.3 with TypeScript
- **Build Tool**: Vite 5.x
- **Styling**: Tailwind CSS + Custom CSS
- **UI Components**: Radix UI primitives
- **State Management**: React Context + Hooks
- **Maps**: Mapbox GL JS
- **Charts**: Recharts
- **Forms**: React Hook Form
- **Validation**: Zod schemas

### Backend
- **Runtime**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15 (Supabase)
- **Authentication**: Supabase Auth (JWT)
- **Real-time**: WebSocket (Socket.IO)
- **Caching**: Redis
- **File Storage**: Supabase Storage
- **Email**: Supabase Email

### AI/ML
- **Primary Model**: Claude Sonnet 4.5 (Anthropic)
- **Fallback Model**: GPT-5.1 Instant (OpenAI)
- **Voice**: Web Speech API + ElevenLabs
- **Embeddings**: OpenAI text-embedding-3-small
- **Vector Store**: Supabase pgvector

### Infrastructure
- **Frontend Hosting**: Netlify
- **Backend Hosting**: Render.com
- **Database**: Supabase Cloud
- **CDN**: Netlify Edge + Cloudflare
- **Monitoring**: Sentry (optional)
- **Analytics**: Custom (privacy-focused)

### Development Tools
- **Version Control**: Git + GitHub
- **CI/CD**: GitHub Actions + Netlify
- **Testing**: Vitest + Playwright
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode
- **Package Manager**: npm

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  React   │  │  Mapbox  │  │  Voice   │  │  Offline │   │
│  │   App    │  │  Maps    │  │  Engine  │  │  Storage │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              FastAPI Backend Server                   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │
│  │  │   REST   │  │WebSocket │  │  Auth    │          │  │
│  │  │   API    │  │   PAM    │  │Middleware│          │  │
│  │  └──────────┘  └──────────┘  └──────────┘          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   PAM    │  │  Trip    │  │Financial │  │  Social  │  │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │PostgreSQL│  │  Redis   │  │ Supabase │  │  Vector  │  │
│  │    DB    │  │  Cache   │  │  Storage │  │    DB    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Anthropic│  │  Mapbox  │  │ Weather  │  │ Payment  │  │
│  │  Claude  │  │   API    │  │   API    │  │  Gateway │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema Overview

**Core Tables** (40+ total):
- `profiles`: User profile data
- `trips`: Saved trip plans
- `trip_stops`: Individual stops on trips
- `fuel_log`: Fuel entry tracking
- `maintenance_records`: Vehicle service history
- `budgets`: Budget configurations
- `expenses`: Expense transactions
- `income_entries`: Income tracking
- `posts`: Social feed posts
- `comments`: Post comments
- `friendships`: Friend connections
- `affiliate_products`: Shop products
- `calendar_events`: PAM calendar integration

**Key Relationships**:
- One user → Many trips, expenses, posts
- One trip → Many stops, shared instances
- One post → Many comments, likes
- Many-to-many: User friendships

### Authentication Flow

1. User enters credentials
2. Supabase Auth validates and issues JWT
3. JWT includes user ID + role (authenticated/admin)
4. Frontend stores JWT in localStorage
5. All API requests include JWT in Authorization header
6. Backend validates JWT on each request
7. Database RLS policies enforce data isolation

### PAM WebSocket Architecture

1. Client establishes WebSocket connection with JWT
2. Backend validates token and creates session
3. User sends text/voice message
4. Backend processes with Claude function calling
5. Tool execution happens server-side
6. Results streamed back to client in real-time
7. Context maintained in Redis cache
8. Connection kept alive with heartbeat

---

## Key Features

### Cross-Platform Features
- **Responsive Design**: Works on desktop, tablet, mobile
- **Dark Mode**: Automatic theme switching
- **Offline Support**: Critical features work without internet
- **Progressive Web App**: Installable on mobile devices
- **Touch Optimized**: Large touch targets, swipe gestures

### Performance
- **Code Splitting**: Lazy load routes and components
- **Image Optimization**: WebP format, lazy loading
- **Asset Caching**: ServiceWorker for offline assets
- **API Response Caching**: Redis for frequent queries
- **Optimistic Updates**: Instant UI feedback

### Accessibility
- **WCAG 2.1 AA Compliant**: Keyboard navigation, screen readers
- **Semantic HTML**: Proper heading hierarchy
- **ARIA Labels**: Descriptive labels for assistive tech
- **Color Contrast**: Meets accessibility standards
- **Focus Management**: Visible focus indicators

### Security
- **Row Level Security (RLS)**: Database-level isolation
- **JWT Authentication**: Secure token-based auth
- **HTTPS Only**: All traffic encrypted
- **Input Sanitization**: XSS protection
- **SQL Injection Prevention**: Parameterized queries
- **CORS Configuration**: Whitelist approved origins

---

## AI Integration (PAM)

### PAM System Overview

PAM (Personal Assistant Manager) is the central AI system that powers intelligent features across the platform.

#### Architecture Components

**Frontend** (`src/components/pam/`):
- `SimplePAM.tsx`: Main chat interface
- `PamVisualController.ts`: Voice/text input orchestration
- `pamService.ts`: WebSocket communication layer

**Backend** (`backend/app/services/pam/`):
- `core/pam.py`: Main orchestration engine
- `tools/tool_registry.py`: 47 registered function tools
- `prompts/enhanced_pam_prompt.py`: System instructions

#### Function Tools (47 Total)

**Budget Tools** (10):
- create_expense, create_income, analyze_budget
- track_savings_goal, budget_recommendation
- expense_breakdown, income_breakdown
- set_budget_limit, financial_forecast
- cost_comparison

**Trip Tools** (12):
- plan_trip, optimize_route, find_rv_parks
- check_weather, save_trip, get_saved_trips
- share_trip, add_waypoint, remove_waypoint
- calculate_fuel_cost, estimate_travel_time
- road_conditions

**Social Tools** (10):
- create_post, like_post, comment_on_post
- share_content, send_friend_request
- accept_friend_request, get_feed
- search_users, message_friend, upload_photo

**Shop Tools** (5):
- search_products, get_product_details
- add_to_cart, remove_from_cart, checkout

**Calendar Tools** (3):
- create_event, update_event, delete_event

**Profile Tools** (5):
- update_profile, update_preferences
- get_user_stats, set_notification_prefs
- export_data

**Admin Tools** (2):
- add_knowledge, search_knowledge

#### Context Management

PAM maintains context across conversations:

**User Context**:
- Current location (lat/lng)
- Recent trips and destinations
- Budget and spending patterns
- Friends and social connections
- Vehicle information
- Preferences and settings

**Conversation Context**:
- Last 10 messages in memory
- Active task/goal
- Referenced entities (trips, expenses, etc.)
- Clarification questions pending

**Persistent Memory**:
- User knowledge base (stored in DB)
- Learned preferences
- Common patterns and habits
- Historical interactions

### Voice Integration

**Wake Word Detection**:
- "Hey Pam" triggers listening
- Web Speech API for recognition
- Fallback to text input if unavailable

**Text-to-Speech**:
- ElevenLabs for premium voice (optional)
- Web Speech API fallback
- Adjustable speed and voice

---

## Data Flow

### Typical User Journey: Planning a Trip

1. **User Action**: "PAM, plan a trip to Yosemite"
2. **Voice Processing**: Web Speech API → text
3. **WebSocket Send**: Message to PAM backend
4. **Intent Recognition**: Claude identifies "plan_trip" function
5. **Tool Execution**: Backend calls `plan_trip` with destination
6. **Database Query**: Fetch relevant RV parks, routes
7. **External APIs**: Mapbox routing, weather data
8. **Result Processing**: Combine data into trip plan
9. **WebSocket Stream**: Results sent back to client
10. **UI Update**: Trip displayed on map with details
11. **Save Action**: User saves trip to database
12. **Social Share**: Optionally share with community

### Data Synchronization

**Real-time Sync**:
- Social feed updates (WebSocket)
- Friend activity notifications
- PAM conversation streaming
- Live location sharing (planned)

**Periodic Sync**:
- Weather updates (every 30 minutes)
- RV park pricing (daily)
- Fuel price trends (weekly)
- Financial summaries (daily)

**On-Demand Sync**:
- Trip route recalculation
- Budget analysis
- Expense categorization
- Report generation

---

## Infrastructure

### Deployment Architecture

**Production Environment**:
- **Frontend**: https://wheelsandwins.com (Netlify)
- **Backend**: https://pam-backend.onrender.com (Render)
- **Database**: Shared Supabase PostgreSQL

**Staging Environment**:
- **Frontend**: https://wheels-wins-staging.netlify.app (Netlify)
- **Backend**: https://wheels-wins-backend-staging.onrender.com (Render)
- **Database**: Same Supabase (isolated by user_id)

### Continuous Integration/Deployment

**Git Workflow**:
```
feature-branch → staging → main (production)
```

**Automated Checks**:
- TypeScript compilation
- Linting (ESLint)
- Unit tests (Vitest)
- Build validation
- Security scanning (gitleaks)

**Deployment Triggers**:
- Push to `staging` → Auto-deploy to staging
- Push to `main` → Auto-deploy to production
- Pull requests → Preview deployments

### Monitoring & Observability

**Error Tracking**:
- Sentry for frontend errors (optional)
- Backend logging to stdout
- Database query logs in Supabase

**Performance Monitoring**:
- Core Web Vitals tracking
- API response times
- Database query performance
- Cache hit rates

**Uptime Monitoring**:
- Netlify status
- Render.com health checks
- Supabase availability
- External API health

### Backup & Recovery

**Database Backups**:
- Automatic daily snapshots (Supabase)
- Point-in-time recovery (7 days)
- Manual backup triggers available

**File Storage Backups**:
- User uploads in Supabase Storage
- Automatic replication
- Versioning enabled

**Disaster Recovery**:
- Database restore < 1 hour
- Frontend redeploy < 5 minutes
- Backend redeploy < 10 minutes
- RTO (Recovery Time Objective): 2 hours
- RPO (Recovery Point Objective): 24 hours

---

## Security & Privacy

### Data Privacy Principles

1. **User Ownership**: Users own all their data
2. **Transparency**: Clear about what data is collected
3. **Minimal Collection**: Only collect what's necessary
4. **Secure Storage**: Encrypted at rest and in transit
5. **No Selling**: Never sell user data to third parties
6. **Right to Delete**: Users can delete all data
7. **Export Capability**: Download all data in JSON format

### Security Measures

**Application Security**:
- HTTPS everywhere
- CORS whitelisting
- Rate limiting on APIs
- Input validation and sanitization
- SQL injection prevention
- XSS protection

**Authentication Security**:
- bcrypt password hashing
- JWT with short expiration
- Refresh token rotation
- Session invalidation on logout
- Two-factor authentication (planned)

**Database Security**:
- Row Level Security (RLS)
- Service role key isolation
- Encrypted backups
- Connection pooling limits
- Query timeout protection

### Compliance

**GDPR Compliance**:
- Privacy policy disclosure
- Consent management
- Data access requests
- Right to be forgotten
- Data portability

**CCPA Compliance**:
- California resident protections
- Opt-out mechanisms
- Data disclosure requirements

---

## Mobile Experience

### Progressive Web App (PWA)

**Installation**:
- Add to Home Screen on iOS/Android
- Full-screen app experience
- App icon on device
- Launch without browser chrome

**Offline Capabilities**:
- Cached assets for core UI
- Local storage for recent data
- Queue actions when offline
- Sync when connection restored

### Mobile-Specific Features

**Touch Gestures**:
- Swipe to navigate
- Pull-to-refresh feeds
- Long-press context menus
- Pinch to zoom maps

**Device Integration**:
- GPS location access
- Camera for photos
- Microphone for voice
- File picker for imports

**Performance Optimizations**:
- Reduced bundle sizes
- Lazy image loading
- Virtual scrolling for long lists
- Optimized for 3G networks

---

## Future Roadmap

### Near-Term (Q1-Q2 2026)

**Features**:
- [ ] Direct messaging between users
- [ ] Group trip planning
- [ ] Advanced budget forecasting
- [ ] Maintenance cost predictions
- [ ] Mobile app (React Native)

**Improvements**:
- [ ] Faster map rendering
- [ ] Better offline support
- [ ] Enhanced voice commands
- [ ] Improved search functionality
- [ ] AI-powered trip recommendations

### Mid-Term (Q3-Q4 2026)

**Features**:
- [ ] Marketplace launch (buy/sell gear)
- [ ] Service provider directory
- [ ] Event calendar (rallies, meetups)
- [ ] Educational content library
- [ ] Community forums

**Integrations**:
- [ ] Bank account linking (Plaid)
- [ ] Credit card expense import
- [ ] Calendar sync (Google/Apple)
- [ ] Weather alerts (push notifications)

### Long-Term (2027+)

**Vision**:
- [ ] International expansion (Europe, Asia)
- [ ] Multi-language support
- [ ] RV rental integration
- [ ] Insurance partnerships
- [ ] Roadside assistance network
- [ ] AI-powered personal travel agent
- [ ] Predictive maintenance alerts
- [ ] Community-sourced road conditions
- [ ] Live convoy/caravan coordination

---

## Getting Started (For Developers)

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL 15+ (or Supabase account)
- Mapbox account (free tier)
- Anthropic API key

### Quick Start

```bash
# Clone repository
git clone https://github.com/Thabonel/wheels-wins-landing-page.git
cd wheels-wins-landing-page

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development server (port 8080)
npm run dev

# Start backend (separate terminal)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Project Structure

```
wheels-wins-landing-page/
├── src/                      # Frontend source
│   ├── components/          # React components
│   │   ├── wheels/         # Trip planning UI
│   │   ├── wins/           # Financial UI
│   │   ├── social/         # Social features UI
│   │   ├── pam/            # AI assistant UI
│   │   └── shop/           # Product catalog UI
│   ├── services/           # API clients
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Helper functions
│   └── types/              # TypeScript definitions
├── backend/                 # Backend source
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── services/       # Business logic
│   │   │   └── pam/        # PAM AI system
│   │   ├── core/           # Core utilities
│   │   └── models/         # Data models
├── docs/                    # Documentation
├── supabase/               # Database migrations
└── public/                 # Static assets
```

### Key Documentation Files

- `CLAUDE.md`: Development instructions
- `docs/PAM_SYSTEM_ARCHITECTURE.md`: PAM deep dive
- `docs/DATABASE_SCHEMA_REFERENCE.md`: Database schema
- `docs/NAMING_CONVENTIONS_MASTER.md`: Field mappings
- `backend/docs/architecture.md`: Backend architecture

---

## Support & Community

### Getting Help

**Documentation**: https://docs.wheelsandwins.com (planned)
**Email Support**: support@wheelsandwins.com
**GitHub Issues**: https://github.com/Thabonel/wheels-wins-landing-page/issues
**Community Forum**: Coming soon

### Contributing

We welcome contributions! Please read:
- `CONTRIBUTING.md`: Contribution guidelines
- `CODE_OF_CONDUCT.md`: Community standards
- `.github/ISSUE_TEMPLATE/`: Issue templates

### License

Proprietary - All rights reserved
Copyright © 2026 Wheels & Wins

---

## Appendix

### Glossary

- **RV**: Recreational Vehicle (motorhome, travel trailer, fifth wheel)
- **RLS**: Row Level Security (database access control)
- **PWA**: Progressive Web App
- **PAM**: Personal Assistant Manager (our AI)
- **JWT**: JSON Web Token (authentication)
- **MPG**: Miles Per Gallon (fuel efficiency)
- **L/100km**: Liters per 100 kilometers (fuel efficiency)

### Acronyms

- **API**: Application Programming Interface
- **CRUD**: Create, Read, Update, Delete
- **UI/UX**: User Interface/User Experience
- **REST**: Representational State Transfer
- **SQL**: Structured Query Language
- **HTTP/HTTPS**: HyperText Transfer Protocol (Secure)
- **CORS**: Cross-Origin Resource Sharing
- **CDN**: Content Delivery Network

### Metrics & KPIs

**User Engagement**:
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Average session duration
- Feature adoption rates

**Technical Performance**:
- API response time (p95 < 200ms)
- Frontend load time (< 3s)
- Error rate (< 0.1%)
- Uptime (> 99.9%)

**Business Metrics**:
- User retention (30-day, 90-day)
- Affiliate conversion rate
- Premium feature usage
- Customer satisfaction (NPS)

---

**Document Version**: 1.0
**Last Reviewed**: January 28, 2026
**Next Review**: April 28, 2026
**Maintained By**: Development Team
**Contact**: dev@wheelsandwins.com
