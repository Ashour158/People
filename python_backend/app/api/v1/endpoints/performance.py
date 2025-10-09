"""
Performance Management API Endpoints
Complete performance management with goals, reviews, 360-degree feedback, and KPIs
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal
import structlog
import uuid

from app.db.database import get_db
from app.middleware.auth import AuthMiddleware
from app.schemas.schemas import BaseResponse
from app.models.models import Employee
from app.events.event_dispatcher import EventDispatcher
from pydantic import BaseModel, Field, validator

logger = structlog.get_logger()
router = APIRouter(prefix="/performance", tags=["Performance Management"])


# ============= Pydantic Models =============

class Goal(BaseModel):
    """Goal/Objective model following SMART framework"""
    title: str = Field(..., min_length=3, max_length=200)
    description: str
    goal_type: str = Field(..., description="individual, team, organizational")
    category: str = Field(..., description="revenue, customer, process, learning")
    target_value: Optional[Decimal] = None
    current_value: Optional[Decimal] = Field(default=Decimal(0))
    unit: Optional[str] = Field(None, description="%, count, currency")
    weight: int = Field(default=10, ge=1, le=100, description="Goal weight in percentage")
    start_date: date
    end_date: date
    status: str = Field(default="not_started", description="not_started, in_progress, completed, cancelled")
    
    @validator('goal_type')
    def validate_goal_type(cls, v):
        allowed = ['individual', 'team', 'organizational']
        if v not in allowed:
            raise ValueError(f'goal_type must be one of {allowed}')
        return v


class GoalCreate(Goal):
    """Create goal request"""
    employee_id: str
    manager_id: Optional[str] = None
    aligned_to_goal_id: Optional[str] = Field(None, description="Parent goal if cascaded")


class GoalUpdate(BaseModel):
    """Update goal progress"""
    current_value: Optional[Decimal] = None
    status: Optional[str] = None
    progress_notes: Optional[str] = None


class PerformanceReview(BaseModel):
    """Performance review model"""
    review_cycle_id: str
    employee_id: str
    reviewer_id: str
    review_type: str = Field(..., description="self, manager, peer, subordinate, 360")
    review_period_start: date
    review_period_end: date
    overall_rating: Optional[Decimal] = Field(None, ge=1, le=5)
    strengths: Optional[str] = None
    areas_of_improvement: Optional[str] = None
    achievements: Optional[str] = None
    development_areas: Optional[str] = None
    comments: Optional[str] = None
    status: str = Field(default="draft", description="draft, submitted, completed")


class ReviewCycleCreate(BaseModel):
    """Create review cycle"""
    name: str = Field(..., description="Q1 2024 Reviews")
    cycle_type: str = Field(..., description="quarterly, half_yearly, annual")
    start_date: date
    end_date: date
    review_template_id: Optional[str] = None
    
    @validator('cycle_type')
    def validate_cycle_type(cls, v):
        allowed = ['quarterly', 'half_yearly', 'annual']
        if v not in allowed:
            raise ValueError(f'cycle_type must be one of {allowed}')
        return v


class CompetencyRating(BaseModel):
    """Competency rating"""
    competency_name: str
    rating: Decimal = Field(..., ge=1, le=5)
    comments: Optional[str] = None


class FeedbackRequest(BaseModel):
    """360-degree feedback request"""
    employee_id: str
    feedback_type: str = Field(..., description="self, manager, peer, subordinate, customer")
    reviewer_id: str
    review_cycle_id: str
    competencies: List[CompetencyRating] = Field(default_factory=list)
    overall_comments: Optional[str] = None
    strengths: List[str] = Field(default_factory=list)
    development_areas: List[str] = Field(default_factory=list)


class KPIDefinition(BaseModel):
    """KPI definition"""
    kpi_name: str
    description: str
    measurement_unit: str = Field(..., description="%, count, currency, days")
    target_value: Decimal
    frequency: str = Field(..., description="daily, weekly, monthly, quarterly, annual")
    calculation_method: str
    
    @validator('frequency')
    def validate_frequency(cls, v):
        allowed = ['daily', 'weekly', 'monthly', 'quarterly', 'annual']
        if v not in allowed:
            raise ValueError(f'frequency must be one of {allowed}')
        return v


class KPIDataPoint(BaseModel):
    """KPI data point"""
    kpi_id: str
    employee_id: str
    period_start: date
    period_end: date
    actual_value: Decimal
    target_value: Decimal
    notes: Optional[str] = None


class DevelopmentPlan(BaseModel):
    """Individual development plan"""
    employee_id: str
    plan_name: str
    skills_to_develop: List[str]
    training_required: List[str]
    target_completion_date: date
    status: str = Field(default="active", description="active, completed, cancelled")


# ============= API Endpoints =============

@router.post("/goals", response_model=BaseResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    data: GoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Create a new performance goal"""
    
    # Verify employee exists
    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.employee_id == uuid.UUID(data.employee_id),
                Employee.organization_id == uuid.UUID(current_user["organization_id"])
            )
        )
    )
    employee = result.scalar_one_or_none()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    goal_id = str(uuid.uuid4())
    
    logger.info(f"Goal created: {goal_id} for employee {data.employee_id}")
    
    await EventDispatcher.dispatch("goal.created", {
        "goal_id": goal_id,
        "employee_id": data.employee_id,
        "title": data.title,
        "start_date": data.start_date.isoformat()
    })
    
    return BaseResponse(
        success=True,
        message="Goal created successfully",
        data={
            "goal_id": goal_id,
            "employee_id": data.employee_id,
            "title": data.title,
            "goal_type": data.goal_type,
            "weight": data.weight,
            "target_value": float(data.target_value) if data.target_value else None,
            "start_date": data.start_date.isoformat(),
            "end_date": data.end_date.isoformat(),
            "status": data.status
        }
    )


@router.get("/goals/{goal_id}", response_model=BaseResponse)
async def get_goal(
    goal_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Get goal details"""
    
    # In production, query from goals table
    # For now, return mock data
    return BaseResponse(
        success=True,
        message="Goal retrieved",
        data={
            "goal_id": goal_id,
            "title": "Increase Sales by 20%",
            "description": "Achieve 20% growth in sales revenue",
            "goal_type": "individual",
            "category": "revenue",
            "target_value": 1000000,
            "current_value": 650000,
            "progress_percentage": 65.0,
            "status": "in_progress",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31"
        }
    )


@router.put("/goals/{goal_id}/progress", response_model=BaseResponse)
async def update_goal_progress(
    goal_id: str,
    data: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Update goal progress"""
    
    logger.info(f"Goal progress updated: {goal_id}")
    
    await EventDispatcher.dispatch("goal.updated", {
        "goal_id": goal_id,
        "current_value": float(data.current_value) if data.current_value else None,
        "status": data.status
    })
    
    return BaseResponse(
        success=True,
        message="Goal progress updated",
        data={
            "goal_id": goal_id,
            "current_value": float(data.current_value) if data.current_value else None,
            "status": data.status or "in_progress",
            "updated_at": datetime.now().isoformat()
        }
    )


@router.get("/goals/employee/{employee_id}", response_model=BaseResponse)
async def get_employee_goals(
    employee_id: str,
    status: Optional[str] = Query(None),
    cycle: Optional[str] = Query(None, description="current, previous"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Get all goals for an employee"""
    
    # Mock data for demonstration
    goals = [
        {
            "goal_id": str(uuid.uuid4()),
            "title": "Increase Sales by 20%",
            "goal_type": "individual",
            "category": "revenue",
            "target_value": 1000000,
            "current_value": 650000,
            "progress_percentage": 65.0,
            "weight": 30,
            "status": "in_progress",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31"
        },
        {
            "goal_id": str(uuid.uuid4()),
            "title": "Complete Leadership Training",
            "goal_type": "individual",
            "category": "learning",
            "target_value": 100,
            "current_value": 75,
            "progress_percentage": 75.0,
            "weight": 20,
            "status": "in_progress",
            "start_date": "2024-01-01",
            "end_date": "2024-06-30"
        },
        {
            "goal_id": str(uuid.uuid4()),
            "title": "Improve Customer Satisfaction Score",
            "goal_type": "team",
            "category": "customer",
            "target_value": 4.5,
            "current_value": 4.2,
            "progress_percentage": 93.3,
            "weight": 25,
            "status": "in_progress",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31"
        }
    ]
    
    if status:
        goals = [g for g in goals if g["status"] == status]
    
    return BaseResponse(
        success=True,
        message=f"Retrieved {len(goals)} goals",
        data={
            "employee_id": employee_id,
            "total_goals": len(goals),
            "goals": goals
        }
    )


@router.post("/review-cycles", response_model=BaseResponse, status_code=status.HTTP_201_CREATED)
async def create_review_cycle(
    data: ReviewCycleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Create a new performance review cycle"""
    
    cycle_id = str(uuid.uuid4())
    
    logger.info(f"Review cycle created: {cycle_id}")
    
    return BaseResponse(
        success=True,
        message="Review cycle created successfully",
        data={
            "cycle_id": cycle_id,
            "name": data.name,
            "cycle_type": data.cycle_type,
            "start_date": data.start_date.isoformat(),
            "end_date": data.end_date.isoformat(),
            "status": "active"
        }
    )


@router.post("/reviews", response_model=BaseResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    data: PerformanceReview,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Create a performance review"""
    
    # Verify employee and reviewer exist
    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.employee_id == uuid.UUID(data.employee_id),
                Employee.organization_id == uuid.UUID(current_user["organization_id"])
            )
        )
    )
    employee = result.scalar_one_or_none()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    review_id = str(uuid.uuid4())
    
    logger.info(f"Performance review created: {review_id}")
    
    await EventDispatcher.dispatch("review.created", {
        "review_id": review_id,
        "employee_id": data.employee_id,
        "reviewer_id": data.reviewer_id,
        "review_type": data.review_type
    })
    
    return BaseResponse(
        success=True,
        message="Performance review created successfully",
        data={
            "review_id": review_id,
            "employee_id": data.employee_id,
            "reviewer_id": data.reviewer_id,
            "review_type": data.review_type,
            "status": data.status,
            "created_at": datetime.now().isoformat()
        }
    )


@router.post("/feedback", response_model=BaseResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    data: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Submit 360-degree feedback"""
    
    # Verify employee exists
    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.employee_id == uuid.UUID(data.employee_id),
                Employee.organization_id == uuid.UUID(current_user["organization_id"])
            )
        )
    )
    employee = result.scalar_one_or_none()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    feedback_id = str(uuid.uuid4())
    
    # Calculate average rating
    avg_rating = 0
    if data.competencies:
        total = sum(c.rating for c in data.competencies)
        avg_rating = float(total / len(data.competencies))
    
    logger.info(f"360-degree feedback submitted: {feedback_id}")
    
    await EventDispatcher.dispatch("feedback.submitted", {
        "feedback_id": feedback_id,
        "employee_id": data.employee_id,
        "reviewer_id": data.reviewer_id,
        "feedback_type": data.feedback_type,
        "average_rating": avg_rating
    })
    
    return BaseResponse(
        success=True,
        message="Feedback submitted successfully",
        data={
            "feedback_id": feedback_id,
            "employee_id": data.employee_id,
            "reviewer_id": data.reviewer_id,
            "feedback_type": data.feedback_type,
            "competencies_rated": len(data.competencies),
            "average_rating": avg_rating,
            "submitted_at": datetime.now().isoformat()
        }
    )


@router.get("/feedback/employee/{employee_id}", response_model=BaseResponse)
async def get_employee_feedback(
    employee_id: str,
    review_cycle_id: Optional[str] = Query(None),
    feedback_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Get 360-degree feedback for an employee"""
    
    # Mock feedback data
    feedback = {
        "employee_id": employee_id,
        "review_cycle_id": review_cycle_id or str(uuid.uuid4()),
        "feedback_summary": {
            "self_review": {
                "rating": 4.2,
                "status": "completed"
            },
            "manager_review": {
                "rating": 4.5,
                "status": "completed"
            },
            "peer_reviews": {
                "count": 3,
                "average_rating": 4.3,
                "status": "completed"
            },
            "subordinate_reviews": {
                "count": 2,
                "average_rating": 4.4,
                "status": "completed"
            }
        },
        "overall_rating": 4.35,
        "top_strengths": [
            "Leadership",
            "Communication",
            "Problem Solving"
        ],
        "development_areas": [
            "Time Management",
            "Delegation"
        ]
    }
    
    return BaseResponse(
        success=True,
        message="Feedback retrieved successfully",
        data=feedback
    )


@router.post("/kpis", response_model=BaseResponse, status_code=status.HTTP_201_CREATED)
async def create_kpi(
    data: KPIDefinition,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Create a KPI definition"""
    
    kpi_id = str(uuid.uuid4())
    
    logger.info(f"KPI created: {kpi_id}")
    
    return BaseResponse(
        success=True,
        message="KPI created successfully",
        data={
            "kpi_id": kpi_id,
            "kpi_name": data.kpi_name,
            "measurement_unit": data.measurement_unit,
            "target_value": float(data.target_value),
            "frequency": data.frequency,
            "created_at": datetime.now().isoformat()
        }
    )


@router.post("/kpis/data", response_model=BaseResponse)
async def record_kpi_data(
    data: KPIDataPoint,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Record KPI data point"""
    
    # Calculate achievement percentage
    achievement = (data.actual_value / data.target_value) * 100 if data.target_value > 0 else 0
    
    logger.info(f"KPI data recorded for {data.kpi_id}")
    
    return BaseResponse(
        success=True,
        message="KPI data recorded successfully",
        data={
            "kpi_id": data.kpi_id,
            "employee_id": data.employee_id,
            "period_start": data.period_start.isoformat(),
            "period_end": data.period_end.isoformat(),
            "actual_value": float(data.actual_value),
            "target_value": float(data.target_value),
            "achievement_percentage": float(achievement),
            "status": "achieved" if achievement >= 100 else "in_progress"
        }
    )


@router.get("/kpis/employee/{employee_id}", response_model=BaseResponse)
async def get_employee_kpis(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Get KPIs for an employee"""
    
    # Mock KPI data
    kpis = [
        {
            "kpi_id": str(uuid.uuid4()),
            "kpi_name": "Sales Target Achievement",
            "measurement_unit": "currency",
            "frequency": "monthly",
            "target_value": 100000,
            "current_value": 85000,
            "achievement_percentage": 85.0,
            "trend": "up"
        },
        {
            "kpi_id": str(uuid.uuid4()),
            "kpi_name": "Customer Satisfaction Score",
            "measurement_unit": "rating",
            "frequency": "quarterly",
            "target_value": 4.5,
            "current_value": 4.3,
            "achievement_percentage": 95.6,
            "trend": "stable"
        },
        {
            "kpi_id": str(uuid.uuid4()),
            "kpi_name": "Project Delivery on Time",
            "measurement_unit": "%",
            "frequency": "monthly",
            "target_value": 95,
            "current_value": 92,
            "achievement_percentage": 96.8,
            "trend": "up"
        }
    ]
    
    return BaseResponse(
        success=True,
        message=f"Retrieved {len(kpis)} KPIs",
        data={
            "employee_id": employee_id,
            "total_kpis": len(kpis),
            "kpis": kpis
        }
    )


@router.post("/development-plan", response_model=BaseResponse, status_code=status.HTTP_201_CREATED)
async def create_development_plan(
    data: DevelopmentPlan,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Create individual development plan"""
    
    # Verify employee exists
    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.employee_id == uuid.UUID(data.employee_id),
                Employee.organization_id == uuid.UUID(current_user["organization_id"])
            )
        )
    )
    employee = result.scalar_one_or_none()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    plan_id = str(uuid.uuid4())
    
    logger.info(f"Development plan created: {plan_id}")
    
    return BaseResponse(
        success=True,
        message="Development plan created successfully",
        data={
            "plan_id": plan_id,
            "employee_id": data.employee_id,
            "plan_name": data.plan_name,
            "skills_count": len(data.skills_to_develop),
            "training_count": len(data.training_required),
            "target_completion_date": data.target_completion_date.isoformat(),
            "status": data.status
        }
    )


@router.get("/analytics/performance-trends")
async def get_performance_trends(
    period: str = Query("quarterly", description="monthly, quarterly, annual"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Get organization-wide performance trends"""
    
    # Mock analytics data
    trends = {
        "period": period,
        "organization_id": current_user["organization_id"],
        "metrics": {
            "average_performance_rating": 4.2,
            "goal_achievement_rate": 78.5,
            "review_completion_rate": 92.0,
            "high_performers_percentage": 25.0,
            "improvement_needed_percentage": 8.0
        },
        "trends": [
            {
                "period": "Q1 2024",
                "average_rating": 4.0,
                "goal_achievement": 75.0
            },
            {
                "period": "Q2 2024",
                "average_rating": 4.1,
                "goal_achievement": 76.5
            },
            {
                "period": "Q3 2024",
                "average_rating": 4.2,
                "goal_achievement": 78.5
            }
        ],
        "top_competencies": [
            {"name": "Communication", "average_rating": 4.5},
            {"name": "Teamwork", "average_rating": 4.4},
            {"name": "Problem Solving", "average_rating": 4.3}
        ],
        "areas_needing_focus": [
            {"name": "Leadership", "average_rating": 3.8},
            {"name": "Strategic Thinking", "average_rating": 3.9}
        ]
    }
    
    return BaseResponse(
        success=True,
        message="Performance trends retrieved",
        data=trends
    )


@router.get("/reports/calibration")
async def get_calibration_report(
    review_cycle_id: str = Query(...),
    department_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Get performance calibration report for a review cycle"""
    
    # Mock calibration data
    calibration = {
        "review_cycle_id": review_cycle_id,
        "total_employees": 150,
        "reviews_completed": 145,
        "completion_rate": 96.7,
        "rating_distribution": {
            "5_exceptional": {"count": 15, "percentage": 10.0},
            "4_exceeds_expectations": {"count": 45, "percentage": 30.0},
            "3_meets_expectations": {"count": 70, "percentage": 46.7},
            "2_needs_improvement": {"count": 12, "percentage": 8.0},
            "1_unsatisfactory": {"count": 3, "percentage": 2.0}
        },
        "department_comparison": [
            {
                "department": "Sales",
                "average_rating": 4.3,
                "total_employees": 50
            },
            {
                "department": "Engineering",
                "average_rating": 4.2,
                "total_employees": 60
            },
            {
                "department": "Operations",
                "average_rating": 4.0,
                "total_employees": 40
            }
        ],
        "recommendations": [
            "Consider additional development programs for employees rated below 3",
            "Recognition programs for top 10% performers",
            "Manager training on performance feedback"
        ]
    }
    
    return BaseResponse(
        success=True,
        message="Calibration report retrieved",
        data=calibration
    )
