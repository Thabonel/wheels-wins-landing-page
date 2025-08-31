# Trip Templates Feature Documentation
**Old Trip Planner "Plan Your Trip" Feature Analysis**

## Overview
The "Plan Your Trip" feature in the old trip planner provides a comprehensive template system that allows users to:
1. Browse pre-configured trip templates based on their region
2. Select and chain multiple trips to create a journey (up to 3 trips)
3. Apply templates directly to the map with routes, waypoints, and budget settings
4. Search and filter templates by duration, difficulty, and category

## Architecture Components

### 1. Main Components

#### TripPlannerApp.tsx
- **Location**: `src/components/wheels/TripPlannerApp.tsx`
- **Purpose**: Main container that orchestrates the trip planning experience
- **Key Features**:
  - Tab-based navigation with "Plan Your Trip" as the default tab
  - Handles template selection and application to the map
  - Integrates with trip state management

#### TripTemplates.tsx
- **Location**: `src/components/wheels/TripTemplates.tsx`
- **Purpose**: Main template browser and journey builder
- **Key Features**:
  - Displays trip templates in a grid layout
  - Journey Builder: Allows chaining up to 3 trips
  - Search functionality with PAM integration
  - Advanced filtering system
  - Region-based template loading

#### TripTemplateCard.tsx
- **Location**: `src/components/wheels/trip-templates/TripTemplateCard.tsx`
- **Purpose**: Individual template card display
- **Key Features**:
  - Dynamic map preview generation using Mapbox Static API
  - Shows key metrics: days, miles, budget
  - Difficulty badges and category icons
  - "Add to Journey" functionality

### 2. Data Flow

```
User Selects Region → Load Templates from Database → Display in Grid
         ↓
User Filters/Searches → Apply Filters → Update Display
         ↓
User Selects Templates → Add to Journey Builder
         ↓
User Clicks "Use Journey" → Apply to Map → Populate Route/Budget
```

## Key Features Analysis

### 1. Template Selection System

**Single Template Usage:**
```typescript
const handleUseTemplate = async (template: TripTemplate) => {
  // Increment usage counter
  await incrementTemplateUsage(template.id);
  
  // Apply to integrated state
  integratedState.setBudget({
    totalBudget: template.suggestedBudget,
    dailyBudget: Math.round(template.suggestedBudget / template.estimatedDays)
  });
  
  // Set route data
  if (template.route) {
    integratedState.setOriginName(origin.name);
    integratedState.setDestName(destination.name);
    // Set waypoints...
  }
};
```

### 2. Journey Builder (Trip Chaining)

**Multi-Trip Journey Creation:**
- Users can select up to 3 trips to chain together
- Automatic calculation of total days, miles, and budget
- Visual journey panel showing selected trips in sequence
- Combined journey acts as a single mega-template

**Implementation:**
```typescript
const handleUseJourney = () => {
  const journeyTemplate: TripTemplate = {
    ...baseTemplate,
    name: `${selectedTrips.length}-Trip Journey`,
    estimatedDays: totalDays,
    estimatedMiles: totalMiles,
    suggestedBudget: totalBudget,
    highlights: selectedTrips.flatMap(t => t.highlights).slice(0, 6)
  };
  handleUseTemplate(journeyTemplate);
};
```

### 3. Search and Filter System

**Search Features:**
- Text search across name, description, and highlights
- PAM assistant integration for AI-powered search
- Real-time filtering as user types

**Filter Categories:**
- **Duration**: 1-3 days, 4-7 days, 8-14 days, 15+ days
- **Difficulty**: Beginner, Intermediate, Advanced
- **Category**: Coastal, Mountains, National Parks, Scenic, Cultural, Outback

### 4. Dynamic Map Preview

**Smart Map Generation:**
```typescript
const getTemplateImage = () => {
  // Hierarchical location detection:
  // 1. Check template name for specific routes
  // 2. Check highlights for landmarks
  // 3. Use region coordinates as fallback
  // 4. Select appropriate map style (satellite for coast/outback, streets for overview)
  
  return `https://api.mapbox.com/styles/v1/mapbox/${mapStyle}/static/${marker}/${centerLon},${centerLat},${zoom},0/400x200@2x`;
};
```

### 5. Database Integration

**Template Storage Structure:**
```typescript
interface TripTemplate {
  id: string;
  name: string;
  description: string;
  estimatedDays: number;
  estimatedMiles: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  highlights: string[];
  suggestedBudget: number;
  route: {
    origin: { name: string; coords: [number, number] };
    destination: { name: string; coords: [number, number] };
    waypoints: Array<{ name: string; coords: [number, number] }>;
    mapPreview?: string;
  };
  region: Region;
  category: string;
  tags: string[];
  usageCount: number;
  isPublic: boolean;
  createdBy?: string;
}
```

## Implementation Guide for New Trip Planner

### Phase 1: Basic Template Display
1. **Add Templates Tab to FreshRouteToolbar**
   - New button with template icon
   - Toggle state management
   
2. **Create FreshTripTemplates Component**
   - Simplified version of TripTemplates.tsx
   - Focus on core browsing functionality
   - Use existing Card components for consistency

3. **Integrate with FreshTripPlanner State**
   - Add template selection handler
   - Connect to existing route state management

### Phase 2: Template Application
1. **Route Population**
   - Parse template route data
   - Apply origin/destination to map
   - Add waypoints in sequence
   
2. **Budget Integration**
   - Connect to existing BudgetSidebar
   - Auto-populate budget fields from template

3. **Metadata Storage**
   - Store selected template info
   - Display template name in status bar

### Phase 3: Journey Builder
1. **Multi-Template Selection**
   - Add selection checkboxes to cards
   - Create journey summary panel
   
2. **Journey Calculation**
   - Sum up days, miles, budget
   - Merge waypoints in sequence
   
3. **Apply Combined Journey**
   - Create mega-route from multiple templates
   - Handle complex waypoint sequencing

### Phase 4: Search and Filters
1. **Search Implementation**
   - Text search across template fields
   - Integrate with existing search patterns
   
2. **Filter System**
   - Duration, difficulty, category filters
   - Real-time result updates

### Component Structure for New Implementation

```typescript
// FreshTripTemplates.tsx
interface FreshTripTemplatesProps {
  onSelectTemplate: (template: TripTemplate) => void;
  isVisible: boolean;
  onClose: () => void;
}

// Integration in FreshTripPlanner.tsx
const [showTemplates, setShowTemplates] = useState(false);

const handleTemplateSelect = (template: TripTemplate) => {
  // Apply template to map
  if (template.route) {
    // Set origin, destination, waypoints
    // Update budget
    // Close template panel
  }
};

// Add to toolbar
<FreshRouteToolbar
  onToggleTemplates={() => setShowTemplates(!showTemplates)}
  showTemplates={showTemplates}
  // ... other props
/>

// Add panel
{showTemplates && (
  <FreshTripTemplates
    onSelectTemplate={handleTemplateSelect}
    isVisible={showTemplates}
    onClose={() => setShowTemplates(false)}
  />
)}
```

## Key Considerations

### 1. Mobile Responsiveness
- Template cards adapt to screen size
- Journey panel slides up on mobile
- Touch-friendly interactions

### 2. Performance
- Lazy load template images
- Paginate large template lists
- Cache template data locally

### 3. User Experience
- Clear visual hierarchy
- Intuitive journey building
- Immediate feedback on actions
- Preserve user selections

### 4. Data Management
- Sync with Supabase database
- Handle offline scenarios
- Incremental usage tracking

## Migration Checklist

- [ ] Create FreshTripTemplates component
- [ ] Add Templates button to toolbar
- [ ] Implement template display grid
- [ ] Connect template selection to map
- [ ] Add journey builder functionality
- [ ] Implement search and filters
- [ ] Test template application to routes
- [ ] Verify budget integration
- [ ] Ensure mobile responsiveness
- [ ] Add loading and error states
- [ ] Document new features

## Benefits of Implementation

1. **User Value**
   - Quick trip planning with proven routes
   - Budget estimation upfront
   - Discover new destinations
   - Chain trips for extended adventures

2. **Technical Benefits**
   - Reusable template system
   - Reduced user input friction
   - Increased engagement metrics
   - Data-driven route suggestions

3. **Business Value**
   - Track popular routes
   - Understand user preferences
   - Generate content automatically
   - Enable sponsored templates

## Summary

The "Plan Your Trip" feature is a sophisticated template system that significantly enhances the trip planning experience. It combines:
- Pre-configured regional templates
- Multi-trip journey building
- Smart search and filtering
- Direct map integration
- Budget planning

Implementing this in the new Trip Planner 2 will provide users with a powerful starting point for their adventures while maintaining the flexibility to customize their routes.