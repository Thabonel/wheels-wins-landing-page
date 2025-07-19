"""Compliance utilities for video data processing."""

from __future__ import annotations

import logging
import smtplib
import time
from collections import deque
from dataclasses import dataclass, field
from email.message import EmailMessage
from typing import Deque, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class RateLimiter:
    """Simple rate limiter respecting maximum calls per period."""

    max_calls: int
    period: float
    _calls: Deque[float] = field(default_factory=deque, init=False)

    def allow(self) -> bool:
        now = time.time()
        while self._calls and now - self._calls[0] >= self.period:
            self._calls.popleft()
        if len(self._calls) < self.max_calls:
            self._calls.append(now)
            return True
        return False

    def wait(self) -> None:
        if not self.allow():
            sleep_time = self.period - (time.time() - self._calls[0])
            if sleep_time > 0:
                time.sleep(sleep_time)


@dataclass
class VideoInfo:
    """Metadata for a tracked video."""

    video_id: str
    source_url: str
    creator_id: str
    creator_email: Optional[str] = None


@dataclass
class UsageRecord:
    """Record of data usage for compliance reporting."""

    video_id: str
    bytes_downloaded: int
    timestamp: float = field(default_factory=time.time)


class ComplianceManager:
    """Manage compliance aspects of video processing."""

    def __init__(self, rate_limiter: Optional[RateLimiter] = None) -> None:
        self.videos: Dict[str, VideoInfo] = {}
        self.opt_out_creators: set[str] = set()
        self.usage: List[UsageRecord] = []
        self.flagged: Dict[str, str] = {}
        self.rate_limiter = rate_limiter or RateLimiter(10, 1.0)

    # -----------------------------------------------------
    # Creator attribution and opt-out
    # -----------------------------------------------------
    def register_video(
        self,
        video_id: str,
        source_url: str,
        creator_id: str,
        creator_email: Optional[str] = None,
    ) -> None:
        """Track a video's origin and creator information."""
        self.videos[video_id] = VideoInfo(
            video_id=video_id,
            source_url=source_url,
            creator_id=creator_id,
            creator_email=creator_email,
        )

    def opt_out_creator(self, creator_id: str) -> None:
        """Exclude all content from a creator."""
        self.opt_out_creators.add(creator_id)

    def is_allowed(self, video_id: str) -> bool:
        info = self.videos.get(video_id)
        if not info:
            return True
        return info.creator_id not in self.opt_out_creators

    # -----------------------------------------------------
    # Rate limiting
    # -----------------------------------------------------
    def ensure_rate_limit(self) -> None:
        self.rate_limiter.wait()

    # -----------------------------------------------------
    # Data usage tracking
    # -----------------------------------------------------
    def record_usage(self, video_id: str, bytes_downloaded: int) -> None:
        self.usage.append(UsageRecord(video_id, bytes_downloaded))

    def get_usage_summary(self) -> Dict[str, int]:
        summary: Dict[str, int] = {}
        for record in self.usage:
            summary[record.video_id] = (
                summary.get(record.video_id, 0) + record.bytes_downloaded
            )
        return summary

    # -----------------------------------------------------
    # Creator notifications
    # -----------------------------------------------------
    def notify_creator(self, video_id: str, subject: str, message: str) -> None:
        info = self.videos.get(video_id)
        if not info or not info.creator_email:
            logger.debug("Creator email not available for %s", video_id)
            return
        try:
            email = EmailMessage()
            email["Subject"] = subject
            email["From"] = "noreply@example.com"
            email["To"] = info.creator_email
            email.set_content(message)
            with smtplib.SMTP("localhost") as smtp:  # type: ignore[arg-type]
                smtp.send_message(email)
        except Exception as exc:  # pragma: no cover - SMTP may be unavailable
            logger.warning("Failed to send email to %s: %s", info.creator_email, exc)

    # -----------------------------------------------------
    # Content flagging
    # -----------------------------------------------------
    def flag_content(self, video_id: str, reason: str) -> None:
        self.flagged[video_id] = reason

    def get_flagged(self) -> List[Tuple[str, str]]:
        return list(self.flagged.items())

    # -----------------------------------------------------
    # Legal disclaimer
    # -----------------------------------------------------
    def generate_disclaimer(self, video_id: str) -> str:
        info = self.videos.get(video_id)
        src = info.source_url if info else "unknown source"
        return (
            f"Data extracted from {src} is provided for informational purposes only. "
            "All rights to the original content remain with the creator."
        )

    # -----------------------------------------------------
    # Revenue sharing framework (placeholder)
    # -----------------------------------------------------
    def calculate_revenue_share(
        self, video_id: str, total_revenue: float, creator_share: float = 0.5
    ) -> Tuple[float, float]:
        """Return the split between creator and platform."""
        creator_amount = round(total_revenue * creator_share, 2)
        platform_amount = round(total_revenue - creator_amount, 2)
        return creator_amount, platform_amount
