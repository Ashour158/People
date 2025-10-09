"""
Employee Helpdesk/Ticketing System Models
Complete ticketing system with knowledge base
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Date, Text, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.database import Base


class TicketPriority(str, enum.Enum):
    """Ticket priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TicketStatus(str, enum.Enum):
    """Ticket status"""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    PENDING_EMPLOYEE = "pending_employee"
    PENDING_HR = "pending_hr"
    RESOLVED = "resolved"
    CLOSED = "closed"
    REOPENED = "reopened"


class TicketCategory(str, enum.Enum):
    """Ticket categories"""
    PAYROLL = "payroll"
    BENEFITS = "benefits"
    LEAVE = "leave"
    ATTENDANCE = "attendance"
    PERFORMANCE = "performance"
    IT_SUPPORT = "it_support"
    POLICY_QUESTION = "policy_question"
    DOCUMENT_REQUEST = "document_request"
    ONBOARDING = "onboarding"
    OFFBOARDING = "offboarding"
    GENERAL = "general"
    OTHER = "other"


class TicketType(str, enum.Enum):
    """Ticket types"""
    QUESTION = "question"
    ISSUE = "issue"
    REQUEST = "request"
    COMPLAINT = "complaint"
    FEEDBACK = "feedback"


class TicketSLA(Base):
    """Service Level Agreement definitions"""
    __tablename__ = "ticket_slas"
    
    sla_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    sla_name = Column(String(200), nullable=False)
    category = Column(SQLEnum(TicketCategory))
    priority = Column(SQLEnum(TicketPriority), nullable=False)
    
    # Time targets (in hours)
    first_response_time = Column(Integer, nullable=False)  # Hours
    resolution_time = Column(Integer, nullable=False)  # Hours
    
    # Working hours consideration
    business_hours_only = Column(Boolean, default=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class Ticket(Base):
    """Employee support tickets"""
    __tablename__ = "tickets"
    
    ticket_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Ticket identification
    ticket_number = Column(String(50), unique=True, nullable=False, index=True)
    
    # Requester
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    
    # Ticket details
    subject = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(SQLEnum(TicketCategory), nullable=False, index=True)
    ticket_type = Column(SQLEnum(TicketType), default=TicketType.QUESTION)
    priority = Column(SQLEnum(TicketPriority), default=TicketPriority.MEDIUM, index=True)
    
    # Status
    status = Column(SQLEnum(TicketStatus), default=TicketStatus.OPEN, index=True)
    
    # Assignment
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), index=True)
    assigned_at = Column(DateTime(timezone=True))
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    
    # SLA
    sla_id = Column(UUID(as_uuid=True), ForeignKey("ticket_slas.sla_id"))
    first_response_due = Column(DateTime(timezone=True))
    resolution_due = Column(DateTime(timezone=True))
    first_response_at = Column(DateTime(timezone=True))
    resolved_at = Column(DateTime(timezone=True))
    closed_at = Column(DateTime(timezone=True))
    
    # Resolution
    resolution = Column(Text)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    satisfaction_rating = Column(Integer)  # 1-5 stars
    satisfaction_comment = Column(Text)
    
    # Attachments
    attachments = Column(JSON)  # Array of file URLs
    
    # Related entities
    related_entity_type = Column(String(50))  # leave_request, expense, etc.
    related_entity_id = Column(UUID(as_uuid=True))
    
    # Tags
    tags = Column(JSON)  # Array of tags for searching
    
    # Flags
    is_escalated = Column(Boolean, default=False)
    escalated_at = Column(DateTime(timezone=True))
    is_internal = Column(Boolean, default=False)
    
    # Metadata
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    comments = relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan")
    history = relationship("TicketHistory", back_populates="ticket", cascade="all, delete-orphan")


class TicketComment(Base):
    """Comments/replies on tickets"""
    __tablename__ = "ticket_comments"
    
    comment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.ticket_id"), nullable=False, index=True)
    
    comment_text = Column(Text, nullable=False)
    is_internal_note = Column(Boolean, default=False)  # Only visible to HR team
    is_solution = Column(Boolean, default=False)
    
    # Attachments
    attachments = Column(JSON)
    
    # Author
    commented_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False)
    commented_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    ticket = relationship("Ticket", back_populates="comments")


class TicketHistory(Base):
    """Audit trail for ticket changes"""
    __tablename__ = "ticket_history"
    
    history_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey("tickets.ticket_id"), nullable=False, index=True)
    
    action = Column(String(100), nullable=False)
    field_changed = Column(String(100))
    old_value = Column(Text)
    new_value = Column(Text)
    
    changed_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    ticket = relationship("Ticket", back_populates="history")


class KnowledgeBaseCategory(Base):
    """Categories for knowledge base articles"""
    __tablename__ = "kb_categories"
    
    category_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    category_name = Column(String(200), nullable=False)
    description = Column(Text)
    icon = Column(String(100))
    display_order = Column(Integer, default=0)
    
    parent_category_id = Column(UUID(as_uuid=True), ForeignKey("kb_categories.category_id"))
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    articles = relationship("KnowledgeBaseArticle", back_populates="category")


class KnowledgeBaseArticle(Base):
    """Knowledge base articles/FAQs"""
    __tablename__ = "kb_articles"
    
    article_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("kb_categories.category_id"), index=True)
    
    # Article details
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(Text)
    
    # SEO
    slug = Column(String(500), unique=True, index=True)
    keywords = Column(JSON)  # Array of keywords for search
    
    # Status
    is_published = Column(Boolean, default=False)
    published_at = Column(DateTime(timezone=True))
    
    # Authorship
    author_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    
    # Metrics
    view_count = Column(Integer, default=0)
    helpful_count = Column(Integer, default=0)
    not_helpful_count = Column(Integer, default=0)
    
    # Attachments
    attachments = Column(JSON)
    
    # Display
    display_order = Column(Integer, default=0)
    featured = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    category = relationship("KnowledgeBaseCategory", back_populates="articles")


class TicketTemplate(Base):
    """Templates for common ticket types"""
    __tablename__ = "ticket_templates"
    
    template_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    template_name = Column(String(200), nullable=False)
    category = Column(SQLEnum(TicketCategory), nullable=False)
    ticket_type = Column(SQLEnum(TicketType))
    
    subject_template = Column(String(500))
    description_template = Column(Text)
    
    default_priority = Column(SQLEnum(TicketPriority))
    default_assigned_to = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    
    required_fields = Column(JSON)  # Array of field names that must be filled
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
