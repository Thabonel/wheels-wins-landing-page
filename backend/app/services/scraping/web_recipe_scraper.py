"""
Web Recipe Scraper Service
Scrapes recipes from 595+ recipe websites using recipe-scrapers library
Integrates with Edamam API for nutrition data
"""

import logging
from typing import Dict, Any, Optional
from uuid import UUID
from recipe_scrapers import scrape_me
from recipe_scrapers._exceptions import WebsiteNotImplementedError

from app.core.database import get_supabase_client
from app.services.nutrition.edamam_service import edamam_service

logger = logging.getLogger(__name__)


class WebRecipeScraper:
    """
    Service for scraping recipes from websites

    Supports 595+ recipe sites including:
    - AllRecipes
    - Food Network
    - Tasty (BuzzFeed)
    - BBC Good Food
    - Epicurious
    - Bon Appétit
    - NYT Cooking
    - And 590+ more
    """

    def __init__(self):
        self.supabase = get_supabase_client()

    async def scrape_recipe_from_url(
        self,
        user_id: UUID,
        url: str
    ) -> Dict[str, Any]:
        """
        Scrape recipe from any supported website URL

        Args:
            user_id: User ID to save recipe for
            url: Recipe website URL

        Returns:
            Dict with:
            {
                "success": True,
                "recipe": {...},
                "message": "Recipe saved successfully"
            }
        """
        try:
            logger.info(f"Scraping recipe from: {url}")

            # Scrape recipe using recipe-scrapers library
            scraper = scrape_me(url, wild_mode=True)

            # Extract basic recipe data
            recipe_data = {
                "user_id": str(user_id),
                "title": scraper.title(),
                "source_url": url,
                "source_type": "web",
                "thumbnail_url": None,
            }

            # Extract optional fields safely
            try:
                recipe_data["description"] = scraper.description() if hasattr(scraper, 'description') else None
            except:
                recipe_data["description"] = None

            try:
                recipe_data["thumbnail_url"] = scraper.image()
            except:
                pass

            try:
                recipe_data["prep_time_minutes"] = scraper.prep_time() if hasattr(scraper, 'prep_time') else None
            except:
                recipe_data["prep_time_minutes"] = None

            try:
                recipe_data["cook_time_minutes"] = scraper.cook_time() if hasattr(scraper, 'cook_time') else None
            except:
                recipe_data["cook_time_minutes"] = None

            try:
                recipe_data["servings"] = scraper.yields() if hasattr(scraper, 'yields') else None
                # Parse servings if it's a string like "4 servings"
                if isinstance(recipe_data["servings"], str):
                    import re
                    servings_match = re.search(r'(\d+)', recipe_data["servings"])
                    if servings_match:
                        recipe_data["servings"] = int(servings_match.group(1))
            except:
                recipe_data["servings"] = None

            try:
                recipe_data["cuisine"] = scraper.cuisine() if hasattr(scraper, 'cuisine') else None
            except:
                recipe_data["cuisine"] = None

            # Extract ingredients
            try:
                raw_ingredients = scraper.ingredients()
                recipe_data["ingredients"] = self._parse_ingredients(raw_ingredients)
            except Exception as e:
                logger.error(f"Failed to extract ingredients: {e}")
                return {
                    "success": False,
                    "error": "Failed to extract ingredients from recipe"
                }

            # Extract instructions
            try:
                raw_instructions = scraper.instructions()
                recipe_data["instructions"] = self._parse_instructions(raw_instructions)
            except Exception as e:
                logger.error(f"Failed to extract instructions: {e}")
                return {
                    "success": False,
                    "error": "Failed to extract instructions from recipe"
                }

            # Infer dietary tags from ingredients (basic detection)
            recipe_data["dietary_tags"] = self._infer_dietary_tags(recipe_data["ingredients"])

            # Get nutrition data from Edamam
            if recipe_data.get("ingredients") and recipe_data.get("servings"):
                nutrition_result = await self._get_nutrition_data(
                    recipe_data["ingredients"],
                    recipe_data["servings"]
                )
                if nutrition_result["success"]:
                    recipe_data["nutrition_info"] = nutrition_result["nutrition"]
                    logger.info(f"Added nutrition data: {nutrition_result['nutrition']['calories']} cal/serving")

            # Save to database
            result = self.supabase.table("recipes").insert(recipe_data).execute()

            if result.data:
                logger.info(f"Recipe saved successfully: {recipe_data['title']}")
                return {
                    "success": True,
                    "recipe": result.data[0],
                    "message": f"Recipe '{recipe_data['title']}' saved successfully"
                }
            else:
                logger.error("Failed to save recipe to database")
                return {
                    "success": False,
                    "error": "Failed to save recipe to database"
                }

        except WebsiteNotImplementedError:
            logger.error(f"Website not supported: {url}")
            return {
                "success": False,
                "error": "This recipe website is not supported. Try a different recipe site like AllRecipes, Food Network, or Tasty."
            }
        except Exception as e:
            logger.error(f"Recipe scraping failed: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to scrape recipe: {str(e)}"
            }

    def _parse_ingredients(self, raw_ingredients: list) -> list:
        """
        Parse raw ingredient strings into structured format

        Args:
            raw_ingredients: List of ingredient strings

        Returns:
            List of dicts with name, quantity, unit
        """
        import re

        parsed = []
        for ing_str in raw_ingredients:
            # Basic parsing (quantity + unit + name)
            # Example: "2 cups flour" -> {quantity: 2, unit: "cups", name: "flour"}

            # Try to extract quantity
            quantity_match = re.match(r'^([\d./]+)\s+', ing_str)
            quantity = None
            unit = None
            name = ing_str

            if quantity_match:
                quantity_str = quantity_match.group(1)
                # Handle fractions like "1/2"
                if '/' in quantity_str:
                    parts = quantity_str.split('/')
                    quantity = float(parts[0]) / float(parts[1])
                else:
                    quantity = float(quantity_str)

                # Remove quantity from string
                remaining = ing_str[len(quantity_match.group(0)):].strip()

                # Try to extract unit
                unit_match = re.match(r'^(\w+)\s+', remaining)
                if unit_match:
                    unit = unit_match.group(1)
                    name = remaining[len(unit_match.group(0)):].strip()
                else:
                    name = remaining

            parsed.append({
                "name": name,
                "quantity": quantity,
                "unit": unit
            })

        return parsed

    def _parse_instructions(self, raw_instructions: str) -> list:
        """
        Parse raw instruction text into structured steps

        Args:
            raw_instructions: Raw instruction text

        Returns:
            List of dicts with step number and text
        """
        # Split by newlines or numbered steps
        steps = []

        # Try splitting by newlines first
        lines = raw_instructions.split('\n')

        step_num = 1
        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Remove existing step numbers
            import re
            line = re.sub(r'^\d+[\.)]\s*', '', line)

            if line:
                steps.append({
                    "step": step_num,
                    "text": line
                })
                step_num += 1

        return steps

    def _infer_dietary_tags(self, ingredients: list) -> list:
        """
        Infer dietary tags from ingredients (basic detection)

        Args:
            ingredients: List of ingredient dicts

        Returns:
            List of dietary tags
        """
        tags = []

        # Convert all ingredients to lowercase for checking
        ingredient_names = ' '.join([ing['name'].lower() for ing in ingredients])

        # Check for meat/animal products
        meat_keywords = ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp']
        has_meat = any(keyword in ingredient_names for keyword in meat_keywords)

        dairy_keywords = ['milk', 'cream', 'cheese', 'butter', 'yogurt', 'ghee']
        has_dairy = any(keyword in ingredient_names for keyword in dairy_keywords)

        egg_keywords = ['egg', 'eggs']
        has_eggs = any(keyword in ingredient_names for keyword in egg_keywords)

        # Vegan check (no meat, dairy, eggs)
        if not has_meat and not has_dairy and not has_eggs:
            tags.append('vegan')
            tags.append('vegetarian')
        # Vegetarian check (no meat)
        elif not has_meat:
            tags.append('vegetarian')

        # Dairy-free check
        if not has_dairy:
            tags.append('dairy-free')

        # Gluten check
        gluten_keywords = ['flour', 'wheat', 'bread', 'pasta', 'noodles']
        has_gluten = any(keyword in ingredient_names for keyword in gluten_keywords)
        if not has_gluten:
            tags.append('gluten-free')

        return tags

    async def _get_nutrition_data(
        self,
        ingredients: list,
        servings: int
    ) -> Dict[str, Any]:
        """
        Get nutrition data from Edamam API

        Args:
            ingredients: List of ingredient dicts
            servings: Number of servings

        Returns:
            Nutrition data or empty result
        """
        try:
            # Format ingredients for Edamam
            formatted_ingredients = []
            for ing in ingredients:
                formatted = edamam_service.format_ingredient_for_api(ing)
                if formatted:
                    formatted_ingredients.append(formatted)

            if not formatted_ingredients:
                return {"success": False, "error": "No valid ingredients"}

            # Get nutrition data
            result = await edamam_service.get_nutrition_data(
                ingredients=formatted_ingredients,
                servings=servings
            )

            return result

        except Exception as e:
            logger.error(f"Nutrition data fetch failed: {e}")
            return {"success": False, "error": str(e)}


# Singleton instance
web_recipe_scraper = WebRecipeScraper()
