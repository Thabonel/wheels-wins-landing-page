import json
import logging
from typing import List, Optional, Literal

from openai import AsyncOpenAI
from pydantic import BaseModel

from app.core.config import settings

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

    def __init__(self, client: Optional[AsyncOpenAI] = None):
        self.client = client or AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def analyze_script(self, script: str) -> ScriptAnalysis:
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
            return ScriptAnalysis.model_validate(data)
        except Exception as e:
            logger.error(f"Script analysis failed: {e}")
            raise
