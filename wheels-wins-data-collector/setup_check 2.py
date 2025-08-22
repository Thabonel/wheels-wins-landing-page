#!/usr/bin/env python3
"""
Setup Check Script - Verify the data collection system is ready to run

This script checks:
1. Python dependencies
2. Environment variables
3. Directory structure
4. API connectivity
5. Database connectivity
"""

import sys
import os
from pathlib import Path
import importlib
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_python_version():
    """Check Python version is 3.7+"""
    print("🔍 Checking Python version...")
    version = sys.version_info
    if version.major >= 3 and version.minor >= 7:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} - OK")
        return True
    else:
        print(f"❌ Python {version.major}.{version.minor}.{version.micro} - Need 3.7+")
        return False

def check_dependencies():
    """Check required Python packages are installed"""
    print("\n🔍 Checking dependencies...")
    
    required_packages = [
        ('aiohttp', 'aiohttp'),
        ('beautifulsoup4', 'bs4'),
        ('pandas', 'pandas'),
        ('supabase', 'supabase'),
        ('pyyaml', 'yaml'),
        ('loguru', 'loguru'),
        ('pydantic', 'pydantic'),
        ('tqdm', 'tqdm'),
        ('click', 'click')
    ]
    
    missing = []
    for package_name, import_name in required_packages:
        try:
            importlib.import_module(import_name)
            print(f"✅ {package_name} - installed")
        except ImportError:
            print(f"❌ {package_name} - missing")
            missing.append(package_name)
    
    if missing:
        print(f"\n⚠️  Missing packages: {', '.join(missing)}")
        print("Run: pip install -r requirements.txt")
        return False
    
    return True

def check_environment_variables():
    """Check required environment variables are set"""
    print("\n🔍 Checking environment variables...")
    
    required_vars = {
        'SUPABASE_URL': 'Database connection',
        'SUPABASE_KEY': 'Database authentication',
        'OPENAI_API_KEY': 'AI enhancement (optional)'
    }
    
    optional_vars = {
        'NPS_API_KEY': 'US National Parks data',
        'GOOGLE_PLACES_KEY': 'Enhanced location data',
        'RECREATION_GOV_KEY': 'US camping data'
    }
    
    all_good = True
    
    # Check required
    for var, description in required_vars.items():
        value = os.getenv(var)
        if value and value != f"your_{var.lower()}_here":
            print(f"✅ {var} - set ({description})")
        else:
            print(f"❌ {var} - missing ({description})")
            all_good = False
    
    # Check optional
    print("\nOptional API keys (will use limited data sources if missing):")
    for var, description in optional_vars.items():
        value = os.getenv(var)
        if value and value != f"your_{var.lower()}_here":
            print(f"✅ {var} - set ({description})")
        else:
            print(f"⚠️  {var} - not set ({description})")
    
    return all_good

def check_directory_structure():
    """Check required directories exist"""
    print("\n🔍 Checking directory structure...")
    
    required_dirs = [
        'config',
        'scrapers',
        'data_processors',
        'outputs',
        'data/raw',
        'data/processed',
        'data/final',
        'logs'
    ]
    
    all_good = True
    for dir_path in required_dirs:
        path = Path(dir_path)
        if path.exists():
            print(f"✅ {dir_path}/ - exists")
        else:
            print(f"❌ {dir_path}/ - missing")
            all_good = False
    
    return all_good

def check_config_files():
    """Check configuration files exist"""
    print("\n🔍 Checking configuration files...")
    
    config_files = [
        'config/countries.yaml',
        'config/data_sources.yaml',
        '.env'
    ]
    
    all_good = True
    for file_path in config_files:
        path = Path(file_path)
        if path.exists():
            print(f"✅ {file_path} - exists")
        else:
            print(f"❌ {file_path} - missing")
            all_good = False
    
    return all_good

async def check_database_connection():
    """Check database connectivity"""
    print("\n🔍 Checking database connection...")
    
    try:
        from supabase import create_client
        
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_KEY')
        
        if not url or not key:
            print("❌ Database credentials not set")
            return False
        
        # Try to connect
        supabase = create_client(url, key)
        
        # Test query
        result = supabase.table('trip_templates').select('id').limit(1).execute()
        
        print("✅ Database connection successful")
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

async def check_api_connectivity():
    """Check basic API connectivity"""
    print("\n🔍 Checking API connectivity...")
    
    try:
        import aiohttp
        
        # Test basic internet connectivity
        async with aiohttp.ClientSession() as session:
            async with session.get('https://www.google.com') as response:
                if response.status == 200:
                    print("✅ Internet connectivity - OK")
                    return True
                else:
                    print(f"❌ Internet connectivity issue: {response.status}")
                    return False
                    
    except Exception as e:
        print(f"❌ Internet connectivity failed: {e}")
        return False

async def main():
    """Run all checks"""
    print("🌟 Wheels & Wins Data Collection System - Setup Check")
    print("=" * 60)
    
    checks = [
        ("Python Version", check_python_version()),
        ("Dependencies", check_dependencies()),
        ("Environment Variables", check_environment_variables()),
        ("Directory Structure", check_directory_structure()),
        ("Config Files", check_config_files()),
        ("Database Connection", await check_database_connection()),
        ("API Connectivity", await check_api_connectivity())
    ]
    
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    
    all_passed = True
    for check_name, passed in checks:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{check_name}: {status}")
        if not passed:
            all_passed = False
    
    print("=" * 60)
    
    if all_passed:
        print("\n🎉 All checks passed! System is ready to run.")
        print("\nNext steps:")
        print("1. Run test collection: python test_collection.py")
        print("2. Run full collection: python main.py --countries all --data-types all")
    else:
        print("\n⚠️  Some checks failed. Please fix the issues above before running.")
        print("\nCommon fixes:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Set environment variables in .env file")
        print("3. Run create_missing_tables.sql in Supabase")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)