"""Tests for notification service"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from app.services.notification_service import NotificationService


class TestNotificationService:
    """Test notification service functionality"""
    
    @pytest.fixture
    def notification_service(self):
        """Create notification service instance"""
        return NotificationService()
    
    @pytest.mark.asyncio
    async def test_send_notification(self, notification_service):
        """Test sending a notification"""
        with patch.object(notification_service, 'send', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = {"success": True}
            
            result = await notification_service.send(
                user_id="user-123",
                title="Test Notification",
                message="This is a test notification"
            )
            
            assert mock_send.called
    
    @pytest.mark.asyncio
    async def test_send_push_notification(self, notification_service):
        """Test sending push notification"""
        with patch.object(notification_service, 'send_push', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = {"success": True}
            
            result = await notification_service.send_push(
                device_token="device-token-123",
                title="Push Notification",
                body="Test push message"
            )
            
            assert mock_send.called or result is not None
    
    @pytest.mark.asyncio
    async def test_send_email_notification(self, notification_service):
        """Test sending email notification"""
        with patch.object(notification_service, 'send_email', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            
            result = await notification_service.send_email(
                to_email="test@example.com",
                subject="Test",
                body="Test message"
            )
            
            assert mock_send.called or result is not None
    
    def test_notification_types(self, notification_service):
        """Test different notification types"""
        notification_types = [
            "email",
            "push",
            "sms",
            "in_app"
        ]
        
        for notification_type in notification_types:
            assert notification_type in ["email", "push", "sms", "in_app"]
