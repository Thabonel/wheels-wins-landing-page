# Wheels & Wins Project Overview

## What is Wheels & Wins?

Wheels & Wins is a comprehensive personal finance and RV travel planning platform that helps users manage their finances while planning and optimizing their RV adventures.

## Core Value Proposition

1. **Financial Management** (Wins)
   - Budget tracking and optimization
   - Expense management with OCR receipt scanning
   - Income tracking and projections
   - Bank statement import and conversion
   - Savings challenges and goals

2. **RV Travel Planning** (Wheels)
   - AI-powered trip planning with route optimization
   - Trip templates for popular journeys
   - Social trip coordination for group travel
   - Fuel log and vehicle maintenance tracking
   - RV storage organization
   - Caravan safety checklists

3. **AI Assistant** (PAM)
   - Personal Assistant Manager
   - Voice-enabled conversational AI
   - Context-aware help across all features
   - Real-time trip optimization
   - Financial advice and insights

4. **Health Management** (You)
   - Medical records storage
   - Medication tracking and reminders
   - Emergency information management
   - AI health consultation
   - Document upload with OCR

## Target Audience

- RV owners and enthusiasts
- Digital nomads
- Retirees who travel
- Families planning road trips
- Budget-conscious travelers

## Key Differentiators

1. **Integrated Platform**: Combines financial management with travel planning
2. **AI-First Approach**: PAM assistant provides intelligent assistance
3. **Privacy-Focused**: Client-side processing for sensitive data
4. **Mobile-Optimized**: PWA with offline capabilities
5. **Community Features**: Social trip coordination and sharing

## Project Structure

```
wheels-wins-landing-page/
├── src/                    # Frontend React application
│   ├── components/        # UI components
│   │   ├── wheels/       # Trip planning features
│   │   ├── wins/         # Financial features
│   │   ├── pam/          # AI assistant
│   │   └── you/          # Personal/health features
│   ├── pages/            # Route pages
│   ├── services/         # API clients and utilities
│   ├── hooks/            # Custom React hooks
│   └── contexts/         # React contexts
├── backend/              # FastAPI backend
│   ├── app/             # Application code
│   ├── api/             # API endpoints
│   └── services/        # Business logic
├── supabase/            # Database migrations and functions
├── public/              # Static assets
└── docs/                # Documentation

```

## Business Model

- **Freemium**: Basic features free, premium features paid
- **Subscription Tiers**: Monthly/yearly plans
- **Premium Features**:
  - Unlimited trip saves
  - Advanced AI consultations
  - Priority support
  - Extended document storage
  - Group trip coordination

## Development Philosophy

1. **User-Centric**: Features driven by user needs
2. **Mobile-First**: Optimized for mobile devices
3. **Performance**: Fast load times and smooth interactions
4. **Security**: RLS, encryption, secure authentication
5. **Accessibility**: WCAG compliance
6. **Testability**: Comprehensive test coverage

## Current Status

- **Production**: Live at main domain
- **Users**: Active user base
- **Features**: Core features operational
- **Development**: Active development on staging branch
- **Issues**: See [03-CURRENT-STATE.md](03-CURRENT-STATE.md) for known issues