"""
Attendance management tests for HR Management System
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Employee, Attendance
from datetime import datetime, date


@pytest.mark.attendance
class TestAttendanceManagement:
    """Test attendance management endpoints"""
    
    async def test_check_in(self, authenticated_client: AsyncClient, test_employee: Employee):
        """Test employee check-in"""
        checkin_data = {
            "employee_id": str(test_employee.employee_id),
            "check_in_time": datetime.now().isoformat(),
            "location": "Office",
            "notes": "Regular check-in"
        }
        
        response = await authenticated_client.post("/attendance/check-in", json=checkin_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "message" in data
    
    async def test_check_in_duplicate(self, authenticated_client: AsyncClient, test_employee: Employee):
        """Test duplicate check-in"""
        # First check-in
        checkin_data = {
            "employee_id": str(test_employee.employee_id),
            "check_in_time": datetime.now().isoformat(),
            "location": "Office"
        }
        
        response1 = await authenticated_client.post("/attendance/check-in", json=checkin_data)
        assert response1.status_code == 200
        
        # Duplicate check-in
        response2 = await authenticated_client.post("/attendance/check-in", json=checkin_data)
        assert response2.status_code == 400
        
        data = response2.json()
        assert "already checked in" in data["detail"].lower()
    
    async def test_check_out(self, authenticated_client: AsyncClient, test_employee: Employee):
        """Test employee check-out"""
        # First check-in
        checkin_data = {
            "employee_id": str(test_employee.employee_id),
            "check_in_time": datetime.now().isoformat(),
            "location": "Office"
        }
        
        await authenticated_client.post("/attendance/check-in", json=checkin_data)
        
        # Then check-out
        checkout_data = {
            "employee_id": str(test_employee.employee_id),
            "check_out_time": datetime.now().isoformat(),
            "notes": "Regular check-out"
        }
        
        response = await authenticated_client.post("/attendance/check-out", json=checkout_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
    
    async def test_check_out_without_checkin(self, authenticated_client: AsyncClient, test_employee: Employee):
        """Test check-out without check-in"""
        checkout_data = {
            "employee_id": str(test_employee.employee_id),
            "check_out_time": datetime.now().isoformat()
        }
        
        response = await authenticated_client.post("/attendance/check-out", json=checkout_data)
        assert response.status_code == 400
        
        data = response.json()
        assert "not checked in" in data["detail"].lower()
    
    async def test_get_attendance_records(self, authenticated_client: AsyncClient, test_employee: Employee):
        """Test get attendance records"""
        response = await authenticated_client.get(f"/attendance/employee/{test_employee.employee_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)
    
    async def test_get_attendance_with_date_range(self, authenticated_client: AsyncClient, test_employee: Employee):
        """Test get attendance with date range"""
        start_date = date.today().isoformat()
        end_date = date.today().isoformat()
        
        response = await authenticated_client.get(
            f"/attendance/employee/{test_employee.employee_id}?start_date={start_date}&end_date={end_date}"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
    
    async def test_request_regularization(self, authenticated_client: AsyncClient, test_employee: Employee):
        """Test request attendance regularization"""
        regularization_data = {
            "employee_id": str(test_employee.employee_id),
            "date": date.today().isoformat(),
            "requested_check_in": "09:00",
            "requested_check_out": "18:00",
            "reason": "Forgot to check in"
        }
        
        response = await authenticated_client.post("/attendance/regularization", json=regularization_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
    
    async def test_approve_regularization(self, authenticated_client: AsyncClient, test_employee: Employee):
        """Test approve attendance regularization"""
        # First create a regularization request
        regularization_data = {
            "employee_id": str(test_employee.employee_id),
            "date": date.today().isoformat(),
            "requested_check_in": "09:00",
            "requested_check_out": "18:00",
            "reason": "Forgot to check in"
        }
        
        await authenticated_client.post("/attendance/regularization", json=regularization_data)
        
        # Approve the request
        approval_data = {
            "regularization_id": "123",  # This would be the actual ID in real scenario
            "status": "approved",
            "notes": "Approved by manager"
        }
        
        response = await authenticated_client.post("/attendance/regularization/approve", json=approval_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
    
    async def test_get_attendance_summary(self, authenticated_client: AsyncClient, test_employee: Employee):
        """Test get attendance summary"""
        response = await authenticated_client.get(f"/attendance/summary/{test_employee.employee_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_hours" in data
        assert "present_days" in data
        assert "absent_days" in data
    
    async def test_get_attendance_reports(self, authenticated_client: AsyncClient):
        """Test get attendance reports"""
        response = await authenticated_client.get("/attendance/reports")
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)
    
    async def test_attendance_unauthorized_access(self, client: AsyncClient):
        """Test attendance endpoints without authentication"""
        response = await client.get("/attendance/employee/123")
        assert response.status_code == 401
        
        response = await client.post("/attendance/check-in", json={})
        assert response.status_code == 401