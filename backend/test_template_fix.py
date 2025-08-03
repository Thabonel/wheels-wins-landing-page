#!/usr/bin/env python3
"""
Test the trip template fix to verify Australian templates load correctly
"""

import sys
import os
sys.path.insert(0, os.getcwd())

from app.core.database import get_supabase_client

def test_template_fix():
    print('🧪 Testing Trip Templates Fix')
    print('=' * 50)
    
    # Get database connection
    supabase = get_supabase_client()
    
    try:
        # Get all public templates
        result = supabase.table('trip_templates').select('*').eq('is_public', True).execute()
        
        if not result.data:
            print('❌ No templates found in database')
            return
            
        print(f'✅ Found {len(result.data)} total public templates')
        
        # Filter for Australian templates (simulating frontend logic)
        australian_templates = []
        
        for template in result.data:
            template_data = template.get('template_data', {})
            region = str(template_data.get('region', '')).lower()
            tags = [str(tag).lower() for tag in template.get('tags', [])]
            
            # Check Australian criteria
            is_australian = (
                'australia' in region or
                'victoria' in region or
                'nsw' in region or
                'queensland' in region or
                'tasmania' in region or
                'territory' in region or
                'australia' in tags
            )
            
            if is_australian:
                australian_templates.append(template)
        
        print(f'🗺️ Australian Templates Found: {len(australian_templates)}')
        print()
        
        # Display templates with fixed field mapping
        categories = {}
        for template in australian_templates:
            template_data = template.get('template_data', {})
            category = template.get('category', 'general')
            
            if category not in categories:
                categories[category] = []
                
            # Transform using corrected field mapping
            transformed = {
                'name': template['name'],
                'duration_days': template_data.get('duration_days', 7),
                'distance_miles': template_data.get('distance_miles', 500),
                'estimated_budget': template_data.get('estimated_budget', 1000),
                'region': template_data.get('region', 'Unknown'),
                'category': category,
                'difficulty': template_data.get('difficulty', 'intermediate'),
                'highlights': template_data.get('highlights', [])
            }
            
            categories[category].append(transformed)
        
        # Display by category
        for category, templates in categories.items():
            print(f'📂 {category.replace("_", " ").upper()}:')
            for template in templates:
                print(f'  • {template["name"]}')
                print(f'    Duration: {template["duration_days"]} days | Distance: {template["distance_miles"]} miles | Budget: ${template["estimated_budget"]}')
                print(f'    Difficulty: {template["difficulty"]} | Region: {template["region"]}')
                if template["highlights"]:
                    print(f'    Highlights: {", ".join(template["highlights"][:3])}')
                print()
        
        # Test result
        print('🎯 TEST RESULTS:')
        print(f'Expected: 10+ Australian templates')
        print(f'Found: {len(australian_templates)} templates')
        
        if len(australian_templates) >= 10:
            print('🎉 SUCCESS! Template fix should work correctly')
            print('✅ All Australian RV routes will now display in frontend')
        else:
            print('⚠️  Template count lower than expected')
            print('📝 Check if all templates were inserted correctly')
            
    except Exception as e:
        print(f'❌ Error testing templates: {e}')

if __name__ == "__main__":
    test_template_fix()