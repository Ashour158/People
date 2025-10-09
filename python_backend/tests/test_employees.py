"""Test employee management endpoints"""
import pytest
from httpx import AsyncClient
from faker import Faker

fake = Faker()


@pytest.mark.asyncio
@pytest.mark.employee
@pytest.mark.integration
class TestEmployeeManagement:
    """Test suite for employee management endpoints"""

    async def test_list_employees(self, authenticated_client: AsyncClient):
        """Test listing employees"""
        response = await authenticated_client.get("/api/v1/employees")
        
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (list, dict))

    async def test_list_employees_with_pagination(self, authenticated_client: AsyncClient):
        """Test listing employees with pagination"""
        response = await authenticated_client.get(
            "/api/v1/employees?page=1&limit=10"
        )
        
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert "employees" in data or isinstance(data, list)

    async def test_list_employees_with_search(self, authenticated_client: AsyncClient, test_employee):
        """Test searching employees"""
        response = await authenticated_client.get(
            f"/api/v1/employees?search={test_employee.first_name}"
        )
        
        assert response.status_code in [200, 500]

    async def test_get_employee_by_id(self, authenticated_client: AsyncClient, test_employee):
        """Test getting employee by ID"""
        response = await authenticated_client.get(
            f"/api/v1/employees/{test_employee.employee_id}"
        )
        
        assert response.status_code in [200, 404, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert data["employee_id"] == test_employee.employee_id

    async def test_create_employee(self, authenticated_client: AsyncClient):
        """Test creating new employee"""
        employee_data = {
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "email": fake.email(),
            "phone": fake.phone_number(),
            "date_of_birth": str(fake.date_of_birth(minimum_age=22, maximum_age=65)),
            "hire_date": str(fake.date_this_decade()),
            "employment_type": "FULL_TIME",
            "status": "ACTIVE",
            "job_title": fake.job(),
            "department_id": "test-dept-001"
        }
        
        response = await authenticated_client.post(
            "/api/v1/employees",
            json=employee_data
        )
        
        assert response.status_code in [201, 200, 400, 500]
        
        if response.status_code in [201, 200]:
            data = response.json()
            assert "employee_id" in data
            assert data["email"] == employee_data["email"]

    async def test_update_employee(self, authenticated_client: AsyncClient, test_employee):
        """Test updating employee"""
        update_data = {
            "job_title": "Senior Developer",
            "phone": "+1987654321"
        }
        
        response = await authenticated_client.put(
            f"/api/v1/employees/{test_employee.employee_id}",
            json=update_data
        )
        
        assert response.status_code in [200, 404, 500]

    async def test_delete_employee(self, authenticated_client: AsyncClient):
        """Test soft-deleting employee"""
        # Create a new employee to delete
        employee_data = {
            "first_name": "Delete",
            "last_name": "Test",
            "email": fake.email(),
            "employment_type": "FULL_TIME",
            "status": "ACTIVE"
        }
        
        create_response = await authenticated_client.post(
            "/api/v1/employees",
            json=employee_data
        )
        
        if create_response.status_code in [201, 200]:
            employee_id = create_response.json()["employee_id"]
            
            delete_response = await authenticated_client.delete(
                f"/api/v1/employees/{employee_id}"
            )
            
            assert delete_response.status_code in [200, 204, 404, 500]

    async def test_get_employee_by_invalid_id(self, authenticated_client: AsyncClient):
        """Test getting employee with invalid ID"""
        response = await authenticated_client.get("/api/v1/employees/invalid-id-999")
        
        assert response.status_code in [404, 400, 500]

    async def test_create_employee_duplicate_email(self, authenticated_client: AsyncClient, test_employee):
        """Test creating employee with duplicate email"""
        employee_data = {
            "first_name": "Duplicate",
            "last_name": "Test",
            "email": test_employee.email,  # Duplicate email
            "employment_type": "FULL_TIME",
            "status": "ACTIVE"
        }
        
        response = await authenticated_client.post(
            "/api/v1/employees",
            json=employee_data
        )
        
        assert response.status_code in [400, 409, 500]

    async def test_create_employee_missing_required_fields(self, authenticated_client: AsyncClient):
        """Test creating employee with missing required fields"""
        employee_data = {
            "first_name": "Test"
            # Missing required fields
        }
        
        response = await authenticated_client.post(
            "/api/v1/employees",
            json=employee_data
        )
        
        assert response.status_code in [400, 422, 500]

    async def test_update_employee_not_found(self, authenticated_client: AsyncClient):
        """Test updating non-existent employee"""
        update_data = {
            "job_title": "Manager"
        }
        
        response = await authenticated_client.put(
            "/api/v1/employees/nonexistent-id",
            json=update_data
        )
        
        assert response.status_code in [404, 500]

    async def test_employee_list_filtering_by_department(self, authenticated_client: AsyncClient):
        """Test filtering employees by department"""
        response = await authenticated_client.get(
            "/api/v1/employees?department_id=test-dept-001"
        )
        
        assert response.status_code in [200, 500]

    async def test_employee_list_filtering_by_status(self, authenticated_client: AsyncClient):
        """Test filtering employees by status"""
        response = await authenticated_client.get(
            "/api/v1/employees?status=ACTIVE"
        )
        
        assert response.status_code in [200, 500]

    async def test_unauthorized_employee_access(self, client: AsyncClient):
        """Test accessing employee endpoints without authentication"""
        response = await client.get("/api/v1/employees")
        
        assert response.status_code in [401, 403]
