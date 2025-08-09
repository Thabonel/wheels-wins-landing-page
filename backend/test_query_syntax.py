#!/usr/bin/env python3
"""
Test the corrected PostgreSQL query syntax to verify it works
"""

import sys
import os
sys.path.insert(0, os.getcwd())

from app.core.database import get_supabase_client

def test_query_syntax():
    print('🧪 Testing Corrected PostgreSQL Query Syntax')
    print('=' * 60)
    
    supabase = get_supabase_client()
    
    # Test the corrected Australian query syntax
    # This simulates what the frontend should now be doing
    
    try:
        print('1️⃣ Testing simplified tag-based query...')
        
        # Use a simple tag-based query first
        result = supabase.table('trip_templates').select('*').eq('is_public', True).contains('tags', ['australia']).execute()
        
        print(f'✅ Tag-based query: Found {len(result.data) if result.data else 0} templates')
        
        if result.data:
            for template in result.data:
                template_data = template.get('template_data', {})
                print(f'  • {template["name"]} (Region: {template_data.get("region", "N/A")})')
        
        print()
        
        print('2️⃣ Testing region-based ilike query...')
        
        # Test region-based query with correct syntax
        result2 = supabase.table('trip_templates').select('*').eq('is_public', True).ilike('template_data->>region', '%Australia%').execute()
        
        print(f'✅ Region ilike query: Found {len(result2.data) if result2.data else 0} templates')
        
        if result2.data:
            for template in result2.data:
                template_data = template.get('template_data', {})
                print(f'  • {template["name"]} (Region: {template_data.get("region", "N/A")})')
        
        print()
        
        print('3️⃣ Testing combined OR query...')
        
        # Test the exact OR query format that should work
        query_string = 'template_data->>region.ilike.%Australia%,template_data->>region.ilike.%Victoria%,template_data->>region.ilike.%NSW%,tags.cs.["australia"]'
        
        try:
            result3 = supabase.table('trip_templates').select('*').eq('is_public', True).or_(query_string).execute()
            
            print(f'✅ Combined OR query: Found {len(result3.data) if result3.data else 0} templates')
            
            if result3.data:
                for template in result3.data:
                    template_data = template.get('template_data', {})
                    print(f'  • {template["name"]} (Region: {template_data.get("region", "N/A")})')
            
        except Exception as e:
            print(f'❌ Combined OR query failed: {e}')
            print('Trying alternative syntax...')
            
            # Try alternative OR syntax
            try:
                result3_alt = supabase.table('trip_templates').select('*').eq('is_public', True).or_('template_data->>region.ilike.%Australia%').execute()
                print(f'✅ Simple OR query: Found {len(result3_alt.data) if result3_alt.data else 0} templates')
            except Exception as e2:
                print(f'❌ Alternative OR query also failed: {e2}')
        
        print()
        print('🎯 RECOMMENDATION:')
        
        # Determine best approach based on results
        tag_count = len(result.data) if result.data else 0
        region_count = len(result2.data) if result2.data else 0
        
        if tag_count >= 10:
            print('✅ Use tag-based query: tags.cs.["australia"] - Most reliable')
        elif region_count >= 10:
            print('✅ Use region ilike query: template_data->>region.ilike.%Australia% - Good alternative')
        else:
            print('⚠️ Both queries return limited results - investigate further')
            
        print(f'Tag-based: {tag_count} templates | Region-based: {region_count} templates')
        
    except Exception as e:
        print(f'❌ Test failed: {e}')

if __name__ == "__main__":
    test_query_syntax()