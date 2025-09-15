# Wheels & Wins Data Collector - Project Context

*Last Updated: 2025-09-15*

## Project Overview

The Wheels & Wins data collector is a critical backend service that autonomously scrapes and maintains location data for camping sites, parks, and attractions. This service feeds the main Wheels & Wins trip planning application with high-quality, up-to-date location information.

### Architecture
- **Language**: Python with asyncio for concurrent operations
- **Database**: Supabase PostgreSQL with trip_templates and trip_locations tables
- **Deployment**: Render platform with weekly autonomous collection
- **APIs**: OpenStreetMap, Google Places API, Wikipedia
- **Storage**: Supabase Storage for location photos

## Recent Critical Fixes (September 2025)

### 1. Coordinate Parsing Errors Fixed
**Files**: `scrapers/real_parks_scraper.py`, `scrapers/real_camping_scraper.py`
- **Issue**: Invalid coordinate formats causing data collection failures
- **Solution**: Added robust validation and parsing logic for latitude/longitude
- **Impact**: Prevented data corruption and improved collection success rate

### 2. Google Places API Integration
**File**: `scrapers/real_attractions_scraper.py`
- **Enhancement**: Integrated Google Places API for high-quality attraction data
- **Benefits**: Better data accuracy, richer location information
- **Status**: Requires GOOGLE_PLACES_KEY environment variable in Render

### 3. Database Decimal Conversion
**File**: `services/database_state.py`
- **Issue**: Decimal/float type mismatches causing database errors
- **Solution**: Comprehensive conversion utilities for all numeric data
- **Impact**: Eliminated type-related database insertion failures

### 4. Photo Collection System
**Files**: `services/photo_scraper.py`, `services/photo_storage.py`
- **Feature**: Automated photo collection from Wikipedia
- **Integration**: Supabase Storage for photo persistence
- **Benefit**: Enhanced location data with visual content

## Current Issues & Priorities

### High Priority
1. **Environment Variable**: Add GOOGLE_PLACES_KEY to Render deployment
2. **RLS Policy**: Fix HTTP 401 errors with trip_templates table access
3. **Rate Limiting**: Address OSM API "Too many requests" errors

### Technical Debt
- OSM API fallback logic needs improvement
- Error handling in photo collection pipeline
- Database connection pooling optimization

## Key Technical Components

### Scrapers
- `real_attractions_scraper.py`: Google Places + OSM integration
- `real_parks_scraper.py`: National/state parks data collection
- `real_camping_scraper.py`: Campground and RV site data
- All scrapers use aiohttp for async operations

### Services
- `database_state.py`: Database operations with deduplication
- `photo_scraper.py`: Wikipedia photo collection
- `photo_storage.py`: Supabase Storage integration

### Database Schema
- `trip_templates`: Template trip data
- `trip_locations`: Individual location records with coordinates
- Relationship: trip_templates → trip_locations (one-to-many)

## Deployment Configuration

### Render Environment Variables Needed
```
SUPABASE_URL=https://kycoklimpzkyrecbjecn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service_role_key]
GOOGLE_PLACES_KEY=[needs_to_be_added]
```

### Collection Schedule
- **Frequency**: Weekly autonomous runs
- **Trigger**: Render cron job or scheduled service
- **Data Sources**: OSM, Google Places, Wikipedia

## Development Guidelines

### Code Standards
- Python asyncio patterns for all I/O operations
- Comprehensive error handling with fallback mechanisms
- Database operations must include deduplication logic
- All scrapers should validate coordinates before storage

### Testing Approach
- Coordinate validation edge cases
- API rate limiting scenarios
- Database type conversion accuracy
- Photo collection error handling

## Future Enhancements

### Planned Features
1. Enhanced rate limiting for OSM API
2. Additional photo sources beyond Wikipedia
3. Location data quality scoring
4. Real-time data freshness monitoring

### Architecture Improvements
1. Connection pooling for database operations
2. Caching layer for frequently accessed data
3. Monitoring and alerting for collection failures
4. A/B testing framework for scraper improvements

## Related Repositories
- **Frontend**: wheels-wins-landing-page (main application)
- **Backend**: PAM backend services (FastAPI)
- **Database**: Shared Supabase instance across all services

---

*This document serves as the authoritative source for project context and should be updated with each significant change or fix.*