# PAM Backend API - Comprehensive Documentation

## Table of Contents
1. [Quick Start](#quick-start)
2. [Authentication & Security](#authentication--security)
3. [PAM AI Chat System](#pam-ai-chat-system)
4. [PAM Database Management Tools](#pam-database-management-tools)
5. [PAM Cross-Domain Intelligence](#pam-cross-domain-intelligence)
6. [Financial Management (Wins)](#financial-management-wins)
7. [Travel Management (Wheels)](#travel-management-wheels)
8. [Social Features](#social-features)
9. [Node-Based Architecture](#node-based-architecture)
10. [WebSocket Real-time Features](#websocket-real-time-features)
11. [Error Handling & Rate Limiting](#error-handling--rate-limiting)
12. [SDK & Client Libraries](#sdk--client-libraries)

---

## Quick Start

### Base URLs
```
Production:  https://pam-backend.onrender.com
Development: http://localhost:8000
```

### Interactive API Documentation
- **Swagger UI**: `/api/docs` (development only)
- **ReDoc**: `/api/redoc` (development only)

### Example: First API Call
```bash
# Health check - no authentication required
curl -X GET "https://pam-backend.onrender.com/api/health"

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "2.0.0"
}
```

---

## Authentication & Security

### Authentication Flow

#### 1. User Registration
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "region": "Australia"
}
```

**Response:**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "full_name": "John Doe",
    "region": "Australia",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

#### 2. User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### 3. Token Usage
```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

#### 4. Token Refresh
```http
POST /api/auth/refresh
Authorization: Bearer <current_token>
```

### Security Headers
All responses include security headers:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## PAM AI Chat System

### Architecture Overview
PAM uses a node-based routing system with:
- **PauterRouter**: Intelligent message routing
- **Specialized Nodes**: Wheels, Wins, Social, Memory, Shop
- **Context Management**: Conversation memory and user context
- **Multi-Model Support**: OpenAI GPT-4, Claude, local models

### Core Chat Endpoint

#### Send Message to PAM
```http
POST /api/v1/pam/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "How much did I spend on fuel this month?",
  "conversation_id": "optional-uuid",
  "context": {
    "location": {
      "latitude": -33.8688,
      "longitude": 151.2093,
      "address": "Sydney, NSW"
    },
    "user_preferences": {
      "currency": "AUD",
      "units": "metric"
    }
  },
  "metadata": {
    "platform": "web",
    "version": "2.0.0"
  }
}
```

**Response:**
```json
{
  "response": "You spent $450 AUD on fuel this month, which is 15% higher than last month ($391). Your highest expense was $85 on January 10th at Shell Caltex on the M1.",
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "message_id": "660e8400-e29b-41d4-a716-446655440001",
  "routing": {
    "target_node": "wins",
    "confidence": 0.95,
    "processing_time_ms": 1250
  },
  "actions": [
    {
      "type": "show_chart",
      "title": "Fuel Expenses - January 2024",
      "data": {
        "category": "fuel",
        "period": "month",
        "chart_type": "line",
        "data_points": [
          {"date": "2024-01-01", "amount": 65},
          {"date": "2024-01-05", "amount": 72},
          {"date": "2024-01-10", "amount": 85}
        ]
      }
    },
    {
      "type": "suggestion",
      "message": "Would you like me to find cheaper fuel stations near your route?",
      "action_id": "find_fuel_stations"
    }
  ],
  "context_used": {
    "conversation_turns": 3,
    "memory_items": 2,
    "location_relevant": true
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Advanced Chat Features

#### Conversation Management
```http
# Get conversation history
GET /api/v1/chat/conversations/{user_id}?limit=10&offset=0
Authorization: Bearer <token>

# Create new conversation
POST /api/v1/chat/conversations
Authorization: Bearer <token>
{
  "title": "Budget Planning Session",
  "initial_context": {
    "goal": "monthly_budget_review",
    "focus_areas": ["fuel", "food", "camping"]
  }
}

# Update conversation metadata
PUT /api/v1/chat/conversations/{conversation_id}
Authorization: Bearer <token>
{
  "title": "Updated Title",
  "archived": false,
  "tags": ["budget", "planning"]
}
```

#### Voice Interface
```http
POST /api/v1/pam/voice
Authorization: Bearer <token>
Content-Type: multipart/form-data

audio: <audio_file.wav>
language: en-AU
voice_settings: {
  "speed": 1.0,
  "pitch": 0.0,
  "voice_id": "australian_female"
}
```

---

## PAM Database Management Tools

### Overview
PAM includes 44 comprehensive tools with 100% database coverage across 39 tables. These tools provide unified access to all system data with advanced caching, security, and performance optimization.

### Database Statistics
```http
GET /api/v1/pam/database/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_tables": 39,
    "accessible_tables": 39,
    "coverage_percentage": 100,
    "categories": {
      "user_management": {"tables": 3, "records": 1247},
      "pam_core": {"tables": 7, "records": 8934},
      "financial": {"tables": 4, "records": 3456},
      "vehicle_maintenance": {"tables": 3, "records": 892},
      "location_travel": {"tables": 5, "records": 2341},
      "business_hustles": {"tables": 3, "records": 567},
      "ecommerce": {"tables": 3, "records": 234},
      "social": {"tables": 5, "records": 1789},
      "analytics": {"tables": 3, "records": 4567},
      "other": {"tables": 3, "records": 1234}
    },
    "performance_metrics": {
      "avg_query_time_ms": 51.2,
      "cache_hit_rate": 79.8,
      "bulk_operations_per_second": 844
    }
  }
}
```

### Generic Database Operations

#### Create Records
```http
POST /api/v1/pam/database/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "table_name": "expenses",
  "data": {
    "amount": 75.50,
    "category": "fuel",
    "description": "Shell Station",
    "date": "2024-01-15"
  },
  "user_id": "user-uuid"
}
```

#### Read Records with Filtering
```http
POST /api/v1/pam/database/read
Authorization: Bearer <token>
Content-Type: application/json

{
  "table_name": "expenses",
  "filters": {
    "category": "fuel",
    "date": {"gte": "2024-01-01", "lte": "2024-01-31"}
  },
  "user_id": "user-uuid",
  "limit": 50,
  "offset": 0,
  "order_by": "date",
  "order_direction": "desc"
}
```

#### Update Records
```http
POST /api/v1/pam/database/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "table_name": "expenses",
  "filters": {"id": "expense-uuid"},
  "data": {
    "amount": 80.00,
    "description": "Shell Station - Updated"
  },
  "user_id": "user-uuid"
}
```

#### Delete Records (with confirmation)
```http
POST /api/v1/pam/database/delete
Authorization: Bearer <token>
Content-Type: application/json

{
  "table_name": "expenses",
  "filters": {"id": "expense-uuid"},
  "user_id": "user-uuid",
  "confirm": true
}
```

#### Bulk Operations
```http
POST /api/v1/pam/database/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "operations": [
    {
      "operation": "create",
      "table_name": "expenses",
      "data": {"amount": 50, "category": "food"}
    },
    {
      "operation": "update",
      "table_name": "expenses",
      "filters": {"id": "expense-uuid"},
      "data": {"amount": 55}
    }
  ],
  "user_id": "user-uuid"
}
```

### Database Health Monitoring
```http
GET /api/v1/pam/database/health
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "health": {
    "overall_status": "healthy",
    "database_connectivity": "excellent",
    "query_performance": "good",
    "cache_performance": "good",
    "connection_pool": {
      "active_connections": 12,
      "idle_connections": 8,
      "max_connections": 50
    },
    "recommendations": [
      "Consider increasing cache TTL for camping_locations",
      "Query optimization opportunities in social_posts table"
    ]
  }
}
```

---

## PAM Cross-Domain Intelligence

### Overview
PAM's cross-domain intelligence provides advanced analytics by correlating data across all domains - financial, travel, social, and business. This enables sophisticated insights and predictive capabilities.

### User 360-Degree View
```http
GET /api/v1/pam/intelligence/user-360/{user_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user_360": {
    "user_id": "user-uuid",
    "generated_at": "2024-01-15T10:30:00Z",
    "profile": {
      "name": "John Doe",
      "location": "Sydney, NSW",
      "travel_style": "budget_conscious",
      "preferences": {"currency": "AUD", "units": "metric"}
    },
    "financial": {
      "total_budget": 2000,
      "total_expenses": 1547.32,
      "budget_utilization": 77.4,
      "net_income": 3200,
      "financial_health_score": 85
    },
    "travel": {
      "total_trips": 12,
      "upcoming_trips": 2,
      "favorite_destinations": ["Blue Mountains", "Central Coast", "Hunter Valley"],
      "average_daily_cost": 94.50
    },
    "vehicle": {
      "total_maintenance": 8,
      "overdue_maintenance": [],
      "maintenance_up_to_date": true,
      "vehicle_health_score": 92
    },
    "social": {
      "total_posts": 23,
      "group_memberships": 5,
      "engagement_level": "high"
    },
    "hustles": {
      "total_hustles": 3,
      "active_hustles": 2,
      "inactive_count": 1,
      "hustle_performance_score": 67
    },
    "insights": [
      {
        "type": "warning",
        "message": "High budget utilization with upcoming trips. Consider trip budget planning.",
        "domains": ["financial", "travel"]
      }
    ]
  }
}
```

### Trip-Expense Correlation
```http
POST /api/v1/pam/intelligence/trip-expenses
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": "user-uuid",
  "trip_id": "optional-trip-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "correlations": [
    {
      "trip_id": "trip-uuid",
      "trip_title": "Blue Mountains Weekend",
      "trip_dates": {
        "start": "2024-01-13",
        "end": "2024-01-15"
      },
      "total_cost": 347.80,
      "expense_breakdown": {
        "fuel": 120.50,
        "other_expenses": 227.30,
        "daily_average": 115.93
      },
      "expense_categories": {
        "fuel": 120.50,
        "food": 145.80,
        "camping": 45.00,
        "activities": 36.50
      },
      "fuel_efficiency": 8.2
    }
  ],
  "insights": [
    {
      "type": "info",
      "message": "Most expensive trip: Blue Mountains Weekend at $347.80"
    },
    {
      "type": "suggestion",
      "message": "Average daily trip cost is $115.93. Consider budget camping options."
    }
  ],
  "summary": {
    "total_trips_analyzed": 1,
    "average_trip_cost": 347.80
  }
}
```

### Predictive Maintenance
```http
POST /api/v1/pam/intelligence/maintenance-prediction
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": "user-uuid",
  "months_ahead": 6
}
```

**Response:**
```json
{
  "success": true,
  "predictions": [
    {
      "maintenance_type": "oil_change",
      "predicted_date": "2024-03-15T00:00:00Z",
      "estimated_cost": 136.49,
      "confidence": "high"
    },
    {
      "maintenance_type": "tire_rotation",
      "predicted_date": "2024-04-20T00:00:00Z",
      "estimated_cost": 89.25,
      "confidence": "medium"
    }
  ],
  "summary": {
    "total_predicted_cost": 225.74,
    "monthly_average": 37.62,
    "maintenance_items": 2,
    "analysis_period_months": 6
  },
  "vehicle_usage": {
    "average_monthly_mileage": 1247.5,
    "maintenance_cost_per_km": 0.030
  }
}
```

### Hustle ROI Analysis
```http
GET /api/v1/pam/intelligence/hustle-roi/{user_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "hustle_analysis": {
    "hustle-uuid-1": {
      "title": "YouTube Travel Vlogs",
      "status": "approved",
      "total_income": 1247.50,
      "total_expenses": 435.20,
      "profit": 812.30,
      "roi_percentage": 186.6,
      "attempt_count": 8,
      "success_rate": 75.0,
      "time_invested": 124.5,
      "hourly_rate": 6.52
    }
  },
  "summary": {
    "total_hustles": 3,
    "total_profit": 1456.80,
    "best_performing": "hustle-uuid-1",
    "average_roi": 156.3
  },
  "recommendations": [
    {
      "hustle_id": "hustle-uuid-2",
      "recommendation": "Consider dropping Affiliate Marketing - ROI is only 12.4%"
    }
  ]
}
```

### Intelligent Recommendations
```http
GET /api/v1/pam/intelligence/recommendations/{user_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "type": "financial",
      "priority": "high",
      "title": "Budget Alert",
      "description": "You're using over 90% of your budget. Consider reviewing expenses.",
      "action": "Review and adjust budget categories"
    },
    {
      "type": "travel",
      "priority": "medium",
      "title": "Travel Cost Optimization",
      "description": "Your average daily travel cost is high. Consider budget-friendly options.",
      "action": "Explore free camping and cooking options"
    }
  ],
  "user_context": {
    "financial_health": 73.5,
    "vehicle_health": 92.0,
    "hustle_performance": 67.0
  }
}
```

### Spending Pattern Analysis
```http
POST /api/v1/pam/intelligence/spending-patterns
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": "user-uuid",
  "analysis_type": "monthly",
  "include_predictions": true
}
```

### Comprehensive Insights Report
```http
POST /api/v1/pam/intelligence/insights-report
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": "user-uuid",
  "report_type": "comprehensive",
  "time_period": "last_30_days"
}
```

---

## Financial Management (Wins)

### Expense Management

#### Create Expense
```http
POST /api/v1/wins/expenses
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 75.50,
  "category": "fuel",
  "description": "Shell Station - M1 Highway",
  "date": "2024-01-15",
  "location": {
    "name": "Shell Caltex Hornsby",
    "address": "1234 Pacific Highway, Hornsby NSW",
    "latitude": -33.7077,
    "longitude": 151.0986
  },
  "payment_method": "card",
  "receipt_url": "https://storage.supabase.co/receipts/receipt_123.jpg",
  "odometer": 85420,
  "fuel_type": "unleaded",
  "volume_liters": 52.3,
  "price_per_liter": 1.44,
  "tags": ["highway_travel", "sydney_trip"]
}
```

#### Get Expenses with Filtering
```http
GET /api/v1/wins/expenses/{user_id}?category=fuel&start_date=2024-01-01&end_date=2024-01-31&location=Sydney&sort=date&order=desc&limit=50
Authorization: Bearer <token>
```

**Response:**
```json
{
  "expenses": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "amount": 75.50,
      "category": "fuel",
      "description": "Shell Station - M1 Highway",
      "date": "2024-01-15",
      "location": {
        "name": "Shell Caltex Hornsby",
        "latitude": -33.7077,
        "longitude": 151.0986
      },
      "metadata": {
        "fuel_type": "unleaded",
        "volume_liters": 52.3,
        "price_per_liter": 1.44,
        "odometer": 85420
      },
      "created_at": "2024-01-15T14:30:00Z"
    }
  ],
  "summary": {
    "total_amount": 1250.75,
    "count": 18,
    "average": 69.49,
    "categories": {
      "fuel": {"amount": 450.00, "count": 6},
      "food": {"amount": 320.25, "count": 8},
      "camping": {"amount": 180.50, "count": 4}
    }
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 18,
    "has_next": false
  }
}
```

### Budget Management

#### Create/Update Budget
```http
POST /api/v1/wins/budgets
Authorization: Bearer <token>
Content-Type: application/json

{
  "period": "monthly",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "categories": {
    "fuel": {"budget": 500.00, "priority": "high"},
    "food": {"budget": 800.00, "priority": "medium"},
    "camping": {"budget": 300.00, "priority": "low"},
    "maintenance": {"budget": 200.00, "priority": "high"}
  },
  "total_budget": 1800.00,
  "alerts": {
    "warning_threshold": 0.80,
    "critical_threshold": 0.95,
    "notify_email": true,
    "notify_push": true
  }
}
```

#### Get Budget Status
```http
GET /api/v1/wins/budgets/{user_id}/current
Authorization: Bearer <token>
```

---

## Travel Management (Wheels)

### Maintenance Tracking

#### Create Maintenance Record
```http
POST /api/v1/wheels/maintenance
Authorization: Bearer <token>
Content-Type: application/json

{
  "task": "Oil Change & Filter Replacement",
  "date": "2024-01-15",
  "mileage": 85420,
  "cost": 129.99,
  "location": {
    "name": "Quick Lube Plus",
    "address": "456 Industrial Ave, Hornsby NSW",
    "phone": "+61-2-9876-5432"
  },
  "parts_used": [
    {"name": "Engine Oil", "quantity": "5L", "brand": "Castrol GTX"},
    {"name": "Oil Filter", "part_number": "OF-123", "brand": "Ryco"}
  ],
  "service_provider": "Quick Lube Plus",
  "warranty_months": 6,
  "next_service_km": 95420,
  "receipt_url": "https://storage.supabase.co/receipts/maintenance_123.pdf",
  "notes": "Full synthetic oil used. Checked air filter - still good.",
  "tags": ["routine_maintenance", "oil_change"]
}
```

### Trip Planning

#### Plan Route with Camping Stops
```http
POST /api/v1/wheels/trips/plan
Authorization: Bearer <token>
Content-type: application/json

{
  "origin": {
    "latitude": -33.8688,
    "longitude": 151.2093,
    "address": "Sydney, NSW"
  },
  "destination": {
    "latitude": -37.8136,
    "longitude": 144.9631,
    "address": "Melbourne, VIC"
  },
  "preferences": {
    "max_daily_drive": 400,
    "camping_type": ["national_park", "free_camping"],
    "amenities_required": ["toilets", "water"],
    "rv_length": 7.5,
    "budget_per_night": 30
  },
  "travel_dates": {
    "start": "2024-02-01",
    "end": "2024-02-05"
  }
}
```

### Location Services

#### Search Camping Locations
```http
GET /api/v1/wheels/camping/search?lat=-33.8688&lng=151.2093&radius=100&type=free_camping&amenities=water,toilets&rv_friendly=true&limit=20&sort=distance
Authorization: Bearer <token>
```

**Response:**
```json
{
  "locations": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Wollemi National Park - Dunns Swamp",
      "type": "national_park",
      "coordinates": {
        "latitude": -32.9442,
        "longitude": 150.1625
      },
      "distance_km": 89.2,
      "amenities": ["toilets", "water", "fire_pit", "picnic_tables"],
      "rv_friendly": true,
      "max_rig_length": 8.0,
      "booking": {
        "required": true,
        "website": "https://www.nationalparks.nsw.gov.au",
        "phone": "13-12-35"
      },
      "pricing": {
        "per_night": 15.00,
        "currency": "AUD"
      },
      "ratings": {
        "average": 4.3,
        "count": 127,
        "breakdown": {
          "cleanliness": 4.1,
          "accessibility": 4.2,
          "facilities": 4.0
        }
      },
      "weather_info": {
        "best_months": ["Mar", "Apr", "May", "Sep", "Oct"],
        "avoid_months": ["Dec", "Jan", "Feb"]
      }
    }
  ],
  "filters_applied": {
    "radius_km": 100,
    "type": "free_camping",
    "rv_friendly": true
  },
  "total_found": 15
}
```

---

## Social Features

### Social Feed & Posts

#### Create Social Post
```http
POST /api/v1/social/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Just discovered this amazing hidden camping spot in the Blue Mountains! Crystal clear creek and absolutely no crowds. Perfect for a peaceful weekend getaway 🏕️",
  "location": {
    "name": "Hidden Creek Camping",
    "latitude": -33.7969,
    "longitude": 150.3064,
    "region": "Blue Mountains, NSW"
  },
  "media": [
    {
      "type": "image",
      "url": "https://storage.supabase.co/photos/camping_spot_1.jpg",
      "caption": "Morning view from the campsite"
    },
    {
      "type": "image", 
      "url": "https://storage.supabase.co/photos/camping_spot_2.jpg",
      "caption": "Crystal clear creek water"
    }
  ],
  "tags": ["camping", "blue_mountains", "hidden_gem", "creek", "peaceful"],
  "visibility": "public",
  "allow_comments": true,
  "share_location": true,
  "trip_data": {
    "trip_id": "550e8400-e29b-41d4-a716-446655440000",
    "check_in": "2024-01-13",
    "check_out": "2024-01-15",
    "cost_per_night": 0
  }
}
```

#### Get Social Feed
```http
GET /api/v1/social/feed?user_id={user_id}&page=1&limit=20&filter=friends&location_radius=50&tags=camping
Authorization: Bearer <token>
```

### Friend Management

#### Send Friend Request
```http
POST /api/v1/social/friends/request
Authorization: Bearer <token>
Content-Type: application/json

{
  "friend_email": "friend@example.com",
  "message": "Hi! Met you at the caravan show last weekend. Would love to connect and share travel tips!"
}
```

#### Accept/Decline Friend Request
```http
PUT /api/v1/social/friends/request/{request_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "accept",  // or "decline"
  "message": "Looking forward to sharing travel adventures!"
}
```

---

## Node-Based Architecture

### PAM Routing System

The PAM AI uses a sophisticated node-based routing system:

#### 1. PauterRouter
- **Purpose**: Intelligent message routing to specialized nodes
- **Algorithm**: Pattern matching + confidence scoring + feedback learning
- **Nodes**: wheels, wins, social, memory, shop

#### 2. Node Types

##### Wheels Node (Travel Management)
```typescript
// Example routing patterns
{
  "patterns": ["trip", "vehicle", "route", "camp", "travel", "fuel", "maintenance"],
  "confidence_threshold": 0.6,
  "capabilities": [
    "trip_planning",
    "maintenance_tracking", 
    "fuel_logging",
    "camping_search",
    "route_optimization"
  ]
}
```

##### Wins Node (Financial Management)
```typescript
{
  "patterns": ["expense", "budget", "finance", "savings", "win", "money", "cost"],
  "confidence_threshold": 0.6,
  "capabilities": [
    "expense_tracking",
    "budget_management",
    "financial_analysis",
    "savings_recommendations",
    "cost_optimization"
  ]
}
```

##### Social Node (Community Features)
```typescript
{
  "patterns": ["friend", "community", "social", "group", "share", "post"],
  "confidence_threshold": 0.6,
  "capabilities": [
    "social_posting",
    "friend_management",
    "community_discovery",
    "group_coordination",
    "experience_sharing"
  ]
}
```

#### 3. Router Feedback System
```http
POST /api/v1/pam/feedback
Authorization: Bearer <token>
Content-Type: application/json

{
  "message_id": "550e8400-e29b-41d4-a716-446655440000",
  "routing_accuracy": 4.5,  // 1-5 scale
  "response_quality": 4.0,
  "node_performance": {
    "target_node": "wins",
    "execution_time_ms": 1250,
    "accuracy": 4.5
  },
  "user_satisfaction": 4.2,
  "comments": "Great expense analysis, but could be faster"
}
```

---

## WebSocket Real-time Features

### Chat WebSocket Connection
```javascript
const ws = new WebSocket('wss://pam-backend.onrender.com/ws/chat/{user_id}?token={jwt_token}');

// Connection events
ws.onopen = () => {
  console.log('Connected to PAM real-time chat');
  
  // Send initial context
  ws.send(JSON.stringify({
    type: 'context_update',
    data: {
      location: { lat: -33.8688, lng: 151.2093 },
      preferences: { currency: 'AUD', units: 'metric' }
    }
  }));
};

// Receive messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch(message.type) {
    case 'chat_response':
      handleChatResponse(message.data);
      break;
    case 'typing_indicator':
      showTypingIndicator(message.data.is_typing);
      break;
    case 'action_required':
      handleActionRequest(message.data);
      break;
    case 'context_update':
      updateContext(message.data);
      break;
  }
};

// Send chat message
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: 'chat_message',
    data: {
      message: text,
      conversation_id: currentConversationId,
      timestamp: new Date().toISOString()
    }
  }));
}
```

### Location Updates WebSocket
```javascript
const locationWs = new WebSocket('wss://pam-backend.onrender.com/ws/location/{user_id}?token={jwt_token}');

// Send location updates
navigator.geolocation.watchPosition((position) => {
  locationWs.send(JSON.stringify({
    type: 'location_update',
    data: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed,
      timestamp: new Date().toISOString()
    }
  }));
});
```

---

## Error Handling & Rate Limiting

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data provided",
    "details": {
      "field": "email",
      "issue": "Invalid email format",
      "provided_value": "invalid-email"
    },
    "suggestions": [
      "Please provide a valid email address",
      "Email must contain @ symbol and valid domain"
    ]
  },
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00Z",
  "documentation": "https://docs.pam-backend.com/errors/VALIDATION_ERROR"
}
```

### Rate Limiting Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642247400
X-RateLimit-RetryAfter: 60
```

### Rate Limit Tiers
| Endpoint Category | Limit | Window |
|-------------------|-------|---------|
| Authentication | 5 requests | 1 minute |
| Chat/AI | 30 requests | 1 minute |
| Standard API | 100 requests | 1 minute |
| Bulk Operations | 10 requests | 1 minute |

---

## SDK & Client Libraries

### JavaScript/TypeScript SDK
```bash
npm install @pam/client
```

```typescript
import { PAMClient } from '@pam/client';

const client = new PAMClient({
  baseURL: 'https://pam-backend.onrender.com',
  apiKey: process.env.PAM_API_KEY,
  timeout: 10000,
  retries: 3
});

// Initialize with authentication
await client.auth.login({
  email: 'user@example.com',
  password: 'password'
});

// Chat with PAM
const chatResponse = await client.chat.send({
  message: 'What camping spots are near Melbourne?',
  context: {
    location: { lat: -37.8136, lng: 144.9631 },
    preferences: { max_distance: 100 }
  }
});

// Financial operations
const expenses = await client.wins.getExpenses({
  userId: 'user-uuid',
  filters: {
    category: 'fuel',
    dateRange: { start: '2024-01-01', end: '2024-01-31' }
  }
});

// Real-time chat
const chatStream = client.chat.stream({
  conversation_id: 'conv-uuid',
  onMessage: (message) => console.log('PAM:', message.content),
  onTyping: () => console.log('PAM is typing...'),
  onError: (error) => console.error('Chat error:', error)
});

chatStream.send('Plan a trip from Sydney to Melbourne');
```

### Python SDK
```bash
pip install pam-client
```

```python
from pam_client import PAMClient
from pam_client.types import Location, DateRange

client = PAMClient(
    base_url='https://pam-backend.onrender.com',
    api_key=os.getenv('PAM_API_KEY'),
    timeout=10.0
)

# Authenticate
await client.auth.login(
    email='user@example.com',
    password='password'
)

# Chat operations
response = await client.chat.send(
    message='Show me my fuel expenses this month',
    context={
        'location': Location(lat=-33.8688, lng=151.2093),
        'currency': 'AUD'
    }
)

# Financial operations
expenses = await client.wins.get_expenses(
    user_id='user-uuid',
    date_range=DateRange(start='2024-01-01', end='2024-01-31'),
    category='fuel'
)

# Async streaming
async for message in client.chat.stream('Plan my next trip'):
    print(f"PAM: {message.content}")
```

### REST Client Examples

#### cURL
```bash
# Set API token
export PAM_TOKEN="your-jwt-token"

# Chat with PAM
curl -X POST "https://pam-backend.onrender.com/api/v1/pam/chat" \
  -H "Authorization: Bearer $PAM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How much did I spend on fuel this month?",
    "context": {
      "location": {"lat": -33.8688, "lng": 151.2093}
    }
  }'

# Get expenses
curl -X GET "https://pam-backend.onrender.com/api/v1/wins/expenses/user-uuid?category=fuel&start_date=2024-01-01" \
  -H "Authorization: Bearer $PAM_TOKEN"
```

#### Postman Collection
Download the complete Postman collection: [PAM Backend API.postman_collection.json](./postman/PAM_Backend_API.postman_collection.json)

---

## Performance & Optimization

### Response Times (Target)
| Operation | Target | Acceptable |
|-----------|--------|------------|
| Health Check | < 50ms | < 100ms |
| Authentication | < 200ms | < 500ms |
| Simple Chat | < 1s | < 2s |
| Complex AI Query | < 3s | < 5s |
| Data Retrieval | < 300ms | < 1s |

### Caching Strategy
- **User Profiles**: 1 hour (Redis)
- **Budget Summaries**: 15 minutes (Redis)
- **Camping Locations**: 24 hours (Redis)
- **Chat Context**: Session-based (Memory)

### Database Optimization
- Connection pooling: 10-50 connections
- Query timeout: 30 seconds
- Read replicas for analytics
- Indexes on frequently queried fields

---

## Testing & Quality Assurance

### Test Coverage Requirements
- Unit Tests: > 90%
- Integration Tests: > 80%
- API Tests: 100% endpoint coverage
- Performance Tests: All critical paths

### Testing Examples
```bash
# Run all tests
pytest tests/

# Run specific test categories
pytest tests/unit/
pytest tests/integration/
pytest tests/api/

# Run with coverage
pytest --cov=app tests/

# Run performance tests
pytest tests/performance/ --benchmark
```

---

## Deployment Considerations

### Environment Variables
```bash
# Core Configuration
ENVIRONMENT=production
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...

# External Services
SUPABASE_URL=https://...
SUPABASE_KEY=...
MAPBOX_API_KEY=pk....

# Monitoring
SENTRY_DSN=https://...
LOG_LEVEL=INFO
```

### Health Checks
```yaml
# docker-compose.yml health check
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Scaling Considerations
- Horizontal scaling: Multiple instances behind load balancer
- Database: Connection pooling + read replicas
- Redis: Cluster mode for high availability
- File storage: CDN for media assets