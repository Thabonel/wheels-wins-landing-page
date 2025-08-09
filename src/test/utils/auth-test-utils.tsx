import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'sonner';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { 
  mockUser, 
  mockSession, 
  mockAdminUser, 
  mockAdminSession,
  setMockAuthState,
  triggerAuthStateChange
} from '@/test/mocks/supabase';

/**
 * Authentication test scenarios
 */
export interface AuthTestScenario {
  user: SupabaseUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading?: boolean;
  isDevMode?: boolean;
}

/**
 * Predefined authentication scenarios for testing
 */
export const authScenarios = {
  unauthenticated: {
    user: null,
    session: null,
    isAuthenticated: false,
    loading: false,
    isDevMode: false
  } as AuthTestScenario,

  authenticatedUser: {
    user: mockUser,
    session: mockSession,
    isAuthenticated: true,
    loading: false,
    isDevMode: false
  } as AuthTestScenario,

  authenticatedAdmin: {
    user: mockAdminUser,
    session: mockAdminSession,
    isAuthenticated: true,
    loading: false,
    isDevMode: false
  } as AuthTestScenario,

  loading: {
    user: null,
    session: null,
    isAuthenticated: false,
    loading: true,
    isDevMode: false
  } as AuthTestScenario,

  devMode: {
    user: null,
    session: null,
    isAuthenticated: false,
    loading: false,
    isDevMode: true
  } as AuthTestScenario,

  devModeAuthenticated: {
    user: mockUser,
    session: mockSession,
    isAuthenticated: true,
    loading: false,
    isDevMode: true
  } as AuthTestScenario
};

/**
 * Custom render options for authentication tests
 */
interface AuthRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authScenario?: AuthTestScenario;
  initialRoute?: string;
}

/**
 * Creates a wrapper component with all necessary providers for auth testing
 */
const createAuthWrapper = (scenario?: AuthTestScenario, initialRoute?: string) => {
  // Set up mock auth state if scenario provided
  if (scenario) {
    setMockAuthState(scenario.user, scenario.session);
  }

  return ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <Toaster />
            {children}
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };
};

/**
 * Custom render function for authentication components
 */
export const renderWithAuth = (
  ui: React.ReactElement,
  options?: AuthRenderOptions
) => {
  const { authScenario, initialRoute, ...renderOptions } = options || {};

  // Set initial route if provided
  if (initialRoute) {
    window.history.pushState({}, 'Test page', initialRoute);
  }

  return render(ui, {
    wrapper: createAuthWrapper(authScenario, initialRoute),
    ...renderOptions
  });
};

/**
 * Helper to simulate authentication state changes during tests
 */
export const simulateAuthStateChange = (
  event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED',
  session: Session | null = null
) => {
  triggerAuthStateChange(event, session);
};

/**
 * Helper to create custom user data for tests
 */
export const createTestUser = (overrides: Partial<SupabaseUser> = {}): SupabaseUser => ({
  id: 'test-user-id',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
  email_confirmed_at: '2024-01-01T00:00:00.000Z',
  phone: '',
  confirmed_at: '2024-01-01T00:00:00.000Z',
  last_sign_in_at: '2024-01-01T00:00:00.000Z',
  app_metadata: {},
  user_metadata: {
    full_name: 'Test User'
  },
  identities: [],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  is_anonymous: false,
  ...overrides
});

/**
 * Helper to create custom session data for tests
 */
export const createTestSession = (
  user?: SupabaseUser,
  overrides: Partial<Session> = {}
): Session => ({
  access_token: 'mock_access_token',
  refresh_token: 'mock_refresh_token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: user || mockUser,
  ...overrides
});

/**
 * Helper to create admin user with specified email
 */
export const createAdminUser = (email = 'admin@wheelsandwins.com'): SupabaseUser => 
  createTestUser({
    id: 'admin-user-id',
    email,
    user_metadata: {
      full_name: 'Admin User'
    }
  });

/**
 * Helper to create test scenarios for different user types
 */
export const createUserScenario = (
  userType: 'regular' | 'admin' | 'unconfirmed' | 'custom',
  customUser?: Partial<SupabaseUser>
): AuthTestScenario => {
  let user: SupabaseUser;
  
  switch (userType) {
    case 'admin':
      user = createAdminUser();
      break;
    case 'unconfirmed':
      user = createTestUser({
        email_confirmed_at: null,
        confirmed_at: null
      });
      break;
    case 'custom':
      user = createTestUser(customUser);
      break;
    default:
      user = mockUser;
  }

  const session = createTestSession(user);

  return {
    user,
    session,
    isAuthenticated: userType !== 'unconfirmed',
    loading: false,
    isDevMode: false
  };
};

/**
 * Mock form submission helper
 */
export const mockFormSubmission = async (
  form: HTMLFormElement,
  preventDefault = true
) => {
  const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
  
  if (preventDefault) {
    submitEvent.preventDefault = jest.fn();
  }

  form.dispatchEvent(submitEvent);
  
  // Wait for any async operations
  await new Promise(resolve => setTimeout(resolve, 0));
};

/**
 * Helper to test authentication flows
 */
export class AuthFlowTester {
  private scenario: AuthTestScenario;

  constructor(initialScenario: AuthTestScenario = authScenarios.unauthenticated) {
    this.scenario = initialScenario;
  }

  /**
   * Simulate user login
   */
  async login(user: SupabaseUser = mockUser, session: Session = mockSession) {
    this.scenario = {
      user,
      session,
      isAuthenticated: true,
      loading: false,
      isDevMode: false
    };
    
    setMockAuthState(user, session);
    simulateAuthStateChange('SIGNED_IN', session);
    
    return this.scenario;
  }

  /**
   * Simulate user logout
   */
  async logout() {
    this.scenario = {
      user: null,
      session: null,
      isAuthenticated: false,
      loading: false,
      isDevMode: false
    };
    
    setMockAuthState(null, null);
    simulateAuthStateChange('SIGNED_OUT', null);
    
    return this.scenario;
  }

  /**
   * Simulate token refresh
   */
  async refreshToken(newSession: Session) {
    this.scenario = {
      ...this.scenario,
      session: newSession
    };
    
    setMockAuthState(this.scenario.user, newSession);
    simulateAuthStateChange('TOKEN_REFRESHED', newSession);
    
    return this.scenario;
  }

  /**
   * Get current scenario
   */
  getCurrentScenario() {
    return this.scenario;
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.scenario = authScenarios.unauthenticated;
    setMockAuthState(null, null);
    return this.scenario;
  }
}

/**
 * Helper to test protected routes
 */
export const testProtectedRoute = async (
  component: React.ReactElement,
  options: {
    authenticated?: boolean;
    adminRequired?: boolean;
    expectedRedirect?: string;
  } = {}
) => {
  const {
    authenticated = false,
    adminRequired = false,
    expectedRedirect = '/login'
  } = options;

  let scenario: AuthTestScenario;

  if (authenticated) {
    scenario = adminRequired ? authScenarios.authenticatedAdmin : authScenarios.authenticatedUser;
  } else {
    scenario = authScenarios.unauthenticated;
  }

  const result = renderWithAuth(component, { authScenario: scenario });

  if (!authenticated || (adminRequired && !scenario.user?.email?.includes('admin'))) {
    // Should redirect
    await result.findByTestId('navigate-mock');
    expect(result.getByTestId('navigate-mock')).toHaveAttribute('data-to', expectedRedirect);
  } else {
    // Should render content
    expect(result.queryByTestId('navigate-mock')).not.toBeInTheDocument();
  }

  return result;
};

/**
 * Helper to validate form inputs
 */
export const validateFormInputs = (
  container: HTMLElement,
  expectedFields: { label: string; type: string; required?: boolean }[]
) => {
  expectedFields.forEach(field => {
    const input = container.querySelector(`input[type="${field.type}"]`) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    
    if (field.required) {
      expect(input).toHaveAttribute('required');
    }
  });
};

/**
 * Helper to test OAuth button functionality
 */
export const testOAuthButtons = async (
  container: HTMLElement,
  providers: ('google' | 'facebook')[] = ['google', 'facebook']
) => {
  providers.forEach(provider => {
    const button = container.querySelector(`button[aria-label*="${provider}" i], button:has-text("${provider}")`) as HTMLButtonElement;
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });
};

/**
 * Accessibility test helpers
 */
export const validateAccessibility = (container: HTMLElement) => {
  // Check for form labels
  const inputs = container.querySelectorAll('input');
  inputs.forEach(input => {
    const label = container.querySelector(`label[for="${input.id}"]`);
    expect(label || input.getAttribute('aria-label')).toBeTruthy();
  });

  // Check for error alerts
  const alerts = container.querySelectorAll('[role="alert"]');
  alerts.forEach(alert => {
    expect(alert).toHaveTextContent(/\S/); // Should have non-whitespace content
  });

  // Check for proper heading hierarchy
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length > 0) {
    expect(headings[0].tagName).toBe('H1'); // Should start with h1
  }
};

/**
 * Performance test helper
 */
export const measureRenderTime = async (renderFn: () => any) => {
  const start = performance.now();
  const result = renderFn();
  const end = performance.now();
  
  return {
    result,
    renderTime: end - start
  };
};

/**
 * Helper to test error boundaries
 */
export const testErrorBoundary = (
  component: React.ReactElement,
  errorToThrow: Error
) => {
  const ThrowError = () => {
    throw errorToThrow;
  };

  const ComponentWithError = () => (
    <div>
      {component}
      <ThrowError />
    </div>
  );

  expect(() => renderWithAuth(<ComponentWithError />)).not.toThrow();
};

export default {
  renderWithAuth,
  authScenarios,
  simulateAuthStateChange,
  createTestUser,
  createTestSession,
  createAdminUser,
  createUserScenario,
  AuthFlowTester,
  testProtectedRoute,
  validateFormInputs,
  testOAuthButtons,
  validateAccessibility,
  measureRenderTime,
  testErrorBoundary
};