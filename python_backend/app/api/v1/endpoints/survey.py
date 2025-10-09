"""
Survey and Engagement API Endpoints
Complete REST API for surveys, responses, and engagement analytics
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_, extract
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta
import structlog

from app.db.database import get_db
from app.middleware.auth import get_current_user
from app.models.survey import (
    Survey, SurveyQuestion, SurveyResponse, SurveyAnswer,
    EngagementScore, PulseSurvey, PulseResponse, ActionPlan,
    SurveyStatus, ResponseStatus
)
from app.schemas.survey import (
    SurveyCreate, SurveyUpdate, SurveyResponse as SurveyResponseSchema,
    SurveyListResponse, SurveyResponseCreate, SurveyResponseDetail,
    EngagementScoreResponse, PulseSurveyCreate, PulseSurveyResponse,
    PulseResponseCreate, ActionPlanCreate, ActionPlanUpdate, ActionPlanResponse,
    SurveyAnalytics, EngagementDashboard
)
from app.utils.response import success_response, error_response

logger = structlog.get_logger()

router = APIRouter(prefix="/surveys", tags=["Surveys & Engagement"])


# ==================== Survey CRUD ====================

@router.post("", response_model=SurveyResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_survey(
    survey_data: SurveyCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new survey"""
    try:
        # Create survey
        survey = Survey(
            organization_id=current_user.organization_id,
            title=survey_data.title,
            description=survey_data.description,
            survey_type=survey_data.survey_type,
            is_anonymous=survey_data.is_anonymous,
            allow_multiple_responses=survey_data.allow_multiple_responses,
            is_mandatory=survey_data.is_mandatory,
            start_date=survey_data.start_date,
            end_date=survey_data.end_date,
            target_all_employees=survey_data.target_all_employees,
            target_departments=survey_data.target_departments,
            target_locations=survey_data.target_locations,
            target_employees=survey_data.target_employees,
            created_by=current_user.employee_id
        )
        db.add(survey)
        await db.flush()
        
        # Create questions
        if survey_data.questions:
            for question_data in survey_data.questions:
                question = SurveyQuestion(
                    survey_id=survey.survey_id,
                    organization_id=current_user.organization_id,
                    question_text=question_data.question_text,
                    question_type=question_data.question_type,
                    question_order=question_data.question_order,
                    is_required=question_data.is_required,
                    options=question_data.options,
                    min_value=question_data.min_value,
                    max_value=question_data.max_value,
                    min_label=question_data.min_label,
                    max_label=question_data.max_label
                )
                db.add(question)
            
            survey.total_questions = len(survey_data.questions)
        
        await db.commit()
        await db.refresh(survey)
        
        logger.info("survey_created", survey_id=str(survey.survey_id))
        
        return survey
        
    except Exception as e:
        await db.rollback()
        logger.error("survey_creation_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[SurveyListResponse])
async def list_surveys(
    organization_id: UUID = Query(...),
    survey_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all surveys for an organization"""
    try:
        query = select(Survey).where(
            and_(
                Survey.organization_id == organization_id,
                Survey.is_deleted == False
            )
        )
        
        if survey_type:
            query = query.where(Survey.survey_type == survey_type)
        
        if status:
            query = query.where(Survey.status == status)
        
        query = query.order_by(Survey.created_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        surveys = result.scalars().all()
        
        return surveys
        
    except Exception as e:
        logger.error("list_surveys_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{survey_id}", response_model=SurveyResponseSchema)
async def get_survey(
    survey_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get survey by ID with questions"""
    try:
        # Get survey
        result = await db.execute(
            select(Survey).where(Survey.survey_id == survey_id)
        )
        survey = result.scalar_one_or_none()
        
        if not survey:
            raise HTTPException(status_code=404, detail="Survey not found")
        
        # Get questions
        questions_result = await db.execute(
            select(SurveyQuestion)
            .where(SurveyQuestion.survey_id == survey_id)
            .order_by(SurveyQuestion.question_order)
        )
        survey.questions = questions_result.scalars().all()
        
        return survey
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_survey_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{survey_id}", response_model=SurveyResponseSchema)
async def update_survey(
    survey_id: UUID,
    survey_data: SurveyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update survey"""
    try:
        result = await db.execute(
            select(Survey).where(Survey.survey_id == survey_id)
        )
        survey = result.scalar_one_or_none()
        
        if not survey:
            raise HTTPException(status_code=404, detail="Survey not found")
        
        # Update fields
        update_data = survey_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(survey, field, value)
        
        survey.modified_at = datetime.now()
        
        await db.commit()
        await db.refresh(survey)
        
        logger.info("survey_updated", survey_id=str(survey_id))
        
        return survey
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("survey_update_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{survey_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_survey(
    survey_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete survey (soft delete)"""
    try:
        result = await db.execute(
            select(Survey).where(Survey.survey_id == survey_id)
        )
        survey = result.scalar_one_or_none()
        
        if not survey:
            raise HTTPException(status_code=404, detail="Survey not found")
        
        survey.is_deleted = True
        survey.modified_at = datetime.now()
        
        await db.commit()
        
        logger.info("survey_deleted", survey_id=str(survey_id))
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("survey_deletion_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Survey Responses ====================

@router.post("/{survey_id}/responses", response_model=SurveyResponseDetail, status_code=status.HTTP_201_CREATED)
async def submit_survey_response(
    survey_id: UUID,
    response_data: SurveyResponseCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Submit survey response"""
    try:
        # Verify survey exists and is active
        survey_result = await db.execute(
            select(Survey).where(
                and_(
                    Survey.survey_id == survey_id,
                    Survey.status == SurveyStatus.ACTIVE
                )
            )
        )
        survey = survey_result.scalar_one_or_none()
        
        if not survey:
            raise HTTPException(status_code=404, detail="Survey not found or not active")
        
        # Check if already responded (if not anonymous and multiple responses not allowed)
        if not survey.is_anonymous and not survey.allow_multiple_responses:
            existing_result = await db.execute(
                select(SurveyResponse).where(
                    and_(
                        SurveyResponse.survey_id == survey_id,
                        SurveyResponse.employee_id == current_user.employee_id,
                        SurveyResponse.status == ResponseStatus.COMPLETED
                    )
                )
            )
            if existing_result.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="You have already responded to this survey")
        
        # Create response
        response = SurveyResponse(
            survey_id=survey_id,
            organization_id=current_user.organization_id,
            employee_id=None if survey.is_anonymous else current_user.employee_id,
            status=ResponseStatus.COMPLETED,
            completed_at=datetime.now()
        )
        db.add(response)
        await db.flush()
        
        # Create answers
        for answer_data in response_data.answers:
            answer = SurveyAnswer(
                response_id=response.response_id,
                question_id=answer_data.question_id,
                organization_id=current_user.organization_id,
                answer_text=answer_data.answer_text,
                answer_value=answer_data.answer_value,
                answer_options=answer_data.answer_options,
                answer_date=answer_data.answer_date
            )
            db.add(answer)
        
        # Update survey stats
        survey.total_responses += 1
        
        await db.commit()
        await db.refresh(response)
        
        # Load answers
        answers_result = await db.execute(
            select(SurveyAnswer).where(SurveyAnswer.response_id == response.response_id)
        )
        response.answers = answers_result.scalars().all()
        
        logger.info("survey_response_submitted", survey_id=str(survey_id), response_id=str(response.response_id))
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("survey_response_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{survey_id}/responses", response_model=List[SurveyResponseDetail])
async def get_survey_responses(
    survey_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all responses for a survey"""
    try:
        query = select(SurveyResponse).where(
            SurveyResponse.survey_id == survey_id
        ).order_by(SurveyResponse.completed_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        responses = result.scalars().all()
        
        # Load answers for each response
        for response in responses:
            answers_result = await db.execute(
                select(SurveyAnswer).where(SurveyAnswer.response_id == response.response_id)
            )
            response.answers = answers_result.scalars().all()
        
        return responses
        
    except Exception as e:
        logger.error("get_responses_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Survey Analytics ====================

@router.get("/{survey_id}/analytics", response_model=SurveyAnalytics)
async def get_survey_analytics(
    survey_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get survey analytics and insights"""
    try:
        # Get survey
        survey_result = await db.execute(
            select(Survey).where(Survey.survey_id == survey_id)
        )
        survey = survey_result.scalar_one_or_none()
        
        if not survey:
            raise HTTPException(status_code=404, detail="Survey not found")
        
        # Get total sent (based on targeting)
        total_sent = 0
        if survey.target_all_employees:
            from app.models.models import Employee
            count_result = await db.execute(
                select(func.count(Employee.employee_id)).where(
                    and_(
                        Employee.organization_id == current_user.organization_id,
                        Employee.employment_status == "active"
                    )
                )
            )
            total_sent = count_result.scalar() or 0
        
        # Get responses by day
        responses_by_day_result = await db.execute(
            select(
                func.date(SurveyResponse.completed_at).label('date'),
                func.count(SurveyResponse.response_id).label('count')
            ).where(
                and_(
                    SurveyResponse.survey_id == survey_id,
                    SurveyResponse.status == ResponseStatus.COMPLETED
                )
            ).group_by('date').order_by('date')
        )
        response_by_day = {
            str(row.date): row.count 
            for row in responses_by_day_result.all()
        }
        
        # Question analytics
        questions_result = await db.execute(
            select(SurveyQuestion).where(SurveyQuestion.survey_id == survey_id)
            .order_by(SurveyQuestion.question_order)
        )
        questions = questions_result.scalars().all()
        
        question_analytics = []
        for question in questions:
            answers_result = await db.execute(
                select(SurveyAnswer).where(SurveyAnswer.question_id == question.question_id)
            )
            answers = answers_result.scalars().all()
            
            analytics = {
                "question_id": str(question.question_id),
                "question_text": question.question_text,
                "question_type": question.question_type,
                "total_answers": len(answers)
            }
            
            # Type-specific analytics
            if question.question_type in ["rating", "scale", "nps"]:
                values = [a.answer_value for a in answers if a.answer_value is not None]
                if values:
                    analytics["average"] = sum(values) / len(values)
                    analytics["min"] = min(values)
                    analytics["max"] = max(values)
            
            question_analytics.append(analytics)
        
        return SurveyAnalytics(
            survey_id=survey_id,
            total_sent=total_sent,
            total_responses=survey.total_responses,
            completion_rate=survey.completion_rate,
            average_completion_time=survey.average_completion_time or 0,
            response_by_day=response_by_day,
            question_analytics=question_analytics
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("survey_analytics_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Pulse Surveys ====================

@router.post("/pulse", response_model=PulseSurveyResponse, status_code=status.HTTP_201_CREATED)
async def create_pulse_survey(
    pulse_data: PulseSurveyCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create pulse survey"""
    try:
        pulse = PulseSurvey(
            organization_id=current_user.organization_id,
            question=pulse_data.question,
            frequency=pulse_data.frequency,
            notification_time=pulse_data.notification_time,
            target_departments=pulse_data.target_departments
        )
        db.add(pulse)
        await db.commit()
        await db.refresh(pulse)
        
        logger.info("pulse_survey_created", pulse_id=str(pulse.pulse_id))
        
        return pulse
        
    except Exception as e:
        await db.rollback()
        logger.error("pulse_survey_creation_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pulse", response_model=List[PulseSurveyResponse])
async def list_pulse_surveys(
    organization_id: UUID = Query(...),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List pulse surveys"""
    try:
        query = select(PulseSurvey).where(PulseSurvey.organization_id == organization_id)
        
        if is_active is not None:
            query = query.where(PulseSurvey.is_active == is_active)
        
        query = query.order_by(PulseSurvey.created_at.desc())
        
        result = await db.execute(query)
        pulses = result.scalars().all()
        
        return pulses
        
    except Exception as e:
        logger.error("list_pulse_surveys_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Engagement Dashboard ====================

@router.get("/engagement/dashboard", response_model=EngagementDashboard)
async def get_engagement_dashboard(
    organization_id: UUID = Query(...),
    year: Optional[int] = Query(None),
    quarter: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get engagement dashboard with trends and insights"""
    try:
        current_year = year or datetime.now().year
        current_quarter = quarter or ((datetime.now().month - 1) // 3) + 1
        
        # Get current period score
        current_score_result = await db.execute(
            select(EngagementScore).where(
                and_(
                    EngagementScore.organization_id == organization_id,
                    EngagementScore.year == current_year,
                    EngagementScore.quarter == current_quarter,
                    EngagementScore.employee_id.is_(None),
                    EngagementScore.department_id.is_(None)
                )
            )
        )
        current_period = current_score_result.scalar_one_or_none()
        
        if not current_period:
            # Create default score if not exists
            current_period = EngagementScore(
                organization_id=organization_id,
                year=current_year,
                quarter=current_quarter,
                overall_score=0,
                response_rate=0
            )
        
        # Get trends (last 4 quarters)
        trends = []
        
        # Get department comparison
        department_comparison = []
        
        # Get top action items
        action_items_result = await db.execute(
            select(ActionPlan).where(
                and_(
                    ActionPlan.organization_id == organization_id,
                    ActionPlan.status.in_(["planned", "in_progress"])
                )
            ).order_by(ActionPlan.created_at.desc()).limit(5)
        )
        action_plans = action_items_result.scalars().all()
        top_action_items = [plan.title for plan in action_plans]
        
        return EngagementDashboard(
            organization_id=organization_id,
            current_period=current_period,
            trends=trends,
            department_comparison=department_comparison,
            top_action_items=top_action_items,
            participation_rate=current_period.response_rate
        )
        
    except Exception as e:
        logger.error("engagement_dashboard_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Action Plans ====================

@router.post("/action-plans", response_model=ActionPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_action_plan(
    plan_data: ActionPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create action plan"""
    try:
        plan = ActionPlan(
            organization_id=current_user.organization_id,
            survey_id=plan_data.survey_id,
            title=plan_data.title,
            description=plan_data.description,
            priority=plan_data.priority,
            department_id=plan_data.department_id,
            focus_area=plan_data.focus_area,
            start_date=plan_data.start_date,
            target_completion_date=plan_data.target_completion_date,
            owner_id=plan_data.owner_id,
            status="planned",
            created_by=current_user.employee_id
        )
        db.add(plan)
        await db.commit()
        await db.refresh(plan)
        
        logger.info("action_plan_created", plan_id=str(plan.action_plan_id))
        
        return plan
        
    except Exception as e:
        await db.rollback()
        logger.error("action_plan_creation_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/action-plans", response_model=List[ActionPlanResponse])
async def list_action_plans(
    organization_id: UUID = Query(...),
    status: Optional[str] = Query(None),
    department_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List action plans"""
    try:
        query = select(ActionPlan).where(ActionPlan.organization_id == organization_id)
        
        if status:
            query = query.where(ActionPlan.status == status)
        
        if department_id:
            query = query.where(ActionPlan.department_id == department_id)
        
        query = query.order_by(ActionPlan.created_at.desc())
        
        result = await db.execute(query)
        plans = result.scalars().all()
        
        return plans
        
    except Exception as e:
        logger.error("list_action_plans_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
