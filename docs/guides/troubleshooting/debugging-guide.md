
# Debugging Guide

Comprehensive guide for debugging PAM system issues across frontend, backend, and integrations.

## Frontend Debugging

### React DevTools
Essential browser extension for React debugging:
- **Components tab**: Inspect component props and state
- **Profiler tab**: Identify performance issues
- **Console warnings**: Check for React-specific issues

### Browser Developer Tools
- **Console**: JavaScript errors and logs
- **Network**: API calls and responses
- **Application**: LocalStorage, SessionStorage, cookies
- **Performance**: Runtime performance analysis

### Common Frontend Debug Techniques

```javascript
// Component state debugging
const MyComponent = () => {
  const [state, setState] = useState(initialState);
  
  // Debug state changes
  useEffect(() => {
    console.log('State changed:', state);
  }, [state]);

  // Debug props
  console.log('Component props:', { ...props });
  
  return <div>...</div>;
};

// API call debugging
const debugApiCall = async (url, options) => {
  console.group(`API Call: ${url}`);
  console.log('Request:', options);
  
  try {
    const response = await fetch(url, options);
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  } finally {
    console.groupEnd();
  }
};
```

## Backend Debugging

### FastAPI Debug Mode
Enable debug mode in development:
```python
# app/main.py
app = FastAPI(debug=True)  # Enable debug mode

# Or via environment
import os
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
```

### Logging Configuration
```python
# Enhanced logging for debugging
import logging
import sys

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('debug.log')
    ]
)

logger = logging.getLogger(__name__)

# In your route handlers
@app.post("/api/chat/message")
async def process_message(request: ChatRequest):
    logger.debug(f"Received message: {request.message}")
    logger.debug(f"User ID: {request.user_id}")
    # ... process request
    logger.debug(f"Sending response: {response}")
    return response
```

### Interactive Debugging
```python
# Use pdb for interactive debugging
import pdb

@app.post("/api/endpoint")
async def debug_endpoint(request: Request):
    pdb.set_trace()  # Execution will pause here
    # You can inspect variables and step through code
    return {"status": "debug"}

# Or use ipdb for enhanced debugging
import ipdb
ipdb.set_trace()
```

## Database Debugging

### Supabase Query Debugging
```sql
-- Enable query logging in Supabase
-- Go to Database > Settings > Query Logging

-- Test queries directly in SQL editor
SELECT * FROM profiles WHERE id = 'user-id';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'your_table';
```

### Connection Debugging
```python
# Test Supabase connection
from app.database.supabase_client import get_supabase

def test_supabase_connection():
    try:
        supabase = get_supabase()
        result = supabase.table('profiles').select('id').limit(1).execute()
        print(f"Connection successful: {result}")
        return True
    except Exception as e:
        print(f"Connection failed: {e}")
        return False
```

## API Integration Debugging

### OpenAI API Debugging
```python
import openai
import logging

# Enable OpenAI debug logging
logging.getLogger("openai").setLevel(logging.DEBUG)

# Test API connection
def test_openai_connection():
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Test message"}],
            max_tokens=10
        )
        print(f"OpenAI connection successful: {response}")
        return True
    except Exception as e:
        print(f"OpenAI connection failed: {e}")
        return False
```

## Performance Debugging

### Frontend Performance
```javascript
// Performance timing
const startTime = performance.now();
// ... your code
const endTime = performance.now();
console.log(`Operation took ${endTime - startTime} milliseconds`);

// React component render tracking
const MyComponent = React.memo(() => {
  console.log('Component rendered');
  return <div>...</div>;
});

// Memory usage monitoring
console.log('Memory usage:', performance.memory);
```

### Backend Performance
```python
import time
from functools import wraps

def timing_decorator(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        result = await func(*args, **kwargs)
        end_time = time.time()
        logger.info(f"{func.__name__} took {end_time - start_time:.2f} seconds")
        return result
    return wrapper

@timing_decorator
async def slow_operation():
    # Your operation here
    pass
```

## Common Debugging Scenarios

### Authentication Issues
```javascript
// Check authentication state
const debugAuth = () => {
  console.log('Auth user:', user);
  console.log('Auth session:', session);
  console.log('JWT token:', localStorage.getItem('supabase.auth.token'));
  
  // Test API call with auth
  fetch('/api/protected', {
    headers: {
      'Authorization': `Bearer ${session?.access_token}`
    }
  }).then(response => {
    console.log('Auth API response:', response.status);
  });
};
```

### State Management Issues
```javascript
// Debug React Context
const debugContext = () => {
  const contextValue = useContext(MyContext);
  console.log('Context value:', contextValue);
  
  // Check for provider wrapping
  if (!contextValue) {
    console.error('Context provider not found - check component tree');
  }
};
```

### Database Query Issues
```python
# Debug Supabase queries
def debug_query(table_name, query_params):
    try:
        supabase = get_supabase()
        result = supabase.table(table_name).select('*').execute()
        logger.debug(f"Query result: {result}")
        return result
    except Exception as e:
        logger.error(f"Query failed: {e}")
        # Check specific error types
        if "RLS" in str(e):
            logger.error("Row Level Security policy violation")
        elif "unauthorized" in str(e).lower():
            logger.error("Authentication issue")
        raise
```

## Debug Environment Setup

### Development Environment Variables
```env
# Enable debug modes
DEBUG=true
LOG_LEVEL=debug
REACT_APP_DEBUG=true

# Disable production optimizations
NODE_ENV=development
REACT_APP_ENV=development
```

### Debug Scripts
```json
{
  "scripts": {
    "debug:frontend": "npm start -- --verbose",
    "debug:backend": "uvicorn app.main:app --reload --log-level debug",
    "debug:test": "npm test -- --watchAll --verbose"
  }
}
```

## Debugging Tools & Extensions

### Browser Extensions
- React Developer Tools
- Redux DevTools (if using Redux)
- Apollo Client DevTools (if using GraphQL)

### VSCode Extensions
- Python Debugger
- JavaScript Debugger
- REST Client (for API testing)

### Command Line Tools
```bash
# Network debugging
curl -v http://localhost:8000/api/health

# Database debugging
psql -h db.supabase.co -U postgres -d postgres

# Process monitoring
htop
ps aux | grep python
```

## Creating Debug Reports

When escalating issues, include:
1. Steps to reproduce
2. Expected vs actual behavior
3. Error messages and stack traces
4. Environment details (browser, OS, versions)
5. Network requests/responses
6. Component state and props
7. Database query results
8. Server logs

This systematic approach helps identify root causes quickly and leads to faster resolution.
