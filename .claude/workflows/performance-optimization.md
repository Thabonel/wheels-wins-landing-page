# Performance Optimization Workflow

## Overview
Systematic performance analysis and optimization workflow for React frontend, FastAPI backend, and database layers of Wheels & Wins.

## Agents Involved
- **performance-optimizer**: Primary performance analysis and optimization
- **react-frontend-specialist**: Frontend performance improvements
- **fastapi-backend-expert**: Backend optimization and caching
- **database-architect**: Database query optimization and indexing
- **devops-infrastructure**: Infrastructure monitoring and scaling

## Workflow Steps

### 1. Performance Baseline & Analysis (15-20 minutes)
**Agents**: `performance-optimizer`, `devops-infrastructure`

- [ ] Run Lighthouse audit on key pages
- [ ] Measure Core Web Vitals (LCP, FID, CLS)
- [ ] Analyze bundle size and chunk distribution
- [ ] Profile API response times across endpoints
- [ ] Monitor database query performance
- [ ] Assess server resource utilization

### 2. Frontend Performance Optimization (30-45 minutes)
**Agents**: `performance-optimizer`, `react-frontend-specialist`

- [ ] Analyze and optimize bundle sizes
- [ ] Implement code splitting and lazy loading
- [ ] Optimize image loading and compression
- [ ] Improve component rendering performance
- [ ] Enhance caching strategies
- [ ] Optimize third-party library usage

### 3. Backend Performance Optimization (25-35 minutes)
**Agents**: `performance-optimizer`, `fastapi-backend-expert`

- [ ] Profile API endpoint response times
- [ ] Implement response caching strategies
- [ ] Optimize async/await patterns
- [ ] Reduce unnecessary database queries
- [ ] Implement connection pooling
- [ ] Add request/response compression

### 4. Database Performance Optimization (20-30 minutes)
**Agents**: `performance-optimizer`, `database-architect`

- [ ] Analyze slow queries and execution plans
- [ ] Add missing database indexes
- [ ] Optimize complex queries and joins
- [ ] Implement query result caching
- [ ] Review and optimize RLS policies
- [ ] Monitor connection pool utilization

### 5. Infrastructure & Monitoring (15-20 minutes)
**Agent**: `devops-infrastructure`

- [ ] Configure performance monitoring
- [ ] Set up alerting for performance degradation
- [ ] Optimize CDN and caching headers
- [ ] Review server resource allocation
- [ ] Implement load balancing if needed
- [ ] Configure auto-scaling policies

### 6. Testing & Validation (15-20 minutes)
**Agents**: `performance-optimizer`, `testing-automation-expert`

- [ ] Run performance tests and benchmarks
- [ ] Validate Core Web Vitals improvements
- [ ] Test under various load conditions
- [ ] Verify optimization impact on functionality
- [ ] Monitor for performance regressions
- [ ] Document performance improvements

## Frontend Performance Optimization

### Bundle Size Analysis & Optimization
```bash
# Analyze bundle composition
npm run build:analyze

# Check bundle sizes
npm run size-check

# Lighthouse CI for performance monitoring
npx lhci autorun
```

### Code Splitting Implementation
```typescript
// Route-based code splitting
const LazyTripsPage = lazy(() => import('./pages/Trips'));
const LazyWinsPage = lazy(() => import('./pages/Wins'));
const LazyProfilePage = lazy(() => import('./pages/Profile'));

// Component-based code splitting
const LazyMapboxIntegration = lazy(() => 
  import('./components/MapboxIntegration').then(module => ({
    default: module.MapboxIntegration
  }))
);

// Conditional loading for heavy features
const ConditionalMapbox = ({ shouldLoadMap, ...props }) => {
  if (\!shouldLoadMap) {
    return <MapPlaceholder {...props} />;
  }

  return (
    <Suspense fallback={<MapSkeleton />}>
      <LazyMapboxIntegration {...props} />
    </Suspense>
  );
};
```

### Image Optimization
```typescript
// Optimized image component with lazy loading
const OptimizedImage = ({ src, alt, className, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {\!isLoaded && <ImageSkeleton />}
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...props}
        />
      )}
    </div>
  );
};
```

### React Performance Optimization
```typescript
// Memoized expensive calculations
const ExpensiveComponent = React.memo(({ data, filters }) => {
  const processedData = useMemo(() => {
    return data
      .filter(item => filters.includes(item.category))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 50);
  }, [data, filters]);

  const handleItemClick = useCallback((itemId: string) => {
    // Handle click logic
  }, []);

  return (
    <VirtualizedList
      items={processedData}
      renderItem={({ item }) => (
        <ExpenseItem
          key={item.id}
          expense={item}
          onClick={handleItemClick}
        />
      )}
    />
  );
});

// Virtualized lists for large datasets
import { FixedSizeList as List } from 'react-window';

const VirtualizedExpenseList = ({ expenses }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ExpenseItem expense={expenses[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={expenses.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

## Backend Performance Optimization

### Response Caching Implementation
```python
# Redis-based response caching
from functools import wraps
import json
import hashlib

def cache_response(ttl: int = 300):
    """Decorator for caching API responses."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key = generate_cache_key(func.__name__, args, kwargs)
            
            # Try to get from cache
            cached_result = await redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            await redis_client.setex(
                cache_key, 
                ttl, 
                json.dumps(result, default=str)
            )
            
            return result
        return wrapper
    return decorator

# Usage example
@router.get("/financial-summary/{user_id}")
@cache_response(ttl=300)  # Cache for 5 minutes
async def get_financial_summary(user_id: str):
    """Get cached financial summary."""
    return await generate_financial_summary(user_id)
```

### Database Connection Optimization
```python
# Optimized database service with connection pooling
class OptimizedDatabaseService:
    def __init__(self):
        self.pool = None
        self.pool_size = 20
        self.max_overflow = 30
    
    async def get_connection_pool(self):
        """Get or create connection pool."""
        if not self.pool:
            self.pool = await asyncpg.create_pool(
                settings.DATABASE_URL,
                min_size=5,
                max_size=self.pool_size,
                max_queries=50000,
                max_inactive_connection_lifetime=300,
                command_timeout=60
            )
        return self.pool
    
    async def execute_query_optimized(
        self, 
        query: str, 
        *params,
        use_cache: bool = False,
        cache_ttl: int = 300
    ):
        """Execute query with optional caching."""
        if use_cache:
            cache_key = hashlib.md5(f"{query}{params}".encode()).hexdigest()
            cached_result = await redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
        
        pool = await self.get_connection_pool()
        async with pool.acquire() as connection:
            result = await connection.fetch(query, *params)
            
            # Cache result if requested
            if use_cache:
                await redis_client.setex(
                    cache_key,
                    cache_ttl,
                    json.dumps([dict(row) for row in result], default=str)
                )
            
            return [dict(row) for row in result]
```

### API Response Optimization
```python
# Compressed and optimized API responses
from fastapi.responses import JSONResponse
import gzip
import json

class OptimizedJSONResponse(JSONResponse):
    def render(self, content: Any) -> bytes:
        """Render with compression for large responses."""
        json_str = json.dumps(content, ensure_ascii=False, default=str)
        
        # Compress large responses
        if len(json_str) > 1024:  # 1KB threshold
            compressed = gzip.compress(json_str.encode('utf-8'))
            return compressed
        
        return json_str.encode('utf-8')

# Pagination for large datasets
class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int

@router.get("/expenses", response_model=PaginatedResponse)
async def get_expenses_paginated(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_current_user_id)
):
    """Get paginated expenses with optimized query."""
    offset = (page - 1) * size
    
    # Count total items (with caching)
    total_query = "SELECT COUNT(*) FROM expenses WHERE user_id = $1"
    total_result = await db.execute_query_optimized(
        total_query, user_id, use_cache=True, cache_ttl=60
    )
    total = total_result[0]['count']
    
    # Get paginated items
    items_query = """
        SELECT id, amount, category, description, date, created_at
        FROM expenses 
        WHERE user_id = $1
        ORDER BY date DESC
        LIMIT $2 OFFSET $3
    """
    items = await db.execute_query_optimized(
        items_query, user_id, size, offset
    )
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size)
    )
```

## Database Performance Optimization

### Query Optimization Examples
```sql
-- BEFORE: Inefficient query with N+1 problem
SELECT * FROM trips WHERE user_id = $1;
-- Then for each trip:
SELECT * FROM expenses WHERE trip_id = $1;

-- AFTER: Optimized with JOINs and aggregation
SELECT 
    t.id,
    t.name,
    t.description,
    t.start_date,
    t.end_date,
    t.budget_total,
    COALESCE(e.total_expenses, 0) as actual_spent,
    COALESCE(e.expense_count, 0) as expense_count
FROM trips t
LEFT JOIN (
    SELECT 
        trip_id,
        SUM(amount) as total_expenses,
        COUNT(*) as expense_count
    FROM expenses
    GROUP BY trip_id
) e ON t.id = e.trip_id
WHERE t.user_id = $1
ORDER BY t.created_at DESC;
```

### Strategic Index Creation
```sql
-- Analyze query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM expenses 
WHERE user_id = $1 AND date >= $2 
ORDER BY date DESC;

-- Create composite indexes for common query patterns
CREATE INDEX idx_expenses_user_date_desc ON expenses(user_id, date DESC);
CREATE INDEX idx_expenses_category_date ON expenses(category, date DESC) WHERE amount > 0;

-- Partial indexes for filtered queries
CREATE INDEX idx_trips_active_user ON trips(user_id, created_at DESC) 
WHERE status IN ('planning', 'active');

-- Expression indexes for computed values
CREATE INDEX idx_expenses_year_month ON expenses(user_id, EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date));
```

### Query Result Caching
```sql
-- Materialized view for expensive aggregations
CREATE MATERIALIZED VIEW user_financial_summary AS
SELECT 
    p.id as user_id,
    p.email,
    COALESCE(SUM(e.amount), 0) as total_expenses,
    COALESCE(SUM(i.amount), 0) as total_income,
    COUNT(DISTINCT t.id) as total_trips,
    DATE_TRUNC('month', CURRENT_DATE) as summary_month
FROM profiles p
LEFT JOIN expenses e ON p.id = e.user_id 
    AND e.date >= DATE_TRUNC('month', CURRENT_DATE)
LEFT JOIN income_entries i ON p.id = i.user_id 
    AND i.date >= DATE_TRUNC('month', CURRENT_DATE)
LEFT JOIN trips t ON p.id = t.user_id
GROUP BY p.id, p.email;

-- Create unique index for fast lookups
CREATE UNIQUE INDEX idx_user_financial_summary_user_id 
ON user_financial_summary(user_id);

-- Refresh materialized view periodically
-- (Schedule this in cron job or background task)
REFRESH MATERIALIZED VIEW CONCURRENTLY user_financial_summary;
```

## Performance Monitoring & Metrics

### Frontend Performance Monitoring
```typescript
// Web Vitals tracking with analytics
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

const sendToAnalytics = (metric: any) => {
  // Send to your analytics service
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    url: window.location.href,
    timestamp: Date.now()
  });

  // Use sendBeacon if available, otherwise fetch
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/web-vitals', body);
  } else {
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true
    });
  }
};

// Track all Core Web Vitals
getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Backend Performance Monitoring
```python
# Performance middleware for FastAPI
class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Add request ID for tracing
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        response = await call_next(request)
        
        # Calculate performance metrics
        process_time = time.time() - start_time
        
        # Log slow requests
        if process_time > 1.0:  # 1 second threshold
            logger.warning(
                f"Slow request detected",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "url": str(request.url),
                    "duration_ms": round(process_time * 1000, 2),
                    "status_code": response.status_code
                }
            )
        
        # Add performance headers
        response.headers["X-Process-Time"] = str(process_time)
        response.headers["X-Request-ID"] = request_id
        
        return response
```

## Performance Targets & KPIs

### Frontend Performance Targets
- **First Contentful Paint (FCP)**: < 1.5 seconds
- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **First Input Delay (FID)**: < 100 milliseconds
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to Interactive (TTI)**: < 3 seconds
- **Bundle Size**: < 2MB initial load
- **Lighthouse Score**: > 90

### Backend Performance Targets
- **API Response Time**: < 200ms (95th percentile)
- **Database Query Time**: < 50ms (average)
- **Memory Usage**: < 512MB per container
- **CPU Usage**: < 70% average
- **Error Rate**: < 0.1%
- **Throughput**: > 1000 requests/minute

### Database Performance Targets
- **Query Response Time**: < 50ms (95th percentile)
- **Connection Pool Utilization**: < 80%
- **Index Hit Ratio**: > 99%
- **Cache Hit Ratio**: > 95%
- **Lock Wait Time**: < 10ms

## Success Criteria
- All performance targets met or exceeded
- Core Web Vitals in "Good" range
- No performance regressions introduced
- Monitoring and alerting operational
- Performance optimizations documented
- Regular performance review process established

## Time Estimates
- **Frontend Optimization**: 30-45 minutes
- **Backend Optimization**: 25-35 minutes
- **Database Optimization**: 20-30 minutes
- **Infrastructure Setup**: 15-20 minutes
- **Testing & Validation**: 15-20 minutes
- **Total Comprehensive Optimization**: 2-3 hours

This workflow ensures systematic performance optimization across all layers of the Wheels & Wins platform while maintaining functionality and user experience quality.
EOF < /dev/null