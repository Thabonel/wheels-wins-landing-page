
# PAM Backend Migration Scripts

This directory contains scripts for migrating from the old `/app` structure to the new `/backend` structure.

## Scripts Overview

### 1. `migrate_from_old.py`
Migrates code and configurations from the old structure to the new backend structure.

**Features:**
- Copies environment variables
- Migrates custom code from `/app`
- Identifies deprecated code
- Creates migration reports
- Handles data transformations
- Preserves git history references

**Usage:**
```bash
cd /path/to/project
python backend/scripts/migrate_from_old.py
```

### 2. `verify_migration.py`
Comprehensive verification that the migration was successful.

**Checks performed:**
- ✅ Environment variables validation
- ✅ File structure verification
- ✅ Python imports testing
- ✅ Database connectivity
- ✅ API endpoints health
- ✅ WebSocket connections
- ✅ Basic smoke tests

**Usage:**
```bash
cd /path/to/project
python backend/scripts/verify_migration.py
```

**Exit codes:**
- `0`: All checks passed
- `1`: Some checks failed

### 3. `cleanup_old_structure.py`
Safely removes old directory structure after successful verification.

**Safety features:**
- Requires successful verification first
- Creates backup before removal
- Updates .gitignore
- Commits changes to git
- Generates cleanup report

**Usage:**
```bash
cd /path/to/project
python backend/scripts/cleanup_old_structure.py
```

### 4. `complete_migration.py`
Runs the complete migration process (verification + optional cleanup).

**Process:**
1. Runs migration verification
2. Reports results
3. Optionally runs cleanup if verification passes

**Usage:**
```bash
cd /path/to/project
python backend/scripts/complete_migration.py
```

### 5. `update_environment_vars.py`
Utility for managing environment variables across deployment platforms.

**Features:**
- Check current environment variables
- Generate Render.com configuration
- Generate Docker environment files
- List required GitHub secrets
- Create environment templates
- Validate environment setup

**Usage:**
```bash
# Check current environment
python backend/scripts/update_environment_vars.py check

# Generate Render config
python backend/scripts/update_environment_vars.py render

# Generate Docker env file
python backend/scripts/update_environment_vars.py docker

# List GitHub secrets needed
python backend/scripts/update_environment_vars.py github

# Create .env template
python backend/scripts/update_environment_vars.py template

# Validate environment
python backend/scripts/update_environment_vars.py validate
```

## Migration Process

### Recommended Migration Steps

1. **Backup your project**
   ```bash
   git add . && git commit -m "Pre-migration backup"
   ```

2. **Run the migration**
   ```bash
   python backend/scripts/migrate_from_old.py
   ```

3. **Verify the migration**
   ```bash
   python backend/scripts/verify_migration.py
   ```

4. **Clean up old structure** (only if verification passes)
   ```bash
   python backend/scripts/cleanup_old_structure.py
   ```

### Or use the complete migration script:
```bash
python backend/scripts/complete_migration.py
```

## Environment Setup

Before running migration scripts, ensure you have:

### Required Environment Variables
- `ENVIRONMENT` - Environment name (development/production)
- `OPENAI_API_KEY` - OpenAI API key
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `SECRET_KEY` - Application secret key

### Optional Environment Variables
- `REDIS_URL` - Redis connection string
- `SENTRY_DSN` - Sentry error tracking DSN
- `LOG_LEVEL` - Logging level (INFO, DEBUG, etc.)
- `MAX_CONNECTIONS` - Database connection limit
- `RATE_LIMIT_PER_MINUTE` - API rate limiting

## Generated Reports

The scripts generate several reports:

### Migration Report
- `migration_report_YYYYMMDD_HHMMSS.json`
- Details what was migrated and any issues

### Verification Report
- `migration_verification_report_YYYYMMDD_HHMMSS.json`
- Results of all verification checks

### Cleanup Report
- `cleanup_report_YYYYMMDD_HHMMSS.json`
- Details of what was removed and backed up

## Troubleshooting

### Common Issues

1. **Import Errors**
   - Ensure you're running from the project root
   - Check that `backend` directory exists
   - Verify Python path includes backend

2. **Environment Variable Missing**
   - Use `update_environment_vars.py check` to identify missing vars
   - Create `.env` file with required variables
   - Check deployment platform configuration

3. **Database Connection Failed**
   - Verify Supabase credentials
   - Check network connectivity
   - Ensure database is accessible

4. **API Endpoints Not Responding**
   - Start the backend server first
   - Check server logs for errors
   - Verify endpoint URLs

5. **WebSocket Connection Failed**
   - Ensure WebSocket server is running
   - Check firewall/network settings
   - Verify WebSocket URL format

### Getting Help

If you encounter issues:

1. Check the generated reports for detailed error information
2. Review the console output for specific error messages
3. Ensure all prerequisites are met
4. Try running individual scripts to isolate issues

## Safety Features

All scripts include safety features:

- **Backup creation** before destructive operations
- **Verification checks** before cleanup
- **Git integration** for version control
- **Detailed logging** for troubleshooting
- **User confirmation** for destructive operations
- **Rollback capabilities** through backups

## File Structure After Migration

```
project/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── core/
│   │   ├── api/
│   │   ├── services/
│   │   └── database/
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── render.yaml
│   └── scripts/
├── .github/
│   └── workflows/
├── frontend files...
└── migration_backup_*/  # Created during cleanup
```

The old `/app`, `/pam-backend`, and `/scraper_service` directories will be safely backed up and removed.
