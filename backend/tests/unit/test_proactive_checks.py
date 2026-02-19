import pytest
from unittest.mock import AsyncMock, patch

from app.tasks.proactive_checks import run_proactive_checks


class TestProactiveChecks:
    """Unit tests for the proactive checks task."""

    @pytest.mark.asyncio
    @pytest.mark.xfail(reason="Async mocks not wired correctly; json.dumps fails on coroutine return values")
    async def test_run_proactive_checks_dry_run(self):
        with patch("app.tasks.proactive_checks._get_active_users", new=AsyncMock(return_value=[{"user_id": "123", "region": "AU"}])):
            with patch("app.tasks.proactive_checks._get_budget_info", new=AsyncMock(return_value=[])):
                with patch("app.tasks.proactive_checks._prefetch_tomorrow_camps", new=AsyncMock(return_value=[])):
                    with patch("app.tasks.proactive_checks._get_weather_alert", return_value={"alert": "rain"}):
                        with patch("app.tasks.proactive_checks.manager.send_message_to_user", new=AsyncMock()) as mock_send:
                            await run_proactive_checks()
                            mock_send.assert_called_once()

