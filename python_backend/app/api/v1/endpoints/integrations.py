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
