# Key Features Implementation Guide

## 1. Trip Planning (Wheels)

### Enhanced Trip Planner
**Location**: `src/components/wheels/TripPlannerApp.tsx`
**Components**:
- `EnhancedTripPlanner` - Main planner with AI features
- `TripTemplates` - Pre-built journey templates
- `IntegratedTripPlanner` - Legacy planner (being phased out)
- `FreshTripPlanner` - Basic planner (replaced by Enhanced)

**Key Features**:
- AI-powered route optimization
- Trip templates with popular routes
- Social coordination for group trips
- Budget tracking integration
- Multi-modal transportation support
- Waypoint management
- POI discovery

**Implementation Notes**:
```typescript
// Template data passed via sessionStorage
sessionStorage.setItem('selectedTripTemplate', JSON.stringify(template));
navigate('/wheels?tab=trip-planner');
```

### Trip Templates
**Location**: `src/components/wheels/TripTemplates.tsx`
**Database**: `trip_templates` table
**Features**:
- Regional templates (US regions)
- Difficulty levels
- Budget estimates
- Popular waypoints
- "Add to Journey" functionality
- "Use this Journey" functionality

## 2. Financial Management (Wins)

### Expense Tracking
**Location**: `src/components/wins/Expenses.tsx`
**Database**: `expenses` table
**Features**:
- Manual expense entry
- OCR receipt scanning
- Category management
- Recurring expenses
- PAM influence tracking
- Mobile-optimized form

### Budget Management
**Location**: `src/components/wins/BudgetCalendar.tsx`
**Database**: `budgets` table
**Features**:
- Monthly/weekly/daily budgets
- Category-specific limits
- Visual calendar view
- Overspending alerts
- Savings goals

### Bank Statement Import
**Location**: `src/components/bank-statement/`
**Privacy**: Client-side processing only
**Formats**: CSV, Excel, PDF
**Features**:
- Multi-bank support
- Auto-categorization
- Privacy-first (no server upload)
- Transaction anonymization
- Export to app format

## 3. PAM AI Assistant

### Core Implementation
**Location**: `src/components/pam/PamAssistant.tsx`
**Backend**: `backend/app/api/v1/pam.py`
**WebSocket**: `wss://pam-backend.onrender.com/api/v1/pam/ws/{user_id}`

**Known Issues**:
- Multiple WebSocket implementations (needs consolidation)
- Voice features partially working
- Connection state management complex

**Features**:
- Conversational AI (GPT-4)
- Context-aware assistance
- Voice input/output (TTS/STT)
- Trip optimization suggestions
- Financial insights
- Health consultations

### WebSocket Connection
```typescript
// Correct WebSocket URL format
const wsUrl = `wss://pam-backend.onrender.com/api/v1/pam/ws/${userId}?token=${token}`;
```

## 4. Medical Records (You)

### Medical Dashboard
**Location**: `src/components/you/medical/MedicalDashboard.tsx`
**Database**: `medical_records`, `medications`, `emergency_info`
**Features**:
- Document upload with OCR
- Medication tracking
- Refill reminders
- Emergency information
- Health AI consultation
- Consultation history
- HIPAA-compliant storage

### Health Consultation
**Location**: `src/components/you/medical/HealthConsultation.tsx`
**Backend**: `backend/app/api/v1/health_consultation.py`
**Features**:
- AI-powered health Q&A
- Symptom analysis
- Medical disclaimer system
- Consultation history
- Emergency detection

## 5. User Authentication

### Supabase Auth
**Location**: `src/context/AuthContext.tsx`
**Features**:
- Email/password login
- Social OAuth (Google, GitHub)
- Magic link authentication
- Password reset
- Email verification
- Session management

### Profile Management
**Location**: `src/components/profile/`
**Database**: `profiles` table
**Features**:
- Avatar upload
- Personal information
- Preferences
- Privacy settings
- Account deletion

## 6. Data Storage

### Supabase Integration
**Client**: `src/integrations/supabase/client.ts`
**Types**: `src/integrations/supabase/types.ts`
**Features**:
- Real-time subscriptions
- Row Level Security (RLS)
- File storage
- Database functions
- Edge functions

### Local Storage
**Patterns**:
```typescript
// Settings sync
localStorage.setItem('user-settings', JSON.stringify(settings));

// Template transfer
sessionStorage.setItem('selectedTripTemplate', JSON.stringify(template));

// Offline data
localStorage.setItem('offline-trips', JSON.stringify(trips));
```

## 7. Maps Integration

### Mapbox Implementation
**Location**: `src/components/wheels/trip-planner/MapControls.tsx`
**Token**: `VITE_MAPBOX_TOKEN` environment variable
**Features**:
- Interactive route planning
- Waypoint management
- POI markers
- Traffic layers
- Terrain visualization
- Offline map regions

### Directions API
```typescript
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
const directions = new MapboxDirections({
  accessToken: mapboxgl.accessToken,
  unit: 'metric',
  profile: 'mapbox/driving',
  controls: {
    inputs: false,
    instructions: true,
    profileSwitcher: true
  }
});
```

## 8. PWA Features

### Service Worker
**Config**: `vite.config.ts`
**Features**:
- Offline support
- Background sync
- Push notifications (planned)
- App installation
- Cache strategies

### Manifest
**File**: `public/manifest.json`
**Features**:
- App icons
- Theme colors
- Display modes
- Orientation lock
- Start URL

## 9. Testing Infrastructure

### Playwright E2E Tests
**Location**: `e2e/`
**Features**:
- Full site crawling
- User journey tests
- Performance testing
- Accessibility checks
- Visual regression (planned)

### Unit Tests
**Location**: `src/__tests__/`
**Framework**: Vitest
**Coverage**: ~60% (target 80%)

## 10. Deployment Pipeline

### Frontend (Netlify)
**Trigger**: Push to main/staging
**Build**: `npm run build`
**Deploy**: Automatic
**Preview**: PR deployments

### Backend (Render)
**Services**: 4 separate services
**Deploy**: Automatic on push
**Health**: Monitored every 30s
**Scaling**: Auto-scaling enabled

## Common Patterns

### Error Handling
```typescript
try {
  const result = await apiCall();
  // Handle success
} catch (error) {
  console.error('Operation failed:', error);
  toast({
    title: 'Error',
    description: error.message,
    variant: 'destructive'
  });
}
```

### Loading States
```typescript
const [isLoading, setIsLoading] = useState(false);
// Show spinner or skeleton
{isLoading ? <LoadingSpinner /> : <Content />}
```

### Authentication Check
```typescript
const { user } = useAuth();
if (!user) {
  navigate('/login');
  return;
}
```

### Supabase Query
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', user.id);
```