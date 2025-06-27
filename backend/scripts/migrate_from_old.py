
#!/usr/bin/env python3
"""
PAM Backend Migration Script
Migrates from old /app structure to new /backend structure.
"""

import os
import sys
import shutil
import json
from datetime import datetime
from pathlib import Path

def migrate_environment_variables():
    """Migrate environment variables from old locations."""
    old_env_files = ['.env', 'app/.env', 'pam-backend/.env']
    backend_env = 'backend/.env'
    
    # Collect all environment variables
    env_vars = {}
    
    for env_file in old_env_files:
        if os.path.exists(env_file):
            print(f"📋 Found environment file: {env_file}")
            with open(env_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        env_vars[key.strip()] = value.strip()
    
    # Write consolidated environment file
    if env_vars:
        os.makedirs('backend', exist_ok=True)
        with open(backend_env, 'w') as f:
            f.write("# PAM Backend Environment Variables\n")
            f.write(f"# Migrated on {datetime.now().isoformat()}\n\n")
            
            for key, value in sorted(env_vars.items()):
                f.write(f"{key}={value}\n")
        
        print(f"✅ Created consolidated environment file: {backend_env}")
        print(f"   - Migrated {len(env_vars)} environment variables")
    else:
        print("⚠️  No environment variables found to migrate")

def migrate_custom_code():
    """Identify and document custom code that needs manual migration."""
    custom_code_locations = []
    
    # Check for custom modifications
    old_dirs = ['app', 'pam-backend', 'scraper_service']
    
    for old_dir in old_dirs:
        if os.path.exists(old_dir):
            for root, dirs, files in os.walk(old_dir):
                for file in files:
                    if file.endswith(('.py', '.js', '.ts', '.json', '.yaml', '.yml')):
                        file_path = os.path.join(root, file)
                        
                        # Check if file has custom modifications
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                                
                                # Look for custom indicators
                                custom_indicators = [
                                    'TODO', 'FIXME', 'CUSTOM', 'HACK',
                                    'your-api-key', 'localhost:3000',
                                    'custom_function', 'user_defined'
                                ]
                                
                                if any(indicator.lower() in content.lower() for indicator in custom_indicators):
                                    custom_code_locations.append({
                                        'file': file_path,
                                        'size': os.path.getsize(file_path),
                                        'modified': datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
                                    })
                        except Exception as e:
                            print(f"⚠️  Could not analyze {file_path}: {e}")
    
    return custom_code_locations

def create_migration_report(custom_code: list):
    """Create a detailed migration report."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = f"migration_report_{timestamp}.json"
    
    report = {
        "migration_date": datetime.now().isoformat(),
        "old_structure": {
            "directories": ["app", "pam-backend", "scraper_service"],
            "preserved_as_backup": True
        },
        "new_structure": {
            "backend_directory": "backend/",
            "consolidated": True
        },
        "custom_code_identified": len(custom_code),
        "custom_code_files": custom_code,
        "migration_status": "environment_migrated",
        "next_steps": [
            "Review custom code files listed above",
            "Manually migrate custom logic to backend/app/",
            "Run verification script",
            "Remove old directories after verification"
        ]
    }
    
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"📊 Migration report created: {report_path}")
    return report_path

def main():
    """Main migration function."""
    print("🚀 PAM Backend Migration from Old Structure")
    print(f"Started at: {datetime.now().isoformat()}")
    print("=" * 60)
    
    # Step 1: Migrate environment variables
    print("\n📋 Step 1: Migrating environment variables...")
    migrate_environment_variables()
    
    # Step 2: Identify custom code
    print("\n🔍 Step 2: Identifying custom code...")
    custom_code = migrate_custom_code()
    
    if custom_code:
        print(f"📝 Found {len(custom_code)} files with potential custom code:")
        for item in custom_code[:5]:  # Show first 5
            print(f"   - {item['file']}")
        if len(custom_code) > 5:
            print(f"   ... and {len(custom_code) - 5} more")
    else:
        print("✅ No custom code indicators found")
    
    # Step 3: Create migration report
    print("\n📊 Step 3: Creating migration report...")
    report_path = create_migration_report(custom_code)
    
    # Summary
    print("\n" + "=" * 60)
    print("✅ MIGRATION PREPARATION COMPLETED")
    print(f"Completed at: {datetime.now().isoformat()}")
    print(f"\n📊 Report: {report_path}")
    
    if custom_code:
        print(f"\n⚠️  MANUAL ACTION REQUIRED:")
        print(f"   - Review {len(custom_code)} files with custom code")
        print(f"   - Migrate custom logic to backend/app/ structure")
        print(f"   - See migration report for details")
    
    print(f"\n🔄 NEXT STEPS:")
    print(f"   1. Review the migration report")
    print(f"   2. Migrate any custom code manually")
    print(f"   3. Run: python backend/scripts/verify_migration.py")
    print(f"   4. Run: python backend/scripts/complete_migration.py")

if __name__ == "__main__":
    main()
