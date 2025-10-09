"""
Recruitment Management API Endpoints
Complete recruitment and applicant tracking system
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_
from typing import List, Optional
from datetime import datetime, date
from uuid import UUID
import structlog

from app.db.database import get_db
from app.middleware.auth import AuthMiddleware, security
from app.schemas.schemas import BaseResponse
from app.schemas.recruitment import (
    JobPostingCreate, JobPostingUpdate, JobPostingResponse,
    CandidateCreate, CandidateUpdate, CandidateResponse,
    ApplicationCreate, ApplicationUpdate, ApplicationResponse,
    InterviewCreate, InterviewUpdate, InterviewResponse, InterviewFeedback,
    OfferCreate, OfferUpdate, OfferResponse,
    RecruitmentPipelineCreate, RecruitmentPipelineResponse
)
from app.models.recruitment import (
    JobPosting, Candidate, Application, Interview, Offer, RecruitmentPipeline,
    JobStatus, ApplicationStatus, InterviewStatus, OfferStatus
)
from app.models.models import User
from app.events.event_dispatcher import EventDispatcher

logger = structlog.get_logger()
router = APIRouter(prefix="/recruitment", tags=["Recruitment Management"])


# ============= Job Postings =============

@router.post("/jobs", response_model=BaseResponse, status_code=status.HTTP_201_CREATED)
async def create_job_posting(
    job_data: JobPostingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthMiddleware())
):
    """Create a new job posting"""
    try:
        # Generate job code
        job_code = f"JOB-{datetime.utcnow().strftime('%Y%m%d')}-{str(UUID())[:8]}"
        
        job = JobPosting(
            **job_data.dict(),
            organization_id=current_user.organization_id,
            job_code=job_code,
            created_by=current_user.user_id
        )
        
        db.add(job)
        await db.commit()
        await db.refresh(job)
        
        # Dispatch event
        await EventDispatcher.dispatch("job.created", {
            "job_id": str(job.job_id),
            "job_title": job.job_title,
            "organization_id": str(job.organization_id)
        })
        
        logger.info("job_posting_created", job_id=str(job.job_id), user_id=str(current_user.user_id))
        
        return BaseResponse(
            success=True,
            data=JobPostingResponse.from_orm(job).dict(),
            message="Job posting created successfully"
        )
    except Exception as e:
        logger.error("create_job_posting_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs", response_model=BaseResponse)
async def list_job_postings(
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    employment_type: Optional[str] = Query(None, description="Filter by employment type"),
    is_urgent: Optional[bool] = Query(None, description="Filter urgent jobs"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthMiddleware())
):
    """List all job postings"""
    try:
        # Build query
        query = select(JobPosting).where(
            JobPosting.organization_id == current_user.organization_id
        )
        
        # Apply filters
        if status_filter:
            query = query.where(JobPosting.status == status_filter)
        if employment_type:
            query = query.where(JobPosting.employment_type == employment_type)
        if is_urgent is not None:
            query = query.where(JobPosting.is_urgent == is_urgent)
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Paginate
        query = query.order_by(JobPosting.created_at.desc())
        query = query.offset((page - 1) * limit).limit(limit)
        
        result = await db.execute(query)
        jobs = result.scalars().all()
        
        return BaseResponse(
            success=True,
            data={
                "jobs": [JobPostingResponse.from_orm(job).dict() for job in jobs],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            }
        )
    except Exception as e:
        logger.error("list_job_postings_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}", response_model=BaseResponse)
async def get_job_posting(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthMiddleware())
):
    """Get job posting by ID"""
    try:
        query = select(JobPosting).where(
            and_(
                JobPosting.job_id == job_id,
                JobPosting.organization_id == current_user.organization_id
            )
        )
        result = await db.execute(query)
        job = result.scalar_one_or_none()
        
        if not job:
            raise HTTPException(status_code=404, detail="Job posting not found")
        
        return BaseResponse(
            success=True,
            data=JobPostingResponse.from_orm(job).dict()
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_job_posting_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/jobs/{job_id}", response_model=BaseResponse)
async def update_job_posting(
    job_id: UUID,
    job_data: JobPostingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthMiddleware())
):
    """Update job posting"""
    try:
        query = select(JobPosting).where(
            and_(
                JobPosting.job_id == job_id,
                JobPosting.organization_id == current_user.organization_id
            )
        )
        result = await db.execute(query)
        job = result.scalar_one_or_none()
        
        if not job:
            raise HTTPException(status_code=404, detail="Job posting not found")
        
        # Update fields
        for key, value in job_data.dict(exclude_unset=True).items():
            setattr(job, key, value)
        
        await db.commit()
        await db.refresh(job)
        
        logger.info("job_posting_updated", job_id=str(job_id))
        
        return BaseResponse(
            success=True,
            data=JobPostingResponse.from_orm(job).dict(),
            message="Job posting updated successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("update_job_posting_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jobs/{job_id}/publish", response_model=BaseResponse)
async def publish_job_posting(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthMiddleware())
):
    """Publish job posting"""
    try:
        query = select(JobPosting).where(
            and_(
                JobPosting.job_id == job_id,
                JobPosting.organization_id == current_user.organization_id
            )
        )
        result = await db.execute(query)
        job = result.scalar_one_or_none()
        
        if not job:
            raise HTTPException(status_code=404, detail="Job posting not found")
        
        job.status = JobStatus.PUBLISHED
        job.posted_date = datetime.utcnow()
        
        await db.commit()
        
        # Dispatch event
        await EventDispatcher.dispatch("job.published", {
            "job_id": str(job.job_id),
            "job_title": job.job_title
        })
        
        logger.info("job_published", job_id=str(job_id))
        
        return BaseResponse(
            success=True,
            message="Job posting published successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("publish_job_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ============= Candidates =============

@router.post("/candidates", response_model=BaseResponse, status_code=status.HTTP_201_CREATED)
async def create_candidate(
    candidate_data: CandidateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthMiddleware())
):
    """Create a new candidate"""
    try:
        # Check if candidate with email already exists
        query = select(Candidate).where(
            and_(
                Candidate.email == candidate_data.email,
                Candidate.organization_id == current_user.organization_id
            )
        )
        result = await db.execute(query)
        existing = result.scalar_one_or_none()
        
        if existing:
            raise HTTPException(status_code=400, detail="Candidate with this email already exists")
        
        candidate = Candidate(
            **candidate_data.dict(),
            organization_id=current_user.organization_id
        )
        
        db.add(candidate)
        await db.commit()
        await db.refresh(candidate)
        
        logger.info("candidate_created", candidate_id=str(candidate.candidate_id))
        
        return BaseResponse(
            success=True,
            data=CandidateResponse.from_orm(candidate).dict(),
            message="Candidate created successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_candidate_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/candidates", response_model=BaseResponse)
async def list_candidates(
    search: Optional[str] = Query(None, description="Search by name or email"),
    skills: Optional[str] = Query(None, description="Filter by skills (comma-separated)"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthMiddleware())
):
    """List all candidates"""
    try:
        query = select(Candidate).where(
            Candidate.organization_id == current_user.organization_id
        )
        
        # Apply search
        if search:
            query = query.where(
                or_(
                    Candidate.first_name.ilike(f"%{search}%"),
                    Candidate.last_name.ilike(f"%{search}%"),
                    Candidate.email.ilike(f"%{search}%")
                )
            )
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Paginate
        query = query.order_by(Candidate.created_at.desc())
        query = query.offset((page - 1) * limit).limit(limit)
        
        result = await db.execute(query)
        candidates = result.scalars().all()
        
        return BaseResponse(
            success=True,
            data={
                "candidates": [CandidateResponse.from_orm(c).dict() for c in candidates],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            }
        )
    except Exception as e:
        logger.error("list_candidates_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ============= Applications =============

@router.post("/applications", response_model=BaseResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    application_data: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthMiddleware())
):
    """Create a new job application"""
    try:
        # Verify job exists
        job_query = select(JobPosting).where(JobPosting.job_id == application_data.job_id)
        job_result = await db.execute(job_query)
        job = job_result.scalar_one_or_none()
        
        if not job:
            raise HTTPException(status_code=404, detail="Job posting not found")
        
        # Verify candidate exists
        candidate_query = select(Candidate).where(Candidate.candidate_id == application_data.candidate_id)
        candidate_result = await db.execute(candidate_query)
        candidate = candidate_result.scalar_one_or_none()
        
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Check for duplicate application
        existing_query = select(Application).where(
            and_(
                Application.job_id == application_data.job_id,
                Application.candidate_id == application_data.candidate_id
            )
        )
        existing_result = await db.execute(existing_query)
        existing = existing_result.scalar_one_or_none()
        
        if existing:
            raise HTTPException(status_code=400, detail="Application already exists for this job")
        
        application = Application(
            **application_data.dict(),
            organization_id=current_user.organization_id,
            current_stage="New"
        )
        
        db.add(application)
        await db.commit()
        await db.refresh(application)
        
        # Dispatch event
        await EventDispatcher.dispatch("application.received", {
            "application_id": str(application.application_id),
            "job_title": job.job_title,
            "candidate_name": f"{candidate.first_name} {candidate.last_name}"
        })
        
        logger.info("application_created", application_id=str(application.application_id))
        
        return BaseResponse(
            success=True,
            data=ApplicationResponse.from_orm(application).dict(),
            message="Application submitted successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_application_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/applications", response_model=BaseResponse)
async def list_applications(
    job_id: Optional[UUID] = Query(None, description="Filter by job ID"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthMiddleware())
):
    """List all applications"""
    try:
        query = select(Application).where(
            Application.organization_id == current_user.organization_id
        )
        
        if job_id:
            query = query.where(Application.job_id == job_id)
        if status_filter:
            query = query.where(Application.status == status_filter)
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Paginate
        query = query.order_by(Application.applied_date.desc())
        query = query.offset((page - 1) * limit).limit(limit)
        
        result = await db.execute(query)
        applications = result.scalars().all()
        
        return BaseResponse(
            success=True,
            data={
                "applications": [ApplicationResponse.from_orm(app).dict() for app in applications],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            }
        )
    except Exception as e:
        logger.error("list_applications_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/applications/{application_id}", response_model=BaseResponse)
async def update_application(
    application_id: UUID,
    application_data: ApplicationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthMiddleware())
):
    """Update application status or screening info"""
    try:
        query = select(Application).where(
            and_(
                Application.application_id == application_id,
                Application.organization_id == current_user.organization_id
            )
        )
        result = await db.execute(query)
        application = result.scalar_one_or_none()
        
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # Update fields
        for key, value in application_data.dict(exclude_unset=True).items():
            setattr(application, key, value)
        
        # If screening info updated, set screener
        if application_data.screening_score is not None or application_data.screening_notes is not None:
            application.screened_by = current_user.user_id
            application.screened_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(application)
        
        logger.info("application_updated", application_id=str(application_id))
        
        return BaseResponse(
            success=True,
            data=ApplicationResponse.from_orm(application).dict(),
            message="Application updated successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("update_application_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/applications/{application_id}/shortlist", response_model=BaseResponse)
async def shortlist_application(
    application_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthMiddleware())
):
    """Shortlist an application"""
    try:
        query = select(Application).where(Application.application_id == application_id)
        result = await db.execute(query)
        application = result.scalar_one_or_none()
        
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        application.status = ApplicationStatus.SHORTLISTED
        application.current_stage = "Shortlisted"
        
        await db.commit()
        
        logger.info("application_shortlisted", application_id=str(application_id))
        
        return BaseResponse(
            success=True,
            message="Application shortlisted successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("shortlist_application_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ============= Interviews =============

@router.post("/interviews", response_model=BaseResponse, status_code=status.HTTP_201_CREATED)
async def schedule_interview(
    interview_data: InterviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthMiddleware())
):
    """Schedule an interview"""
    try:
        # Verify application exists
        app_query = select(Application).where(Application.application_id == interview_data.application_id)
        app_result = await db.execute(app_query)
        application = app_result.scalar_one_or_none()
        
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        interview = Interview(
            **interview_data.dict(),
            organization_id=current_user.organization_id,
            created_by=current_user.user_id
        )
        
        db.add(interview)
        
        # Update application status
        application.status = ApplicationStatus.INTERVIEWING
        application.current_stage = f"Interview: {interview_data.interview_round}"
        
        await db.commit()
        await db.refresh(interview)
        
        # Dispatch event
        await EventDispatcher.dispatch("interview.scheduled", {
            "interview_id": str(interview.interview_id),
            "application_id": str(interview.application_id),
            "scheduled_date": interview.scheduled_date.isoformat()
        })
        
        logger.info("interview_scheduled", interview_id=str(interview.interview_id))
        
        return BaseResponse(
            success=True,
            data=InterviewResponse.from_orm(interview).dict(),
            message="Interview scheduled successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("schedule_interview_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interviews/{interview_id}/feedback", response_model=BaseResponse)
async def submit_interview_feedback(
    interview_id: UUID,
    feedback: InterviewFeedback,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthMiddleware())
):
    """Submit interview feedback"""
    try:
        query = select(Interview).where(Interview.interview_id == interview_id)
        result = await db.execute(query)
        interview = result.scalar_one_or_none()
        
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        # Update interview with feedback
        interview.technical_rating = feedback.technical_rating
        interview.communication_rating = feedback.communication_rating
        interview.cultural_fit_rating = feedback.cultural_fit_rating
        interview.overall_rating = feedback.overall_rating
        interview.feedback_text = feedback.feedback_text
        interview.recommendation = feedback.recommendation
        interview.status = InterviewStatus.COMPLETED
        interview.feedback_submitted_at = datetime.utcnow()
        interview.feedback_submitted_by = current_user.user_id
        
        await db.commit()
        
        logger.info("interview_feedback_submitted", interview_id=str(interview_id))
        
        return BaseResponse(
            success=True,
            message="Interview feedback submitted successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("submit_feedback_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ============= Offers =============

@router.post("/offers", response_model=BaseResponse, status_code=status.HTTP_201_CREATED)
async def create_offer(
    offer_data: OfferCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthMiddleware())
):
    """Create a job offer"""
    try:
        # Verify application exists
        app_query = select(Application).where(Application.application_id == offer_data.application_id)
        app_result = await db.execute(app_query)
        application = app_result.scalar_one_or_none()
        
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        offer = Offer(
            **offer_data.dict(),
            organization_id=current_user.organization_id,
            created_by=current_user.user_id,
            offer_date=datetime.utcnow()
        )
        
        db.add(offer)
        
        # Update application status
        application.status = ApplicationStatus.OFFERED
        application.current_stage = "Offer"
        
        await db.commit()
        await db.refresh(offer)
        
        # Dispatch event
        await EventDispatcher.dispatch("offer.made", {
            "offer_id": str(offer.offer_id),
            "application_id": str(offer.application_id)
        })
        
        logger.info("offer_created", offer_id=str(offer.offer_id))
        
        return BaseResponse(
            success=True,
            data=OfferResponse.from_orm(offer).dict(),
            message="Offer created successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_offer_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pipeline", response_model=BaseResponse)
async def get_recruitment_pipeline(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(AuthMiddleware())
):
    """Get recruitment pipeline statistics"""
    try:
        # Get application counts by status
        query = select(
            Application.status,
            func.count(Application.application_id).label('count')
        ).where(
            Application.organization_id == current_user.organization_id
        ).group_by(Application.status)
        
        result = await db.execute(query)
        pipeline_data = {row.status: row.count for row in result}
        
        return BaseResponse(
            success=True,
            data={
                "pipeline": pipeline_data,
                "total_applications": sum(pipeline_data.values())
            }
        )
    except Exception as e:
        logger.error("get_pipeline_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
