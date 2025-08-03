#!/usr/bin/env python3
"""
Test script for YouTube Travel Video Scraper
Test the scraper functionality without full PAM integration
"""

import asyncio
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.services.scraping.youtube_travel_scraper import YouTubeTravelScraper
from app.core.config import get_settings

async def test_youtube_scraper():
    """Test the YouTube scraper functionality"""
    
    print("🚀 Testing YouTube Travel Video Scraper")
    print("=" * 50)
    
    # Initialize scraper
    scraper = YouTubeTravelScraper()
    
    # Check if API key is available
    settings = get_settings()
    youtube_key = getattr(settings, 'YOUTUBE_API_KEY', None)
    
    if not youtube_key:
        print("⚠️ No YouTube API key found")
        print("Set YOUTUBE_API_KEY or YOUTUBE-API environment variable")
        print("Testing will use mock responses")
    else:
        print(f"✅ YouTube API key found: {youtube_key[:10]}...")
    
    print()
    
    # Test 1: Search for videos
    print("🔍 Test 1: Searching for Cape York videos")
    videos = await scraper.search_adventure_videos("Cape York Telegraph Track", region="AU", max_results=3)
    
    if videos:
        print(f"✅ Found {len(videos)} videos")
        for i, video in enumerate(videos, 1):
            print(f"   {i}. {video['title']} by {video['channel']}")
            print(f"      {video['url']}")
    else:
        print("❌ No videos found")
    
    print()
    
    # Test 2: Extract transcript (if videos found)
    if videos:
        print("📝 Test 2: Extracting transcript from first video")
        first_video = videos[0]
        video_id = first_video['video_id']
        
        transcript = await scraper.get_video_transcript(video_id)
        
        if transcript:
            print(f"✅ Transcript extracted: {len(transcript)} characters")
            print(f"   Preview: {transcript[:200]}...")
            
            # Test 3: Extract trip info
            print()
            print("🤖 Test 3: Extracting trip information")
            trip_data = await scraper.extract_trip_info(transcript, first_video)
            
            if trip_data:
                print(f"✅ Trip extracted: {trip_data['title']}")
                print(f"   Location: {trip_data.get('metadata', {}).get('location', 'Unknown')}")
                print(f"   Description: {trip_data.get('description', '')[:100]}...")
            else:
                print("❌ Failed to extract trip information")
        else:
            print("❌ No transcript available")
    
    print()
    print("🎯 Test Results Summary:")
    if videos:
        print("✅ Video search: WORKING")
        if len(videos) > 0 and 'video_id' in videos[0]:
            print("✅ Video metadata: WORKING")
        else:
            print("❌ Video metadata: INCOMPLETE")
    else:
        print("❌ Video search: FAILED")
    
    print()
    print("💡 Next steps:")
    print("1. Ensure YOUTUBE-API environment variable is set in Render.com")
    print("2. Test PAM integration: 'Hey PAM, find me some Cape York trips'")
    print("3. Use API endpoints: POST /api/v1/youtube/search")


async def test_pam_tool():
    """Test the PAM tool integration"""
    
    print("\n" + "=" * 50)
    print("🤖 Testing PAM Tool Integration")
    print("=" * 50)
    
    from app.services.pam.tools.youtube_trip_tool import YouTubeTripTool
    
    # Initialize tool
    tool = YouTubeTripTool()
    await tool.initialize()
    
    if tool.initialized:
        print("✅ YouTube PAM tool initialized")
        
        # Test search
        result = await tool.execute("test-user", {
            'action': 'search_videos',
            'query': 'Cape York 4WD',
            'max_results': 3
        })
        
        if result.get('success'):
            print("✅ PAM search test: WORKING")
            pam_response = result.get('pam_response', result.get('message', ''))
            print(f"PAM Response: {pam_response[:200]}...")
        else:
            print(f"❌ PAM search test: {result.get('message', 'FAILED')}")
    else:
        print("❌ YouTube PAM tool failed to initialize")


if __name__ == "__main__":
    asyncio.run(test_youtube_scraper())
    asyncio.run(test_pam_tool())