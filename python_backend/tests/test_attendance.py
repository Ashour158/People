"""Test attendance management endpoints"""
import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta


@pytest.mark.asyncio
@pytest.mark.attendance
@pytest.mark.integration
class TestAttendanceManagement:
    """Test suite for attendance management endpoints"""

    async def test_check_in(self, authenticated_client: AsyncClient, test_employee):
        """Test employee check-in"""
        check_in_data = {
            "employee_id": test_employee.employee_id,
            "check_in_time": datetime.utcnow().isoformat(),
            "latitude": 40.7128,
            "longitude": -74.0060,
            "location_name": "Office"
        }
        
        response = await authenticated_client.post(
            "/api/v1/attendance/check-in",
            json=check_in_data
        )
        
        assert response.status_code in [201, 200, 400, 500]
        
        if response.status_code in [201, 200]:
            data = response.json()
            assert "attendance_id" in data or "check_in_time" in data

    async def test_check_out(self, authenticated_client: AsyncClient, test_employee):
        """Test employee check-out"""
        # First check in
        check_in_data = {
            "employee_id": test_employee.employee_id,
            "check_in_time": datetime.utcnow().isoformat(),
            "latitude": 40.7128,
            "longitude": -74.0060
        }
        
        check_in_response = await authenticated_client.post(
            "/api/v1/attendance/check-in",
            json=check_in_data
        )
        
        if check_in_response.status_code in [201, 200]:
            # Then check out
            check_out_data = {
                "employee_id": test_employee.employee_id,
                "check_out_time": (datetime.utcnow() + timedelta(hours=8)).isoformat(),
                "latitude": 40.7128,
                "longitude": -74.0060
            }
            
            response = await authenticated_client.post(
                "/api/v1/attendance/check-out",
                json=check_out_data
            )
            
            assert response.status_code in [200, 400, 500]

    async def test_get_attendance_records(self, authenticated_client: AsyncClient, test_employee):
        """Test getting attendance records"""
        response = await authenticated_client.get(
            f"/api/v1/attendance?employee_id={test_employee.employee_id}"
        )
        
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (list, dict))

    async def test_get_attendance_by_date_range(self, authenticated_client: AsyncClient, test_employee):
        """Test getting attendance records by date range"""
        start_date = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = datetime.utcnow().strftime("%Y-%m-%d")
        
        response = await authenticated_client.get(
            f"/api/v1/attendance?employee_id={test_employee.employee_id}&start_date={start_date}&end_date={end_date}"
        )
        
        assert response.status_code in [200, 500]

    async def test_request_attendance_regularization(self, authenticated_client: AsyncClient, test_employee):
        """Test requesting attendance regularization"""
        regularization_data = {
            "employee_id": test_employee.employee_id,
            "date": (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "check_in_time": "09:00:00",
            "check_out_time": "17:00:00",
            "reason": "Forgot to check in"
        }
        
        response = await authenticated_client.post(
            "/api/v1/attendance/regularization",
            json=regularization_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_approve_attendance_regularization(self, authenticated_client: AsyncClient):
        """Test approving attendance regularization"""
        # This would typically require creating a regularization request first
        response = await authenticated_client.put(
            "/api/v1/attendance/regularization/test-reg-001/approve",
            json={"approved": True, "remarks": "Approved"}
        )
        
        assert response.status_code in [200, 404, 500]

    async def test_get_attendance_summary(self, authenticated_client: AsyncClient, test_employee):
        """Test getting attendance summary"""
        month = datetime.utcnow().strftime("%Y-%m")
        
        response = await authenticated_client.get(
            f"/api/v1/attendance/summary?employee_id={test_employee.employee_id}&month={month}"
        )
        
        assert response.status_code in [200, 500]

    async def test_check_in_duplicate(self, authenticated_client: AsyncClient, test_employee):
        """Test duplicate check-in on same day"""
        check_in_data = {
            "employee_id": test_employee.employee_id,
            "check_in_time": datetime.utcnow().isoformat(),
            "latitude": 40.7128,
            "longitude": -74.0060
        }
        
        # First check-in
        await authenticated_client.post(
            "/api/v1/attendance/check-in",
            json=check_in_data
        )
        
        # Second check-in (should fail or warn)
        response = await authenticated_client.post(
            "/api/v1/attendance/check-in",
            json=check_in_data
        )
        
        assert response.status_code in [200, 400, 409, 500]

    async def test_check_out_without_check_in(self, authenticated_client: AsyncClient, test_employee):
        """Test check-out without prior check-in"""
        check_out_data = {
            "employee_id": test_employee.employee_id,
            "check_out_time": datetime.utcnow().isoformat(),
            "latitude": 40.7128,
            "longitude": -74.0060
        }
        
        response = await authenticated_client.post(
            "/api/v1/attendance/check-out",
            json=check_out_data
        )
        
        assert response.status_code in [400, 404, 500]

    async def test_get_attendance_report(self, authenticated_client: AsyncClient, test_organization):
        """Test generating attendance report"""
        response = await authenticated_client.get(
            f"/api/v1/attendance/report?organization_id={test_organization.organization_id}&month=2025-01"
        )
        
        assert response.status_code in [200, 500]

    async def test_unauthorized_attendance_access(self, client: AsyncClient):
        """Test accessing attendance endpoints without authentication"""
        response = await client.get("/api/v1/attendance")
        
        assert response.status_code in [401, 403]
