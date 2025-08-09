#!/usr/bin/env python3
"""
Populate Trip Templates from YouTube Data
Find popular Australian RV routes and convert them to trip templates
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.services.scraping.youtube_travel_scraper import YouTubeTravelScraper
from app.core.database import get_supabase_client

# Popular Australian RV route queries
AUSTRALIAN_RV_ROUTES = [
    "Big Lap Australia RV motorhome",
    "Great Ocean Road caravan camping",
    "Stuart Highway Darwin Adelaide RV",
    "Pacific Coast RV NSW Queensland", 
    "Nullarbor crossing motorhome",
    "Tasmania RV around island",
    "Western Australia coast RV Perth Broome",
    "Outback Queensland RV adventure",
    "Blue Mountains RV camping NSW",
    "South Australia wine regions RV",
    "Kimberley region RV adventure WA",
    "Great Alpine Road Victoria RV",
    "Sunshine Coast to Cairns RV",
    "Flinders Ranges RV camping SA",
    "Margaret River region RV WA"
]

# 4WD Adventure routes for variety
AUSTRALIAN_4WD_ROUTES = [
    "Cape York Telegraph Track 4WD",
    "Simpson Desert crossing 4x4",
    "Gibb River Road Kimberley 4WD",
    "Fraser Island 4WD camping",
    "Victorian High Country 4x4",
    "Canning Stock Route expedition",
    "Flinders Ranges 4WD tracks",
    "Pilbara region 4WD adventure"
]

def determine_difficulty(metadata: Dict) -> str:
    """Determine difficulty level from trip metadata"""
    difficulty = metadata.get('difficulty', '').lower()
    challenges = metadata.get('challenges', [])
    
    # Map YouTube descriptions to template levels
    if 'extreme' in difficulty or 'challenging' in difficulty:
        return 'advanced'
    elif 'moderate' in difficulty or 'intermediate' in difficulty:
        return 'intermediate'
    elif any('water crossing' in str(c).lower() or 'recovery' in str(c).lower() for c in challenges):
        return 'advanced'
    elif any('4wd' in str(c).lower() or 'off-road' in str(c).lower() for c in challenges):
        return 'intermediate'
    else:
        return 'beginner'

def estimate_duration_and_distance(metadata: Dict) -> tuple:
    """Estimate duration and distance from metadata"""
    duration_days = metadata.get('duration_days')
    distance_km = metadata.get('distance_km')
    
    # Default estimates based on route type
    if not duration_days:
        description = metadata.get('description', '').lower()
        if 'big lap' in description or 'around australia' in description:
            duration_days = 365
        elif 'coast' in description and ('sydney' in description or 'melbourne' in description):
            duration_days = 21
        elif 'nullarbor' in description:
            duration_days = 7
        elif 'tasmania' in description:
            duration_days = 14
        else:
            duration_days = 10
    
    if not distance_km:
        if duration_days > 300:  # Big lap
            distance_km = 20000
        elif duration_days > 20:  # Long coastal
            distance_km = 2500
        elif duration_days > 10:  # Regional loop
            distance_km = 1500
        else:  # Short trip
            distance_km = 800
    
    # Convert km to miles for templates
    distance_miles = int(distance_km * 0.621371) if distance_km else 800
    
    return duration_days, distance_miles

def estimate_budget(duration_days: int, difficulty: str) -> int:
    """Estimate budget based on duration and difficulty"""
    base_daily_cost = {
        'beginner': 120,  # AUD per day
        'intermediate': 150,
        'advanced': 200
    }
    
    daily_cost = base_daily_cost.get(difficulty, 150)
    return duration_days * daily_cost

def extract_highlights(metadata: Dict) -> List[str]:
    """Extract top highlights from metadata"""
    highlights = metadata.get('highlights', [])
    key_stops = metadata.get('key_stops', [])
    
    # Combine and clean highlights
    all_highlights = []
    
    # Add highlights
    for highlight in highlights[:3]:
        if isinstance(highlight, str) and len(highlight) > 5:
            all_highlights.append(highlight.strip())
    
    # Add key stops as highlights
    for stop in key_stops[:2]:
        if isinstance(stop, str) and len(stop) > 3:
            # Clean stop names
            clean_stop = stop.replace("'s", "").strip()
            if clean_stop not in all_highlights:
                all_highlights.append(clean_stop)
    
    # Ensure we have at least 3 highlights
    if len(all_highlights) < 3:
        location = metadata.get('location', '')
        if location and location not in all_highlights:
            all_highlights.append(location)
    
    return all_highlights[:4]  # Max 4 highlights

async def convert_trip_to_template(trip_data: Dict, category: str = 'scenic_routes') -> Dict:
    """Convert YouTube trip data to trip template format"""
    
    metadata = trip_data.get('metadata', {})
    
    # Determine difficulty
    difficulty = determine_difficulty(metadata)
    
    # Get duration and distance
    duration_days, distance_miles = estimate_duration_and_distance(metadata)
    
    # Estimate budget
    budget = estimate_budget(duration_days, difficulty)
    
    # Extract highlights
    highlights = extract_highlights(metadata)
    
    # Create template
    template = {
        'name': trip_data['title'],
        'description': trip_data.get('description', '')[:200] + '...',
        'category': category,
        'is_public': True,
        'tags': ['australia', 'rv', 'road_trip'],
        'usage_count': 0,
        'template_data': {
            'title': trip_data['title'],
            'description': trip_data.get('description', ''),
            'difficulty': difficulty,
            'duration_days': duration_days,
            'distance_miles': distance_miles,
            'estimated_budget': budget,
            'currency': 'AUD',
            'highlights': highlights,
            'route_type': 'road_trip',
            'vehicle_requirements': metadata.get('vehicles', ['RV', 'Motorhome', 'Caravan']),
            'best_season': metadata.get('best_season', 'April to October'),
            'key_locations': metadata.get('key_stops', [])[:5],
            'challenges': metadata.get('challenges', [])[:3],
            'tips': metadata.get('tips', [])[:3],
            'region': 'Australia',
            'source': 'youtube_extraction',
            'source_url': metadata.get('youtube_url'),
            'extracted_date': datetime.utcnow().isoformat()
        }
    }
    
    return template

async def populate_templates():
    """Main function to populate trip templates"""
    
    print("🚀 Populating Australian Trip Templates from YouTube")
    print("=" * 60)
    
    scraper = YouTubeTravelScraper()
    supabase = get_supabase_client()
    
    # Get user ID for templates
    users = supabase.table('auth.users').select('id').limit(1).execute()
    if not users.data:
        print("❌ No users found in database")
        return
    
    user_id = users.data[0]['id']
    
    all_templates = []
    processed_count = 0
    
    # Process RV routes
    print("\n🚐 Processing RV Routes...")
    for query in AUSTRALIAN_RV_ROUTES[:8]:  # Limit to prevent quota issues
        print(f"   Searching: {query}")
        
        videos = await scraper.search_adventure_videos(query, region='AU', max_results=2)
        
        for video in videos:
            try:
                # Get transcript and extract trip data
                transcript = await scraper.get_video_transcript(video['video_id'])
                if not transcript:
                    continue
                
                trip_data = await scraper.extract_trip_info(transcript, video)
                if not trip_data:
                    continue
                
                # Convert to template
                template = await convert_trip_to_template(trip_data, 'scenic_routes')
                template['user_id'] = user_id
                all_templates.append(template)
                processed_count += 1
                
                print(f"   ✅ Extracted: {trip_data['title'][:50]}...")
                
                # Rate limiting
                await asyncio.sleep(1)
                
            except Exception as e:
                print(f"   ⚠️ Error processing {video['title'][:30]}: {e}")
                continue
        
        # Delay between queries
        await asyncio.sleep(2)
    
    # Process some 4WD routes for variety
    print("\n🏔️ Processing 4WD Adventure Routes...")
    for query in AUSTRALIAN_4WD_ROUTES[:4]:  # Fewer 4WD routes
        print(f"   Searching: {query}")
        
        videos = await scraper.search_adventure_videos(query, region='AU', max_results=1)
        
        for video in videos:
            try:
                transcript = await scraper.get_video_transcript(video['video_id'])
                if not transcript:
                    continue
                
                trip_data = await scraper.extract_trip_info(transcript, video)
                if not trip_data:
                    continue
                
                # Convert to template (4WD category)
                template = await convert_trip_to_template(trip_data, '4wd_adventures')
                template['user_id'] = user_id
                template['template_data']['tags'] = ['australia', '4wd', 'adventure', 'off_road']
                all_templates.append(template)
                processed_count += 1
                
                print(f"   ✅ Extracted: {trip_data['title'][:50]}...")
                
                await asyncio.sleep(1)
                
            except Exception as e:
                print(f"   ⚠️ Error processing {video['title'][:30]}: {e}")
                continue
        
        await asyncio.sleep(2)
    
    # Save templates to database
    print(f"\n💾 Saving {len(all_templates)} templates to database...")
    
    successful_saves = 0
    for template in all_templates:
        try:
            # Check if template already exists
            existing = supabase.table('trip_templates').select('id').eq(
                'name', template['name']
            ).execute()
            
            if existing.data:
                print(f"   ⚠️ Template already exists: {template['name'][:40]}...")
                continue
            
            # Insert template
            result = supabase.table('trip_templates').insert(template).execute()
            
            if result.data:
                successful_saves += 1
                print(f"   ✅ Saved: {template['name'][:40]}...")
            
        except Exception as e:
            print(f"   ❌ Error saving {template['name'][:30]}: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    print(f"🔍 Queries processed: {len(AUSTRALIAN_RV_ROUTES[:8]) + len(AUSTRALIAN_4WD_ROUTES[:4])}")
    print(f"📝 Trip data extracted: {processed_count}")
    print(f"💾 Templates saved: {successful_saves}")
    print(f"🎯 Success rate: {(successful_saves/max(processed_count,1)*100):.1f}%")
    
    if successful_saves > 0:
        print(f"\n✅ SUCCESS! Added {successful_saves} Australian trip templates")
        print("🌏 Your trip templates now include:")
        print("   • Popular RV coastal routes")
        print("   • Outback adventures") 
        print("   • 4WD challenging tracks")
        print("   • Regional scenic loops")
        print("\n🎉 Refresh your Wheels section to see the new templates!")
    else:
        print("\n⚠️  No templates were saved. Check YouTube API configuration.")

if __name__ == "__main__":
    asyncio.run(populate_templates())