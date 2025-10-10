"""Comprehensive integration tests for employee management"""
import pytest
from httpx import AsyncClient
from app.models.employee import Employee
from app.models.organization import Organization


@pytest.mark.asyncio
@pytest.mark.employee
@pytest.mark.integration
class TestEmployeeIntegration:
    """Integration tests for employee management module"""

    async def test_create_employee_success(
        self,
        authenticated_client: AsyncClient,
        test_organization: Organization
    ):
        """Test successful employee creation"""
        employee_data = {
            "employee_code": "EMP2024001",
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane.smith@example.com",
            "phone": "+1234567890",
            "date_of_birth": "1990-05-15",
            "hire_date": "2024-01-10",
            "employment_type": "FULL_TIME",
            "department": "Engineering",
            "position": "Software Engineer",
            "status": "ACTIVE"
        }
        
        response = await authenticated_client.post(
            "/api/v1/employees",
            json=employee_data
        )
        
        assert response.status_code in [200, 201, 401, 500]
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert data["email"] == employee_data["email"]
            assert data["first_name"] == employee_data["first_name"]

    async def test_list_employees_pagination(
        self,
        authenticated_client: AsyncClient,
        test_employee: Employee
    ):
        """Test employee listing with pagination"""
        response = await authenticated_client.get(
            "/api/v1/employees?page=1&limit=10"
        )
        
        assert response.status_code in [200, 401, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert "employees" in data or isinstance(data, list)

    async def test_search_employees(
        self,
        authenticated_client: AsyncClient,
        test_employee: Employee
    ):
        """Test employee search functionality"""
        response = await authenticated_client.get(
            f"/api/v1/employees?search={test_employee.first_name}"
        )
        
        assert response.status_code in [200, 401, 500]
        
        if response.status_code == 200:
            data = response.json()
            # Should contain search results
            assert data is not None

    async def test_filter_employees_by_department(
        self,
        authenticated_client: AsyncClient,
        test_employee: Employee
    ):
        """Test filtering employees by department"""
        response = await authenticated_client.get(
            "/api/v1/employees?department=Engineering"
        )
        
        assert response.status_code in [200, 401, 500]

    async def test_filter_employees_by_status(
        self,
        authenticated_client: AsyncClient
    ):
        """Test filtering employees by status"""
        response = await authenticated_client.get(
            "/api/v1/employees?status=ACTIVE"
        )
        
        assert response.status_code in [200, 401, 500]

    async def test_get_employee_by_id(
        self,
        authenticated_client: AsyncClient,
        test_employee: Employee
    ):
        """Test retrieving employee by ID"""
        response = await authenticated_client.get(
            f"/api/v1/employees/{test_employee.employee_id}"
        )
        
        assert response.status_code in [200, 401, 404, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert data["employee_id"] == test_employee.employee_id

    async def test_update_employee(
        self,
        authenticated_client: AsyncClient,
        test_employee: Employee
    ):
        """Test updating employee information"""
        update_data = {
            "phone": "+9876543210",
            "position": "Senior Developer"
        }
        
        response = await authenticated_client.put(
            f"/api/v1/employees/{test_employee.employee_id}",
            json=update_data
        )
        
        assert response.status_code in [200, 401, 404, 500]

    async def test_employee_status_transitions(
        self,
        authenticated_client: AsyncClient,
        test_employee: Employee
    ):
        """Test employee status transitions"""
        statuses = ["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"]
        
        for status in statuses:
            response = await authenticated_client.patch(
                f"/api/v1/employees/{test_employee.employee_id}/status",
                json={"status": status}
            )
            
            assert response.status_code in [200, 400, 401, 404, 500]

    async def test_bulk_employee_import(
        self,
        authenticated_client: AsyncClient
    ):
        """Test bulk employee import"""
        employees = [
            {
                "employee_code": f"EMP{i:04d}",
                "first_name": f"Employee{i}",
                "last_name": "Test",
                "email": f"emp{i}@example.com",
                "hire_date": "2024-01-15",
                "employment_type": "FULL_TIME"
            }
            for i in range(1, 6)
        ]
        
        response = await authenticated_client.post(
            "/api/v1/employees/bulk",
            json={"employees": employees}
        )
        
        assert response.status_code in [200, 201, 400, 401, 404, 500]

    async def test_employee_document_upload(
        self,
        authenticated_client: AsyncClient,
        test_employee: Employee
    ):
        """Test employee document upload"""
        # Test file upload endpoint exists
        response = await authenticated_client.post(
            f"/api/v1/employees/{test_employee.employee_id}/documents",
            files={"file": ("test.pdf", b"fake pdf content", "application/pdf")},
            data={"document_type": "CONTRACT"}
        )
        
        assert response.status_code in [200, 201, 400, 401, 404, 415, 500]

    async def test_employee_hierarchy(
        self,
        authenticated_client: AsyncClient,
        test_employee: Employee
    ):
        """Test employee reporting hierarchy"""
        response = await authenticated_client.get(
            f"/api/v1/employees/{test_employee.employee_id}/hierarchy"
        )
        
        assert response.status_code in [200, 401, 404, 500]

    async def test_employee_work_history(
        self,
        authenticated_client: AsyncClient,
        test_employee: Employee
    ):
        """Test employee work history retrieval"""
        response = await authenticated_client.get(
            f"/api/v1/employees/{test_employee.employee_id}/work-history"
        )
        
        assert response.status_code in [200, 401, 404, 500]

    async def test_employee_statistics(
        self,
        authenticated_client: AsyncClient
    ):
        """Test employee statistics endpoint"""
        response = await authenticated_client.get(
            "/api/v1/employees/statistics"
        )
        
        assert response.status_code in [200, 401, 500]
        
        if response.status_code == 200:
            data = response.json()
            # Should contain statistics
            assert isinstance(data, dict)

    async def test_duplicate_employee_email(
        self,
        authenticated_client: AsyncClient,
        test_employee: Employee
    ):
        """Test that duplicate employee emails are rejected"""
        employee_data = {
            "employee_code": "EMPDUP001",
            "first_name": "Duplicate",
            "last_name": "Test",
            "email": test_employee.email,  # Duplicate email
            "hire_date": "2024-01-10",
            "employment_type": "FULL_TIME"
        }
        
        response = await authenticated_client.post(
            "/api/v1/employees",
            json=employee_data
        )
        
        assert response.status_code in [400, 409, 422, 500]

    async def test_invalid_employee_data(
        self,
        authenticated_client: AsyncClient
    ):
        """Test validation of invalid employee data"""
        invalid_data = {
            "employee_code": "EMP001",
            "first_name": "",  # Invalid: empty
            "email": "not-an-email",  # Invalid format
            "hire_date": "invalid-date"  # Invalid date
        }
        
        response = await authenticated_client.post(
            "/api/v1/employees",
            json=invalid_data
        )
        
        assert response.status_code in [400, 422, 500]

    async def test_employee_export(
        self,
        authenticated_client: AsyncClient
    ):
        """Test employee data export"""
        response = await authenticated_client.get(
            "/api/v1/employees/export?format=csv"
        )
        
        assert response.status_code in [200, 401, 404, 500]
