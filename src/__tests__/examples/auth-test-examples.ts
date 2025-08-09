/**
 * Authentication Testing Examples
 * 
 * This file provides practical examples of how to use the authentication
 * testing utilities and patterns in the Wheels & Wins project.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { 
  renderWithAuth,
  authScenarios,
  AuthFlowTester,
  createTestUser,
  createTestSession,
  testProtectedRoute
} from '@/test/utils/auth-test-utils';
import {
  mockSupabaseAuth,
  setMockAuthState,
  triggerAuthStateChange,
  resetAllMocks
} from '@/test/mocks/supabase';

// Example 1: Testing a component that requires authentication
export const exampleAuthenticatedComponent = () => {
  const MyProtectedComponent = () => (
    <div data-testid="protected-component">Protected Content</div>
  );

  // Test with authenticated user
  const testAuthenticated = () => {
    renderWithAuth(<MyProtectedComponent />, {
      authScenario: authScenarios.authenticatedUser
    });

    expect(screen.getByTestId('protected-component')).toBeInTheDocument();
  };

  // Test with unauthenticated user
  const testUnauthenticated = () => {
    renderWithAuth(<MyProtectedComponent />, {
      authScenario: authScenarios.unauthenticated
    });

    // Component should still render, but auth context will be unauthenticated
    expect(screen.getByTestId('protected-component')).toBeInTheDocument();
  };
};

// Example 2: Testing form components with authentication
export const exampleFormTesting = () => {
  const MyLoginForm = () => (
    <form data-testid="login-form">
      <input type="email" placeholder="Email" />
      <input type="password" placeholder="Password" />
      <button type="submit">Login</button>
    </form>
  );

  const testFormSubmission = async () => {
    // Mock successful authentication
    mockSupabaseAuth.signInWithPassword.mockResolvedValue({
      data: { user: createTestUser(), session: createTestSession() },
      error: null
    });

    renderWithAuth(<MyLoginForm />, {
      authScenario: authScenarios.unauthenticated
    });

    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  };
};

// Example 3: Testing authentication state changes
export const exampleAuthStateChanges = () => {
  const MyComponent = () => {
    // Component that responds to auth state
    return <div data-testid="my-component">Component</div>;
  };

  const testStateChanges = async () => {
    const authTester = new AuthFlowTester();

    const { rerender } = renderWithAuth(<MyComponent />, {
      authScenario: authScenarios.unauthenticated
    });

    // Simulate login
    await authTester.login();
    rerender(<MyComponent />);

    // Simulate logout
    await authTester.logout();
    rerender(<MyComponent />);

    // Simulate token refresh
    const newSession = createTestSession(createTestUser(), {
      access_token: 'new_token'
    });
    await authTester.refreshToken(newSession);
    rerender(<MyComponent />);
  };
};

// Example 4: Testing protected routes
export const exampleProtectedRoutes = () => {
  const ProtectedPage = () => (
    <div data-testid="protected-page">Protected Page Content</div>
  );

  const testProtectedAccess = async () => {
    // Test unauthenticated access (should redirect)
    await testProtectedRoute(<ProtectedPage />, {
      authenticated: false,
      expectedRedirect: '/login'
    });

    // Test authenticated access (should show content)
    await testProtectedRoute(<ProtectedPage />, {
      authenticated: true
    });

    // Test admin-only access
    await testProtectedRoute(<ProtectedPage />, {
      authenticated: true,
      adminRequired: true
    });
  };
};

// Example 5: Testing admin authorization
export const exampleAdminTesting = () => {
  const AdminComponent = () => (
    <div data-testid="admin-component">Admin Only Content</div>
  );

  const testAdminAccess = () => {
    // Test with admin user
    const adminUser = createTestUser({
      email: 'admin@wheelsandwins.com'
    });

    renderWithAuth(<AdminComponent />, {
      authScenario: {
        user: adminUser,
        session: createTestSession(adminUser),
        isAuthenticated: true,
        loading: false,
        isDevMode: false
      }
    });

    expect(screen.getByTestId('admin-component')).toBeInTheDocument();
  };

  const testRegularUserAccess = () => {
    // Test with regular user
    renderWithAuth(<AdminComponent />, {
      authScenario: authScenarios.authenticatedUser
    });

    // Component renders but admin features should be hidden
    expect(screen.getByTestId('admin-component')).toBeInTheDocument();
  };
};

// Example 6: Testing error states
export const exampleErrorTesting = () => {
  const ErrorProneComponent = () => (
    <div data-testid="error-component">Component with potential errors</div>
  );

  const testAuthenticationError = async () => {
    // Mock authentication error
    const authError = new Error('Invalid credentials');
    mockSupabaseAuth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: authError
    });

    renderWithAuth(<ErrorProneComponent />, {
      authScenario: authScenarios.unauthenticated
    });

    // Simulate login attempt that fails
    // Component should handle error gracefully
  };

  const testNetworkError = async () => {
    // Mock network error
    mockSupabaseAuth.signInWithPassword.mockRejectedValue(
      new Error('Network request failed')
    );

    renderWithAuth(<ErrorProneComponent />, {
      authScenario: authScenarios.unauthenticated
    });

    // Component should handle network errors
  };
};

// Example 7: Testing custom hooks with authentication
export const exampleCustomHookTesting = () => {
  // Example custom hook that uses authentication
  const useUserProfile = () => {
    // Hook implementation would go here
    return { profile: null, loading: false };
  };

  const testCustomHook = async () => {
    const { result } = renderHook(() => useUserProfile(), {
      wrapper: ({ children }) => 
        renderWithAuth(<div>{children}</div>, {
          authScenario: authScenarios.authenticatedUser
        }).container.firstChild as any
    });

    expect(result.current.loading).toBe(false);
  };
};

// Example 8: Testing OAuth flows
export const exampleOAuthTesting = () => {
  const OAuthComponent = () => (
    <div>
      <button onClick={() => mockSupabaseAuth.signInWithOAuth({ provider: 'google' })}>
        Login with Google
      </button>
    </div>
  );

  const testGoogleOAuth = async () => {
    mockSupabaseAuth.signInWithOAuth.mockResolvedValue({
      data: { provider: 'google', url: 'https://oauth.google.com' },
      error: null
    });

    renderWithAuth(<OAuthComponent />, {
      authScenario: authScenarios.unauthenticated
    });

    const googleButton = screen.getByRole('button', { name: /login with google/i });
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google'
      });
    });
  };
};

// Example 9: Testing loading states
export const exampleLoadingStates = () => {
  const LoadingComponent = () => (
    <div data-testid="loading-component">
      Loading component
    </div>
  );

  const testLoadingState = () => {
    renderWithAuth(<LoadingComponent />, {
      authScenario: authScenarios.loading
    });

    expect(screen.getByTestId('loading-component')).toBeInTheDocument();
  };
};

// Example 10: Testing complete authentication flows
export const exampleCompleteFlows = () => {
  const App = () => (
    <div data-testid="app">
      Full App Component
    </div>
  );

  const testCompleteLoginFlow = async () => {
    const authTester = new AuthFlowTester();

    // Start unauthenticated
    const { rerender } = renderWithAuth(<App />, {
      authScenario: authScenarios.unauthenticated
    });

    // Simulate successful login
    const user = createTestUser({ email: 'user@example.com' });
    const session = createTestSession(user);
    
    await authTester.login(user, session);
    rerender(<App />);

    // App should now show authenticated state
    expect(screen.getByTestId('app')).toBeInTheDocument();

    // Simulate logout
    await authTester.logout();
    rerender(<App />);

    // App should now show unauthenticated state
    expect(screen.getByTestId('app')).toBeInTheDocument();
  };
};

// Example 11: Common test setup patterns
export const exampleTestSetup = () => {
  describe('MyAuthComponent', () => {
    beforeEach(() => {
      // Always reset mocks before each test
      resetAllMocks();
    });

    it('should render for authenticated users', () => {
      renderWithAuth(<div data-testid="test">Test</div>, {
        authScenario: authScenarios.authenticatedUser
      });
      
      expect(screen.getByTestId('test')).toBeInTheDocument();
    });

    it('should handle authentication state changes', async () => {
      const { rerender } = renderWithAuth(<div data-testid="test">Test</div>, {
        authScenario: authScenarios.unauthenticated
      });

      // Change to authenticated state
      const user = createTestUser();
      const session = createTestSession(user);
      setMockAuthState(user, session);
      triggerAuthStateChange('SIGNED_IN', session);

      rerender(<div data-testid="test">Test</div>);

      await waitFor(() => {
        expect(screen.getByTestId('test')).toBeInTheDocument();
      });
    });
  });
};

// Example 12: Advanced testing patterns
export const exampleAdvancedPatterns = () => {
  const ComplexComponent = () => (
    <div data-testid="complex">Complex Component</div>
  );

  // Test with custom user scenario
  const testCustomScenario = () => {
    const customUser = createTestUser({
      email: 'custom@example.com',
      user_metadata: { role: 'premium' }
    });

    const customScenario = {
      user: customUser,
      session: createTestSession(customUser),
      isAuthenticated: true,
      loading: false,
      isDevMode: false
    };

    renderWithAuth(<ComplexComponent />, {
      authScenario: customScenario
    });

    expect(screen.getByTestId('complex')).toBeInTheDocument();
  };

  // Test rapid state changes
  const testRapidStateChanges = async () => {
    const authTester = new AuthFlowTester();
    const { rerender } = renderWithAuth(<ComplexComponent />, {
      authScenario: authScenarios.unauthenticated
    });

    // Rapidly change states
    await authTester.login();
    rerender(<ComplexComponent />);

    await authTester.logout();
    rerender(<ComplexComponent />);

    await authTester.login();
    rerender(<ComplexComponent />);

    // Component should handle all changes gracefully
    expect(screen.getByTestId('complex')).toBeInTheDocument();
  };
};

export default {
  exampleAuthenticatedComponent,
  exampleFormTesting,
  exampleAuthStateChanges,
  exampleProtectedRoutes,
  exampleAdminTesting,
  exampleErrorTesting,
  exampleCustomHookTesting,
  exampleOAuthTesting,
  exampleLoadingStates,
  exampleCompleteFlows,
  exampleTestSetup,
  exampleAdvancedPatterns
};