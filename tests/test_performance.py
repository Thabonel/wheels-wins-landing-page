import sys
from pathlib import Path
import time
import pytest
from unittest.mock import patch

# Ensure src package is importable
repo_root = Path(__file__).resolve().parent.parent
src_path = repo_root / "src"
for p in (repo_root, src_path):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from src.main import process_batch
from src.trip_extractor import TripData


class DummyYT:
    def get_transcript(self, video_id):
        return "t"


class DummyExtractor:
    async def extract(self, transcript):
        return TripData(start_location="A", end_location="B", confidence=1.0)


@pytest.mark.asyncio
async def test_batch_performance():
    videos = [f"v{i}" for i in range(50)]
    with patch("src.main.YouTubeAPIClient", return_value=DummyYT()), \
         patch("src.main.TripExtractor", return_value=DummyExtractor()):
        start = time.perf_counter()
        await process_batch("k", videos, resume=False)
        duration = time.perf_counter() - start
    assert duration < 1.0
