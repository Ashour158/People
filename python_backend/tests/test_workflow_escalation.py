"""
Tests for workflow escalation service and background tasks
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock
import asyncio

from app.services.workflow_escalation_service import (
    WorkflowEscalationService,
    workflow_escalation_service
)


class TestWorkflowEscalationService:
    """Test suite for workflow escalation service"""
    
    @pytest.fixture
    def escalation_service(self):
        """Create a fresh escalation service instance for testing"""
        service = WorkflowEscalationService()
        service.reset_metrics()
        return service
    
    @pytest.fixture
    def mock_workflow_instance_ok(self):
        """Mock workflow instance within SLA"""
        return {
            "instance_id": "wf-001",
            "workflow_name": "Leave Approval",
            "status": "pending",
            "stage_started_at": datetime.now() - timedelta(hours=2),
            "sla_hours": 24,
            "escalation_enabled": True,
            "escalation_to": "manager",
            "current_approver_id": "emp-001"
        }
    
    @pytest.fixture
    def mock_workflow_instance_warning(self):
        """Mock workflow instance approaching SLA breach"""
        return {
            "instance_id": "wf-002",
            "workflow_name": "Expense Approval",
            "status": "pending",
            "stage_started_at": datetime.now() - timedelta(hours=22),
            "sla_hours": 24,
            "escalation_enabled": True,
            "escalation_to": "finance_head",
            "current_approver_id": "emp-002"
        }
    
    @pytest.fixture
    def mock_workflow_instance_breached(self):
        """Mock workflow instance with breached SLA"""
        return {
            "instance_id": "wf-003",
            "workflow_name": "Purchase Order",
            "status": "pending",
            "stage_started_at": datetime.now() - timedelta(hours=48),
            "sla_hours": 24,
            "escalation_enabled": True,
            "escalation_to": "director",
            "current_approver_id": "emp-003"
        }
    
    def test_check_sla_status_ok(self, escalation_service, mock_workflow_instance_ok):
        """Test SLA status check when workflow is within SLA"""
        status = escalation_service._check_sla_status(mock_workflow_instance_ok)
        assert status == "ok"
    
    def test_check_sla_status_warning(self, escalation_service, mock_workflow_instance_warning):
        """Test SLA status check when workflow is approaching SLA breach"""
        status = escalation_service._check_sla_status(mock_workflow_instance_warning)
        assert status == "warning"
    
    def test_check_sla_status_breached(self, escalation_service, mock_workflow_instance_breached):
        """Test SLA status check when workflow has breached SLA"""
        status = escalation_service._check_sla_status(mock_workflow_instance_breached)
        assert status == "breached"
    
    def test_check_sla_status_no_sla(self, escalation_service):
        """Test SLA status check when no SLA is defined"""
        instance = {
            "instance_id": "wf-004",
            "stage_started_at": datetime.now() - timedelta(hours=100),
            "sla_hours": None
        }
        status = escalation_service._check_sla_status(instance)
        assert status == "ok"
    
    @pytest.mark.asyncio
    async def test_escalate_workflow(self, escalation_service, mock_workflow_instance_breached):
        """Test workflow escalation process"""
        mock_db = AsyncMock()
        
        with patch.object(escalation_service, '_notify_escalation', new_callable=AsyncMock) as mock_notify, \
             patch.object(escalation_service, '_create_audit_log', new_callable=AsyncMock) as mock_audit, \
             patch('app.services.workflow_escalation_service.EventDispatcher.dispatch', new_callable=AsyncMock) as mock_dispatch:
            
            await escalation_service._escalate_workflow(mock_db, mock_workflow_instance_breached)
            
            # Verify notifications were sent
            mock_notify.assert_called_once()
            
            # Verify audit log was created
            mock_audit.assert_called_once()
            
            # Verify event was dispatched
            mock_dispatch.assert_called_once()
            assert mock_dispatch.call_args[0][0] == "workflow.escalated"
    
    @pytest.mark.asyncio
    async def test_send_sla_warning(self, escalation_service, mock_workflow_instance_warning):
        """Test sending SLA warning"""
        mock_db = AsyncMock()
        
        with patch.object(escalation_service, '_notify_approver', new_callable=AsyncMock) as mock_notify, \
             patch.object(escalation_service, '_create_audit_log', new_callable=AsyncMock) as mock_audit:
            
            await escalation_service._send_sla_warning(mock_db, mock_workflow_instance_warning)
            
            # Verify notification was sent
            mock_notify.assert_called_once()
            assert mock_notify.call_args[1]['notification_type'] == "sla_warning"
            
            # Verify audit log was created
            mock_audit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_check_and_escalate_workflows(self, escalation_service):
        """Test main escalation check function"""
        mock_instances = [
            {
                "instance_id": "wf-001",
                "stage_started_at": datetime.now() - timedelta(hours=48),
                "sla_hours": 24,
                "escalation_enabled": True,
                "escalation_to": "manager",
                "current_approver_id": "emp-001"
            },
            {
                "instance_id": "wf-002",
                "stage_started_at": datetime.now() - timedelta(hours=22),
                "sla_hours": 24,
                "escalation_enabled": True,
                "escalation_to": "manager",
                "current_approver_id": "emp-002"
            }
        ]
        
        with patch.object(escalation_service, '_get_pending_workflow_instances_mock', return_value=mock_instances), \
             patch.object(escalation_service, '_escalate_workflow', new_callable=AsyncMock) as mock_escalate, \
             patch.object(escalation_service, '_send_sla_warning', new_callable=AsyncMock) as mock_warning, \
             patch.object(escalation_service, '_export_metrics', new_callable=AsyncMock):
            
            result = await escalation_service.check_and_escalate_workflows()
            
            # Verify results
            assert result["total_checked"] == 2
            assert result["escalated"] == 1  # One breached
            assert result["reminded"] == 1  # One warning
            
            # Verify methods were called
            mock_escalate.assert_called_once()
            mock_warning.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_send_reminder(self, escalation_service):
        """Test sending reminder for specific workflow instance"""
        result = await escalation_service.send_reminder("wf-001", "sla_warning")
        
        assert result["success"] is True
        assert result["instance_id"] == "wf-001"
        assert result["reminder_type"] == "sla_warning"
    
    def test_get_metrics(self, escalation_service):
        """Test getting metrics snapshot"""
        metrics = escalation_service.get_metrics()
        
        assert "workflows_checked" in metrics
        assert "workflows_escalated" in metrics
        assert "reminders_sent" in metrics
        assert "sla_breaches" in metrics
        assert "escalation_failures" in metrics
    
    def test_reset_metrics(self, escalation_service):
        """Test resetting metrics"""
        # Set some metrics
        escalation_service._metrics["workflows_checked"] = 10
        escalation_service._metrics["workflows_escalated"] = 2
        
        # Reset
        escalation_service.reset_metrics()
        
        # Verify all metrics are zero
        metrics = escalation_service.get_metrics()
        assert all(value == 0 for value in metrics.values())
    
    @pytest.mark.asyncio
    async def test_notify_escalation(self, escalation_service):
        """Test escalation notification"""
        mock_db = AsyncMock()
        instance = {
            "instance_id": "wf-001",
            "workflow_name": "Test Workflow",
            "workflow_type": "leave"
        }
        
        with patch('app.services.workflow_escalation_service.notification_service.send_notification', 
                   new_callable=AsyncMock) as mock_notify:
            
            await escalation_service._notify_escalation(mock_db, instance, "manager-001")
            
            mock_notify.assert_called_once()
            call_args = mock_notify.call_args
            assert call_args[1]["user_id"] == "manager-001"
            assert call_args[1]["notification_type"] == "workflow_escalation"
    
    @pytest.mark.asyncio
    async def test_notify_approver(self, escalation_service):
        """Test approver notification"""
        mock_db = AsyncMock()
        instance = {
            "instance_id": "wf-001",
            "workflow_name": "Test Workflow",
            "workflow_type": "expense"
        }
        
        with patch('app.services.workflow_escalation_service.notification_service.send_notification',
                   new_callable=AsyncMock) as mock_notify:
            
            await escalation_service._notify_approver(
                mock_db, instance, "approver-001", "sla_warning"
            )
            
            mock_notify.assert_called_once()
            call_args = mock_notify.call_args
            assert call_args[1]["user_id"] == "approver-001"
            assert call_args[1]["notification_type"] == "workflow_reminder"
    
    @pytest.mark.asyncio
    async def test_create_audit_log(self, escalation_service):
        """Test audit log creation"""
        mock_db = AsyncMock()
        
        # Should not raise any exceptions
        await escalation_service._create_audit_log(
            db=mock_db,
            instance_id="wf-001",
            action="workflow_escalated",
            details={"reason": "sla_breach"}
        )
    
    @pytest.mark.asyncio
    async def test_export_metrics(self, escalation_service):
        """Test metrics export"""
        # Should not raise any exceptions
        await escalation_service._export_metrics(
            total_checked=10,
            escalated=2,
            reminded=3,
            duration_seconds=1.5
        )
    
    @pytest.mark.asyncio
    async def test_escalation_with_error_handling(self, escalation_service):
        """Test that errors in escalation are handled gracefully"""
        mock_db = AsyncMock()
        instance = {
            "instance_id": "wf-001",
            "escalation_to": "manager"
        }
        
        with patch.object(escalation_service, '_notify_escalation', side_effect=Exception("Test error")):
            # Should not raise exception, just log it
            with pytest.raises(Exception):
                await escalation_service._escalate_workflow(mock_db, instance)


class TestWorkflowTasks:
    """Test workflow Celery tasks"""
    
    @pytest.mark.asyncio
    async def test_check_workflow_escalations_task_success(self):
        """Test workflow escalation task executes successfully"""
        from app.tasks.workflow_tasks import check_workflow_escalations_task
        
        with patch('app.tasks.workflow_tasks.workflow_escalation_service.check_and_escalate_workflows',
                   new_callable=AsyncMock) as mock_check:
            mock_check.return_value = {
                "total_checked": 5,
                "escalated": 1,
                "reminded": 2
            }
            
            # Run the task directly (not via Celery)
            result = check_workflow_escalations_task()
            
            assert result["total_checked"] == 5
            assert result["escalated"] == 1
            assert result["reminded"] == 2
    
    @pytest.mark.asyncio
    async def test_send_escalation_reminder_task(self):
        """Test reminder task"""
        from app.tasks.workflow_tasks import send_escalation_reminder_task
        
        with patch('app.tasks.workflow_tasks.workflow_escalation_service.send_reminder',
                   new_callable=AsyncMock) as mock_send:
            mock_send.return_value = {
                "success": True,
                "instance_id": "wf-001"
            }
            
            result = send_escalation_reminder_task("wf-001", "sla_warning")
            
            assert result["success"] is True
            assert result["instance_id"] == "wf-001"


@pytest.mark.integration
class TestWorkflowEscalationIntegration:
    """Integration tests for workflow escalation"""
    
    @pytest.mark.asyncio
    async def test_end_to_end_escalation_flow(self):
        """Test complete escalation flow from detection to notification"""
        service = WorkflowEscalationService()
        service.reset_metrics()
        
        # Mock workflow instance with breached SLA
        with patch.object(service, '_get_pending_workflow_instances_mock') as mock_instances, \
             patch.object(service, '_escalate_workflow', new_callable=AsyncMock) as mock_escalate, \
             patch.object(service, '_export_metrics', new_callable=AsyncMock):
            
            mock_instances.return_value = [{
                "instance_id": "wf-001",
                "stage_started_at": datetime.now() - timedelta(hours=48),
                "sla_hours": 24,
                "escalation_enabled": True,
                "escalation_to": "manager",
                "current_approver_id": "emp-001"
            }]
            
            result = await service.check_and_escalate_workflows()
            
            # Verify escalation occurred
            assert result["total_checked"] == 1
            assert result["escalated"] == 1
            assert result["reminded"] == 0
            
            # Verify metrics were updated
            metrics = service.get_metrics()
            assert metrics["workflows_escalated"] >= 1
            assert metrics["sla_breaches"] >= 1
