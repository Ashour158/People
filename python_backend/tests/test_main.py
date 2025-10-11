"""
Test main application endpoints
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """Test root endpoint"""
    response = await client.get("/")
    assert response.status_code == 200
    assert "HR Management System API" in response.json()["message"]


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test health check endpoint"""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_api_docs(client: AsyncClient):
    """Test API documentation endpoints"""
    response = await client.get("/api/v1/docs")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_simple_math():
    """Simple test to ensure pytest is working"""
    assert 1 + 1 == 2


@pytest.mark.asyncio
async def test_string_operations():
    """Test string operations"""
    text = "Hello World"
    assert len(text) == 11
    assert text.upper() == "HELLO WORLD"
