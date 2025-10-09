"""
Integration models for third-party services
Supports Slack, Zoom, Job Boards, Payment Gateways, Biometric Systems, etc.
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, JSON, Integer, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.database import Base


class IntegrationType(str, enum.Enum):
    """Types of integrations supported"""
    SLACK = "slack"
    ZOOM = "zoom"
    MICROSOFT_TEAMS = "microsoft_teams"
    LINKEDIN = "linkedin"
    INDEED = "indeed"
    GLASSDOOR = "glassdoor"
    STRIPE = "stripe"
    PAYPAL = "paypal"
    BANK_TRANSFER = "bank_transfer"
    BIOMETRIC = "biometric"
    GEOFENCING = "geofencing"
    CALENDAR = "calendar"
    EMAIL = "email"
    SMS = "sms"
    CUSTOM = "custom"


class IntegrationStatus(str, enum.Enum):
    """Integration configuration status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    ERROR = "error"
    EXPIRED = "expired"


class Integration(Base):
    """Main integration configuration table"""
    __tablename__ = "integrations"
    
    integration_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Integration details
    integration_type = Column(SQLEnum(IntegrationType), nullable=False)
    integration_name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Configuration
    config = Column(JSON)  # Stores API keys, tokens, endpoints, etc.
    status = Column(SQLEnum(IntegrationStatus), default=IntegrationStatus.PENDING)
    
    # Authentication
    auth_type = Column(String(50))  # oauth, api_key, basic, token
    access_token = Column(Text)
    refresh_token = Column(Text)
    token_expires_at = Column(DateTime(timezone=True))
    
    # Webhook settings
    webhook_url = Column(String(500))
    webhook_secret = Column(String(255))
    
    # Usage tracking
    is_enabled = Column(Boolean, default=True)
    last_sync_at = Column(DateTime(timezone=True))
    sync_frequency = Column(Integer)  # Minutes
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="integrations")
    logs = relationship("IntegrationLog", back_populates="integration", cascade="all, delete-orphan")


class IntegrationLog(Base):
    """Logs for integration API calls and events"""
    __tablename__ = "integration_logs"
    
    log_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    integration_id = Column(UUID(as_uuid=True), ForeignKey("integrations.integration_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Event details
    event_type = Column(String(100), nullable=False)  # api_call, webhook_received, sync, error
    event_name = Column(String(255))
    
    # Request/Response
    request_data = Column(JSON)
    response_data = Column(JSON)
    status_code = Column(Integer)
    
    # Error tracking
    is_success = Column(Boolean, default=True)
    error_message = Column(Text)
    
    # Timing
    duration_ms = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    integration = relationship("Integration", back_populates="logs")


class SlackWorkspace(Base):
    """Slack workspace configuration"""
    __tablename__ = "slack_workspaces"
    
    workspace_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    integration_id = Column(UUID(as_uuid=True), ForeignKey("integrations.integration_id"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Slack details
    slack_team_id = Column(String(50), unique=True)
    slack_team_name = Column(String(255))
    slack_workspace_url = Column(String(500))
    
    # Bot configuration
    bot_user_id = Column(String(50))
    bot_access_token = Column(Text)
    
    # Channels
    default_channel = Column(String(100))  # #general, #hr-notifications
    hr_channel = Column(String(100))
    leave_channel = Column(String(100))
    attendance_channel = Column(String(100))
    
    # Notification settings
    notify_leave_requests = Column(Boolean, default=True)
    notify_approvals = Column(Boolean, default=True)
    notify_attendance = Column(Boolean, default=True)
    notify_birthdays = Column(Boolean, default=True)
    notify_anniversaries = Column(Boolean, default=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class ZoomAccount(Base):
    """Zoom account configuration"""
    __tablename__ = "zoom_accounts"
    
    account_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    integration_id = Column(UUID(as_uuid=True), ForeignKey("integrations.integration_id"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Zoom details
    zoom_account_id = Column(String(100))
    zoom_user_email = Column(String(255))
    
    # API credentials
    api_key = Column(String(255))
    api_secret = Column(Text)
    
    # Meeting defaults
    default_duration = Column(Integer, default=60)  # minutes
    auto_recording = Column(Boolean, default=False)
    waiting_room = Column(Boolean, default=True)
    join_before_host = Column(Boolean, default=False)
    
    # Features enabled
    enable_interview_scheduling = Column(Boolean, default=True)
    enable_onboarding_meetings = Column(Boolean, default=True)
    enable_team_meetings = Column(Boolean, default=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class ZoomMeeting(Base):
    """Zoom meetings created via integration"""
    __tablename__ = "zoom_meetings"
    
    meeting_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(UUID(as_uuid=True), ForeignKey("zoom_accounts.account_id"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Zoom meeting details
    zoom_meeting_id = Column(String(50), unique=True)
    meeting_number = Column(String(50))
    host_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    
    # Meeting info
    topic = Column(String(500), nullable=False)
    agenda = Column(Text)
    meeting_type = Column(String(50))  # interview, onboarding, team_meeting, training
    
    # Schedule
    start_time = Column(DateTime(timezone=True), nullable=False)
    duration = Column(Integer, nullable=False)  # minutes
    timezone = Column(String(100))
    
    # Join details
    join_url = Column(Text)
    meeting_password = Column(String(50))
    
    # Settings
    is_recurring = Column(Boolean, default=False)
    waiting_room = Column(Boolean, default=True)
    auto_recording = Column(String(50))  # none, local, cloud
    
    # Status
    status = Column(String(50), default="scheduled")  # scheduled, started, ended, cancelled
    
    # Related entity
    related_entity_type = Column(String(50))  # candidate, employee, team
    related_entity_id = Column(UUID(as_uuid=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class JobBoard(Base):
    """Job board integration configuration"""
    __tablename__ = "job_boards"
    
    board_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    integration_id = Column(UUID(as_uuid=True), ForeignKey("integrations.integration_id"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Job board details
    board_name = Column(String(100), nullable=False)  # LinkedIn, Indeed, Glassdoor
    board_type = Column(String(50))
    
    # API credentials
    api_key = Column(String(255))
    client_id = Column(String(255))
    client_secret = Column(Text)
    
    # Account info
    company_page_url = Column(String(500))
    company_id = Column(String(100))
    
    # Posting settings
    auto_post_jobs = Column(Boolean, default=False)
    auto_sync_applicants = Column(Boolean, default=True)
    sync_frequency = Column(Integer, default=60)  # minutes
    
    # Features
    supports_job_posting = Column(Boolean, default=True)
    supports_applicant_tracking = Column(Boolean, default=True)
    supports_analytics = Column(Boolean, default=False)
    
    is_active = Column(Boolean, default=True)
    last_sync_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class JobBoardPosting(Base):
    """Job postings published to external job boards"""
    __tablename__ = "job_board_postings"
    
    posting_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    board_id = Column(UUID(as_uuid=True), ForeignKey("job_boards.board_id"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Internal job reference
    job_posting_id = Column(UUID(as_uuid=True))  # Link to internal job_postings table
    
    # External posting details
    external_posting_id = Column(String(255))
    external_url = Column(String(1000))
    
    # Status
    status = Column(String(50), default="draft")  # draft, published, closed, expired
    published_at = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True))
    
    # Metrics
    views_count = Column(Integer, default=0)
    applications_count = Column(Integer, default=0)
    
    # Sync
    last_synced_at = Column(DateTime(timezone=True))
    sync_status = Column(String(50))  # success, pending, error
    sync_error = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class PaymentGateway(Base):
    """Payment gateway configuration for payroll"""
    __tablename__ = "payment_gateways"
    
    gateway_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    integration_id = Column(UUID(as_uuid=True), ForeignKey("integrations.integration_id"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Gateway details
    gateway_name = Column(String(100), nullable=False)  # Stripe, PayPal, Bank Transfer
    gateway_type = Column(String(50))
    
    # API credentials
    api_key = Column(Text)
    secret_key = Column(Text)
    publishable_key = Column(String(255))
    
    # Account info
    account_id = Column(String(255))
    merchant_id = Column(String(255))
    
    # Bank details (for direct transfer)
    bank_name = Column(String(255))
    bank_routing_number = Column(String(50))
    bank_account_number = Column(Text)  # Encrypted
    
    # Settings
    currency = Column(String(10), default="USD")
    is_default = Column(Boolean, default=False)
    
    # Processing
    auto_process_payroll = Column(Boolean, default=False)
    require_approval = Column(Boolean, default=True)
    
    # Limits
    daily_limit = Column(Integer)
    transaction_limit = Column(Integer)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class BiometricDevice(Base):
    """Biometric device configuration for attendance"""
    __tablename__ = "biometric_devices"
    
    device_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    integration_id = Column(UUID(as_uuid=True), ForeignKey("integrations.integration_id"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Device details
    device_name = Column(String(255), nullable=False)
    device_type = Column(String(50))  # fingerprint, face_recognition, iris, card_reader
    manufacturer = Column(String(255))
    model = Column(String(255))
    serial_number = Column(String(100), unique=True)
    
    # Network configuration
    ip_address = Column(String(45))
    mac_address = Column(String(17))
    port = Column(Integer)
    
    # Location
    location_name = Column(String(255))
    location_address = Column(Text)
    latitude = Column(String(50))
    longitude = Column(String(50))
    
    # SDK/API details
    sdk_version = Column(String(50))
    api_endpoint = Column(String(500))
    api_key = Column(String(255))
    
    # Configuration
    requires_approval = Column(Boolean, default=False)
    auto_sync = Column(Boolean, default=True)
    sync_interval = Column(Integer, default=5)  # minutes
    
    # Status
    is_online = Column(Boolean, default=False)
    last_ping_at = Column(DateTime(timezone=True))
    last_sync_at = Column(DateTime(timezone=True))
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class GeofenceLocation(Base):
    """Geofence locations for attendance verification"""
    __tablename__ = "geofence_locations"
    
    geofence_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Location details
    location_name = Column(String(255), nullable=False)
    location_type = Column(String(50))  # office, branch, client_site, remote
    address = Column(Text)
    
    # Coordinates (center point)
    latitude = Column(String(50), nullable=False)
    longitude = Column(String(50), nullable=False)
    
    # Geofence settings
    radius_meters = Column(Integer, nullable=False, default=100)
    
    # Validation
    enable_check_in = Column(Boolean, default=True)
    enable_check_out = Column(Boolean, default=True)
    strict_mode = Column(Boolean, default=False)  # Reject check-ins outside geofence
    
    # Notifications
    notify_on_breach = Column(Boolean, default=False)
    notify_hr = Column(Boolean, default=False)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class HolidayCalendar(Base):
    """Holiday calendars for different countries/regions"""
    __tablename__ = "holiday_calendars"
    
    calendar_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Calendar details
    calendar_name = Column(String(255), nullable=False)
    country_code = Column(String(3))  # ISO 3166-1 alpha-3
    region_code = Column(String(10))  # State/Province code
    
    # Source
    source = Column(String(50))  # manual, api, imported
    api_integration_id = Column(UUID(as_uuid=True), ForeignKey("integrations.integration_id"))
    
    # Settings
    is_default = Column(Boolean, default=False)
    auto_sync = Column(Boolean, default=False)
    last_sync_at = Column(DateTime(timezone=True))
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class Holiday(Base):
    """Individual holidays in a calendar"""
    __tablename__ = "holidays"
    
    holiday_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    calendar_id = Column(UUID(as_uuid=True), ForeignKey("holiday_calendars.calendar_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Holiday details
    holiday_name = Column(String(255), nullable=False)
    holiday_date = Column(DateTime(timezone=True), nullable=False, index=True)
    holiday_type = Column(String(50))  # national, regional, religious, optional
    
    # Configuration
    is_mandatory = Column(Boolean, default=True)
    is_paid = Column(Boolean, default=True)
    
    # Description
    description = Column(Text)
    
    # Recurring
    is_recurring = Column(Boolean, default=True)
    recurrence_rule = Column(String(255))  # RRULE format
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class NotificationPreference(Base):
    """User notification preferences for different channels"""
    __tablename__ = "notification_preferences"
    
    preference_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Channel preferences
    email_enabled = Column(Boolean, default=True)
    slack_enabled = Column(Boolean, default=False)
    sms_enabled = Column(Boolean, default=False)
    push_enabled = Column(Boolean, default=True)
    in_app_enabled = Column(Boolean, default=True)
    
    # Event preferences
    leave_requests = Column(Boolean, default=True)
    leave_approvals = Column(Boolean, default=True)
    attendance_reminders = Column(Boolean, default=True)
    payroll_notifications = Column(Boolean, default=True)
    performance_reviews = Column(Boolean, default=True)
    system_alerts = Column(Boolean, default=True)
    birthday_reminders = Column(Boolean, default=True)
    anniversary_reminders = Column(Boolean, default=True)
    
    # Delivery preferences
    digest_mode = Column(Boolean, default=False)  # Batch notifications
    digest_frequency = Column(String(20))  # daily, weekly
    quiet_hours_start = Column(String(5))  # HH:MM
    quiet_hours_end = Column(String(5))  # HH:MM
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
