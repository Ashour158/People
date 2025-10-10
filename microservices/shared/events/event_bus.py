"""
Shared Event System for Microservices Communication
Base classes and utilities for event-driven architecture using RabbitMQ
"""
from typing import Dict, Any, Optional, Callable
from datetime import datetime
from uuid import uuid4, UUID
import json
from enum import Enum
import asyncio
import aio_pika
from aio_pika import connect_robust, Message, ExchangeType
from pydantic import BaseModel


class EventPriority(str, Enum):
    """Event priority levels"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class BaseEvent(BaseModel):
    """Base event model for all domain events"""
    event_id: str
    event_type: str
    event_version: str = "1.0"
    timestamp: datetime
    source_service: str
    organization_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    correlation_id: Optional[str] = None
    causation_id: Optional[str] = None
    priority: EventPriority = EventPriority.NORMAL
    metadata: Dict[str, Any] = {}
    payload: Dict[str, Any]

    class Config:
        use_enum_values = True


class EventBus:
    """
    Event Bus for publishing and consuming events via RabbitMQ
    Supports publish/subscribe pattern with topic exchanges
    """
    
    def __init__(
        self,
        rabbitmq_url: str = "amqp://admin:password@localhost:5672/",
        exchange_name: str = "hr_events",
        service_name: str = "unknown"
    ):
        self.rabbitmq_url = rabbitmq_url
        self.exchange_name = exchange_name
        self.service_name = service_name
        self.connection = None
        self.channel = None
        self.exchange = None
        self.consumers = {}  # event_type -> callback mapping
        
    async def connect(self):
        """Establish connection to RabbitMQ"""
        try:
            self.connection = await connect_robust(
                self.rabbitmq_url,
                client_properties={"service": self.service_name}
            )
            self.channel = await self.connection.channel()
            await self.channel.set_qos(prefetch_count=10)
            
            # Declare exchange
            self.exchange = await self.channel.declare_exchange(
                self.exchange_name,
                ExchangeType.TOPIC,
                durable=True
            )
            
            print(f"✅ EventBus connected: {self.service_name}")
            
        except Exception as e:
            print(f"❌ EventBus connection failed: {str(e)}")
            raise
    
    async def disconnect(self):
        """Close connection to RabbitMQ"""
        if self.connection:
            await self.connection.close()
            print(f"🔌 EventBus disconnected: {self.service_name}")
    
    async def publish(
        self,
        event: BaseEvent,
        routing_key: Optional[str] = None
    ) -> bool:
        """
        Publish an event to the event bus
        
        Args:
            event: Event to publish
            routing_key: Optional custom routing key (defaults to event_type)
            
        Returns:
            bool: True if published successfully
        """
        try:
            if not self.exchange:
                await self.connect()
            
            # Use event type as routing key if not specified
            if not routing_key:
                routing_key = event.event_type
            
            # Serialize event
            message_body = event.model_dump_json()
            
            # Create message with properties
            message = Message(
                body=message_body.encode(),
                content_type="application/json",
                content_encoding="utf-8",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                priority=self._get_priority_value(event.priority),
                message_id=event.event_id,
                timestamp=datetime.utcnow(),
                correlation_id=event.correlation_id,
                headers={
                    "event_type": event.event_type,
                    "event_version": event.event_version,
                    "source_service": event.source_service,
                    "organization_id": str(event.organization_id) if event.organization_id else None
                }
            )
            
            # Publish to exchange
            await self.exchange.publish(
                message,
                routing_key=routing_key
            )
            
            print(f"📤 Event published: {event.event_type} (id: {event.event_id})")
            return True
            
        except Exception as e:
            print(f"❌ Event publish failed: {event.event_type} - {str(e)}")
            return False
    
    async def subscribe(
        self,
        event_type: str,
        callback: Callable,
        queue_name: Optional[str] = None
    ):
        """
        Subscribe to events of a specific type
        
        Args:
            event_type: Type of events to subscribe to (supports wildcards: *, #)
            callback: Async function to handle received events
            queue_name: Optional custom queue name
        """
        try:
            if not self.channel:
                await self.connect()
            
            # Create queue name if not provided
            if not queue_name:
                queue_name = f"{self.service_name}.{event_type}"
            
            # Declare queue
            queue = await self.channel.declare_queue(
                queue_name,
                durable=True,
                arguments={
                    "x-message-ttl": 86400000,  # 24 hours
                    "x-dead-letter-exchange": f"{self.exchange_name}.dlx"
                }
            )
            
            # Bind queue to exchange with routing key pattern
            await queue.bind(
                exchange=self.exchange,
                routing_key=event_type
            )
            
            # Start consuming
            async def on_message(message: aio_pika.IncomingMessage):
                async with message.process():
                    try:
                        # Parse event
                        event_data = json.loads(message.body.decode())
                        event = BaseEvent(**event_data)
                        
                        # Call handler
                        await callback(event)
                        
                        print(f"📥 Event processed: {event.event_type} (id: {event.event_id})")
                        
                    except Exception as e:
                        print(f"❌ Event processing failed: {str(e)}")
                        # Message will be requeued or sent to DLX based on configuration
                        raise
            
            await queue.consume(on_message)
            
            self.consumers[event_type] = callback
            print(f"👂 Subscribed to events: {event_type}")
            
        except Exception as e:
            print(f"❌ Subscription failed: {event_type} - {str(e)}")
            raise
    
    async def subscribe_multiple(
        self,
        event_patterns: list[str],
        callback: Callable,
        queue_name: Optional[str] = None
    ):
        """Subscribe to multiple event types with a single callback"""
        for pattern in event_patterns:
            await self.subscribe(pattern, callback, queue_name)
    
    @staticmethod
    def _get_priority_value(priority: EventPriority) -> int:
        """Convert priority enum to integer for RabbitMQ"""
        priority_map = {
            EventPriority.LOW: 0,
            EventPriority.NORMAL: 5,
            EventPriority.HIGH: 8,
            EventPriority.CRITICAL: 10
        }
        return priority_map.get(priority, 5)


# ==========================================
# EVENT BUILDER
# ==========================================

class EventBuilder:
    """Builder pattern for creating events"""
    
    @staticmethod
    def create_event(
        event_type: str,
        payload: Dict[str, Any],
        source_service: str,
        organization_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        priority: EventPriority = EventPriority.NORMAL,
        correlation_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> BaseEvent:
        """
        Create a new event with all required fields
        
        Args:
            event_type: Type/name of the event (e.g., "employee.created")
            payload: Event data
            source_service: Name of the service publishing the event
            organization_id: Organization context
            user_id: User who triggered the event
            priority: Event priority level
            correlation_id: ID to correlate related events
            metadata: Additional metadata
            
        Returns:
            BaseEvent: Fully constructed event
        """
        return BaseEvent(
            event_id=str(uuid4()),
            event_type=event_type,
            timestamp=datetime.utcnow(),
            source_service=source_service,
            organization_id=organization_id,
            user_id=user_id,
            priority=priority,
            correlation_id=correlation_id or str(uuid4()),
            metadata=metadata or {},
            payload=payload
        )


# ==========================================
# DOMAIN EVENTS
# ==========================================

class EmployeeEvents:
    """Employee service domain events"""
    EMPLOYEE_CREATED = "employee.created"
    EMPLOYEE_UPDATED = "employee.updated"
    EMPLOYEE_DELETED = "employee.deleted"
    EMPLOYEE_ACTIVATED = "employee.activated"
    EMPLOYEE_DEACTIVATED = "employee.deactivated"
    EMPLOYEE_ONBOARDED = "employee.onboarded"
    EMPLOYEE_OFFBOARDED = "employee.offboarded"


class AttendanceEvents:
    """Attendance service domain events"""
    ATTENDANCE_CHECKED_IN = "attendance.checked_in"
    ATTENDANCE_CHECKED_OUT = "attendance.checked_out"
    ATTENDANCE_REGULARIZED = "attendance.regularized"
    ATTENDANCE_APPROVED = "attendance.approved"
    ATTENDANCE_REJECTED = "attendance.rejected"


class LeaveEvents:
    """Leave service domain events"""
    LEAVE_REQUESTED = "leave.requested"
    LEAVE_APPROVED = "leave.approved"
    LEAVE_REJECTED = "leave.rejected"
    LEAVE_CANCELLED = "leave.cancelled"
    LEAVE_BALANCE_UPDATED = "leave.balance_updated"


class PayrollEvents:
    """Payroll service domain events"""
    PAYROLL_GENERATED = "payroll.generated"
    PAYROLL_APPROVED = "payroll.approved"
    PAYROLL_PROCESSED = "payroll.processed"
    SALARY_DISBURSED = "salary.disbursed"


class PerformanceEvents:
    """Performance service domain events"""
    GOAL_CREATED = "performance.goal_created"
    GOAL_UPDATED = "performance.goal_updated"
    REVIEW_COMPLETED = "performance.review_completed"
    FEEDBACK_GIVEN = "performance.feedback_given"


class NotificationEvents:
    """Notification service domain events"""
    NOTIFICATION_SENT = "notification.sent"
    NOTIFICATION_DELIVERED = "notification.delivered"
    NOTIFICATION_READ = "notification.read"
    EMAIL_SENT = "notification.email_sent"
    SMS_SENT = "notification.sms_sent"


# ==========================================
# EVENT PATTERNS (for subscribing)
# ==========================================

class EventPatterns:
    """Common event patterns for subscriptions"""
    
    # All events from a service
    ALL_EMPLOYEE_EVENTS = "employee.*"
    ALL_ATTENDANCE_EVENTS = "attendance.*"
    ALL_LEAVE_EVENTS = "leave.*"
    
    # Critical events across services
    ALL_CRITICAL_EVENTS = "*.critical"
    
    # All events (use with caution)
    ALL_EVENTS = "#"
    
    # Approval workflow events
    ALL_APPROVAL_EVENTS = "*.approved"
    ALL_REJECTION_EVENTS = "*.rejected"


# ==========================================
# USAGE EXAMPLE
# ==========================================

"""
Example Usage:

# In Employee Service:
event_bus = EventBus(service_name="employee-service")
await event_bus.connect()

# Publish event when employee is created
event = EventBuilder.create_event(
    event_type=EmployeeEvents.EMPLOYEE_CREATED,
    payload={
        "employee_id": str(employee.employee_id),
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "email": employee.email,
        "department_id": str(employee.department_id)
    },
    source_service="employee-service",
    organization_id=employee.organization_id,
    user_id=current_user.user_id
)
await event_bus.publish(event)

# In Notification Service:
notification_event_bus = EventBus(service_name="notification-service")
await notification_event_bus.connect()

# Subscribe to employee events
async def handle_employee_created(event: BaseEvent):
    # Send welcome email
    await send_welcome_email(event.payload["email"])

await notification_event_bus.subscribe(
    EmployeeEvents.EMPLOYEE_CREATED,
    handle_employee_created
)

# Subscribe to all leave events
await notification_event_bus.subscribe(
    EventPatterns.ALL_LEAVE_EVENTS,
    handle_leave_events
)
"""
