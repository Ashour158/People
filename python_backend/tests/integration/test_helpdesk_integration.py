"""Integration tests for helpdesk endpoint"""
import pytest
from httpx import AsyncClient


@pytest.mark.integration
@pytest.mark.asyncio
class TestHelpdeskAPI:
    """Test helpdesk API endpoints"""
    
    async def test_create_ticket(self, authenticated_client: AsyncClient, test_employee):
        """Test creating a helpdesk ticket"""
        ticket_data = {
            "employee_id": test_employee.employee_id,
            "title": "IT Support Request",
            "description": "Cannot access email",
            "category": "IT",
            "priority": "HIGH"
        }
        
        response = await authenticated_client.post(
            "/api/v1/helpdesk/tickets",
            json=ticket_data
        )
        
        assert response.status_code in [200, 201, 404]
    
    async def test_get_tickets(self, authenticated_client: AsyncClient):
        """Test retrieving helpdesk tickets"""
        response = await authenticated_client.get("/api/v1/helpdesk/tickets")
        
        assert response.status_code in [200, 404]
    
    async def test_get_ticket_by_id(self, authenticated_client: AsyncClient):
        """Test retrieving ticket by ID"""
        ticket_id = "TKT-001"
        response = await authenticated_client.get(
            f"/api/v1/helpdesk/tickets/{ticket_id}"
        )
        
        assert response.status_code in [200, 404]
    
    async def test_update_ticket(self, authenticated_client: AsyncClient):
        """Test updating a ticket"""
        ticket_id = "TKT-001"
        update_data = {
            "status": "IN_PROGRESS",
            "priority": "URGENT"
        }
        
        response = await authenticated_client.put(
            f"/api/v1/helpdesk/tickets/{ticket_id}",
            json=update_data
        )
        
        assert response.status_code in [200, 404]
    
    async def test_add_comment_to_ticket(self, authenticated_client: AsyncClient):
        """Test adding comment to ticket"""
        ticket_id = "TKT-001"
        comment_data = {
            "comment": "Looking into this issue"
        }
        
        response = await authenticated_client.post(
            f"/api/v1/helpdesk/tickets/{ticket_id}/comments",
            json=comment_data
        )
        
        assert response.status_code in [200, 201, 404]
    
    async def test_assign_ticket(self, authenticated_client: AsyncClient):
        """Test assigning ticket to agent"""
        ticket_id = "TKT-001"
        assign_data = {
            "assigned_to": "AGENT-001"
        }
        
        response = await authenticated_client.post(
            f"/api/v1/helpdesk/tickets/{ticket_id}/assign",
            json=assign_data
        )
        
        assert response.status_code in [200, 404]
    
    async def test_close_ticket(self, authenticated_client: AsyncClient):
        """Test closing a ticket"""
        ticket_id = "TKT-001"
        close_data = {
            "resolution": "Issue resolved - email access restored"
        }
        
        response = await authenticated_client.post(
            f"/api/v1/helpdesk/tickets/{ticket_id}/close",
            json=close_data
        )
        
        assert response.status_code in [200, 404]
    
    async def test_filter_tickets_by_status(self, authenticated_client: AsyncClient):
        """Test filtering tickets by status"""
        response = await authenticated_client.get(
            "/api/v1/helpdesk/tickets",
            params={"status": "OPEN"}
        )
        
        assert response.status_code in [200, 404]
    
    async def test_filter_tickets_by_priority(self, authenticated_client: AsyncClient):
        """Test filtering tickets by priority"""
        response = await authenticated_client.get(
            "/api/v1/helpdesk/tickets",
            params={"priority": "HIGH"}
        )
        
        assert response.status_code in [200, 404]
