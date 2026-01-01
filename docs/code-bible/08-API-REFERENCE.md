# 08 - API Reference

**Purpose:** Complete REST and WebSocket API endpoint documentation.

---

## Base URLs

| Environment | Base URL |
|-------------|----------|
| Production | https://pam-backend.onrender.com |
| Staging | https://wheels-wins-backend-staging.onrender.com |
| Development | http://localhost:8000 |

---

## Authentication

### JWT Token Authentication

All protected endpoints require a Bearer token:

```
Authorization: Bearer <jwt_token>
```

### Token Format

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "user",
  "exp": 1705500000,
  "iat": 1705496400
}
```

---

## Authentication Endpoints

### Register User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "full_name": "John Doe"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "detail": "Email already registered"
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**

```json
{
  "access_token": "EXAMPLE_JWT_TOKEN_HERE",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "profile": {...}
  }
}
```

### Logout

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "message": "Logged out successfully"
}
```

### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "profile": {
    "full_name": "John Doe",
    "nickname": "Johnny",
    "vehicle_type": "Class A Motorhome"
  }
}
```

### Password Requirements

```http
GET /api/auth/password-requirements
```

**Response (200 OK):**

```json
{
  "min_length": 8,
  "require_uppercase": true,
  "require_lowercase": true,
  "require_number": true,
  "require_special": false
}
```

---

## PAM AI Endpoints

### WebSocket Connection

```
wss://pam-backend.onrender.com/api/v1/pam/ws/{user_id}?token={jwt_token}
```

**Connection Flow:**

1. Connect with user_id and JWT token
2. Send messages as JSON
3. Receive responses as JSON
4. Heartbeat ping/pong every 20-30 seconds

**Send Message:**

```json
{
  "type": "chat_message",
  "message": "What's my fuel budget?",
  "context": {
    "current_page": "wins",
    "userLocation": {
      "lat": -33.8688,
      "lng": 151.2093,
      "city": "Sydney"
    },
    "input_mode": "text"
  }
}
```

**Receive Response:**

```json
{
  "type": "chat_message",
  "response": "Your fuel budget is $500 for this month. You've spent $350 so far.",
  "metadata": {
    "tool_used": "analyze_budget",
    "processing_time_ms": 1250
  }
}
```

### REST Chat Endpoint

```http
POST /api/v1/pam/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Add $50 gas expense",
  "user_id": "user-uuid",
  "context": {
    "current_page": "wins"
  }
}
```

**Response (200 OK):**

```json
{
  "response": "I've added your $50 fuel expense. You've spent $400 on fuel this month.",
  "message_id": "uuid",
  "tool_results": [
    {
      "tool": "create_expense",
      "success": true,
      "data": {
        "id": "expense-uuid",
        "amount": 50.00,
        "category": "fuel"
      }
    }
  ]
}
```

---

## Financial Endpoints (Wins)

### Get Expenses

```http
GET /api/v1/wins/expenses/{user_id}?category=fuel&start_date=2025-01-01&end_date=2025-01-31
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| category | string | Filter by category (optional) |
| start_date | date | Start of date range (optional) |
| end_date | date | End of date range (optional) |
| limit | int | Max results (default 100) |
| offset | int | Pagination offset |

**Response (200 OK):**

```json
{
  "expenses": [
    {
      "id": "uuid",
      "amount": 75.50,
      "category": "fuel",
      "description": "Shell Station",
      "date": "2025-01-15",
      "location": "Sydney, NSW"
    }
  ],
  "total": 15,
  "page": 1
}
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
  "date": "2025-01-15",
  "location": "Sydney, NSW"
}
```

**Response (201 Created):**

```json
{
  "id": "uuid",
  "amount": 75.50,
  "category": "fuel",
  "created_at": "2025-01-15T10:30:00Z"
}
```

### Get Budget Summary

```http
GET /api/v1/wins/budget/{user_id}
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "total_budget": 3000.00,
  "total_spent": 2150.00,
  "remaining": 850.00,
  "categories": {
    "fuel": {"budget": 500, "spent": 450, "remaining": 50},
    "food": {"budget": 800, "spent": 650, "remaining": 150},
    "camping": {"budget": 600, "spent": 400, "remaining": 200}
  },
  "alerts": [
    {
      "type": "warning",
      "message": "Approaching fuel budget limit"
    }
  ]
}
```

### Get Savings Summary

```http
GET /api/v1/pam/savings/monthly?user_id={user_id}
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "month": "2025-01",
  "total_saved": 127.50,
  "events": [
    {
      "id": "uuid",
      "amount_saved": 15.00,
      "category": "fuel",
      "description": "Found cheaper gas station",
      "event_type": "gas",
      "created_at": "2025-01-10T14:30:00Z"
    }
  ],
  "goal_met": true
}
```

---

## Travel Endpoints (Wheels)

### Get Maintenance Records

```http
GET /api/v1/wheels/maintenance/{user_id}
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "records": [
    {
      "id": "uuid",
      "task": "Oil Change",
      "date": "2025-01-15",
      "mileage": 75000,
      "cost": 89.99,
      "location": "Quick Lube Plus",
      "next_due_date": "2025-04-15",
      "next_due_mileage": 80000
    }
  ]
}
```

### Create Maintenance Record

```http
POST /api/v1/wheels/maintenance
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": "uuid",
  "task": "Oil Change",
  "date": "2025-01-15",
  "mileage": 75000,
  "cost": 89.99,
  "location": "Quick Lube Plus",
  "notes": "Full synthetic oil"
}
```

### Get Fuel Logs

```http
GET /api/v1/wheels/fuel/{user_id}?start_date=2025-01-01
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "logs": [
    {
      "id": "uuid",
      "date": "2025-01-15",
      "gallons": 25.5,
      "cost": 89.25,
      "location": "Shell Highway",
      "odometer": 75500,
      "mpg": 10.2
    }
  ],
  "average_mpg": 10.5,
  "total_gallons": 150.0,
  "total_cost": 525.00
}
```

### Search Camping Locations

```http
GET /api/v1/wheels/camping/search?lat=-33.8688&lng=151.2093&radius=50&limit=20
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| lat | float | Latitude (required) |
| lng | float | Longitude (required) |
| radius | int | Search radius in km (default 50) |
| limit | int | Max results (default 20) |
| amenities | string | Comma-separated amenities filter |

**Response (200 OK):**

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
      "reviews_count": 127,
      "price_per_night": 35.00
    }
  ],
  "total": 15,
  "has_more": false
}
```

---

## Social Endpoints

### Get Social Feed

```http
GET /api/v1/social/feed/{user_id}?page=1&limit=20
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "posts": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "full_name": "Jane Traveler",
        "profile_image_url": "..."
      },
      "content": "Amazing sunset at the campground!",
      "images": ["url1", "url2"],
      "location_name": "Blue Mountains",
      "likes_count": 24,
      "comments_count": 5,
      "created_at": "2025-01-15T18:30:00Z"
    }
  ],
  "page": 1,
  "has_more": true
}
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

---

## Profile Endpoints

### Get Profile

```http
GET /api/v1/profiles/{user_id}
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "nickname": "Johnny",
  "vehicle_type": "Class A Motorhome",
  "vehicle_make_model": "Winnebago Vista",
  "fuel_type": "diesel",
  "travel_style": "slow_travel",
  "region": "Southwest US"
}
```

### Update Profile

```http
PATCH /api/v1/profiles/{user_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "nickname": "Johnny",
  "travel_style": "slow_travel"
}
```

---

## Health Check Endpoints

### Basic Health

```http
GET /health
```

**Response (200 OK):**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Ping

```http
GET /health/ping
```

**Response (200 OK):**

```json
{
  "status": "pong",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### PAM Health

```http
GET /health/pam
```

**Response (200 OK):**

```json
{
  "status": "healthy",
  "components": {
    "anthropic": "connected",
    "tool_registry": "loaded",
    "context_engine": "ready"
  }
}
```

### Detailed Health

```http
GET /health/detailed
```

**Response (200 OK):**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "services": {
    "database": {"status": "healthy", "latency_ms": 12},
    "redis": {"status": "healthy", "latency_ms": 5},
    "anthropic": {"status": "healthy", "latency_ms": 250}
  },
  "system": {
    "cpu_percent": 15.2,
    "memory_percent": 45.8,
    "disk_percent": 60.0
  }
}
```

### Readiness Probe

```http
GET /health/ready
```

**Response (200 OK if ready, 503 if not):**

```json
{
  "ready": true,
  "checks": {
    "database": true,
    "redis": true
  }
}
```

### Liveness Probe

```http
GET /health/live
```

**Response (200 OK):**

```json
{
  "alive": true
}
```

### Redis Health

```http
GET /health/redis
```

**Response (200 OK):**

```json
{
  "status": "healthy",
  "connected": true,
  "latency_ms": 5
}
```

### All Health Checks

```http
GET /health/all
```

**Response (200 OK):**

```json
{
  "status": "healthy",
  "checks": {
    "database": {"status": "healthy"},
    "redis": {"status": "healthy"},
    "anthropic": {"status": "healthy"},
    "tts": {"status": "healthy"},
    "websocket": {"status": "healthy"}
  },
  "overall": "healthy"
}
```

### Prometheus Metrics

```http
GET /health/metrics
```

**Response (200 OK - text/plain):**

```
# HELP pam_requests_total Total PAM requests
# TYPE pam_requests_total counter
pam_requests_total 1523

# HELP pam_latency_seconds PAM response latency
# TYPE pam_latency_seconds histogram
pam_latency_seconds_bucket{le="0.1"} 450
pam_latency_seconds_bucket{le="0.5"} 1200
pam_latency_seconds_bucket{le="1.0"} 1500
```

---

## Error Responses

### Standard Error Format

```json
{
  "detail": "Error message here",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### Validation Error

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "Invalid email format",
      "type": "value_error"
    }
  ]
}
```

### Authentication Error

```json
{
  "detail": "Could not validate credentials",
  "code": "INVALID_TOKEN"
}
```

---

## Rate Limiting

### Limits

| Endpoint Type | Limit |
|---------------|-------|
| Authentication | 5/minute per IP |
| PAM Chat | 30/minute per user |
| General API | 100/minute per user |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705500060
```

### Rate Limit Error (429)

```json
{
  "detail": "Rate limit exceeded",
  "retry_after": 60
}
```

---

## Pagination

### Request

```http
GET /api/v1/endpoint?page=1&limit=20&sort=created_at&order=desc
```

### Response

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

---

## API Versioning

Current version: **v1**

All API endpoints use `/api/v1/` prefix except:
- Health endpoints (`/health`)
- Auth endpoints (`/api/auth/`)

Future versions will use `/api/v2/`, etc.

---

## Quick Reference

### Common Headers

```
Content-Type: application/json
Authorization: Bearer <token>
Accept: application/json
```

### Test Commands

```bash
# Health check
curl https://pam-backend.onrender.com/health

# Login
curl -X POST https://pam-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get expenses (with token)
curl https://pam-backend.onrender.com/api/v1/wins/expenses/user-id \
  -H "Authorization: Bearer $TOKEN"

# PAM chat
curl -X POST https://pam-backend.onrender.com/api/v1/pam/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"What is my budget?","user_id":"user-id"}'
```
