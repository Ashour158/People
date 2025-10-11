"""
Employee management tests for HR Management System
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Employee, User, Organization


@pytest.mark.employee
class TestEmployeeManagement:
    """Test employee management endpoints"""
    
    async def test_list_employees(self, authenticated_client: AsyncClient):
        """Test list employees endpoint"""
        response = await authenticated_client.get("/employees")
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        assert isinstance(data["data"], list)
    
    async def test_list_employees_with_pagination(self, authenticated_client: AsyncClient):
        """Test list employees with pagination"""
        response = await authenticated_client.get("/employees?page=1&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert "pagination" in data
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["limit"] == 5
    
    async def test_list_employees_with_search(self, authenticated_client: AsyncClient):
        """Test list employees with search"""
        response = await authenticated_client.get("/employees?search=test")
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
    
    async def test_list_employees_with_filters(self, authenticated_client: AsyncClient):
        """Test list employees with filters"""
        response = await authenticated_client.get("/employees?department_id=123&status=active")
        assert response.status_code == 200
        
        data = response.json()
        assert "data" in data
    
    async def test_get_employee_by_id(self, authenticated_client: AsyncClient, test_employee: Employee):
        """Test get employee by ID"""
        response = await authenticated_client.get(f"/employees/{test_employee.employee_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["employee_id"] == str(test_employee.employee_id)
        assert "first_name" in data
        assert "last_name" in data
    
    async def test_get_employee_not_found(self, authenticated_client: AsyncClient):
        """Test get employee with invalid ID"""
        response = await authenticated_client.get("/employees/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 404
        
        data = response.json()
        assert "Employee not found" in data["detail"]
    
    async def test_create_employee(self, authenticated_client: AsyncClient):
        """Test create employee"""
        employee_data = {
            "employee_code": "EMP001",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "phone": "+1234567890",
            "job_title": "Software Engineer",
            "employment_type": "full_time",
            "hire_date": "2024-01-01"
        }
        
        response = await authenticated_client.post("/employees", json=employee_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["success"] is True
        assert "message" in data
    
    async def test_create_employee_duplicate_email(self, authenticated_client: AsyncClient, test_employee: Employee):
        """Test create employee with duplicate email"""
        employee_data = {
            "employee_code": "EMP002",
            "first_name": "Jane",
            "last_name": "Smith",
            "email": test_employee.user.email,
            "phone": "+1234567890",
            "job_title": "Designer"
        }
        
        response = await authenticated_client.post("/employees", json=employee_data)
        assert response.status_code == 400
        
        data = response.json()
        assert "Email already exists" in data["detail"]
    
    async def test_create_employee_missing_fields(self, authenticated_client: AsyncClient):
        """Test create employee with missing required fields"""
        employee_data = {
            "first_name": "John"
            # Missing required fields
        }
        
        response = await authenticated_client.post("/employees", json=employee_data)
        assert response.status_code == 422
    
    async def test_update_employee(self, authenticated_client: AsyncClient, test_employee: Employee):
        """Test update employee"""
        update_data = {
            "first_name": "Updated Name",
            "job_title": "Senior Software Engineer"
        }
        
        response = await authenticated_client.put(f"/employees/{test_employee.employee_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
    
    async def test_update_employee_not_found(self, authenticated_client: AsyncClient):
        """Test update employee with invalid ID"""
        update_data = {"first_name": "Updated Name"}
        
        response = await authenticated_client.put("/employees/00000000-0000-0000-0000-000000000000", json=update_data)
        assert response.status_code == 404
    
    async def test_delete_employee(self, authenticated_client: AsyncClient, test_employee: Employee):
        """Test delete employee (soft delete)"""
        response = await authenticated_client.delete(f"/employees/{test_employee.employee_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
    
    async def test_delete_employee_not_found(self, authenticated_client: AsyncClient):
        """Test delete employee with invalid ID"""
        response = await authenticated_client.delete("/employees/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 404
    
    async def test_employee_unauthorized_access(self, client: AsyncClient):
        """Test employee endpoints without authentication"""
        response = await client.get("/employees")
        assert response.status_code == 401
        
        response = await client.post("/employees", json={})
        assert response.status_code == 401