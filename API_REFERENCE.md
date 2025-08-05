# API Reference - National Parks & Image System

## Base URL
```
Production: https://pam-backend.onrender.com
Development: http://localhost:8000
```

## Authentication
Most endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## National Parks Endpoints

### List National Parks
Get a list of national parks with optional filtering.

```http
GET /api/v1/national-parks/
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `country` | string | - | Filter by country |
| `state` | string | - | Filter by state/province |
| `rv_accessible` | boolean | - | Filter by RV accessibility |
| `limit` | integer | 50 | Results per page (max 100) |
| `offset` | integer | 0 | Pagination offset |

**Example Request:**
```bash
curl "https://pam-backend.onrender.com/api/v1/national-parks/?country=Australia&limit=10"
```

**Example Response:**
```json
{
  "total": 156,
  "limit": 10,
  "offset": 0,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Uluru-Kata Tjuta National Park",
      "country": "Australia",
      "state_province": "Northern Territory",
      "description": "Home to the iconic Uluru and Kata Tjuta rock formations...",
      "latitude": -25.3444,
      "longitude": 131.0369,
      "primary_image_url": "https://upload.wikimedia.org/wikipedia/commons/...",
      "thumbnail_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/...",
      "main_features": ["Uluru", "Kata Tjuta", "Desert landscapes"],
      "activities": ["Hiking", "Cultural tours", "Photography", "Sunrise viewing"],
      "wildlife": ["Red kangaroo", "Dingo", "Perentie lizard"],
      "rv_accessible": true,
      "has_camping": true,
      "wikipedia_url": "https://en.wikipedia.org/wiki/Uluru-Kata_Tjuta_National_Park",
      "last_updated": "2025-08-05T10:30:00Z"
    }
  ]
}
```

---

### Find Nearby Parks
Find national parks near a specific location.

```http
GET /api/v1/national-parks/nearby
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | float | Yes | Latitude |
| `lng` | float | Yes | Longitude |
| `radius_km` | integer | No | Search radius in km (default: 100, max: 500) |

**Example Request:**
```bash
curl "https://pam-backend.onrender.com/api/v1/national-parks/nearby?lat=-25.3444&lng=131.0369&radius_km=200"
```

**Example Response:**
```json
{
  "location": {
    "lat": -25.3444,
    "lng": 131.0369
  },
  "radius_km": 200,
  "count": 3,
  "parks": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Uluru-Kata Tjuta National Park",
      "distance_km": 0.0,
      "latitude": -25.3444,
      "longitude": 131.0369,
      "primary_image_url": "https://...",
      "main_features": ["Uluru", "Kata Tjuta"]
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Kings Canyon National Park",
      "distance_km": 165.2,
      "latitude": -24.2694,
      "longitude": 131.5153,
      "primary_image_url": "https://...",
      "main_features": ["Kings Canyon", "Watarrka"]
    }
  ]
}
```

---

### Get Specific Park
Get detailed information about a specific national park.

```http
GET /api/v1/national-parks/{park_id}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `park_id` | UUID | Park identifier |

**Example Request:**
```bash
curl "https://pam-backend.onrender.com/api/v1/national-parks/550e8400-e29b-41d4-a716-446655440000"
```

**Example Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Uluru-Kata Tjuta National Park",
  "alternate_names": ["Ayers Rock", "Kata Tjuta National Park"],
  "country": "Australia",
  "state_province": "Northern Territory",
  "region": "Red Centre",
  "description": "Uluru-Kata Tjuta National Park is a protected area in the Northern Territory of Australia...",
  "area_sq_km": 1326.0,
  "established_date": "1985-10-26",
  "visitor_count_annual": 300000,
  "latitude": -25.3444,
  "longitude": 131.0369,
  "primary_image_url": "https://upload.wikimedia.org/wikipedia/commons/...",
  "thumbnail_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/...",
  "image_gallery": [
    {
      "url": "https://upload.wikimedia.org/wikipedia/commons/...",
      "caption": "Uluru at sunrise",
      "source": "wikipedia",
      "attribution": "Photo by John Doe, CC BY-SA 4.0"
    }
  ],
  "main_features": ["Uluru", "Kata Tjuta", "Desert landscapes", "Ancient rock art"],
  "activities": ["Hiking", "Cultural tours", "Photography", "Sunrise viewing", "Camel tours"],
  "wildlife": ["Red kangaroo", "Dingo", "Perentie lizard", "Spinifex hopping mouse"],
  "best_visiting_months": ["April", "May", "June", "July", "August", "September"],
  "climate_zone": "Desert",
  "entrance_fee_info": {
    "adult_3_day": 38.00,
    "child_3_day": 0.00,
    "currency": "AUD",
    "last_updated": "2025-08-05"
  },
  "operating_hours": {
    "park": "24 hours",
    "visitor_center": "8:00 AM - 5:00 PM",
    "cultural_center": "7:00 AM - 6:00 PM"
  },
  "contact_info": {
    "phone": "+61 8 8956 1100",
    "email": "uluru.info@environment.gov.au",
    "website": "https://parksaustralia.gov.au/uluru/"
  },
  "official_website": "https://parksaustralia.gov.au/uluru/",
  "has_camping": true,
  "rv_accessible": true,
  "rv_length_limit_ft": 40,
  "campground_count": 1,
  "campground_info": {
    "ayers_rock_resort": {
      "sites": 220,
      "powered_sites": 198,
      "amenities": ["Showers", "Laundry", "Camp kitchen", "Pool"],
      "bookings_required": true
    }
  },
  "wikipedia_url": "https://en.wikipedia.org/wiki/Uluru-Kata_Tjuta_National_Park",
  "wikipedia_extract": "Uluru-Kata Tjuta National Park is a protected area in the Northern Territory...",
  "data_source": "wikipedia",
  "data_quality_score": 0.95,
  "last_updated": "2025-08-05T10:30:00Z",
  "created_at": "2025-08-05T09:15:00Z"
}
```

---

### Populate Parks from Wikipedia
Trigger background population of national parks data from Wikipedia.

```http
POST /api/v1/national-parks/populate/{country}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `country` | string | Country name (e.g., "Australia", "United States") |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Maximum parks to fetch (max 100) |

**Example Request:**
```bash
curl -X POST "https://pam-backend.onrender.com/api/v1/national-parks/populate/Australia?limit=50" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "message": "Started fetching national parks for Australia",
  "status": "processing",
  "limit": 50
}
```

**Note:** This is a background task. Use the list endpoint to check progress.

---

### Update Trip Template Images
Trigger background update of all trip template images.

```http
POST /api/v1/national-parks/update-images
```

**Example Request:**
```bash
curl -X POST "https://pam-backend.onrender.com/api/v1/national-parks/update-images" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**
```json
{
  "message": "Started updating trip template images",
  "status": "processing"
}
```

---

## Health Check Endpoints

### Redis Health Check
Check Redis connectivity and configuration.

```http
GET /api/v1/health/redis
```

**Example Request:**
```bash
curl "https://pam-backend.onrender.com/api/v1/health/redis"
```

**Example Response:**
```json
{
  "status": "healthy",
  "redis_connected": true,
  "redis_url_masked": "redis://***@host:6379/0",
  "connection_pool_info": {
    "created_connections": 5,
    "available_connections": 4,
    "in_use_connections": 1
  },
  "timestamp": "2025-08-05T10:30:00Z"
}
```

---

## Error Responses

### Standard Error Format
All endpoints return errors in this format:

```json
{
  "detail": "Error message describing what went wrong",
  "error_code": "SPECIFIC_ERROR_CODE",
  "timestamp": "2025-08-05T10:30:00Z"
}
```

### Common HTTP Status Codes
| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 422 | Unprocessable Entity | Validation error |
| 500 | Internal Server Error | Server error |

### Example Error Responses

**400 Bad Request:**
```json
{
  "detail": "Invalid latitude value. Must be between -90 and 90.",
  "error_code": "INVALID_COORDINATES"
}
```

**401 Unauthorized:**
```json
{
  "detail": "Could not validate credentials",
  "error_code": "INVALID_TOKEN"
}
```

**404 Not Found:**
```json
{
  "detail": "National park not found",
  "error_code": "PARK_NOT_FOUND"
}
```

**422 Validation Error:**
```json
{
  "detail": [
    {
      "loc": ["query", "limit"],
      "msg": "ensure this value is less than or equal to 100",
      "type": "value_error.number.not_le"
    }
  ]
}
```

---

## Rate Limits

### Default Limits
- **General endpoints**: 100 requests per minute per IP
- **Population endpoints**: 5 requests per hour per user
- **Image update endpoints**: 2 requests per hour per user

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1628097600
```

---

## SDKs and Libraries

### Python Client Example
```python
import httpx
import asyncio

class NationalParksClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {token}"}
    
    async def get_parks(self, country: str = None, limit: int = 50):
        params = {"limit": limit}
        if country:
            params["country"] = country
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/national-parks/",
                params=params,
                headers=self.headers
            )
            return response.json()
    
    async def find_nearby(self, lat: float, lng: float, radius_km: int = 100):
        params = {"lat": lat, "lng": lng, "radius_km": radius_km}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/national-parks/nearby",
                params=params,
                headers=self.headers
            )
            return response.json()

# Usage
client = NationalParksClient("https://pam-backend.onrender.com", "your_token")
parks = await client.get_parks(country="Australia", limit=10)
```

### JavaScript/TypeScript Client Example
```typescript
class NationalParksClient {
  constructor(private baseUrl: string, private token: string) {}

  async getParks(options: {
    country?: string;
    state?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, value.toString());
    });

    const response = await fetch(
      `${this.baseUrl}/api/v1/national-parks/?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.json();
  }

  async findNearby(lat: number, lng: number, radiusKm: number = 100) {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radius_km: radiusKm.toString(),
    });

    const response = await fetch(
      `${this.baseUrl}/api/v1/national-parks/nearby?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      }
    );

    return response.json();
  }
}

// Usage
const client = new NationalParksClient('https://pam-backend.onrender.com', 'your_token');
const parks = await client.getParks({ country: 'Australia', limit: 10 });
```

---

## Support

For API support or questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the implementation guides in the repository documentation