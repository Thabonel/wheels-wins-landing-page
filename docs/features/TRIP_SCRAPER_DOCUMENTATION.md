# Trip Discovery Scraper - Complete Documentation

## Overview

The Trip Discovery Scraper is an advanced admin-only feature that automatically discovers, scrapes, and imports high-quality trip templates from various online sources. It uses AI enhancement to improve content quality and provides a comprehensive management interface.

**Status**: ✅ Fully Implemented (January 31, 2025)  
**Access**: Admin-only (requires `role = 'admin'` in profiles table)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                      │
│                  TripScraperControl.tsx                  │
└────────────────────┬────────────────────────────────────┘
                     │ API Calls
┌────────────────────▼────────────────────────────────────┐
│                  FastAPI Backend                         │
│              /api/v1/scraper endpoints                   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              TripDiscoveryScraperService                 │
│          (BeautifulSoup4 + AI Enhancement)              │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Supabase Database                       │
│  Tables: trip_scraper_sources, trip_scraper_results,    │
│  trip_scraper_jobs, scraper_ai_config                   │
└─────────────────────────────────────────────────────────┘
```

## Database Schema

### 1. `trip_scraper_sources`
Stores configuration for scraping sources.

```sql
CREATE TABLE trip_scraper_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('api', 'scraper', 'rss', 'manual')),
  is_active BOOLEAN DEFAULT true,
  rate_limit INTEGER DEFAULT 60,
  selectors JSONB DEFAULT '{}',
  api_config JSONB DEFAULT '{}',
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. `trip_scraper_results`
Stores scraped content with quality scores and AI enhancements.

```sql
CREATE TABLE trip_scraper_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES trip_scraper_jobs(id) ON DELETE CASCADE,
  source_id UUID REFERENCES trip_scraper_sources(id),
  raw_data JSONB,
  processed_data JSONB,
  template_data JSONB,
  images_found TEXT[],
  quality_score DECIMAL(3,2),
  ai_enhanced BOOLEAN DEFAULT false,
  import_status TEXT CHECK (import_status IN ('pending', 'preview', 'imported', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. `trip_scraper_jobs`
Tracks scraping job status and progress.

```sql
CREATE TABLE trip_scraper_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending',
  source_url TEXT,
  region TEXT,
  parameters JSONB DEFAULT '{}',
  results JSONB DEFAULT '{}',
  templates_created INTEGER DEFAULT 0,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);
```

### 4. `scraper_ai_config`
Stores AI model configuration.

```sql
CREATE TABLE scraper_ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'openai',
  model_name TEXT NOT NULL,
  model_version TEXT,
  max_tokens INTEGER DEFAULT 2000,
  temperature DECIMAL(2,1) DEFAULT 0.7,
  is_active BOOLEAN DEFAULT true,
  config_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Features

### 1. Multi-Source Scraping

The scraper supports multiple source types:

- **Web Scraper**: Uses CSS selectors to extract content from websites
- **API Integration**: Connects to travel APIs for structured data
- **RSS Feeds**: Parses RSS/Atom feeds for travel content
- **Manual Entry**: Allows manual addition of trip templates

### 2. AI Enhancement

Content is enhanced using configurable AI models:

- **Model Configuration**: AI model is configurable via environment variable
- **Content Improvement**: Enhances titles and descriptions
- **Tag Generation**: Automatically generates relevant tags
- **Quality Scoring**: AI-assisted quality assessment

**Environment Variables**:
```bash
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4o-mini  # Configurable, not hardcoded
```

### 3. Compliance & Safety

- **Robots.txt Compliance**: Automatically checks and respects robots.txt
- **Rate Limiting**: Per-domain rate limiting to avoid overloading servers
- **User Agent**: Identifies as "WheelsAndWins-TripDiscovery/1.0"
- **Error Recovery**: Automatic retry with exponential backoff

### 4. Quality Control

Each scraped item receives a quality score (0.0 to 1.0) based on:

- Title length and quality (30%)
- Description completeness (20%)
- Content depth (30%)
- Image availability (20%)

### 5. Admin Interface

The React admin interface provides:

- **Source Management**: Add, edit, enable/disable scraping sources
- **Progress Monitoring**: Real-time scraping progress with visual indicators
- **Results Preview**: View scraped content before importing
- **AI Configuration**: Adjust AI enhancement settings
- **Job History**: Track all scraping operations

## Usage Guide

### Setting Up a New Source

1. Navigate to Admin Panel → Trip Scraper
2. Click "Add Source" tab
3. Enter source details:
   - **Name**: Descriptive name for the source
   - **URL**: Website or API endpoint
   - **CSS Selectors** (optional): For targeting specific elements

Example CSS Selectors:
```json
{
  "title": "h1.trip-title, article h2",
  "description": "meta[name='description'], .trip-summary",
  "content": "article.content, .post-body",
  "images": "img.featured, .gallery img"
}
```

### Running a Scraping Job

1. Go to "Sources" tab
2. Ensure desired sources are enabled
3. Click "Start Scraping" button
4. Monitor progress in real-time
5. Review results in "Results" tab

### Configuring AI Enhancement

1. Navigate to "AI Config" tab
2. Set enhancement parameters:
   - **Model**: Automatically uses environment variable
   - **Max Tokens**: Token limit for AI responses
   - **Temperature**: Creativity level (0.0-2.0)
3. Save configuration

## API Endpoints

### POST `/api/v1/scraper/jobs`
Create and start a new scraping job.

**Request**:
```json
{
  "source_ids": ["source-uuid-1", "source-uuid-2"],
  "ai_enhancement": true
}
```

### GET `/api/v1/scraper/jobs/{job_id}`
Get job progress and status.

**Response**:
```json
{
  "job_id": "job-uuid",
  "status": "running",
  "progress": 45.5,
  "results_count": 12,
  "error_message": null
}
```

### GET `/api/v1/scraper/results`
Get scraped results with filtering.

**Query Parameters**:
- `job_id`: Filter by job ID
- `source_id`: Filter by source ID
- `limit`: Maximum results (default: 50)
- `offset`: Pagination offset

### POST `/api/v1/scraper/sources/{source_id}/test`
Test a source configuration.

## Backend Service

### Core Technologies

- **BeautifulSoup4**: HTML parsing and content extraction
- **aiohttp**: Async HTTP requests with rate limiting
- **OpenAI API**: Content enhancement (configurable model)
- **Pydantic**: Data validation and serialization

### Key Methods

```python
async with TripDiscoveryScraperService() as scraper:
    # Create job
    job_id = await scraper.create_scraper_job(source_id)
    
    # Run scraping
    results = await scraper.scrape_source(source_id, job_id)
    
    # Get results
    data = await scraper.get_scraper_results(job_id=job_id)
```

## Security

### Access Control

- **Admin-only access**: All operations require `role = 'admin'`
- **RLS Policies**: Database-level security on all tables
- **Authentication**: JWT token verification for API calls

### Data Protection

- **Input Sanitization**: All scraped content is sanitized
- **Image Validation**: Only valid image URLs are stored
- **Rate Limiting**: Prevents abuse of external services

## Default Sources

The system comes with three pre-configured sources:

1. **WikiVoyage Australia**: Travel guide content
2. **National Parks Service API**: Official park information
3. **OpenStreetMap Overpass**: Geographic and route data

## Troubleshooting

### Common Issues

#### 1. Permission Denied (403)
**Solution**: Ensure user has `role = 'admin'` in profiles table:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'user@example.com';
```

#### 2. AI Enhancement Not Working
**Solution**: Check environment variables:
```bash
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4o-mini  # or your preferred model
```

#### 3. Scraping Fails
**Possible Causes**:
- Website blocks the scraper (check robots.txt)
- CSS selectors are incorrect
- Rate limiting is too aggressive
- Network timeout issues

#### 4. No Results Appearing
**Check**:
- Job status in trip_scraper_jobs table
- Error messages in job records
- Backend logs for detailed errors

## Monitoring

### Database Queries

Check job status:
```sql
SELECT * FROM trip_scraper_jobs 
ORDER BY created_at DESC 
LIMIT 10;
```

View recent results:
```sql
SELECT * FROM trip_scraper_results 
WHERE quality_score > 0.7 
ORDER BY created_at DESC;
```

Monitor source performance:
```sql
SELECT 
  s.name,
  COUNT(r.id) as results_count,
  AVG(r.quality_score) as avg_quality
FROM trip_scraper_sources s
LEFT JOIN trip_scraper_results r ON s.id = r.source_id
GROUP BY s.id, s.name;
```

## Future Enhancements

### Planned Features

1. **Scheduled Scraping**: Cron-based automatic scraping
2. **Duplicate Detection**: Prevent importing duplicate content
3. **Content Translation**: Multi-language support
4. **Image Processing**: Automatic image optimization and CDN upload
5. **Webhook Notifications**: Alert when scraping completes

### API Improvements

1. **Bulk Operations**: Process multiple sources in parallel
2. **Export Functionality**: Download scraped data as CSV/JSON
3. **Template Preview**: Live preview before importing
4. **Source Templates**: Pre-configured source templates

## Maintenance

### Regular Tasks

1. **Monitor Quality Scores**: Review and adjust sources with low scores
2. **Update CSS Selectors**: Websites change, selectors may need updates
3. **Review AI Config**: Optimize prompts for better results
4. **Clean Old Jobs**: Remove completed jobs older than 30 days

### Performance Optimization

1. **Index Usage**: Ensure database indexes are being used
2. **Rate Limit Tuning**: Adjust based on source requirements
3. **Caching**: Implement Redis caching for frequently accessed data
4. **Batch Processing**: Process multiple URLs in parallel

## Files Modified/Created

### Frontend
- `/src/components/admin/TripScraperControl.tsx` - Complete rewrite with real functionality

### Backend
- `/backend/app/services/trip_scraper.py` - Core scraping service
- `/backend/app/api/v1/trip_scraper.py` - FastAPI endpoints

### Database
- `/supabase/migrations/20250131_trip_scraper_enhancement.sql` - Database schema
- `/supabase/backups/trip_scraper_backup_2025-01-31.sql` - Backup file

### Documentation
- `/docs/features/TRIP_SCRAPER_DOCUMENTATION.md` - This file

## Summary

The Trip Discovery Scraper is now a fully functional, production-ready feature that:

✅ **Works with real data** - No more simulation  
✅ **Respects web standards** - Robots.txt compliance  
✅ **Uses configurable AI** - Not hardcoded to specific models  
✅ **Provides admin control** - Full CRUD operations  
✅ **Tracks progress** - Real-time job monitoring  
✅ **Ensures quality** - Scoring and validation  
✅ **Handles errors** - Comprehensive error recovery  

The feature is ready for production use and can be extended with additional sources and functionality as needed.