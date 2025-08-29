import sys
from pathlib import Path
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# Ensure src package is importable
repo_root = Path(__file__).resolve().parent.parent
src_path = repo_root / "src"
for p in (repo_root, src_path):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from src.trip_extractor import TripExtractor, TripData


class DummyChoice:
    def __init__(self, content):
        self.message = MagicMock(content=content)


class DummyResponse:
    def __init__(self, content):
        self.choices = [DummyChoice(content)]


@pytest.mark.asyncio
async def test_extract_valid(monkeypatch):
    data_path = Path(__file__).with_name("data") / "expected_trip.json"
    expected = json.loads(data_path.read_text())
    async_client = MagicMock()
    async_client.chat.completions.create = AsyncMock(return_value=DummyResponse(json.dumps(expected)))
    with patch("src.trip_extractor.AsyncOpenAI", return_value=async_client):
        extractor = TripExtractor()
        transcript = (Path(__file__).with_name("data") / "sample_transcript.txt").read_text()
        trip = await extractor.extract(transcript)
    assert trip.start_location == expected["start_location"]
    assert trip.end_location == expected["end_location"]


@pytest.mark.asyncio
async def test_extract_fallback(monkeypatch):
    async_client = MagicMock()
    async_client.chat.completions.create = AsyncMock(side_effect=Exception("fail"))
    with patch("src.trip_extractor.AsyncOpenAI", return_value=async_client):
        extractor = TripExtractor()
        trip = await extractor.extract("from A to B stopping at C")
    assert trip.start_location == "A"
    assert "B" in trip.end_location
    assert "C" in trip.waypoints


@pytest.mark.asyncio
async def test_batch_extract(monkeypatch):
    async_client = MagicMock()
    async_client.chat.completions.create = AsyncMock(return_value=DummyResponse('{"start_location":"A","end_location":"B"}'))
    with patch("src.trip_extractor.AsyncOpenAI", return_value=async_client):
        extractor = TripExtractor()
        trips = await extractor.batch_extract(["t1", "t2"])
    assert len(trips) == 2
    assert all(isinstance(t, TripData) for t in trips)
