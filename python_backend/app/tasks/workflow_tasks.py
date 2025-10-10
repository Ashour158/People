"""
Workflow Escalation Background Tasks
Automated escalation and reminder jobs for workflow approvals
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List
from uuid import UUID
import structlog

from app.celery_app import celery_app
from app.services.workflow_escalation_service import workflow_escalation_service

logger = structlog.get_logger()


@celery_app.task(
    name="tasks.check_workflow_escalations",
    bind=True,
    max_retries=3,
    default_retry_delay=300  # 5 minutes
)
def check_workflow_escalations_task(self):
    """
    Celery task to check and escalate overdue workflow approvals
    Runs every 15 minutes via Celery Beat
    """
    try:
        logger.info("workflow_escalation_task_started")
        
        # Run the async service function
        result = asyncio.run(workflow_escalation_service.check_and_escalate_workflows())
        
        logger.info(
            "workflow_escalation_task_completed",
            escalated=result.get("escalated", 0),
            reminded=result.get("reminded", 0),
            total_checked=result.get("total_checked", 0)
        )
        
        return result
        
    except Exception as e:
        logger.error(
            "workflow_escalation_task_failed",
            error=str(e),
            task_id=self.request.id
        )
        # Retry the task
        raise self.retry(exc=e)


@celery_app.task(
    name="tasks.send_escalation_reminder",
    bind=True,
    max_retries=3
)
def send_escalation_reminder_task(self, instance_id: str, reminder_type: str = "sla_warning"):
    """
    Send reminder notification for a specific workflow instance
    
    Args:
        instance_id: Workflow instance ID
        reminder_type: Type of reminder (sla_warning, escalation, overdue)
    """
    try:
        logger.info(
            "workflow_reminder_task_started",
            instance_id=instance_id,
            reminder_type=reminder_type
        )
        
        result = asyncio.run(
            workflow_escalation_service.send_reminder(instance_id, reminder_type)
        )
        
        logger.info(
            "workflow_reminder_task_completed",
            instance_id=instance_id,
            result=result
        )
        
        return result
        
    except Exception as e:
        logger.error(
            "workflow_reminder_task_failed",
            instance_id=instance_id,
            error=str(e)
        )
        raise self.retry(exc=e)
