
# API Documentation

Complete reference for the PAM Backend API endpoints, authentication, and integration patterns.

## Base Information

**Base URL**: `https://pam-backend.render.com/api` (Production)  
**Local Development**: `http://localhost:8000/api`  
**API Version**: v1  
**Content-Type**: `application/json`  
**Authentication**: Bearer Token (JWT)

## Authentication

### Overview
PAM uses JWT (JSON Web Tokens) for authentication. All protected endpoints require a valid JWT token in the Authorization header.

### Token Format
```
Authorization: Bearer <jwt_token>
```

### Authentication Endpoints

#### POST /auth/login
Authenticate user and receive JWT token.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### POST /auth/refresh
Refresh an existing JWT token.

**Request Body**:
```json
{
  "refresh_token": "refresh_token_here"
}
```

#### POST /auth/logout
Invalidate current JWT token.

**Headers**: `Authorization: Bearer <token>`

## Health Check Endpoints

### GET /health
Basic health check for monitoring and load balancers.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "service": "pam-backend"
}
```

### GET /health/detailed
Comprehensive health check with system metrics.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "service": "pam-backend",
  "metrics": {
    "cpu_percent": 25.3,
    "memory_percent": 45.2,
    "disk_usage": 60.1,
    "python_version": "3.11.0"
  },
  "environment": "production"
}
```

## WebSocket Endpoints

### WebSocket /ws/{user_id}
Real-time WebSocket connection for PAM AI assistant communication.

**Connection URL**: `wss://pam-backend.onrender.com/ws/{user_id}?token={jwt_token}`

**Authentication**: JWT token in URL parameter

**Connection Flow**:
1. Frontend establishes WebSocket connection
2. Backend validates JWT token
3. Bidirectional message exchange begins
4. Automatic reconnection on disconnect

### WebSocket Message Types

#### Outgoing Messages (Client → Server)

**Chat Message**:
```json
{
  "type": "chat",
  "message": "Help me create a budget for groceries",
  "user_id": "user_uuid",
  "context": {
    "region": "US-West",
    "current_page": "/budgets",
    "session_data": {
      "recent_intents": ["budget", "expense"],
      "intent_counts": {"budget": 3, "expense": 5},
      "last_activity": "2024-01-15T10:30:00Z"
    }
  }
}
```

#### Incoming Messages (Server → Client)

**Chat Response**:
```json
{
  "type": "chat_response",
  "message": "I'd be happy to help you create a grocery budget. Based on your previous spending...",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**UI Actions**:
```json
{
  "type": "ui_actions",
  "actions": [
    {
      "type": "navigate",
      "target": "/budgets/create",
      "data": {
        "category": "groceries",
        "suggested_amount": 400
      }
    }
  ]
}
```

**Action Response**:
```json
{
  "type": "action_response",
  "status": "completed",
  "action_id": "create_budget_123",
  "result": {
    "budget_id": "budget_uuid",
    "category": "groceries",
    "amount": 400
  }
}
```

**Error Response**:
```json
{
  "type": "error",
  "message": "Failed to process request",
  "code": "PROCESSING_ERROR",
  "details": {
    "error_type": "validation",
    "field": "amount"
  }
}
```

**Connection Status**:
```json
{
  "type": "connection",
  "message": "PAM is ready! I can help with expenses, travel planning, and more.",
  "status": "connected"
}
```

### GET /chat/sessions/{session_id}
Retrieve chat session history.

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "session_id": "session_uuid",
  "messages": [
    {
      "id": "message_uuid",
      "type": "user",
      "content": "Help me with my budget",
      "timestamp": "2024-01-15T10:25:00Z"
    },
    {
      "id": "message_uuid",
      "type": "assistant",
      "content": "I'll help you create a budget...",
      "timestamp": "2024-01-15T10:25:30Z"
    }
  ],
  "created_at": "2024-01-15T10:25:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

## User Management Endpoints

### GET /users/profile
Get current user's profile information.

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "id": "user_uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar_url": "https://example.com/avatar.jpg",
  "preferences": {
    "currency": "USD",
    "timezone": "America/New_York",
    "notifications": {
      "email": true,
      "push": false
    }
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### PUT /users/profile
Update current user's profile.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "John Smith",
  "preferences": {
    "currency": "EUR",
    "timezone": "Europe/London"
  }
}
```

### POST /users/upload-avatar
Upload user avatar image.

**Headers**: 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request**: Form data with `avatar` file field

## Budget Management Endpoints

### GET /budgets
Get user's budgets.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `month` (optional): Filter by month (YYYY-MM format)
- `year` (optional): Filter by year (YYYY format)

**Response**:
```json
{
  "budgets": [
    {
      "id": "budget_uuid",
      "name": "Monthly Budget - January 2024",
      "total_amount": 3000.00,
      "categories": [
        {
          "id": "category_uuid",
          "name": "groceries",
          "budgeted_amount": 400.00,
          "spent_amount": 325.50,
          "remaining": 74.50
        }
      ],
      "month": "2024-01",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /budgets
Create a new budget.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Monthly Budget - February 2024",
  "total_amount": 3200.00,
  "month": "2024-02",
  "categories": [
    {
      "name": "groceries",
      "budgeted_amount": 450.00
    },
    {
      "name": "transportation",
      "budgeted_amount": 200.00
    }
  ]
}
```

### PUT /budgets/{budget_id}
Update an existing budget.

**Headers**: `Authorization: Bearer <token>`

**Request Body**: Same as POST /budgets

### DELETE /budgets/{budget_id}
Delete a budget.

**Headers**: `Authorization: Bearer <token>`

## Expense Tracking Endpoints

### GET /expenses
Get user's expenses.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `start_date`: Filter from date (YYYY-MM-DD)
- `end_date`: Filter to date (YYYY-MM-DD)
- `category`: Filter by category
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response**:
```json
{
  "expenses": [
    {
      "id": "expense_uuid",
      "amount": 45.67,
      "description": "Grocery shopping at Whole Foods",
      "category": "groceries",
      "date": "2024-01-15",
      "payment_method": "credit_card",
      "receipt_url": "https://example.com/receipt.jpg",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1234.56,
  "count": 25,
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 25
  }
}
```

### POST /expenses
Add a new expense.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "amount": 67.89,
  "description": "Dinner at Italian restaurant",
  "category": "dining",
  "date": "2024-01-15",
  "payment_method": "credit_card",
  "receipt_url": "optional_receipt_url"
}
```

### PUT /expenses/{expense_id}
Update an expense.

### DELETE /expenses/{expense_id}
Delete an expense.

## Trip Planning Endpoints

### GET /trips
Get user's trips.

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "trips": [
    {
      "id": "trip_uuid",
      "name": "Weekend in Portland",
      "start_date": "2024-02-10",
      "end_date": "2024-02-12",
      "origin": {
        "address": "San Francisco, CA",
        "coordinates": [37.7749, -122.4194]
      },
      "destination": {
        "address": "Portland, OR",
        "coordinates": [45.5152, -122.6784]
      },
      "estimated_cost": 450.00,
      "actual_cost": 425.30,
      "status": "completed",
      "waypoints": [
        {
          "address": "Sacramento, CA",
          "stop_duration": 30
        }
      ]
    }
  ]
}
```

### POST /trips
Create a new trip.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Spring Break Road Trip",
  "start_date": "2024-03-15",
  "end_date": "2024-03-22",
  "origin": "Los Angeles, CA",
  "destination": "Las Vegas, NV",
  "waypoints": [
    {
      "address": "Barstow, CA",
      "stop_duration": 15
    }
  ],
  "vehicle_id": "vehicle_uuid"
}
```

## Vehicle Management Endpoints

### GET /vehicles
Get user's vehicles.

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "vehicles": [
    {
      "id": "vehicle_uuid",
      "make": "Toyota",
      "model": "Camry",
      "year": 2020,
      "license_plate": "ABC123",
      "fuel_efficiency": {
        "city": 28,
        "highway": 39,
        "unit": "mpg"
      },
      "maintenance_schedule": [
        {
          "type": "oil_change",
          "interval_miles": 10000,
          "last_service_miles": 45000,
          "next_service_miles": 55000
        }
      ]
    }
  ]
}
```

### POST /vehicles
Add a new vehicle.

### PUT /vehicles/{vehicle_id}
Update vehicle information.

### DELETE /vehicles/{vehicle_id}
Remove a vehicle.

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "amount",
      "issue": "must be greater than 0"
    }
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### 429 Too Many Requests
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "retry_after": 60
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## Rate Limiting

- **Default Rate Limit**: 60 requests per minute per user
- **Rate Limit Headers** included in responses:
  - `X-RateLimit-Limit`: Requests allowed per window
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: Unix timestamp when window resets

## Webhooks

### Webhook Events
PAM can send webhooks for certain events:

- `budget.exceeded`: When a budget category is exceeded
- `trip.completed`: When a trip is marked complete
- `expense.large`: When an expense exceeds a threshold

### Webhook Format
```json
{
  "event": "budget.exceeded",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "budget_id": "budget_uuid",
    "category": "groceries",
    "budgeted_amount": 400.00,
    "current_amount": 425.30
  },
  "user_id": "user_uuid"
}
```

## SDK and Code Examples

### JavaScript/TypeScript
```typescript
// PAM API Client
class PAMClient {
  private baseURL: string;
  private token: string;

  constructor(baseURL: string, token: string) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async get(endpoint: string) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }

  async post(endpoint: string, data: any) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
}

// Usage
const client = new PAMClient('https://pam-backend.render.com/api', 'your_jwt_token');
const expenses = await client.get('/expenses');
```

### Python
```python
import requests

class PAMClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def get(self, endpoint: str):
        response = requests.get(f'{self.base_url}{endpoint}', headers=self.headers)
        return response.json()
    
    def post(self, endpoint: str, data: dict):
        response = requests.post(f'{self.base_url}{endpoint}', json=data, headers=self.headers)
        return response.json()

# Usage
client = PAMClient('https://pam-backend.render.com/api', 'your_jwt_token')
expenses = client.get('/expenses')
```

This API documentation provides comprehensive coverage of all available endpoints, authentication methods, and integration patterns for the PAM system.
