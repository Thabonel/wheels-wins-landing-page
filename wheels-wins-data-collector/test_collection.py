#!/usr/bin/env python3
"""
Test Script for Wheels & Wins Data Collection System

Run a small test collection to verify everything works before full collection.

Usage:
    python test_collection.py
"""

import asyncio
import sys
from pathlib import Path

# Add project to path
sys.path.append(str(Path(__file__).parent))

from main import DataCollectionOrchestrator
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def test_collection():
    """Run a test collection with minimal data"""
    
    print("🧪 Wheels & Wins Data Collection System - TEST MODE")
    print("=" * 60)
    print()
    
    # Initialize orchestrator
    orchestrator = DataCollectionOrchestrator()
    
    # Test with limited data
    test_countries = ['australia']  # Just one country
    test_data_types = ['national_parks']  # Just one type
    
    print(f"Testing with:")
    print(f"  Countries: {test_countries}")
    print(f"  Data types: {test_data_types}")
    print()
    
    try:
        # Run test collection
        await orchestrator.collect_data(
            countries=test_countries,
            data_types=test_data_types,
            test_run=True
        )
        
        print("\n✅ Test collection completed successfully!")
        print("\nCheck the following directories for output:")
        print("  • data/raw/ - Raw collected data")
        print("  • data/processed/ - Processed and validated data")
        print("  • data/final/ - Final organized data")
        print("  • outputs/ - SQL export files")
        print("\nIf everything looks good, run the full collection with:")
        print("  python main.py --countries all --data-types all")
        
    except Exception as e:
        print(f"\n❌ Test collection failed: {e}")
        print("\nPlease check:")
        print("  1. Configuration files in config/")
        print("  2. API keys in .env file")
        print("  3. Internet connection")
        print("  4. Error logs above")
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(test_collection())
    sys.exit(exit_code)