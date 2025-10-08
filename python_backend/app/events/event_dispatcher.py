"""Event dispatcher for handling application events"""
from typing import Dict, List, Callable, Any
import asyncio
import structlog

logger = structlog.get_logger()


class EventDispatcher:
    """Event dispatcher for handling application events"""
    
    _instance = None
    _listeners: Dict[str, List[Callable]] = {}
    
    @classmethod
    def initialize(cls):
        """Initialize event dispatcher"""
        if cls._instance is None:
            cls._instance = cls()
            logger.info("Event dispatcher initialized")
        return cls._instance
    
    @classmethod
    def listen(cls, event_name: str, handler: Callable):
        """Register event listener"""
        if event_name not in cls._listeners:
            cls._listeners[event_name] = []
        cls._listeners[event_name].append(handler)
        logger.debug(f"Registered listener for event: {event_name}")
    
    @classmethod
    async def dispatch(cls, event_name: str, data: Any = None):
        """Dispatch event to all registered listeners"""
        if event_name not in cls._listeners:
            logger.debug(f"No listeners for event: {event_name}")
            return
        
        logger.info(f"Dispatching event: {event_name}")
        
        for handler in cls._listeners[event_name]:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(data)
                else:
                    handler(data)
            except Exception as e:
                logger.error(f"Error in event handler for {event_name}: {e}")
    
    @classmethod
    def remove_listener(cls, event_name: str, handler: Callable):
        """Remove event listener"""
        if event_name in cls._listeners:
            cls._listeners[event_name] = [
                h for h in cls._listeners[event_name] if h != handler
            ]


# Event names constants
class Events:
    """Event name constants"""
    
    # User events
    USER_REGISTERED = "user.registered"
    USER_LOGIN = "user.login"
    USER_LOGOUT = "user.logout"
    PASSWORD_RESET = "user.password_reset"
    
    # Employee events
    EMPLOYEE_CREATED = "employee.created"
    EMPLOYEE_UPDATED = "employee.updated"
    EMPLOYEE_DELETED = "employee.deleted"
    
    # Attendance events
    ATTENDANCE_CHECK_IN = "attendance.check_in"
    ATTENDANCE_CHECK_OUT = "attendance.check_out"
    ATTENDANCE_REGULARIZATION = "attendance.regularization"
    
    # Leave events
    LEAVE_APPLIED = "leave.applied"
    LEAVE_APPROVED = "leave.approved"
    LEAVE_REJECTED = "leave.rejected"
    LEAVE_CANCELLED = "leave.cancelled"
    
    # Payroll events
    PAYROLL_PROCESSED = "payroll.processed"
    SALARY_SLIP_GENERATED = "payroll.salary_slip_generated"
    BONUS_APPROVED = "payroll.bonus_approved"
    
    # Performance events
    REVIEW_CREATED = "performance.review_created"
    GOAL_CREATED = "performance.goal_created"
    FEEDBACK_SUBMITTED = "performance.feedback_submitted"
    
    # Recruitment events
    APPLICATION_RECEIVED = "recruitment.application_received"
    INTERVIEW_SCHEDULED = "recruitment.interview_scheduled"
    OFFER_MADE = "recruitment.offer_made"
