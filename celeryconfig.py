from datetime import timedelta

broker_url = 'redis://localhost:6379/0'
result_backend = 'redis://localhost:6379/0'

beat_schedule = {
    'proactive-checks': {
        'task': 'tasks.proactive_checks',
        'schedule': timedelta(seconds=15 * 60),
    },
}
