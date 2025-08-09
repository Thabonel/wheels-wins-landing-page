import sys
from pathlib import Path
import pytest
from unittest.mock import MagicMock, patch

# Ensure src package is importable
repo_root = Path(__file__).resolve().parent.parent
src_path = repo_root / "src"
for p in (repo_root, src_path):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from src.youtube_client import YouTubeAPIClient, SearchFilters, YouTubeAPIError


class DummyService:
    def __init__(self, responses):
        self.responses = responses

    def search(self):
        return self

    def videos(self):
        return self

    def captions(self):
        return self

    def list(self, **kwargs):
        key = kwargs.get("id") or kwargs.get("videoId") or "search"
        return MagicMock(execute=lambda: self.responses[key])

    def download(self, id):
        return MagicMock(execute=lambda: b"caption text")


@patch("src.youtube_client.build")
def test_search_videos_basic(mock_build):
    service = DummyService({
        "search": {"items": [{"id": {"videoId": "abc"}}]},
        "abc": {"items": [{
            "id": "abc",
            "snippet": {"title": "t", "description": "d", "channelTitle": "c", "publishedAt": "2020"},
            "statistics": {"viewCount": "10"}
        }]}
    })
    mock_build.return_value = service
    client = YouTubeAPIClient("k")
    videos = client.search_videos("q", max_results=1)
    assert videos[0]["id"] == "abc"
    assert videos[0]["viewCount"] == 10


@patch("src.youtube_client.build")
def test_get_transcript_caption(mock_build):
    service = DummyService({
        "search": {},
        "abc": {"items": [{"id": "abc"}]},
        "captions": {"items": [{"id": "cap"}]},
    })
    def list_side(**kwargs):
        if "part" in kwargs and kwargs["part"] == "id":
            return MagicMock(execute=lambda: service.responses["captions"])
        return MagicMock(execute=lambda: service.responses["abc"])
    service.captions = lambda: service
    service.list = list_side
    mock_build.return_value = service

    client = YouTubeAPIClient("k")
    result = client.get_transcript("abc")
    assert result == "caption text"


@patch("src.youtube_client.build", side_effect=Exception("fail"))
def test_client_import_error(mock_build):
    with pytest.raises(Exception):
        YouTubeAPIClient("k")

