"""
Enhanced Search Tool for PAM Financial Co-Pilot

The core tool that transforms PAM into a Financial Co-Pilot for Mobile Living.
Combines universal search capability with RV expertise to guide smart purchase decisions.

This tool integrates:
- Intent classification (understand spending context)
- RV context knowledge (mobile living expertise)
- Web search (universal product discovery)
- Price comparison (when available)
- Savings attribution (track PAM's impact)

Part of the Financial Co-Pilot MVP implementation.
"""

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

from app.services.pam.core.intent_classifier import intent_classifier, SpendingCategory, RVRelevance
from app.services.pam.knowledge.rv_context import rv_context_provider
from app.services.pam.community.rv_insights import rv_insights_provider
from app.services.pam.tools.financial_copilot.attribution_tracker import attribution_tracker
from app.services.pam.core.disclosure import affiliate_disclosure_manager
from app.services.pam.tools.exceptions import (
    ValidationError,
    ExternalAPIError,
)
from app.services.pam.tools.utils import validate_uuid

logger = logging.getLogger(__name__)


async def enhanced_search(
    user_id: str,
    query: str,
    search_type: Optional[str] = "product",
    include_price_comparison: bool = True,
    location: Optional[str] = None,
    num_results: int = 8,
    **kwargs
) -> Dict[str, Any]:
    """
    Perform enhanced search with RV context intelligence.

    This is PAM's core Financial Co-Pilot function - transforms any purchase query
    into an intelligent recommendation with mobile living expertise.

    Args:
        user_id: UUID of the user
        query: Search query (e.g., "Find me the cheapest iPad 9th gen 256GB cellular")
        search_type: Type of search ("product", "service", "local", or "general")
        include_price_comparison: Whether to include price comparison (requires RapidAPI key)
        location: Optional location context for search
        num_results: Number of search results to return (default: 8)

    Returns:
        Dict with search results enhanced with RV context and financial intelligence

    Raises:
        ValidationError: Invalid input parameters
        ExternalAPIError: Search service failure
    """
    try:
        validate_uuid(user_id, "user_id")

        if not query or len(query.strip()) == 0:
            raise ValidationError(
                "Search query is required",
                context={"query": query}
            )

        if len(query) > 500:
            raise ValidationError(
                "Search query too long (max 500 characters)",
                context={"query_length": len(query)}
            )

        query = query.strip()
        logger.info(f"Enhanced search for user {user_id}: '{query}'")

        # Step 1: Classify user intent
        intent_result = intent_classifier.classify_intent(query)
        logger.debug(f"Intent classification: {intent_result.category.value}, RV relevance: {intent_result.rv_relevance.value}")

        # Step 2: Get RV context for this category
        rv_context = rv_context_provider.get_context(
            intent_result.category,
            intent_result.rv_relevance
        )

        # Step 2.5: Get community insights
        community_insights = rv_insights_provider.get_insights_for_category(
            intent_result.category,
            query=query,
            rv_relevance=intent_result.rv_relevance
        )
        popularity_data = rv_insights_provider.get_popular_choices(
            intent_result.category,
            query=query
        )

        # Step 3: Perform web search with context
        search_results = await _perform_web_search(
            query=query,
            search_type=search_type,
            location=location,
            num_results=num_results,
            intent_result=intent_result
        )

        # Step 4: Add price comparison if applicable and available
        price_comparison = None
        if include_price_comparison and intent_result.category == SpendingCategory.ELECTRONICS:
            try:
                price_comparison = await _attempt_price_comparison(query, location)
            except Exception as e:
                logger.warning(f"Price comparison failed: {e}")
                # Don't fail entire search if price comparison fails

        # Step 5: Format response with RV context intelligence
        response = _format_enhanced_response(
            query=query,
            intent_result=intent_result,
            rv_context=rv_context,
            search_results=search_results,
            price_comparison=price_comparison,
            community_insights=community_insights,
            popularity_data=popularity_data,
            user_id=user_id
        )

        # Step 6: Track PAM's value as Financial Co-Pilot
        await attribution_tracker.track_search_assistance(
            user_id=user_id,
            query=query,
            category=intent_result.category,
            rv_relevance=intent_result.rv_relevance,
            results_found=len(search_results.get('results', [])),
            community_insights_provided=len(community_insights),
            price_comparison_attempted=(price_comparison is not None)
        )

        # Track context value if RV relevance is significant
        if intent_result.rv_relevance in [RVRelevance.HIGH, RVRelevance.MEDIUM]:
            await attribution_tracker.track_context_value(
                user_id=user_id,
                query=query,
                category=intent_result.category,
                rv_relevance=intent_result.rv_relevance,
                context_insights_provided=len(rv_context.key_considerations),
                community_insights_provided=len(community_insights)
            )

        return response

    except ValidationError:
        raise
    except ExternalAPIError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error in enhanced search",
            extra={"user_id": user_id, "query": query},
            exc_info=True
        )
        raise ExternalAPIError(
            "Failed to perform enhanced search",
            context={"user_id": user_id, "query": query, "error": str(e)}
        )


async def _perform_web_search(
    query: str,
    search_type: Optional[str],
    location: Optional[str],
    num_results: int,
    intent_result
) -> Dict[str, Any]:
    """Perform web search with intent-based query enhancement"""

    try:
        # Import web_search function
        from app.services.pam.tools.search.web_search import web_search

        # Enhance query based on intent
        enhanced_query = _enhance_query_with_intent(query, intent_result)

        # Perform the search
        search_results = await web_search(
            user_id="system",  # System call for enhanced search
            query=enhanced_query,
            search_type=search_type,
            num_results=num_results,
            location=location
        )

        if search_results.get('success', False):
            return search_results
        else:
            logger.warning(f"Web search returned no results for: {enhanced_query}")
            return {
                'success': False,
                'results': [],
                'message': 'No results found. Try different search terms.',
                'query': enhanced_query
            }

    except Exception as e:
        logger.error(f"Web search failed: {e}")
        # Return empty results rather than failing entire search
        return {
            'success': False,
            'results': [],
            'message': 'Search temporarily unavailable. Try again in a moment.',
            'error': str(e)
        }


def _enhance_query_with_intent(query: str, intent_result) -> str:
    """Enhance search query based on classified intent"""

    enhanced = query

    # Add category-specific search terms
    if intent_result.category == SpendingCategory.ELECTRONICS:
        if any(word in query.lower() for word in ['ipad', 'tablet']):
            enhanced += " price comparison review"
        elif any(word in query.lower() for word in ['phone', 'smartphone']):
            enhanced += " unlocked price comparison"
        else:
            enhanced += " review price"

    elif intent_result.category == SpendingCategory.ACCOMMODATION:
        enhanced += " rv park campground reviews"

    elif intent_result.category == SpendingCategory.FUEL:
        enhanced += " gas station price near"

    elif intent_result.category == SpendingCategory.FOOD:
        if "restaurant" in query.lower():
            enhanced += " reviews hours"
        else:
            enhanced += " grocery store price"

    # Add RV-specific context for high relevance searches
    if intent_result.rv_relevance == RVRelevance.HIGH:
        enhanced += " RV motorhome"
    elif intent_result.rv_relevance == RVRelevance.MEDIUM:
        enhanced += " mobile travel"

    return enhanced


async def _attempt_price_comparison(query: str, location: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Attempt price comparison if RapidAPI is configured"""

    try:
        from app.services.pam.tools.shop.compare_prices import compare_prices

        # Extract product name from query for price comparison
        product_name = _extract_product_name(query)
        if not product_name:
            return None

        # Determine country from location or default to US
        country = _get_country_from_location(location)

        # Perform price comparison
        comparison_results = await compare_prices(
            user_id="system",  # System call for enhanced search
            product_name=product_name,
            country=country
        )

        if comparison_results.get('success', False):
            logger.info(f"Price comparison successful for: {product_name}")
            return comparison_results
        else:
            logger.warning(f"Price comparison failed for: {product_name}")
            return None

    except ImportError:
        logger.debug("Price comparison service not available")
        return None
    except Exception as e:
        logger.warning(f"Price comparison error: {e}")
        return None


def _extract_product_name(query: str) -> Optional[str]:
    """Extract a clean product name from search query"""

    # Remove common search prefixes/suffixes
    clean_query = query.lower().strip()

    # Remove price-related words
    price_words = ['cheapest', 'cheap', 'best price', 'price', 'cost', 'deal', 'sale', 'discount']
    for word in price_words:
        clean_query = clean_query.replace(word, '').strip()

    # Remove search action words
    action_words = ['find', 'search', 'look for', 'get', 'buy', 'purchase', 'show me']
    for word in action_words:
        clean_query = clean_query.replace(word, '').strip()

    # Remove extra whitespace
    clean_query = ' '.join(clean_query.split())

    # Return if we have something meaningful
    if len(clean_query) > 3 and len(clean_query) < 100:
        return clean_query

    return None


def _get_country_from_location(location: Optional[str]) -> str:
    """Determine country code from location string"""

    if not location:
        return "us"  # Default to US

    location_lower = location.lower()

    # Country mapping
    country_map = {
        "australia": "au",
        "united states": "us",
        "canada": "ca",
        "uk": "uk",
        "united kingdom": "uk",
        "new zealand": "nz"
    }

    for country_name, code in country_map.items():
        if country_name in location_lower:
            return code

    return "us"  # Default fallback


def _format_enhanced_response(
    query: str,
    intent_result,
    rv_context,
    search_results: Dict[str, Any],
    price_comparison: Optional[Dict[str, Any]],
    community_insights: List,
    popularity_data: Optional,
    user_id: str
) -> Dict[str, Any]:
    """Format the complete enhanced search response with RV intelligence"""

    # Build the response
    response = {
        "query": query,
        "intent_classification": {
            "category": intent_result.category.value,
            "rv_relevance": intent_result.rv_relevance.value,
            "confidence": intent_result.confidence,
            "keywords_matched": intent_result.keywords_matched,
            "rv_keywords_matched": intent_result.rv_keywords_matched
        },
        "rv_context": {
            "title": rv_context.title,
            "summary": rv_context.summary,
            "key_considerations": [
                {
                    "title": consideration.title,
                    "description": consideration.description,
                    "priority": consideration.priority,
                    "icon": consideration.icon
                }
                for consideration in rv_context.key_considerations
            ],
            "common_issues": rv_context.common_issues
        },
        "community_insights": {
            "insights": [
                {
                    "type": insight.insight_type,
                    "message": insight.message,
                    "confidence": insight.confidence,
                    "source": insight.source_type
                }
                for insight in community_insights
            ],
            "popularity_data": {
                "item_type": popularity_data.item_type,
                "popularity_score": popularity_data.popularity_score,
                "common_reasons": popularity_data.common_reasons,
                "community_notes": popularity_data.community_notes
            } if popularity_data else None
        },
        "search_results": search_results,
        "price_comparison": price_comparison,
        "timestamp": datetime.now().isoformat(),
        "copilot_message": _generate_copilot_message(intent_result, rv_context, search_results, price_comparison, community_insights, popularity_data),
        "transparency": _generate_transparency_info(search_results, query),
        "success": True
    }

    return response


def _generate_copilot_message(
    intent_result,
    rv_context,
    search_results: Dict[str, Any],
    price_comparison: Optional[Dict[str, Any]],
    community_insights: List,
    popularity_data: Optional
) -> str:
    """Generate PAM's intelligent copilot message"""

    messages = []

    # Opening with context intelligence
    if intent_result.rv_relevance == RVRelevance.HIGH:
        messages.append(f"I found several {intent_result.category.value} options with RV-specific considerations.")
    else:
        messages.append(f"I found several {intent_result.category.value} options.")

    # Add RV context summary (brief format)
    context_summary = rv_context_provider.format_context_for_response(rv_context, brief=True)
    messages.append(context_summary)

    # Add key considerations (top 2)
    if rv_context.key_considerations:
        top_considerations = rv_context.key_considerations[:2]
        for consideration in top_considerations:
            messages.append(f"**{consideration.icon} {consideration.title}**: {consideration.description}")

    # Add price comparison insight
    if price_comparison and price_comparison.get('success', False):
        comparison_data = price_comparison.get('comparison', {})
        potential_savings = comparison_data.get('potential_savings', 0)
        if potential_savings > 2:
            cheapest = comparison_data.get('cheapest', {})
            messages.append(f"💰 **Price Insight**: Found potential ${potential_savings:.0f} savings at {cheapest.get('store', 'retailer')}")

    # Add search results summary
    results = search_results.get('results', [])
    if results:
        messages.append(f"📍 **Search Results**: Found {len(results)} options from {search_results.get('engines_used', ['web'])[0]}")

    # Add community wisdom from insights provider
    if community_insights or popularity_data:
        community_message = rv_insights_provider.format_insights_for_response(
            community_insights,
            popularity_data
        )
        if community_message:
            messages.append(f"🏕️ {community_message}")

    # Add legacy community notes from RV context if no specific insights
    elif rv_context.community_notes:
        messages.append(f"🏕️ **Community Insight**: {rv_context.community_notes}")

    return "\n\n".join(messages)


def _generate_transparency_info(search_results: Dict[str, Any], query: str) -> Dict[str, Any]:
    """Generate comprehensive transparency information using disclosure manager"""

    try:
        # Extract results for analysis
        results = search_results.get('results', []) if search_results.get('success', False) else []

        # Analyze affiliate content
        disclosure_context = affiliate_disclosure_manager.analyze_search_results(results, query)

        # Generate appropriate disclosure
        disclosure_message = affiliate_disclosure_manager.generate_disclosure(
            disclosure_context,
            include_source_diversity_note=True
        )

        # Get transparency summary
        transparency_summary = affiliate_disclosure_manager.get_transparency_summary(disclosure_context)

        # Get source diversity analysis
        source_diversity = affiliate_disclosure_manager.get_source_diversity_analysis(results)

        return {
            "disclosure_message": disclosure_message,
            "transparency_summary": transparency_summary,
            "source_diversity": source_diversity,
            "disclosure_context": {
                "has_affiliate_links": disclosure_context.has_affiliate_links,
                "affiliate_count": disclosure_context.affiliate_link_count,
                "non_affiliate_count": disclosure_context.non_affiliate_link_count,
                "total_links": disclosure_context.affiliate_link_count + disclosure_context.non_affiliate_link_count
            }
        }

    except Exception as e:
        logger.warning(f"Failed to generate transparency info: {e}")
        # Fallback to basic disclosure
        return {
            "disclosure_message": (
                "💡 **How PAM Works**: I recommend the best option for RV life based on mobile living needs. "
                "We may earn commission on some links, but recommendations are based on RV expertise regardless of source."
            ),
            "transparency_summary": {"transparency_level": "fallback"},
            "source_diversity": {},
            "disclosure_context": {"has_affiliate_links": False}
        }



# Tool metadata for registration
TOOL_METADATA = {
    "name": "enhanced_search",
    "description": "Search with RV context intelligence - PAM's Financial Co-Pilot for Mobile Living. Transforms any purchase query into smart recommendations with mobile living expertise.",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query for products, services, or information (e.g., 'Find me the cheapest iPad 9th gen 256GB cellular')"
            },
            "search_type": {
                "type": "string",
                "description": "Type of search to perform",
                "enum": ["product", "service", "local", "general"],
                "default": "product"
            },
            "include_price_comparison": {
                "type": "boolean",
                "description": "Include price comparison across retailers (requires RapidAPI key)",
                "default": True
            },
            "location": {
                "type": "string",
                "description": "Optional location context (e.g., 'Phoenix, AZ', 'near Yellowstone')",
                "default": None
            },
            "num_results": {
                "type": "integer",
                "description": "Number of search results to return (4-20)",
                "default": 8,
                "minimum": 4,
                "maximum": 20
            }
        },
        "required": ["query"]
    }
}