"""
YouTube Recipe Video Scraper Service
Searches for recipe videos, extracts transcripts, and populates recipe database with nutrition data
"""

import asyncio
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
import json
import re
from uuid import UUID

from youtube_transcript_api import YouTubeTranscriptApi
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import openai

from app.core.config import get_settings
from app.core.database import get_supabase_client
from app.services.nutrition.edamam_service import edamam_service

logger = logging.getLogger(__name__)
settings = get_settings()


class YouTubeRecipeScraper:
    """Service for scraping YouTube recipe videos and extracting recipe information"""

    def __init__(self):
        self.youtube_api_key = getattr(settings, 'YOUTUBE_API_KEY', None)
        self.youtube_service = None
        self.openai_client = None
        self.supabase = get_supabase_client()

        # Initialize services
        if self.youtube_api_key:
            try:
                self.youtube_service = build('youtube', 'v3', developerKey=self.youtube_api_key)
                logger.info("YouTube API service initialized for recipe scraping")
            except Exception as e:
                logger.warning(f"YouTube API initialization failed: {e}")

        # Initialize OpenAI
        openai_key = getattr(settings, 'OPENAI_API_KEY', None)
        if openai_key:
            openai.api_key = openai_key
            self.openai_client = openai
            logger.info("OpenAI service initialized for recipe extraction")

    async def get_video_transcript(self, video_id: str) -> Optional[str]:
        """
        Extract transcript from YouTube video

        Args:
            video_id: YouTube video ID

        Returns:
            Full transcript text or None if unavailable
        """
        try:
            logger.info(f"Extracting transcript for recipe video: {video_id}")

            # Try to get transcript in order of preference
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

            transcript = None
            # First try manual transcripts
            try:
                transcript = transcript_list.find_manually_created_transcript(['en'])
                logger.info("Found manual English transcript")
            except:
                # Fall back to auto-generated
                try:
                    transcript = transcript_list.find_generated_transcript(['en'])
                    logger.info("Found auto-generated English transcript")
                except:
                    # Try any English transcript
                    for t in transcript_list:
                        if t.language_code.startswith('en'):
                            transcript = t
                            logger.info(f"Found English transcript: {t.language_code}")
                            break

            if not transcript:
                logger.warning(f"No English transcript found for video {video_id}")
                return None

            # Fetch and combine transcript segments
            transcript_data = transcript.fetch()
            full_text = ' '.join([segment['text'] for segment in transcript_data])

            # Clean up transcript
            full_text = self._clean_transcript(full_text)

            logger.info(f"Extracted transcript: {len(full_text)} characters")
            return full_text

        except Exception as e:
            logger.error(f"Transcript extraction failed: {e}")
            return None

    def _clean_transcript(self, text: str) -> str:
        """Clean up transcript text"""
        # Remove music notations
        text = re.sub(r'\[Music\]', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\[Applause\]', '', text, flags=re.IGNORECASE)

        # Remove excessive whitespace
        text = ' '.join(text.split())

        # Fix common transcription errors
        text = text.replace(' ,', ',').replace(' .', '.')

        return text.strip()

    async def extract_recipe_info(
        self,
        video_url: str,
        video_title: str,
        video_description: str = ""
    ) -> Optional[Dict[str, Any]]:
        """
        Extract recipe from YouTube video URL

        Args:
            video_url: YouTube video URL
            video_title: Video title
            video_description: Video description

        Returns:
            Structured recipe data or None if extraction fails
        """
        # Extract video ID from URL
        video_id_match = re.search(r'(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})', video_url)
        if not video_id_match:
            logger.error(f"Invalid YouTube URL: {video_url}")
            return None

        video_id = video_id_match.group(1)

        # Get transcript
        transcript = await self.get_video_transcript(video_id)
        if not transcript:
            return None

        # Extract recipe data using AI
        recipe_data = await self._extract_recipe_from_transcript(
            transcript=transcript,
            video_title=video_title,
            video_description=video_description,
            video_url=video_url
        )

        return recipe_data

    async def _extract_recipe_from_transcript(
        self,
        transcript: str,
        video_title: str,
        video_description: str,
        video_url: str
    ) -> Optional[Dict[str, Any]]:
        """
        Use AI to extract structured recipe information from transcript

        Args:
            transcript: Video transcript text
            video_title: Video title
            video_description: Video description
            video_url: Video URL

        Returns:
            Structured recipe data or None if extraction fails
        """
        if not self.openai_client:
            logger.error("OpenAI client not initialized")
            return None

        try:
            logger.info(f"Extracting recipe info from: {video_title}")

            # Prepare extraction prompt
            prompt = f"""Extract recipe information from this YouTube video transcript.

Video Title: {video_title}
Video Description: {video_description[:500] if video_description else "N/A"}

Transcript (first 6000 chars): {transcript[:6000]}...

Extract the following information and format as valid JSON:
{{
    "title": "Recipe name",
    "description": "Brief description of the dish",
    "ingredients": [
        {{"name": "chicken breast", "quantity": 2, "unit": "lbs"}},
        {{"name": "olive oil", "quantity": 2, "unit": "tbsp"}},
        {{"name": "salt", "quantity": null, "unit": "to taste"}}
    ],
    "instructions": [
        {{"step": 1, "text": "Preheat oven to 375°F"}},
        {{"step": 2, "text": "Season chicken with salt and pepper"}}
    ],
    "prep_time_minutes": 15,
    "cook_time_minutes": 30,
    "servings": 4,
    "difficulty": "easy",
    "meal_type": ["lunch", "dinner"],
    "cuisine": "italian",
    "dietary_tags": ["gluten-free", "keto"]
}}

IMPORTANT:
- Extract ALL ingredients with quantities and units where mentioned
- If quantity/unit not mentioned, use null
- Include ALL cooking steps in order
- For dietary_tags, include: vegan, vegetarian, gluten-free, dairy-free, nut-free, keto, paleo, etc.
- For difficulty: "easy", "medium", or "hard"
- For meal_type: Use array with one or more of: "breakfast", "lunch", "dinner", "snack"
- If information is not available, use null or appropriate empty value
- Return ONLY valid JSON, no additional text"""

            # Call OpenAI
            response = await asyncio.to_thread(
                self.openai_client.chat.completions.create,
                model="gpt-3.5-turbo-16k",
                messages=[
                    {"role": "system", "content": "You are an expert at extracting structured recipe information from video transcripts. Always return valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2000
            )

            # Parse response
            extracted_text = response.choices[0].message.content

            # Extract JSON from response
            json_match = re.search(r'\{.*\}', extracted_text, re.DOTALL)
            if json_match:
                recipe_data = json.loads(json_match.group())

                # Validate required fields
                if 'title' in recipe_data and 'ingredients' in recipe_data and 'instructions' in recipe_data:
                    # Add metadata
                    recipe_data['source_url'] = video_url
                    recipe_data['source_type'] = 'youtube'

                    # Get nutrition data from Edamam
                    if recipe_data.get('ingredients') and recipe_data.get('servings'):
                        nutrition_result = await self._get_nutrition_data(
                            recipe_data['ingredients'],
                            recipe_data['servings']
                        )
                        if nutrition_result['success']:
                            recipe_data['nutrition_info'] = nutrition_result['nutrition']

                    logger.info(f"Successfully extracted recipe: {recipe_data['title']}")
                    return recipe_data
                else:
                    logger.warning("Extracted data missing required fields")
                    return None
            else:
                logger.error("No valid JSON found in AI response")
                return None

        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {e}")
            return None
        except Exception as e:
            logger.error(f"Recipe extraction failed: {e}")
            return None

    async def _get_nutrition_data(
        self,
        ingredients: List[Dict[str, Any]],
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

    async def save_recipe_to_database(
        self,
        recipe_data: Dict[str, Any],
        user_id: UUID
    ) -> Optional[str]:
        """
        Save extracted recipe data to database

        Args:
            recipe_data: Structured recipe data
            user_id: User ID

        Returns:
            Recipe ID if successful, None otherwise
        """
        try:
            logger.info(f"Saving recipe to database: {recipe_data.get('title')}")

            # Prepare database record
            db_record = {
                "user_id": str(user_id),
                "title": recipe_data.get('title'),
                "description": recipe_data.get('description'),
                "source_url": recipe_data.get('source_url'),
                "source_type": recipe_data.get('source_type', 'youtube'),
                "thumbnail_url": recipe_data.get('thumbnail_url'),
                "ingredients": recipe_data.get('ingredients', []),
                "instructions": recipe_data.get('instructions', []),
                "prep_time_minutes": recipe_data.get('prep_time_minutes'),
                "cook_time_minutes": recipe_data.get('cook_time_minutes'),
                "servings": recipe_data.get('servings'),
                "difficulty": recipe_data.get('difficulty'),
                "nutrition_info": recipe_data.get('nutrition_info'),
                "meal_type": recipe_data.get('meal_type', []),
                "cuisine": recipe_data.get('cuisine'),
                "dietary_tags": recipe_data.get('dietary_tags', [])
            }

            # Insert into database
            result = self.supabase.table("recipes").insert(db_record).execute()

            if result.data:
                recipe_id = result.data[0]['id']
                logger.info(f"Recipe saved successfully: {recipe_id}")
                return recipe_id
            else:
                logger.error("Failed to save recipe to database")
                return None

        except Exception as e:
            logger.error(f"Database save failed: {e}")
            return None


# Singleton instance
youtube_recipe_scraper = YouTubeRecipeScraper()
