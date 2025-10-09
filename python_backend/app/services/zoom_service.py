"""
Zoom Integration Service
Handles Zoom meeting creation, scheduling, and management for interviews and onboarding
"""
import httpx
import base64
import jwt
import time
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.integrations import Integration, ZoomAccount, ZoomMeeting, IntegrationLog
from app.schemas.integrations import ZoomAccountCreate, ZoomAccountUpdate, ZoomMeetingCreate
from app.core.exceptions import NotFoundException, IntegrationError


class ZoomService:
    """Service for Zoom integration operations"""
    
    ZOOM_API_BASE = "https://api.zoom.us/v2"
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_account(self, account_data: ZoomAccountCreate) -> ZoomAccount:
        """Create new Zoom account configuration"""
        account = ZoomAccount(**account_data.dict())
        self.db.add(account)
        await self.db.commit()
        await self.db.refresh(account)
        return account
    
    async def get_account(self, organization_id: UUID) -> Optional[ZoomAccount]:
        """Get Zoom account configuration for organization"""
        query = select(ZoomAccount).where(
            and_(
                ZoomAccount.organization_id == organization_id,
                ZoomAccount.is_active == True
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def update_account(
        self,
        account_id: UUID,
        account_data: ZoomAccountUpdate
    ) -> ZoomAccount:
        """Update Zoom account configuration"""
        query = select(ZoomAccount).where(ZoomAccount.account_id == account_id)
        result = await self.db.execute(query)
        account = result.scalar_one_or_none()
        
        if not account:
            raise NotFoundException(f"Zoom account {account_id} not found")
        
        for key, value in account_data.dict(exclude_unset=True).items():
            setattr(account, key, value)
        
        await self.db.commit()
        await self.db.refresh(account)
        return account
    
    async def create_meeting(self, meeting_data: ZoomMeetingCreate) -> ZoomMeeting:
        """Create a new Zoom meeting"""
        # Get account configuration
        query = select(ZoomAccount).where(ZoomAccount.account_id == meeting_data.account_id)
        result = await self.db.execute(query)
        account = result.scalar_one_or_none()
        
        if not account:
            raise NotFoundException("Zoom account not configured")
        
        # Generate JWT token for Zoom API
        token = self._generate_jwt_token(account.api_key, account.api_secret)
        
        # Prepare meeting payload
        meeting_payload = {
            "topic": meeting_data.topic,
            "type": 2,  # Scheduled meeting
            "start_time": meeting_data.start_time.isoformat(),
            "duration": meeting_data.duration,
            "timezone": meeting_data.timezone,
            "agenda": meeting_data.agenda or "",
            "settings": {
                "host_video": True,
                "participant_video": True,
                "join_before_host": account.join_before_host,
                "mute_upon_entry": False,
                "watermark": False,
                "audio": "both",
                "auto_recording": meeting_data.auto_recording or "none",
                "waiting_room": meeting_data.waiting_room,
                "approval_type": 0  # Automatically approve
            }
        }
        
        start_time = datetime.utcnow()
        
        try:
            # Create meeting via Zoom API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.ZOOM_API_BASE}/users/me/meetings",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json"
                    },
                    json=meeting_payload,
                    timeout=30.0
                )
                
                duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                
                if response.status_code not in [200, 201]:
                    error_data = response.json()
                    await self._log_api_call(
                        integration_id=account.integration_id,
                        organization_id=meeting_data.organization_id,
                        event_type="meeting_create",
                        request_data=meeting_payload,
                        response_data=error_data,
                        status_code=response.status_code,
                        is_success=False,
                        error_message=error_data.get("message", "Failed to create meeting"),
                        duration_ms=duration_ms
                    )
                    raise IntegrationError(f"Failed to create Zoom meeting: {error_data.get('message')}")
                
                zoom_data = response.json()
                
                # Save meeting to database
                meeting = ZoomMeeting(
                    account_id=meeting_data.account_id,
                    organization_id=meeting_data.organization_id,
                    zoom_meeting_id=str(zoom_data.get("id")),
                    meeting_number=str(zoom_data.get("id")),
                    host_id=meeting_data.host_id,
                    topic=meeting_data.topic,
                    agenda=meeting_data.agenda,
                    meeting_type=meeting_data.meeting_type,
                    start_time=meeting_data.start_time,
                    duration=meeting_data.duration,
                    timezone=meeting_data.timezone,
                    join_url=zoom_data.get("join_url"),
                    meeting_password=zoom_data.get("password"),
                    waiting_room=meeting_data.waiting_room,
                    auto_recording=meeting_data.auto_recording,
                    status="scheduled",
                    related_entity_type=meeting_data.related_entity_type,
                    related_entity_id=meeting_data.related_entity_id
                )
                
                self.db.add(meeting)
                await self.db.commit()
                await self.db.refresh(meeting)
                
                # Log successful API call
                await self._log_api_call(
                    integration_id=account.integration_id,
                    organization_id=meeting_data.organization_id,
                    event_type="meeting_create",
                    request_data=meeting_payload,
                    response_data=zoom_data,
                    status_code=response.status_code,
                    is_success=True,
                    duration_ms=duration_ms
                )
                
                return meeting
        
        except httpx.HTTPError as e:
            raise IntegrationError(f"Failed to create Zoom meeting: {str(e)}")
    
    async def get_meeting(self, meeting_id: UUID) -> Optional[ZoomMeeting]:
        """Get Zoom meeting by ID"""
        query = select(ZoomMeeting).where(ZoomMeeting.meeting_id == meeting_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_meetings_by_host(
        self,
        organization_id: UUID,
        host_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[ZoomMeeting]:
        """Get all meetings for a specific host"""
        query = select(ZoomMeeting).where(
            and_(
                ZoomMeeting.organization_id == organization_id,
                ZoomMeeting.host_id == host_id
            )
        )
        
        if start_date:
            query = query.where(ZoomMeeting.start_time >= start_date)
        
        if end_date:
            query = query.where(ZoomMeeting.start_time <= end_date)
        
        query = query.order_by(ZoomMeeting.start_time.desc())
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_meetings_by_entity(
        self,
        organization_id: UUID,
        entity_type: str,
        entity_id: UUID
    ) -> List[ZoomMeeting]:
        """Get meetings related to a specific entity (candidate, employee, etc.)"""
        query = select(ZoomMeeting).where(
            and_(
                ZoomMeeting.organization_id == organization_id,
                ZoomMeeting.related_entity_type == entity_type,
                ZoomMeeting.related_entity_id == entity_id
            )
        ).order_by(ZoomMeeting.start_time.desc())
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def update_meeting_status(
        self,
        meeting_id: UUID,
        status: str
    ) -> ZoomMeeting:
        """Update meeting status"""
        query = select(ZoomMeeting).where(ZoomMeeting.meeting_id == meeting_id)
        result = await self.db.execute(query)
        meeting = result.scalar_one_or_none()
        
        if not meeting:
            raise NotFoundException(f"Meeting {meeting_id} not found")
        
        meeting.status = status
        await self.db.commit()
        await self.db.refresh(meeting)
        return meeting
    
    async def cancel_meeting(self, meeting_id: UUID) -> ZoomMeeting:
        """Cancel a Zoom meeting"""
        meeting = await self.get_meeting(meeting_id)
        
        if not meeting:
            raise NotFoundException(f"Meeting {meeting_id} not found")
        
        # Get account for API access
        query = select(ZoomAccount).where(ZoomAccount.account_id == meeting.account_id)
        result = await self.db.execute(query)
        account = result.scalar_one_or_none()
        
        if not account:
            raise NotFoundException("Zoom account not found")
        
        # Generate JWT token
        token = self._generate_jwt_token(account.api_key, account.api_secret)
        
        try:
            # Delete meeting via Zoom API
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.ZOOM_API_BASE}/meetings/{meeting.zoom_meeting_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=30.0
                )
                
                if response.status_code not in [200, 204]:
                    raise IntegrationError("Failed to cancel Zoom meeting")
                
                # Update status in database
                meeting.status = "cancelled"
                await self.db.commit()
                await self.db.refresh(meeting)
                
                return meeting
        
        except httpx.HTTPError as e:
            raise IntegrationError(f"Failed to cancel Zoom meeting: {str(e)}")
    
    async def create_interview_meeting(
        self,
        organization_id: UUID,
        candidate_id: UUID,
        interviewer_id: UUID,
        job_title: str,
        start_time: datetime,
        duration: int = 60
    ) -> ZoomMeeting:
        """Create a Zoom meeting for an interview"""
        account = await self.get_account(organization_id)
        
        if not account or not account.enable_interview_scheduling:
            raise IntegrationError("Interview scheduling not enabled")
        
        meeting_data = ZoomMeetingCreate(
            account_id=account.account_id,
            organization_id=organization_id,
            host_id=interviewer_id,
            topic=f"Interview: {job_title}",
            agenda=f"Technical interview for {job_title} position",
            meeting_type="interview",
            start_time=start_time,
            duration=duration,
            timezone="UTC",
            waiting_room=True,
            auto_recording="cloud" if account.auto_recording else "none",
            related_entity_type="candidate",
            related_entity_id=candidate_id
        )
        
        return await self.create_meeting(meeting_data)
    
    async def create_onboarding_meeting(
        self,
        organization_id: UUID,
        employee_id: UUID,
        hr_representative_id: UUID,
        start_time: datetime,
        duration: int = 90
    ) -> ZoomMeeting:
        """Create a Zoom meeting for onboarding"""
        account = await self.get_account(organization_id)
        
        if not account or not account.enable_onboarding_meetings:
            raise IntegrationError("Onboarding meetings not enabled")
        
        meeting_data = ZoomMeetingCreate(
            account_id=account.account_id,
            organization_id=organization_id,
            host_id=hr_representative_id,
            topic="New Employee Onboarding Session",
            agenda="Welcome session for new employee - company overview, policies, and Q&A",
            meeting_type="onboarding",
            start_time=start_time,
            duration=duration,
            timezone="UTC",
            waiting_room=False,
            auto_recording="cloud" if account.auto_recording else "none",
            related_entity_type="employee",
            related_entity_id=employee_id
        )
        
        return await self.create_meeting(meeting_data)
    
    async def get_meeting_participants(
        self,
        meeting_id: UUID
    ) -> List[Dict[str, Any]]:
        """Get participants of a completed meeting"""
        meeting = await self.get_meeting(meeting_id)
        
        if not meeting:
            raise NotFoundException(f"Meeting {meeting_id} not found")
        
        # Get account for API access
        query = select(ZoomAccount).where(ZoomAccount.account_id == meeting.account_id)
        result = await self.db.execute(query)
        account = result.scalar_one_or_none()
        
        if not account:
            raise NotFoundException("Zoom account not found")
        
        # Generate JWT token
        token = self._generate_jwt_token(account.api_key, account.api_secret)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.ZOOM_API_BASE}/metrics/meetings/{meeting.zoom_meeting_id}/participants",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise IntegrationError("Failed to get meeting participants")
                
                data = response.json()
                return data.get("participants", [])
        
        except httpx.HTTPError as e:
            raise IntegrationError(f"Failed to get participants: {str(e)}")
    
    def _generate_jwt_token(self, api_key: str, api_secret: str) -> str:
        """Generate JWT token for Zoom API authentication"""
        payload = {
            "iss": api_key,
            "exp": int(time.time()) + 3600  # Token expires in 1 hour
        }
        
        token = jwt.encode(payload, api_secret, algorithm="HS256")
        return token
    
    async def _log_api_call(
        self,
        integration_id: UUID,
        organization_id: UUID,
        event_type: str,
        request_data: Optional[Dict] = None,
        response_data: Optional[Dict] = None,
        status_code: int = 0,
        is_success: bool = True,
        error_message: Optional[str] = None,
        duration_ms: int = 0
    ):
        """Log integration API call"""
        log = IntegrationLog(
            integration_id=integration_id,
            organization_id=organization_id,
            event_type=event_type,
            request_data=request_data,
            response_data=response_data,
            status_code=status_code,
            is_success=is_success,
            error_message=error_message,
            duration_ms=duration_ms
        )
        
        self.db.add(log)
        await self.db.commit()
