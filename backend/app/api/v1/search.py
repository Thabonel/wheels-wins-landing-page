"""
Search API Endpoints
Provides web search capabilities for testing and integration
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.core.logging import setup_logging, get_logger

# Optional search import
try:
    from app.services.search.web_search import web_search_service
    SEARCH_AVAILABLE = True
except ImportError:
    web_search_service = None
    SEARCH_AVAILABLE = False

router = APIRouter()
setup_logging()
logger = get_logger(__name__)

@router.get("/test")
async def test_search_endpoint():
    """Test endpoint to verify search API is working"""
    logger.info("🧪 Search test endpoint called")
    return {
        "success": True,
        "message": "Search API is working correctly",
        "search_available": SEARCH_AVAILABLE,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/engines/status")
async def get_search_engines_status():
    """Get status of available search engines"""
    
    if not SEARCH_AVAILABLE:
        return {
            "available": False,
            "message": "Web search service not available",
            "engines": {}
        }
    
    try:
        status = {
            "available": True,
            "engines": {
                "google": web_search_service.google_search.is_available,
                "bing": web_search_service.bing_search.is_available,
                "duckduckgo": True  # Always available
            },
            "available_engines": web_search_service.available_engines
        }
        
        return status
        
    except Exception as e:
        logger.error(f"❌ Error getting search engine status: {e}")
        raise HTTPException(status_code=500, detail="Could not get search engine status")

@router.get("/")
async def web_search(
    q: str = Query(..., description="Search query"),
    engines: Optional[str] = Query(None, description="Comma-separated list of engines to use"),
    num_results: int = Query(10, ge=1, le=50, description="Number of results to return"),
    search_type: Optional[str] = Query(None, description="Type of search: news, local, how-to, product, travel")
):
    """
    Perform web search across multiple engines
    
    Example: /api/v1/search?q=best%20camping%20spots%20california&engines=google,duckduckgo&num_results=5
    """
    
    if not SEARCH_AVAILABLE:
        raise HTTPException(
            status_code=503, 
            detail="Web search service not available"
        )
    
    try:
        # Parse engines parameter
        engine_list = None
        if engines:
            engine_list = [e.strip() for e in engines.split(',')]
        
        logger.info(f"🔍 Web search request: '{q}' using engines: {engine_list}")
        
        # Perform search
        if search_type:
            results = await web_search_service.specialized_search(
                search_type=search_type,
                query=q,
                num_results=num_results,
                engines=engine_list
            )
        else:
            results = await web_search_service.search(
                query=q,
                num_results=num_results,
                engines=engine_list,
                aggregate=True
            )
        
        return {
            "success": True,
            "query": q,
            "search_type": search_type,
            "engines_used": results.get("engines_used", []),
            "total_results": results.get("total_results", 0),
            "results": results.get("results", []),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Web search error: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Search failed: {str(e)}"
        )

@router.get("/contextual")
async def contextual_search(
    q: str = Query(..., description="Search query"),
    location: Optional[str] = Query(None, description="User location (city, state)"),
    user_id: Optional[str] = Query(None, description="User ID for personalization"),
    num_results: int = Query(10, ge=1, le=50, description="Number of results to return")
):
    """
    Perform context-aware search with location and user preferences
    
    Example: /api/v1/search/contextual?q=restaurants&location=San%20Francisco,CA&num_results=5
    """
    
    if not SEARCH_AVAILABLE:
        raise HTTPException(
            status_code=503, 
            detail="Web search service not available"
        )
    
    try:
        # Build context
        context = {}
        
        if location:
            # Parse location (basic implementation)
            location_parts = location.split(',')
            if len(location_parts) >= 2:
                context['location'] = {
                    'city': location_parts[0].strip(),
                    'state': location_parts[1].strip()
                }
            else:
                context['location'] = {'city': location.strip()}
        
        # Add time sensitivity for current queries
        if any(word in q.lower() for word in ['today', 'now', 'current', 'latest']):
            context['time_sensitive'] = True
        
        logger.info(f"🌍 Contextual search: '{q}' with context: {context}")
        
        # Perform contextual search
        results = await web_search_service.search_with_context(
            query=q,
            context=context,
            num_results=num_results
        )
        
        return {
            "success": True,
            "query": q,
            "original_query": results.get("original_query", q),
            "enhanced_query": results.get("enhanced_query", q),
            "context": context,
            "engines_used": results.get("engines_used", []),
            "total_results": len(results.get("results", [])),
            "results": results.get("results", []),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Contextual search error: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Contextual search failed: {str(e)}"
        )

@router.post("/pam-search")
async def pam_search_simulation(
    query: str,
    user_context: Optional[Dict[str, Any]] = None
):
    """
    Simulate how PAM would search for information
    This endpoint demonstrates PAM's cognitive search capabilities
    """
    
    if not SEARCH_AVAILABLE:
        raise HTTPException(
            status_code=503, 
            detail="Web search service not available"
        )
    
    try:
        # Default context if none provided
        if not user_context:
            user_context = {
                "location": {"city": "San Francisco", "state": "CA"},
                "preferences": {"price_range": "moderate"},
                "time_of_day": "afternoon"
            }
        
        logger.info(f"🤖 PAM search simulation for: '{query}'")
        
        # Determine search strategy based on query
        search_strategy = "general"
        
        if any(word in query.lower() for word in ['restaurant', 'food', 'eat']):
            search_strategy = "local_dining"
        elif any(word in query.lower() for word in ['camping', 'campground', 'rv']):
            search_strategy = "travel_camping"
        elif any(word in query.lower() for word in ['gas', 'fuel', 'station']):
            search_strategy = "local_services"
        elif any(word in query.lower() for word in ['how to', 'tutorial']):
            search_strategy = "educational"
        elif any(word in query.lower() for word in ['news', 'latest']):
            search_strategy = "current_events"
        
        # Perform search based on strategy
        if search_strategy == "local_dining":
            results = await web_search_service.specialized_search(
                search_type="local",
                query=f"{query} near {user_context.get('location', {}).get('city', '')}",
                num_results=8
            )
        elif search_strategy in ["travel_camping", "local_services"]:
            results = await web_search_service.specialized_search(
                search_type="local", 
                query=query,
                num_results=10
            )
        elif search_strategy == "educational":
            results = await web_search_service.specialized_search(
                search_type="how-to",
                query=query,
                num_results=5
            )
        elif search_strategy == "current_events":
            results = await web_search_service.specialized_search(
                search_type="news",
                query=query,
                num_results=10
            )
        else:
            results = await web_search_service.search_with_context(
                query=query,
                context=user_context,
                num_results=8
            )
        
        # Simulate PAM's cognitive processing
        cognitive_insights = {
            "search_strategy": search_strategy,
            "user_intent": _analyze_user_intent(query),
            "contextual_factors": _identify_context_factors(query, user_context),
            "result_relevance": _assess_result_relevance(results.get("results", []), query)
        }
        
        return {
            "success": True,
            "pam_analysis": {
                "query": query,
                "understood_intent": cognitive_insights["user_intent"],
                "search_strategy": search_strategy,
                "contextual_enhancements": cognitive_insights["contextual_factors"]
            },
            "search_results": {
                "total_found": len(results.get("results", [])),
                "engines_used": results.get("engines_used", []),
                "results": results.get("results", [])
            },
            "cognitive_insights": cognitive_insights,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ PAM search simulation error: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"PAM search simulation failed: {str(e)}"
        )

def _analyze_user_intent(query: str) -> str:
    """Analyze what the user is trying to accomplish"""
    
    query_lower = query.lower()
    
    if any(word in query_lower for word in ['find', 'where', 'locate']):
        return "location_search"
    elif any(word in query_lower for word in ['how to', 'tutorial', 'guide']):
        return "learning_request"
    elif any(word in query_lower for word in ['best', 'top', 'review', 'compare']):
        return "evaluation_request"
    elif any(word in query_lower for word in ['news', 'latest', 'current']):
        return "information_update"
    elif any(word in query_lower for word in ['buy', 'purchase', 'price']):
        return "shopping_intent"
    else:
        return "general_information"

def _identify_context_factors(query: str, context: Dict[str, Any]) -> List[str]:
    """Identify contextual factors that influence search"""
    
    factors = []
    
    if 'location' in context:
        factors.append("geographic_context")
    
    if 'time_of_day' in context:
        factors.append("temporal_context")
    
    if 'preferences' in context:
        factors.append("user_preferences")
    
    if any(word in query.lower() for word in ['near', 'nearby', 'close']):
        factors.append("proximity_relevance")
    
    if any(word in query.lower() for word in ['today', 'now', 'current']):
        factors.append("time_sensitivity")
    
    return factors

def _assess_result_relevance(results: List[Dict[str, Any]], query: str) -> Dict[str, Any]:
    """Assess how relevant the search results are to the query"""
    
    if not results:
        return {"relevance_score": 0, "assessment": "no_results"}
    
    # Simple relevance assessment based on title/snippet matching
    query_words = set(query.lower().split())
    relevance_scores = []
    
    for result in results:
        title = result.get('title', '').lower()
        snippet = result.get('snippet', '').lower()
        
        title_matches = len([word for word in query_words if word in title])
        snippet_matches = len([word for word in query_words if word in snippet])
        
        relevance = (title_matches * 2 + snippet_matches) / len(query_words)
        relevance_scores.append(relevance)
    
    avg_relevance = sum(relevance_scores) / len(relevance_scores) if relevance_scores else 0
    
    return {
        "relevance_score": round(avg_relevance, 2),
        "high_relevance_results": len([score for score in relevance_scores if score > 0.5]),
        "total_results": len(results),
        "assessment": "high" if avg_relevance > 0.6 else "medium" if avg_relevance > 0.3 else "low"
    }