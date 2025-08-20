# 28-Day Trial System Implementation Guide

## Overview

A complete 28-day free trial system with habit-building nudges, designed for users 55+ with gentle anti-abuse measures. The system is reusable between Wheels & Wins and Unimog projects.

## Architecture

### Database Schema (`supabase/migrations/20250820_trial_system.sql`)
- **trials**: Core trial management with auto-expiry
- **trial_events**: User behavior tracking and analytics
- **trial_limits**: Usage enforcement (devices, storage, routes, doc views)
- **trial_milestones**: Habit-building progress tracking
- **PostgreSQL functions**: Business logic for limits, events, milestones

### Backend Services

#### Trial Service (`src/services/trialService.ts`)
- Singleton pattern with caching (5-minute cache)
- Trial lifecycle management (create, check, convert)
- Milestone tracking and completion
- Usage limit enforcement
- Nudge timing and display logic

#### Edge Functions (`supabase/functions/`)
- **trial-nudges**: Automated email sending based on trial day
- Integrates with Mailgun for email delivery
- Personalized email content with user progress

### Frontend Components (`src/components/trial/`)

#### Context Provider (`src/context/TrialContext.tsx`)
- Centralized trial state management
- Real-time trial info updates
- Milestone completion handling
- Event logging coordination

#### UI Components
- **TrialBanner**: Compact and full trial status display
- **MilestonesCard**: Interactive habit-building tracker
- **TrialModal**: Critical trial nudges (Day 3, 28)
- **TrialLimits**: Usage tracking with upgrade prompts
- **UpgradePrompt**: Contextual conversion messaging

#### Upgrade Flow (`src/pages/Upgrade.tsx`)
- Trial vs Premium feature comparison
- Pricing plans with savings calculation
- Progress preservation messaging
- Payment integration ready (Stripe/etc.)

### Email Templates (`supabase/functions/trial-emails/templates/`)
- **welcome.html**: Onboarding and goal setting
- **day3-momentum.html**: Habit formation critical period
- **day12-progress.html**: Mid-trial progress celebration
- **day26-final.html**: Urgency and data ownership
- Responsive HTML with inline CSS

### Analytics (`src/components/admin/TrialAnalyticsDashboard.tsx`)
- Trial conversion metrics
- Milestone completion rates
- Daily signup trends
- Revenue tracking
- Real-time activity monitoring

## Key Features

### 1. Habit-Building Milestones
- Import expenses (2 min, easy)
- Save first route (3 min, easy)
- Set monthly budget (5 min, medium)
- Link fuel data (5 min, medium)
- Enable reminders (2 min, advanced)

### 2. Nudge Schedule
- **Day 1**: Welcome email with goal setting
- **Day 3**: Momentum building (critical habit formation)
- **Day 12**: Progress celebration and community
- **Day 21**: Data ownership messaging
- **Day 26**: Final urgency with data preservation
- **Day 28**: Trial end with upgrade options

### 3. Usage Limits (55+ Friendly)
- 2 connected devices (not restrictive)
- 5GB storage (generous for seniors)
- 10 saved routes (builds planning habits)
- 500 document views (encourages organization)

### 4. Anti-Abuse Measures (Gentle)
- Email-based trial creation
- Usage limit enforcement
- Event tracking for suspicious patterns
- 90-day data retention (not punitive)

## Implementation Status

### ✅ Completed
1. Database migrations with RLS policies
2. Trial service with caching and business logic
3. Complete React component library
4. Email templates for all nudge points
5. Edge Functions for automation
6. Upgrade page with pricing
7. Analytics dashboard for admin
8. App.tsx integration with TrialProvider

### 🔄 Next Steps
1. **Payment Integration**: Stripe/payment processor
2. **Email Service**: Configure Mailgun API keys
3. **Database Migration**: Apply to production
4. **Cron Jobs**: Schedule trial-nudges function
5. **Testing**: User acceptance testing with 55+ users

## Usage Guide

### For Developers

#### Initialize Trial System
```typescript
// User signup automatically creates trial via trigger
// Access trial info anywhere:
const { trialInfo, completeMilestone } = useTrial();

// Log events
await trialService.logEvent('route_saved', { routeId: '123' });

// Check limits before actions
const routeLimit = await trialService.checkLimit('routes');
if (!routeLimit?.is_within_limit) {
  // Show upgrade prompt
}
```

#### Complete Milestones
```typescript
// When user imports expenses
await completeMilestone('import_expenses', { 
  amount: 150.00, 
  source: 'csv_upload' 
});

// When user saves route
await completeMilestone('save_route', { 
  routeName: 'Weekend Getaway',
  distance: 245 
});
```

### For Admins

#### Monitor Performance
1. Visit `/admin` → Trial Analytics
2. Track conversion rates and milestone completion
3. Monitor daily signups and revenue
4. Identify optimization opportunities

#### Manual Trial Management
```sql
-- Extend trial (customer service)
UPDATE trials SET expires_at = expires_at + INTERVAL '7 days' WHERE user_id = 'uuid';

-- Force conversion (payment processed externally)
SELECT convert_trial_to_paid('user-uuid');

-- Check user's trial events
SELECT * FROM trial_events WHERE user_id = 'uuid' ORDER BY created_at DESC;
```

## Configuration

### Environment Variables
```env
# Email service
MAILGUN_API_KEY=key-xxxxx
MAILGUN_DOMAIN=mg.wheelsandwins.com

# App URLs
SITE_URL=https://app.wheelsandwins.com
HELP_URL=https://app.wheelsandwins.com/help

# Feature flags
VITE_ENABLE_TRIAL_SYSTEM=true
VITE_TRIAL_LENGTH_DAYS=28
```

### Supabase Configuration
```sql
-- Schedule trial nudges (run hourly)
SELECT cron.schedule(
  'trial-nudges',
  '0 * * * *',
  'SELECT net.http_post(url:=''https://project.supabase.co/functions/v1/trial-nudges'') AS request_id;'
);

-- Schedule trial expiry check (run daily)
SELECT cron.schedule(
  'check-trial-expiry',
  '0 2 * * *',
  'SELECT check_trial_expiry();'
);
```

## Testing Scenarios

### Happy Path
1. User signs up → Trial created automatically
2. User completes milestones → Progress tracked
3. User receives nudges → Engagement increases
4. User upgrades on Day 26 → Revenue generated

### Edge Cases
1. User hits limits → Graceful upgrade prompts
2. Email delivery fails → Retry logic in place
3. Trial expires → Data preserved, clear messaging
4. Multiple device access → Limit enforcement

### Load Testing
1. 1000 simultaneous signups
2. Daily nudge processing for 10k users
3. Milestone completion burst traffic
4. Analytics dashboard with large datasets

## Metrics to Track

### Business Metrics
- Trial-to-paid conversion rate (target: >12%)
- Average revenue per converted user
- Time to first milestone completion
- Milestone completion rate by type

### Engagement Metrics
- Daily/weekly active trial users
- Email open and click rates
- Feature usage during trial
- Support ticket volume

### Technical Metrics
- API response times (<200ms p95)
- Email delivery success rate (>98%)
- Database query performance
- Error rates and uptime

## Maintenance

### Weekly Tasks
1. Review conversion funnel metrics
2. Analyze failed email deliveries
3. Monitor database performance
4. Check trial limit utilization

### Monthly Tasks
1. A/B test email templates
2. Optimize milestone definitions
3. Review and adjust nudge timing
4. Update pricing and messaging

This implementation provides a solid foundation for the 28-day trial system that can drive user engagement and conversion while being senior-friendly and non-aggressive.