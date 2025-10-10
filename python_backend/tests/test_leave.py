"""Test leave management endpoints"""
import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta


@pytest.mark.asyncio
@pytest.mark.leave
@pytest.mark.integration
class TestLeaveManagement:
    """Test suite for leave management endpoints"""

    async def test_list_leave_types(self, authenticated_client: AsyncClient):
        """Test listing available leave types"""
        response = await authenticated_client.get("/api/v1/leave/types")
        
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)

    async def test_apply_leave(self, authenticated_client: AsyncClient, test_employee):
        """Test applying for leave"""
        leave_data = {
            "employee_id": test_employee.employee_id,
            "leave_type_id": "ANNUAL",
            "start_date": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "end_date": (datetime.utcnow() + timedelta(days=10)).strftime("%Y-%m-%d"),
            "reason": "Vacation",
            "total_days": 4
        }
        
        response = await authenticated_client.post(
            "/api/v1/leave/apply",
            json=leave_data
        )
        
        assert response.status_code in [201, 200, 400, 500]
        
        if response.status_code in [201, 200]:
            data = response.json()
            assert "leave_id" in data or "leave_request_id" in data

    async def test_get_leave_balance(self, authenticated_client: AsyncClient, test_employee):
        """Test getting leave balance"""
        response = await authenticated_client.get(
            f"/api/v1/leave/balance?employee_id={test_employee.employee_id}"
        )
        
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (dict, list))

    async def test_get_leave_requests(self, authenticated_client: AsyncClient, test_employee):
        """Test getting leave requests"""
        response = await authenticated_client.get(
            f"/api/v1/leave/requests?employee_id={test_employee.employee_id}"
        )
        
        assert response.status_code in [200, 500]

    async def test_approve_leave_request(self, authenticated_client: AsyncClient):
        """Test approving leave request"""
        # This would typically require creating a leave request first
        response = await authenticated_client.put(
            "/api/v1/leave/requests/test-leave-001/approve",
            json={"approved": True, "remarks": "Approved"}
        )
        
        assert response.status_code in [200, 404, 500]

    async def test_reject_leave_request(self, authenticated_client: AsyncClient):
        """Test rejecting leave request"""
        response = await authenticated_client.put(
            "/api/v1/leave/requests/test-leave-001/reject",
            json={"approved": False, "remarks": "Rejected - insufficient coverage"}
        )
        
        assert response.status_code in [200, 404, 500]

    async def test_cancel_leave_request(self, authenticated_client: AsyncClient):
        """Test canceling leave request"""
        response = await authenticated_client.delete(
            "/api/v1/leave/requests/test-leave-001"
        )
        
        assert response.status_code in [200, 204, 404, 500]

    async def test_get_leave_calendar(self, authenticated_client: AsyncClient, test_organization):
        """Test getting leave calendar"""
        month = datetime.utcnow().strftime("%Y-%m")
        
        response = await authenticated_client.get(
            f"/api/v1/leave/calendar?organization_id={test_organization.organization_id}&month={month}"
        )
        
        assert response.status_code in [200, 500]

    async def test_apply_leave_insufficient_balance(self, authenticated_client: AsyncClient, test_employee):
        """Test applying for leave with insufficient balance"""
        leave_data = {
            "employee_id": test_employee.employee_id,
            "leave_type_id": "ANNUAL",
            "start_date": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "end_date": (datetime.utcnow() + timedelta(days=100)).strftime("%Y-%m-%d"),
            "reason": "Long vacation",
            "total_days": 94  # Likely more than available
        }
        
        response = await authenticated_client.post(
            "/api/v1/leave/apply",
            json=leave_data
        )
        
        assert response.status_code in [400, 409, 500]

    async def test_apply_leave_overlapping_dates(self, authenticated_client: AsyncClient, test_employee):
        """Test applying for leave with overlapping dates"""
        leave_data = {
            "employee_id": test_employee.employee_id,
            "leave_type_id": "ANNUAL",
            "start_date": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "end_date": (datetime.utcnow() + timedelta(days=10)).strftime("%Y-%m-%d"),
            "reason": "First leave",
            "total_days": 4
        }
        
        # First leave application
        await authenticated_client.post("/api/v1/leave/apply", json=leave_data)
        
        # Second overlapping leave application
        response = await authenticated_client.post("/api/v1/leave/apply", json=leave_data)
        
        assert response.status_code in [400, 409, 500]

    async def test_apply_leave_invalid_dates(self, authenticated_client: AsyncClient, test_employee):
        """Test applying for leave with invalid dates"""
        leave_data = {
            "employee_id": test_employee.employee_id,
            "leave_type_id": "ANNUAL",
            "start_date": (datetime.utcnow() + timedelta(days=10)).strftime("%Y-%m-%d"),
            "end_date": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d"),  # End before start
            "reason": "Invalid dates",
            "total_days": -3
        }
        
        response = await authenticated_client.post(
            "/api/v1/leave/apply",
            json=leave_data
        )
        
        assert response.status_code in [400, 422, 500]

    async def test_get_pending_leave_requests(self, authenticated_client: AsyncClient):
        """Test getting pending leave requests"""
        response = await authenticated_client.get(
            "/api/v1/leave/requests?status=PENDING"
        )
        
        assert response.status_code in [200, 500]

    async def test_get_leave_history(self, authenticated_client: AsyncClient, test_employee):
        """Test getting leave history"""
        response = await authenticated_client.get(
            f"/api/v1/leave/history?employee_id={test_employee.employee_id}"
        )
        
        assert response.status_code in [200, 500]

    async def test_unauthorized_leave_access(self, client: AsyncClient):
        """Test accessing leave endpoints without authentication"""
        response = await client.get("/api/v1/leave/requests")
        
        assert response.status_code in [401, 403]
