"""
Pydantic schemas for Employee Lifecycle and Dashboard
Request/response validation for career development and dashboard features
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID


# Emergency Contact
class EmergencyContactCreate(BaseModel):
    """Create emergency contact"""
    full_name: str = Field(..., min_length=1, max_length=255)
    relationship: str
    primary_phone: str = Field(..., min_length=1, max_length=20)
    secondary_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    is_primary: bool = False
    priority_order: int = 1


class EmergencyContactUpdate(BaseModel):
    """Update emergency contact"""
    full_name: Optional[str] = None
    relationship: Optional[str] = None
    primary_phone: Optional[str] = None
    secondary_phone: Optional[str] = None
    address: Optional[str] = None
    is_primary: Optional[bool] = None


class EmergencyContactResponse(BaseModel):
    """Emergency contact response"""
    contact_id: UUID
    employee_id: UUID
    full_name: str
    relationship: str
    primary_phone: str
    secondary_phone: Optional[str]
    is_primary: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Career Goal
class CareerGoalCreate(BaseModel):
    """Create career goal"""
    goal_title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    target_position: Optional[str] = None
    target_date: Optional[date] = None
    mentor_id: Optional[UUID] = None
    development_plan: Optional[str] = None
    required_skills: Optional[List[str]] = None


class CareerGoalUpdate(BaseModel):
    """Update career goal"""
    goal_title: Optional[str] = None
    description: Optional[str] = None
    target_position: Optional[str] = None
    target_date: Optional[date] = None
    status: Optional[str] = None
    progress_percentage: Optional[int] = Field(None, ge=0, le=100)
    development_plan: Optional[str] = None


class CareerGoalResponse(BaseModel):
    """Career goal response"""
    goal_id: UUID
    employee_id: UUID
    goal_title: str
    description: Optional[str]
    target_position: Optional[str]
    target_date: Optional[date]
    status: str
    progress_percentage: int
    mentor_id: Optional[UUID]
    manager_reviewed: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Employee Competency
class EmployeeCompetencyCreate(BaseModel):
    """Create competency assessment"""
    competency_name: str = Field(..., min_length=1, max_length=255)
    competency_category: Optional[str] = None
    current_level: int = Field(..., ge=1, le=5)
    target_level: int = Field(..., ge=1, le=5)
    assessed_date: date
    next_assessment_date: Optional[date] = None
    development_actions: Optional[List[dict]] = None


class EmployeeCompetencyResponse(BaseModel):
    """Employee competency response"""
    competency_id: UUID
    employee_id: UUID
    competency_name: str
    competency_category: Optional[str]
    current_level: int
    target_level: int
    assessed_date: date
    next_assessment_date: Optional[date]
    assessed_by: Optional[UUID]

    class Config:
        from_attributes = True


# Dashboard Widget
class DashboardWidgetCreate(BaseModel):
    """Create dashboard widget"""
    widget_name: str = Field(..., min_length=1, max_length=200)
    widget_type: str
    description: Optional[str] = None
    icon: Optional[str] = None
    default_size: str = "medium"
    default_config: Optional[dict] = None
    available_for_roles: Optional[List[str]] = None


class DashboardWidgetResponse(BaseModel):
    """Dashboard widget response"""
    widget_id: UUID
    organization_id: UUID
    widget_name: str
    widget_type: str
    description: Optional[str]
    icon: Optional[str]
    default_size: str
    is_active: bool

    class Config:
        from_attributes = True


# Employee Dashboard
class EmployeeDashboardUpdate(BaseModel):
    """Update employee dashboard"""
    widgets: List[dict]  # Array of widget configurations
    theme: Optional[str] = None
    compact_mode: Optional[bool] = None


class EmployeeDashboardResponse(BaseModel):
    """Employee dashboard response"""
    dashboard_id: UUID
    employee_id: UUID
    widgets: List[dict]
    theme: str
    compact_mode: bool
    modified_at: Optional[datetime]

    class Config:
        from_attributes = True


# Quick Action
class QuickActionCreate(BaseModel):
    """Create quick action"""
    action_name: str = Field(..., min_length=1, max_length=200)
    action_type: str
    description: Optional[str] = None
    icon: Optional[str] = None
    icon_color: Optional[str] = None
    target_url: Optional[str] = None
    target_modal: Optional[str] = None
    available_for_roles: Optional[List[str]] = None
    display_order: int = 0


class QuickActionResponse(BaseModel):
    """Quick action response"""
    action_id: UUID
    organization_id: UUID
    action_name: str
    action_type: str
    icon: Optional[str]
    icon_color: Optional[str]
    target_url: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


# Notification Preference
class NotificationPreferenceUpdate(BaseModel):
    """Update notification preferences"""
    email_enabled: Optional[bool] = None
    email_frequency: Optional[str] = None
    push_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    leave_notifications: Optional[bool] = None
    attendance_notifications: Optional[bool] = None
    expense_notifications: Optional[bool] = None
    performance_notifications: Optional[bool] = None
    announcement_notifications: Optional[bool] = None
    recognition_notifications: Optional[bool] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None


class NotificationPreferenceResponse(BaseModel):
    """Notification preference response"""
    preference_id: UUID
    employee_id: UUID
    email_enabled: bool
    email_frequency: str
    push_enabled: bool
    sms_enabled: bool
    leave_notifications: bool
    attendance_notifications: bool
    expense_notifications: bool
    quiet_hours_enabled: bool

    class Config:
        from_attributes = True


# Employee Lifecycle Event
class EmployeeLifecycleEventCreate(BaseModel):
    """Create lifecycle event"""
    event_type: str
    event_date: date
    description: Optional[str] = None
    from_value: Optional[str] = None
    to_value: Optional[str] = None
    documents: Optional[List[str]] = None


class EmployeeLifecycleEventResponse(BaseModel):
    """Lifecycle event response"""
    event_id: UUID
    employee_id: UUID
    organization_id: UUID
    event_type: str
    event_date: date
    description: Optional[str]
    from_value: Optional[str]
    to_value: Optional[str]
    approved_by: Optional[UUID]
    approved_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
