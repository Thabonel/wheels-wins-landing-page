# Frontend Components

## Purpose
Reusable UI components organized by feature domain for the Wheels & Wins platform

## Structure
- `wheels/` - Trip planning and route management components
- `wins/` - Financial tracking and budgeting components  
- `social/` - Community and social networking features
- `pam/` - PAM AI assistant interface components
- `ui/` - Base UI components built on Radix UI primitives

## Key Components

### Wheels (Trip Planning)
- `TripPlanner.tsx` - Main trip planning interface with Mapbox integration
- `RouteMap.tsx` - Interactive map with route visualization
- `TripTemplates.tsx` - Pre-built Australian trip routes
- `MapOverlays.tsx` - Weather, fire, camping overlays

### Wins (Financial)
- `ExpenseTracker.tsx` - Track trip expenses
- `BudgetDashboard.tsx` - Budget overview and analytics
- `ExpenseCategories.tsx` - Categorized expense management
- `FinancialReports.tsx` - Expense reports and insights

### Social
- `CommunityFeed.tsx` - Social feed and interactions
- `UserProfile.tsx` - User profile management
- `GroupTrips.tsx` - Shared trip planning
- `MessageCenter.tsx` - User messaging system

### PAM (AI Assistant)
- `PamChat.tsx` - Main chat interface
- `VoiceControl.tsx` - Voice input/output controls
- `PamAvatar.tsx` - Animated assistant avatar
- `ConversationHistory.tsx` - Chat history management

### UI (Base Components)
- `Button.tsx` - Accessible button with variants
- `Card.tsx` - Content card container
- `Dialog.tsx` - Modal dialogs
- `Form.tsx` - Form components with validation
- `Toast.tsx` - Notification system

## Dependencies
- **Core**: React 18, TypeScript
- **UI Library**: Radix UI (accessible primitives)
- **Styling**: Tailwind CSS, clsx, tailwind-merge
- **Icons**: Lucide React
- **Maps**: Mapbox GL JS
- **Forms**: React Hook Form, Zod

## Conventions
- All components use TypeScript with strict typing
- Components follow functional component pattern
- Props interfaces are exported for reusability
- Mobile-first responsive design
- Accessibility compliance (WCAG 2.1)
- Dark mode support via CSS variables

## Do NOT
- Modify base UI components without updating all usages
- Add component-specific styles outside of component files
- Use inline styles - always use Tailwind classes
- Create components without TypeScript interfaces
- Skip accessibility attributes (aria-labels, roles)

## Testing
- Each component has a corresponding test file
- Tests use React Testing Library
- Minimum 80% coverage requirement
- Test accessibility with @testing-library/jest-dom