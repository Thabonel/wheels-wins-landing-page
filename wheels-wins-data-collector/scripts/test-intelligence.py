#!/usr/bin/env python3
"""
Test the Intelligent Context Saver
Demonstrates the intelligence criteria and thresholds
"""

import asyncio
import sys
from pathlib import Path

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

# Import the class directly from the file
import importlib.util
spec = importlib.util.spec_from_file_location("intelligent_context_saver",
                                              Path(__file__).parent / "intelligent-context-saver.py")
intelligent_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(intelligent_module)
IntelligentContextSaver = intelligent_module.IntelligentContextSaver

async def test_intelligence():
    """Test various scenarios to see what triggers context saves"""

    project_root = str(Path(__file__).parent.parent)
    context_saver = IntelligentContextSaver(project_root)

    print("🧪 Testing Intelligent Context Saver Decision Making")
    print("=" * 60)

    # Test scenarios
    scenarios = [
        {
            'name': 'Bug Fix Scenario',
            'files': ['scrapers/real_parks_scraper.py', 'services/database_state.py'],
            'description': 'Simulates fixing coordinate parsing errors'
        },
        {
            'name': 'New Feature Scenario',
            'files': ['scrapers/real_attractions_scraper.py', 'services/photo_scraper.py'],
            'description': 'Simulates adding Google Places API integration'
        },
        {
            'name': 'Config Change Scenario',
            'files': ['package.json', '.env'],
            'description': 'Simulates updating configuration files'
        },
        {
            'name': 'Minor Documentation',
            'files': ['README.md'],
            'description': 'Simulates small documentation update'
        },
        {
            'name': 'Database Migration',
            'files': ['migrations/001_add_photo_fields.sql'],
            'description': 'Simulates critical database changes'
        }
    ]

    for scenario in scenarios:
        print(f"\n📋 {scenario['name']}")
        print(f"   {scenario['description']}")
        print(f"   Files: {', '.join(scenario['files'])}")

        # Test significance analysis
        significance = await context_saver.analyze_significance(scenario['files'])

        # Mock some conditions for testing
        context_saver.last_save_time = context_saver.last_save_time - 400  # 6+ minutes ago

        should_save = await context_saver.should_save_context()

        print(f"   📊 Significance: {significance:.2f}")
        print(f"   🤖 Decision: {'🟢 SAVE CONTEXT' if should_save else '🔴 SKIP SAVE'}")

        if should_save:
            print(f"   💡 Reason: High significance ({significance:.2f}) above threshold (0.7)")
        else:
            print(f"   💡 Reason: Low significance ({significance:.2f}) below threshold (0.7)")

    print("\n" + "=" * 60)
    print("🎯 Intelligence Summary:")
    print("   • Code changes: High significance (0.3-0.4)")
    print("   • Bug fixes: Very high significance (0.25+ bonus)")
    print("   • New features: High significance (0.2+ bonus)")
    print("   • Config files: Medium significance (0.2)")
    print("   • Database changes: Critical significance (0.4)")
    print("   • Documentation only: Low significance (0.1)")
    print(f"   • Threshold for auto-save: {context_saver.significance_threshold}")

if __name__ == "__main__":
    asyncio.run(test_intelligence())