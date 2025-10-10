"""
Workflow Escalation Service
Business logic for automated workflow escalation and SLA monitoring
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from uuid import UUID
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from app.db.database import get_db
from app.models.models import Employee, Organization
from app.services.email_service import email_service
from app.services.notification_service import notification_service
from app.events.event_dispatcher import EventDispatcher

# Import Prometheus metrics (optional, graceful degradation if not available)
try:
    from app.utils import workflow_metrics
    METRICS_ENABLED = True
except ImportError:
    METRICS_ENABLED = False

logger = structlog.get_logger()


class WorkflowEscalationService:
    """Service for handling workflow escalations and SLA monitoring"""
    
    # Metrics tracking
    _metrics = {
        "workflows_checked": 0,
        "workflows_escalated": 0,
        "reminders_sent": 0,
        "sla_breaches": 0,
        "escalation_failures": 0
    }
    
    def __init__(self):
        """Initialize escalation service"""
        self.sla_warning_threshold_hours = 2  # Warn 2 hours before SLA breach
        self.escalation_retry_hours = 24  # Re-escalate after 24 hours
    
    async def check_and_escalate_workflows(self) -> Dict[str, int]:
        """
        Main function to check all pending workflow instances and escalate as needed
        
        Returns:
            Dict with counts of checked, escalated, and reminded workflows
        """
        try:
            logger.info("starting_workflow_escalation_check")
            
            escalated_count = 0
            reminded_count = 0
            total_checked = 0
            start_time = datetime.now()
            
            async for db in get_db():
                # In a real implementation, we would query a WorkflowInstance table
                # For now, we'll use mock data that represents pending workflow instances
                # This would normally be:
                # pending_instances = await self._get_pending_workflow_instances(db)
                
                pending_instances = await self._get_pending_workflow_instances_mock()
                total_checked = len(pending_instances)
                
                for instance in pending_instances:
                    try:
                        # Check SLA breach
                        sla_status = self._check_sla_status(instance)
                        
                        if sla_status == "breached":
                            # Escalate the workflow
                            await self._escalate_workflow(db, instance)
                            escalated_count += 1
                            self._metrics["workflows_escalated"] += 1
                            self._metrics["sla_breaches"] += 1
                            
                        elif sla_status == "warning":
                            # Send reminder
                            await self._send_sla_warning(db, instance)
                            reminded_count += 1
                            self._metrics["reminders_sent"] += 1
                            
                    except Exception as e:
                        logger.error(
                            "workflow_escalation_failed",
                            instance_id=instance.get("instance_id"),
                            error=str(e)
                        )
                        self._metrics["escalation_failures"] += 1
                
                self._metrics["workflows_checked"] += total_checked
                
                # Calculate duration
                duration = (datetime.now() - start_time).total_seconds()
                
                logger.info(
                    "workflow_escalation_check_completed",
                    total_checked=total_checked,
                    escalated=escalated_count,
                    reminded=reminded_count,
                    duration_seconds=duration
                )
                
                # Export metrics
                await self._export_metrics(
                    total_checked=total_checked,
                    escalated=escalated_count,
                    reminded=reminded_count,
                    duration_seconds=duration
                )
            
            return {
                "total_checked": total_checked,
                "escalated": escalated_count,
                "reminded": reminded_count,
                "duration_seconds": duration
            }
            
        except Exception as e:
            logger.error("workflow_escalation_check_failed", error=str(e))
            raise
    
    async def _get_pending_workflow_instances_mock(self) -> List[Dict[str, Any]]:
        """
        Mock function to get pending workflow instances
        In production, this would query the database
        """
        # Mock data representing pending workflow instances
        now = datetime.now()
        
        return [
            {
                "instance_id": "wf-instance-001",
                "workflow_id": "wf-001",
                "workflow_name": "Leave Approval",
                "workflow_type": "leave",
                "status": "pending",
                "current_stage": "Manager Approval",
                "stage_started_at": now - timedelta(hours=48),  # Started 48 hours ago
                "sla_hours": 24,  # SLA is 24 hours
                "escalation_enabled": True,
                "escalation_to": "hr_director",
                "current_approver_id": "emp-manager-001",
                "initiated_by": "emp-001",
                "organization_id": "org-001"
            },
            {
                "instance_id": "wf-instance-002",
                "workflow_id": "wf-002",
                "workflow_name": "Expense Approval",
                "workflow_type": "expense",
                "status": "pending",
                "current_stage": "Finance Approval",
                "stage_started_at": now - timedelta(hours=22),  # Started 22 hours ago
                "sla_hours": 24,  # SLA is 24 hours
                "escalation_enabled": True,
                "escalation_to": "cfo",
                "current_approver_id": "emp-finance-001",
                "initiated_by": "emp-002",
                "organization_id": "org-001"
            }
        ]
    
    def _check_sla_status(self, instance: Dict[str, Any]) -> str:
        """
        Check SLA status for a workflow instance
        
        Returns:
            "ok" if within SLA
            "warning" if approaching SLA breach (within warning threshold)
            "breached" if SLA has been breached
        """
        stage_started_at = instance.get("stage_started_at")
        sla_hours = instance.get("sla_hours")
        
        if not stage_started_at or not sla_hours:
            return "ok"
        
        elapsed = datetime.now() - stage_started_at
        elapsed_hours = elapsed.total_seconds() / 3600
        
        if elapsed_hours > sla_hours:
            return "breached"
        elif elapsed_hours > (sla_hours - self.sla_warning_threshold_hours):
            return "warning"
        else:
            return "ok"
    
    async def _escalate_workflow(self, db: AsyncSession, instance: Dict[str, Any]):
        """
        Escalate a workflow that has breached SLA
        
        Actions:
        1. Update workflow status to 'escalated'
        2. Reassign to escalation target
        3. Send notifications
        4. Create audit log entry
        """
        try:
            instance_id = instance.get("instance_id")
            escalation_target = instance.get("escalation_to")
            
            logger.info(
                "escalating_workflow",
                instance_id=instance_id,
                current_stage=instance.get("current_stage"),
                escalation_target=escalation_target
            )
            
            # In production, update the workflow instance in database
            # await self._update_workflow_status(db, instance_id, "escalated", escalation_target)
            
            # Send notification to escalation target
            await self._notify_escalation(db, instance, escalation_target)
            
            # Create audit log entry
            await self._create_audit_log(
                db=db,
                instance_id=instance_id,
                action="workflow_escalated",
                details={
                    "reason": "SLA breach",
                    "original_approver": instance.get("current_approver_id"),
                    "escalated_to": escalation_target,
                    "sla_hours": instance.get("sla_hours"),
                    "elapsed_hours": (datetime.now() - instance.get("stage_started_at")).total_seconds() / 3600
                }
            )
            
            # Dispatch event
            await EventDispatcher.dispatch("workflow.escalated", {
                "instance_id": instance_id,
                "escalated_to": escalation_target,
                "reason": "sla_breach"
            })
            
            logger.info(
                "workflow_escalated_successfully",
                instance_id=instance_id,
                escalation_target=escalation_target
            )
            
        except Exception as e:
            logger.error(
                "workflow_escalation_error",
                instance_id=instance.get("instance_id"),
                error=str(e)
            )
            raise
    
    async def _send_sla_warning(self, db: AsyncSession, instance: Dict[str, Any]):
        """Send SLA warning reminder to current approver"""
        try:
            instance_id = instance.get("instance_id")
            current_approver = instance.get("current_approver_id")
            
            logger.info(
                "sending_sla_warning",
                instance_id=instance_id,
                approver=current_approver
            )
            
            # Send reminder notification
            await self._notify_approver(
                db=db,
                instance=instance,
                approver_id=current_approver,
                notification_type="sla_warning"
            )
            
            # Create audit log
            await self._create_audit_log(
                db=db,
                instance_id=instance_id,
                action="sla_warning_sent",
                details={
                    "approver": current_approver,
                    "sla_hours": instance.get("sla_hours"),
                    "time_remaining_hours": instance.get("sla_hours") - 
                        ((datetime.now() - instance.get("stage_started_at")).total_seconds() / 3600)
                }
            )
            
        except Exception as e:
            logger.error(
                "sla_warning_error",
                instance_id=instance.get("instance_id"),
                error=str(e)
            )
    
    async def send_reminder(self, instance_id: str, reminder_type: str = "sla_warning") -> Dict[str, Any]:
        """
        Send a reminder for a specific workflow instance
        Can be called directly or via Celery task
        """
        try:
            logger.info(
                "sending_workflow_reminder",
                instance_id=instance_id,
                reminder_type=reminder_type
            )
            
            # In production, fetch the instance from database
            # For now, return success
            return {
                "success": True,
                "instance_id": instance_id,
                "reminder_type": reminder_type,
                "sent_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(
                "workflow_reminder_error",
                instance_id=instance_id,
                error=str(e)
            )
            return {
                "success": False,
                "instance_id": instance_id,
                "error": str(e)
            }
    
    async def _notify_escalation(self, db: AsyncSession, instance: Dict[str, Any], escalation_target: str):
        """Send notification about escalation"""
        try:
            # In production, look up the escalation target user
            # For now, log the notification
            logger.info(
                "escalation_notification",
                instance_id=instance.get("instance_id"),
                workflow_name=instance.get("workflow_name"),
                escalation_target=escalation_target
            )
            
            # Send notification via notification service
            await notification_service.send_notification(
                user_id=escalation_target,
                title="Workflow Escalated to You",
                message=f"Workflow '{instance.get('workflow_name')}' has been escalated to you due to SLA breach",
                notification_type="workflow_escalation",
                metadata={
                    "instance_id": instance.get("instance_id"),
                    "workflow_type": instance.get("workflow_type")
                }
            )
            
        except Exception as e:
            logger.error("escalation_notification_error", error=str(e))
    
    async def _notify_approver(
        self,
        db: AsyncSession,
        instance: Dict[str, Any],
        approver_id: str,
        notification_type: str
    ):
        """Send notification to approver"""
        try:
            messages = {
                "sla_warning": f"Urgent: Workflow '{instance.get('workflow_name')}' is approaching SLA deadline",
                "overdue": f"Overdue: Workflow '{instance.get('workflow_name')}' has exceeded SLA",
            }
            
            message = messages.get(notification_type, "Workflow pending your approval")
            
            await notification_service.send_notification(
                user_id=approver_id,
                title="Workflow Approval Reminder",
                message=message,
                notification_type="workflow_reminder",
                metadata={
                    "instance_id": instance.get("instance_id"),
                    "workflow_type": instance.get("workflow_type")
                }
            )
            
        except Exception as e:
            logger.error("approver_notification_error", error=str(e))
    
    async def _create_audit_log(
        self,
        db: AsyncSession,
        instance_id: str,
        action: str,
        details: Dict[str, Any]
    ):
        """Create audit log entry for workflow action"""
        try:
            logger.info(
                "workflow_audit_log",
                instance_id=instance_id,
                action=action,
                details=details,
                timestamp=datetime.now().isoformat()
            )
            
            # In production, insert into audit_logs table
            # audit_log = AuditLog(
            #     entity_type="workflow_instance",
            #     entity_id=instance_id,
            #     action=action,
            #     metadata=details,
            #     created_at=datetime.now()
            # )
            # db.add(audit_log)
            # await db.commit()
            
        except Exception as e:
            logger.error("audit_log_error", error=str(e))
    
    async def _export_metrics(
        self,
        total_checked: int,
        escalated: int,
        reminded: int,
        duration_seconds: float
    ):
        """
        Export metrics for monitoring
        Uses Prometheus client if available, otherwise logs metrics
        """
        try:
            metrics = {
                "workflow_tasks_checked_total": total_checked,
                "workflow_tasks_escalated_total": escalated,
                "workflow_tasks_reminded_total": reminded,
                "workflow_escalation_duration_seconds": duration_seconds,
                "workflow_tasks_over_sla": self._metrics.get("sla_breaches", 0),
                "workflow_escalation_failures_total": self._metrics.get("escalation_failures", 0)
            }
            
            logger.info(
                "workflow_escalation_metrics",
                **metrics
            )
            
            # Export to Prometheus if available
            if METRICS_ENABLED:
                workflow_metrics.increment_checked(total_checked)
                workflow_metrics.increment_escalated(escalated)
                workflow_metrics.increment_reminded(reminded)
                workflow_metrics.increment_sla_breach(self._metrics.get("sla_breaches", 0))
                workflow_metrics.increment_escalation_failure(self._metrics.get("escalation_failures", 0))
                workflow_metrics.observe_duration(duration_seconds)
            
        except Exception as e:
            logger.error("metrics_export_error", error=str(e))
    
    def get_metrics(self) -> Dict[str, int]:
        """Get current metrics snapshot"""
        return self._metrics.copy()
    
    def reset_metrics(self):
        """Reset metrics (useful for testing)"""
        self._metrics = {
            "workflows_checked": 0,
            "workflows_escalated": 0,
            "reminders_sent": 0,
            "sla_breaches": 0,
            "escalation_failures": 0
        }


# Singleton instance
workflow_escalation_service = WorkflowEscalationService()
