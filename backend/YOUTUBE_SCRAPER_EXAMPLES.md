# YouTube Travel Video Scraper - Usage Examples

## ✅ What's Implemented

The YouTube Travel Video Scraper is now fully integrated into the Wheels & Wins platform. It can:

1. **Search YouTube** for adventure/travel videos
2. **Extract transcripts** from videos
3. **Use AI** to parse trip information from transcripts
4. **Save trips** to your database with full metadata
5. **PAM Integration** for natural conversation

## 🎯 PAM Conversation Examples

### Example 1: Basic Search
```
User: "Hey PAM, find me some Cape York trips"
PAM: "I found 5 Cape York adventures!

1. **Cape York Telegraph Track - The Ultimate Challenge** by Adventure Australia
2. **Conquering the Cape York Peninsula** by 4WD Action
3. **Telegraph Track Epic Journey - Part 1** by Outback Adventures
4. **Cape York Family Adventure** by Nomad Family
5. **The Toughest Track in Australia** by Extreme 4WD

Which one would you like me to show you details for?"
```

### Example 2: Show Details
```
User: "Show me number 1"
PAM: "**Cape York Telegraph Track - The Ultimate Challenge**

📍 Location: Cape York Peninsula, Queensland
🛣️ Key stops: Bramwell Station, Nolan's Crossing, Jardine River
🏔️ Difficulty: Extreme
⚠️ Main challenges: Deep water crossings up to chest height
✨ Highlights: Remote wilderness camping and vehicle recovery challenges

Would you like me to add this trip to your collection?"
```

### Example 3: Import Trip
```
User: "Yes, add it to my trips"
PAM: "Perfect! I've added **Cape York Telegraph Track - The Ultimate Challenge** to your trips collection. You can find it in your Wheels section with all the route details, challenges, and highlights extracted from the video."
```

## 🔧 API Endpoints

### Search for Videos
```bash
POST /api/v1/youtube/search
Content-Type: application/json

{
  "query": "Simpson Desert crossing",
  "region": "AU",
  "max_results": 10
}
```

### Extract Trip Details
```bash
POST /api/v1/youtube/extract/VIDEO_ID
```

### Import Video as Trip
```bash
POST /api/v1/youtube/import
Content-Type: application/json

{
  "video_url": "https://youtube.com/watch?v=abc123"
}
```

### Bulk Import
```bash
POST /api/v1/youtube/bulk-import
Content-Type: application/json

{
  "video_urls": [
    "https://youtube.com/watch?v=video1",
    "https://youtube.com/watch?v=video2"
  ]
}
```

### Get Suggestions
```bash
POST /api/v1/youtube/suggest
Content-Type: application/json

{
  "region": "AU",
  "vehicle_type": "4WD",
  "difficulty": "moderate"
}
```

## 🎭 Sample Search Queries

### Australian 4WD Tracks
- "Cape York Telegraph Track 4WD"
- "Simpson Desert crossing"
- "Gibb River Road Kimberley"
- "Fraser Island 4WD camping"
- "Victorian High Country 4x4"
- "Flinders Ranges camping"
- "Canning Stock Route expedition"

### RV/Caravan Adventures
- "Big Lap Australia RV"
- "Great Ocean Road motorhome"
- "Nullarbor crossing caravan"
- "Tasmania RV adventure"
- "Outback caravan parks"

### International Adventures
- "Iceland 4x4 adventure"
- "Patagonia overlanding"
- "Morocco desert expedition"
- "Alaska highway RV"
- "Sahara desert crossing"

## 🛠️ Configuration

### Environment Variables
Set in Render.com environment variables:
```
YOUTUBE-API=your_youtube_api_key_here
```

### Get YouTube API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project or select existing
3. Enable "YouTube Data API v3"
4. Create credentials (API Key)
5. Add to Render.com environment

## 🔥 Advanced Features

### Smart Trip Extraction
The AI extracts:
- **Route details**: Start/end points, key stops
- **Vehicle info**: Types used, modifications needed
- **Challenges**: Water crossings, track conditions
- **Highlights**: Scenic spots, attractions
- **Practical info**: Best season, equipment needed
- **Tips**: From experienced travelers

### Conversation Flow
1. **Search**: "Find me Cape York trips"
2. **Browse**: Show numbered list of found trips
3. **Details**: "Show me number 3" displays full trip info
4. **Import**: "Add it to my trips" saves to database
5. **Access**: Available in Wheels section

### Data Quality
- Filters for travel/adventure content
- Prefers longer videos (>20 minutes)
- Handles multiple transcript languages
- Validates extracted data before saving
- Prevents duplicate imports

## 🚀 What Happens Next

1. **User asks**: "Hey PAM, find me some Cape York trips"
2. **PAM searches**: YouTube for relevant videos
3. **Shows results**: Numbered list with titles and channels
4. **User selects**: "Show me number 2"
5. **PAM extracts**: Transcript and trip details
6. **Shows summary**: Location, challenges, highlights
7. **User imports**: "Add it to my trips"
8. **PAM saves**: Full trip data to database
9. **Available in**: Wheels section for route planning

The scraper transforms YouTube adventure videos into structured trip data, making real-world travel experiences searchable and actionable in your trip planning workflow.

## 🧪 Testing

Run the test script:
```bash
cd backend
python test_youtube_scraper.py
```

This will test:
- YouTube API connection
- Video search functionality
- Transcript extraction
- AI trip parsing
- PAM tool integration