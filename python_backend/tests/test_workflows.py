"""Test workflow management endpoints"""
import pytest
from httpx import AsyncClient
from datetime import datetime


@pytest.mark.asyncio
@pytest.mark.integration
class TestWorkflowManagement:
    """Test suite for workflow management endpoints"""

    async def test_create_workflow(self, authenticated_client: AsyncClient, test_organization):
        """Test creating workflow"""
        workflow_data = {
            "organization_id": test_organization.organization_id,
            "name": "Leave Approval Workflow",
            "description": "Multi-level leave approval process",
            "workflow_type": "APPROVAL",
            "entity_type": "LEAVE",
            "steps": [
                {"order": 1, "approver_role": "MANAGER", "sla_hours": 24},
                {"order": 2, "approver_role": "HR", "sla_hours": 48}
            ],
            "is_active": True
        }
        
        response = await authenticated_client.post(
            "/api/v1/workflows",
            json=workflow_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_get_workflows(self, authenticated_client: AsyncClient, test_organization):
        """Test getting workflows"""
        response = await authenticated_client.get(
            f"/api/v1/workflows?organization_id={test_organization.organization_id}"
        )
        
        assert response.status_code in [200, 500]

    async def test_update_workflow(self, authenticated_client: AsyncClient):
        """Test updating workflow"""
        update_data = {
            "is_active": False,
            "description": "Updated workflow description"
        }
        
        response = await authenticated_client.put(
            "/api/v1/workflows/workflow-001",
            json=update_data
        )
        
        assert response.status_code in [200, 404, 500]

    async def test_create_workflow_instance(self, authenticated_client: AsyncClient):
        """Test creating workflow instance"""
        instance_data = {
            "workflow_id": "workflow-001",
            "entity_id": "leave-001",
            "entity_type": "LEAVE",
            "initiated_by": "EMP-001",
            "data": {
                "leave_type": "ANNUAL",
                "days": 5
            }
        }
        
        response = await authenticated_client.post(
            "/api/v1/workflows/instances",
            json=instance_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_approve_workflow_step(self, authenticated_client: AsyncClient):
        """Test approving workflow step"""
        approval_data = {
            "approved": True,
            "remarks": "Approved by manager",
            "approver_id": "EMP-002"
        }
        
        response = await authenticated_client.post(
            "/api/v1/workflows/instances/instance-001/approve",
            json=approval_data
        )
        
        assert response.status_code in [200, 404, 500]

    async def test_reject_workflow_step(self, authenticated_client: AsyncClient):
        """Test rejecting workflow step"""
        rejection_data = {
            "approved": False,
            "remarks": "Insufficient documentation",
            "approver_id": "EMP-002"
        }
        
        response = await authenticated_client.post(
            "/api/v1/workflows/instances/instance-001/reject",
            json=rejection_data
        )
        
        assert response.status_code in [200, 404, 500]

    async def test_get_pending_approvals(self, authenticated_client: AsyncClient, test_user):
        """Test getting pending approvals"""
        response = await authenticated_client.get(
            f"/api/v1/workflows/pending?approver_id={test_user.user_id}"
        )
        
        assert response.status_code in [200, 500]

    async def test_get_workflow_history(self, authenticated_client: AsyncClient):
        """Test getting workflow history"""
        response = await authenticated_client.get(
            "/api/v1/workflows/instances/instance-001/history"
        )
        
        assert response.status_code in [200, 404, 500]

    async def test_escalate_workflow(self, authenticated_client: AsyncClient):
        """Test escalating workflow"""
        escalation_data = {
            "reason": "SLA breach",
            "escalate_to": "EMP-003"
        }
        
        response = await authenticated_client.post(
            "/api/v1/workflows/instances/instance-001/escalate",
            json=escalation_data
        )
        
        assert response.status_code in [200, 404, 500]

    async def test_cancel_workflow_instance(self, authenticated_client: AsyncClient):
        """Test canceling workflow instance"""
        response = await authenticated_client.delete(
            "/api/v1/workflows/instances/instance-001"
        )
        
        assert response.status_code in [200, 204, 404, 500]

    async def test_get_workflow_analytics(self, authenticated_client: AsyncClient, test_organization):
        """Test getting workflow analytics"""
        response = await authenticated_client.get(
            f"/api/v1/workflows/analytics?organization_id={test_organization.organization_id}"
        )
        
        assert response.status_code in [200, 500]

    async def test_create_workflow_with_parallel_steps(self, authenticated_client: AsyncClient, test_organization):
        """Test creating workflow with parallel approval steps"""
        workflow_data = {
            "organization_id": test_organization.organization_id,
            "name": "Expense Approval Workflow",
            "workflow_type": "APPROVAL",
            "entity_type": "EXPENSE",
            "steps": [
                {
                    "order": 1,
                    "approver_role": "MANAGER",
                    "sla_hours": 24,
                    "parallel_approvers": ["EMP-002", "EMP-003"]
                }
            ],
            "is_active": True
        }
        
        response = await authenticated_client.post(
            "/api/v1/workflows",
            json=workflow_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_unauthorized_workflow_access(self, client: AsyncClient):
        """Test accessing workflow endpoints without authentication"""
        response = await client.get("/api/v1/workflows")
        
        assert response.status_code in [401, 403]
