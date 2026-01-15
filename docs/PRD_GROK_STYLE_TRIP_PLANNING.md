# Product Requirements Document: Grok-Style Trip Planning

**Version:** 1.0
**Date:** January 15, 2025
**Author:** Development Team
**Status:** Approved for Implementation

---

## Executive Summary

Implement Tesla Grok-inspired trip planning capabilities where users can speak or type natural language commands to PAM and have routes automatically appear on the map with quick-action buttons. This feature bridges the gap between PAM's existing trip planning intelligence and the visual map interface.

---

## Background & Research

### Tesla Grok Navigation (2025 Holiday Update)

Tesla released Grok Navigation in software version 2025.44.25, enabling:

- **Natural Language Commands**: "Plan a lunch stop with outdoor seating halfway to Portland"
- **Multi-Waypoint in Single Command**: "Find a Supercharger near a coffee shop that isn't a chain"
- **Descriptive Queries**: Reference ambience, products, or half-remembered details
- **Intelligent Route Curation**: Routes based on preferences, traffic, real-time events
- **Immediate Map Visualization**: Routes appear instantly on vehicle display

**Sources:**
- [Tesla Grok Support](https://www.tesla.com/support/grok)
- [First Look at Grok Navigation](https://www.notateslaapp.com/news/3410/first-look-at-grok-navigation-videos)
- [Tesla 2025 Holiday Update](https://driveteslacanada.ca/news/tesla-2025-holiday-update-grok-navigation-supercharger-site-maps-more/)

### Current State Analysis

**What We Have:**
- PAM Trip Tools (backend): `plan_trip`, `optimize_route`, `find_rv_parks`, `find_attractions`, `mapbox_tool`
- Frontend Trip Planner: `FreshTripPlanner.tsx` with full Mapbox integration
- Waypoint Management: `useFreshWaypointManager.ts` hook
- Voice Mode: Hybrid OpenAI/Claude system (recently fixed)

**The Gap:**
PAM's trip tools return structured data but don't push it to the map. Users must manually add waypoints after receiving PAM's suggestions.

```
Current Flow:
User: "Plan a trip from Sydney to Melbourne"
PAM: Returns JSON with waypoints → DATA EXISTS
Map: Nothing happens → NO CONNECTION

Desired Flow:
User: "Plan a trip from Sydney to Melbourne"
PAM: Returns JSON with waypoints
Map: Route appears automatically with confirmation dialog
```

---

## Goals & Success Metrics

### Primary Goals
1. Enable natural language trip planning with automatic map visualization
2. Reduce friction between PAM suggestions and map interaction
3. Support both text and voice input seamlessly

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Trip planning completion rate | +30% | Analytics: trips saved after PAM interaction |
| Time to first route | <10 seconds | From command to route displayed |
| Voice command success rate | >85% | Trip tools invoked correctly via voice |
| User satisfaction | 4.5+ stars | In-app feedback on feature |

---

## User Stories

### Primary Personas
- **Road Tripper Rachel**: Plans multi-day RV trips, wants scenic routes with pet-friendly stops
- **Weekend Warrior Will**: Quick trip planning, values speed over customization
- **Caravan Carol**: Needs RV-specific considerations (height, weight, campgrounds)

### User Stories

**US-1: Basic Trip Planning**
> As a user, I want to say "Plan a trip from Sydney to Melbourne" and see the route appear on my map so I can visualize my journey immediately.

**US-2: Multi-Stop Planning**
> As a user, I want to say "Add a lunch stop halfway and find a campground near the coast" so I can build complex itineraries with voice commands.

**US-3: Incremental Building**
> As a user, I want to say "Add a stop at Canberra" to my existing route so I can refine my trip iteratively.

**US-4: RV-Specific Needs**
> As an RV owner, I want to say "Find RV parks with full hookups along my route" and have them added as waypoints.

**US-5: Route Confirmation**
> As a user, I want to review suggested routes before they're applied so I can modify or reject inappropriate suggestions.

---

## Functional Requirements

### FR-1: PAM-to-Map Bridge (Core)

**FR-1.1: Trip Action Types**
```typescript
interface PAMTripAction {
  type: 'ADD_WAYPOINTS' | 'REPLACE_ROUTE' | 'ADD_STOP' | 'OPTIMIZE';
  waypoints: Array<{
    name: string;
    coordinates: [number, number]; // [lng, lat]
    type: 'origin' | 'destination' | 'waypoint';
    description?: string;
    poiType?: string; // 'rv_park', 'restaurant', 'fuel', etc.
  }>;
  metadata?: {
    totalDistance?: number;      // meters
    totalDuration?: number;      // seconds
    suggestedStops?: string[];
    estimatedFuelCost?: number;
  };
  requiresConfirmation: boolean;
}
```

**FR-1.2: Event Bridge**
- Pub/sub pattern for decoupled communication
- Subscribe/unsubscribe mechanism for map components
- Dispatch method for PAM service to send actions

**FR-1.3: Action Detection**
PAM responses containing trip tool results must be detected and converted to `PAMTripAction`:
- Detect `plan_trip` tool calls → `REPLACE_ROUTE` action
- Detect `find_rv_parks` → `ADD_WAYPOINTS` action
- Detect `optimize_route` → `OPTIMIZE` action

### FR-2: Map Integration (Core)

**FR-2.1: Route Application**
- Listen for `PAMTripAction` events
- Convert waypoints to Mapbox-compatible format
- Calculate route via Mapbox Directions API
- Render route line and waypoint markers

**FR-2.2: Confirmation Dialog**
For actions with `requiresConfirmation: true`:
- Display route preview with distance/duration
- Quick-action buttons: "Apply Route", "Modify", "Cancel"
- Mini-map preview (optional enhancement)

**FR-2.3: Smart Confirmation Logic**
| Action Type | Waypoint Count | Confirmation |
|-------------|----------------|--------------|
| REPLACE_ROUTE | Any | Always |
| ADD_STOP | 1 | Auto-apply |
| ADD_WAYPOINTS | 2+ | Show dialog |
| OPTIMIZE | Any | Show dialog (changes existing) |

### FR-3: Backend Standardization

**FR-3.1: Tool Response Format**
All trip tools must return consistent `map_action` field:
```python
{
    "success": True,
    "map_action": {
        "type": "REPLACE_ROUTE",
        "waypoints": [
            {"name": "Sydney", "coordinates": [151.2093, -33.8688], "type": "origin"},
            {"name": "Canberra", "coordinates": [149.1300, -35.2809], "type": "waypoint"},
            {"name": "Melbourne", "coordinates": [144.9631, -37.8136], "type": "destination"}
        ],
        "metadata": {
            "totalDistance": 878000,
            "totalDuration": 32400,
            "estimatedFuelCost": 150
        }
    },
    "message": "I've planned a route from Sydney to Melbourne via Canberra..."
}
```

**FR-3.2: Geocoding**
Tools must geocode location names to coordinates before returning.

### FR-4: Natural Language Support

**FR-4.1: Intent Keywords**
Recognize and route to appropriate tools:
- "plan a trip", "route to", "how do I get to", "directions to"
- "stop for lunch", "find a place to eat along the way"
- "add a stop at", "include X in my route"
- "scenic route", "fastest way", "avoid highways"
- "find RV parks", "campgrounds near", "where can I stay"

**FR-4.2: Context Awareness**
When user is on Wheels page with an active route:
- PAM should offer to add suggestions to current route
- "Would you like me to add this to your trip?"

---

## Non-Functional Requirements

### NFR-1: Performance
- Route calculation: <3 seconds
- Map rendering: <1 second after route received
- Voice transcription to action: <5 seconds total

### NFR-2: Reliability
- Fallback to straight-line geometry if Mapbox API fails
- Graceful degradation if bridge events fail
- Retry logic for geocoding failures

### NFR-3: Accessibility
- Voice commands work with screen readers
- Keyboard navigation for confirmation dialog
- High contrast support for route visualization

### NFR-4: Mobile Responsiveness
- Touch-friendly confirmation dialog
- Responsive map controls
- Voice activation accessible on mobile

---

## Technical Architecture

### Component Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────┐  │
│  │ PAM Chat    │───▶│ pamService   │───▶│ PAMTripBridge  │  │
│  │ (text/voice)│    │ .ts          │    │ (event system) │  │
│  └─────────────┘    └──────────────┘    └───────┬────────┘  │
│                                                  │           │
│                                          subscribe│           │
│                                                  ▼           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              FreshTripPlanner.tsx                        ││
│  │  ┌────────────────┐    ┌─────────────────────────────┐  ││
│  │  │ PAMRouteConfirm│    │ useFreshWaypointManager     │  ││
│  │  │ Dialog         │───▶│ (apply waypoints to map)    │  ││
│  │  └────────────────┘    └─────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Backend                               │
│  ┌─────────────┐    ┌──────────────────────────────────────┐│
│  │ PAM Core    │───▶│ Trip Tools                           ││
│  │ (pam.py)    │    │ - plan_trip.py (returns map_action)  ││
│  └─────────────┘    │ - optimize_route.py                  ││
│                     │ - find_rv_parks.py                   ││
│                     │ - mapbox_tool.py                     ││
│                     └──────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Data Flow
```
1. User: "Plan a trip from Sydney to Melbourne with a lunch stop"
   │
2. ▼ PAM processes message, calls plan_trip tool
   │
3. ▼ plan_trip returns { map_action: { type: 'REPLACE_ROUTE', waypoints: [...] } }
   │
4. ▼ pamService detects map_action, calls pamTripBridge.dispatch(action)
   │
5. ▼ FreshTripPlanner receives event via subscription
   │
6. ▼ Confirmation dialog shown (or auto-apply for simple actions)
   │
7. ▼ User clicks "Apply Route"
   │
8. ▼ useFreshWaypointManager.setWaypoints() called
   │
9. ▼ Mapbox Directions API calculates route
   │
10. ▼ Route rendered on map with markers
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Create `PAMTripAction` types (`src/types/pamTripAction.ts`)
- [ ] Create `PAMTripBridge` event system (`src/services/pamTripBridge.ts`)
- [ ] Integrate bridge dispatch into `pamService.ts`

### Phase 2: Map Integration (Week 1-2)
- [ ] Add bridge subscription to `FreshTripPlanner.tsx`
- [ ] Create `PAMRouteConfirmDialog` component
- [ ] Implement route application from PAM actions

### Phase 3: Backend Standardization (Week 2)
- [ ] Update `plan_trip.py` to return `map_action`
- [ ] Update `find_rv_parks.py` to return `map_action`
- [ ] Add geocoding to tool responses

### Phase 4: Polish & Testing (Week 3)
- [ ] Natural language keyword improvements
- [ ] Voice command testing
- [ ] End-to-end integration testing
- [ ] Performance optimization

---

## Files to Create/Modify

### New Files
| File | Description |
|------|-------------|
| `src/types/pamTripAction.ts` | TypeScript interfaces for trip actions |
| `src/services/pamTripBridge.ts` | Pub/sub event bridge |
| `src/components/wheels/trip-planner/fresh/components/PAMRouteConfirmDialog.tsx` | Confirmation UI |

### Modified Files
| File | Changes |
|------|---------|
| `src/services/pamService.ts` | Detect trip actions, dispatch to bridge |
| `src/components/wheels/trip-planner/fresh/FreshTripPlanner.tsx` | Subscribe to bridge, handle actions |
| `backend/app/services/pam/tools/trip/plan_trip.py` | Return `map_action` format |
| `backend/app/services/pam/tools/trip/find_rv_parks.py` | Return `map_action` format |
| `backend/app/services/pam/tools/trip/optimize_route.py` | Return `map_action` format |

---

## Testing Strategy

### Unit Tests
- `PAMTripBridge`: subscribe, unsubscribe, dispatch
- `PAMTripAction` type guards and validators
- Waypoint coordinate transformation

### Integration Tests
- PAM response → bridge dispatch → map render
- Voice command → trip tool → map action
- Confirmation dialog flow

### E2E Tests
1. Text: "Plan a trip from Sydney to Melbourne" → route on map
2. Voice: "Find RV parks near Brisbane" → waypoints on map
3. Incremental: "Add a stop at Canberra" → route updated

### Manual Testing Checklist
- [ ] Text command creates route
- [ ] Voice command creates route
- [ ] Confirmation dialog displays correctly
- [ ] "Apply Route" renders on map
- [ ] "Cancel" dismisses without changes
- [ ] Multiple waypoints render in order
- [ ] Route distance/duration shown correctly
- [ ] Works on mobile (touch, voice)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mapbox API rate limits | Route calculation fails | Implement caching, fallback geometry |
| Geocoding failures | Wrong coordinates | Validate results, show error toast |
| Voice transcription errors | Wrong command interpreted | Confirmation dialog catches mistakes |
| Complex natural language | Tool not triggered | Improve keyword matching iteratively |

---

## Future Enhancements

1. **Route Preview in Chat**: Mini-map thumbnail in PAM response bubble
2. **Undo Stack**: Revert PAM-applied routes
3. **Smart Replace vs Add**: Detect user intent for existing routes
4. **Traffic Integration**: Real-time traffic in route suggestions
5. **Collaborative Planning**: Multiple users building same route

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Owner | | | Pending |
| Tech Lead | | | Pending |
| Design | | | Pending |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-15 | Initial PRD |
