import pytest
from unittest.mock import Mock, patch
from app.services.pam.scheduler.tasks import (
    check_fuel_levels_for_all_users,
    analyze_budget_thresholds,
    monitor_weather_windows
)
from app.services.pam.monitoring.event_types import EventType

@pytest.mark.asyncio
async def test_fuel_monitoring_task_triggers_events():
    with patch('app.services.pam.scheduler.tasks.get_all_active_users') as mock_users:
        with patch('app.services.pam.scheduler.tasks.get_fuel_level') as mock_fuel:
            with patch('app.services.pam.scheduler.tasks.trigger_proactive_event') as mock_trigger:

                mock_users.return_value = [{"id": "user1"}, {"id": "user2"}]
                mock_fuel.side_effect = [15, 85]  # user1 low fuel, user2 ok

                await check_fuel_levels_for_all_users()

                # Should only trigger for user1 with low fuel
                mock_trigger.assert_called_once()
                call_args = mock_trigger.call_args[0][0]
                assert call_args.type == EventType.LOW_FUEL
                assert call_args.user_id == "user1"

@pytest.mark.asyncio
async def test_budget_monitoring_detects_overspending():
    with patch('app.services.pam.scheduler.tasks.get_user_spending_data') as mock_spending:
        with patch('app.services.pam.scheduler.tasks.trigger_proactive_event') as mock_trigger:

            mock_spending.return_value = {
                "user1": {"spent": 800, "budget": 1000},  # 80% - trigger
                "user2": {"spent": 400, "budget": 1000}   # 40% - ok
            }

            await analyze_budget_thresholds()

            mock_trigger.assert_called_once()
            call_args = mock_trigger.call_args[0][0]
            assert call_args.type == EventType.BUDGET_THRESHOLD
            assert call_args.user_id == "user1"