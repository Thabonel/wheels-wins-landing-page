"""
Community Knowledge - Search Tool for PAM

Enables PAM to search and recommend approved knowledge articles to help users.
Articles are community-contributed guides covering shipping, maintenance, travel, etc.

Created: January 1, 2026
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from app.services.database import DatabaseService

logger = logging.getLogger(__name__)


async def search_knowledge(
    user_id: str,
    query: str,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    limit: int = 5
) -> Dict[str, Any]:
    """
    Search approved knowledge articles that might help answer user's question.

    Args:
        user_id: ID of the user asking
        query: Search query (keywords from user's message)
        category: Optional category filter (shipping, maintenance, travel_tips, camping, routes, general)
        difficulty: Optional difficulty filter (beginner, intermediate, advanced)
        limit: Max number of articles to return

    Returns:
        Dict with:
        - success: bool
        - articles: List of relevant articles
        - count: Number of articles found
    """
    try:
        # Validate category
        valid_categories = ['shipping', 'maintenance', 'travel_tips', 'camping', 'routes', 'general']
        if category and category not in valid_categories:
            return {
                "success": False,
                "articles": [],
                "count": 0,
                "error": f"Invalid category. Must be one of: {', '.join(valid_categories)}"
            }

        # Validate difficulty
        valid_difficulties = ['beginner', 'intermediate', 'advanced']
        if difficulty and difficulty not in valid_difficulties:
            return {
                "success": False,
                "articles": [],
                "count": 0,
                "error": f"Invalid difficulty. Must be one of: {', '.join(valid_difficulties)}"
            }

        db = DatabaseService()

        # Build query
        query_builder = db.client.table('community_knowledge').select('*').eq('status', 'approved')

        # Apply category filter
        if category:
            query_builder = query_builder.eq('category', category)

        # Apply difficulty filter
        if difficulty:
            query_builder = query_builder.eq('difficulty_level', difficulty)

        # Search in title and excerpt
        if query:
            query_builder = query_builder.or_(f"title.ilike.%{query}%,excerpt.ilike.%{query}%")

        # Order by relevance (views and helpful count)
        query_builder = query_builder.order('helpful_count', desc=True).order('views', desc=True)

        # Apply limit
        query_builder = query_builder.limit(limit)

        result = query_builder.execute()

        if not result.data:
            return {
                "success": True,
                "articles": [],
                "count": 0,
                "message": "No knowledge articles found for this query"
            }

        articles = []
        for article in result.data:
            articles.append({
                "id": article['id'],
                "title": article['title'],
                "excerpt": article['excerpt'],
                "content": article['content'][:500] + "..." if len(article['content']) > 500 else article['content'],  # Preview
                "category": article['category'],
                "difficulty_level": article['difficulty_level'],
                "estimated_read_time": article['estimated_read_time'],
                "tags": article.get('tags', []),
                "views": article['views'],
                "helpful_count": article['helpful_count'],
                "url": f"/knowledge/{article['id']}"
            })

        logger.info(
            f"Found {len(articles)} knowledge articles for query '{query}' "
            f"(category: {category}, difficulty: {difficulty})"
        )

        return {
            "success": True,
            "articles": articles,
            "count": len(articles),
            "message": f"Found {len(articles)} knowledge article(s)"
        }

    except Exception as e:
        logger.error(f"Error searching knowledge articles: {str(e)}")
        return {
            "success": False,
            "articles": [],
            "count": 0,
            "error": str(e)
        }


async def get_knowledge_article(article_id: str) -> Dict[str, Any]:
    """
    Get a specific knowledge article by ID (for detailed recommendations).

    Args:
        article_id: UUID of the article

    Returns:
        Dict with article details
    """
    try:
        if not article_id:
            return {
                "success": False,
                "error": "Article ID is required"
            }

        db = DatabaseService()

        result = db.client.table('community_knowledge').select('*').eq('id', article_id).eq('status', 'approved').single().execute()

        if result.data:
            article = result.data

            # Increment view count
            db.client.table('community_knowledge').update({'views': article['views'] + 1}).eq('id', article_id).execute()

            return {
                "success": True,
                "article": {
                    "id": article['id'],
                    "title": article['title'],
                    "content": article['content'],
                    "excerpt": article['excerpt'],
                    "category": article['category'],
                    "difficulty_level": article['difficulty_level'],
                    "estimated_read_time": article['estimated_read_time'],
                    "tags": article.get('tags', []),
                    "views": article['views'] + 1,  # Updated count
                    "helpful_count": article['helpful_count'],
                    "url": f"/knowledge/{article['id']}"
                }
            }
        else:
            return {
                "success": False,
                "error": "Article not found or not approved"
            }

    except Exception as e:
        logger.error(f"Error getting knowledge article {article_id}: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


async def get_knowledge_by_category(category: str, limit: int = 10) -> Dict[str, Any]:
    """
    Get top knowledge articles by category (for browsing).

    Args:
        category: Category to filter by (shipping, maintenance, travel_tips, camping, routes, general)
        limit: Max number of articles to return

    Returns:
        Dict with articles in the category
    """
    try:
        valid_categories = ['shipping', 'maintenance', 'travel_tips', 'camping', 'routes', 'general']
        if category not in valid_categories:
            return {
                "success": False,
                "articles": [],
                "count": 0,
                "error": f"Invalid category. Must be one of: {', '.join(valid_categories)}"
            }

        db = DatabaseService()

        result = db.client.table('community_knowledge').select('*').eq('status', 'approved').eq('category', category).order('helpful_count', desc=True).limit(limit).execute()

        if not result.data:
            return {
                "success": True,
                "articles": [],
                "count": 0,
                "message": f"No articles found in {category} category"
            }

        articles = []
        for article in result.data:
            articles.append({
                "id": article['id'],
                "title": article['title'],
                "excerpt": article['excerpt'],
                "difficulty_level": article['difficulty_level'],
                "estimated_read_time": article['estimated_read_time'],
                "tags": article.get('tags', []),
                "helpful_count": article['helpful_count'],
                "url": f"/knowledge/{article['id']}"
            })

        return {
            "success": True,
            "articles": articles,
            "count": len(articles),
            "message": f"Found {len(articles)} article(s) in {category}"
        }

    except Exception as e:
        logger.error(f"Error getting knowledge by category {category}: {str(e)}")
        return {
            "success": False,
            "articles": [],
            "count": 0,
            "error": str(e)
        }
