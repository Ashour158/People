"""
Pydantic validators/schemas for Leave Management module.
"""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, validator
from enum import Enum


class HalfDaySession(str, Enum):
    """Half-day session options."""
    FIRST_HALF = "first_half"
    SECOND_HALF = "second_half"


class LeaveStatus(str, Enum):
    """Leave application status."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class ApplyLeaveSchema(BaseModel):
    """Schema for applying for leave."""
    leave_type_id: str = Field(..., description="UUID of the leave type")
    from_date: date = Field(..., description="Leave start date")
    to_date: date = Field(..., description="Leave end date")
    is_half_day: bool = Field(default=False, description="Is this a half-day leave")
    half_day_session: Optional[HalfDaySession] = Field(None, description="Half-day session")
    reason: str = Field(..., min_length=10, max_length=500, description="Reason for leave")
    contact_details: Optional[str] = Field(None, max_length=255, description="Contact details during leave")
    supporting_document_url: Optional[str] = Field(None, description="URL of supporting document")
    delegate_to_employee_id: Optional[str] = Field(None, description="Employee to delegate work to")
    
    @validator('to_date')
    def validate_dates(cls, v, values):
        """Ensure to_date is not before from_date."""
        if 'from_date' in values and v < values['from_date']:
            raise ValueError('to_date must be on or after from_date')
        return v
    
    @validator('half_day_session')
    def validate_half_day_session(cls, v, values):
        """Ensure half_day_session is provided when is_half_day is True."""
        if values.get('is_half_day') and not v:
            raise ValueError('half_day_session is required when is_half_day is True')
        return v


class LeaveAction(str, Enum):
    """Leave approval actions."""
    APPROVE = "approve"
    REJECT = "reject"


class ApproveRejectLeaveSchema(BaseModel):
    """Schema for approving or rejecting leave."""
    action: LeaveAction = Field(..., description="Action to take")
    comments: Optional[str] = Field(None, max_length=500, description="Approver comments")
    rejection_reason: Optional[str] = Field(None, description="Reason for rejection")
    
    @validator('rejection_reason')
    def validate_rejection_reason(cls, v, values):
        """Ensure rejection_reason is provided when action is reject."""
        if values.get('action') == LeaveAction.REJECT and not v:
            raise ValueError('rejection_reason is required when rejecting leave')
        return v


class CancelLeaveSchema(BaseModel):
    """Schema for cancelling leave."""
    cancellation_reason: str = Field(..., min_length=10, description="Reason for cancellation")


class LeaveResponse(BaseModel):
    """Response model for leave application."""
    leave_application_id: str
    employee_id: str
    organization_id: str
    leave_type_id: str
    from_date: date
    to_date: date
    is_half_day: bool
    half_day_session: Optional[str]
    total_days: float
    reason: str
    leave_status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class LeaveBalanceResponse(BaseModel):
    """Response model for leave balance."""
    leave_type_id: str
    leave_type_name: str
    leave_code: str
    allocated_days: float
    used_days: float
    available_days: float
    
    class Config:
        from_attributes = True
