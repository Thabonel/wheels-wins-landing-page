"""
Edamam Nutrition API Service

Wrapper for Edamam Nutrition Analysis API
Free tier: 10,000 calls/month (~330 recipes/day)

Usage:
    from app.services.nutrition.edamam_service import edamam_service

    nutrition = await edamam_service.get_nutrition_data(
        ingredients=["1 cup rice", "2 chicken breasts"],
        servings=4
    )
"""

import os
import logging
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger(__name__)


class EdamamService:
    """
    Wrapper for Edamam Nutrition API

    Provides nutrition analysis for recipe ingredients.
    Returns calories, macros, and micronutrients per serving.
    """

    BASE_URL = "https://api.edamam.com/api/nutrition-details"

    def __init__(self):
        self.app_id = os.getenv("EDAMAM_APP_ID")
        self.app_key = os.getenv("EDAMAM_APP_KEY")

        if not self.app_id or not self.app_key:
            logger.warning("Edamam API credentials not found in environment variables")

    async def get_nutrition_data(
        self,
        ingredients: List[str],
        servings: int = 1
    ) -> Dict[str, Any]:
        """
        Get nutrition info for a list of ingredients.

        Args:
            ingredients: List of ingredient strings (e.g., ["1 cup rice", "2 chicken breasts"])
            servings: Number of servings to calculate per-serving nutrition

        Returns:
            Dict with nutrition data:
            {
                "success": True,
                "nutrition": {
                    "calories": 450,
                    "protein": 35,
                    "carbs": 40,
                    "fat": 12,
                    "fiber": 3,
                    "sodium": 650,
                    "sugar": 8
                }
            }

        Raises:
            Exception: If API credentials missing or API call fails
        """
        if not self.app_id or not self.app_key:
            return {
                "success": False,
                "error": "Edamam API credentials not configured"
            }

        if not ingredients or servings <= 0:
            return {
                "success": False,
                "error": "Invalid ingredients or servings"
            }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.BASE_URL,
                    params={"app_id": self.app_id, "app_key": self.app_key},
                    json={"title": "Recipe", "ingr": ingredients}
                )
                response.raise_for_status()
                data = response.json()

                # Extract key nutrition facts
                total = data.get("totalNutrients", {})

                nutrition = {
                    "calories": round(data.get("calories", 0) / servings, 1),
                    "protein": round(total.get("PROCNT", {}).get("quantity", 0) / servings, 1),
                    "carbs": round(total.get("CHOCDF", {}).get("quantity", 0) / servings, 1),
                    "fat": round(total.get("FAT", {}).get("quantity", 0) / servings, 1),
                    "fiber": round(total.get("FIBTG", {}).get("quantity", 0) / servings, 1),
                    "sodium": round(total.get("NA", {}).get("quantity", 0) / servings, 1),
                    "sugar": round(total.get("SUGAR", {}).get("quantity", 0) / servings, 1),
                }

                logger.info(
                    f"Fetched nutrition data for {len(ingredients)} ingredients, "
                    f"{servings} servings: {nutrition['calories']} cal"
                )

                return {"success": True, "nutrition": nutrition}

        except httpx.HTTPStatusError as e:
            error_msg = f"Edamam API error: {e.response.status_code}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

        except httpx.RequestError as e:
            error_msg = f"Edamam API request failed: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

        except Exception as e:
            error_msg = f"Unexpected error in nutrition service: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

    def format_ingredient_for_api(self, ingredient: Dict[str, Any]) -> str:
        """
        Format ingredient dict to Edamam-compatible string.

        Args:
            ingredient: Dict with name, quantity, unit

        Returns:
            Formatted string like "2 cups rice" or "chicken breast"
        """
        name = ingredient.get("name", "")
        quantity = ingredient.get("quantity")
        unit = ingredient.get("unit")

        if quantity and unit:
            return f"{quantity} {unit} {name}"
        elif quantity:
            return f"{quantity} {name}"
        else:
            return name


# Singleton instance
edamam_service = EdamamService()
