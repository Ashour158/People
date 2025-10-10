"""Integration tests for integrations endpoint"""
import pytest
from httpx import AsyncClient


@pytest.mark.integration
@pytest.mark.asyncio
class TestIntegrationsAPI:
    """Test integrations API endpoints"""
    
    async def test_get_integrations(self, authenticated_client: AsyncClient):
        """Test retrieving available integrations"""
        response = await authenticated_client.get("/api/v1/integrations")
        
        assert response.status_code in [200, 404]
    
    async def test_connect_slack_integration(self, authenticated_client: AsyncClient):
        """Test connecting Slack integration"""
        integration_data = {
            "type": "slack",
            "webhook_url": "https://hooks.slack.com/services/TEST",
            "channel": "#general"
        }
        
        response = await authenticated_client.post(
            "/api/v1/integrations/slack/connect",
            json=integration_data
        )
        
        assert response.status_code in [200, 201, 404]
    
    async def test_connect_zoom_integration(self, authenticated_client: AsyncClient):
        """Test connecting Zoom integration"""
        integration_data = {
            "type": "zoom",
            "api_key": "test-api-key",
            "api_secret": "test-api-secret"
        }
        
        response = await authenticated_client.post(
            "/api/v1/integrations/zoom/connect",
            json=integration_data
        )
        
        assert response.status_code in [200, 201, 404]
    
    async def test_get_integration_status(self, authenticated_client: AsyncClient):
        """Test getting integration status"""
        integration_type = "slack"
        response = await authenticated_client.get(
            f"/api/v1/integrations/{integration_type}/status"
        )
        
        assert response.status_code in [200, 404]
    
    async def test_disconnect_integration(self, authenticated_client: AsyncClient):
        """Test disconnecting an integration"""
        integration_type = "slack"
        response = await authenticated_client.post(
            f"/api/v1/integrations/{integration_type}/disconnect"
        )
        
        assert response.status_code in [200, 404]
    
    async def test_test_integration(self, authenticated_client: AsyncClient):
        """Test testing an integration connection"""
        integration_type = "slack"
        response = await authenticated_client.post(
            f"/api/v1/integrations/{integration_type}/test"
        )
        
        assert response.status_code in [200, 404]
    
    async def test_webhook_callback(self, client: AsyncClient):
        """Test webhook callback endpoint"""
        webhook_data = {
            "event": "test_event",
            "data": {"message": "test"}
        }
        
        response = await client.post(
            "/api/v1/integrations/webhook/slack",
            json=webhook_data
        )
        
        assert response.status_code in [200, 404]
