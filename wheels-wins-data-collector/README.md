# Wheels & Wins Autonomous Data Collector

## 🚀 Production Data Collection System

Autonomous data collection service that runs weekly on Render to build and maintain a comprehensive database of 5000+ travel locations. This system complements the admin-controlled scraper in the main application.

## Architecture Overview

### Dual-System Strategy
1. **Data Collector** (this system)
   - Autonomous weekly collection via Render cron
   - High-volume data acquisition (500+ items/week)
   - Direct database integration
   - Database-driven state management

2. **Admin Scraper** (main site)
   - Manual/on-demand operation
   - Curated high-quality content
   - AI enhancement capabilities
   - Admin review before import

## ✨ Key Features

- **Weekly Automation**: Runs every Sunday at 2 AM UTC
- **Database State Management**: No more file-based tracking
- **Smart Deduplication**: Location-based hashing (11m radius)
- **Resilient Collection**: Exponential backoff, retry logic
- **Comprehensive Monitoring**: Slack, webhooks, Sentry integration
- **Multi-Source Integration**: Recreation.gov, OSM, iOverlander, and more

## 📊 Database Schema

### Core Tables
```sql
data_collector_state     -- Overall progress tracking
data_collector_metrics   -- Performance per run
trip_locations          -- Deduplicated locations
data_collector_runs     -- Run history
data_collector_sources  -- Source configuration
```

## 🔧 Configuration

### Required Environment Variables
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_service_role_key  # NOT anon key!
```

### Optional API Keys (Recommended)
```bash
RECREATION_GOV_KEY=your_key
NPS_API_KEY=your_key
GOOGLE_PLACES_KEY=your_key
```

### Monitoring (Optional)
```bash
NOTIFICATION_WEBHOOK=https://your-webhook
SLACK_WEBHOOK=https://hooks.slack.com/...
SENTRY_DSN=https://...@sentry.io/...
```

## 🧪 Testing

### Local Testing
```bash
# Install dependencies
pip install -r requirements.txt

# Run test suite
python test_collector.py

# Test full collection (small batch)
python main_autonomous.py
```

### Test Coverage
- Database connectivity
- Small batch collection
- Deduplication logic
- Monitoring alerts
- Error recovery

## 📈 Collection Strategy

### Phase 1: Foundation (Weeks 1-4)
- **Focus**: Camping (70%), Parks (20%), Attractions (10%)
- **Target**: 2,000 locations
- **Regions**: US & Canada priority

### Phase 2: Expansion (Weeks 5-8)
- **Balance**: 40% Camping, 30% Parks, 30% Attractions
- **Target**: 3,000 additional locations
- **Regions**: Add Australia, UK, New Zealand

### Phase 3: Maintenance (Ongoing)
- **Rate**: 500 locations/week
- **Focus**: Quality, variety, user feedback
- **Coverage**: Global expansion

## 🌍 Data Sources

### Active
- **Recreation.gov**: US Federal campgrounds
- **OpenStreetMap**: Global coverage via Overpass API
- **iOverlander**: Community-submitted overlanding spots

### Planned
- State Parks APIs
- BLM Lands Database
- Forest Service
- KOA Directory
- Hipcamp API

## 📊 Performance Metrics

### Weekly Targets
- **Collection**: 500+ new locations
- **Quality**: 0.5+ average score
- **Coverage**: 5+ countries
- **Success Rate**: 80%+

### Health Monitoring
- Total locations count
- Collection rate trends
- Source performance
- Error frequency
- Consecutive failures

## 🚨 Monitoring & Alerts

### Alert Types
- ✅ **Success**: Collection summary, duration, sources
- ⚠️ **Warning**: Low rates, quality issues
- ❌ **Error**: Failures, API issues

### Notification Channels
1. Webhook (configurable)
2. Slack integration
3. Sentry error tracking
4. Render logs

## 🔄 Deduplication Process

1. **Location Hashing**: MD5 of rounded lat/lng (4 decimals)
2. **Radius Matching**: ~11 meter precision
3. **Quality Filtering**: Configurable threshold (default 0.3)
4. **Source Tracking**: Multiple sources per location

## 🛡️ Error Recovery

### Retry Strategy
- 3 attempts per source
- Exponential backoff (4-10 seconds)
- Continue on source failure
- Comprehensive error logging

### Circuit Breaker
- Track consecutive failures
- Alert after 3 failures
- Auto-disable problematic sources
- Manual intervention required

## 🚀 Deployment

### Initial Setup
1. Run migration: `20250901_data_collector_tables.sql`
2. Configure Render environment variables
3. Deploy as cron job service
4. Monitor first run in Render dashboard

### Updates
```bash
# Test locally
python test_collector.py

# Deploy
git add .
git commit -m "Update collector"
git push origin main
# Render auto-deploys
```

## 🐛 Troubleshooting

### Common Issues

**FileNotFoundError for logs**
- ✅ Fixed: Directories created before logging init

**Database Connection Fails**
- Check SUPABASE_URL format
- Verify service role key (not anon!)
- Test connection with test_collector.py

**Low Collection Rates**
- Verify API keys
- Check rate limits
- Review source configurations
- Monitor API quotas

**Duplicate Data**
- Deduplication enabled by default
- Check location_hash uniqueness
- Adjust quality thresholds

## 🔮 Future Enhancements

### Roadmap
- [ ] Redis queue for distributed processing
- [ ] AI description enhancement
- [ ] Image collection and CDN storage
- [ ] User feedback integration loop
- [ ] Advanced clustering algorithms
- [ ] Real-time streaming API

### Scaling Plans
- Celery for task distribution
- Geographic sharding
- Redis caching layer
- Stream processing pipeline

## 📞 Support

- **Logs**: Render dashboard
- **Errors**: Sentry dashboard
- **Contact**: admin@wheelsandwins.com
- **Issues**: GitHub repository

---

**Version**: 2.0 (Database-driven)  
**Status**: Production Ready  
**Last Updated**: January 2025  
**Target**: 5000+ locations