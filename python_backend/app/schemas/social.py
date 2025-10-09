"""
Pydantic schemas for Social and Collaboration Features
Request/response validation for announcements, recognition, and social features
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID


# Announcement
class AnnouncementCreate(BaseModel):
    """Create announcement"""
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)
    announcement_type: str = "general"
    priority: str = "medium"
    is_published: bool = False
    target_all: bool = True
    target_departments: Optional[List[UUID]] = None
    target_employees: Optional[List[UUID]] = None
    banner_image_url: Optional[str] = None
    attachments: Optional[List[str]] = None
    is_pinned: bool = False
    show_on_login: bool = False
    expires_at: Optional[datetime] = None
    allow_comments: bool = True
    allow_reactions: bool = True


class AnnouncementUpdate(BaseModel):
    """Update announcement"""
    title: Optional[str] = None
    content: Optional[str] = None
    priority: Optional[str] = None
    is_published: Optional[bool] = None
    is_pinned: Optional[bool] = None
    expires_at: Optional[datetime] = None


class AnnouncementResponse(BaseModel):
    """Announcement response"""
    announcement_id: UUID
    organization_id: UUID
    title: str
    content: str
    announcement_type: str
    priority: str
    is_published: bool
    published_at: Optional[datetime]
    author_id: UUID
    is_pinned: bool
    view_count: int
    comment_count: Optional[int] = 0
    reaction_count: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True


# Recognition
class RecognitionCreate(BaseModel):
    """Create recognition"""
    given_to: UUID
    title: str = Field(..., min_length=1, max_length=500)
    message: str = Field(..., min_length=1)
    recognition_type: str
    values: Optional[List[str]] = None
    competencies: Optional[List[str]] = None
    visibility: str = "public"
    has_reward: bool = False
    reward_points: int = 0
    reward_description: Optional[str] = None


class RecognitionResponse(BaseModel):
    """Recognition response"""
    recognition_id: UUID
    organization_id: UUID
    title: str
    message: str
    recognition_type: str
    given_by: UUID
    given_to: UUID
    values: Optional[List[str]]
    visibility: str
    has_reward: bool
    reward_points: int
    comment_count: Optional[int] = 0
    reaction_count: Optional[int] = 0
    published_at: datetime

    class Config:
        from_attributes = True


# Comments
class CommentCreate(BaseModel):
    """Create comment"""
    comment_text: str = Field(..., min_length=1)


class CommentResponse(BaseModel):
    """Comment response"""
    comment_id: UUID
    comment_text: str
    commented_by: UUID
    commented_at: datetime

    class Config:
        from_attributes = True


# Reactions
class ReactionCreate(BaseModel):
    """Create reaction"""
    reaction_type: str


# Employee Skills
class EmployeeSkillCreate(BaseModel):
    """Add employee skill"""
    skill_name: str = Field(..., min_length=1, max_length=200)
    skill_category: Optional[str] = None
    proficiency_level: Optional[str] = None
    years_of_experience: Optional[int] = None
    is_visible: bool = True


class EmployeeSkillResponse(BaseModel):
    """Employee skill response"""
    skill_id: UUID
    employee_id: UUID
    skill_name: str
    skill_category: Optional[str]
    proficiency_level: Optional[str]
    years_of_experience: Optional[int]
    endorsement_count: int
    is_verified: bool

    class Config:
        from_attributes = True


# Skill Endorsement
class SkillEndorsementCreate(BaseModel):
    """Endorse skill"""
    skill_id: UUID
    endorsement_comment: Optional[str] = None


# Employee Interests
class EmployeeInterestCreate(BaseModel):
    """Add employee interest"""
    interest_name: str = Field(..., min_length=1, max_length=200)
    interest_category: Optional[str] = None
    is_visible: bool = True


class EmployeeInterestResponse(BaseModel):
    """Employee interest response"""
    interest_id: UUID
    employee_id: UUID
    interest_name: str
    interest_category: Optional[str]

    class Config:
        from_attributes = True


# Company Values
class CompanyValueCreate(BaseModel):
    """Create company value"""
    value_name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    icon: Optional[str] = None
    display_order: int = 0


class CompanyValueResponse(BaseModel):
    """Company value response"""
    value_id: UUID
    organization_id: UUID
    value_name: str
    description: Optional[str]
    icon: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True
