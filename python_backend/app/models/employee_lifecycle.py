"""
Enhanced Employee Lifecycle and Dashboard Models
Career development, emergency contacts, and dashboard widgets
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, Text, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.database import Base


class RelationType(str, enum.Enum):
    """Emergency contact relationship types"""
    SPOUSE = "spouse"
    PARENT = "parent"
    SIBLING = "sibling"
    CHILD = "child"
    RELATIVE = "relative"
    FRIEND = "friend"
    OTHER = "other"


class CareerGoalStatus(str, enum.Enum):
    """Career goal status"""
    DRAFT = "draft"
    ACTIVE = "active"
    IN_PROGRESS = "in_progress"
    ACHIEVED = "achieved"
    ABANDONED = "abandoned"


class SuccessionReadiness(str, enum.Enum):
    """Succession readiness levels"""
    NOT_READY = "not_ready"
    READY_1_2_YEARS = "ready_1_2_years"
    READY_NOW = "ready_now"


class EmergencyContact(Base):
    """Enhanced emergency contacts with verification"""
    __tablename__ = "emergency_contacts"
    
    contact_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    
    # Contact details
    full_name = Column(String(255), nullable=False)
    relationship = Column(SQLEnum(RelationType), nullable=False)
    
    # Phone numbers
    primary_phone = Column(String(20), nullable=False)
    secondary_phone = Column(String(20))
    
    # Address
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))
    
    # Priority
    is_primary = Column(Boolean, default=False)
    priority_order = Column(Integer, default=1)
    
    # Verification
    is_verified = Column(Boolean, default=False)
    verification_code = Column(String(10))
    verified_at = Column(DateTime(timezone=True))
    last_verification_attempt = Column(DateTime(timezone=True))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class CareerPath(Base):
    """Defined career paths in the organization"""
    __tablename__ = "career_paths"
    
    path_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Path details
    path_name = Column(String(255), nullable=False)
    description = Column(Text)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.department_id"))
    
    # Positions in path (ordered)
    positions = Column(JSON)  # Array of position objects with level, requirements
    
    # Requirements
    typical_duration_years = Column(Integer)
    required_skills = Column(JSON)
    required_certifications = Column(JSON)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class CareerGoal(Base):
    """Employee career goals and aspirations"""
    __tablename__ = "career_goals"
    
    goal_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    
    # Goal details
    goal_title = Column(String(500), nullable=False)
    description = Column(Text)
    target_position = Column(String(255))
    target_department = Column(String(255))
    
    # Timeline
    target_date = Column(Date)
    started_date = Column(Date)
    achieved_date = Column(Date)
    
    # Status
    status = Column(SQLEnum(CareerGoalStatus), default=CareerGoalStatus.DRAFT, index=True)
    
    # Progress
    progress_percentage = Column(Integer, default=0)
    milestones = Column(JSON)  # Array of milestone objects
    
    # Support
    mentor_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    development_plan = Column(Text)
    required_skills = Column(JSON)
    
    # Manager involvement
    manager_reviewed = Column(Boolean, default=False)
    manager_comments = Column(Text)
    manager_support = Column(Boolean)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class EmployeeCompetency(Base):
    """Employee competency assessments"""
    __tablename__ = "employee_competencies"
    
    competency_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    
    # Competency details
    competency_name = Column(String(255), nullable=False)
    competency_category = Column(String(100))  # leadership, technical, behavioral
    
    # Assessment
    current_level = Column(Integer)  # 1-5 scale
    target_level = Column(Integer)
    assessed_date = Column(Date)
    next_assessment_date = Column(Date)
    
    # Assessor
    assessed_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    
    # Development
    development_actions = Column(JSON)  # Array of action items
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class SuccessionPlan(Base):
    """Succession planning for key positions"""
    __tablename__ = "succession_plans"
    
    plan_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Position
    position_title = Column(String(255), nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.department_id"))
    current_incumbent = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    
    # Risk
    is_critical_position = Column(Boolean, default=False)
    vacancy_risk = Column(String(20))  # low, medium, high
    retirement_date = Column(Date)
    
    # Successors
    successors = Column(JSON)  # Array of potential successors with readiness
    
    # Review
    last_review_date = Column(Date)
    next_review_date = Column(Date)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class DashboardWidget(Base):
    """Dashboard widget configurations"""
    __tablename__ = "dashboard_widgets"
    
    widget_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Widget details
    widget_name = Column(String(200), nullable=False)
    widget_type = Column(String(100), nullable=False)  # leave_balance, attendance, tasks, etc.
    description = Column(Text)
    
    # Display
    icon = Column(String(100))
    default_size = Column(String(20))  # small, medium, large
    default_position = Column(Integer)
    
    # Configuration
    default_config = Column(JSON)  # Widget-specific settings
    
    # Availability
    available_for_roles = Column(JSON)  # Array of roles
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class EmployeeDashboard(Base):
    """Employee-specific dashboard configuration"""
    __tablename__ = "employee_dashboards"
    
    dashboard_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, unique=True, index=True)
    
    # Layout
    widgets = Column(JSON)  # Array of widget configurations with position, size, settings
    
    # Preferences
    theme = Column(String(50), default="light")
    compact_mode = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class QuickAction(Base):
    """Quick action definitions for dashboard"""
    __tablename__ = "quick_actions"
    
    action_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Action details
    action_name = Column(String(200), nullable=False)
    action_type = Column(String(100), nullable=False)  # leave_request, expense_submit, etc.
    description = Column(Text)
    
    # Display
    icon = Column(String(100))
    icon_color = Column(String(20))
    
    # Target
    target_url = Column(String(500))
    target_modal = Column(String(100))
    
    # Availability
    available_for_roles = Column(JSON)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class NotificationPreference(Base):
    """Employee notification preferences"""
    __tablename__ = "notification_preferences"
    
    preference_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, unique=True, index=True)
    
    # Email preferences
    email_enabled = Column(Boolean, default=True)
    email_frequency = Column(String(20), default="immediate")  # immediate, daily, weekly
    
    # Push notification preferences
    push_enabled = Column(Boolean, default=True)
    
    # SMS preferences
    sms_enabled = Column(Boolean, default=False)
    sms_phone = Column(String(20))
    
    # Notification types
    leave_notifications = Column(Boolean, default=True)
    attendance_notifications = Column(Boolean, default=True)
    expense_notifications = Column(Boolean, default=True)
    performance_notifications = Column(Boolean, default=True)
    announcement_notifications = Column(Boolean, default=True)
    recognition_notifications = Column(Boolean, default=True)
    
    # Quiet hours
    quiet_hours_enabled = Column(Boolean, default=False)
    quiet_hours_start = Column(String(5))  # HH:MM format
    quiet_hours_end = Column(String(5))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class EmployeeLifecycleEvent(Base):
    """Track important employee lifecycle events"""
    __tablename__ = "employee_lifecycle_events"
    
    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Event details
    event_type = Column(String(100), nullable=False, index=True)  # hire, promotion, transfer, etc.
    event_date = Column(Date, nullable=False, index=True)
    description = Column(Text)
    
    # Related data
    from_value = Column(String(500))  # Previous state
    to_value = Column(String(500))  # New state
    
    # Approval
    approved_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    approved_at = Column(DateTime(timezone=True))
    
    # Documentation
    documents = Column(JSON)  # Array of related document URLs
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
