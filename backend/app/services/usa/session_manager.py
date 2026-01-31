"""
Browser Session Manager for Universal Site Access

Manages Playwright browser sessions with:
- Max 20 concurrent sessions (for Render 16GB plan)
- 10 minute session timeout
- One session per user
- Automatic cleanup of expired sessions
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Optional, TYPE_CHECKING
import logging

if TYPE_CHECKING:
    from playwright.async_api import Browser, BrowserContext, Page
    from .element_ref import ElementRef

logger = logging.getLogger(__name__)


@dataclass
class BrowserSession:
    """
    Represents an active browser session for a user.

    Contains:
    - Playwright browser context and page
    - Cached element references from last index_page
    - Activity tracking for timeout
    - Pause state for manual takeover
    """
    user_id: str
    context: 'BrowserContext'
    page: 'Page'
    elements: Dict[int, 'ElementRef'] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_activity: datetime = field(default_factory=datetime.utcnow)
    paused: bool = False

    def touch(self) -> None:
        """Update last activity timestamp"""
        self.last_activity = datetime.utcnow()


class BrowserSessionManager:
    """
    Manages Playwright browser sessions.

    Constraints:
    - Max 20 concurrent sessions (Render 16GB plan: 512MB each)
    - 10 minute timeout per session
    - One session per user
    - Automatic cleanup of expired sessions
    """

    def __init__(
        self,
        max_sessions: int = 20,
        timeout_seconds: int = 600
    ):
        self.sessions: Dict[str, BrowserSession] = {}
        self.max_sessions = max_sessions
        self.timeout_seconds = timeout_seconds
        self.playwright = None
        self.browser: Optional['Browser'] = None
        self._initialized = False

    async def initialize(self) -> None:
        """
        Start Playwright browser.
        Call this on application startup.
        """
        if self._initialized:
            logger.warning("Session manager already initialized")
            return

        try:
            from playwright.async_api import async_playwright

            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--single-process',
                ]
            )
            self._initialized = True
            logger.info("Browser session manager initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize browser session manager: {e}")
            raise

    async def shutdown(self) -> None:
        """
        Clean shutdown of all sessions and browser.
        Call this on application shutdown.
        """
        logger.info("Shutting down browser session manager")

        # Close all sessions
        for user_id in list(self.sessions.keys()):
            try:
                await self.close_session(user_id)
            except Exception as e:
                logger.error(f"Error closing session for {user_id}: {e}")

        # Close browser
        if self.browser:
            try:
                await self.browser.close()
            except Exception as e:
                logger.error(f"Error closing browser: {e}")

        # Stop playwright
        if self.playwright:
            try:
                await self.playwright.stop()
            except Exception as e:
                logger.error(f"Error stopping playwright: {e}")

        self._initialized = False
        logger.info("Browser session manager shutdown complete")

    async def get_or_create(self, user_id: str) -> BrowserSession:
        """
        Get existing session or create new one for user.

        Args:
            user_id: The user ID

        Returns:
            BrowserSession for the user
        """
        if not self._initialized:
            await self.initialize()

        # Cleanup expired sessions first
        await self._cleanup_expired()

        # Return existing session if available
        if user_id in self.sessions:
            session = self.sessions[user_id]
            session.touch()
            logger.debug(f"Returning existing session for user {user_id}")
            return session

        # Evict oldest if at capacity
        if len(self.sessions) >= self.max_sessions:
            await self._evict_oldest()

        # Create new session
        logger.info(f"Creating new browser session for user {user_id}")

        context = await self.browser.new_context(
            viewport={'width': 1280, 'height': 720},
            user_agent=(
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/120.0.0.0 Safari/537.36'
            )
        )
        page = await context.new_page()

        session = BrowserSession(
            user_id=user_id,
            context=context,
            page=page
        )
        self.sessions[user_id] = session

        logger.info(f"Session created for user {user_id}, total sessions: {len(self.sessions)}")
        return session

    async def close_session(self, user_id: str) -> bool:
        """
        Close and cleanup session for user.

        Args:
            user_id: The user ID

        Returns:
            True if session was closed, False if no session existed
        """
        if user_id not in self.sessions:
            return False

        session = self.sessions[user_id]
        try:
            await session.context.close()
        except Exception as e:
            logger.error(f"Error closing context for user {user_id}: {e}")

        del self.sessions[user_id]
        logger.info(f"Session closed for user {user_id}, total sessions: {len(self.sessions)}")
        return True

    async def _cleanup_expired(self) -> None:
        """Remove sessions that have timed out"""
        now = datetime.utcnow()
        expired = [
            uid for uid, session in self.sessions.items()
            if (now - session.last_activity).total_seconds() > self.timeout_seconds
        ]

        for uid in expired:
            logger.info(f"Expiring session for user {uid} due to inactivity")
            await self.close_session(uid)

    async def _evict_oldest(self) -> None:
        """Evict oldest session when at capacity"""
        if not self.sessions:
            return

        oldest_uid = min(
            self.sessions.keys(),
            key=lambda uid: self.sessions[uid].last_activity
        )
        logger.info(f"Evicting oldest session for user {oldest_uid} due to capacity")
        await self.close_session(oldest_uid)

    def get_session_count(self) -> int:
        """Get current number of active sessions"""
        return len(self.sessions)

    def is_initialized(self) -> bool:
        """Check if manager is initialized"""
        return self._initialized


# Singleton instance
session_manager = BrowserSessionManager()
