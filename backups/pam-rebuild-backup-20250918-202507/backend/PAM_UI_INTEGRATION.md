# PAM UI Integration Guide

## Overview

This document explains how PAM (Personal AI Manager) can now interact directly with frontend components like maps, calendars, and expense trackers. When users make requests like "Plan a trip from Sydney to Melbourne" or "Schedule a meeting tomorrow", PAM will automatically display the trip on the map or add the event to the calendar.

## Architecture

### Backend: Smart UI Action Generation

**SimplePamService** now includes:
- **Intent Detection**: Identifies when users want to plan trips, schedule events, or track expenses
- **Data Extraction**: Parses locations, dates, times, and amounts from natural language
- **UI Action Generation**: Creates structured actions for the frontend to execute

### Frontend: Event-Driven Integration

**Components listen for PAM events via:**
- **Custom Events**: PAM emits events like `pam-display-route` and `pam-add-calendar-event`
- **Integration Hooks**: React hooks that components can use to respond to PAM actions
- **Universal Provider**: Centralized integration that works across the entire app

## Supported Interactions

### 🚐 Trip Planning
**User says**: "Plan a trip from Sydney to Melbourne"
**PAM does**:
1. Extracts origin and destination
2. Generates `display_route` action with location data
3. Navigates to `/wheels` trip planner
4. Auto-fills origin/destination inputs
5. Displays route on map

### 📅 Calendar Events
**User says**: "Schedule a meeting with John tomorrow at 3 PM"
**PAM does**:
1. Extracts event title, date, and time
2. Generates `add_calendar_event` action
3. Navigates to `/you` calendar view
4. Opens event creation form
5. Pre-fills event details

### 💰 Expense Tracking
**User says**: "I spent $75 on fuel yesterday"
**PAM does**:
1. Extracts amount, category, and date
2. Generates `add_expense` action
3. Navigates to `/wins` expenses view
4. Opens expense form
5. Pre-fills expense details

## Implementation Details

### Backend Changes

#### Enhanced SimplePamService

```python
class SimplePamService:
    def _detect_simple_intent(self, message: str) -> str:
        """Enhanced intent detection with UI action support"""
        # Detects: wheels, calendar, wins, social, you, shop, general
    
    def _generate_ui_actions(self, message: str, intent: str, response_content: str) -> List[Dict]:
        """Generate UI actions based on message intent and content"""
        # Creates structured actions for frontend execution
    
    def _extract_calendar_event(self, message: str) -> Optional[Dict]:
        """Extract calendar event details from message"""
        # Parses: title, date, time from natural language
    
    def _extract_expense_data(self, message: str) -> Optional[Dict]:
        """Extract expense details from message"""
        # Parses: amount, category, description, date
```

#### UI Action Types

```python
# Navigation Actions
{
    "type": "navigate",
    "target": "/wheels",
    "params": {"view": "trip-planner"}
}

# Route Display Actions
{
    "type": "display_route",
    "payload": {
        "origin": {"name": "Sydney"},
        "destination": {"name": "Melbourne"},
        "message": "Route from Sydney to Melbourne"
    }
}

# Calendar Event Actions
{
    "type": "add_calendar_event",
    "payload": {
        "title": "Meeting With John",
        "date": "2024-07-16",
        "time": "15:00",
        "description": "Scheduled by PAM"
    }
}

# Expense Actions
{
    "type": "add_expense",
    "payload": {
        "amount": 75.0,
        "category": "fuel",
        "description": "Expense: $75.00 for fuel",
        "date": "2024-07-15"
    }
}
```

### Frontend Changes

#### Enhanced UI Actions Handler

```typescript
// src/hooks/pam/usePamUIActions.ts
export function usePamUIActions() {
  const executeUIActions = async (actions: any[]) => {
    for (const action of actions) {
      switch (action.type) {
        case 'display_route':
          window.dispatchEvent(new CustomEvent('pam-display-route', {
            detail: action.payload
          }));
          break;
        
        case 'add_calendar_event':
          window.dispatchEvent(new CustomEvent('pam-add-calendar-event', {
            detail: action.payload
          }));
          break;
        
        case 'add_expense':
          window.dispatchEvent(new CustomEvent('pam-add-expense', {
            detail: action.payload
          }));
          break;
      }
    }
  };
}
```

#### Integration Hooks

**Trip Integration**:
```typescript
// src/hooks/pam/usePamTripIntegration.ts
export function usePamTripIntegration({ onRouteReceived }) {
  useEffect(() => {
    const handleDisplayRoute = (event: CustomEvent) => {
      const { origin, destination } = event.detail;
      // Auto-fill trip planner form
      // Trigger route calculation
      // Display on map
    };
    
    window.addEventListener('pam-display-route', handleDisplayRoute);
    return () => window.removeEventListener('pam-display-route', handleDisplayRoute);
  }, []);
}
```

**Calendar Integration**:
```typescript
// src/hooks/pam/usePamCalendarIntegration.ts
export function usePamCalendarIntegration({ onEventReceived }) {
  useEffect(() => {
    const handleAddCalendarEvent = (event: CustomEvent) => {
      const eventData = event.detail;
      // Open calendar event form
      // Pre-fill event details
      // Save to database
    };
    
    window.addEventListener('pam-add-calendar-event', handleAddCalendarEvent);
    return () => window.removeEventListener('pam-add-calendar-event', handleAddCalendarEvent);
  }, []);
}
```

#### Universal Integration Provider

```typescript
// src/components/pam/PamIntegrationProvider.tsx
export function PamIntegrationProvider({ children }) {
  // Centralizes all PAM integrations
  // Provides context for manual triggering
  // Shows toast notifications for PAM actions
  // Handles global PAM events
}
```

## Usage Examples

### For Trip Planner Components

```typescript
import { usePamTripIntegration } from '@/hooks/pam/usePamTripIntegration';

export function TripPlannerComponent() {
  const { displayRoute } = usePamTripIntegration({
    onRouteReceived: (routeData) => {
      setOrigin(routeData.origin.name);
      setDestination(routeData.destination.name);
      calculateRoute();
    }
  });
  
  // Component will automatically respond to PAM route display events
}
```

### For Calendar Components

```typescript
import { usePamCalendarIntegration } from '@/hooks/pam/usePamCalendarIntegration';

export function CalendarComponent() {
  const { addEvent } = usePamCalendarIntegration({
    onEventReceived: async (eventData) => {
      await createCalendarEvent(eventData);
      refreshCalendar();
    }
  });
  
  // Component will automatically respond to PAM calendar events
}
```

### Manual Integration

```typescript
import { usePamIntegration } from '@/components/pam/PamIntegrationProvider';

export function SomeComponent() {
  const { displayRoute, addEvent, addExpense } = usePamIntegration();
  
  const handleManualAction = () => {
    // Manually trigger PAM actions
    displayRoute("Sydney", "Melbourne");
    addEvent("Team Meeting", "2024-07-16", "10:00");
    addExpense(50, "food", "Lunch", "2024-07-15");
  };
}
```

## Testing

### Backend Testing

```bash
cd backend
python test_pam_ui_actions.py
```

This tests:
- Intent detection accuracy
- Data extraction from natural language
- UI action generation
- Response format compatibility

### Frontend Testing

1. **Trip Planning**: Say "Plan a trip from Sydney to Melbourne"
   - ✅ Should navigate to `/wheels`
   - ✅ Should fill origin/destination inputs
   - ✅ Should display route on map

2. **Calendar Events**: Say "Schedule a meeting tomorrow at 3 PM"
   - ✅ Should navigate to `/you` calendar
   - ✅ Should open event creation form
   - ✅ Should pre-fill event details

3. **Expense Tracking**: Say "I spent $50 on groceries"
   - ✅ Should navigate to `/wins` expenses
   - ✅ Should open expense form
   - ✅ Should pre-fill expense data

## Error Handling

### Backend Fallbacks
- If data extraction fails, only navigation action is generated
- If intent detection is unclear, defaults to general response
- All actions include error handling for malformed data

### Frontend Fallbacks
- If specific inputs aren't found, shows toast notification
- If forms don't exist, logs warning and continues
- All event listeners have error boundaries

## Future Enhancements

### Planned Features
1. **Route Optimization**: PAM suggests better routes based on user preferences
2. **Smart Scheduling**: PAM checks calendar availability before scheduling
3. **Budget Integration**: PAM warns if expenses exceed budget limits
4. **Multi-Action Workflows**: PAM executes complex multi-step actions
5. **Voice Integration**: PAM responds to voice commands with UI actions

### Advanced Integrations
1. **Map Annotations**: PAM adds points of interest to routes
2. **Calendar Conflicts**: PAM detects and resolves scheduling conflicts
3. **Expense Categories**: PAM learns user's expense categorization patterns
4. **Social Integration**: PAM suggests meetups along travel routes
5. **Real-time Updates**: PAM provides live updates during trips

## Configuration

### Environment Variables
```bash
# Backend
OPENAI_API_KEY=your_openai_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Frontend
VITE_BACKEND_URL=https://pam-backend.onrender.com
VITE_PAM_WEBSOCKET_URL=wss://pam-backend.onrender.com/api/v1/pam/ws
```

### Feature Flags
```typescript
// Enable/disable specific integrations
const PAM_INTEGRATIONS = {
  tripPlanning: true,
  calendarEvents: true,
  expenseTracking: true,
  socialIntegration: false,  // Future feature
  voiceCommands: false       // Future feature
};
```

## Troubleshooting

### Common Issues

1. **Actions not executing**:
   - Check browser console for errors
   - Verify PamIntegrationProvider is wrapped around app
   - Ensure components are using integration hooks

2. **Data extraction failing**:
   - Check backend logs for parsing errors
   - Verify message format matches expected patterns
   - Test with simpler, more explicit language

3. **Navigation not working**:
   - Verify route paths match application routes
   - Check if protected routes require authentication
   - Ensure React Router is configured correctly

### Debug Mode

```typescript
// Enable detailed logging
localStorage.setItem('pam-debug', 'true');

// Monitor PAM events
window.addEventListener('pam-display-route', (e) => console.log('Route:', e.detail));
window.addEventListener('pam-add-calendar-event', (e) => console.log('Event:', e.detail));
window.addEventListener('pam-add-expense', (e) => console.log('Expense:', e.detail));
```

---

**PAM UI Integration makes your AI assistant truly interactive, turning conversations into actions!** 🤖✨