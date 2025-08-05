# Image & National Parks System Implementation Guide

## Quick Start

### 1. Deploy Database Migration
```bash
# Run the migration to add image columns and national parks table
supabase migration up --file 20250805180000-add-images-and-national-parks.sql
```

### 2. Set Environment Variables
```bash
# Required for image service
export UNSPLASH_ACCESS_KEY="your_unsplash_access_key"
export MAPBOX_TOKEN="your_mapbox_token" 
export GOOGLE_PLACES_API_KEY="your_google_places_key"

# For Docker deployment
export VITE_MAPBOX_TOKEN="your_mapbox_token"
```

### 3. Populate National Parks Data
```bash
# Populate Australian national parks (background task)
curl -X POST "https://your-api.com/api/v1/national-parks/populate/Australia?limit=50"

# Check population status
curl "https://your-api.com/api/v1/national-parks/?country=Australia&limit=5"
```

### 4. Update Trip Template Images
```bash
# Trigger image updates for all templates (background task)
curl -X POST "https://your-api.com/api/v1/national-parks/update-images"
```

## System Architecture

```
Frontend (React/TypeScript)
├── TripTemplateCard.tsx          # Dynamic map generation
├── tripTemplateService.ts        # Data transformation
└── RegionContext.tsx             # Region management

Backend (FastAPI/Python)
├── /api/v1/national_parks.py     # Parks API endpoints
├── /services/images/
│   ├── image_service.py          # Multi-source image fetching
│   └── wikipedia_scraper.py      # Wikipedia data extraction
└── /models/domain/              # Data models

Database (PostgreSQL + PostGIS)
├── trip_templates               # Enhanced with image columns
├── national_parks              # Comprehensive park data
└── spatial functions           # Geographic queries
```

## Key Implementation Details

### Frontend Coordinate Logic
The Alice Springs issue was resolved by implementing a 3-tier coordinate detection system:

```typescript
// 1. Template name-based detection (highest priority)
if (templateName.includes('great ocean road')) {
  coordinates = TWELVE_APOSTLES_COORDS;
}

// 2. Multi-region parsing 
if (region.includes('victoria') && region.includes('south australia')) {
  coordinates = GREAT_OCEAN_ROAD_COORDS;
}

// 3. Highlight matching (fallback)
for (const highlight of highlights) {
  if (LOCATION_COORDS[highlight]) {
    coordinates = LOCATION_COORDS[highlight];
  }
}
```

### Image Service Strategy
Multi-source approach with intelligent fallbacks:

```python
async def get_trip_template_image(template_data):
    # 1. Wikipedia for landmarks/parks
    if 'park' in highlights:
        return await self._get_wikipedia_image(highlight)
    
    # 2. Unsplash for general locations  
    if self.unsplash_access_key:
        return await self._get_unsplash_image(query)
    
    # 3. Mapbox static map (always available)
    return await self._generate_map_image(template_data)
```

## API Integration Examples

### National Parks Management

```python
# Get parks near coordinates
@router.get("/nearby")
async def get_nearby_parks(lat: float, lng: float, radius_km: int = 100):
    parks = await db.fetch_all(
        "SELECT * FROM find_nearby_national_parks(%s, %s, %s)",
        [lat, lng, radius_km]
    )
    return {"parks": parks}

# Populate from Wikipedia (background task)
@router.post("/populate/{country}")
async def populate_parks(country: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(fetch_and_save_national_parks, country)
    return {"status": "processing"}
```

### Image Processing Workflow

```python
async def update_trip_template_images(template_id: str, template_data: Dict):
    # Get appropriate image based on template content
    image_data = await self.get_trip_template_image(template_data)
    
    if image_data['image_url']:
        # Update database with image URLs and attribution
        await db.execute(
            "UPDATE trip_templates SET image_url = %s, image_source = %s WHERE id = %s",
            [image_data['image_url'], image_data['image_source'], template_id]
        )
        return True
    return False
```

## Database Schema

### Trip Templates Enhancement
```sql
-- Add image support to existing templates
ALTER TABLE trip_templates 
ADD COLUMN image_url TEXT,
ADD COLUMN thumbnail_url TEXT,
ADD COLUMN image_source TEXT,
ADD COLUMN image_attribution TEXT;
```

### National Parks Table
```sql
CREATE TABLE national_parks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    state_province TEXT,
    
    -- Geographic data (PostGIS)
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    location_point GEOGRAPHY(POINT, 4326),
    
    -- Rich content
    description TEXT,
    primary_image_url TEXT,
    image_gallery JSONB,
    
    -- Structured data
    main_features TEXT[],
    activities TEXT[],
    wildlife TEXT[],
    
    -- RV specific
    rv_accessible BOOLEAN DEFAULT false,
    campground_info JSONB,
    
    -- Data provenance
    wikipedia_url TEXT,
    data_source TEXT DEFAULT 'wikipedia',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spatial index for performance
CREATE INDEX idx_national_parks_location ON national_parks USING GIST (location_point);
```

## Testing & Validation

### Coordinate Fix Verification
```bash
# Test specific templates show correct regions:
# 1. Great Ocean Road → Victorian coast (-38.66, 143.10)
# 2. Red Centre → Uluru area (-25.34, 131.03) 
# 3. Pacific Coast → Byron Bay area (-28.64, 153.61)
# 4. Big Lap → Australia overview (-25.27, 133.77)

# Check frontend coordinate detection
curl "https://your-frontend.com/api/trip-templates" | jq '.[] | {name, region, coordinates}'
```

### Image Service Testing
```bash
# Test Wikipedia image fetching
curl -X POST "https://your-api.com/api/v1/national-parks/populate/Australia?limit=5"

# Verify image URLs are populated
curl "https://your-api.com/api/v1/national-parks/" | jq '.data[] | {name, primary_image_url}'

# Test template image updates
curl -X POST "https://your-api.com/api/v1/national-parks/update-images"
```

### Health Monitoring
```bash
# Check Redis connection (should show "healthy")
curl "https://your-api.com/api/v1/health/redis"

# Verify PAM is not in emergency mode
curl "https://your-api.com/health" | grep -v "emergency mode"
```

## Troubleshooting

### Common Issues

**1. All templates still show Alice Springs**
```bash
# Check Mapbox token
echo $VITE_MAPBOX_TOKEN

# Verify template data has region/highlights
curl "https://your-api.com/api/v1/trip-templates" | jq '.[0] | {name, region, highlights}'

# Clear browser cache and refresh
```

**2. Image service not working**
```bash
# Check dependencies
pip list | grep aiohttp

# Verify API keys
curl "https://api.unsplash.com/search/photos?query=test&client_id=$UNSPLASH_ACCESS_KEY"

# Check logs for image service errors
tail -f /var/log/app.log | grep "image_service"
```

**3. National parks not populating**
```bash
# Check background task status
curl "https://your-api.com/api/v1/national-parks/?country=Australia&limit=1"

# Verify Wikipedia access
curl "https://en.wikipedia.org/api/rest_v1/page/summary/Uluru"

# Check database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM national_parks;"
```

**4. PAM in emergency mode**
```bash
# Check import errors
tail -f /var/log/app.log | grep "import.*error"

# Verify all modules load correctly
python -c "from app.services.images import ImageService; print('OK')"

# Rollback if necessary
git revert HEAD~1
```

## Performance Considerations

### Image Loading Optimization
- Use thumbnail URLs for list views
- Implement lazy loading for images
- Cache frequently accessed images in Redis
- Consider CDN integration for static images

### Database Query Optimization
- Spatial indexes on geographic columns
- Composite indexes on commonly filtered fields
- Query result caching for popular searches
- Background processing for expensive operations

### API Rate Limiting
- Implement rate limits for external API calls
- Use exponential backoff for failed requests
- Cache API responses to reduce external calls
- Monitor API quota usage

## Security Notes

### API Key Management
- Store API keys in environment variables
- Use different keys for development/production
- Implement key rotation procedures
- Monitor API usage and costs

### Data Validation
- Validate all external API responses
- Sanitize Wikipedia content before storage
- Implement input validation on all endpoints
- Use parameterized queries to prevent SQL injection

### Attribution Requirements
- Wikipedia: Proper CC licensing attribution
- Unsplash: Photographer credit required
- Google Places: Google attribution mandatory
- Mapbox: Copyright notice required

## Monitoring & Maintenance

### Key Metrics to Monitor
- Image service success rates
- Database query performance
- Redis connection stability
- External API response times
- Template coordinate accuracy

### Regular Maintenance Tasks
- Update national parks data monthly
- Refresh cached images quarterly
- Monitor and rotate API keys
- Review and update coordinate mappings
- Clean up orphaned image references

## Future Enhancements

### Planned Features
1. **Route Geometry**: Store actual route paths in templates
2. **Image Optimization**: Automatic resizing and WebP conversion
3. **Offline Support**: Cached images for offline functionality
4. **Advanced Search**: Full-text search across parks and templates
5. **User Generated Content**: Allow users to submit park photos

### Performance Improvements
1. **CDN Integration**: Global image delivery network
2. **Background Processing**: Queue-based image processing
3. **Caching Strategy**: Multi-layer caching system
4. **Progressive Loading**: Incremental image quality loading

This implementation provides a robust foundation for location-based imagery and comprehensive national parks data management while maintaining system reliability and performance.