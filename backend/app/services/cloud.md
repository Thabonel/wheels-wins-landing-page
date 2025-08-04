# Backend Services

## Purpose
Business logic layer providing core functionality, external integrations, and AI services

## Key Services

### Core Services
- `auth.py` - Authentication and authorization logic
- `user.py` - User management and profile operations
- `trip.py` - Trip planning and route calculations
- `expense.py` - Financial tracking and reporting
- `social.py` - Community features and interactions

### AI & Voice Services
- `pam.py` - PAM AI assistant conversation engine
- `tts/` - Multi-engine text-to-speech services
  - `edge_tts_service.py` - Microsoft Edge TTS (primary)
  - `coqui_tts_service.py` - Coqui TTS (fallback)
  - `system_tts_service.py` - System TTS (last resort)
  - `tts_manager.py` - TTS engine orchestration

### External Integrations
- `mapbox.py` - Mapbox API for routing and geocoding
- `openai.py` - OpenAI GPT integration for PAM
- `supabase.py` - Supabase client for database operations
- `redis.py` - Redis caching and session management
- `email.py` - Email notifications via SendGrid/SMTP

### Data Services
- `nasa_firms.py` - Fire detection data from NASA
- `noaa_weather.py` - Weather data integration
- `campground.py` - Campground data aggregation
- `storage.py` - File upload to Supabase Storage

## Service Patterns
```python
# Standard service class pattern
class ServiceName:
    def __init__(self, db: Session, user: User = None):
        self.db = db
        self.user = user
    
    async def operation(self, params: Schema) -> Result:
        # Business logic here
        pass
```

## Dependencies
- **Database**: SQLAlchemy sessions via dependency injection
- **Caching**: Redis for performance optimization
- **External APIs**: httpx for async HTTP requests
- **Validation**: Pydantic schemas for data validation
- **Logging**: Structured logging with context

## Error Handling
- Custom exceptions in `core/exceptions.py`
- Graceful degradation for external services
- Retry logic with exponential backoff
- Circuit breaker pattern for APIs

## Do NOT
- Make direct database queries - use repositories
- Call external APIs without error handling
- Store API keys in code - use config
- Skip caching for expensive operations
- Mix different service concerns
- Return database models directly - use schemas

## Testing
- Mock external API calls
- Use in-memory SQLite for tests
- Test error scenarios and edge cases
- Verify caching behavior
- Test async operations properly