# DEPRECATED: PAM Scheduler Tasks

⚠️ **DEPRECATED as of January 31, 2026**

The standalone PAM scheduler in `app/services/pam/scheduler/tasks.py` has been **deprecated** and replaced with production-ready Celery tasks.

## Replacement

**New Location**: `app/workers/tasks/pam_proactive_tasks.py`

**Why Changed**:
- Integration with existing production Celery infrastructure
- Better scalability and reliability
- Proper error handling and retry mechanisms
- Production monitoring and logging
- Queue-based task routing

## Migration Status

✅ **Migrated Tasks**:
- `check_fuel_levels_for_all_users` → `app.workers.tasks.pam_proactive_tasks.check_fuel_levels_for_all_users`
- `analyze_budget_thresholds` → `app.workers.tasks.pam_proactive_tasks.analyze_budget_thresholds`
- `monitor_weather_windows` → `app.workers.tasks.pam_proactive_tasks.monitor_weather_windows`
- `check_maintenance_reminders` → `app.workers.tasks.pam_proactive_tasks.check_proactive_maintenance_reminders`
- **Added**: `monitor_user_context_changes` (new proactive feature)

## Schedule Configuration

Schedules are now configured in `app/workers/celery.py`:
- Fuel monitoring: Every 5 minutes
- Budget analysis: Every hour
- Weather monitoring: Every 30 minutes
- Maintenance monitoring: Daily
- Context monitoring: Every 15 minutes

## Production Deployment

Tasks are deployed via Render workers:
- `pam-celery-worker`: Processes tasks
- `pam-celery-beat`: Schedules periodic tasks
- Redis: Task queue and result backend

## DO NOT USE

Do not import or use files from `app/services/pam/scheduler/` in new code.

Use the new Celery tasks in `app/workers/tasks/pam_proactive_tasks.py` instead.