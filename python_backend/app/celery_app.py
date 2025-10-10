"""
Celery application for background tasks
"""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "hr_management",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks", "app.tasks.workflow_tasks"]
)

# Configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes
    task_soft_time_limit=270,  # 4.5 minutes
)

# Task routes
celery_app.conf.task_routes = {
    "app.tasks.email.*": {"queue": "email"},
    "app.tasks.reports.*": {"queue": "reports"},
    "app.tasks.notifications.*": {"queue": "notifications"},
    "tasks.check_workflow_escalations": {"queue": "workflows"},
    "tasks.send_escalation_reminder": {"queue": "workflows"},
}

if __name__ == "__main__":
    celery_app.start()
