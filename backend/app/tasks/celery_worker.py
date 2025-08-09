import os
from celery import Celery

celery_app = Celery(
    "pam",
    broker=os.environ["REDIS_URL"],
    backend=os.environ.get("REDIS_URL"),
)
celery_app.autodiscover_tasks(["app.tasks"])
