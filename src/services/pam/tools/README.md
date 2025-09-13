# PAM Tools System

This directory contains the complete tool system for PAM (Personal AI Manager), providing Claude with access to user data and calculations.

## Architecture Overview

```
src/services/pam/tools/
├── toolRegistry.ts        # Tool definitions and JSON schemas
├── profileTools.ts        # User profile and settings functions
├── tripTools.ts          # Trip, vehicle, and fuel data functions
├── index.ts              # Central export point
├── README.md             # This documentation
├── toolRegistry.test.ts  # Registry validation tests
├── profileTools.test.ts  # Profile tools tests
└── tripTools.test.ts     # Trip tools tests
```

## Tool Categories

### 1. Profile Tools (`profileTools.ts`)
**Functions:**
- `getUserProfile(userId, options)` - Complete user profile data
- `getUserSettings(userId, category?)` - Application settings and preferences  
- `getUserPreferences(userId, options)` - Personalization preferences

**Features:**
- Comprehensive error handling with typed responses
- Default fallbacks for missing data
- Optional data inclusion (financial goals, statistics)
- Category-specific filtering

### 2. Trip Tools (`tripTools.ts`)
**Functions:**
- `getTripHistory(userId, options)` - Past trips with filtering
- `getVehicleData(userId, options)` - Vehicle information and maintenance
- `getFuelData(userId, options)` - Fuel consumption and cost analysis
- `getTripPlans(userId, options)` - Upcoming planned trips

**Features:**
- Advanced filtering (date ranges, trip types, vehicle-specific)
- Performance metrics calculation (MPG, efficiency trends)
- Station analysis and cost breakdowns
- Maintenance tracking and insurance data

### 3. Tool Registry (`toolRegistry.ts`)
**Purpose:** Defines all 10 tools with JSON Schema compliance for Claude API

**Tools Defined:**
1. **getUserExpenses** - Expense tracking and analysis
2. **getUserBudgets** - Budget monitoring and alerts
3. **getIncomeData** - Income sources and projections
4. **calculateSavings** - Savings goals and rates
5. **getUserProfile** - User information and goals
6. **getUserSettings** - App preferences and config
7. **getUpcomingEvents** - Calendar and deadlines
8. **getTripHistory** - Travel history analysis
9. **getVehicleData** - Vehicle and maintenance info
10. **getFuelData** - Fuel tracking and efficiency

## Type System

### Common Response Pattern
```typescript
interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

### Key Types
- `UserProfile` - Complete user profile structure
- `UserSettings` - Application settings and preferences
- `Trip` - Trip data with locations, costs, and metadata
- `Vehicle` - Vehicle information, maintenance, and insurance
- `FuelRecord` - Individual fuel purchase with efficiency data
- `TripPlan` - Future trip planning and cost estimates

## Error Handling

### Graceful Degradation
- **Database errors**: Clear error messages, logging, retry guidance
- **Missing data**: Default values, partial data handling
- **Network issues**: Timeout handling, offline-friendly responses
- **Invalid inputs**: Input validation, helpful error messages

### Logging Strategy
```typescript
logger.debug('Getting user profile', { userId, options });
logger.error('Error fetching user profile', error);
```

## Testing Strategy

### Test Coverage
- **Unit tests**: Individual function testing with mocked dependencies
- **Integration tests**: End-to-end data flow testing
- **Error scenarios**: Database failures, network issues, edge cases
- **Data integrity**: Currency calculations, date handling, efficiency metrics

### Mock Strategy
- Supabase client fully mocked
- Logger mocked for testing
- Various data scenarios (empty, partial, complete, malformed)
- Error injection for robustness testing

## Integration with Claude

### Tool Registration
```typescript
import { getToolsForClaude } from '@/services/pam/tools/toolRegistry';
const tools = getToolsForClaude(); // Format for Claude API
```

### SimplePAM Integration
```typescript
const response = await claudeService.chat(messages, {
  systemPrompt,
  tools: pamTools // Automatically includes all 10 tools
});
```

## Usage Examples

### Profile Data Retrieval
```typescript
import { getUserProfile } from '@/services/pam/tools/profileTools';

const result = await getUserProfile('user-123', {
  include_financial_goals: true,
  include_statistics: true
});

if (result.success) {
  console.log(`User: ${result.data.full_name}`);
  console.log(`Emergency fund target: $${result.data.financial_goals.emergency_fund_target}`);
}
```

### Trip Analysis
```typescript
import { getTripHistory, getFuelData } from '@/services/pam/tools/tripTools';

// Get recent business trips
const trips = await getTripHistory('user-123', {
  trip_type: 'business',
  start_date: '2023-12-01',
  limit: 10
});

// Analyze fuel efficiency
const fuelData = await getFuelData('user-123', {
  include_efficiency: true,
  include_stations: true
});
```

## Future Enhancements

### Planned Additions (Days 5-7)
1. **Financial Tools Implementation**
   - `getUserExpenses()` - Expense tracking and categorization
   - `getUserBudgets()` - Budget monitoring and alerts
   - `getIncomeData()` - Income sources and trends
   - `calculateSavings()` - Savings goals and progress

2. **Calendar Tools Implementation**
   - `getUpcomingEvents()` - Events, bills, and deadlines

3. **Advanced Features**
   - Real-time data synchronization
   - Caching layer for performance
   - Batch operations for efficiency
   - WebSocket updates for live data

## Performance Considerations

### Database Optimization
- Indexed queries for common filters (user_id, date ranges)
- Efficient joins with vehicle and profile data
- Limit clauses to prevent large data transfers
- Selective field loading based on options

### Caching Strategy
- Profile data: 15-minute cache (infrequently changed)
- Settings: 5-minute cache (occasionally changed) 
- Trip data: 1-hour cache for historical data
- Real-time data: No caching for current trips/fuel

### Error Recovery
- Automatic retry for transient failures
- Graceful degradation with cached data
- User-friendly error messages
- Comprehensive logging for debugging

## Security Considerations

### Data Protection
- User ID validation on all requests
- Row-level security (RLS) enforcement
- Sensitive data filtering (no passwords, tokens)
- Audit logging for data access

### Input Validation
- Date format validation
- Numeric range checking
- Enum value validation
- SQL injection prevention through Supabase client

## Monitoring and Observability

### Metrics to Track
- Function execution times
- Database query performance
- Error rates by tool type
- Data completeness percentages
- User engagement with different tools

### Logging Strategy
- Debug: Parameter logging and execution flow
- Info: Successful operations and data counts
- Warn: Data quality issues or performance concerns
- Error: Failures, exceptions, and recovery actions

---

This tool system provides the foundation for PAM's data access capabilities, enabling natural language interaction with comprehensive user financial and travel data through Claude AI.