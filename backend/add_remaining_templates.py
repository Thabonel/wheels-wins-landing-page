#!/usr/bin/env python3
"""
Add remaining Australian trip templates to the database
"""

import sys
import os
sys.path.insert(0, os.getcwd())

from app.core.database import get_supabase_client

def add_remaining_templates():
    # Initialize Supabase client
    supabase = get_supabase_client()
    
    # Remaining trip templates (9 more)
    templates = [
        {
            'user_id': '21a2151a-cd37-41d5-a1c7-124bb05e7a6a',
            'name': 'Pacific Coast Explorer',
            'description': 'Sydney to Cairns coastal journey through NSW and Queensland, featuring beautiful beaches and rainforests.',
            'category': 'coastal_routes',
            'is_public': True,
            'tags': ['australia', 'rv', 'pacific_coast', 'beaches'],
            'usage_count': 0,
            'template_data': {
                'title': 'Pacific Coast Explorer',
                'description': 'Journey along Australia\'s spectacular Pacific coastline from Sydney to Cairns. Experience world-class beaches, subtropical rainforests, charming coastal towns, and access to the Great Barrier Reef. Perfect for RV travelers with excellent infrastructure.',
                'difficulty': 'intermediate',
                'duration_days': 21,
                'distance_miles': 1200,
                'estimated_budget': 4200,
                'currency': 'AUD',
                'highlights': ['Byron Bay', 'Gold Coast', 'Sunshine Coast', 'Great Barrier Reef'],
                'route_type': 'coastal_highway',
                'vehicle_requirements': ['RV', 'Motorhome', 'Caravan'],
                'best_season': 'April to October',
                'key_locations': ['Sydney', 'Port Macquarie', 'Byron Bay', 'Gold Coast', 'Brisbane', 'Noosa', 'Cairns'],
                'challenges': ['Tourist traffic in peak season', 'Tropical weather in far north'],
                'tips': ['Book ferry to Fraser Island in advance', 'Carry insect repellent for tropical areas', 'Plan reef trips from Cairns'],
                'region': 'NSW/Queensland'
            }
        },
        {
            'user_id': '21a2151a-cd37-41d5-a1c7-124bb05e7a6a',
            'name': 'Red Centre Explorer',
            'description': 'Uluru, Kings Canyon and MacDonnell Ranges outback adventure with iconic landmarks and Aboriginal culture.',
            'category': 'outback_adventures',
            'is_public': True,
            'tags': ['australia', 'rv', 'outback', 'uluru'],
            'usage_count': 0,
            'template_data': {
                'title': 'Red Centre Explorer',
                'description': 'Discover the spiritual heart of Australia with this outback adventure to Uluru, Kata Tjuta, Kings Canyon, and Alice Springs. Experience ancient Aboriginal culture, stunning desert landscapes, and unforgettable sunrises over the world\'s largest monolith.',
                'difficulty': 'advanced',
                'duration_days': 14,
                'distance_miles': 800,
                'estimated_budget': 2800,
                'currency': 'AUD',
                'highlights': ['Uluru', 'Kings Canyon', 'Alice Springs', 'MacDonnell Ranges'],
                'route_type': 'outback_cultural',
                'vehicle_requirements': ['RV', 'Motorhome suitable for sealed roads'],
                'best_season': 'April to September',
                'key_locations': ['Alice Springs', 'Uluru', 'Kata Tjuta', 'Kings Canyon', 'Coober Pedy'],
                'challenges': ['Extreme heat in summer', 'Limited services between towns', 'Remote area driving'],
                'tips': ['Carry extra water', 'Respect Aboriginal cultural sites', 'Book Uluru accommodation well ahead'],
                'region': 'Northern Territory/South Australia'
            }
        },
        {
            'user_id': '21a2151a-cd37-41d5-a1c7-124bb05e7a6a',
            'name': 'Stuart Highway Darwin to Adelaide',
            'description': 'Cross the continent north to south on Australia\'s most famous highway through the heart of the continent.',
            'category': 'highway_crossings',
            'is_public': True,
            'tags': ['australia', 'rv', 'stuart_highway', 'cross_country'],
            'usage_count': 0,
            'template_data': {
                'title': 'Stuart Highway Darwin to Adelaide',
                'description': 'Traverse the entire continent from tropical Darwin to Adelaide on the legendary Stuart Highway. Pass through the red heart of Australia, historic outback towns, and diverse climatic zones. One of Australia\'s great road trip experiences.',
                'difficulty': 'intermediate',
                'duration_days': 14,
                'distance_miles': 1760,
                'estimated_budget': 3500,
                'currency': 'AUD',
                'highlights': ['Darwin', 'Katherine Gorge', 'Alice Springs', 'Coober Pedy'],
                'route_type': 'transcontinental_highway',
                'vehicle_requirements': ['RV', 'Motorhome', 'Road train suitable caravan'],
                'best_season': 'April to September',
                'key_locations': ['Darwin', 'Katherine', 'Tennant Creek', 'Alice Springs', 'Coober Pedy', 'Adelaide'],
                'challenges': ['Road trains', 'Long distances between services', 'Extreme heat'],
                'tips': ['Give way to road trains', 'Fuel up at every opportunity', 'Plan rest stops carefully'],
                'region': 'Northern Territory/South Australia'
            }
        },
        {
            'user_id': '21a2151a-cd37-41d5-a1c7-124bb05e7a6a',
            'name': 'Tasmania Island Circuit',
            'description': 'Complete circuit of Tasmania featuring Cradle Mountain, MONA, Wineglass Bay, and pristine wilderness.',
            'category': 'island_adventures',
            'is_public': True,
            'tags': ['australia', 'rv', 'tasmania', 'wilderness'],
            'usage_count': 0,
            'template_data': {
                'title': 'Tasmania Island Circuit',
                'description': 'Discover Australia\'s island state with this comprehensive circuit covering Hobart, Cradle Mountain-Lake St Clair, Wineglass Bay, and the Museum of Old and New Art. Experience temperate rainforests, pristine beaches, and world-class wine regions.',
                'difficulty': 'intermediate',
                'duration_days': 14,
                'distance_miles': 900,
                'estimated_budget': 3200,
                'currency': 'AUD',
                'highlights': ['Cradle Mountain', 'Wineglass Bay', 'MONA', 'Salamanca Markets'],
                'route_type': 'island_circuit',
                'vehicle_requirements': ['RV', 'Motorhome', 'Caravan'],
                'best_season': 'October to April',
                'key_locations': ['Hobart', 'Cradle Mountain', 'Launceston', 'Freycinet', 'Strahan', 'Devonport'],
                'challenges': ['Mountain roads', 'Variable weather', 'Ferry booking required'],
                'tips': ['Book Spirit of Tasmania ferry early', 'Pack warm clothes', 'Allow time for hiking'],
                'region': 'Tasmania'
            }
        },
        {
            'user_id': '21a2151a-cd37-41d5-a1c7-124bb05e7a6a',
            'name': 'WA Coast Perth to Broome',
            'description': 'Western Australia\'s spectacular coastline featuring pristine beaches, coral reefs, and outback towns.',
            'category': 'coastal_routes',
            'is_public': True,
            'tags': ['australia', 'rv', 'western_australia', 'beaches'],
            'usage_count': 0,
            'template_data': {
                'title': 'WA Coast Perth to Broome',
                'description': 'Experience Western Australia\'s incredible coastline from Perth to Broome. Discover pristine beaches, coral reefs, historic pearling towns, and the famous Cable Beach sunset. Includes optional Karijini National Park detour for stunning gorge country.',
                'difficulty': 'intermediate',
                'duration_days': 18,
                'distance_miles': 1400,
                'estimated_budget': 4000,
                'currency': 'AUD',
                'highlights': ['Cable Beach', 'Ningaloo Reef', 'Karijini National Park', 'Shark Bay'],
                'route_type': 'coastal_outback',
                'vehicle_requirements': ['RV', 'Motorhome', '4WD for some tracks'],
                'best_season': 'April to September',
                'key_locations': ['Perth', 'Geraldton', 'Shark Bay', 'Exmouth', 'Karratha', 'Port Hedland', 'Broome'],
                'challenges': ['Long distances', 'Limited services', 'Extreme heat in summer'],
                'tips': ['Fuel up regularly', 'Book Ningaloo reef tours', 'Carry extra water'],
                'region': 'Western Australia'
            }
        },
        {
            'user_id': '21a2151a-cd37-41d5-a1c7-124bb05e7a6a',
            'name': 'Nullarbor Plain Crossing',
            'description': 'Cross the famous Nullarbor Plain from Adelaide to Perth - one of Australia\'s most challenging drives.',
            'category': 'highway_crossings',
            'is_public': True,
            'tags': ['australia', 'rv', 'nullarbor', 'outback'],
            'usage_count': 0,
            'template_data': {
                'title': 'Nullarbor Plain Crossing',
                'description': 'Conquer the legendary Nullarbor Plain crossing from Adelaide to Perth. Experience the world\'s longest straight road, dramatic coastal cliffs, and the solitude of one of Earth\'s largest limestone plateaus. A true test of endurance and planning.',
                'difficulty': 'advanced',
                'duration_days': 7,
                'distance_miles': 1200,
                'estimated_budget': 1800,
                'currency': 'AUD',
                'highlights': ['Head of Bight whales', '90 Mile Straight', 'Great Australian Bight', 'Border Village'],
                'route_type': 'outback_crossing',
                'vehicle_requirements': ['Reliable RV', 'Self-contained recommended'],
                'best_season': 'April to October',
                'key_locations': ['Adelaide', 'Ceduna', 'Border Village', 'Eucla', 'Norseman', 'Perth'],
                'challenges': ['Limited services', 'Extreme isolation', 'Vehicle reliability critical'],
                'tips': ['Carry spare parts', 'Extra fuel and water', 'Check weather conditions'],
                'region': 'South Australia/Western Australia'
            }
        },
        {
            'user_id': '21a2151a-cd37-41d5-a1c7-124bb05e7a6a',
            'name': 'Queensland Outback Explorer',
            'description': 'Explore Queensland\'s vast outback including Longreach, Winton, and historic mining towns.',
            'category': 'outback_adventures',
            'is_public': True,
            'tags': ['australia', 'rv', 'queensland', 'outback'],
            'usage_count': 0,
            'template_data': {
                'title': 'Queensland Outback Explorer',
                'description': 'Discover Queensland\'s fascinating outback heritage from Brisbane through Roma, Charleville, Longreach, and Winton. Experience Australian stockman culture, dinosaur fossils, and the birthplace of QANTAS. Perfect introduction to outback travel.',
                'difficulty': 'intermediate',
                'duration_days': 12,
                'distance_miles': 1100,
                'estimated_budget': 2800,
                'currency': 'AUD',
                'highlights': ['Stockman\'s Hall of Fame', 'Dinosaur fossils', 'QANTAS museum', 'Outback pubs'],
                'route_type': 'outback_heritage',
                'vehicle_requirements': ['RV', 'Motorhome', 'Caravan'],
                'best_season': 'April to September',
                'key_locations': ['Brisbane', 'Roma', 'Charleville', 'Longreach', 'Winton', 'Mount Isa'],
                'challenges': ['Heat in summer', 'Long distances', 'Limited services'],
                'tips': ['Visit during cooler months', 'Book ahead in small towns', 'Carry extra supplies'],
                'region': 'Queensland'
            }
        },
        {
            'user_id': '21a2151a-cd37-41d5-a1c7-124bb05e7a6a',
            'name': 'Blue Mountains and Wine Country',
            'description': 'Sydney to Melbourne via Blue Mountains, Canberra, and alpine regions with wine tasting opportunities.',
            'category': 'mountain_scenic',
            'is_public': True,
            'tags': ['australia', 'rv', 'mountains', 'wine'],
            'usage_count': 0,
            'template_data': {
                'title': 'Blue Mountains and Wine Country',
                'description': 'Experience the best of NSW and Victoria\'s mountain and wine regions. From Sydney\'s Blue Mountains through Canberra to Melbourne via Beechworth and the Murray Valley. Perfect blend of scenic mountain drives and world-class wine regions.',
                'difficulty': 'beginner',
                'duration_days': 10,
                'distance_miles': 650,
                'estimated_budget': 2200,
                'currency': 'AUD',
                'highlights': ['Blue Mountains', 'Canberra', 'Rutherglen wines', 'Alpine Way'],
                'route_type': 'scenic_wine',
                'vehicle_requirements': ['RV', 'Motorhome', 'Caravan'],
                'best_season': 'September to May',
                'key_locations': ['Sydney', 'Katoomba', 'Canberra', 'Albury', 'Beechworth', 'Melbourne'],
                'challenges': ['Mountain roads', 'Tourist areas', 'Weather changes'],
                'tips': ['Designated driver for wine tours', 'Book mountain accommodation ahead', 'Check road conditions'],
                'region': 'NSW/ACT/Victoria'
            }
        }
    ]
    
    # Add templates one by one
    success_count = 0
    for template in templates:
        try:
            # Check if template already exists
            existing = supabase.table('trip_templates').select('id').eq('name', template['name']).execute()
            
            if existing.data:
                print(f'⚠️  Template already exists: {template["name"]}')
                continue
            
            # Insert template
            result = supabase.table('trip_templates').insert(template).execute()
            
            if result.data:
                success_count += 1
                print(f'✅ Added: {template["name"]}')
            else:
                print(f'❌ Failed to add: {template["name"]}')
                
        except Exception as e:
            print(f'❌ Error adding {template["name"]}: {e}')
    
    # Final count
    print(f'\n📊 Successfully added {success_count} new templates')
    
    # Check total templates in database
    total_result = supabase.table('trip_templates').select('id').execute()
    total_count = len(total_result.data) if total_result.data else 0
    
    print(f'📋 Total templates in database: {total_count}')
    
    if total_count >= 11:
        print('🎉 SUCCESS! All 11 Australian RV trip templates are now available!')
        print('💡 Users can now see comprehensive trip options in their Wheels section')
    else:
        print(f'⚠️  Only {total_count} templates found - some may have failed to insert')

if __name__ == "__main__":
    add_remaining_templates()