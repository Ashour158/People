"""
Pydantic validators/schemas for Attendance Management module.
"""
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class WorkType(str, Enum):
    """Work type options."""
    OFFICE = "office"
    REMOTE = "remote"
    CLIENT_SITE = "client_site"
    FIELD_WORK = "field_work"


class AttendanceStatus(str, Enum):
    """Attendance status."""
    PRESENT = "present"
    ABSENT = "absent"
    HALF_DAY = "half_day"
    LATE = "late"
    ON_LEAVE = "on_leave"


class CheckInSchema(BaseModel):
    """Schema for check-in."""
    check_in_time: Optional[datetime] = Field(None, description="Check-in time (defaults to now)")
    latitude: Optional[float] = Field(None, ge=-90, le=90, description="Latitude")
    longitude: Optional[float] = Field(None, ge=-180, le=180, description="Longitude")
    location: Optional[str] = Field(None, max_length=255, description="Location description")
    notes: Optional[str] = Field(None, max_length=500, description="Check-in notes")
    work_type: WorkType = Field(default=WorkType.OFFICE, description="Type of work")


class CheckOutSchema(BaseModel):
    """Schema for check-out."""
    attendance_id: Optional[str] = Field(None, description="Attendance record UUID (optional)")
    check_out_time: Optional[datetime] = Field(None, description="Check-out time (defaults to now)")
    latitude: Optional[float] = Field(None, ge=-90, le=90, description="Latitude")
    longitude: Optional[float] = Field(None, ge=-180, le=180, description="Longitude")
    location: Optional[str] = Field(None, max_length=255, description="Location description")
    notes: Optional[str] = Field(None, max_length=500, description="Check-out notes")


class RegularizationRequestSchema(BaseModel):
    """Schema for attendance regularization request."""
    attendance_date: date = Field(..., description="Date to regularize")
    check_in_time: datetime = Field(..., description="Requested check-in time")
    check_out_time: Optional[datetime] = Field(None, description="Requested check-out time")
    reason: str = Field(..., min_length=10, max_length=500, description="Reason for regularization")


class RegularizationActionSchema(BaseModel):
    """Schema for approving/rejecting regularization."""
    action: str = Field(..., pattern="^(approve|reject)$", description="Action to take")
    comments: Optional[str] = Field(None, max_length=500, description="Approver comments")


class AttendanceResponse(BaseModel):
    """Response model for attendance record."""
    attendance_id: str
    employee_id: str
    organization_id: str
    attendance_date: date
    check_in_time: Optional[datetime]
    check_out_time: Optional[datetime]
    total_hours: Optional[float]
    attendance_status: str
    created_at: datetime
    
    class Config:
        from_attributes = True
