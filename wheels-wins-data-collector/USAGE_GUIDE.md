# Wheels & Wins Mass Data Collection System - Usage Guide

## Quick Start

1. **Setup Environment**
   ```bash
   # Install dependencies
   pip install -r requirements.txt
   
   # Copy and configure environment variables
   cp .env.example .env
   # Edit .env with your API keys
   ```

2. **Test the System**
   ```bash
   # Run a small test collection
   python test_collection.py
   ```

3. **Run Full Collection**
   ```bash
   # Collect all data for all countries
   python main.py --countries all --data-types all
   
   # Or specific countries/types
   python main.py --countries australia,new_zealand --data-types national_parks,camping_spots
   ```

## Step-by-Step Process

### Phase 1: Data Collection (Week 1)

1. **Configure API Keys**
   - National Park Service (US): https://www.nps.gov/subjects/developer/get-started.htm
   - Recreation.gov: https://ridb.recreation.gov/docs
   - Google Places: https://developers.google.com/maps/documentation/places/web-service/get-api-key
   - OpenAI (optional): https://platform.openai.com/api-keys

2. **Start Collection**
   ```bash
   # Recommended: Start with one country
   python main.py --countries australia --data-types all
   
   # Then expand to others
   python main.py --countries new_zealand --data-types all
   python main.py --countries canada --data-types all
   python main.py --countries united_states --data-types all
   python main.py --countries great_britain --data-types all
   ```

3. **Monitor Progress**
   - Check `logs/main.log` for detailed progress
   - Raw data saved to `data/raw/`
   - Checkpoint files allow resuming if interrupted

### Phase 2: Data Processing (Week 2)

The system automatically:
- Deduplicates locations within 500m proximity
- Validates all data (coordinates, required fields)
- Enhances with AI-generated descriptions
- Standardizes formats and naming

Processed data saved to `data/processed/`

### Phase 3: Database Integration (Week 3)

1. **Review Generated SQL**
   ```bash
   # Check SQL files in outputs/sql/
   ls -la outputs/sql/
   ```

2. **Test Import on Staging**
   ```sql
   -- Use a copy of your database first!
   -- Run the master migration
   \i outputs/sql/MASTER_MIGRATION.sql
   ```

3. **Import to Production**
   ```bash
   # Option 1: Direct import
   psql -h your-db-host -d your-db-name -f outputs/sql/MASTER_MIGRATION.sql
   
   # Option 2: Via Supabase dashboard
   # Copy SQL content and run in SQL editor
   ```

4. **Verify Import**
   ```sql
   -- Check counts
   SELECT 'national_parks' as table_name, COUNT(*) as count FROM national_parks
   UNION ALL
   SELECT 'camping_locations', COUNT(*) FROM camping_locations
   UNION ALL
   SELECT 'points_of_interest', COUNT(*) FROM points_of_interest
   UNION ALL
   SELECT 'swimming_locations', COUNT(*) FROM swimming_locations;
   ```

### Phase 4: Cleanup (Week 4)

1. **Update PAM Integration**
   - Ensure PAM queries use new tables
   - Test location searches
   - Verify data quality

2. **Backup Collected Data**
   ```bash
   # Archive the final data
   tar -czf wheels-wins-data-backup.tar.gz data/final/
   ```

3. **Delete Collection System**
   ```bash
   # Remove entire directory
   cd ..
   rm -rf wheels-wins-data-collector/
   ```

## Command Line Options

```bash
python main.py [OPTIONS]

Options:
  --countries     Countries to collect (comma-separated or "all")
                  Values: australia, new_zealand, canada, united_states, great_britain
                  
  --data-types    Data types to collect (comma-separated or "all")  
                  Values: national_parks, camping_spots, attractions, swimming_spots
                  
  --test-run      Run in test mode with limited data collection
  
  --config-path   Path to configuration files (default: config)

Examples:
  python main.py --countries all --data-types all
  python main.py --countries australia,canada --data-types parks,camping
  python main.py --test-run
```

## Data Organization

### Output Structure
```
data/
├── raw/                    # Original scraped data
│   ├── australia_national_parks_20240205_143022.json
│   └── ...
├── processed/              # Deduplicated, validated, enhanced
│   └── all_locations_processed.json
└── final/                  # Organized for use
    ├── by_country/         # All data for each country
    ├── by_type/            # All data for each type
    ├── by_country_and_type/  # Specific combinations
    ├── all_locations_master.json.gz
    └── INDEX.json          # Metadata and statistics

outputs/
└── sql/                    # Database import files
    ├── national_parks_001.sql
    ├── camping_spots_001.sql
    ├── MASTER_MIGRATION.sql
    └── ROLLBACK_MIGRATION.sql
```

### Data Quality Reports

Check `data/final/INDEX.json` for:
- Total locations collected
- Breakdown by country and type
- Data completeness percentages
- File sizes and locations

## Troubleshooting

### Common Issues

1. **API Rate Limits**
   - System respects rate limits automatically
   - If blocked, wait and resume later
   - Check `config/data_sources.yaml` to adjust limits

2. **Memory Issues**
   - Process countries one at a time
   - Reduce batch sizes in code
   - Use a machine with more RAM

3. **Network Timeouts**
   - System will retry automatically
   - Check internet connection
   - Resume from checkpoints

4. **Database Import Fails**
   - Check table exists with correct schema
   - Verify permissions
   - Try smaller batches

### Rollback

If you need to undo the import:
```sql
-- Use the generated rollback script
\i outputs/sql/ROLLBACK_MIGRATION.sql
```

## Safety Notes

- ✅ This system is completely isolated from your live site
- ✅ No shared dependencies or databases
- ✅ Outputs to files first for review
- ✅ Test imports on staging first
- ✅ Keep backups before importing
- ✅ Delete entire system when done

## Expected Results

After successful collection:
- ~2,000 National Parks
- ~15,000 Camping Spots  
- ~10,000 Tourist Attractions
- ~5,000 Swimming Spots
- **Total: ~35,000 verified locations**

All with:
- Accurate coordinates
- Descriptions
- RV accessibility info
- Contact details
- Images/photos
- Amenities
- Seasonal information

---
**Remember: Delete this entire system after successful data integration!**