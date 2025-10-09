"""
Pydantic schemas for integration models
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID

from app.models.integrations import IntegrationType, IntegrationStatus


# Base Integration Schemas
class IntegrationBase(BaseModel):
    integration_type: IntegrationType
    integration_name: str
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    status: Optional[IntegrationStatus] = IntegrationStatus.PENDING
    auth_type: Optional[str] = None
    is_enabled: bool = True


class IntegrationCreate(IntegrationBase):
    organization_id: UUID
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None


class IntegrationUpdate(BaseModel):
    integration_name: Optional[str] = None
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    status: Optional[IntegrationStatus] = None
    is_enabled: Optional[bool] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None


class IntegrationResponse(IntegrationBase):
    integration_id: UUID
    organization_id: UUID
    token_expires_at: Optional[datetime] = None
    last_sync_at: Optional[datetime] = None
    created_at: datetime
    modified_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Slack Integration Schemas
class SlackWorkspaceCreate(BaseModel):
    integration_id: UUID
    organization_id: UUID
    slack_team_id: str
    slack_team_name: str
    slack_workspace_url: Optional[str] = None
    bot_user_id: Optional[str] = None
    bot_access_token: str
    default_channel: Optional[str] = "#general"
    hr_channel: Optional[str] = None
    leave_channel: Optional[str] = None
    attendance_channel: Optional[str] = None


class SlackWorkspaceUpdate(BaseModel):
    default_channel: Optional[str] = None
    hr_channel: Optional[str] = None
    leave_channel: Optional[str] = None
    attendance_channel: Optional[str] = None
    notify_leave_requests: Optional[bool] = None
    notify_approvals: Optional[bool] = None
    notify_attendance: Optional[bool] = None
    notify_birthdays: Optional[bool] = None
    notify_anniversaries: Optional[bool] = None
    is_active: Optional[bool] = None


class SlackWorkspaceResponse(BaseModel):
    workspace_id: UUID
    integration_id: UUID
    organization_id: UUID
    slack_team_id: str
    slack_team_name: str
    slack_workspace_url: Optional[str] = None
    default_channel: Optional[str] = None
    hr_channel: Optional[str] = None
    leave_channel: Optional[str] = None
    attendance_channel: Optional[str] = None
    notify_leave_requests: bool
    notify_approvals: bool
    notify_attendance: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class SlackNotificationRequest(BaseModel):
    channel: str
    message: str
    user_id: Optional[str] = None
    attachments: Optional[List[Dict[str, Any]]] = None
    blocks: Optional[List[Dict[str, Any]]] = None


# Zoom Integration Schemas
class ZoomAccountCreate(BaseModel):
    integration_id: UUID
    organization_id: UUID
    zoom_account_id: Optional[str] = None
    zoom_user_email: EmailStr
    api_key: str
    api_secret: str
    default_duration: int = 60
    auto_recording: bool = False
    waiting_room: bool = True


class ZoomAccountUpdate(BaseModel):
    default_duration: Optional[int] = None
    auto_recording: Optional[bool] = None
    waiting_room: Optional[bool] = None
    enable_interview_scheduling: Optional[bool] = None
    enable_onboarding_meetings: Optional[bool] = None
    is_active: Optional[bool] = None


class ZoomAccountResponse(BaseModel):
    account_id: UUID
    integration_id: UUID
    organization_id: UUID
    zoom_user_email: str
    default_duration: int
    auto_recording: bool
    waiting_room: bool
    enable_interview_scheduling: bool
    enable_onboarding_meetings: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class ZoomMeetingCreate(BaseModel):
    account_id: UUID
    organization_id: UUID
    host_id: UUID
    topic: str
    agenda: Optional[str] = None
    meeting_type: str = "team_meeting"
    start_time: datetime
    duration: int = 60
    timezone: str = "UTC"
    waiting_room: bool = True
    auto_recording: Optional[str] = "none"
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[UUID] = None


class ZoomMeetingResponse(BaseModel):
    meeting_id: UUID
    account_id: UUID
    organization_id: UUID
    zoom_meeting_id: Optional[str] = None
    meeting_number: Optional[str] = None
    host_id: UUID
    topic: str
    agenda: Optional[str] = None
    meeting_type: str
    start_time: datetime
    duration: int
    join_url: Optional[str] = None
    meeting_password: Optional[str] = None
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Job Board Integration Schemas
class JobBoardCreate(BaseModel):
    integration_id: UUID
    organization_id: UUID
    board_name: str
    board_type: str
    api_key: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    company_page_url: Optional[str] = None
    auto_post_jobs: bool = False
    auto_sync_applicants: bool = True


class JobBoardUpdate(BaseModel):
    api_key: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    auto_post_jobs: Optional[bool] = None
    auto_sync_applicants: Optional[bool] = None
    is_active: Optional[bool] = None


class JobBoardResponse(BaseModel):
    board_id: UUID
    integration_id: UUID
    organization_id: UUID
    board_name: str
    board_type: str
    company_page_url: Optional[str] = None
    auto_post_jobs: bool
    auto_sync_applicants: bool
    supports_job_posting: bool
    supports_applicant_tracking: bool
    is_active: bool
    last_sync_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class JobBoardPostingCreate(BaseModel):
    board_id: UUID
    organization_id: UUID
    job_posting_id: UUID
    external_posting_id: Optional[str] = None
    external_url: Optional[str] = None


class JobBoardPostingResponse(BaseModel):
    posting_id: UUID
    board_id: UUID
    organization_id: UUID
    job_posting_id: UUID
    external_posting_id: Optional[str] = None
    external_url: Optional[str] = None
    status: str
    published_at: Optional[datetime] = None
    views_count: int
    applications_count: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Payment Gateway Schemas
class PaymentGatewayCreate(BaseModel):
    integration_id: UUID
    organization_id: UUID
    gateway_name: str
    gateway_type: str
    api_key: Optional[str] = None
    secret_key: Optional[str] = None
    publishable_key: Optional[str] = None
    currency: str = "USD"
    is_default: bool = False


class PaymentGatewayUpdate(BaseModel):
    api_key: Optional[str] = None
    secret_key: Optional[str] = None
    is_default: Optional[bool] = None
    auto_process_payroll: Optional[bool] = None
    is_active: Optional[bool] = None


class PaymentGatewayResponse(BaseModel):
    gateway_id: UUID
    integration_id: UUID
    organization_id: UUID
    gateway_name: str
    gateway_type: str
    currency: str
    is_default: bool
    auto_process_payroll: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Biometric Device Schemas
class BiometricDeviceCreate(BaseModel):
    integration_id: UUID
    organization_id: UUID
    device_name: str
    device_type: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: str
    ip_address: Optional[str] = None
    location_name: str
    latitude: Optional[str] = None
    longitude: Optional[str] = None


class BiometricDeviceUpdate(BaseModel):
    device_name: Optional[str] = None
    location_name: Optional[str] = None
    ip_address: Optional[str] = None
    is_online: Optional[bool] = None
    is_active: Optional[bool] = None


class BiometricDeviceResponse(BaseModel):
    device_id: UUID
    integration_id: UUID
    organization_id: UUID
    device_name: str
    device_type: str
    manufacturer: Optional[str] = None
    serial_number: str
    ip_address: Optional[str] = None
    location_name: str
    is_online: bool
    is_active: bool
    last_sync_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# Geofence Schemas
class GeofenceLocationCreate(BaseModel):
    organization_id: UUID
    location_name: str
    location_type: str
    address: Optional[str] = None
    latitude: str
    longitude: str
    radius_meters: int = 100
    enable_check_in: bool = True
    enable_check_out: bool = True
    strict_mode: bool = False


class GeofenceLocationUpdate(BaseModel):
    location_name: Optional[str] = None
    address: Optional[str] = None
    radius_meters: Optional[int] = None
    enable_check_in: Optional[bool] = None
    enable_check_out: Optional[bool] = None
    strict_mode: Optional[bool] = None
    is_active: Optional[bool] = None


class GeofenceLocationResponse(BaseModel):
    geofence_id: UUID
    organization_id: UUID
    location_name: str
    location_type: str
    address: Optional[str] = None
    latitude: str
    longitude: str
    radius_meters: int
    enable_check_in: bool
    enable_check_out: bool
    strict_mode: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Holiday Calendar Schemas
class HolidayCalendarCreate(BaseModel):
    organization_id: UUID
    calendar_name: str
    country_code: str
    region_code: Optional[str] = None
    source: str = "manual"
    is_default: bool = False
    auto_sync: bool = False


class HolidayCalendarUpdate(BaseModel):
    calendar_name: Optional[str] = None
    is_default: Optional[bool] = None
    auto_sync: Optional[bool] = None
    is_active: Optional[bool] = None


class HolidayCalendarResponse(BaseModel):
    calendar_id: UUID
    organization_id: UUID
    calendar_name: str
    country_code: str
    region_code: Optional[str] = None
    source: str
    is_default: bool
    auto_sync: bool
    is_active: bool
    last_sync_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class HolidayCreate(BaseModel):
    calendar_id: UUID
    organization_id: UUID
    holiday_name: str
    holiday_date: datetime
    holiday_type: str = "national"
    is_mandatory: bool = True
    is_paid: bool = True
    description: Optional[str] = None
    is_recurring: bool = False


class HolidayResponse(BaseModel):
    holiday_id: UUID
    calendar_id: UUID
    organization_id: UUID
    holiday_name: str
    holiday_date: datetime
    holiday_type: str
    is_mandatory: bool
    is_paid: bool
    description: Optional[str] = None
    is_recurring: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Notification Preferences
class NotificationPreferenceCreate(BaseModel):
    user_id: UUID
    organization_id: UUID
    email_enabled: bool = True
    slack_enabled: bool = False
    sms_enabled: bool = False
    push_enabled: bool = True
    in_app_enabled: bool = True


class NotificationPreferenceUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    slack_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    leave_requests: Optional[bool] = None
    leave_approvals: Optional[bool] = None
    attendance_reminders: Optional[bool] = None
    payroll_notifications: Optional[bool] = None
    digest_mode: Optional[bool] = None
    digest_frequency: Optional[str] = None


class NotificationPreferenceResponse(BaseModel):
    preference_id: UUID
    user_id: UUID
    organization_id: UUID
    email_enabled: bool
    slack_enabled: bool
    sms_enabled: bool
    push_enabled: bool
    in_app_enabled: bool
    leave_requests: bool
    leave_approvals: bool
    attendance_reminders: bool
    payroll_notifications: bool
    digest_mode: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Integration Log Schemas
class IntegrationLogResponse(BaseModel):
    log_id: UUID
    integration_id: UUID
    organization_id: UUID
    event_type: str
    event_name: Optional[str] = None
    status_code: Optional[int] = None
    is_success: bool
    error_message: Optional[str] = None
    duration_ms: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
