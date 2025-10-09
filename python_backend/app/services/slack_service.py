"""
Slack Integration Service
Handles all Slack-related operations including notifications, channel management, and user sync
"""
import httpx
import json
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.integrations import Integration, SlackWorkspace, IntegrationLog
from app.schemas.integrations import SlackWorkspaceCreate, SlackWorkspaceUpdate, SlackNotificationRequest
from app.core.exceptions import NotFoundException, IntegrationError


class SlackService:
    """Service for Slack integration operations"""
    
    SLACK_API_BASE = "https://slack.com/api"
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_workspace(self, workspace_data: SlackWorkspaceCreate) -> SlackWorkspace:
        """Create new Slack workspace configuration"""
        workspace = SlackWorkspace(**workspace_data.dict())
        self.db.add(workspace)
        await self.db.commit()
        await self.db.refresh(workspace)
        return workspace
    
    async def get_workspace(self, organization_id: UUID) -> Optional[SlackWorkspace]:
        """Get Slack workspace configuration for organization"""
        query = select(SlackWorkspace).where(
            and_(
                SlackWorkspace.organization_id == organization_id,
                SlackWorkspace.is_active == True
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def update_workspace(
        self,
        workspace_id: UUID,
        workspace_data: SlackWorkspaceUpdate
    ) -> SlackWorkspace:
        """Update Slack workspace configuration"""
        query = select(SlackWorkspace).where(SlackWorkspace.workspace_id == workspace_id)
        result = await self.db.execute(query)
        workspace = result.scalar_one_or_none()
        
        if not workspace:
            raise NotFoundException(f"Slack workspace {workspace_id} not found")
        
        for key, value in workspace_data.dict(exclude_unset=True).items():
            setattr(workspace, key, value)
        
        await self.db.commit()
        await self.db.refresh(workspace)
        return workspace
    
    async def verify_token(self, access_token: str) -> Dict[str, Any]:
        """Verify Slack access token"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.SLACK_API_BASE}/auth.test",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                raise IntegrationError("Failed to verify Slack token")
            
            data = response.json()
            if not data.get("ok"):
                raise IntegrationError(f"Slack auth failed: {data.get('error')}")
            
            return data
    
    async def send_message(
        self,
        organization_id: UUID,
        notification_request: SlackNotificationRequest
    ) -> Dict[str, Any]:
        """Send a message to a Slack channel"""
        workspace = await self.get_workspace(organization_id)
        
        if not workspace:
            raise NotFoundException("Slack workspace not configured")
        
        start_time = datetime.utcnow()
        
        payload = {
            "channel": notification_request.channel,
            "text": notification_request.message,
        }
        
        if notification_request.attachments:
            payload["attachments"] = notification_request.attachments
        
        if notification_request.blocks:
            payload["blocks"] = notification_request.blocks
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.SLACK_API_BASE}/chat.postMessage",
                    headers={
                        "Authorization": f"Bearer {workspace.bot_access_token}",
                        "Content-Type": "application/json"
                    },
                    json=payload,
                    timeout=30.0
                )
                
                duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                
                result = response.json()
                
                # Log the API call
                await self._log_api_call(
                    integration_id=workspace.integration_id,
                    organization_id=organization_id,
                    event_type="message_sent",
                    request_data=payload,
                    response_data=result,
                    status_code=response.status_code,
                    is_success=result.get("ok", False),
                    duration_ms=duration_ms
                )
                
                if not result.get("ok"):
                    raise IntegrationError(f"Slack API error: {result.get('error')}")
                
                return result
        
        except httpx.HTTPError as e:
            await self._log_api_call(
                integration_id=workspace.integration_id,
                organization_id=organization_id,
                event_type="message_sent",
                request_data=payload,
                response_data=None,
                status_code=0,
                is_success=False,
                error_message=str(e),
                duration_ms=0
            )
            raise IntegrationError(f"Failed to send Slack message: {str(e)}")
    
    async def send_direct_message(
        self,
        organization_id: UUID,
        user_email: str,
        message: str
    ) -> Dict[str, Any]:
        """Send a direct message to a user"""
        workspace = await self.get_workspace(organization_id)
        
        if not workspace:
            raise NotFoundException("Slack workspace not configured")
        
        # First, get user ID by email
        user_id = await self._get_user_id_by_email(workspace.bot_access_token, user_email)
        
        if not user_id:
            raise NotFoundException(f"Slack user with email {user_email} not found")
        
        # Send DM
        payload = {
            "channel": user_id,
            "text": message
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.SLACK_API_BASE}/chat.postMessage",
                headers={
                    "Authorization": f"Bearer {workspace.bot_access_token}",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=30.0
            )
            
            result = response.json()
            
            if not result.get("ok"):
                raise IntegrationError(f"Slack API error: {result.get('error')}")
            
            return result
    
    async def notify_leave_request(
        self,
        organization_id: UUID,
        employee_name: str,
        leave_type: str,
        start_date: str,
        end_date: str,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send leave request notification to configured channel"""
        workspace = await self.get_workspace(organization_id)
        
        if not workspace or not workspace.notify_leave_requests:
            return {"skipped": True, "reason": "Notifications disabled"}
        
        channel = workspace.leave_channel or workspace.default_channel
        
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "🏖️ New Leave Request"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Employee:*\n{employee_name}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Leave Type:*\n{leave_type}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*From:*\n{start_date}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*To:*\n{end_date}"
                    }
                ]
            }
        ]
        
        if reason:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Reason:*\n{reason}"
                }
            })
        
        notification = SlackNotificationRequest(
            channel=channel,
            message=f"New leave request from {employee_name}",
            blocks=blocks
        )
        
        return await self.send_message(organization_id, notification)
    
    async def notify_leave_approval(
        self,
        organization_id: UUID,
        employee_email: str,
        employee_name: str,
        leave_type: str,
        status: str,
        approver_name: str,
        comments: Optional[str] = None
    ) -> Dict[str, Any]:
        """Notify employee of leave approval/rejection"""
        workspace = await self.get_workspace(organization_id)
        
        if not workspace or not workspace.notify_approvals:
            return {"skipped": True, "reason": "Notifications disabled"}
        
        emoji = "✅" if status == "approved" else "❌"
        
        message = f"{emoji} Your {leave_type} request has been {status} by {approver_name}"
        if comments:
            message += f"\n\nComments: {comments}"
        
        try:
            return await self.send_direct_message(organization_id, employee_email, message)
        except Exception as e:
            # Fallback to channel notification if DM fails
            channel = workspace.leave_channel or workspace.default_channel
            notification = SlackNotificationRequest(
                channel=channel,
                message=f"{emoji} Leave request {status} for {employee_name}"
            )
            return await self.send_message(organization_id, notification)
    
    async def notify_attendance_reminder(
        self,
        organization_id: UUID,
        reminder_type: str,
        message: str
    ) -> Dict[str, Any]:
        """Send attendance reminder to configured channel"""
        workspace = await self.get_workspace(organization_id)
        
        if not workspace or not workspace.notify_attendance:
            return {"skipped": True, "reason": "Notifications disabled"}
        
        channel = workspace.attendance_channel or workspace.default_channel
        
        notification = SlackNotificationRequest(
            channel=channel,
            message=f"⏰ {reminder_type}: {message}"
        )
        
        return await self.send_message(organization_id, notification)
    
    async def notify_birthday(
        self,
        organization_id: UUID,
        employee_name: str,
        department: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send birthday notification"""
        workspace = await self.get_workspace(organization_id)
        
        if not workspace or not workspace.notify_birthdays:
            return {"skipped": True, "reason": "Notifications disabled"}
        
        channel = workspace.default_channel
        
        dept_info = f" from {department}" if department else ""
        
        notification = SlackNotificationRequest(
            channel=channel,
            message=f"🎉 Happy Birthday to {employee_name}{dept_info}! 🎂"
        )
        
        return await self.send_message(organization_id, notification)
    
    async def notify_work_anniversary(
        self,
        organization_id: UUID,
        employee_name: str,
        years: int
    ) -> Dict[str, Any]:
        """Send work anniversary notification"""
        workspace = await self.get_workspace(organization_id)
        
        if not workspace or not workspace.notify_anniversaries:
            return {"skipped": True, "reason": "Notifications disabled"}
        
        channel = workspace.default_channel
        
        notification = SlackNotificationRequest(
            channel=channel,
            message=f"🎊 Congratulations to {employee_name} on {years} {'year' if years == 1 else 'years'} with the company!"
        )
        
        return await self.send_message(organization_id, notification)
    
    async def list_channels(self, organization_id: UUID) -> List[Dict[str, Any]]:
        """List all channels in the Slack workspace"""
        workspace = await self.get_workspace(organization_id)
        
        if not workspace:
            raise NotFoundException("Slack workspace not configured")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.SLACK_API_BASE}/conversations.list",
                headers={"Authorization": f"Bearer {workspace.bot_access_token}"},
                params={"types": "public_channel,private_channel"},
                timeout=30.0
            )
            
            result = response.json()
            
            if not result.get("ok"):
                raise IntegrationError(f"Failed to list channels: {result.get('error')}")
            
            return result.get("channels", [])
    
    async def get_workspace_info(self, organization_id: UUID) -> Dict[str, Any]:
        """Get Slack workspace information"""
        workspace = await self.get_workspace(organization_id)
        
        if not workspace:
            raise NotFoundException("Slack workspace not configured")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.SLACK_API_BASE}/team.info",
                headers={"Authorization": f"Bearer {workspace.bot_access_token}"},
                timeout=30.0
            )
            
            result = response.json()
            
            if not result.get("ok"):
                raise IntegrationError(f"Failed to get workspace info: {result.get('error')}")
            
            return result.get("team", {})
    
    async def _get_user_id_by_email(self, access_token: str, email: str) -> Optional[str]:
        """Get Slack user ID by email address"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.SLACK_API_BASE}/users.lookupByEmail",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"email": email},
                timeout=30.0
            )
            
            result = response.json()
            
            if result.get("ok"):
                return result.get("user", {}).get("id")
            
            return None
    
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
