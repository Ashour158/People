"""
Pydantic schemas for Helpdesk/Ticketing System
Request/response validation for support tickets and knowledge base
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID


# Ticket Schemas
class TicketCreate(BaseModel):
    """Create support ticket"""
    subject: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    category: str
    ticket_type: str = "question"
    priority: str = "medium"
    attachments: Optional[List[str]] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[UUID] = None


class TicketUpdate(BaseModel):
    """Update ticket"""
    subject: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None


class TicketAssign(BaseModel):
    """Assign ticket to agent"""
    ticket_id: UUID
    assigned_to: UUID


class TicketResolve(BaseModel):
    """Resolve ticket"""
    ticket_id: UUID
    resolution: str = Field(..., min_length=1)


class TicketClose(BaseModel):
    """Close ticket"""
    ticket_id: UUID
    satisfaction_rating: Optional[int] = Field(None, ge=1, le=5)
    satisfaction_comment: Optional[str] = None


class TicketEscalate(BaseModel):
    """Escalate ticket"""
    ticket_id: UUID
    escalation_reason: str


class TicketResponse(BaseModel):
    """Ticket response"""
    ticket_id: UUID
    organization_id: UUID
    ticket_number: str
    employee_id: UUID
    subject: str
    description: str
    category: str
    ticket_type: str
    priority: str
    status: str
    assigned_to: Optional[UUID]
    assigned_at: Optional[datetime]
    first_response_due: Optional[datetime]
    resolution_due: Optional[datetime]
    first_response_at: Optional[datetime]
    resolved_at: Optional[datetime]
    closed_at: Optional[datetime]
    resolution: Optional[str]
    is_escalated: bool
    tags: Optional[List[str]]
    created_at: datetime
    modified_at: Optional[datetime]

    class Config:
        from_attributes = True


class TicketListResponse(BaseModel):
    """Paginated ticket list"""
    tickets: List[TicketResponse]
    total: int
    page: int
    limit: int


# Ticket Comment Schemas
class TicketCommentCreate(BaseModel):
    """Create ticket comment"""
    comment_text: str = Field(..., min_length=1)
    is_internal_note: bool = False
    is_solution: bool = False
    attachments: Optional[List[str]] = None


class TicketCommentResponse(BaseModel):
    """Ticket comment response"""
    comment_id: UUID
    ticket_id: UUID
    comment_text: str
    is_internal_note: bool
    is_solution: bool
    commented_by: UUID
    commented_at: datetime

    class Config:
        from_attributes = True


# SLA Schemas
class TicketSLACreate(BaseModel):
    """Create SLA definition"""
    sla_name: str = Field(..., min_length=1, max_length=200)
    category: Optional[str] = None
    priority: str
    first_response_time: int = Field(..., gt=0)  # Hours
    resolution_time: int = Field(..., gt=0)  # Hours
    business_hours_only: bool = True


class TicketSLAUpdate(BaseModel):
    """Update SLA"""
    sla_name: Optional[str] = None
    first_response_time: Optional[int] = None
    resolution_time: Optional[int] = None
    business_hours_only: Optional[bool] = None
    is_active: Optional[bool] = None


class TicketSLAResponse(BaseModel):
    """SLA response"""
    sla_id: UUID
    organization_id: UUID
    sla_name: str
    category: Optional[str]
    priority: str
    first_response_time: int
    resolution_time: int
    business_hours_only: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Knowledge Base Schemas
class KBCategoryCreate(BaseModel):
    """Create knowledge base category"""
    category_name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    icon: Optional[str] = None
    parent_category_id: Optional[UUID] = None
    display_order: int = 0


class KBCategoryUpdate(BaseModel):
    """Update KB category"""
    category_name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class KBCategoryResponse(BaseModel):
    """KB category response"""
    category_id: UUID
    organization_id: UUID
    category_name: str
    description: Optional[str]
    icon: Optional[str]
    display_order: int
    parent_category_id: Optional[UUID]
    is_active: bool
    article_count: Optional[int] = 0

    class Config:
        from_attributes = True


class KBArticleCreate(BaseModel):
    """Create knowledge base article"""
    category_id: Optional[UUID] = None
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)
    summary: Optional[str] = None
    keywords: Optional[List[str]] = None
    attachments: Optional[List[str]] = None
    is_published: bool = False
    featured: bool = False


class KBArticleUpdate(BaseModel):
    """Update KB article"""
    category_id: Optional[UUID] = None
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    keywords: Optional[List[str]] = None
    is_published: Optional[bool] = None
    featured: Optional[bool] = None


class KBArticleResponse(BaseModel):
    """KB article response"""
    article_id: UUID
    organization_id: UUID
    category_id: Optional[UUID]
    title: str
    content: str
    summary: Optional[str]
    slug: str
    keywords: Optional[List[str]]
    is_published: bool
    published_at: Optional[datetime]
    author_id: Optional[UUID]
    view_count: int
    helpful_count: int
    not_helpful_count: int
    featured: bool
    created_at: datetime
    modified_at: Optional[datetime]

    class Config:
        from_attributes = True


class KBArticleListResponse(BaseModel):
    """Paginated KB article list"""
    articles: List[KBArticleResponse]
    total: int
    page: int
    limit: int


class KBArticleVote(BaseModel):
    """Vote on article helpfulness"""
    article_id: UUID
    is_helpful: bool


# Ticket Template Schemas
class TicketTemplateCreate(BaseModel):
    """Create ticket template"""
    template_name: str = Field(..., min_length=1, max_length=200)
    category: str
    ticket_type: Optional[str] = None
    subject_template: Optional[str] = None
    description_template: Optional[str] = None
    default_priority: Optional[str] = None
    default_assigned_to: Optional[UUID] = None
    required_fields: Optional[List[str]] = None


class TicketTemplateResponse(BaseModel):
    """Ticket template response"""
    template_id: UUID
    organization_id: UUID
    template_name: str
    category: str
    ticket_type: Optional[str]
    subject_template: Optional[str]
    description_template: Optional[str]
    default_priority: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Statistics
class TicketStatistics(BaseModel):
    """Ticket statistics"""
    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    resolved_tickets: int
    closed_tickets: int
    avg_resolution_time_hours: Optional[float]
    sla_compliance_rate: Optional[float]
    avg_satisfaction_rating: Optional[float]


class AgentPerformance(BaseModel):
    """Agent performance metrics"""
    agent_id: UUID
    agent_name: str
    assigned_tickets: int
    resolved_tickets: int
    avg_resolution_time_hours: Optional[float]
    satisfaction_rating: Optional[float]


# Base response
class BaseResponse(BaseModel):
    """Base response schema"""
    success: bool = True
    message: Optional[str] = None
