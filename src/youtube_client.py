# -*- coding: utf-8 -*-
"""YouTube API client utilities.

This module provides a simple wrapper around the YouTube Data API
with retry logic, rate limiting and transcript extraction helpers.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional

try:
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
except Exception:  # pragma: no cover - optional dependency
    build = None  # type: ignore
    HttpError = Exception  # type: ignore

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import (
        TranscriptsDisabled,
        NoTranscriptFound,
        CouldNotRetrieveTranscript,
    )
except Exception:  # pragma: no cover - optional dependency
    YouTubeTranscriptApi = None  # type: ignore
    TranscriptsDisabled = NoTranscriptFound = CouldNotRetrieveTranscript = Exception  # type: ignore


@dataclass
class SearchFilters:
    """Filters for video search."""

    duration: Optional[str] = None  # short, medium, long
    published_after: Optional[str] = None  # RFC3339 formatted date-time
    published_before: Optional[str] = None  # RFC3339 formatted date-time
    view_count_min: Optional[int] = None
    channel_id: Optional[str] = None


class YouTubeAPIError(Exception):
    """Generic YouTube API error."""


class YouTubeAPIClient:
    """Lightweight client for the YouTube Data API."""

    def __init__(
        self,
        api_key: str,
        max_requests_per_second: float = 9.0,
        max_retries: int = 3,
    ) -> None:
        if build is None:
            raise ImportError("google-api-python-client is required to use YouTubeAPIClient")
        self.api_key = api_key
        self.youtube = build("youtube", "v3", developerKey=api_key)
        self.max_requests_per_second = max_requests_per_second
        self.max_retries = max_retries
        self._last_request_time = 0.0

    # -----------------------------------------------------
    # Internal helpers
    # -----------------------------------------------------
    def _respect_rate_limit(self) -> None:
        elapsed = time.time() - self._last_request_time
        min_interval = 1.0 / self.max_requests_per_second
        if elapsed < min_interval:
            time.sleep(min_interval - elapsed)
        self._last_request_time = time.time()

    def _execute(self, request) -> Dict[str, Any]:
        backoff = 1.0
        for attempt in range(self.max_retries):
            try:
                self._respect_rate_limit()
                return request.execute()
            except HttpError as exc:  # pragma: no cover - network error
                if attempt >= self.max_retries - 1:
                    raise YouTubeAPIError(str(exc)) from exc
                time.sleep(backoff)
                backoff *= 2
        raise YouTubeAPIError("Exceeded maximum retries")

    # -----------------------------------------------------
    # Public API
    # -----------------------------------------------------
    def search_videos(
        self,
        query: str,
        *,
        filters: Optional[SearchFilters] = None,
        max_results: int = 25,
    ) -> List[Dict[str, Any]]:
        """Search for videos matching the query and filters."""

        filters = filters or SearchFilters()
        params = {
            "part": "id",
            "type": "video",
            "maxResults": max_results,
            "q": query,
        }
        if filters.duration:
            params["videoDuration"] = filters.duration
        if filters.published_after:
            params["publishedAfter"] = filters.published_after
        if filters.published_before:
            params["publishedBefore"] = filters.published_before
        if filters.channel_id:
            params["channelId"] = filters.channel_id
        if filters.view_count_min:
            params["order"] = "viewCount"

        try:
            response = self._execute(self.youtube.search().list(**params))
        except HttpError as exc:
            raise YouTubeAPIError(f"Search failed: {exc}") from exc

        video_ids = [item["id"]["videoId"] for item in response.get("items", [])]
        videos = [self.get_video_metadata(i) for i in video_ids]
        if filters.view_count_min is not None:
            videos = [v for v in videos if v.get("viewCount", 0) >= filters.view_count_min]
        return videos

    def get_video_metadata(self, video_id: str) -> Dict[str, Any]:
        """Return metadata for a single video."""
        try:
            data = self._execute(
                self.youtube.videos().list(part="snippet,statistics", id=video_id)
            )
        except HttpError as exc:
            raise YouTubeAPIError(f"Failed to fetch metadata: {exc}") from exc

        if not data.get("items"):
            raise YouTubeAPIError("Video not found")

        item = data["items"][0]
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})
        return {
            "id": video_id,
            "title": snippet.get("title"),
            "description": snippet.get("description"),
            "channel": snippet.get("channelTitle"),
            "publishedAt": snippet.get("publishedAt"),
            "viewCount": int(stats.get("viewCount", 0)),
        }

    def get_transcript(self, video_id: str) -> Optional[str]:
        """Attempt to fetch a video transcript."""
        # Official API captions (may require OAuth). Failure is tolerated.
        try:
            captions = self._execute(
                self.youtube.captions().list(part="id", videoId=video_id)
            )
            if captions.get("items"):
                caption_id = captions["items"][0]["id"]
                data = self._execute(self.youtube.captions().download(id=caption_id))
                return data.decode("utf-8") if isinstance(data, bytes) else data
        except Exception:  # pragma: no cover - fallback
            pass

        if YouTubeTranscriptApi is None:
            return None
        try:
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
            return " ".join(segment["text"] for segment in transcript)
        except (TranscriptsDisabled, NoTranscriptFound, CouldNotRetrieveTranscript):
            return None

    def search_rv_videos(
        self,
        keywords: Optional[Iterable[str]] = None,
        channels: Optional[Iterable[str]] = None,
        *,
        filters: Optional[SearchFilters] = None,
        max_results: int = 25,
    ) -> List[Dict[str, Any]]:
        """Search YouTube for RV travel videos."""
        query = "RV travel"
        if keywords:
            query = " ".join(keywords)
        results: List[Dict[str, Any]] = []
        if channels:
            for cid in channels:
                f = filters or SearchFilters()
                f.channel_id = cid
                results.extend(self.search_videos(query, filters=f, max_results=max_results))
        else:
            results = self.search_videos(query, filters=filters, max_results=max_results)
        return results
