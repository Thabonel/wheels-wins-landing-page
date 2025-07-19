import asyncio
import sys
from pathlib import Path
import pytest
from unittest.mock import AsyncMock, patch

# Ensure src package is importable
repo_root = Path(__file__).resolve().parent.parent
src_path = repo_root / "src"
for p in (repo_root, src_path):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from src.main import process_batch
from src.trip_extractor import TripData


class DummyYT:
    def __init__(self, transcript="hi"):
        self.transcript = transcript

    def get_transcript(self, video_id):
        return self.transcript


class DummyExtractor:
    async def extract(self, transcript):
        return TripData(start_location="A", end_location="B", confidence=1.0)


@pytest.mark.asyncio
async def test_process_batch(monkeypatch):
    videos = ["v1", "v2", "v3"]
    with patch("src.main.YouTubeAPIClient", return_value=DummyYT()), \
         patch("src.main.TripExtractor", return_value=DummyExtractor()):
        report = await process_batch("k", videos, resume=False)
    assert report["total"] == 3
    assert report["success"] == 3
    assert report["failure"] == 0
    assert report["success_rate"] == 1.0
