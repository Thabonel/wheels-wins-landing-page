# Frontend Architecture Context (src/)

## 🎯 Frontend Overview

The Wheels & Wins frontend is a modern React 18 application built with TypeScript, Vite, and Tailwind CSS, designed for responsive RV travel and financial management.

## 🏗️ Architecture Patterns

### Component Architecture
- **Functional Components**: All components use React hooks
- **Composition over Inheritance**: Component reusability through props
- **Modular Structure**: Each feature has its own component directory
- **TypeScript Integration**: Strict typing for all components and props

### State Management
- **React Context**: Global state for authentication and user settings
- **Local State**: Component-specific state with useState/useReducer
- **Server State**: React Query patterns for API data management
- **Form State**: React Hook Form with Zod validation

## 📁 Directory Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (Shadcn)
│   ├── wheels/          # Trip planning components
│   ├── wins/            # Financial management components
│   ├── social/          # Community features
│   └── pam/             # AI assistant interface
├── pages/               # Route components
├── hooks/               # Custom React hooks
├── services/            # API clients and external integrations
├── lib/                 # Utilities and helper functions
├── context/             # React Context providers
└── types/               # TypeScript type definitions
```

## 🔧 Key Technologies

### Core Stack
- **React 18.3**: Latest React with concurrent features
- **TypeScript**: Strict type checking and IntelliSense
- **Vite 5.4.19**: Fast development server and build tool
- **Tailwind 3.4.11**: Utility-first CSS framework

### UI Framework
- **Radix UI**: Accessible component primitives (25+ components)
- **Shadcn UI**: Pre-built component library
- **Lucide React**: Icon library
- **React Hook Form**: Form handling with validation

### State & Data
- **React Context**: Authentication and global state
- **Supabase Client**: Database and authentication
- **React Query**: Server state management (where used)
- **Zod**: Schema validation

## 🎨 Design System

### Color Palette
- **Primary**: Blue theme for navigation and CTAs
- **Secondary**: Green accent for success states
- **Neutral**: Gray scale for backgrounds and text
- **Semantic**: Red for errors, yellow for warnings

### Typography
- **System Fonts**: Using system font stack for performance
- **Headings**: Consistent sizing scale (text-xs to text-6xl)
- **Body Text**: Optimized for readability across devices

### Spacing & Layout
- **Grid System**: CSS Grid and Flexbox layouts
- **Container**: Max-width containers for content
- **Responsive**: Mobile-first design approach
- **Touch Targets**: Minimum 44px for mobile usability

## 🔌 API Integration

### Supabase Integration
- **Authentication**: JWT-based user authentication
- **Database**: Direct client connections with RLS
- **Real-time**: Subscriptions for live data updates
- **Storage**: File upload and management

### External APIs
- **Mapbox**: Maps and geocoding services
- **OpenAI**: AI-powered features through backend
- **Payment Processing**: Stripe integration
- **Analytics**: Google Analytics and Hotjar

### Backend Communication
- **REST APIs**: Standard HTTP requests
- **WebSocket**: Real-time PAM communication
- **Error Handling**: Comprehensive error boundaries
- **Loading States**: Consistent loading indicators

## 📱 Responsive Design

### Breakpoints
- **Mobile**: 0-767px (primary focus)
- **Tablet**: 768-1023px
- **Desktop**: 1024px+
- **Large**: 1440px+ (optional enhancements)

### Mobile Optimization
- **Touch-First**: All interactions optimized for touch
- **Thumb Navigation**: Critical actions within thumb reach
- **Performance**: Optimized for slower mobile connections
- **Offline**: PWA capabilities for offline usage

## 🚀 Performance Optimization

### Code Splitting
- **Route-based**: Lazy loading for page components
- **Component-based**: Heavy components loaded on demand
- **Vendor Splitting**: Separate bundles for libraries
- **Dynamic Imports**: Runtime code loading

### Asset Optimization
- **Image Optimization**: WebP format with fallbacks
- **Font Loading**: Optimized font loading strategies
- **CSS Purging**: Unused Tailwind classes removed
- **Bundle Analysis**: Regular bundle size monitoring

## 🧪 Testing Strategy

### Testing Pyramid
- **Unit Tests**: Component logic and utility functions
- **Integration Tests**: Component interactions and API calls
- **E2E Tests**: Complete user workflows with Playwright
- **Visual Tests**: Screenshot comparisons for UI consistency

### Testing Tools
- **Vitest**: Fast unit test runner
- **React Testing Library**: Component testing utilities
- **Playwright**: Cross-browser E2E testing
- **MSW**: API mocking for tests

## 🔐 Security Considerations

### Client-Side Security
- **Input Sanitization**: XSS prevention on user inputs
- **CSP Headers**: Content Security Policy implementation
- **Secure Storage**: Sensitive data handling
- **Authentication**: Secure token management

### Data Protection
- **Local Storage**: Minimal sensitive data storage
- **Session Management**: Proper session handling
- **Error Handling**: No sensitive data in error messages
- **HTTPS Only**: All requests over secure connections

## 🎯 Component Standards

### Component Structure
```typescript
interface ComponentProps {
  title: string;
  onAction: (data: string) => void;
  isLoading?: boolean;
}

export const MyComponent: React.FC<ComponentProps> = ({
  title,
  onAction,
  isLoading = false
}) => {
  // Implementation
};
```

### Naming Conventions
- **Components**: PascalCase (UserProfile, TripPlanner)
- **Files**: PascalCase for components, camelCase for utilities
- **Props**: camelCase with clear descriptive names
- **Events**: onAction pattern (onClick, onSubmit, onValidate)

## 🔄 State Management Patterns

### Context Usage
```typescript
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Custom Hooks
- **Data Fetching**: useUserData, useTripData
- **Form Management**: useFormValidation, useFormSubmit
- **UI State**: useModal, useToast, useLoading
- **Business Logic**: useExpenseCalculator, useTripPlanner

## 📊 Performance Monitoring

### Core Web Vitals
- **LCP**: Largest Contentful Paint < 2.5s
- **FID**: First Input Delay < 100ms
- **CLS**: Cumulative Layout Shift < 0.1
- **INP**: Interaction to Next Paint < 200ms

### Monitoring Tools
- **Google Analytics**: User behavior and performance
- **Sentry**: Error tracking and performance monitoring
- **Lighthouse**: Regular performance audits
- **Bundle Analyzer**: Build size analysis

---

**Context Version**: 2.1  
**Last Updated**: January 31, 2025  
**Maintained By**: Frontend Development Team