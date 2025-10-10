"""
Pydantic schemas for Wellness Platform
Request/response validation for wellness challenges and health tracking
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


# Wellness Challenge Schemas
class WellnessChallengeCreate(BaseModel):
    """Create wellness challenge"""
    challenge_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    challenge_type: str
    start_date: date
    end_date: date
    goal_value: Optional[float] = None
    goal_unit: Optional[str] = None
    is_team_challenge: bool = False
    max_team_size: Optional[int] = None
    has_rewards: bool = False
    reward_points: int = 0
    reward_description: Optional[str] = None
    is_public: bool = True


class WellnessChallengeResponse(BaseModel):
    """Wellness challenge response"""
    challenge_id: UUID
    organization_id: UUID
    challenge_name: str
    description: Optional[str]
    challenge_type: str
    start_date: date
    end_date: date
    goal_value: Optional[float]
    goal_unit: Optional[str]
    status: str
    participant_count: Optional[int] = 0
    created_at: datetime

    class Config:
        from_attributes = True


# Challenge Participation
class ChallengeJoin(BaseModel):
    """Join a challenge"""
    challenge_id: UUID
    team_name: Optional[str] = None


class ChallengeLeave(BaseModel):
    """Leave a challenge"""
    challenge_id: UUID


class ParticipantResponse(BaseModel):
    """Challenge participant response"""
    participant_id: UUID
    challenge_id: UUID
    employee_id: UUID
    current_value: float
    goal_value: Optional[float]
    completion_percentage: float
    status: str
    points_earned: int
    joined_at: datetime

    class Config:
        from_attributes = True


# Wellness Activity
class WellnessActivityCreate(BaseModel):
    """Log wellness activity"""
    activity_type: str
    activity_date: date
    activity_name: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    distance_km: Optional[float] = None
    calories_burned: Optional[int] = None
    steps: Optional[int] = None
    heart_rate_avg: Optional[int] = None


class WellnessActivityResponse(BaseModel):
    """Wellness activity response"""
    activity_id: UUID
    employee_id: UUID
    activity_type: str
    activity_date: date
    duration_minutes: Optional[int]
    distance_km: Optional[float]
    calories_burned: Optional[int]
    steps: Optional[int]
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Health Metrics
class HealthMetricCreate(BaseModel):
    """Record health metric"""
    metric_type: str
    metric_value: float
    metric_unit: Optional[str] = None
    recorded_date: date
    notes: Optional[str] = None
    is_private: bool = True


class HealthMetricResponse(BaseModel):
    """Health metric response"""
    metric_id: UUID
    employee_id: UUID
    metric_type: str
    metric_value: float
    metric_unit: Optional[str]
    recorded_date: date
    created_at: datetime

    class Config:
        from_attributes = True


# Leaderboard
class LeaderboardEntry(BaseModel):
    """Leaderboard entry"""
    rank: int
    employee_id: UUID
    employee_name: str
    value: float
    points: int


class ChallengeLeaderboardResponse(BaseModel):
    """Challenge leaderboard"""
    challenge_id: UUID
    challenge_name: str
    entries: List[LeaderboardEntry]


# Wellness Benefits
class WellnessBenefitResponse(BaseModel):
    """Wellness benefit response"""
    benefit_id: UUID
    organization_id: UUID
    benefit_name: str
    description: Optional[str]
    benefit_category: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class BenefitEnrollmentCreate(BaseModel):
    """Enroll in wellness benefit"""
    benefit_id: UUID


class BenefitEnrollmentResponse(BaseModel):
    """Benefit enrollment response"""
    enrollment_id: UUID
    benefit_id: UUID
    employee_id: UUID
    enrollment_status: str
    enrolled_at: datetime

    class Config:
        from_attributes = True


# Leaderboard Response
class LeaderboardResponse(BaseModel):
    """Leaderboard response with rank"""
    participant_id: UUID
    challenge_id: UUID
    employee_id: UUID
    current_value: float
    goal_value: Optional[float]
    completion_percentage: float
    status: str
    points_earned: int
    rank: int

    class Config:
        from_attributes = True


# Burnout Assessment
class BurnoutAssessmentCreate(BaseModel):
    """Submit burnout assessment"""
    assessment_date: date
    emotional_exhaustion_score: int = Field(..., ge=1, le=5)
    depersonalization_score: int = Field(..., ge=1, le=5)
    personal_accomplishment_score: int = Field(..., ge=1, le=5)
    workload_perception: Optional[int] = Field(None, ge=1, le=5)
    work_life_balance: Optional[int] = Field(None, ge=1, le=5)
    responses: Optional[dict] = None
    is_anonymous: bool = True


class BurnoutAssessmentResponse(BaseModel):
    """Burnout assessment response"""
    assessment_id: UUID
    assessment_date: date
    emotional_exhaustion_score: int
    depersonalization_score: int
    personal_accomplishment_score: int
    risk_level: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
