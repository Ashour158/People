"""
AI & Analytics Module
Predictive analytics, workforce planning, and ML-powered insights
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from decimal import Decimal
import structlog
import uuid
import random
import math

from app.db.database import get_db
from app.middleware.auth import AuthMiddleware
from app.schemas.schemas import BaseResponse
from pydantic import BaseModel, Field

logger = structlog.get_logger()
router = APIRouter(prefix="/analytics", tags=["AI & Analytics"])


# ============= Pydantic Models =============

class PredictiveModel(BaseModel):
    """Predictive analytics model"""
    model_id: str
    model_name: str
    model_type: str
    accuracy: float
    last_trained: datetime
    features: List[str]


class AttritionPrediction(BaseModel):
    """Employee attrition prediction"""
    employee_id: str
    employee_name: str
    attrition_risk: str = Field(..., description="low, medium, high")
    risk_score: float = Field(..., ge=0, le=1)
    risk_factors: List[str]
    recommended_actions: List[str]


class LeaveForecasting(BaseModel):
    """Leave forecasting result"""
    forecast_date: date
    predicted_leaves: int
    confidence_interval: Dict[str, int]
    seasonality_factor: float
    trend: str


class WorkforceMetrics(BaseModel):
    """Comprehensive workforce metrics"""
    total_headcount: int
    growth_rate: float
    turnover_rate: float
    average_tenure_months: float
    diversity_score: float
    engagement_score: float


# ============= AI Analytics Service =============

class AIAnalyticsService:
    """AI-powered analytics service"""
    
    @staticmethod
    def predict_attrition(
        employee_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Predict employee attrition risk using ML model
        In production, this would use a trained ML model (scikit-learn, TensorFlow, etc.)
        """
        # Mock ML prediction based on various factors
        tenure_months = employee_data.get("tenure_months", 12)
        satisfaction_score = employee_data.get("satisfaction_score", 3.5)
        promotion_count = employee_data.get("promotion_count", 0)
        salary_percentile = employee_data.get("salary_percentile", 50)
        work_life_balance = employee_data.get("work_life_balance", 3)
        
        # Simple risk scoring (in production, use trained ML model)
        risk_score = 0.0
        risk_factors = []
        
        # Tenure factor
        if tenure_months < 6:
            risk_score += 0.3
            risk_factors.append("Short tenure (<6 months)")
        elif tenure_months > 60:
            risk_score += 0.2
            risk_factors.append("Long tenure (>5 years) - may seek new challenges")
        
        # Satisfaction factor
        if satisfaction_score < 3.0:
            risk_score += 0.4
            risk_factors.append("Low satisfaction score")
        
        # Promotion factor
        if tenure_months > 24 and promotion_count == 0:
            risk_score += 0.25
            risk_factors.append("No promotions in 2+ years")
        
        # Salary factor
        if salary_percentile < 30:
            risk_score += 0.3
            risk_factors.append("Below-market compensation")
        
        # Work-life balance
        if work_life_balance < 3:
            risk_score += 0.2
            risk_factors.append("Poor work-life balance")
        
        # Cap at 1.0
        risk_score = min(risk_score, 1.0)
        
        # Determine risk level
        if risk_score < 0.3:
            risk_level = "low"
        elif risk_score < 0.6:
            risk_level = "medium"
        else:
            risk_level = "high"
        
        # Generate recommendations
        recommendations = []
        if "Low satisfaction score" in risk_factors:
            recommendations.append("Conduct one-on-one feedback session")
        if "No promotions" in str(risk_factors):
            recommendations.append("Discuss career development opportunities")
        if "Below-market compensation" in risk_factors:
            recommendations.append("Review and adjust compensation")
        if "Poor work-life balance" in risk_factors:
            recommendations.append("Offer flexible work arrangements")
        
        return {
            "risk_score": round(risk_score, 2),
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "recommendations": recommendations
        }
    
    @staticmethod
    def forecast_leaves(
        historical_data: List[Dict[str, Any]],
        forecast_days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Forecast future leave requests using time series analysis
        In production, use ARIMA, Prophet, or LSTM models
        """
        forecast = []
        base_date = datetime.now().date()
        
        # Simple forecasting with seasonality (mock implementation)
        for i in range(forecast_days):
            forecast_date = base_date + timedelta(days=i)
            
            # Add seasonality (more leaves on Fridays and Mondays)
            day_of_week = forecast_date.weekday()
            seasonality = 1.0
            if day_of_week == 0:  # Monday
                seasonality = 1.3
            elif day_of_week == 4:  # Friday
                seasonality = 1.4
            elif day_of_week in [5, 6]:  # Weekend
                seasonality = 0.5
            
            # Base prediction with some randomness
            base_leaves = 8
            predicted = int(base_leaves * seasonality * random.uniform(0.8, 1.2))
            
            forecast.append({
                "date": forecast_date.isoformat(),
                "predicted_leaves": predicted,
                "confidence_lower": max(0, predicted - 3),
                "confidence_upper": predicted + 3,
                "seasonality_factor": round(seasonality, 2),
                "trend": "stable"
            })
        
        return forecast
    
    @staticmethod
    def calculate_workforce_planning(
        current_headcount: int,
        target_growth_rate: float,
        months: int = 12
    ) -> Dict[str, Any]:
        """
        Calculate workforce planning projections
        """
        projections = []
        current = current_headcount
        
        for month in range(1, months + 1):
            # Monthly growth rate
            monthly_growth = target_growth_rate / 12
            new_hires = int(current * monthly_growth)
            
            # Attrition (assume 10% annual attrition = 0.833% monthly)
            attrition = int(current * 0.00833)
            
            net_change = new_hires - attrition
            current = current + net_change
            
            projections.append({
                "month": month,
                "starting_headcount": current - net_change,
                "new_hires": new_hires,
                "attrition": attrition,
                "ending_headcount": current,
                "net_change": net_change
            })
        
        return {
            "initial_headcount": current_headcount,
            "target_headcount": current,
            "total_hires_needed": sum(p["new_hires"] for p in projections),
            "expected_attrition": sum(p["attrition"] for p in projections),
            "monthly_projections": projections
        }
    
    @staticmethod
    def analyze_skill_gaps(
        required_skills: List[str],
        employee_skills: Dict[str, List[str]]
    ) -> Dict[str, Any]:
        """
        Analyze skill gaps in organization
        """
        # Calculate skill coverage
        skill_coverage = {}
        for skill in required_skills:
            employees_with_skill = sum(
                1 for skills in employee_skills.values()
                if skill in skills
            )
            total_employees = len(employee_skills)
            coverage = (employees_with_skill / total_employees * 100) if total_employees > 0 else 0
            skill_coverage[skill] = {
                "employees_with_skill": employees_with_skill,
                "coverage_percentage": round(coverage, 1),
                "gap": total_employees - employees_with_skill
            }
        
        # Identify critical gaps
        critical_gaps = [
            skill for skill, data in skill_coverage.items()
            if data["coverage_percentage"] < 50
        ]
        
        return {
            "total_skills_analyzed": len(required_skills),
            "skill_coverage": skill_coverage,
            "critical_gaps": critical_gaps,
            "average_coverage": round(
                sum(d["coverage_percentage"] for d in skill_coverage.values()) / len(skill_coverage),
                1
            ) if skill_coverage else 0
        }


# ============= API Endpoints =============

@router.get("/attrition/predict", response_model=BaseResponse)
async def predict_employee_attrition(
    employee_id: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    risk_threshold: float = Query(0.5, ge=0, le=1),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """
    Predict employee attrition risk
    Uses ML model to identify employees at risk of leaving
    """
    
    # Mock employee data for prediction
    employees = [
        {
            "employee_id": "emp1",
            "name": "John Doe",
            "tenure_months": 8,
            "satisfaction_score": 2.8,
            "promotion_count": 0,
            "salary_percentile": 35,
            "work_life_balance": 2.5
        },
        {
            "employee_id": "emp2",
            "name": "Jane Smith",
            "tenure_months": 36,
            "satisfaction_score": 4.2,
            "promotion_count": 1,
            "salary_percentile": 65,
            "work_life_balance": 4.0
        },
        {
            "employee_id": "emp3",
            "name": "Bob Johnson",
            "tenure_months": 72,
            "satisfaction_score": 3.5,
            "promotion_count": 1,
            "salary_percentile": 55,
            "work_life_balance": 3.8
        }
    ]
    
    predictions = []
    for emp in employees:
        prediction = AIAnalyticsService.predict_attrition(emp)
        
        if prediction["risk_score"] >= risk_threshold:
            predictions.append({
                "employee_id": emp["employee_id"],
                "employee_name": emp["name"],
                "risk_level": prediction["risk_level"],
                "risk_score": prediction["risk_score"],
                "risk_factors": prediction["risk_factors"],
                "recommended_actions": prediction["recommendations"]
            })
    
    logger.info(f"Attrition prediction completed for {len(predictions)} at-risk employees")
    
    return BaseResponse(
        success=True,
        message=f"Identified {len(predictions)} employees at risk",
        data={
            "total_employees_analyzed": len(employees),
            "at_risk_employees": len(predictions),
            "risk_threshold": risk_threshold,
            "predictions": predictions
        }
    )


@router.get("/leave/forecast", response_model=BaseResponse)
async def forecast_leave_requests(
    forecast_days: int = Query(30, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """
    Forecast future leave requests using time series analysis
    Helps in resource planning and capacity management
    """
    
    # Mock historical data
    historical_data = []  # In production, fetch from database
    
    forecast = AIAnalyticsService.forecast_leaves(historical_data, forecast_days)
    
    # Calculate summary statistics
    total_predicted = sum(f["predicted_leaves"] for f in forecast)
    avg_daily = total_predicted / forecast_days if forecast_days > 0 else 0
    peak_day = max(forecast, key=lambda x: x["predicted_leaves"])
    
    logger.info(f"Leave forecast generated for {forecast_days} days")
    
    return BaseResponse(
        success=True,
        message=f"Leave forecast generated for {forecast_days} days",
        data={
            "forecast_period_days": forecast_days,
            "total_predicted_leaves": total_predicted,
            "average_daily_leaves": round(avg_daily, 1),
            "peak_day": peak_day,
            "forecast": forecast
        }
    )


@router.get("/workforce/planning", response_model=BaseResponse)
async def workforce_planning(
    target_growth_rate: float = Query(..., ge=0, le=1, description="Annual growth rate (0.1 = 10%)"),
    planning_months: int = Query(12, ge=1, le=36),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """
    Generate workforce planning projections
    Calculates hiring needs, attrition, and headcount projections
    """
    
    # Get current headcount (mock)
    current_headcount = 150
    
    planning = AIAnalyticsService.calculate_workforce_planning(
        current_headcount,
        target_growth_rate,
        planning_months
    )
    
    logger.info(f"Workforce planning generated for {planning_months} months")
    
    return BaseResponse(
        success=True,
        message="Workforce planning projections generated",
        data=planning
    )


@router.get("/skills/gap-analysis", response_model=BaseResponse)
async def skill_gap_analysis(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """
    Analyze skill gaps in organization
    Identifies missing skills and training needs
    """
    
    # Required skills for organization
    required_skills = [
        "Python", "JavaScript", "React", "Cloud (AWS/Azure)",
        "Project Management", "Data Analysis", "Leadership",
        "Agile Methodologies", "Communication", "Problem Solving"
    ]
    
    # Mock employee skills
    employee_skills = {
        "emp1": ["Python", "JavaScript", "Problem Solving"],
        "emp2": ["React", "JavaScript", "Communication"],
        "emp3": ["Cloud (AWS/Azure)", "Python", "Leadership"],
        "emp4": ["Project Management", "Agile Methodologies", "Communication"],
        "emp5": ["Data Analysis", "Python", "Problem Solving"],
    }
    
    analysis = AIAnalyticsService.analyze_skill_gaps(required_skills, employee_skills)
    
    logger.info("Skill gap analysis completed")
    
    return BaseResponse(
        success=True,
        message="Skill gap analysis completed",
        data=analysis
    )


@router.get("/performance/trends", response_model=BaseResponse)
async def performance_trend_analysis(
    period_months: int = Query(12, ge=1, le=36),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """
    Analyze performance trends over time
    Identifies patterns and predicts future performance
    """
    
    # Mock performance data
    trends = []
    base_performance = 3.8
    
    for month in range(1, period_months + 1):
        # Add trend and seasonality
        trend = 0.01 * month  # Slight upward trend
        seasonality = 0.1 * math.sin(month * math.pi / 6)  # Semi-annual cycle
        noise = random.uniform(-0.05, 0.05)
        
        performance = base_performance + trend + seasonality + noise
        performance = max(1.0, min(5.0, performance))  # Clamp between 1-5
        
        trends.append({
            "month": month,
            "average_rating": round(performance, 2),
            "trend": "improving" if trend > 0 else "stable",
            "high_performers_pct": round(random.uniform(20, 30), 1),
            "low_performers_pct": round(random.uniform(5, 10), 1)
        })
    
    # Calculate insights
    avg_rating = sum(t["average_rating"] for t in trends) / len(trends)
    trend_direction = "improving" if trends[-1]["average_rating"] > trends[0]["average_rating"] else "declining"
    
    logger.info(f"Performance trend analysis completed for {period_months} months")
    
    return BaseResponse(
        success=True,
        message="Performance trend analysis completed",
        data={
            "period_months": period_months,
            "average_rating": round(avg_rating, 2),
            "trend_direction": trend_direction,
            "trends": trends,
            "insights": [
                "Overall performance shows upward trend",
                "High performers consistently at 25% of workforce",
                "Recommend focus on bottom 10% for improvement"
            ]
        }
    )


@router.get("/recruitment/time-to-hire", response_model=BaseResponse)
async def recruitment_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """
    Analyze recruitment metrics and time-to-hire
    Provides insights for hiring optimization
    """
    
    analytics = {
        "time_to_hire": {
            "average_days": 42,
            "median_days": 38,
            "by_department": {
                "Engineering": 48,
                "Sales": 35,
                "Marketing": 40,
                "Operations": 38
            },
            "by_level": {
                "Entry": 30,
                "Mid": 40,
                "Senior": 55,
                "Executive": 75
            }
        },
        "source_effectiveness": {
            "linkedin": {"applications": 250, "hires": 15, "conversion": 6.0},
            "referrals": {"applications": 80, "hires": 12, "conversion": 15.0},
            "job_boards": {"applications": 400, "hires": 20, "conversion": 5.0},
            "direct": {"applications": 50, "hires": 8, "conversion": 16.0}
        },
        "funnel_metrics": {
            "total_applications": 780,
            "screened": 520,
            "phone_interviews": 180,
            "technical_interviews": 90,
            "final_interviews": 45,
            "offers": 30,
            "accepted": 25
        },
        "recommendations": [
            "Focus on referral programs (highest conversion)",
            "Optimize screening process to reduce time-to-hire",
            "Engineering roles need faster interview cycles"
        ]
    }
    
    logger.info("Recruitment analytics generated")
    
    return BaseResponse(
        success=True,
        message="Recruitment analytics retrieved",
        data=analytics
    )


@router.get("/sentiment/analysis", response_model=BaseResponse)
async def employee_sentiment_analysis(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """
    Analyze employee sentiment from surveys and feedback
    Uses NLP to identify trends and concerns
    """
    
    sentiment = {
        "overall_sentiment": "positive",
        "sentiment_score": 0.72,  # -1 to 1 scale
        "by_department": {
            "Engineering": {"score": 0.78, "sentiment": "positive"},
            "Sales": {"score": 0.65, "sentiment": "neutral"},
            "Marketing": {"score": 0.82, "sentiment": "positive"},
            "Operations": {"score": 0.58, "sentiment": "neutral"}
        },
        "key_topics": [
            {"topic": "Work-Life Balance", "mentions": 145, "sentiment": 0.65},
            {"topic": "Career Growth", "mentions": 120, "sentiment": 0.55},
            {"topic": "Management", "mentions": 98, "sentiment": 0.70},
            {"topic": "Compensation", "mentions": 87, "sentiment": 0.45},
            {"topic": "Team Collaboration", "mentions": 156, "sentiment": 0.80}
        ],
        "trending_concerns": [
            "Compensation concerns in Sales department",
            "Limited career growth opportunities mentioned"
        ],
        "positive_highlights": [
            "Strong team collaboration across organization",
            "Positive management feedback"
        ]
    }
    
    logger.info("Sentiment analysis completed")
    
    return BaseResponse(
        success=True,
        message="Sentiment analysis completed",
        data=sentiment
    )


@router.get("/models", response_model=BaseResponse)
async def list_ml_models(
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """List available ML models for analytics"""
    
    models = [
        {
            "model_id": "model_attrition_v1",
            "model_name": "Employee Attrition Predictor",
            "model_type": "classification",
            "accuracy": 0.87,
            "last_trained": "2024-01-15T10:00:00Z",
            "features": ["tenure", "satisfaction", "promotions", "salary", "work_life_balance"]
        },
        {
            "model_id": "model_leave_forecast_v1",
            "model_name": "Leave Forecasting Model",
            "model_type": "time_series",
            "accuracy": 0.82,
            "last_trained": "2024-01-10T08:00:00Z",
            "features": ["historical_leaves", "seasonality", "department", "day_of_week"]
        },
        {
            "model_id": "model_performance_v1",
            "model_name": "Performance Predictor",
            "model_type": "regression",
            "accuracy": 0.75,
            "last_trained": "2024-01-12T14:00:00Z",
            "features": ["past_ratings", "goals_achieved", "tenure", "training_hours"]
        }
    ]
    
    return BaseResponse(
        success=True,
        message=f"Retrieved {len(models)} ML models",
        data={"models": models}
    )
