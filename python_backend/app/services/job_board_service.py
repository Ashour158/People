"""
Job Board Integration Service
Handles integration with job boards like LinkedIn, Indeed, and Glassdoor
for job posting and applicant tracking
"""
import httpx
import hashlib
import hmac
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from app.models.integrations import Integration, JobBoard, JobBoardPosting, IntegrationLog
from app.schemas.integrations import JobBoardCreate, JobBoardUpdate, JobBoardPostingCreate
from app.core.exceptions import NotFoundException, IntegrationError


class JobBoardService:
    """Service for job board integration operations"""
    
    # API Base URLs
    LINKEDIN_API_BASE = "https://api.linkedin.com/v2"
    INDEED_API_BASE = "https://api.indeed.com/v1"
    GLASSDOOR_API_BASE = "https://api.glassdoor.com/v1"
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # ==================== Job Board Configuration ====================
    
    async def create_job_board(self, board_data: JobBoardCreate) -> JobBoard:
        """Create new job board configuration"""
        board = JobBoard(**board_data.dict())
        self.db.add(board)
        await self.db.commit()
        await self.db.refresh(board)
        return board
    
    async def get_job_board(self, board_id: UUID) -> Optional[JobBoard]:
        """Get job board configuration"""
        query = select(JobBoard).where(JobBoard.board_id == board_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_job_boards_by_organization(
        self,
        organization_id: UUID,
        is_active: Optional[bool] = None
    ) -> List[JobBoard]:
        """Get all job boards for an organization"""
        query = select(JobBoard).where(JobBoard.organization_id == organization_id)
        
        if is_active is not None:
            query = query.where(JobBoard.is_active == is_active)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def update_job_board(
        self,
        board_id: UUID,
        board_data: JobBoardUpdate
    ) -> JobBoard:
        """Update job board configuration"""
        board = await self.get_job_board(board_id)
        
        if not board:
            raise NotFoundException(f"Job board {board_id} not found")
        
        for key, value in board_data.dict(exclude_unset=True).items():
            setattr(board, key, value)
        
        await self.db.commit()
        await self.db.refresh(board)
        return board
    
    # ==================== LinkedIn Integration ====================
    
    async def post_to_linkedin(
        self,
        board_id: UUID,
        job_data: Dict[str, Any]
    ) -> JobBoardPosting:
        """Post a job to LinkedIn"""
        board = await self.get_job_board(board_id)
        
        if not board or board.board_name.lower() != "linkedin":
            raise IntegrationError("Invalid LinkedIn board configuration")
        
        # Prepare LinkedIn job posting payload
        linkedin_payload = {
            "author": f"urn:li:organization:{board.company_id}",
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {
                        "text": job_data.get("description", "")
                    },
                    "shareMediaCategory": "NONE"
                }
            },
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            }
        }
        
        # Additional job-specific fields
        job_posting_payload = {
            "title": job_data.get("title"),
            "description": job_data.get("description"),
            "company": board.company_id,
            "location": job_data.get("location"),
            "employment_type": job_data.get("employment_type", "FULL_TIME"),
            "seniority_level": job_data.get("seniority_level", "MID_SENIOR"),
            "job_functions": job_data.get("job_functions", []),
            "industries": job_data.get("industries", [])
        }
        
        start_time = datetime.utcnow()
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.LINKEDIN_API_BASE}/jobPostings",
                    headers={
                        "Authorization": f"Bearer {board.api_key}",
                        "Content-Type": "application/json",
                        "X-Restli-Protocol-Version": "2.0.0"
                    },
                    json=job_posting_payload,
                    timeout=30.0
                )
                
                duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                
                if response.status_code not in [200, 201]:
                    error_data = response.json() if response.content else {}
                    await self._log_api_call(
                        integration_id=board.integration_id,
                        organization_id=board.organization_id,
                        event_type="linkedin_post_job",
                        request_data=job_posting_payload,
                        response_data=error_data,
                        status_code=response.status_code,
                        is_success=False,
                        error_message="Failed to post job to LinkedIn",
                        duration_ms=duration_ms
                    )
                    raise IntegrationError("Failed to post job to LinkedIn")
                
                linkedin_response = response.json()
                external_id = linkedin_response.get("id") or str(linkedin_response.get("value", {}).get("jobPosting"))
                
                # Create posting record
                posting = JobBoardPosting(
                    board_id=board_id,
                    organization_id=board.organization_id,
                    job_posting_id=UUID(job_data.get("job_posting_id")),
                    external_posting_id=external_id,
                    external_url=f"https://www.linkedin.com/jobs/view/{external_id}",
                    status="published",
                    published_at=datetime.utcnow(),
                    expires_at=datetime.utcnow() + timedelta(days=30),
                    last_synced_at=datetime.utcnow(),
                    sync_status="success"
                )
                
                self.db.add(posting)
                await self.db.commit()
                await self.db.refresh(posting)
                
                # Log successful API call
                await self._log_api_call(
                    integration_id=board.integration_id,
                    organization_id=board.organization_id,
                    event_type="linkedin_post_job",
                    request_data=job_posting_payload,
                    response_data=linkedin_response,
                    status_code=response.status_code,
                    is_success=True,
                    duration_ms=duration_ms
                )
                
                return posting
        
        except httpx.HTTPError as e:
            raise IntegrationError(f"Failed to post to LinkedIn: {str(e)}")
    
    async def sync_linkedin_applicants(
        self,
        board_id: UUID,
        posting_id: UUID
    ) -> List[Dict[str, Any]]:
        """Sync applicants from LinkedIn"""
        board = await self.get_job_board(board_id)
        posting = await self.get_posting(posting_id)
        
        if not board or not posting:
            raise NotFoundException("Board or posting not found")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.LINKEDIN_API_BASE}/jobPostings/{posting.external_posting_id}/applications",
                    headers={
                        "Authorization": f"Bearer {board.api_key}",
                        "X-Restli-Protocol-Version": "2.0.0"
                    },
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise IntegrationError("Failed to sync LinkedIn applicants")
                
                data = response.json()
                applicants = data.get("elements", [])
                
                # Update last sync time
                posting.last_synced_at = datetime.utcnow()
                posting.applications_count = len(applicants)
                await self.db.commit()
                
                return applicants
        
        except httpx.HTTPError as e:
            raise IntegrationError(f"Failed to sync applicants: {str(e)}")
    
    # ==================== Indeed Integration ====================
    
    async def post_to_indeed(
        self,
        board_id: UUID,
        job_data: Dict[str, Any]
    ) -> JobBoardPosting:
        """Post a job to Indeed"""
        board = await self.get_job_board(board_id)
        
        if not board or board.board_name.lower() != "indeed":
            raise IntegrationError("Invalid Indeed board configuration")
        
        # Prepare Indeed job posting payload
        indeed_payload = {
            "job_title": job_data.get("title"),
            "job_description": job_data.get("description"),
            "company": board.company_id,
            "location": job_data.get("location"),
            "job_type": job_data.get("employment_type", "fulltime"),
            "salary_min": job_data.get("salary_min"),
            "salary_max": job_data.get("salary_max"),
            "salary_currency": job_data.get("salary_currency", "USD"),
            "application_url": job_data.get("application_url"),
            "api_key": board.api_key
        }
        
        start_time = datetime.utcnow()
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.INDEED_API_BASE}/jobs",
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    data=indeed_payload,
                    timeout=30.0
                )
                
                duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                
                if response.status_code not in [200, 201]:
                    error_text = response.text
                    await self._log_api_call(
                        integration_id=board.integration_id,
                        organization_id=board.organization_id,
                        event_type="indeed_post_job",
                        request_data=indeed_payload,
                        response_data={"error": error_text},
                        status_code=response.status_code,
                        is_success=False,
                        error_message="Failed to post job to Indeed",
                        duration_ms=duration_ms
                    )
                    raise IntegrationError("Failed to post job to Indeed")
                
                indeed_response = response.json()
                external_id = indeed_response.get("jobkey")
                
                # Create posting record
                posting = JobBoardPosting(
                    board_id=board_id,
                    organization_id=board.organization_id,
                    job_posting_id=UUID(job_data.get("job_posting_id")),
                    external_posting_id=external_id,
                    external_url=f"https://www.indeed.com/viewjob?jk={external_id}",
                    status="published",
                    published_at=datetime.utcnow(),
                    expires_at=datetime.utcnow() + timedelta(days=30),
                    last_synced_at=datetime.utcnow(),
                    sync_status="success"
                )
                
                self.db.add(posting)
                await self.db.commit()
                await self.db.refresh(posting)
                
                # Log successful API call
                await self._log_api_call(
                    integration_id=board.integration_id,
                    organization_id=board.organization_id,
                    event_type="indeed_post_job",
                    request_data=indeed_payload,
                    response_data=indeed_response,
                    status_code=response.status_code,
                    is_success=True,
                    duration_ms=duration_ms
                )
                
                return posting
        
        except httpx.HTTPError as e:
            raise IntegrationError(f"Failed to post to Indeed: {str(e)}")
    
    # ==================== Glassdoor Integration ====================
    
    async def post_to_glassdoor(
        self,
        board_id: UUID,
        job_data: Dict[str, Any]
    ) -> JobBoardPosting:
        """Post a job to Glassdoor"""
        board = await self.get_job_board(board_id)
        
        if not board or board.board_name.lower() != "glassdoor":
            raise IntegrationError("Invalid Glassdoor board configuration")
        
        # Prepare Glassdoor job posting payload
        glassdoor_payload = {
            "partnerKey": board.api_key,
            "employerId": board.company_id,
            "jobTitle": job_data.get("title"),
            "jobDescription": job_data.get("description"),
            "location": job_data.get("location"),
            "jobType": job_data.get("employment_type", "FULL_TIME"),
            "payRange": {
                "min": job_data.get("salary_min"),
                "max": job_data.get("salary_max"),
                "currency": job_data.get("salary_currency", "USD")
            }
        }
        
        start_time = datetime.utcnow()
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.GLASSDOOR_API_BASE}/employers/{board.company_id}/jobs",
                    headers={
                        "Authorization": f"Bearer {board.api_key}",
                        "Content-Type": "application/json"
                    },
                    json=glassdoor_payload,
                    timeout=30.0
                )
                
                duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                
                if response.status_code not in [200, 201]:
                    error_data = response.json() if response.content else {}
                    await self._log_api_call(
                        integration_id=board.integration_id,
                        organization_id=board.organization_id,
                        event_type="glassdoor_post_job",
                        request_data=glassdoor_payload,
                        response_data=error_data,
                        status_code=response.status_code,
                        is_success=False,
                        error_message="Failed to post job to Glassdoor",
                        duration_ms=duration_ms
                    )
                    raise IntegrationError("Failed to post job to Glassdoor")
                
                glassdoor_response = response.json()
                external_id = glassdoor_response.get("jobId")
                
                # Create posting record
                posting = JobBoardPosting(
                    board_id=board_id,
                    organization_id=board.organization_id,
                    job_posting_id=UUID(job_data.get("job_posting_id")),
                    external_posting_id=str(external_id),
                    external_url=glassdoor_response.get("jobUrl", ""),
                    status="published",
                    published_at=datetime.utcnow(),
                    expires_at=datetime.utcnow() + timedelta(days=30),
                    last_synced_at=datetime.utcnow(),
                    sync_status="success"
                )
                
                self.db.add(posting)
                await self.db.commit()
                await self.db.refresh(posting)
                
                # Log successful API call
                await self._log_api_call(
                    integration_id=board.integration_id,
                    organization_id=board.organization_id,
                    event_type="glassdoor_post_job",
                    request_data=glassdoor_payload,
                    response_data=glassdoor_response,
                    status_code=response.status_code,
                    is_success=True,
                    duration_ms=duration_ms
                )
                
                return posting
        
        except httpx.HTTPError as e:
            raise IntegrationError(f"Failed to post to Glassdoor: {str(e)}")
    
    # ==================== Common Job Board Operations ====================
    
    async def get_posting(self, posting_id: UUID) -> Optional[JobBoardPosting]:
        """Get job board posting by ID"""
        query = select(JobBoardPosting).where(JobBoardPosting.posting_id == posting_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_postings_by_job(
        self,
        job_posting_id: UUID
    ) -> List[JobBoardPosting]:
        """Get all job board postings for a specific job"""
        query = select(JobBoardPosting).where(
            JobBoardPosting.job_posting_id == job_posting_id
        )
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def close_posting(self, posting_id: UUID) -> JobBoardPosting:
        """Close/expire a job board posting"""
        posting = await self.get_posting(posting_id)
        
        if not posting:
            raise NotFoundException(f"Posting {posting_id} not found")
        
        posting.status = "closed"
        await self.db.commit()
        await self.db.refresh(posting)
        return posting
    
    async def sync_posting_metrics(
        self,
        posting_id: UUID
    ) -> JobBoardPosting:
        """Sync views and applications count from job board"""
        posting = await self.get_posting(posting_id)
        
        if not posting:
            raise NotFoundException(f"Posting {posting_id} not found")
        
        board = await self.get_job_board(posting.board_id)
        
        if not board:
            raise NotFoundException("Job board not found")
        
        # Sync based on board type
        if board.board_name.lower() == "linkedin":
            await self._sync_linkedin_metrics(board, posting)
        elif board.board_name.lower() == "indeed":
            await self._sync_indeed_metrics(board, posting)
        elif board.board_name.lower() == "glassdoor":
            await self._sync_glassdoor_metrics(board, posting)
        
        posting.last_synced_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(posting)
        
        return posting
    
    async def auto_post_to_boards(
        self,
        organization_id: UUID,
        job_data: Dict[str, Any]
    ) -> List[JobBoardPosting]:
        """Automatically post to all configured job boards with auto-post enabled"""
        boards = await self.get_job_boards_by_organization(organization_id, is_active=True)
        postings = []
        
        for board in boards:
            if not board.auto_post_jobs:
                continue
            
            try:
                if board.board_name.lower() == "linkedin":
                    posting = await self.post_to_linkedin(board.board_id, job_data)
                    postings.append(posting)
                elif board.board_name.lower() == "indeed":
                    posting = await self.post_to_indeed(board.board_id, job_data)
                    postings.append(posting)
                elif board.board_name.lower() == "glassdoor":
                    posting = await self.post_to_glassdoor(board.board_id, job_data)
                    postings.append(posting)
            except Exception as e:
                # Log error but continue with other boards
                print(f"Failed to post to {board.board_name}: {str(e)}")
                continue
        
        return postings
    
    # ==================== Helper Methods ====================
    
    async def _sync_linkedin_metrics(self, board: JobBoard, posting: JobBoardPosting):
        """Sync metrics from LinkedIn"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.LINKEDIN_API_BASE}/jobPostings/{posting.external_posting_id}/statistics",
                    headers={
                        "Authorization": f"Bearer {board.api_key}",
                        "X-Restli-Protocol-Version": "2.0.0"
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    posting.views_count = data.get("impressions", posting.views_count)
                    posting.applications_count = data.get("applies", posting.applications_count)
        
        except Exception as e:
            print(f"Failed to sync LinkedIn metrics: {str(e)}")
    
    async def _sync_indeed_metrics(self, board: JobBoard, posting: JobBoardPosting):
        """Sync metrics from Indeed"""
        # Indeed API implementation for metrics
        pass
    
    async def _sync_glassdoor_metrics(self, board: JobBoard, posting: JobBoardPosting):
        """Sync metrics from Glassdoor"""
        # Glassdoor API implementation for metrics
        pass
    
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
