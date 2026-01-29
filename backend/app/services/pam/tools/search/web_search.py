"""Web Search Tool for PAM

Search the web for products, deals, information - anything, anywhere in the world.
Uses Google, Bing, or DuckDuckGo to find the best results.

Example usage:
- "Find cheapest iPad 9th gen 256GB cellular in Johannesburg"
- "Search for best deal on Dometic CFX3 45 fridge"
- "Compare prices camping solar panels Germany"
- "Where can I buy Goal Zero Yeti 500X cheapest"

Date: January 2026
"""

import logging
from typing import Any, Dict, Optional, List

from app.services.search.web_search import web_search_service
from app.services.pam.tools.exceptions import (
    ValidationError,
    ExternalAPIError,
)
from app.services.pam.tools.utils import validate_uuid

logger = logging.getLogger(__name__)


async def web_search(
    user_id: str,
    query: str,
    search_type: Optional[str] = None,
    num_results: int = 10,
    location: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Search the web for products, deals, or information.

    Args:
        user_id: UUID of the user
        query: Search query (e.g., "cheapest iPad 9th gen 256GB")
        search_type: Optional search type:
            - 'product': Product comparison and reviews
            - 'local': Local businesses and services
            - 'news': Recent news articles
            - 'how-to': Tutorials and guides
            - None: General web search
        num_results: Number of results to return (default: 10, max: 20)
        location: Optional location context (e.g., "Johannesburg", "Cape Town")

    Returns:
        Dict with search results from Google/Bing/DuckDuckGo

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

        # Validate num_results
        if num_results < 1 or num_results > 20:
            num_results = min(max(num_results, 1), 20)

        # Validate search_type
        valid_search_types = ['product', 'local', 'news', 'how-to', None]
        if search_type not in valid_search_types:
            raise ValidationError(
                f"Invalid search_type. Must be one of: {', '.join(str(t) for t in valid_search_types if t)}",
                context={"search_type": search_type, "valid_types": valid_search_types}
            )

        logger.info(f"Web search for user {user_id}: '{query}' (type: {search_type})")

        # Build context for location-aware search
        context = {}
        if location:
            context['location'] = {'city': location}

        # Perform search
        try:
            if search_type:
                # Use specialized search
                results = await web_search_service.specialized_search(
                    search_type=search_type,
                    query=query,
                    num_results=num_results,
                    location=location
                )
            elif context:
                # Use context-aware search
                results = await web_search_service.search_with_context(
                    query=query,
                    context=context,
                    num_results=num_results
                )
            else:
                # Use standard search
                results = await web_search_service.search(
                    query=query,
                    num_results=num_results
                )
        except Exception as e:
            logger.error(f"Web search failed: {e}")
            raise ExternalAPIError(
                "Web search service temporarily unavailable",
                context={"query": query, "error": str(e)}
            )

        # Check if we got results
        if not results or 'results' not in results:
            return {
                "success": False,
                "query": query,
                "message": "No results found. Try different search terms.",
                "results": [],
                "engines_used": results.get('engines_used', []) if results else []
            }

        search_results = results.get('results', [])

        # Format results for PAM
        formatted_results = []
        for idx, result in enumerate(search_results[:num_results], 1):
            formatted_result = {
                "rank": idx,
                "title": result.get('title', 'No title'),
                "url": result.get('url', ''),
                "snippet": result.get('snippet', ''),
                "source": result.get('display_link', result.get('url', '')),
                "search_engines": result.get('engines', [result.get('source', 'web')])
            }

            # Add metadata if available
            if 'meta_description' in result:
                formatted_result['description'] = result['meta_description']
            if 'meta_image' in result:
                formatted_result['image'] = result['meta_image']

            formatted_results.append(formatted_result)

        # Build response message
        engines_used = results.get('engines_used', ['web'])
        engines_str = ', '.join(engines_used)

        message_parts = [
            f"Found {len(formatted_results)} results",
            f"(searched: {engines_str})"
        ]

        if search_type == 'product':
            message_parts.append("💡 Check prices and reviews before buying!")
        elif search_type == 'local':
            message_parts.append(f"📍 Results near {location}" if location else "📍 Add location for better results")

        return {
            "success": True,
            "query": query,
            "search_type": search_type,
            "location": location,
            "total_results": len(formatted_results),
            "results": formatted_results,
            "engines_used": engines_used,
            "message": " ".join(message_parts)
        }

    except ValidationError:
        raise
    except ExternalAPIError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error in web search",
            extra={"user_id": user_id, "query": query},
            exc_info=True
        )
        raise ExternalAPIError(
            "Failed to perform web search",
            context={"user_id": user_id, "query": query, "error": str(e)}
        )


# Tool metadata for registration
TOOL_METADATA = {
    "name": "web_search",
    "description": "Search the web for products, deals, services, or information anywhere in the world using Google, Bing, or DuckDuckGo",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query (e.g., 'cheapest iPad 9th gen 256GB Johannesburg')"
            },
            "search_type": {
                "type": "string",
                "description": "Type of search to perform",
                "enum": ["product", "local", "news", "how-to"],
                "default": None
            },
            "num_results": {
                "type": "integer",
                "description": "Number of results to return (1-20)",
                "default": 10,
                "minimum": 1,
                "maximum": 20
            },
            "location": {
                "type": "string",
                "description": "Location context for local searches (e.g., 'Johannesburg', 'Cape Town')",
                "default": None
            }
        },
        "required": ["query"]
    }
}
