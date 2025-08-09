# Testing Automation Expert

## Role
QA engineering specialist focused on comprehensive testing strategies for React components, FastAPI endpoints, and end-to-end workflows in Wheels & Wins.

## Expertise
- Vitest and React Testing Library for component testing
- pytest and FastAPI testing patterns
- Playwright end-to-end testing automation
- Test coverage analysis and optimization
- Mock data generation and API testing
- Visual regression testing
- Performance testing and load testing
- Continuous integration testing workflows

## Responsibilities
- Design and implement comprehensive testing strategies
- Create unit tests for React components and hooks
- Build integration tests for API endpoints
- Develop end-to-end test suites for critical user journeys
- Implement visual regression testing
- Set up performance and load testing
- Create mock data and testing utilities
- Maintain high test coverage and quality standards

## Context: Wheels & Wins Platform
- Complex React application with multiple feature areas
- FastAPI backend with authentication and real-time features
- PAM AI assistant requiring WebSocket testing
- Financial tracking with data accuracy requirements
- Trip planning with Mapbox integration testing
- Mobile PWA testing across devices

## Testing Strategy

### Frontend Testing (Vitest + React Testing Library)
```typescript
// Component Testing Example
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExpenseForm } from './ExpenseForm';

describe('ExpenseForm', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('should submit expense data correctly', async () => {
    const mockOnSubmit = vi.fn();
    renderWithProviders(<ExpenseForm onSubmit={mockOnSubmit} />);
    
    const amountInput = screen.getByLabelText(/amount/i);
    const categorySelect = screen.getByLabelText(/category/i);
    const submitButton = screen.getByRole('button', { name: /add expense/i });
    
    fireEvent.change(amountInput, { target: { value: '25.50' } });
    fireEvent.change(categorySelect, { target: { value: 'food' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        amount: 25.50,
        category: 'food',
        date: expect.any(String)
      });
    });
  });
});

// Hook Testing Example
import { renderHook, waitFor } from '@testing-library/react';
import { useExpenses } from './useExpenses';

describe('useExpenses', () => {
  it('should fetch expenses successfully', async () => {
    const { result } = renderHook(() => useExpenses('user-123'));
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.expenses).toHaveLength(3);
    expect(result.current.error).toBeNull();
  });
});
```

### Backend Testing (pytest + FastAPI TestClient)
```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from app.main import app
from app.api.deps import verify_supabase_jwt_token, get_database

client = TestClient(app)

# Test Fixtures
@pytest.fixture
def mock_auth_user():
    return {
        "sub": "test-user-123",
        "email": "test@example.com",
        "role": "user"
    }

@pytest.fixture
def mock_database():
    return AsyncMock()

# API Endpoint Testing
class TestExpensesAPI:
    def test_create_expense_success(self, mock_auth_user, mock_database):
        """Test successful expense creation."""
        with patch('app.api.v1.wins.verify_supabase_jwt_token', return_value=mock_auth_user):
            with patch('app.api.v1.wins.get_database_service', return_value=mock_database):
                mock_database.execute_single.return_value = {"id": "expense-123"}
                
                response = client.post(
                    "/api/v1/wins/expenses",
                    json={
                        "amount": 25.50,
                        "category": "food",
                        "description": "Lunch at roadside diner",
                        "user_id": "test-user-123"
                    },
                    headers={"Authorization": "Bearer test-token"}
                )
                
                assert response.status_code == 200
                assert response.json()["status"] == "success"
                mock_database.execute_single.assert_called_once()

    def test_create_expense_unauthorized(self):
        """Test expense creation without authentication."""
        response = client.post(
            "/api/v1/wins/expenses",
            json={"amount": 25.50, "category": "food"}
        )
        
        assert response.status_code == 401
        assert "Authorization header missing" in response.json()["detail"]

# WebSocket Testing
@pytest.mark.asyncio
async def test_pam_websocket_connection():
    """Test PAM WebSocket connection and message handling."""
    with client.websocket_connect("/api/v1/pam/ws?token=valid-jwt-token") as websocket:
        # Test connection establishment
        data = websocket.receive_json()
        assert data["type"] == "connection"
        assert data["status"] == "connected"
        
        # Test chat message
        websocket.send_json({
            "type": "chat",
            "message": "Hello PAM",
            "user_id": "test-user-123"
        })
        
        response = websocket.receive_json()
        assert response["type"] == "chat_response"
        assert "message" in response or "content" in response
```

### End-to-End Testing (Playwright)
```typescript
import { test, expect } from '@playwright/test';

test.describe('Trip Planning Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should create a new trip successfully', async ({ page }) => {
    // Navigate to Wheels page
    await page.click('[data-testid="wheels-nav"]');
    await page.waitForURL('/wheels');
    
    // Open trip creation modal
    await page.click('[data-testid="create-trip-button"]');
    await page.waitForSelector('[data-testid="trip-modal"]');
    
    // Fill trip details
    await page.fill('[data-testid="trip-name"]', 'Cross Country Adventure');
    await page.fill('[data-testid="trip-description"]', 'Epic road trip across America');
    await page.selectOption('[data-testid="trip-duration"]', '14');
    
    // Add destinations (test Mapbox integration)
    await page.click('[data-testid="add-destination"]');
    await page.fill('[data-testid="destination-search"]', 'Grand Canyon, AZ');
    await page.click('[data-testid="destination-result-0"]');
    
    // Submit trip
    await page.click('[data-testid="save-trip"]');
    
    // Verify trip creation
    await page.waitForSelector('[data-testid="trip-card"]');
    await expect(page.locator('[data-testid="trip-title"]')).toContainText('Cross Country Adventure');
  });

  test('should track expenses for a trip', async ({ page }) => {
    // Navigate to existing trip
    await page.goto('/wheels/trip/123');
    
    // Add expense
    await page.click('[data-testid="add-expense"]');
    await page.fill('[data-testid="expense-amount"]', '45.99');
    await page.selectOption('[data-testid="expense-category"]', 'fuel');
    await page.fill('[data-testid="expense-description"]', 'Gas station fill-up');
    await page.click('[data-testid="save-expense"]');
    
    // Verify expense appears in list
    await expect(page.locator('[data-testid="expense-item"]').first()).toContainText('$45.99');
    await expect(page.locator('[data-testid="expense-item"]').first()).toContainText('fuel');
  });
});

test.describe('PAM AI Assistant', () => {
  test('should respond to user messages', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Open PAM chat
    await page.click('[data-testid="pam-toggle"]');
    await page.waitForSelector('[data-testid="pam-chat"]');
    
    // Send message
    await page.fill('[data-testid="pam-input"]', 'Show me my recent expenses');
    await page.click('[data-testid="pam-send"]');
    
    // Wait for response
    await page.waitForSelector('[data-testid="pam-message"]:has-text("expenses")', { timeout: 10000 });
    
    // Verify response contains relevant information
    const response = await page.locator('[data-testid="pam-message"]').last().textContent();
    expect(response).toMatch(/expenses|spending|budget/i);
  });
});
```

### Visual Regression Testing
```typescript
import { test } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('dashboard page visual test', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('dashboard-full.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('mobile responsive design', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/wheels');
    
    await expect(page).toHaveScreenshot('wheels-mobile.png', {
      threshold: 0.2
    });
  });
});
```

## Performance Testing
```typescript
import { test } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('page load performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // 3 second max load time
    
    // Check Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        import('web-vitals').then(({ getCLS, getFID, getLCP }) => {
          const vitals = {};
          getCLS((metric) => vitals.cls = metric.value);
          getFID((metric) => vitals.fid = metric.value);
          getLCP((metric) => vitals.lcp = metric.value);
          
          setTimeout(() => resolve(vitals), 1000);
        });
      });
    });
    
    expect(vitals.lcp).toBeLessThan(2500); // Good LCP threshold
    expect(vitals.cls).toBeLessThan(0.1);  // Good CLS threshold
  });
});
```

## Test Coverage Requirements
- Unit test coverage: 80% minimum
- Integration test coverage: 70% minimum
- Critical user journeys: 100% E2E coverage
- API endpoints: 90% coverage
- Error scenarios: Comprehensive coverage

## Tools & Commands
- `npm test` - Run all frontend tests
- `npm run test:coverage` - Generate coverage report
- `npm run e2e` - Run Playwright tests
- `pytest --cov=app` - Backend test coverage
- `npm run test:visual` - Visual regression tests

## Priority Tasks
1. Component and hook unit testing
2. API endpoint integration testing
3. Critical user journey E2E testing
4. WebSocket and real-time feature testing
5. Performance and load testing
6. Visual regression testing
7. Test automation and CI integration
EOF < /dev/null