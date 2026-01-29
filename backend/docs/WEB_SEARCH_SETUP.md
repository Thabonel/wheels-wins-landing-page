# Web Search Tool Setup
## Worldwide Product & Deal Finding for PAM

## Overview

PAM now has a `web_search` tool that can find products, deals, and information **anywhere in the world** using:

- **DuckDuckGo** (Free, no API key, always available) ✅
- **Google Custom Search** (Best results, requires API key)
- **Bing Web Search** (Good alternative, requires API key)

## Current Status

✅ **Working Now:** DuckDuckGo search (free, worldwide, no setup required)

⚙️ **Optional:** Google/Bing for better results (recommended for production)

## What PAM Can Do

### With DuckDuckGo (Current - Free)

```
User: "Find cheapest iPad 9th gen 256GB cellular in Johannesburg"
PAM: [Searches DuckDuckGo, finds listings from Gumtree, Takealot, local stores]

User: "Best deal on Dometic CFX3 45 fridge Australia"
PAM: [Searches worldwide, finds eBay AU, Amazon AU, camping stores]

User: "Where can I buy solar panels Cape Town"
PAM: [Finds local retailers, online stores, comparison sites]
```

### With Google/Bing (Optional - Better Results)

- More comprehensive results
- Better ranking and relevance
- Product-specific features (prices, reviews, ratings)
- Local business integration
- Image search capabilities

## How It Works

1. **User asks PAM to find something**
   - "Find cheapest iPad in Johannesburg"
   - "Compare prices for camping gear"
   - "Best deal on Dometic fridge"

2. **PAM uses web_search tool**
   - Searches DuckDuckGo (always available)
   - Falls back to Google or Bing if configured
   - Returns top 10-20 results

3. **PAM presents results**
   - Titles, URLs, descriptions
   - Sorted by relevance
   - Deduplicates across engines

## Setup (Optional - For Better Results)

### Option 1: Google Custom Search (Recommended)

**Free Tier:** 100 searches/day
**Paid:** $5 per 1,000 searches (after free quota)

1. **Get API Key:**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Create project → Enable "Custom Search API"
   - Create credentials → API key

2. **Create Search Engine:**
   - Go to: https://programmablesearchengine.google.com/
   - Click "Add" → Create new search engine
   - Set "Search the entire web" = ON
   - Copy your Search Engine ID (cx parameter)

3. **Add to `.env`:**
   ```bash
   GOOGLE_SEARCH_API_KEY=your_api_key_here
   GOOGLE_SEARCH_ENGINE_ID=your_cx_id_here
   ```

### Option 2: Bing Web Search

**Free Tier:** 1,000 searches/month
**Paid:** $7 per 1,000 searches

1. **Get API Key:**
   - Go to: https://portal.azure.com/
   - Create "Bing Search" resource
   - Copy API key from "Keys and Endpoint"

2. **Add to `.env`:**
   ```bash
   BING_SEARCH_API_KEY=your_api_key_here
   ```

## Testing

Test the tool works:

```bash
# Test DuckDuckGo search (no API key needed)
python -c "
import asyncio
from app.services.pam.tools.search.web_search import web_search

async def test():
    result = await web_search(
        user_id='00000000-0000-0000-0000-000000000000',
        query='cheapest iPad 9th gen 256GB',
        search_type='product',
        num_results=5
    )
    print(f'Success: {result[\"success\"]}')
    print(f'Results: {result[\"total_results\"]}')
    print(f'Engines: {result[\"engines_used\"]}')
    for r in result['results'][:3]:
        print(f'  - {r[\"title\"]} ({r[\"source\"]})')

asyncio.run(test())
"
```

Expected output:
```
Success: True
Results: 5
Engines: ['duckduckgo']
  - iPad 10.2-inch (9th Gen) 256GB - Gumtree (gumtree.co.za)
  - Apple iPad 9th Generation - Takealot (takealot.com)
  - iPad 9 256GB Cellular - eBay (ebay.com)
```

## Tool Usage Examples

### 1. Product Search
```python
await web_search(
    user_id=user_id,
    query="Goal Zero Yeti 500X best price",
    search_type="product",
    num_results=10
)
```

### 2. Local Search
```python
await web_search(
    user_id=user_id,
    query="camping gear stores",
    search_type="local",
    location="Cape Town",
    num_results=10
)
```

### 3. General Search
```python
await web_search(
    user_id=user_id,
    query="how to maintain RV solar panels",
    search_type="how-to",
    num_results=5
)
```

## Comparison: RapidAPI vs Web Search

| Feature | RapidAPI (Old) | Web Search (New) |
|---------|---------------|------------------|
| **Countries** | 5 (au, us, uk, ca, nz) | **All countries** ✅ |
| **Coverage** | Specific retailers only | **Entire web** ✅ |
| **Cost** | $15/mo for 50K searches | **Free (DuckDuckGo)** ✅ |
| **Setup** | Requires API key | **Works immediately** ✅ |
| **Results** | Product listings only | Products, services, local, news ✅ |
| **Marketplaces** | Limited | All (eBay, Gumtree, Facebook, etc.) ✅ |

## Production Recommendation

**For Development/Testing:**
- Use DuckDuckGo (current setup) - works perfectly for most queries

**For Production:**
- Add Google Custom Search ($5/1K searches, best results)
- OR Bing Search ($7/1K searches, good alternative)
- Keep DuckDuckGo as fallback (automatic)

## Cost Estimates

**DuckDuckGo:** $0/month (current setup)

**Google Custom Search:**
- Free tier: 100 searches/day = 3,000/month = $0
- After free: $5 per 1,000 searches
- Typical usage: 5,000 searches/month = $10/month

**Bing Search:**
- Free tier: 1,000 searches/month = $0
- After free: $7 per 1,000 searches
- Typical usage: 5,000 searches/month = $28/month

## Monitoring

Check which engines are being used:

```bash
# Check web search service status
python -c "
from app.services.search.web_search import web_search_service
print(f'Available engines: {web_search_service.available_engines}')
print(f'Google: {web_search_service.google_search.is_available}')
print(f'Bing: {web_search_service.bing_search.is_available}')
print(f'DuckDuckGo: Always available')
"
```

## Troubleshooting

**"No search engines available"**
- DuckDuckGo should always work
- Check internet connectivity
- Check rate limits

**"API quota exceeded"**
- Google: 100 searches/day on free tier
- Bing: 1,000 searches/month on free tier
- Will automatically fall back to DuckDuckGo

**"Poor search results"**
- Add Google/Bing API keys for better results
- Use more specific search queries
- Add location context for local searches

---

**Status:** ✅ Live and working with DuckDuckGo
**Optional:** Add Google/Bing for better results
**Last Updated:** January 29, 2026
