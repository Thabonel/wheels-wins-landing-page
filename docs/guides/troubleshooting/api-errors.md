
# API Error Troubleshooting

This guide helps diagnose and resolve API-related errors in the PAM system.

## OpenAI API Errors

### Error: 401 Unauthorized
**Cause**: Invalid or missing API key
**Solutions**:
- Verify `OPENAI_API_KEY` in environment variables
- Check key hasn't expired or been revoked
- Ensure key has sufficient permissions

### Error: 429 Rate Limit Exceeded
**Cause**: Too many requests to OpenAI API
**Solutions**:
- Implement request queuing
- Add exponential backoff retry logic
- Monitor usage in OpenAI dashboard
- Consider upgrading to higher tier

### Error: 400 Bad Request
**Cause**: Invalid request parameters
**Solutions**:
- Check message format and length
- Verify model parameters
- Review API documentation for changes

## Supabase API Errors

### Error: Invalid API Key
**Cause**: Wrong Supabase configuration
**Solutions**:
- Verify `SUPABASE_URL` and `SUPABASE_KEY`
- Check if using correct environment keys
- Ensure project is active (not paused)

### Error: Row Level Security Policy Violation
**Cause**: Database query blocked by RLS
**Solutions**:
- Review RLS policies in Supabase dashboard
- Check user authentication state
- Verify user has required permissions
- Test query in Supabase SQL editor

### Error: Connection Timeout
**Cause**: Network or database connectivity issues
**Solutions**:
- Check internet connection
- Verify Supabase service status
- Review connection pooling settings
- Check for database locks

## Backend API Errors

### Error: 500 Internal Server Error
**Cause**: Unhandled exception in backend
**Solutions**:
- Check backend server logs
- Verify all required environment variables
- Test API endpoints individually
- Review recent code changes

### Error: 404 Not Found
**Cause**: Endpoint doesn't exist or routing issue
**Solutions**:
- Verify API endpoint URLs
- Check FastAPI route definitions
- Review URL patterns and parameters
- Test with API documentation/Swagger

### Error: CORS Issues
**Cause**: Cross-origin request blocked
**Solutions**:
- Add frontend URL to `ALLOWED_ORIGINS`
- Check CORS middleware configuration
- 400 Bad Request on an `OPTIONS` request usually means the origin isn't allowed.
  Ensure your domain is listed in `ALLOWED_ORIGINS` or use `[*]` during testing.
- Verify preflight request handling
- Test with different browsers

## Debugging API Calls

### Frontend Debugging
```javascript
// Add request/response logging
const apiCall = async (url, options) => {
  console.log('API Request:', { url, options });
  try {
    const response = await fetch(url, options);
    console.log('API Response:', response.status, response.statusText);
    return response;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
```

### Backend Debugging
```python
# Add detailed logging in FastAPI
import logging
logger = logging.getLogger(__name__)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code}")
    return response
```

## API Monitoring Tools

### Health Check Endpoints
```bash
# Frontend health
curl http://localhost:3000/api/health

# Backend health
curl http://localhost:8000/api/health/detailed

# Supabase connection test
curl -H "apikey: YOUR_SUPABASE_KEY" \
     "YOUR_SUPABASE_URL/rest/v1/profiles?select=id&limit=1"
```

### Error Tracking
- Set up Sentry for error monitoring
- Implement custom error logging
- Monitor API response times
- Track error rates and patterns

## Common HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Invalid parameters, malformed JSON |
| 401 | Unauthorized | Missing/invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Wrong endpoint, resource doesn't exist |
| 429 | Rate Limited | Too many requests |
| 500 | Server Error | Backend application error |
| 502 | Bad Gateway | Proxy/load balancer issue |
| 503 | Service Unavailable | Service down or overloaded |

## Escalation Process

1. Check this troubleshooting guide
2. Review application logs
3. Test with minimal reproduction case
4. Document error details and steps
5. Consult development team
6. Update this guide with new solutions
