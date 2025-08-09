import sys
from pathlib import Path
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# Ensure src package is importable
repo_root = Path(__file__).resolve().parent.parent
src_path = repo_root / "src"
for p in (repo_root, src_path):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from src.youtube_client import YouTubeAPIClient, YouTubeAPIError
from src.trip_extractor import TripExtractor


@patch("src.youtube_client.build")
def test_search_error(mock_build):
    class DummyRequest:
        def execute(self):
            raise Exception("fail")
    dummy = MagicMock()
    dummy.search.return_value.list.return_value = DummyRequest()
    mock_build.return_value = dummy
    client = YouTubeAPIClient("k")
    with pytest.raises(YouTubeAPIError):
        client.search_videos("q")


@pytest.mark.asyncio
async def test_openai_error(monkeypatch):
    async_client = MagicMock()
    async_client.chat.completions.create = AsyncMock(side_effect=Exception("fail"))
    with patch("src.trip_extractor.AsyncOpenAI", return_value=async_client):
        extractor = TripExtractor()
        trip = await extractor.extract("from X to Y")
    assert trip.start_location == "X"
    assert trip.end_location == "Y"
