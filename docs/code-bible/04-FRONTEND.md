# 04 - Frontend Documentation

**Purpose:** React/TypeScript frontend development reference.

---

## Technology Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.5.3 | Type safety |
| Vite | 5.4.19 | Build tool |
| Tailwind CSS | 3.4.11 | Styling |
| Radix UI | Latest | Component library |
| React Router | 6.26.2 | Routing |
| React Query | 5.x | Data fetching |
| Zustand | 5.x | State management |
| Mapbox GL | 3.11.1 | Maps |

---

## Project Structure

```
src/
+-- App.tsx                    # Root component, routes
+-- main.tsx                   # Entry point
+-- index.css                  # Global styles
+-- vite-env.d.ts              # Vite type definitions
+-- components/
|   +-- admin/                 # Admin dashboard
|   |   +-- AdminDashboard.tsx
|   |   +-- AmazonProducts.tsx
|   +-- pam/                   # PAM AI assistant
|   |   +-- PamAssistant.tsx   # Main chat interface
|   |   +-- PamVoiceButton.tsx # Voice activation
|   |   +-- PamSavingsSummaryCard.tsx
|   +-- shop/                  # Marketplace
|   |   +-- ShopPage.tsx
|   |   +-- ProductCard.tsx
|   +-- wheels/                # Trip planning
|   |   +-- FreshTripPlanner.tsx
|   |   +-- MapComponent.tsx
|   |   +-- RouteOptimizer.tsx
|   +-- wins/                  # Financial
|   |   +-- WinsOverview.tsx
|   |   +-- ExpenseTracker.tsx
|   |   +-- BudgetChart.tsx
|   +-- you/                   # Profile
|   |   +-- ProfileSettings.tsx
|   +-- social/                # Community
|   |   +-- SocialFeed.tsx
|   +-- ui/                    # Shared UI (Radix)
|       +-- button.tsx
|       +-- dialog.tsx
|       +-- toast.tsx
+-- pages/
|   +-- Home.tsx
|   +-- Wheels.tsx
|   +-- Wins.tsx
|   +-- Social.tsx
|   +-- Shop.tsx
|   +-- You.tsx
|   +-- AdminDashboard.tsx
+-- services/
|   +-- pamService.ts          # PAM WebSocket client
|   +-- api.ts                 # REST API client
+-- hooks/
|   +-- useAuth.ts             # Authentication
|   +-- usePam.ts              # PAM state
|   +-- useUserSettings.ts     # User preferences
+-- types/
|   +-- pamContext.ts          # PAM context types
|   +-- database.types.ts      # Supabase types
+-- utils/
|   +-- pamLocationContext.ts  # Location helpers
+-- integrations/
|   +-- supabase/
|       +-- client.ts          # Supabase client
|       +-- types.ts           # Generated types
+-- stores/
    +-- userStore.ts           # Zustand store
```

---

## Component Patterns

### Page Component

```tsx
// src/pages/Wheels.tsx

import { useAuth } from '@/hooks/useAuth';
import { FreshTripPlanner } from '@/components/wheels/FreshTripPlanner';
import { PamAssistant } from '@/components/pam/PamAssistant';

export default function Wheels() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Trip Planning</h1>

      <FreshTripPlanner userId={user.id} />

      {/* PAM floating assistant */}
      <PamAssistant page="wheels" />
    </div>
  );
}
```

### Feature Component

```tsx
// src/components/wheels/FreshTripPlanner.tsx

import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';

interface FreshTripPlannerProps {
  userId: string;
}

export function FreshTripPlanner({ userId }: FreshTripPlannerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  // Fetch saved trips
  const { data: trips, isLoading } = useQuery({
    queryKey: ['trips', userId],
    queryFn: () => fetchTrips(userId),
  });

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-98.5795, 39.8283], // US center
      zoom: 4,
    });

    // Add geolocate control
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    });
    map.current.addControl(geolocate);

    return () => map.current?.remove();
  }, []);

  const handlePlanTrip = async () => {
    // Call PAM to plan trip
    const result = await pamService.sendMessage(
      `Plan a trip from ${origin} to ${destination}`,
      { page: 'wheels' }
    );
    // Handle result...
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <input
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="Origin"
          className="flex-1 p-2 border rounded"
        />
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Destination"
          className="flex-1 p-2 border rounded"
        />
        <Button onClick={handlePlanTrip}>Plan Trip</Button>
      </div>

      <div ref={mapContainer} className="h-[500px] rounded-lg" />
    </div>
  );
}
```

### UI Component (Radix-based)

```tsx
// src/components/ui/button.tsx

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

---

## PAM Service (WebSocket Client)

```typescript
// src/services/pamService.ts

import { getPamLocationContext } from '@/utils/pamLocationContext';

class PamService {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnects = 5;

  async connect(userId: string, token: string): Promise<void> {
    const wsUrl = `${import.meta.env.VITE_PAM_WEBSOCKET_URL}/${userId}?token=${token}`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('PAM WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      };

      this.ws.onclose = () => {
        this.handleDisconnect(userId, token);
      };

      this.ws.onerror = (error) => {
        console.error('PAM WebSocket error:', error);
        reject(error);
      };
    });
  }

  async sendMessage(
    message: string,
    context: Record<string, any> = {}
  ): Promise<string> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    // Get location context
    const locationContext = await getPamLocationContext();

    return new Promise((resolve, reject) => {
      const messageId = crypto.randomUUID();

      // Register handler for this message
      this.messageHandlers.set(messageId, (data) => {
        if (data.error) {
          reject(new Error(data.error));
        } else {
          resolve(data.response);
        }
      });

      // Send message
      this.ws!.send(JSON.stringify({
        type: 'chat_message',
        message_id: messageId,
        message,
        context: {
          ...context,
          userLocation: locationContext,
          timestamp: Date.now(),
        },
      }));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.messageHandlers.has(messageId)) {
          this.messageHandlers.delete(messageId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  private handleMessage(data: any) {
    const { message_id, type } = data;

    if (type === 'chat_response' && message_id) {
      const handler = this.messageHandlers.get(message_id);
      if (handler) {
        handler(data);
        this.messageHandlers.delete(message_id);
      }
    }
  }

  private handleDisconnect(userId: string, token: string) {
    if (this.reconnectAttempts < this.maxReconnects) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;

      setTimeout(() => {
        console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
        this.connect(userId, token);
      }, delay);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const pamService = new PamService();
```

---

## State Management (Zustand)

```typescript
// src/stores/userStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  preferences: UserPreferences;
  setUser: (user: User | null) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      preferences: {
        theme: 'system',
        units: 'imperial',
        voiceEnabled: true,
      },

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      updatePreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
);
```

---

## Data Fetching (React Query)

```typescript
// src/hooks/useExpenses.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useExpenses(userId: string) {
  return useQuery({
    queryKey: ['expenses', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: CreateExpenseInput) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert(expense)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate expenses query to refetch
      queryClient.invalidateQueries({ queryKey: ['expenses', data.user_id] });
    },
  });
}
```

---

## Routing

```tsx
// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';

import Home from '@/pages/Home';
import Wheels from '@/pages/Wheels';
import Wins from '@/pages/Wins';
import Social from '@/pages/Social';
import Shop from '@/pages/Shop';
import You from '@/pages/You';
import Auth from '@/pages/Auth';
import AdminDashboard from '@/pages/AdminDashboard';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 1000 * 60, // 1 minute
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/wheels" element={<Wheels />} />
            <Route path="/wins" element={<Wins />} />
            <Route path="/social" element={<Social />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/you" element={<You />} />
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute requireAdmin />}>
            <Route path="/admin/*" element={<AdminDashboard />} />
          </Route>
        </Routes>

        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

---

## Styling (Tailwind CSS)

### Configuration

```javascript
// tailwind.config.js

module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... more color definitions
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

### Common Patterns

```tsx
// Responsive layout
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Items */}
  </div>
</div>

// Card component
<div className="bg-card rounded-lg border shadow-sm p-6">
  <h3 className="text-lg font-semibold">Title</h3>
  <p className="text-muted-foreground">Description</p>
</div>

// Button variants
<Button variant="default" size="lg">Primary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost" size="icon"><Icon /></Button>
```

---

## Testing

### Component Tests

```tsx
// src/__tests__/PamAssistant.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { PamAssistant } from '@/components/pam/PamAssistant';

describe('PamAssistant', () => {
  it('renders chat input', () => {
    render(<PamAssistant page="home" />);
    expect(screen.getByPlaceholderText(/ask pam/i)).toBeInTheDocument();
  });

  it('sends message on submit', async () => {
    render(<PamAssistant page="home" />);

    const input = screen.getByPlaceholderText(/ask pam/i);
    fireEvent.change(input, { target: { value: 'Hello PAM!' } });
    fireEvent.submit(input.closest('form')!);

    // Assert message sent
  });
});
```

### E2E Tests (Playwright)

```typescript
// e2e/pam-chat.spec.ts

import { test, expect } from '@playwright/test';

test('PAM chat works', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="pam-toggle"]');

  const input = page.locator('[data-testid="pam-input"]');
  await input.fill("What's the weather?");
  await input.press('Enter');

  // Wait for response
  await expect(page.locator('[data-testid="pam-response"]')).toBeVisible({
    timeout: 10000,
  });
});
```

---

## Build & Development

### Development Server

```bash
# Start dev server (port 8080)
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Format code
npm run format
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Build for specific environment
npm run build:staging
npm run build:production
```

### Environment Variables

```bash
# .env.development
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_MAPBOX_TOKEN=pk.xxx
VITE_BACKEND_URL=http://localhost:8000
VITE_PAM_WEBSOCKET_URL=ws://localhost:8000/api/v1/pam/ws
VITE_ENVIRONMENT=development

# .env.production
VITE_BACKEND_URL=https://pam-backend.onrender.com
VITE_PAM_WEBSOCKET_URL=wss://pam-backend.onrender.com/api/v1/pam/ws
VITE_ENVIRONMENT=production
```
