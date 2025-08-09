
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

### 4. `final_cleanup.py`
**NEW** - Complete cleanup script that removes old directories and finalizes migration.

**Features:**
- Creates timestamped backups of all old directories
- Removes `/app`, `/pam-backend`, and `/scraper_service` directories
- Updates `.gitignore` and `README.md`
- Commits changes with descriptive message
- Generates completion report
- Final project structure validation

**Safety features:**
- Always creates backups before deletion
- Asks for confirmation before destructive operations
- Generates detailed reports
- Git integration for change tracking

**Usage:**
```bash
cd /path/to/project
python backend/scripts/final_cleanup.py
```

### 5. `complete_migration.py`
Runs the complete migration process (verification + optional final cleanup).

**Process:**
1. Runs migration verification
2. Reports results
3. Optionally runs final cleanup if verification passes
4. Completes the migration with old directory removal

**Usage:**
```bash
cd /path/to/project
python backend/scripts/complete_migration.py
```

### 6. `update_environment_vars.py`
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

### Complete Migration Steps (Recommended)

1. **Backup your project**
   ```bash
   git add . && git commit -m "Pre-migration backup"
   ```

2. **Run the complete migration**
   ```bash
   python backend/scripts/complete_migration.py
   ```

   This will:
   - Run verification checks
   - Ask for confirmation
   - Remove old directories safely
   - Update project files
   - Commit changes

### Manual Migration Steps (Advanced)

1. **Backup your project**
   ```bash
   git add . && git commit -m "Pre-migration backup"
   ```

2. **Run the migration preparation**
   ```bash
   python backend/scripts/migrate_from_old.py
   ```

3. **Verify the migration**
   ```bash
   python backend/scripts/verify_migration.py
   ```

4. **Final cleanup** (only if verification passes)
   ```bash
   python backend/scripts/final_cleanup.py
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
- `cleanup_old_structure_report_YYYYMMDD_HHMMSS.json`
- Details of what was removed and backed up

### Final Cleanup Report
- `cleanup_completion_report_YYYYMMDD_HHMMSS.json`
- Complete migration summary and final status

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

6. **Old Directories Still Present**
   - Run final cleanup script manually
   - Check for file permission issues
   - Ensure no processes are using old directories

### Getting Help

If you encounter issues:

1. Check the generated reports for detailed error information
2. Review the console output for specific error messages
3. Ensure all prerequisites are met
4. Try running individual scripts to isolate issues
5. Check backup directories if rollback is needed

## Safety Features

All scripts include comprehensive safety features:

- **Automatic backup creation** before any destructive operations
- **Multi-stage verification** before cleanup
- **Git integration** for complete version control
- **Detailed logging** and reporting for troubleshooting
- **User confirmation** for all destructive operations
- **Rollback capabilities** through timestamped backups
- **Environment validation** before proceeding
- **Error handling** with graceful failures

## File Structure After Complete Migration

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
│   ├── Dockerfile
│   └── scripts/
├── .github/
│   └── workflows/
├── frontend files...
├── docs/
├── migration_backup_*/  # Created during cleanup
├── *_backup_YYYYMMDD_HHMMSS/  # Timestamped backups
└── cleanup_completion_report_*.json  # Final reports
```

The old `/app`, `/pam-backend`, and `/scraper_service` directories will be safely backed up with timestamps and then removed.

## Migration Completion Checklist

After running the complete migration:

- [ ] ✅ All verification checks passed
- [ ] ✅ Old directories backed up with timestamps
- [ ] ✅ Old directories removed safely
- [ ] ✅ `.gitignore` updated for new structure
- [ ] ✅ `README.md` updated with migration notes
- [ ] ✅ Changes committed to git
- [ ] ✅ Completion report generated
- [ ] ✅ Backend ready for deployment
- [ ] ✅ All functionality preserved
- [ ] ✅ Project structure modernized

🎉 **Migration Complete!** Your PAM backend is now running on the unified, modern structure and ready for deployment.
