"""
PAM Tool: Save Recipe

Allows PAM to save recipes from YouTube or website URLs
Automatically detects source and scrapes recipe data
"""

import logging
from typing import Dict, Any, Optional

from app.services.scraping.youtube_recipe_scraper import youtube_recipe_scraper
from app.services.scraping.web_recipe_scraper import web_recipe_scraper

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

    Examples:
        User: "Save this recipe: https://www.allrecipes.com/recipe/12345/chicken-parmesan/"
        PAM: *Calls save_recipe* "I've saved the Chicken Parmesan recipe to your collection!"

        User: "Add this YouTube recipe: https://youtube.com/watch?v=abc123"
        PAM: *Calls save_recipe* "Recipe saved! I've added nutrition info too."
    """
    try:
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
                return {
                    "success": False,
                    "error": "Failed to extract recipe from YouTube video. Make sure the video has English captions and contains a recipe."
                }

            # Save to database
            from uuid import UUID
            recipe_id = await youtube_recipe_scraper.save_recipe_to_database(
                recipe_data=recipe_data,
                user_id=UUID(user_id)
            )

            if recipe_id:
                return {
                    "success": True,
                    "recipe_id": recipe_id,
                    "title": recipe_data.get('title'),
                    "message": f"Recipe '{recipe_data.get('title')}' saved successfully from YouTube!",
                    "has_nutrition": 'nutrition_info' in recipe_data
                }
            else:
                return {
                    "success": False,
                    "error": "Failed to save recipe to database"
                }

        else:
            # Web recipe scraper
            from uuid import UUID
            result = await web_recipe_scraper.scrape_recipe_from_url(
                user_id=UUID(user_id),
                url=url
            )

            if result['success']:
                return {
                    "success": True,
                    "recipe_id": result['recipe']['id'],
                    "title": result['recipe']['title'],
                    "message": result['message'],
                    "has_nutrition": 'nutrition_info' in result['recipe']
                }
            else:
                return result

    except Exception as e:
        logger.error(f"Error saving recipe: {str(e)}")
        return {
            "success": False,
            "error": f"Failed to save recipe: {str(e)}"
        }
