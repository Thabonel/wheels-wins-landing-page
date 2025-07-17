import pytest
from unittest.mock import AsyncMock

from app.services.script_analysis.openai_script_analyzer import OpenAIScriptAnalyzer, ScriptAnalysis

@pytest.mark.asyncio
async def test_analyze_script_cached():
    analyzer = OpenAIScriptAnalyzer(client=AsyncMock())
    cached = {"segments": [], "totalDuration": 0}
    analyzer.cache = AsyncMock()
    analyzer.cache.get.return_value = cached

    result = await analyzer.analyze_script("news")

    assert isinstance(result, ScriptAnalysis)
    analyzer.cache.get.assert_awaited_once()
