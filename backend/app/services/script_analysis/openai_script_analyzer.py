import json
import logging
import hashlib
from typing import List, Optional, Literal

from openai import AsyncOpenAI
from pydantic import BaseModel

from app.core.config import settings
from app.services.cache_service import cache_service, CacheService

logger = logging.getLogger(__name__)


class ScriptSegment(BaseModel):
    type: Literal["vo", "broll", "soundbite"]
    speaker: Optional[str] = None
    text: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[List[str]] = None
    quote: Optional[str] = None
    duration: int


class ScriptAnalysis(BaseModel):
    segments: List[ScriptSegment]
    totalDuration: int


class OpenAIScriptAnalyzer:
    """Service for analyzing news scripts using OpenAI."""

    def __init__(self, client: Optional[AsyncOpenAI] = None, cache: Optional[CacheService] = None):
        self.client = client or AsyncOpenAI(api_key=settings.OPENAI_API_KEY.get_secret_value())
        self.cache = cache or cache_service

    async def analyze_script(self, script: str) -> ScriptAnalysis:
        cache_key = f"script_analysis:{hashlib.sha1(script.encode()).hexdigest()}"

        cached = await self.cache.get(cache_key)
        if cached:
            return ScriptAnalysis.model_validate(cached)

        prompt = (
            "Analyze this broadcast news script and extract:\n"
            "1. Voice-over segments with speaker names and text\n"
            "2. B-roll requirements with detailed descriptions\n"
            "3. Sound bites with exact quotes and speakers\n"
            "4. Estimated duration for each segment (assume 150 words/minute)\n\n"
            "Return as JSON with this structure:\n"
            "{\n"
            "    'segments': [\n"
            "        {'type': 'vo', 'speaker': 'name', 'text': '...', 'duration': seconds},\n"
            "        {'type': 'broll', 'description': '...', 'keywords': ['beach', 'pollution'], 'duration': seconds},\n"
            "        {'type': 'soundbite', 'speaker': 'title', 'quote': '...', 'duration': seconds}\n"
            "    ],\n"
            "    'totalDuration': seconds\n"
            "}\n\n"
            f"Script: {script}"
        )

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
            )
            content = response.choices[0].message.content
            data = json.loads(content)
            result = ScriptAnalysis.model_validate(data)
            await self.cache.set(cache_key, result.model_dump(), ttl=86400)
            return result
        except Exception as e:
            logger.error(f"Script analysis failed: {e}")
            raise
