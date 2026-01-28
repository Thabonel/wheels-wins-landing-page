"""
PAM Tool: Save Recipe

Allows PAM to save recipes from YouTube or website URLs
Automatically detects source and scrapes recipe data
"""

import logging
from typing import Dict, Any, Optional

from app.services.scraping.youtube_recipe_scraper import youtube_recipe_scraper
from app.services.scraping.web_recipe_scraper import web_recipe_scraper
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
)

logger = logging.getLogger(__name__)


async def save_recipe(
    user_id: str,
    url: str,
    recipe_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Save a recipe from YouTube or website URL.

    PAM will automatically detect the source type and scrape accordingly.

    Args:
        user_id: ID of the user saving the recipe
        url: YouTube or recipe website URL
        recipe_name: Optional custom name for the recipe

    Returns:
        Dict with:
        {
            "success": True,
            "recipe": {...},
            "message": "Recipe saved successfully"
        }

    Raises:
        ValidationError: Invalid input parameters or URL
        DatabaseError: Database operation failed

    Examples:
        User: "Save this recipe: https://www.allrecipes.com/recipe/12345/chicken-parmesan/"
        PAM: *Calls save_recipe* "I've saved the Chicken Parmesan recipe to your collection!"

        User: "Add this YouTube recipe: https://youtube.com/watch?v=abc123"
        PAM: *Calls save_recipe* "Recipe saved! I've added nutrition info too."
    """
    try:
        validate_uuid(user_id, "user_id")

        if not url or not url.strip():
            raise ValidationError(
                "URL is required",
                context={"url": url}
            )

        if not url.startswith(('http://', 'https://')):
            raise ValidationError(
                "URL must start with http:// or https://",
                context={"url": url}
            )

        logger.info(f"Saving recipe from URL: {url}")

        # Detect source type
        if 'youtube.com' in url or 'youtu.be' in url:
            # YouTube recipe scraper
            recipe_data = await youtube_recipe_scraper.extract_recipe_info(
                video_url=url,
                video_title=recipe_name or "Recipe from YouTube",
                video_description=""
            )

            if not recipe_data:
                raise ValidationError(
                    "Failed to extract recipe from YouTube video. Make sure the video has English captions and contains a recipe.",
                    context={"url": url}
                )

            # Save to database
            from uuid import UUID
            recipe_id = await youtube_recipe_scraper.save_recipe_to_database(
                recipe_data=recipe_data,
                user_id=UUID(user_id)
            )

            if not recipe_id:
                raise DatabaseError(
                    "Failed to save recipe to database",
                    context={"user_id": user_id, "url": url}
                )

            return {
                "success": True,
                "recipe_id": recipe_id,
                "title": recipe_data.get('title'),
                "message": f"Recipe '{recipe_data.get('title')}' saved successfully from YouTube!",
                "has_nutrition": 'nutrition_info' in recipe_data
            }

        else:
            # Web recipe scraper
            from uuid import UUID
            result = await web_recipe_scraper.scrape_recipe_from_url(
                user_id=UUID(user_id),
                url=url
            )

            if not result['success']:
                raise DatabaseError(
                    result.get('error', 'Failed to scrape recipe from website'),
                    context={"user_id": user_id, "url": url}
                )

            return {
                "success": True,
                "recipe_id": result['recipe']['id'],
                "title": result['recipe']['title'],
                "message": result['message'],
                "has_nutrition": 'nutrition_info' in result['recipe']
            }

    except ValidationError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error saving recipe",
            extra={"user_id": user_id, "url": url},
            exc_info=True
        )
        raise DatabaseError(
            "Failed to save recipe",
            context={"user_id": user_id, "url": url, "error": str(e)}
        )
