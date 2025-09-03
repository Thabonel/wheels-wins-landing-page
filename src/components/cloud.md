# Components Architecture Context

## 🎯 Component System Overview

The Wheels & Wins component library is built on a foundation of reusable, accessible, and performant React components following atomic design principles.

## 🏗️ Component Hierarchy

### Atomic Design Structure
```
components/
├── ui/                  # Atoms - Base components
│   ├── button.tsx       # Base button component
│   ├── input.tsx        # Form input component
│   ├── dialog.tsx       # Modal/dialog component
│   └── card.tsx         # Container component
├── composite/           # Molecules - Component combinations
│   ├── SearchBar.tsx    # Input + Button combination
│   ├── UserCard.tsx     # Avatar + Text combination
│   └── FormField.tsx    # Label + Input + Error
├── feature/             # Organisms - Feature components
│   ├── wheels/          # Trip planning features
│   ├── wins/            # Financial management
│   ├── social/          # Community features
│   └── pam/             # AI assistant components
└── layout/              # Templates - Page layout components
    ├── Header.tsx       # Site navigation
    ├── Footer.tsx       # Site footer
    └── Layout.tsx       # Main page wrapper
```

## 🎨 Design System Components

### Base UI Components (ui/)
Built on **Radix UI** primitives with **Shadcn UI** styling:

- **Button**: Multiple variants, sizes, and states
- **Input**: Text, email, password, number inputs
- **Select**: Dropdown selection component
- **Dialog**: Modal dialogs and overlays
- **Card**: Content container component
- **Badge**: Status and category indicators
- **Alert**: Success, warning, error messages
- **Tabs**: Tabbed content navigation
- **Accordion**: Collapsible content sections
- **Progress**: Loading and completion indicators

### Form Components
- **Form**: React Hook Form integration
- **FormField**: Label, input, validation wrapper
- **FormMessage**: Error and help text display
- **Checkbox**: Single and group selections
- **RadioGroup**: Exclusive option selection
- **Switch**: Toggle controls
- **Slider**: Range input controls

## 🚗 Wheels Components (Trip Planning)

### Core Trip Planning
```
wheels/
├── TripPlannerApp.tsx           # Main trip planning interface
├── TripTemplates.tsx            # Pre-built journey templates
├── trip-planner/
│   ├── fresh/                   # Basic trip planner
│   │   └── FreshTripPlanner.tsx
│   ├── RouteOptimizer.tsx       # AI-powered route optimization
│   ├── WaypointManager.tsx      # Stop management
│   └── CampgroundFinder.tsx     # Campground search and booking
├── trips/
│   ├── SavedTrips.tsx           # User's saved journeys
│   ├── TripHistory.tsx          # Completed trip records
│   └── TripSharing.tsx          # Social sharing features
└── navigation/
    ├── MapIntegration.tsx       # Mapbox GL integration
    ├── GPSTracker.tsx           # Real-time location
    └── OfflineNavigation.tsx    # Offline map capabilities
```

### Key Features
- **AI Route Planning**: Integration with PAM for optimal routes
- **Multi-modal Transport**: RV, car, walking, cycling options
- **Real-time Traffic**: Live traffic and road condition updates
- **Campground Integration**: Search, reviews, and booking
- **Weather Integration**: Route planning with weather considerations

## 💰 Wins Components (Financial Management)

### Financial Dashboard
```
wins/
├── WinsOverview.tsx             # Financial dashboard
├── expenses/
│   ├── ExpenseTracker.tsx       # Expense entry and categorization
│   ├── ExpenseChart.tsx         # Visual expense analysis
│   ├── ExpenseCategories.tsx    # Category management
│   └── BankStatementImport.tsx  # Automated expense import
├── income/
│   ├── IncomeTracker.tsx        # Income recording
│   ├── IncomeChart.tsx          # Income visualization
│   └── IncomeCategories.tsx     # Income source management
├── budgets/
│   ├── BudgetPlanner.tsx        # Budget creation and management
│   ├── BudgetTracking.tsx       # Real-time budget monitoring
│   └── BudgetAlerts.tsx         # Overspend notifications
└── moneymaker/
    ├── OpportunityFinder.tsx    # Income opportunity suggestions
    ├── SkillMarketplace.tsx     # RV-friendly job board
    └── PassiveIncomeTracker.tsx # Investment and passive income
```

### Key Features
- **Automated Categorization**: AI-powered expense classification
- **Multi-currency Support**: International travel expense tracking
- **Bank Integration**: Secure bank statement import
- **Budget Alerts**: Proactive spending notifications
- **Tax Preparation**: Export data for tax filing

## 🤖 PAM Components (AI Assistant)

### AI Interface Components
```
pam/
├── Pam.tsx                      # Main AI assistant interface
├── PamSimple.tsx                # Simplified chat interface
├── chat/
│   ├── ChatInterface.tsx        # Conversational UI
│   ├── MessageBubble.tsx        # Individual message display
│   ├── TypingIndicator.tsx      # AI thinking indicator
│   └── VoiceInterface.tsx       # Speech-to-text integration
├── controls/
│   ├── PamToggle.tsx            # Show/hide assistant
│   ├── VoiceControls.tsx        # Mic and speaker controls
│   └── SettingsPanel.tsx        # AI preferences
└── integrations/
    ├── TripIntegration.tsx      # Trip planning assistance
    ├── ExpenseIntegration.tsx   # Financial advice
    └── WeatherIntegration.tsx   # Weather-aware suggestions
```

### AI Capabilities
- **Natural Language Processing**: Conversational trip planning
- **Voice Interface**: Speech recognition and text-to-speech
- **Context Awareness**: Understands user preferences and history
- **Multi-modal Interaction**: Text, voice, and visual responses
- **Real-time Learning**: Adapts to user behavior patterns

## 👥 Social Components (Community)

### Community Features
```
social/
├── CommunityDashboard.tsx       # Social activity feed
├── profiles/
│   ├── UserProfile.tsx          # User profile management
│   ├── ExpertProfile.tsx        # Expert advisor profiles
│   └── ProfileSettings.tsx      # Privacy and preferences
├── groups/
│   ├── TravelGroups.tsx         # Group trip coordination
│   ├── InterestGroups.tsx       # Hobby and interest communities
│   └── LocalMeetups.tsx         # Location-based gatherings
├── content/
│   ├── TripReports.tsx          # User travel stories
│   ├── PhotoSharing.tsx         # Travel photography
│   ├── TipsAndTricks.tsx        # Community knowledge sharing
│   └── QAForum.tsx              # Question and answer system
└── messaging/
    ├── DirectMessages.tsx       # Private user communication
    ├── GroupChat.tsx            # Group conversation features
    └── NotificationCenter.tsx   # Activity and message alerts
```

## 🎨 Component Development Standards

### TypeScript Patterns
```typescript
// Component Props Interface
interface ComponentProps {
  title: string;
  onAction?: (data: ComponentData) => void;
  variant?: 'default' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children?: React.ReactNode;
}

// Component with Default Props
export const Component: React.FC<ComponentProps> = ({
  title,
  onAction,
  variant = 'default',
  size = 'md',
  disabled = false,
  children
}) => {
  // Component implementation
};
```

### Styling Conventions
- **Tailwind Classes**: Utility-first styling approach
- **CSS Variables**: Theme customization and dark mode
- **Responsive Design**: Mobile-first breakpoint system
- **Accessibility**: ARIA attributes and keyboard navigation

### State Management in Components
- **Local State**: useState for component-specific state
- **Form State**: React Hook Form for form management
- **Global State**: Context API for cross-component state
- **Server State**: Direct Supabase client for data fetching

## 🧪 Component Testing

### Testing Approach
```typescript
// Component Test Example
describe('TripPlannerApp', () => {
  it('renders trip planning interface', () => {
    render(<TripPlannerApp />);
    expect(screen.getByText('Plan Your Journey')).toBeInTheDocument();
  });

  it('handles route optimization', async () => {
    const mockOptimize = jest.fn();
    render(<TripPlannerApp onOptimize={mockOptimize} />);
    
    fireEvent.click(screen.getByText('Optimize Route'));
    await waitFor(() => expect(mockOptimize).toHaveBeenCalled());
  });
});
```

### Testing Tools
- **React Testing Library**: Component testing utilities
- **Jest**: Test runner and mocking framework
- **MSW**: API request mocking
- **Playwright**: E2E testing for complete workflows

## 🔧 Component Utilities

### Common Hooks
- **useComponent**: Component-specific state management
- **useValidation**: Form validation logic
- **useAPI**: Data fetching and mutations
- **useLocalStorage**: Persistent local state

### Helper Functions
- **classNames**: Conditional CSS class management
- **formatters**: Data formatting utilities
- **validators**: Input validation functions
- **api-clients**: Component-specific API calls

## 📱 Responsive Component Design

### Breakpoint Strategy
- **Mobile First**: Base styles for mobile devices
- **Progressive Enhancement**: Add features for larger screens
- **Touch Optimization**: Touch-friendly interface elements
- **Performance**: Lazy loading for non-critical components

### Accessibility Standards
- **WCAG 2.1 AA**: Web Content Accessibility Guidelines
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Readers**: ARIA labels and descriptions
- **Color Contrast**: Minimum 4.5:1 contrast ratio

---

**Component System Version**: 2.1  
**Last Updated**: January 31, 2025  
**Component Count**: 150+ components  
**Test Coverage**: 85%+