"""Email service for sending transactional emails"""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
import structlog

from app.core.config import settings

logger = structlog.get_logger()


class EmailService:
    """Email service for sending emails"""
    
    def __init__(self):
        self.enabled = settings.EMAIL_ENABLED
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.username = settings.SMTP_USERNAME
        self.password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME
    
    async def send_email(
        self,
        to: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email"""
        
        if not self.enabled:
            logger.warning("Email service is disabled")
            return False
        
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = ", ".join(to)
            
            # Add text and HTML parts
            if text_content:
                part1 = MIMEText(text_content, "plain")
                message.attach(part1)
            
            part2 = MIMEText(html_content, "html")
            message.attach(part2)
            
            # Send email
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.username,
                password=self.password,
                use_tls=True,
            )
            
            logger.info(f"Email sent to {to}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
    
    async def send_welcome_email(self, to: str, name: str) -> bool:
        """Send welcome email"""
        subject = "Welcome to HR Management System"
        html = f"""
        <html>
            <body>
                <h1>Welcome {name}!</h1>
                <p>Thank you for joining our HR Management System.</p>
                <p>You can now log in and start managing your HR processes.</p>
            </body>
        </html>
        """
        return await self.send_email([to], subject, html)
    
    async def send_password_reset_email(
        self,
        to: str,
        name: str,
        reset_token: str
    ) -> bool:
        """Send password reset email"""
        reset_url = f"https://your-domain.com/reset-password?token={reset_token}"
        
        subject = "Password Reset Request"
        html = f"""
        <html>
            <body>
                <h1>Password Reset</h1>
                <p>Hi {name},</p>
                <p>You requested to reset your password. Click the link below:</p>
                <p><a href="{reset_url}">Reset Password</a></p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            </body>
        </html>
        """
        return await self.send_email([to], subject, html)
    
    async def send_leave_approval_email(
        self,
        to: str,
        employee_name: str,
        leave_type: str,
        start_date: str,
        end_date: str,
        status: str
    ) -> bool:
        """Send leave approval/rejection email"""
        subject = f"Leave Request {status.upper()}"
        html = f"""
        <html>
            <body>
                <h1>Leave Request {status.upper()}</h1>
                <p>Hi {employee_name},</p>
                <p>Your leave request has been <strong>{status}</strong>.</p>
                <p><strong>Details:</strong></p>
                <ul>
                    <li>Leave Type: {leave_type}</li>
                    <li>Start Date: {start_date}</li>
                    <li>End Date: {end_date}</li>
                </ul>
            </body>
        </html>
        """
        return await self.send_email([to], subject, html)
    
    async def verify_connection(self) -> bool:
        """Verify SMTP connection"""
        if not self.enabled:
            return False
        
        try:
            async with aiosmtplib.SMTP(
                hostname=self.smtp_host,
                port=self.smtp_port
            ) as smtp:
                await smtp.starttls()
                if self.username and self.password:
                    await smtp.login(self.username, self.password)
                return True
        except Exception as e:
            logger.error(f"Failed to verify email connection: {e}")
            return False


# Global email service instance
email_service = EmailService()
