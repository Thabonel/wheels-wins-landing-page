
# PAM Backend Development Scripts

This directory contains development utilities for the PAM backend system.

## Available Scripts

### 1. seed_database.py
Seeds the database with test data for development and testing.

```bash
python seed_database.py
```

Creates sample data for:
- Test user profiles
- Expenses and budget categories
- Maintenance records
- Fuel logs
- Camping locations
- Hustle ideas
- Social posts and groups

### 2. create_admin.py
Manages admin users in the system.

```bash
# Create admin user
python create_admin.py create --email admin@example.com

# Create admin with specific user ID
python create_admin.py create --email admin@example.com --user-id uuid-here

# List all admin users
python create_admin.py list

# Remove admin user
python create_admin.py remove --email admin@example.com
```

### 3. test_pam.py
Comprehensive testing of PAM AI responses and functionality.

```bash
python test_pam.py
```

Tests include:
- Basic response generation
- Context and memory retention
- Intent classification accuracy
- Performance benchmarks

Generates detailed test reports with JSON output.

### 4. migrate_data.py
Migrates data from old structure to new PAM backend format.

```bash
python migrate_data.py data_file.json
```

Features:
- Automatic backup creation
- Data structure mapping
- Migration progress tracking
- Detailed migration reports

### 5. health_check.py
Comprehensive health check for all backend services.

```bash
python health_check.py
```

Checks:
- Database connectivity
- Essential table accessibility
- Row Level Security policies
- Database functions
- PAM AI system
- Data integrity

Exit codes:
- 0: Healthy
- 1: Unhealthy
- 2: Degraded

### 6. generate_api_docs.py
Generates OpenAPI documentation for the backend API.

```bash
python generate_api_docs.py
```

Outputs:
- `openapi.json` - OpenAPI 3.0 specification
- `api_docs.html` - Interactive Swagger UI documentation

## Requirements

All scripts require:
- Python 3.8+
- Backend dependencies installed
- Proper environment configuration
- Supabase connection configured

## Usage Notes

1. **Environment**: Ensure your `.env` file is properly configured before running scripts
2. **Permissions**: Some scripts require admin privileges or specific database permissions
3. **Backups**: Critical scripts like `migrate_data.py` automatically create backups
4. **Logging**: All scripts provide detailed logging output and save reports to files

## Development Workflow

Typical development workflow using these scripts:

```bash
# 1. Check system health
python health_check.py

# 2. Seed development data
python seed_database.py

# 3. Create admin user
python create_admin.py create --email dev@example.com

# 4. Test PAM functionality
python test_pam.py

# 5. Generate API documentation
python generate_api_docs.py
```

## Troubleshooting

If scripts fail:

1. Check database connectivity
2. Verify environment variables
3. Ensure required tables exist
4. Check logs for specific error messages
5. Run health check for system status

For additional help, check the individual script source code or contact the development team.
