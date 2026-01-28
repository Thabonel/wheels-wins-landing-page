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
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    validate_positive_number,
    safe_db_select,
    safe_db_update,
)

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

    Raises:
        ValidationError: Invalid input parameters
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")
        validate_positive_number(limit, "limit")

        valid_categories = ['shipping', 'maintenance', 'travel_tips', 'camping', 'routes', 'general']
        if category and category not in valid_categories:
            raise ValidationError(
                f"Invalid category. Must be one of: {', '.join(valid_categories)}",
                context={"category": category, "valid_categories": valid_categories}
            )

        valid_difficulties = ['beginner', 'intermediate', 'advanced']
        if difficulty and difficulty not in valid_difficulties:
            raise ValidationError(
                f"Invalid difficulty. Must be one of: {', '.join(valid_difficulties)}",
                context={"difficulty": difficulty, "valid_difficulties": valid_difficulties}
            )

        db = DatabaseService()

        query_builder = db.client.table('community_knowledge').select('*').eq('status', 'approved')

        if category:
            query_builder = query_builder.eq('category', category)

        if difficulty:
            query_builder = query_builder.eq('difficulty_level', difficulty)

        if query:
            query_builder = query_builder.or_(f"title.ilike.%{query}%,excerpt.ilike.%{query}%")

        query_builder = query_builder.order('helpful_count', desc=True).order('views', desc=True)
        query_builder = query_builder.limit(limit)

        try:
            result = query_builder.execute()
        except Exception as db_error:
            raise DatabaseError(
                "Failed to search knowledge articles",
                context={"user_id": user_id, "query": query, "error": str(db_error)}
            )

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
                "content": article['content'][:500] + "..." if len(article['content']) > 500 else article['content'],
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

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error searching knowledge articles",
            extra={"user_id": user_id, "query": query},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to search knowledge articles",
            context={"user_id": user_id, "query": query, "error": str(e)}
        )


async def get_knowledge_article(article_id: str) -> Dict[str, Any]:
    """
    Get a specific knowledge article by ID (for detailed recommendations).

    Args:
        article_id: UUID of the article

    Returns:
        Dict with article details

    Raises:
        ValidationError: Invalid article ID
        ResourceNotFoundError: Article not found
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(article_id, "article_id")

        db = DatabaseService()

        try:
            result = db.client.table('community_knowledge').select('*').eq('id', article_id).eq('status', 'approved').single().execute()
        except Exception as db_error:
            raise DatabaseError(
                "Failed to retrieve knowledge article",
                context={"article_id": article_id, "error": str(db_error)}
            )

        if not result.data:
            raise ResourceNotFoundError(
                "Article not found or not approved",
                context={"article_id": article_id}
            )

        article = result.data

        await safe_db_update(
            "community_knowledge",
            article_id,
            {'views': article['views'] + 1},
            None
        )

        logger.info(f"Retrieved knowledge article {article_id}")

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
                "views": article['views'] + 1,
                "helpful_count": article['helpful_count'],
                "url": f"/knowledge/{article['id']}"
            }
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error getting knowledge article",
            extra={"article_id": article_id},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to retrieve knowledge article",
            context={"article_id": article_id, "error": str(e)}
        )


async def get_knowledge_by_category(category: str, limit: int = 10) -> Dict[str, Any]:
    """
    Get top knowledge articles by category (for browsing).

    Args:
        category: Category to filter by (shipping, maintenance, travel_tips, camping, routes, general)
        limit: Max number of articles to return

    Returns:
        Dict with articles in the category

    Raises:
        ValidationError: Invalid category
        DatabaseError: Database operation failed
    """
    try:
        validate_positive_number(limit, "limit")

        valid_categories = ['shipping', 'maintenance', 'travel_tips', 'camping', 'routes', 'general']
        if category not in valid_categories:
            raise ValidationError(
                f"Invalid category. Must be one of: {', '.join(valid_categories)}",
                context={"category": category, "valid_categories": valid_categories}
            )

        db = DatabaseService()

        try:
            result = db.client.table('community_knowledge').select('*').eq('status', 'approved').eq('category', category).order('helpful_count', desc=True).limit(limit).execute()
        except Exception as db_error:
            raise DatabaseError(
                "Failed to retrieve knowledge by category",
                context={"category": category, "error": str(db_error)}
            )

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

        logger.info(f"Retrieved {len(articles)} knowledge articles in category {category}")

        return {
            "success": True,
            "articles": articles,
            "count": len(articles),
            "message": f"Found {len(articles)} article(s) in {category}"
        }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error getting knowledge by category",
            extra={"category": category},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to retrieve knowledge by category",
            context={"category": category, "error": str(e)}
        )
