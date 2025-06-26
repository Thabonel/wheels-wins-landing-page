
# PAM Backend API Documentation

## Overview

The PAM Backend API is a RESTful service built with FastAPI that provides endpoints for:
- User authentication and profile management
- PAM AI chat interactions
- Financial management (Wins)
- Travel management (Wheels)
- Social networking features

## Base URL
```
Production: https://pam-backend.onrender.com
Development: http://localhost:8000
```

## Authentication

### JWT Token Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "profile": {...}
  }
}
```

### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe"
}
```

## PAM AI Chat Endpoints

### Send Chat Message
```http
POST /api/v1/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "How much did I spend on fuel this month?",
  "conversation_id": "uuid-optional",
  "context": {
    "location": {"lat": -33.8688, "lng": 151.2093}
  }
}
```

**Response:**
```json
{
  "response": "You spent $450 on fuel this month, which is 15% higher than last month.",
  "conversation_id": "uuid",
  "message_id": "uuid",
  "processing_time_ms": 1250,
  "timestamp": "2024-01-15T10:30:00Z",
  "actions": [
    {
      "type": "show_chart",
      "data": {"category": "fuel", "period": "month"}
    }
  ]
}
```

### Get Conversation History
```http
GET /api/v1/chat/conversations/{user_id}
Authorization: Bearer <token>
```

### Create New Conversation
```http
POST /api/v1/chat/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Budget Planning",
  "initial_message": "Help me plan my monthly budget"
}
```

## Financial Management (Wins)

### Get Expenses
```http
GET /api/v1/wins/expenses/{user_id}?category=fuel&start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <token>
```

### Create Expense
```http
POST /api/v1/wins/expenses
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": "uuid",
  "amount": 75.50,
  "category": "fuel",
  "description": "Shell Station - Highway",
  "date": "2024-01-15",
  "location": "Sydney, NSW"
}
```

### Get Budget Summary
```http
GET /api/v1/wins/budget/{user_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total_budget": 3000.00,
  "total_spent": 2150.00,
  "remaining": 850.00,
  "categories": {
    "fuel": {"budget": 500, "spent": 450, "remaining": 50},
    "food": {"budget": 800, "spent": 650, "remaining": 150}
  },
  "alerts": [
    {
      "type": "warning",
      "message": "You're approaching your fuel budget limit"
    }
  ]
}
```

## Travel Management (Wheels)

### Get Maintenance Records
```http
GET /api/v1/wheels/maintenance/{user_id}
Authorization: Bearer <token>
```

### Create Maintenance Record
```http
POST /api/v1/wheels/maintenance
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": "uuid",
  "task": "Oil Change",
  "date": "2024-01-15",
  "mileage": 75000,
  "cost": 89.99,
  "location": "Quick Lube Plus",
  "notes": "Full synthetic oil used"
}
```

### Get Fuel Logs
```http
GET /api/v1/wheels/fuel/{user_id}?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <token>
```

### Search Camping Locations
```http
GET /api/v1/wheels/camping/search?lat=-33.8688&lng=151.2093&radius=50&limit=20
Authorization: Bearer <token>
```

**Response:**
```json
{
  "locations": [
    {
      "id": "uuid",
      "name": "Blue Mountains National Park",
      "latitude": -33.7969,
      "longitude": 150.3064,
      "distance_km": 45.2,
      "amenities": ["water", "toilets", "fire_pit"],
      "rating": 4.5,
      "reviews_count": 127
    }
  ],
  "total": 15,
  "has_more": false
}
```

## Social Features

### Get Social Feed
```http
GET /api/v1/social/feed/{user_id}?page=1&limit=20
Authorization: Bearer <token>
```

### Create Post
```http
POST /api/v1/social/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Just found an amazing camping spot!",
  "location": {
    "name": "Blue Mountains",
    "latitude": -33.7969,
    "longitude": 150.3064
  },
  "images": ["image_url_1", "image_url_2"],
  "tags": ["camping", "nature", "weekend"]
}
```

## Health Check Endpoints

### Basic Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

### Detailed Health Check
```http
GET /api/health/detailed
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": {"status": "healthy", "response_time_ms": 12},
    "redis": {"status": "healthy", "response_time_ms": 5},
    "openai": {"status": "healthy", "response_time_ms": 250}
  },
  "system": {
    "cpu_usage": "15%",
    "memory_usage": "45%",
    "disk_usage": "60%"
  }
}
```

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "uuid"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Internal Server Error

## Rate Limiting

API endpoints are rate-limited:
- Authentication: 5 requests per minute per IP
- Chat endpoints: 30 requests per minute per user
- General endpoints: 100 requests per minute per user

## Pagination

List endpoints support pagination:
```http
GET /api/v1/endpoint?page=1&limit=20&sort=created_at&order=desc
```

**Response includes pagination metadata:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

## WebSocket Connections

### Chat WebSocket
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/chat/{user_id}?token={jwt_token}');

// Send message
ws.send(JSON.stringify({
  type: 'chat_message',
  message: 'Hello PAM!',
  conversation_id: 'uuid'
}));

// Receive responses
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('PAM Response:', data.response);
};
```

## Best Practices

### Request Headers
Always include:
```
Content-Type: application/json
Authorization: Bearer <token>
User-Agent: YourApp/1.0.0
```

### Error Handling
Implement proper error handling for all status codes:
```javascript
try {
  const response = await fetch('/api/v1/endpoint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return await response.json();
} catch (error) {
  console.error('API Error:', error.message);
}
```

### Caching
Implement client-side caching for frequently accessed data:
- User profiles: 1 hour
- Budget summaries: 15 minutes
- Maintenance records: 30 minutes

## SDK Examples

### JavaScript/TypeScript
```typescript
import { PAMClient } from '@pam/client';

const client = new PAMClient({
  baseURL: 'https://pam-backend.onrender.com',
  apiKey: 'your-api-key'
});

// Send chat message
const response = await client.chat.send({
  message: 'Show me my expenses',
  userId: 'user-uuid'
});

// Get expenses
const expenses = await client.wins.getExpenses('user-uuid', {
  category: 'fuel',
  startDate: '2024-01-01'
});
```

### Python
```python
from pam_client import PAMClient

client = PAMClient(
    base_url='https://pam-backend.onrender.com',
    api_key='your-api-key'
)

# Send chat message
response = client.chat.send(
    message='Show me my expenses',
    user_id='user-uuid'
)

# Get expenses
expenses = client.wins.get_expenses(
    user_id='user-uuid',
    category='fuel',
    start_date='2024-01-01'
)
```
