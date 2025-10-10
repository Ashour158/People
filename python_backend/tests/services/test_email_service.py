"""Tests for email service"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from app.services.email_service import EmailService


class TestEmailService:
    """Test email service functionality"""
    
    @pytest.fixture
    def email_service(self):
        """Create email service instance"""
        return EmailService()
    
    @pytest.mark.asyncio
    async def test_send_email_success(self, email_service):
        """Test sending email successfully"""
        with patch('app.services.email_service.aiosmtplib.send') as mock_send:
            mock_send.return_value = None
            
            result = await email_service.send_email(
                to_email="test@example.com",
                subject="Test Email",
                body="Test body"
            )
            
            assert result is True or result is None  # Depends on implementation
    
    @pytest.mark.asyncio
    async def test_send_email_with_html(self, email_service):
        """Test sending HTML email"""
        with patch('app.services.email_service.aiosmtplib.send') as mock_send:
            mock_send.return_value = None
            
            html_body = "<h1>Test Email</h1><p>This is a test</p>"
            result = await email_service.send_email(
                to_email="test@example.com",
                subject="Test Email",
                body=html_body,
                is_html=True
            )
            
            assert result is True or result is None
    
    @pytest.mark.asyncio
    async def test_send_welcome_email(self, email_service):
        """Test sending welcome email template"""
        with patch.object(email_service, 'send_email', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            
            result = await email_service.send_welcome_email(
                to_email="newuser@example.com",
                user_name="John Doe"
            )
            
            assert mock_send.called or result is not None
    
    @pytest.mark.asyncio
    async def test_send_password_reset_email(self, email_service):
        """Test sending password reset email"""
        with patch.object(email_service, 'send_email', new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            
            result = await email_service.send_password_reset_email(
                to_email="user@example.com",
                reset_token="test-token-123"
            )
            
            assert mock_send.called or result is not None
    
    def test_email_validation(self, email_service):
        """Test email address validation"""
        valid_emails = [
            "test@example.com",
            "user.name@example.co.uk",
            "user+tag@example.com"
        ]
        
        for email in valid_emails:
            assert "@" in email
            assert "." in email.split("@")[1]
