"""
API endpoints for third-party integrations
Handles Slack, Zoom, Job Boards, and other external service integrations
"""
from fastapi import APIRouter, Depends, Query, Path, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.db.database import get_db
from app.schemas.integrations import (
    IntegrationCreate, IntegrationUpdate, IntegrationResponse,
    SlackWorkspaceCreate, SlackWorkspaceUpdate, SlackWorkspaceResponse, SlackNotificationRequest,
    ZoomAccountCreate, ZoomAccountUpdate, ZoomAccountResponse,
    ZoomMeetingCreate, ZoomMeetingResponse,
    JobBoardCreate, JobBoardUpdate, JobBoardResponse,
    JobBoardPostingCreate, JobBoardPostingResponse,
    PaymentGatewayCreate, PaymentGatewayUpdate, PaymentGatewayResponse,
    BiometricDeviceCreate, BiometricDeviceUpdate, BiometricDeviceResponse,
    GeofenceLocationCreate, GeofenceLocationUpdate, GeofenceLocationResponse,
    HolidayCalendarCreate, HolidayCalendarUpdate, HolidayCalendarResponse,
    HolidayCreate, HolidayResponse,
    NotificationPreferenceCreate, NotificationPreferenceUpdate, NotificationPreferenceResponse
)
from app.services.slack_service import SlackService
from app.services.zoom_service import ZoomService
from app.services.job_board_service import JobBoardService
from app.middleware.auth import get_current_user
from app.utils.response import success_response, error_response


router = APIRouter(prefix="/integrations", tags=["Integrations"])


# ==================== General Integration Endpoints ====================

@router.get("", response_model=List[IntegrationResponse])
async def list_integrations(
    organization_id: UUID = Query(...),
    integration_type: Optional[str] = Query(None),
    is_enabled: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all integrations for an organization"""
    from sqlalchemy import select, and_
    from app.models.integrations import Integration
    
    query = select(Integration).where(Integration.organization_id == organization_id)
    
    if integration_type:
        query = query.where(Integration.integration_type == integration_type)
    
    if is_enabled is not None:
        query = query.where(Integration.is_enabled == is_enabled)
    
    result = await db.execute(query)
    integrations = result.scalars().all()
    
    return integrations


@router.post("", response_model=IntegrationResponse, status_code=201)
async def create_integration(
    integration_data: IntegrationCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new integration configuration"""
    from app.models.integrations import Integration
    
    integration = Integration(**integration_data.dict(), created_by=current_user.user_id)
    db.add(integration)
    await db.commit()
    await db.refresh(integration)
    
    return integration


@router.get("/{integration_id}", response_model=IntegrationResponse)
async def get_integration(
    integration_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get integration by ID"""
    from sqlalchemy import select
    from app.models.integrations import Integration
    from app.core.exceptions import NotFoundException
    
    query = select(Integration).where(Integration.integration_id == integration_id)
    result = await db.execute(query)
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise NotFoundException(f"Integration {integration_id} not found")
    
    return integration


@router.patch("/{integration_id}", response_model=IntegrationResponse)
async def update_integration(
    integration_id: UUID = Path(...),
    integration_data: IntegrationUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update integration configuration"""
    from sqlalchemy import select
    from app.models.integrations import Integration
    from app.core.exceptions import NotFoundException
    
    query = select(Integration).where(Integration.integration_id == integration_id)
    result = await db.execute(query)
    integration = result.scalar_one_or_none()
    
    if not integration:
        raise NotFoundException(f"Integration {integration_id} not found")
    
    for key, value in integration_data.dict(exclude_unset=True).items():
        setattr(integration, key, value)
    
    await db.commit()
    await db.refresh(integration)
    
    return integration


# ==================== Slack Integration Endpoints ====================

@router.post("/slack/workspace", response_model=SlackWorkspaceResponse, status_code=201)
async def create_slack_workspace(
    workspace_data: SlackWorkspaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Configure Slack workspace integration"""
    slack_service = SlackService(db)
    workspace = await slack_service.create_workspace(workspace_data)
    return workspace


@router.get("/slack/workspace", response_model=SlackWorkspaceResponse)
async def get_slack_workspace(
    organization_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get Slack workspace configuration"""
    slack_service = SlackService(db)
    workspace = await slack_service.get_workspace(organization_id)
    
    if not workspace:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Slack workspace not configured")
    
    return workspace


@router.patch("/slack/workspace/{workspace_id}", response_model=SlackWorkspaceResponse)
async def update_slack_workspace(
    workspace_id: UUID = Path(...),
    workspace_data: SlackWorkspaceUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update Slack workspace configuration"""
    slack_service = SlackService(db)
    workspace = await slack_service.update_workspace(workspace_id, workspace_data)
    return workspace


@router.post("/slack/send-message")
async def send_slack_message(
    organization_id: UUID = Query(...),
    notification: SlackNotificationRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Send a message to a Slack channel"""
    slack_service = SlackService(db)
    result = await slack_service.send_message(organization_id, notification)
    return success_response(result)


@router.get("/slack/channels")
async def list_slack_channels(
    organization_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all Slack channels"""
    slack_service = SlackService(db)
    channels = await slack_service.list_channels(organization_id)
    return success_response(channels)


@router.post("/slack/test")
async def test_slack_integration(
    organization_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Test Slack integration with a test message"""
    slack_service = SlackService(db)
    
    notification = SlackNotificationRequest(
        channel="#general",
        message="🎉 Slack integration test successful! Your HR system is now connected to Slack."
    )
    
    result = await slack_service.send_message(organization_id, notification)
    return success_response({"message": "Test message sent successfully", "details": result})


# ==================== Zoom Integration Endpoints ====================

@router.post("/zoom/account", response_model=ZoomAccountResponse, status_code=201)
async def create_zoom_account(
    account_data: ZoomAccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Configure Zoom account integration"""
    zoom_service = ZoomService(db)
    account = await zoom_service.create_account(account_data)
    return account


@router.get("/zoom/account", response_model=ZoomAccountResponse)
async def get_zoom_account(
    organization_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get Zoom account configuration"""
    zoom_service = ZoomService(db)
    account = await zoom_service.get_account(organization_id)
    
    if not account:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Zoom account not configured")
    
    return account


@router.patch("/zoom/account/{account_id}", response_model=ZoomAccountResponse)
async def update_zoom_account(
    account_id: UUID = Path(...),
    account_data: ZoomAccountUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update Zoom account configuration"""
    zoom_service = ZoomService(db)
    account = await zoom_service.update_account(account_id, account_data)
    return account


@router.post("/zoom/meetings", response_model=ZoomMeetingResponse, status_code=201)
async def create_zoom_meeting(
    meeting_data: ZoomMeetingCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new Zoom meeting"""
    zoom_service = ZoomService(db)
    meeting = await zoom_service.create_meeting(meeting_data)
    return meeting


@router.get("/zoom/meetings", response_model=List[ZoomMeetingResponse])
async def list_zoom_meetings(
    organization_id: UUID = Query(...),
    host_id: Optional[UUID] = Query(None),
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[UUID] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List Zoom meetings"""
    zoom_service = ZoomService(db)
    
    if entity_type and entity_id:
        meetings = await zoom_service.get_meetings_by_entity(organization_id, entity_type, entity_id)
    elif host_id:
        meetings = await zoom_service.get_meetings_by_host(organization_id, host_id, start_date, end_date)
    else:
        from sqlalchemy import select, and_
        from app.models.integrations import ZoomMeeting
        
        query = select(ZoomMeeting).where(ZoomMeeting.organization_id == organization_id)
        
        if start_date:
            query = query.where(ZoomMeeting.start_time >= start_date)
        if end_date:
            query = query.where(ZoomMeeting.start_time <= end_date)
        
        query = query.order_by(ZoomMeeting.start_time.desc())
        
        result = await db.execute(query)
        meetings = result.scalars().all()
    
    return meetings


@router.get("/zoom/meetings/{meeting_id}", response_model=ZoomMeetingResponse)
async def get_zoom_meeting(
    meeting_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get Zoom meeting by ID"""
    zoom_service = ZoomService(db)
    meeting = await zoom_service.get_meeting(meeting_id)
    
    if not meeting:
        from app.core.exceptions import NotFoundException
        raise NotFoundException(f"Meeting {meeting_id} not found")
    
    return meeting


@router.delete("/zoom/meetings/{meeting_id}")
async def cancel_zoom_meeting(
    meeting_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Cancel a Zoom meeting"""
    zoom_service = ZoomService(db)
    meeting = await zoom_service.cancel_meeting(meeting_id)
    return success_response({"message": "Meeting cancelled successfully", "meeting": meeting})


@router.post("/zoom/meetings/interview", response_model=ZoomMeetingResponse, status_code=201)
async def create_interview_meeting(
    organization_id: UUID = Query(...),
    candidate_id: UUID = Body(...),
    interviewer_id: UUID = Body(...),
    job_title: str = Body(...),
    start_time: datetime = Body(...),
    duration: int = Body(60),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a Zoom meeting for an interview"""
    zoom_service = ZoomService(db)
    meeting = await zoom_service.create_interview_meeting(
        organization_id, candidate_id, interviewer_id, job_title, start_time, duration
    )
    return meeting


# ==================== Job Board Integration Endpoints ====================

@router.post("/job-boards", response_model=JobBoardResponse, status_code=201)
async def create_job_board(
    board_data: JobBoardCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Configure job board integration"""
    job_board_service = JobBoardService(db)
    board = await job_board_service.create_job_board(board_data)
    return board


@router.get("/job-boards", response_model=List[JobBoardResponse])
async def list_job_boards(
    organization_id: UUID = Query(...),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all job board configurations"""
    job_board_service = JobBoardService(db)
    boards = await job_board_service.get_job_boards_by_organization(organization_id, is_active)
    return boards


@router.get("/job-boards/{board_id}", response_model=JobBoardResponse)
async def get_job_board(
    board_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get job board configuration"""
    job_board_service = JobBoardService(db)
    board = await job_board_service.get_job_board(board_id)
    
    if not board:
        from app.core.exceptions import NotFoundException
        raise NotFoundException(f"Job board {board_id} not found")
    
    return board


@router.patch("/job-boards/{board_id}", response_model=JobBoardResponse)
async def update_job_board(
    board_id: UUID = Path(...),
    board_data: JobBoardUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update job board configuration"""
    job_board_service = JobBoardService(db)
    board = await job_board_service.update_job_board(board_id, board_data)
    return board


@router.post("/job-boards/{board_id}/post-job", response_model=JobBoardPostingResponse, status_code=201)
async def post_job_to_board(
    board_id: UUID = Path(...),
    job_data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Post a job to a specific job board"""
    job_board_service = JobBoardService(db)
    
    # Get board to determine type
    board = await job_board_service.get_job_board(board_id)
    
    if not board:
        from app.core.exceptions import NotFoundException
        raise NotFoundException(f"Job board {board_id} not found")
    
    # Post to appropriate board
    if board.board_name.lower() == "linkedin":
        posting = await job_board_service.post_to_linkedin(board_id, job_data)
    elif board.board_name.lower() == "indeed":
        posting = await job_board_service.post_to_indeed(board_id, job_data)
    elif board.board_name.lower() == "glassdoor":
        posting = await job_board_service.post_to_glassdoor(board_id, job_data)
    else:
        from app.core.exceptions import ValidationError
        raise ValidationError(f"Unsupported job board: {board.board_name}")
    
    return posting


@router.post("/job-boards/auto-post", response_model=List[JobBoardPostingResponse], status_code=201)
async def auto_post_job(
    organization_id: UUID = Query(...),
    job_data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Automatically post job to all configured boards with auto-post enabled"""
    job_board_service = JobBoardService(db)
    postings = await job_board_service.auto_post_to_boards(organization_id, job_data)
    return postings


@router.get("/job-boards/postings", response_model=List[JobBoardPostingResponse])
async def list_postings(
    job_posting_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all postings for a specific job"""
    job_board_service = JobBoardService(db)
    postings = await job_board_service.get_postings_by_job(job_posting_id)
    return postings


@router.patch("/job-boards/postings/{posting_id}/close")
async def close_job_posting(
    posting_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Close a job board posting"""
    job_board_service = JobBoardService(db)
    posting = await job_board_service.close_posting(posting_id)
    return success_response({"message": "Posting closed successfully", "posting": posting})


@router.post("/job-boards/postings/{posting_id}/sync-metrics")
async def sync_posting_metrics(
    posting_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Sync views and application metrics from job board"""
    job_board_service = JobBoardService(db)
    posting = await job_board_service.sync_posting_metrics(posting_id)
    return success_response({"message": "Metrics synced successfully", "posting": posting})


# ==================== Payment Gateway Endpoints ====================

@router.post("/payment-gateways", response_model=PaymentGatewayResponse, status_code=201)
async def create_payment_gateway(
    gateway_data: PaymentGatewayCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Configure payment gateway"""
    from app.services.payment_gateway_service import PaymentGatewayService
    
    payment_service = PaymentGatewayService(db)
    gateway = await payment_service.create_gateway(gateway_data)
    return gateway


@router.get("/payment-gateways", response_model=List[PaymentGatewayResponse])
async def list_payment_gateways(
    organization_id: UUID = Query(...),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all payment gateways"""
    from app.services.payment_gateway_service import PaymentGatewayService
    
    payment_service = PaymentGatewayService(db)
    gateways = await payment_service.get_gateways_by_organization(organization_id, is_active)
    return gateways


@router.post("/payment-gateways/process-payroll")
async def process_batch_payroll(
    organization_id: UUID = Query(...),
    payments: List[dict] = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Process batch payroll payments"""
    from app.services.payment_gateway_service import PaymentGatewayService
    
    payment_service = PaymentGatewayService(db)
    result = await payment_service.process_batch_payroll(organization_id, payments)
    return success_response(result)


# ==================== Biometric Device Endpoints ====================

@router.post("/biometric/devices", response_model=BiometricDeviceResponse, status_code=201)
async def create_biometric_device(
    device_data: BiometricDeviceCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Register a new biometric device"""
    from app.services.biometric_geofencing_service import BiometricService
    
    biometric_service = BiometricService(db)
    device = await biometric_service.create_device(device_data)
    return device


@router.get("/biometric/devices", response_model=List[BiometricDeviceResponse])
async def list_biometric_devices(
    organization_id: UUID = Query(...),
    is_active: Optional[bool] = Query(None),
    is_online: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all biometric devices"""
    from app.services.biometric_geofencing_service import BiometricService
    
    biometric_service = BiometricService(db)
    devices = await biometric_service.get_devices_by_organization(organization_id, is_active, is_online)
    return devices


@router.post("/biometric/devices/{device_id}/ping")
async def ping_biometric_device(
    device_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Check if biometric device is online"""
    from app.services.biometric_geofencing_service import BiometricService
    
    biometric_service = BiometricService(db)
    result = await biometric_service.ping_device(device_id)
    return success_response(result)


@router.post("/biometric/devices/{device_id}/sync")
async def sync_biometric_attendance(
    device_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Sync attendance data from biometric device"""
    from app.services.biometric_geofencing_service import BiometricService
    
    biometric_service = BiometricService(db)
    logs = await biometric_service.sync_attendance_data(device_id)
    return success_response({"synced_records": len(logs), "logs": logs})


@router.post("/biometric/devices/{device_id}/enroll")
async def enroll_employee_biometric(
    device_id: UUID = Path(...),
    employee_id: UUID = Body(...),
    biometric_template: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Enroll employee's biometric data"""
    from app.services.biometric_geofencing_service import BiometricService
    
    biometric_service = BiometricService(db)
    result = await biometric_service.enroll_employee(device_id, employee_id, biometric_template)
    return success_response(result)


# ==================== Geofencing Endpoints ====================

@router.post("/geofences", response_model=GeofenceLocationResponse, status_code=201)
async def create_geofence(
    geofence_data: GeofenceLocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new geofence location"""
    from app.services.biometric_geofencing_service import GeofencingService
    
    geofencing_service = GeofencingService(db)
    geofence = await geofencing_service.create_geofence(geofence_data)
    return geofence


@router.get("/geofences", response_model=List[GeofenceLocationResponse])
async def list_geofences(
    organization_id: UUID = Query(...),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all geofence locations"""
    from app.services.biometric_geofencing_service import GeofencingService
    
    geofencing_service = GeofencingService(db)
    geofences = await geofencing_service.get_geofences_by_organization(organization_id, is_active)
    return geofences


@router.post("/geofences/verify-location")
async def verify_location(
    organization_id: UUID = Query(...),
    latitude: float = Body(...),
    longitude: float = Body(...),
    location_type: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Verify if coordinates are within any geofence"""
    from app.services.biometric_geofencing_service import GeofencingService
    
    geofencing_service = GeofencingService(db)
    result = await geofencing_service.verify_location(organization_id, latitude, longitude, location_type)
    return success_response(result)


@router.post("/geofences/verify-check-in")
async def verify_check_in_location(
    organization_id: UUID = Query(...),
    employee_id: UUID = Body(...),
    latitude: float = Body(...),
    longitude: float = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Verify employee check-in location"""
    from app.services.biometric_geofencing_service import GeofencingService
    
    geofencing_service = GeofencingService(db)
    result = await geofencing_service.verify_check_in(organization_id, employee_id, latitude, longitude)
    return success_response(result)


@router.get("/geofences/nearby")
async def get_nearby_geofences(
    organization_id: UUID = Query(...),
    latitude: float = Query(...),
    longitude: float = Query(...),
    max_distance: int = Query(1000),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get geofences within a certain distance"""
    from app.services.biometric_geofencing_service import GeofencingService
    
    geofencing_service = GeofencingService(db)
    nearby = await geofencing_service.get_nearby_geofences(organization_id, latitude, longitude, max_distance)
    return success_response(nearby)


# ==================== Holiday Calendar Endpoints ====================

@router.post("/holiday-calendars", response_model=HolidayCalendarResponse, status_code=201)
async def create_holiday_calendar(
    calendar_data: HolidayCalendarCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new holiday calendar"""
    from app.services.holiday_calendar_service import HolidayCalendarService
    
    holiday_service = HolidayCalendarService(db)
    calendar = await holiday_service.create_calendar(calendar_data)
    return calendar


@router.get("/holiday-calendars", response_model=List[HolidayCalendarResponse])
async def list_holiday_calendars(
    organization_id: UUID = Query(...),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all holiday calendars"""
    from app.services.holiday_calendar_service import HolidayCalendarService
    
    holiday_service = HolidayCalendarService(db)
    calendars = await holiday_service.get_calendars_by_organization(organization_id, is_active)
    return calendars


@router.post("/holiday-calendars/{calendar_id}/holidays", response_model=HolidayResponse, status_code=201)
async def add_holiday(
    calendar_id: UUID = Path(...),
    holiday_data: HolidayCreate = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Add a holiday to a calendar"""
    from app.services.holiday_calendar_service import HolidayCalendarService
    
    holiday_service = HolidayCalendarService(db)
    holiday = await holiday_service.add_holiday(holiday_data)
    return holiday


@router.get("/holiday-calendars/{calendar_id}/holidays", response_model=List[HolidayResponse])
async def list_holidays(
    calendar_id: UUID = Path(...),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List holidays for a calendar"""
    from app.services.holiday_calendar_service import HolidayCalendarService
    
    holiday_service = HolidayCalendarService(db)
    holidays = await holiday_service.get_holidays_by_calendar(calendar_id, year, month)
    return holidays


@router.post("/holiday-calendars/{calendar_id}/sync")
async def sync_holidays_from_api(
    calendar_id: UUID = Path(...),
    api_key: str = Body(...),
    year: int = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Sync holidays from public API"""
    from app.services.holiday_calendar_service import HolidayCalendarService
    
    holiday_service = HolidayCalendarService(db)
    result = await holiday_service.sync_from_api(calendar_id, api_key, year)
    return success_response(result)


@router.post("/holiday-calendars/create-preset")
async def create_preset_calendar(
    organization_id: UUID = Query(...),
    country: str = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a preset holiday calendar for a country"""
    from app.services.holiday_calendar_service import HolidayCalendarService
    
    holiday_service = HolidayCalendarService(db)
    
    if country.upper() in ["US", "USA", "UNITED STATES"]:
        calendar = await holiday_service.create_us_calendar(organization_id)
    elif country.upper() in ["UK", "GB", "UNITED KINGDOM"]:
        calendar = await holiday_service.create_uk_calendar(organization_id)
    elif country.upper() in ["IN", "IND", "INDIA"]:
        calendar = await holiday_service.create_india_calendar(organization_id)
    else:
        from app.core.exceptions import ValidationError
        raise ValidationError(f"Preset calendar not available for {country}")
    
    return success_response({"calendar": calendar})


@router.get("/holidays/check")
async def check_if_holiday(
    organization_id: UUID = Query(...),
    date: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Check if a specific date is a holiday"""
    from app.services.holiday_calendar_service import HolidayCalendarService
    from datetime import datetime
    
    holiday_service = HolidayCalendarService(db)
    check_date = datetime.strptime(date, "%Y-%m-%d").date()
    result = await holiday_service.is_holiday(organization_id, check_date)
    return success_response(result)
