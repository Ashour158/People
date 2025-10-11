"""
Authentication tests for HR Management System
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import User, Employee, Organization
from app.core.security import hash_password


@pytest.mark.auth
class TestAuthentication:
    """Test authentication endpoints"""
    
    async def test_health_check(self, client: AsyncClient):
        """Test health check endpoint"""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    async def test_root_endpoint(self, client: AsyncClient):
        """Test root endpoint"""
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
    
    async def test_register_success(self, client: AsyncClient, db: AsyncSession):
        """Test successful user registration"""
        user_data = {
            "email": "test@example.com",
            "password": "SecurePass123!",
            "first_name": "John",
            "last_name": "Doe",
            "phone": "+1234567890"
        }
        
        response = await client.post("/auth/register", json=user_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["success"] is True
        assert "message" in data
    
    async def test_register_duplicate_email(self, client: AsyncClient, db: AsyncSession, test_user: User):
        """Test registration with duplicate email"""
        user_data = {
            "email": test_user.email,
            "password": "SecurePass123!",
            "first_name": "Jane",
            "last_name": "Smith"
        }
        
        response = await client.post("/auth/register", json=user_data)
        assert response.status_code == 400
        
        data = response.json()
        assert "Email already exists" in data["detail"]
    
    async def test_register_invalid_email(self, client: AsyncClient):
        """Test registration with invalid email"""
        user_data = {
            "email": "invalid-email",
            "password": "SecurePass123!",
            "first_name": "John",
            "last_name": "Doe"
        }
        
        response = await client.post("/auth/register", json=user_data)
        assert response.status_code == 422
    
    async def test_register_weak_password(self, client: AsyncClient):
        """Test registration with weak password"""
        user_data = {
            "email": "test@example.com",
            "password": "123",
            "first_name": "John",
            "last_name": "Doe"
        }
        
        response = await client.post("/auth/register", json=user_data)
        assert response.status_code == 422
    
    async def test_login_success(self, client: AsyncClient, test_user: User):
        """Test successful login"""
        login_data = {
            "email": test_user.email,
            "password": "testpassword123"
        }
        
        response = await client.post("/auth/login", json=login_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
    
    async def test_login_wrong_password(self, client: AsyncClient, test_user: User):
        """Test login with wrong password"""
        login_data = {
            "email": test_user.email,
            "password": "wrongpassword"
        }
        
        response = await client.post("/auth/login", json=login_data)
        assert response.status_code == 401
        
        data = response.json()
        assert "Invalid email or password" in data["detail"]
    
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with nonexistent user"""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "password123"
        }
        
        response = await client.post("/auth/login", json=login_data)
        assert response.status_code == 401
        
        data = response.json()
        assert "Invalid email or password" in data["detail"]
    
    async def test_get_current_user(self, authenticated_client: AsyncClient):
        """Test get current user endpoint"""
        response = await authenticated_client.get("/auth/me")
        assert response.status_code == 200
        
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "role" in data
    
    async def test_get_current_user_unauthorized(self, client: AsyncClient):
        """Test get current user without authentication"""
        response = await client.get("/auth/me")
        assert response.status_code == 401
    
    async def test_token_refresh(self, client: AsyncClient, test_user: User):
        """Test token refresh"""
        # First login to get tokens
        login_data = {
            "email": test_user.email,
            "password": "testpassword123"
        }
        
        login_response = await client.post("/auth/login", json=login_data)
        assert login_response.status_code == 200
        
        login_data = login_response.json()
        refresh_token = login_data["refresh_token"]
        
        # Test refresh
        refresh_data = {"refresh_token": refresh_token}
        response = await client.post("/auth/refresh", json=refresh_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data
    
    async def test_logout(self, authenticated_client: AsyncClient):
        """Test user logout"""
        response = await authenticated_client.post("/auth/logout")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
    
    async def test_password_reset_request(self, client: AsyncClient, test_user: User):
        """Test password reset request"""
        reset_data = {"email": test_user.email}
        
        response = await client.post("/auth/forgot-password", json=reset_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
    
    async def test_password_change(self, authenticated_client: AsyncClient):
        """Test password change"""
        change_data = {
            "current_password": "testpassword123",
            "new_password": "NewSecurePass123!"
        }
        
        response = await authenticated_client.post("/auth/change-password", json=change_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True