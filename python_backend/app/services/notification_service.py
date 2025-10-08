"""Notification service for real-time notifications"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import structlog
import uuid

from app.db.database import AsyncSession, get_db
from app.models.models import Employee
from app.events.event_dispatcher import EventDispatcher, Events

logger = structlog.get_logger()


class NotificationService:
    """Service for managing notifications"""
    
    def __init__(self):
        self.listeners: Dict[str, List[callable]] = {}
        self._setup_event_listeners()
    
    def _setup_event_listeners(self):
        """Setup event listeners for notifications"""
        
        # User events
        EventDispatcher.listen(Events.USER_REGISTERED, self._on_user_registered)
        EventDispatcher.listen(Events.USER_LOGIN, self._on_user_login)
        
        # Employee events
        EventDispatcher.listen(Events.EMPLOYEE_CREATED, self._on_employee_created)
        
        # Attendance events
        EventDispatcher.listen(Events.ATTENDANCE_CHECK_IN, self._on_attendance_check_in)
        EventDispatcher.listen(Events.ATTENDANCE_CHECK_OUT, self._on_attendance_check_out)
        
        # Leave events
        EventDispatcher.listen(Events.LEAVE_APPLIED, self._on_leave_applied)
        EventDispatcher.listen(Events.LEAVE_APPROVED, self._on_leave_approved)
        EventDispatcher.listen(Events.LEAVE_REJECTED, self._on_leave_rejected)
    
    async def _on_user_registered(self, data: Dict[str, Any]):
        """Handle user registration event"""
        logger.info(f"Notification: User registered - {data.get('email')}")
        # Send welcome email
        from app.services.email_service import email_service
        await email_service.send_welcome_email(
            data.get("email"),
            data.get("email")
        )
    
    async def _on_user_login(self, data: Dict[str, Any]):
        """Handle user login event"""
        logger.info(f"Notification: User logged in - {data.get('email')}")
    
    async def _on_employee_created(self, data: Dict[str, Any]):
        """Handle employee creation event"""
        logger.info(f"Notification: Employee created - {data.get('employee_id')}")
    
    async def _on_attendance_check_in(self, data: Dict[str, Any]):
        """Handle attendance check-in event"""
        logger.info(f"Notification: Check-in - Employee {data.get('employee_id')}")
    
    async def _on_attendance_check_out(self, data: Dict[str, Any]):
        """Handle attendance check-out event"""
        logger.info(f"Notification: Check-out - Employee {data.get('employee_id')}, Hours: {data.get('work_hours')}")
    
    async def _on_leave_applied(self, data: Dict[str, Any]):
        """Handle leave application event"""
        logger.info(f"Notification: Leave applied - {data.get('leave_request_id')}")
        # Notify manager
    
    async def _on_leave_approved(self, data: Dict[str, Any]):
        """Handle leave approval event"""
        logger.info(f"Notification: Leave approved - {data.get('leave_request_id')}")
        # Notify employee
    
    async def _on_leave_rejected(self, data: Dict[str, Any]):
        """Handle leave rejection event"""
        logger.info(f"Notification: Leave rejected - {data.get('leave_request_id')}")
        # Notify employee
    
    async def create_notification(
        self,
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "info",
        link: Optional[str] = None
    ):
        """Create a notification"""
        notification = {
            "notification_id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": notification_type,
            "link": link,
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Store in database or send via WebSocket
        logger.info(f"Notification created: {notification}")
        return notification


# Global notification service
notification_service = NotificationService()
