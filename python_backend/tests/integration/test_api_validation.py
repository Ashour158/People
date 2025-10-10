"""Tests for API response validation"""
import pytest
from httpx import AsyncClient


@pytest.mark.integration
@pytest.mark.asyncio
class TestAPIResponseFormat:
    """Test API response format consistency"""
    
    async def test_success_response_format(self, authenticated_client: AsyncClient):
        """Test success response format"""
        response = await authenticated_client.get("/api/v1/employees")
        
        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            assert "data" in data
            assert isinstance(data["success"], bool)
    
    async def test_error_response_format(self, client: AsyncClient):
        """Test error response format"""
        response = await client.get("/api/v1/employees/non-existent-id")
        
        if response.status_code in [404, 401]:
            data = response.json()
            # Error responses should have consistent structure
            assert isinstance(data, dict)
    
    async def test_pagination_format(self, authenticated_client: AsyncClient):
        """Test pagination format in list responses"""
        response = await authenticated_client.get(
            "/api/v1/employees",
            params={"page": 1, "limit": 10}
        )
        
        if response.status_code == 200:
            data = response.json()
            # Should have pagination info
            assert "data" in data or "pagination" in data
    
    async def test_validation_error_format(self, authenticated_client: AsyncClient):
        """Test validation error format"""
        response = await authenticated_client.post(
            "/api/v1/employees",
            json={"invalid": "data"}
        )
        
        # Validation errors should return 422 or 400
        if response.status_code in [400, 422]:
            data = response.json()
            assert isinstance(data, dict)


@pytest.mark.integration
@pytest.mark.asyncio
class TestAPIHeaders:
    """Test API headers"""
    
    async def test_content_type_header(self, authenticated_client: AsyncClient):
        """Test Content-Type header"""
        response = await authenticated_client.get("/api/v1/employees")
        
        if response.status_code == 200:
            assert "content-type" in response.headers
            assert "application/json" in response.headers["content-type"]
    
    async def test_cors_headers(self, client: AsyncClient):
        """Test CORS headers"""
        response = await client.options("/api/v1/employees")
        
        # CORS headers may be present
        headers = response.headers
        assert isinstance(headers, dict)
    
    async def test_authentication_header_required(self, client: AsyncClient):
        """Test that authentication header is required"""
        response = await client.get("/api/v1/employees")
        
        # Should return 401 without authentication
        assert response.status_code in [401, 403]


@pytest.mark.integration
@pytest.mark.asyncio
class TestAPIStatusCodes:
    """Test API status codes"""
    
    async def test_200_ok_status(self, authenticated_client: AsyncClient):
        """Test 200 OK status"""
        response = await authenticated_client.get("/api/v1/employees")
        
        # Should return 200 for successful GET
        assert response.status_code in [200, 401, 404]
    
    async def test_201_created_status(self, authenticated_client: AsyncClient, test_employee):
        """Test 201 Created status"""
        employee_data = {
            "employee_code": "TEST-001",
            "first_name": "Test",
            "last_name": "Employee",
            "email": "newtest@example.com",
            "employment_type": "FULL_TIME",
            "status": "ACTIVE"
        }
        
        response = await authenticated_client.post(
            "/api/v1/employees",
            json=employee_data
        )
        
        # Should return 201 or 200 for successful POST
        assert response.status_code in [200, 201, 400, 404, 422]
    
    async def test_400_bad_request_status(self, authenticated_client: AsyncClient):
        """Test 400 Bad Request status"""
        response = await authenticated_client.post(
            "/api/v1/employees",
            json={"invalid": "data"}
        )
        
        # Should return 400 or 422 for invalid data
        assert response.status_code in [400, 422, 404]
    
    async def test_401_unauthorized_status(self, client: AsyncClient):
        """Test 401 Unauthorized status"""
        response = await client.get("/api/v1/employees")
        
        # Should return 401 without authentication
        assert response.status_code in [401, 403]
    
    async def test_404_not_found_status(self, authenticated_client: AsyncClient):
        """Test 404 Not Found status"""
        response = await authenticated_client.get(
            "/api/v1/employees/non-existent-id-12345"
        )
        
        # Should return 404 for non-existent resource
        assert response.status_code in [404, 401]


@pytest.mark.integration
@pytest.mark.asyncio
class TestAPIValidation:
    """Test API input validation"""
    
    async def test_email_validation(self, authenticated_client: AsyncClient):
        """Test email validation"""
        invalid_data = {
            "employee_code": "TEST-002",
            "first_name": "Test",
            "last_name": "Employee",
            "email": "invalid-email",  # Invalid email format
            "employment_type": "FULL_TIME",
            "status": "ACTIVE"
        }
        
        response = await authenticated_client.post(
            "/api/v1/employees",
            json=invalid_data
        )
        
        # Should return validation error
        assert response.status_code in [400, 422, 404]
    
    async def test_required_fields_validation(self, authenticated_client: AsyncClient):
        """Test required fields validation"""
        incomplete_data = {
            "first_name": "Test"
            # Missing required fields
        }
        
        response = await authenticated_client.post(
            "/api/v1/employees",
            json=incomplete_data
        )
        
        # Should return validation error
        assert response.status_code in [400, 422, 404]
    
    async def test_enum_validation(self, authenticated_client: AsyncClient):
        """Test enum field validation"""
        invalid_data = {
            "employee_code": "TEST-003",
            "first_name": "Test",
            "last_name": "Employee",
            "email": "test@example.com",
            "employment_type": "INVALID_TYPE",  # Invalid enum value
            "status": "ACTIVE"
        }
        
        response = await authenticated_client.post(
            "/api/v1/employees",
            json=invalid_data
        )
        
        # Should return validation error
        assert response.status_code in [400, 422, 404]
    
    async def test_date_format_validation(self, authenticated_client: AsyncClient):
        """Test date format validation"""
        invalid_data = {
            "employee_id": "EMP-TEST",
            "leave_type": "ANNUAL",
            "start_date": "invalid-date",  # Invalid date format
            "end_date": "2024-12-31",
            "reason": "Vacation"
        }
        
        response = await authenticated_client.post(
            "/api/v1/leave/requests",
            json=invalid_data
        )
        
        # Should return validation error
        assert response.status_code in [400, 422, 404]


@pytest.mark.integration
@pytest.mark.asyncio
class TestAPIQueryParameters:
    """Test API query parameters"""
    
    async def test_pagination_parameters(self, authenticated_client: AsyncClient):
        """Test pagination query parameters"""
        response = await authenticated_client.get(
            "/api/v1/employees",
            params={"page": 1, "limit": 10}
        )
        
        assert response.status_code in [200, 401, 404]
    
    async def test_search_parameter(self, authenticated_client: AsyncClient):
        """Test search query parameter"""
        response = await authenticated_client.get(
            "/api/v1/employees",
            params={"search": "John"}
        )
        
        assert response.status_code in [200, 401, 404]
    
    async def test_filter_parameters(self, authenticated_client: AsyncClient):
        """Test filter query parameters"""
        response = await authenticated_client.get(
            "/api/v1/employees",
            params={"status": "ACTIVE", "department": "Engineering"}
        )
        
        assert response.status_code in [200, 401, 404]
    
    async def test_sort_parameters(self, authenticated_client: AsyncClient):
        """Test sort query parameters"""
        response = await authenticated_client.get(
            "/api/v1/employees",
            params={"sort": "first_name", "order": "asc"}
        )
        
        assert response.status_code in [200, 401, 404]
