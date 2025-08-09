# Authentication Testing Documentation

This directory contains comprehensive tests for the authentication system in the Wheels & Wins application. The test suite covers all authentication components, flows, and edge cases to ensure robust and secure authentication functionality.

## Test Structure

```
src/__tests__/
├── components/
│   ├── auth/
│   │   ├── LoginForm.test.tsx         # Login form component tests
│   │   ├── SignupForm.test.tsx        # Signup form component tests
│   │   └── OAuthButtons.test.tsx      # OAuth buttons component tests
│   └── ProtectedRoute.test.tsx        # Protected route component tests
├── context/
│   └── AuthContext.test.tsx           # Authentication context tests
├── hooks/
│   └── useAdminAuth.test.tsx          # Admin authentication hook tests
├── pages/
│   ├── Login.test.tsx                 # Login page integration tests
│   └── Signup.test.tsx                # Signup page integration tests
├── integration/
│   └── auth-flows.test.tsx            # End-to-end authentication flows
└── README.md                          # This documentation file
```

## Test Utilities

### Supabase Mocks (`src/test/mocks/supabase.ts`)

Comprehensive mocking of Supabase authentication:

```typescript
import { 
  mockUser, 
  mockSession, 
  mockAdminUser,
  setMockAuthState,
  triggerAuthStateChange,
  resetAllMocks 
} from '@/test/mocks/supabase';

// Set up authenticated state
setMockAuthState(mockUser, mockSession);

// Trigger auth state changes
triggerAuthStateChange('SIGNED_IN', mockSession);

// Reset all mocks between tests
resetAllMocks();
```

### Authentication Test Utils (`src/test/utils/auth-test-utils.tsx`)

Specialized utilities for authentication testing:

```typescript
import { 
  renderWithAuth,
  authScenarios,
  AuthFlowTester,
  testProtectedRoute
} from '@/test/utils/auth-test-utils';

// Render components with authentication context
renderWithAuth(<MyComponent />, { 
  authScenario: authScenarios.authenticatedUser 
});

// Test authentication flows
const tester = new AuthFlowTester();
await tester.login(mockUser, mockSession);
await tester.logout();

// Test protected routes
await testProtectedRoute(<ProtectedComponent />, {
  authenticated: true,
  adminRequired: false
});
```

## Test Categories

### 1. Component Tests

#### LoginForm Component (`components/auth/LoginForm.test.tsx`)
- **Form rendering**: Validates all form elements are present
- **Form validation**: Tests email and password requirements
- **Error handling**: Tests various error scenarios and user-friendly messages
- **Form submission**: Tests successful login flow
- **Accessibility**: Validates ARIA labels and keyboard navigation

**Key Test Cases:**
```typescript
it('should render login form with all required fields', () => {
  render(<LoginForm {...mockProps} />);
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
});

it('should handle invalid credentials error with user-friendly message', async () => {
  const error = new Error('Invalid login credentials');
  mockSignIn.mockRejectedValue(error);
  // ... test implementation
});
```

#### SignupForm Component (`components/auth/SignupForm.test.tsx`)
- **Form rendering**: Tests all signup form fields
- **Password validation**: Tests password matching and length requirements
- **User registration**: Tests successful signup flow
- **Error handling**: Tests signup errors and validation

#### OAuthButtons Component (`components/auth/OAuthButtons.test.tsx`)
- **Button rendering**: Tests Google and Facebook OAuth buttons
- **Click handling**: Tests OAuth provider selection
- **Loading states**: Tests disabled state during OAuth process
- **Accessibility**: Tests keyboard navigation and screen reader support

### 2. Context and State Management

#### AuthContext Tests (`context/AuthContext.test.tsx`)
- **Initial state**: Tests default authentication state
- **Authentication methods**: Tests signIn, signUp, signOut functions
- **State changes**: Tests authentication state transitions
- **Session management**: Tests session loading and persistence
- **Error handling**: Tests error states and recovery

**Key Test Cases:**
```typescript
it('should handle successful sign in', async () => {
  const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
  await act(async () => {
    await result.current.signIn('test@example.com', 'password123');
  });
  expect(result.current.isAuthenticated).toBe(true);
});
```

### 3. Authorization and Access Control

#### ProtectedRoute Tests (`components/ProtectedRoute.test.tsx`)
- **Access control**: Tests authenticated vs unauthenticated access
- **Redirects**: Tests redirect behavior for unauthorized users
- **Dev mode**: Tests development mode bypass
- **State changes**: Tests route protection during auth state changes

#### useAdminAuth Hook Tests (`hooks/useAdminAuth.test.tsx`)
- **Admin detection**: Tests admin email recognition
- **Authorization states**: Tests admin vs regular user states
- **Loading states**: Tests async admin status checking
- **Error handling**: Tests admin check failures

### 4. Page Integration Tests

#### Login Page Tests (`pages/Login.test.tsx`)
- **Page rendering**: Tests complete login page layout
- **Form integration**: Tests LoginForm and OAuthButtons integration
- **Navigation**: Tests redirects and route handling
- **OAuth flows**: Tests Google and Facebook OAuth integration

#### Signup Page Tests (`pages/Signup.test.tsx`)
- **Page rendering**: Tests complete signup page layout
- **Form integration**: Tests SignupForm and OAuthButtons integration
- **Validation**: Tests client-side form validation
- **OAuth flows**: Tests OAuth signup with different redirect URLs

### 5. Integration Tests

#### Authentication Flows (`integration/auth-flows.test.tsx`)
- **Complete login flow**: End-to-end login process
- **Complete signup flow**: End-to-end registration process
- **OAuth authentication**: Complete OAuth flows
- **Protected route access**: Authentication-based route access
- **State transitions**: Authentication state change handling

**Key Integration Test:**
```typescript
it('should complete full login flow from login page to protected content', async () => {
  renderWithAuth(<TestApp />, { 
    authScenario: authScenarios.unauthenticated,
    initialRoute: '/login'
  });

  // Fill and submit login form
  // ... form interaction code

  // Verify successful authentication and redirect
  await waitFor(() => {
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });
});
```

## Running Tests

### All Authentication Tests
```bash
npm test src/__tests__
```

### Specific Test Categories
```bash
# Component tests only
npm test src/__tests__/components

# Integration tests only
npm test src/__tests__/integration

# Context tests only
npm test src/__tests__/context
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode for Development
```bash
npm run test:watch
```

## Test Scenarios

### Authentication Scenarios
The test suite covers these key authentication scenarios:

1. **Unauthenticated User**
   - Cannot access protected routes
   - Redirected to login page
   - Can access login/signup pages

2. **Authenticated Regular User**
   - Can access protected routes
   - Cannot access login/signup pages (redirected)
   - Has access to user-specific features

3. **Authenticated Admin User**
   - Can access all protected routes
   - Has admin-specific permissions
   - Recognized by admin email addresses

4. **Loading States**
   - Shows appropriate loading indicators
   - Handles async authentication operations
   - Manages loading state transitions

5. **Error States**
   - Handles network errors gracefully
   - Shows user-friendly error messages
   - Provides error recovery options

6. **Dev Mode**
   - Bypasses authentication in development
   - Allows testing without authentication
   - Maintains normal flow when authenticated

## Mock Data

### Standard Test Users
```typescript
// Regular user
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User'
};

// Admin user
const mockAdminUser = {
  id: 'admin-user-id',
  email: 'admin@wheelsandwins.com',
  full_name: 'Admin User'
};
```

### Authentication States
```typescript
const authScenarios = {
  unauthenticated: { user: null, isAuthenticated: false },
  authenticatedUser: { user: mockUser, isAuthenticated: true },
  authenticatedAdmin: { user: mockAdminUser, isAuthenticated: true },
  loading: { user: null, isAuthenticated: false, loading: true },
  devMode: { user: null, isAuthenticated: false, isDevMode: true }
};
```

## Best Practices

### 1. Test Isolation
- Each test resets all mocks using `resetAllMocks()`
- Tests don't depend on each other's state
- Clean setup and teardown for each test

### 2. Realistic Testing
- Uses actual component interactions (clicks, typing)
- Tests real user workflows and edge cases
- Includes accessibility and keyboard navigation tests

### 3. Comprehensive Coverage
- Tests both happy path and error scenarios
- Covers all authentication states and transitions
- Tests loading states and async operations

### 4. Mock Management
- Centralized mock configuration
- Realistic mock data that matches production
- Easy mock state manipulation for different scenarios

### 5. Accessibility Testing
- Tests screen reader compatibility
- Validates ARIA labels and roles
- Tests keyboard navigation

## Common Test Patterns

### Testing Form Submission
```typescript
it('should handle form submission', async () => {
  render(<LoginForm {...props} />);
  
  const emailInput = screen.getByLabelText(/email/i);
  const passwordInput = screen.getByLabelText(/password/i);
  const submitButton = screen.getByRole('button', { name: /login/i });

  fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
  fireEvent.change(passwordInput, { target: { value: 'password123' } });
  fireEvent.click(submitButton);

  await waitFor(() => {
    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
  });
});
```

### Testing Authentication State Changes
```typescript
it('should update when authentication state changes', async () => {
  const { result, rerender } = renderHook(() => useAuth(), { wrapper: AuthProvider });

  // Initially unauthenticated
  expect(result.current.isAuthenticated).toBe(false);

  // Simulate login
  await authFlowTester.login(mockUser, mockSession);
  rerender();

  await waitFor(() => {
    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

### Testing Protected Routes
```typescript
it('should redirect unauthenticated users', () => {
  renderWithAuth(
    <ProtectedRoute><TestComponent /></ProtectedRoute>,
    { authScenario: authScenarios.unauthenticated }
  );

  expect(screen.getByTestId('navigate-mock')).toHaveAttribute('data-to', '/login');
  expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
});
```

## Troubleshooting

### Common Issues

1. **Mock not working**: Ensure `resetAllMocks()` is called in `beforeEach`
2. **Auth state not updating**: Use `act()` wrapper for state changes
3. **Async operations**: Use `waitFor()` for async assertions
4. **Navigation tests**: Mock React Router components properly

### Debugging Tips

1. **Console logs**: Enable console logs in test setup for debugging
2. **Screen debug**: Use `screen.debug()` to see rendered DOM
3. **Mock verification**: Use `expect().toHaveBeenCalledWith()` to verify mock calls
4. **State inspection**: Log component state in tests for debugging

## Test Coverage Goals

The authentication test suite aims for:
- **95%+ line coverage** for authentication components
- **100% branch coverage** for critical authentication paths
- **90%+ statement coverage** overall
- **Complete scenario coverage** for all authentication flows

## Maintenance

### Adding New Tests
1. Follow existing test patterns and naming conventions
2. Update this documentation for new test categories
3. Ensure new tests use shared utilities and mocks
4. Add integration tests for new authentication features

### Updating Tests
1. Update mocks when Supabase API changes
2. Maintain backward compatibility in test utilities
3. Update documentation when test structure changes
4. Review and update test scenarios for new features

## Security Considerations

### What the Tests Validate
- **Input validation**: Email format, password requirements
- **Error handling**: Secure error messages that don't leak info
- **State management**: Proper cleanup of sensitive data
- **Route protection**: Unauthorized access prevention

### What the Tests Don't Cover
- **Server-side validation**: Handled by Supabase
- **Token security**: Managed by Supabase client
- **Database security**: Row Level Security policies
- **Network security**: HTTPS, CSRF protection

The authentication tests focus on client-side security and user experience while relying on Supabase for server-side security features.