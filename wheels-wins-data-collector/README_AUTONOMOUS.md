# Wheels & Wins Autonomous Data Collector

## Overview

This is an autonomous data collection system that runs monthly on Render to collect thousands of real travel locations from multiple APIs and sources. It's designed to build a database of 5000+ locations over 6 months.

## How It Works

1. **Monthly Execution**: Runs automatically on the 1st of each month at 2 AM UTC via Render cron job
2. **Adaptive Collection**: Collects ~1000 locations per month from real APIs:
   - Recreation.gov (US Federal Campgrounds)
   - OpenStreetMap (Global coverage)
   - iOverlander (Community-driven camping database)
   - National Park Service API
   - Various tourism APIs

3. **Smart Progress Tracking**: 
   - Saves progress between runs
   - Rotates through different data types each month
   - Avoids duplicates
   - Handles failures gracefully

4. **Data Quality**:
   - Validates coordinates
   - Deduplicates by location
   - Transforms to trip_templates format
   - Uploads directly to Supabase

## Setup

### Environment Variables

Required in Render:
```
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
RECREATION_GOV_KEY=your-recreation-gov-api-key
NPS_API_KEY=your-nps-api-key
GOOGLE_PLACES_KEY=your-google-places-key (optional)
SENTRY_DSN=your-sentry-dsn (optional for error tracking)
```

### Local Testing

1. Create `.env` file with your credentials
2. Run test script:
   ```bash
   python test_autonomous.py
   ```

### Deploy to Render

1. Push this code to your GitHub repo
2. In Render dashboard:
   - Create new Cron Job
   - Connect your GitHub repo
   - Use the `render.yaml` configuration
   - Add environment variables
   - Deploy

## Collection Strategy

### Month 1-2 (0-2000 items)
- Focus on camping (70%)
- Add parks (20%)
- Add attractions (10%)

### Month 3-4 (2000-4000 items)
- Balanced collection (33% each type)
- Expand geographic coverage

### Month 5-6 (4000-6000+ items)
- Focus on variety
- Add swimming spots and waterfalls
- Fill geographic gaps

## Data Sources

### Camping Spots
- Recreation.gov API (US Federal campgrounds)
- OpenStreetMap (Global free camping)
- iOverlander (Community database)
- FreeCampsites.net (Free camping focus)

### Parks
- National Park Service API (US)
- OpenStreetMap (Global parks)
- Parks Canada API
- UK National Parks
- Australian Parks Services

### Attractions
- OpenStreetMap (Waterfalls, viewpoints, beaches)
- Tourist information APIs
- Historical sites databases

## Monitoring

- Logs saved to `logs/autonomous_collector.log`
- Progress tracked in `data/collection_progress.json`
- Email notifications on completion (if configured)
- Sentry error tracking (if configured)

## Data Format

All collected data is transformed to trip_templates format:
```json
{
  "name": "Yosemite Valley Campground",
  "description": "Beautiful campground in Yosemite",
  "category": "rv_parks",
  "is_public": true,
  "tags": ["camping", "united_states", "california"],
  "template_data": {
    "type": "camping_spots",
    "coordinates": {
      "latitude": 37.7456,
      "longitude": -119.5936
    },
    "amenities": {
      "toilets": true,
      "showers": true,
      "electricity": false
    },
    "source": "recreation_gov",
    "collected_at": "2024-01-01T02:00:00Z"
  }
}
```

## Maintenance

- Check logs monthly after each run
- Review collection progress
- Monitor data quality
- Update API keys as needed
- Scale collection targets based on performance

## Troubleshooting

### Common Issues

1. **API Rate Limits**: Built-in delays and retries handle this
2. **Memory Issues**: Batch processing keeps memory usage low
3. **Network Timeouts**: Retry logic handles temporary failures
4. **Duplicate Data**: Deduplication by coordinates prevents this

### Debug Mode

Run with limited data for debugging:
```python
collector.monthly_target = 10  # Collect only 10 items
```

## Future Enhancements

- Add more data sources
- Implement data quality scoring
- Add user contribution system
- Create data verification pipeline
- Add real-time monitoring dashboard