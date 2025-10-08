"""Pydantic schemas for request/response validation"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from enum import Enum


# Base schemas
class BaseResponse(BaseModel):
    """Base response schema"""
    success: bool = True
    message: Optional[str] = None


# Auth schemas
class LoginRequest(BaseModel):
    """Login request schema"""
    email: EmailStr
    password: str = Field(..., min_length=8)


class LoginResponse(BaseResponse):
    """Login response schema"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RegisterRequest(BaseModel):
    """User registration request"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    organization_name: str = Field(..., min_length=2)
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)


class PasswordResetRequest(BaseModel):
    """Password reset request"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation"""
    token: str
    new_password: str = Field(..., min_length=8)


# Employee schemas
class EmployeeCreate(BaseModel):
    """Employee creation schema"""
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    middle_name: Optional[str] = None
    employee_code: str = Field(..., min_length=1, max_length=50)
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    nationality: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    hire_date: Optional[date] = None
    job_title: Optional[str] = None
    department_id: Optional[UUID] = None
    manager_id: Optional[UUID] = None
    employment_type: Optional[str] = "full_time"
    work_location: Optional[str] = None


class EmployeeUpdate(BaseModel):
    """Employee update schema"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    nationality: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    job_title: Optional[str] = None
    department_id: Optional[UUID] = None
    manager_id: Optional[UUID] = None
    employment_type: Optional[str] = None
    work_location: Optional[str] = None


class EmployeeResponse(BaseModel):
    """Employee response schema"""
    employee_id: UUID
    employee_code: str
    first_name: str
    last_name: str
    middle_name: Optional[str]
    email: str
    phone: Optional[str]
    job_title: Optional[str]
    department_id: Optional[UUID]
    employment_status: str
    employment_type: str
    hire_date: Optional[date]
    profile_picture_url: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Attendance schemas
class AttendanceCheckIn(BaseModel):
    """Attendance check-in schema"""
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    location: Optional[str] = None
    work_type: str = Field(default="office")
    notes: Optional[str] = None


class AttendanceCheckOut(BaseModel):
    """Attendance check-out schema"""
    attendance_id: UUID
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    location: Optional[str] = None
    notes: Optional[str] = None


class AttendanceResponse(BaseModel):
    """Attendance response schema"""
    attendance_id: UUID
    employee_id: UUID
    attendance_date: date
    check_in_time: Optional[datetime]
    check_out_time: Optional[datetime]
    work_hours: Optional[float]
    overtime_hours: Optional[float]
    status: str
    work_type: str
    
    class Config:
        from_attributes = True


class AttendanceRegularization(BaseModel):
    """Attendance regularization request"""
    attendance_date: date
    requested_check_in: datetime
    requested_check_out: datetime
    reason: str = Field(..., min_length=10)
    supporting_document_url: Optional[str] = None


# Leave schemas
class LeaveRequestCreate(BaseModel):
    """Leave request creation schema"""
    leave_type_id: UUID
    start_date: date
    end_date: date
    reason: str = Field(..., min_length=10)
    
    @validator('end_date')
    def end_date_must_be_after_start_date(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v


class LeaveRequestUpdate(BaseModel):
    """Leave request update schema"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    reason: Optional[str] = None


class LeaveApproval(BaseModel):
    """Leave approval/rejection schema"""
    status: str = Field(..., pattern="^(approved|rejected)$")
    comments: Optional[str] = None


class LeaveResponse(BaseModel):
    """Leave response schema"""
    leave_request_id: UUID
    employee_id: UUID
    leave_type_id: UUID
    start_date: date
    end_date: date
    total_days: float
    reason: str
    status: str
    approver_id: Optional[UUID]
    approved_date: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Pagination schemas
class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=10, ge=1, le=100)


class PaginatedResponse(BaseResponse):
    """Paginated response schema"""
    data: List[dict]
    pagination: dict
    
    class Config:
        from_attributes = True


# Department schemas
class DepartmentCreate(BaseModel):
    """Department creation schema"""
    department_name: str = Field(..., min_length=1, max_length=255)
    department_code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    parent_department_id: Optional[UUID] = None


class DepartmentResponse(BaseModel):
    """Department response schema"""
    department_id: UUID
    department_name: str
    department_code: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
