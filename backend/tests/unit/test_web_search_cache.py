import pytest
from unittest.mock import AsyncMock

from app.services.search.web_search import WebSearchService

class DummyEngine:
    async def search(self, query, num_results):
        return [{"title": query, "url": "http://example.com"}]

@pytest.mark.asyncio
async def test_search_uses_cache():
    service = WebSearchService()
    service.search_engines = {"dummy": DummyEngine()}
    service.available_engines = ["dummy"]
    service.cache = AsyncMock()
    cached = {"query": "hello", "results": []}
    service.cache.get.return_value = cached

    result = await service.search("hello", use_cache=True)

    assert result == cached
    service.cache.get.assert_awaited_once()

@pytest.mark.asyncio
async def test_search_sets_cache():
    service = WebSearchService()
    service.search_engines = {"dummy": DummyEngine()}
    service.available_engines = ["dummy"]
    service.cache = AsyncMock()
    service.cache.get.return_value = None

    result = await service.search("hello", use_cache=True)

    assert "results" in result
    service.cache.set.assert_awaited_once()

