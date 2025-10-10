"""
Wellness Platform API Endpoints
Health challenges, fitness tracking, and wellbeing features
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime

from app.db.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import User
from app.models.wellness import (
    WellnessChallenge, ChallengeParticipant, ChallengeLeaderboard,
    WellnessActivity, HealthMetric, WellnessBenefit, WellnessBenefitEnrollment,
    BurnoutAssessment, ChallengeStatus, ParticipationStatus
)
from app.schemas.wellness import (
    WellnessChallengeCreate, WellnessChallengeResponse,
    ChallengeJoin, ParticipantResponse,
    WellnessActivityCreate, WellnessActivityResponse,
    HealthMetricCreate, HealthMetricResponse,
    WellnessBenefitResponse, BenefitEnrollmentCreate,
    BurnoutAssessmentCreate, BurnoutAssessmentResponse,
    LeaderboardResponse
)
from app.utils.response import success_response, error_response
from app.utils.pagination import paginate

router = APIRouter(prefix="/wellness", tags=["wellness"])


# ==========================================
# WELLNESS CHALLENGES
# ==========================================

@router.post("/challenges", status_code=status.HTTP_201_CREATED)
async def create_challenge(
    challenge_data: WellnessChallengeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new wellness challenge"""
    try:
        # Validate dates
        if challenge_data.end_date <= challenge_data.start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End date must be after start date"
            )
        
        # Create challenge
        challenge = WellnessChallenge(
            organization_id=current_user.organization_id,
            created_by=current_user.user_id,
            **challenge_data.model_dump()
        )
        
        # Determine status based on dates
        today = date.today()
        if challenge.start_date > today:
            challenge.status = ChallengeStatus.UPCOMING
        elif challenge.end_date < today:
            challenge.status = ChallengeStatus.COMPLETED
        else:
            challenge.status = ChallengeStatus.ACTIVE
        
        db.add(challenge)
        await db.commit()
        await db.refresh(challenge)
        
        return success_response(
            data=WellnessChallengeResponse.model_validate(challenge),
            message="Wellness challenge created successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create challenge: {str(e)}"
        )


@router.get("/challenges", response_model=List[WellnessChallengeResponse])
async def list_challenges(
    status_filter: Optional[str] = Query(None, alias="status"),
    challenge_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all wellness challenges"""
    try:
        # Build query
        query = select(WellnessChallenge).where(
            WellnessChallenge.organization_id == current_user.organization_id,
            WellnessChallenge.is_deleted == False
        )
        
        # Apply filters
        if status_filter:
            query = query.where(WellnessChallenge.status == status_filter)
        
        if challenge_type:
            query = query.where(WellnessChallenge.challenge_type == challenge_type)
        
        # Get participant counts
        query = query.order_by(WellnessChallenge.start_date.desc())
        
        # Paginate
        result = await paginate(db, query, page, limit)
        
        # Convert to response models
        challenges = []
        for challenge in result["items"]:
            # Get participant count
            count_query = select(func.count()).select_from(ChallengeParticipant).where(
                ChallengeParticipant.challenge_id == challenge.challenge_id,
                ChallengeParticipant.is_deleted == False
            )
            count_result = await db.execute(count_query)
            participant_count = count_result.scalar() or 0
            
            challenge_dict = challenge.__dict__.copy()
            challenge_dict['participant_count'] = participant_count
            challenges.append(WellnessChallengeResponse.model_validate(challenge_dict))
        
        return success_response(
            data=challenges,
            pagination={
                "page": result["page"],
                "limit": result["limit"],
                "total": result["total"],
                "pages": result["pages"]
            }
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch challenges: {str(e)}"
        )


@router.get("/challenges/{challenge_id}")
async def get_challenge(
    challenge_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get challenge details"""
    try:
        query = select(WellnessChallenge).where(
            WellnessChallenge.challenge_id == challenge_id,
            WellnessChallenge.organization_id == current_user.organization_id,
            WellnessChallenge.is_deleted == False
        )
        result = await db.execute(query)
        challenge = result.scalar_one_or_none()
        
        if not challenge:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Challenge not found"
            )
        
        # Get participant count
        count_query = select(func.count()).select_from(ChallengeParticipant).where(
            ChallengeParticipant.challenge_id == challenge_id,
            ChallengeParticipant.is_deleted == False
        )
        count_result = await db.execute(count_query)
        participant_count = count_result.scalar() or 0
        
        challenge_dict = challenge.__dict__.copy()
        challenge_dict['participant_count'] = participant_count
        
        return success_response(data=WellnessChallengeResponse.model_validate(challenge_dict))
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch challenge: {str(e)}"
        )


@router.post("/challenges/{challenge_id}/join")
async def join_challenge(
    challenge_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Join a wellness challenge"""
    try:
        # Check if challenge exists
        challenge_query = select(WellnessChallenge).where(
            WellnessChallenge.challenge_id == challenge_id,
            WellnessChallenge.organization_id == current_user.organization_id,
            WellnessChallenge.is_deleted == False
        )
        challenge_result = await db.execute(challenge_query)
        challenge = challenge_result.scalar_one_or_none()
        
        if not challenge:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Challenge not found"
            )
        
        # Check if challenge is active or upcoming
        if challenge.status not in [ChallengeStatus.ACTIVE, ChallengeStatus.UPCOMING]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot join completed or cancelled challenge"
            )
        
        # Check if already participating
        existing_query = select(ChallengeParticipant).where(
            ChallengeParticipant.challenge_id == challenge_id,
            ChallengeParticipant.employee_id == current_user.employee_id,
            ChallengeParticipant.is_deleted == False
        )
        existing_result = await db.execute(existing_query)
        existing = existing_result.scalar_one_or_none()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already participating in this challenge"
            )
        
        # Check max participants
        if challenge.max_participants:
            count_query = select(func.count()).select_from(ChallengeParticipant).where(
                ChallengeParticipant.challenge_id == challenge_id,
                ChallengeParticipant.is_deleted == False
            )
            count_result = await db.execute(count_query)
            current_count = count_result.scalar() or 0
            
            if current_count >= challenge.max_participants:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Challenge has reached maximum participants"
                )
        
        # Create participation
        participant = ChallengeParticipant(
            challenge_id=challenge_id,
            employee_id=current_user.employee_id,
            organization_id=current_user.organization_id,
            goal_value=challenge.goal_value,
            current_value=0.0,
            status=ParticipationStatus.ACTIVE
        )
        
        db.add(participant)
        await db.commit()
        await db.refresh(participant)
        
        return success_response(
            data=ParticipantResponse.model_validate(participant),
            message="Successfully joined challenge"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to join challenge: {str(e)}"
        )


@router.post("/challenges/{challenge_id}/leave")
async def leave_challenge(
    challenge_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Leave a wellness challenge"""
    try:
        # Check if participating
        participant_query = select(ChallengeParticipant).where(
            ChallengeParticipant.challenge_id == challenge_id,
            ChallengeParticipant.employee_id == current_user.employee_id,
            ChallengeParticipant.is_deleted == False
        )
        participant_result = await db.execute(participant_query)
        participant = participant_result.scalar_one_or_none()
        
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Not participating in this challenge"
            )
        
        # Update status to withdrawn
        participant.status = ParticipationStatus.WITHDRAWN
        participant.withdrawn_at = datetime.utcnow()
        participant.modified_at = datetime.utcnow()
        
        await db.commit()
        
        return success_response(message="Successfully left challenge")
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to leave challenge: {str(e)}"
        )


@router.get("/challenges/{challenge_id}/leaderboard")
async def get_leaderboard(
    challenge_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get challenge leaderboard"""
    try:
        # Verify challenge exists
        challenge_query = select(WellnessChallenge).where(
            WellnessChallenge.challenge_id == challenge_id,
            WellnessChallenge.organization_id == current_user.organization_id,
            WellnessChallenge.is_deleted == False
        )
        challenge_result = await db.execute(challenge_query)
        challenge = challenge_result.scalar_one_or_none()
        
        if not challenge:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Challenge not found"
            )
        
        # Get participants ordered by current_value
        query = select(ChallengeParticipant).where(
            ChallengeParticipant.challenge_id == challenge_id,
            ChallengeParticipant.is_deleted == False
        ).order_by(ChallengeParticipant.current_value.desc())
        
        result = await paginate(db, query, page, limit)
        
        # Convert to response with rank
        leaderboard = []
        for idx, participant in enumerate(result["items"], start=(page - 1) * limit + 1):
            leaderboard_entry = {
                **participant.__dict__,
                "rank": idx,
                "completion_percentage": (
                    (participant.current_value / participant.goal_value * 100)
                    if participant.goal_value and participant.goal_value > 0
                    else 0
                )
            }
            leaderboard.append(LeaderboardResponse.model_validate(leaderboard_entry))
        
        return success_response(
            data=leaderboard,
            pagination={
                "page": result["page"],
                "limit": result["limit"],
                "total": result["total"],
                "pages": result["pages"]
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch leaderboard: {str(e)}"
        )


# ==========================================
# WELLNESS ACTIVITIES
# ==========================================

@router.post("/activities", status_code=status.HTTP_201_CREATED)
async def log_activity(
    activity_data: WellnessActivityCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Log a wellness activity"""
    try:
        activity = WellnessActivity(
            employee_id=current_user.employee_id,
            organization_id=current_user.organization_id,
            **activity_data.model_dump()
        )
        
        db.add(activity)
        
        # Update challenge progress if applicable
        # Find active challenges that match this activity
        challenge_query = select(WellnessChallenge).join(
            ChallengeParticipant,
            and_(
                ChallengeParticipant.challenge_id == WellnessChallenge.challenge_id,
                ChallengeParticipant.employee_id == current_user.employee_id,
                ChallengeParticipant.status == ParticipationStatus.ACTIVE
            )
        ).where(
            WellnessChallenge.status == ChallengeStatus.ACTIVE,
            WellnessChallenge.is_deleted == False
        )
        
        challenge_result = await db.execute(challenge_query)
        active_challenges = challenge_result.scalars().all()
        
        for challenge in active_challenges:
            # Update participant progress based on challenge type
            participant_query = select(ChallengeParticipant).where(
                ChallengeParticipant.challenge_id == challenge.challenge_id,
                ChallengeParticipant.employee_id == current_user.employee_id
            )
            participant_result = await db.execute(participant_query)
            participant = participant_result.scalar_one_or_none()
            
            if participant:
                # Add activity value to current progress
                if challenge.challenge_type == "steps" and activity_data.steps:
                    participant.current_value += activity_data.steps
                elif challenge.challenge_type == "exercise" and activity_data.duration_minutes:
                    participant.current_value += activity_data.duration_minutes
                
                participant.modified_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(activity)
        
        return success_response(
            data=WellnessActivityResponse.model_validate(activity),
            message="Activity logged successfully"
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log activity: {str(e)}"
        )


@router.get("/activities", response_model=List[WellnessActivityResponse])
async def list_activities(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    activity_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List wellness activities"""
    try:
        query = select(WellnessActivity).where(
            WellnessActivity.employee_id == current_user.employee_id,
            WellnessActivity.is_deleted == False
        )
        
        if start_date:
            query = query.where(WellnessActivity.activity_date >= start_date)
        
        if end_date:
            query = query.where(WellnessActivity.activity_date <= end_date)
        
        if activity_type:
            query = query.where(WellnessActivity.activity_type == activity_type)
        
        query = query.order_by(WellnessActivity.activity_date.desc())
        
        result = await paginate(db, query, page, limit)
        
        activities = [
            WellnessActivityResponse.model_validate(activity)
            for activity in result["items"]
        ]
        
        return success_response(
            data=activities,
            pagination={
                "page": result["page"],
                "limit": result["limit"],
                "total": result["total"],
                "pages": result["pages"]
            }
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch activities: {str(e)}"
        )


# ==========================================
# HEALTH METRICS
# ==========================================

@router.post("/health-metrics", status_code=status.HTTP_201_CREATED)
async def track_health_metric(
    metric_data: HealthMetricCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Track a health metric"""
    try:
        metric = HealthMetric(
            employee_id=current_user.employee_id,
            organization_id=current_user.organization_id,
            **metric_data.model_dump()
        )
        
        db.add(metric)
        await db.commit()
        await db.refresh(metric)
        
        return success_response(
            data=HealthMetricResponse.model_validate(metric),
            message="Health metric tracked successfully"
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to track health metric: {str(e)}"
        )


@router.get("/health-metrics", response_model=List[HealthMetricResponse])
async def list_health_metrics(
    metric_type: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List health metrics"""
    try:
        query = select(HealthMetric).where(
            HealthMetric.employee_id == current_user.employee_id,
            HealthMetric.is_deleted == False
        )
        
        if metric_type:
            query = query.where(HealthMetric.metric_type == metric_type)
        
        if start_date:
            query = query.where(HealthMetric.recorded_date >= start_date)
        
        if end_date:
            query = query.where(HealthMetric.recorded_date <= end_date)
        
        query = query.order_by(HealthMetric.recorded_date.desc())
        
        result = await paginate(db, query, page, limit)
        
        metrics = [
            HealthMetricResponse.model_validate(metric)
            for metric in result["items"]
        ]
        
        return success_response(
            data=metrics,
            pagination={
                "page": result["page"],
                "limit": result["limit"],
                "total": result["total"],
                "pages": result["pages"]
            }
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch health metrics: {str(e)}"
        )


# ==========================================
# WELLNESS BENEFITS
# ==========================================

@router.get("/benefits", response_model=List[WellnessBenefitResponse])
async def list_wellness_benefits(
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List available wellness benefits"""
    try:
        query = select(WellnessBenefit).where(
            WellnessBenefit.organization_id == current_user.organization_id,
            WellnessBenefit.is_active == True,
            WellnessBenefit.is_deleted == False
        )
        
        if category:
            query = query.where(WellnessBenefit.benefit_category == category)
        
        query = query.order_by(WellnessBenefit.benefit_name)
        
        result = await db.execute(query)
        benefits = result.scalars().all()
        
        return success_response(
            data=[WellnessBenefitResponse.model_validate(b) for b in benefits]
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch wellness benefits: {str(e)}"
        )


@router.post("/benefits/{benefit_id}/enroll", status_code=status.HTTP_201_CREATED)
async def enroll_in_benefit(
    benefit_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Enroll in a wellness benefit"""
    try:
        # Check if benefit exists
        benefit_query = select(WellnessBenefit).where(
            WellnessBenefit.benefit_id == benefit_id,
            WellnessBenefit.organization_id == current_user.organization_id,
            WellnessBenefit.is_active == True,
            WellnessBenefit.is_deleted == False
        )
        benefit_result = await db.execute(benefit_query)
        benefit = benefit_result.scalar_one_or_none()
        
        if not benefit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Wellness benefit not found"
            )
        
        # Check if already enrolled
        existing_query = select(WellnessBenefitEnrollment).where(
            WellnessBenefitEnrollment.benefit_id == benefit_id,
            WellnessBenefitEnrollment.employee_id == current_user.employee_id,
            WellnessBenefitEnrollment.is_deleted == False
        )
        existing_result = await db.execute(existing_query)
        existing = existing_result.scalar_one_or_none()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already enrolled in this benefit"
            )
        
        # Create enrollment
        enrollment = WellnessBenefitEnrollment(
            benefit_id=benefit_id,
            employee_id=current_user.employee_id,
            organization_id=current_user.organization_id,
            enrollment_status="active"
        )
        
        db.add(enrollment)
        await db.commit()
        await db.refresh(enrollment)
        
        return success_response(
            data=enrollment,
            message="Successfully enrolled in wellness benefit"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enroll in benefit: {str(e)}"
        )


# ==========================================
# BURNOUT ASSESSMENT
# ==========================================

@router.post("/burnout-assessment", status_code=status.HTTP_201_CREATED)
async def submit_burnout_assessment(
    assessment_data: BurnoutAssessmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit burnout assessment"""
    try:
        # Calculate risk level based on scores
        avg_score = (
            assessment_data.emotional_exhaustion_score +
            assessment_data.depersonalization_score +
            assessment_data.personal_accomplishment_score
        ) / 3
        
        if avg_score >= 4:
            risk_level = "high"
        elif avg_score >= 3:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        assessment = BurnoutAssessment(
            employee_id=current_user.employee_id,
            organization_id=current_user.organization_id,
            risk_level=risk_level,
            **assessment_data.model_dump()
        )
        
        db.add(assessment)
        await db.commit()
        await db.refresh(assessment)
        
        return success_response(
            data=BurnoutAssessmentResponse.model_validate(assessment),
            message="Burnout assessment submitted successfully"
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit assessment: {str(e)}"
        )


@router.get("/burnout-assessment/latest")
async def get_latest_burnout_assessment(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get latest burnout assessment"""
    try:
        query = select(BurnoutAssessment).where(
            BurnoutAssessment.employee_id == current_user.employee_id,
            BurnoutAssessment.is_deleted == False
        ).order_by(BurnoutAssessment.assessment_date.desc()).limit(1)
        
        result = await db.execute(query)
        assessment = result.scalar_one_or_none()
        
        if not assessment:
            return success_response(data=None, message="No assessments found")
        
        return success_response(
            data=BurnoutAssessmentResponse.model_validate(assessment)
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch assessment: {str(e)}"
        )
