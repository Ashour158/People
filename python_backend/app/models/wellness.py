"""
Employee Wellness Platform Models
Health challenges, fitness tracking, and wellbeing features
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, Text, JSON, ForeignKey, Enum as SQLEnum, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.database import Base


class ChallengeType(str, enum.Enum):
    """Wellness challenge types"""
    STEPS = "steps"
    EXERCISE = "exercise"
    MEDITATION = "meditation"
    WATER_INTAKE = "water_intake"
    SLEEP = "sleep"
    WEIGHT_LOSS = "weight_loss"
    NUTRITION = "nutrition"
    CUSTOM = "custom"


class ChallengeStatus(str, enum.Enum):
    """Challenge status"""
    DRAFT = "draft"
    UPCOMING = "upcoming"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ParticipationStatus(str, enum.Enum):
    """Participation status"""
    REGISTERED = "registered"
    ACTIVE = "active"
    COMPLETED = "completed"
    WITHDRAWN = "withdrawn"


class ActivityType(str, enum.Enum):
    """Activity types"""
    WALKING = "walking"
    RUNNING = "running"
    CYCLING = "cycling"
    SWIMMING = "swimming"
    GYM = "gym"
    YOGA = "yoga"
    MEDITATION = "meditation"
    SPORTS = "sports"
    OTHER = "other"


class HealthMetricType(str, enum.Enum):
    """Health metric types"""
    WEIGHT = "weight"
    BMI = "bmi"
    BLOOD_PRESSURE = "blood_pressure"
    HEART_RATE = "heart_rate"
    STEPS = "steps"
    SLEEP_HOURS = "sleep_hours"
    WATER_INTAKE = "water_intake"
    CALORIES = "calories"
    EXERCISE_MINUTES = "exercise_minutes"


class WellnessChallenge(Base):
    """Wellness challenges for employees"""
    __tablename__ = "wellness_challenges"
    
    challenge_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Challenge details
    challenge_name = Column(String(255), nullable=False)
    description = Column(Text)
    challenge_type = Column(SQLEnum(ChallengeType), nullable=False)
    
    # Duration
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    # Goal
    goal_value = Column(Float)  # Target value (steps, minutes, etc.)
    goal_unit = Column(String(50))  # steps, minutes, km, etc.
    
    # Rules
    is_team_challenge = Column(Boolean, default=False)
    max_team_size = Column(Integer)
    min_participants = Column(Integer, default=1)
    max_participants = Column(Integer)
    
    # Rewards
    has_rewards = Column(Boolean, default=False)
    reward_points = Column(Integer, default=0)
    reward_description = Column(Text)
    
    # Visibility
    is_public = Column(Boolean, default=True)
    target_departments = Column(JSON)  # Array of department IDs
    target_locations = Column(JSON)
    
    # Status
    status = Column(SQLEnum(ChallengeStatus), default=ChallengeStatus.DRAFT, index=True)
    
    # Media
    banner_image_url = Column(String(1000))
    icon = Column(String(100))
    
    # Creator
    created_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    participants = relationship("ChallengeParticipant", back_populates="challenge", cascade="all, delete-orphan")
    leaderboard = relationship("ChallengeLeaderboard", back_populates="challenge", cascade="all, delete-orphan")


class ChallengeParticipant(Base):
    """Challenge participation records"""
    __tablename__ = "challenge_participants"
    
    participant_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey("wellness_challenges.challenge_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    
    # Team (if applicable)
    team_id = Column(UUID(as_uuid=True))
    team_name = Column(String(200))
    
    # Progress
    current_value = Column(Float, default=0)
    goal_value = Column(Float)
    completion_percentage = Column(Float, default=0)
    
    # Status
    status = Column(SQLEnum(ParticipationStatus), default=ParticipationStatus.REGISTERED)
    
    # Dates
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    withdrawn_at = Column(DateTime(timezone=True))
    
    # Rewards
    points_earned = Column(Integer, default=0)
    badges_earned = Column(JSON)  # Array of badge names
    
    # Relationships
    challenge = relationship("WellnessChallenge", back_populates="participants")
    activities = relationship("WellnessActivity", back_populates="participant", cascade="all, delete-orphan")


class ChallengeLeaderboard(Base):
    """Challenge leaderboard rankings"""
    __tablename__ = "challenge_leaderboard"
    
    leaderboard_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    challenge_id = Column(UUID(as_uuid=True), ForeignKey("wellness_challenges.challenge_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), index=True)
    team_id = Column(UUID(as_uuid=True), index=True)
    
    rank = Column(Integer, nullable=False)
    value = Column(Float, nullable=False)
    points = Column(Integer, default=0)
    
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    challenge = relationship("WellnessChallenge", back_populates="leaderboard")


class WellnessActivity(Base):
    """Individual wellness activities logged by employees"""
    __tablename__ = "wellness_activities"
    
    activity_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    participant_id = Column(UUID(as_uuid=True), ForeignKey("challenge_participants.participant_id"), index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Activity details
    activity_type = Column(SQLEnum(ActivityType), nullable=False)
    activity_date = Column(Date, nullable=False, index=True)
    activity_name = Column(String(255))
    description = Column(Text)
    
    # Metrics
    duration_minutes = Column(Integer)
    distance_km = Column(Float)
    calories_burned = Column(Integer)
    steps = Column(Integer)
    heart_rate_avg = Column(Integer)
    
    # Location
    location = Column(String(255))
    
    # Media
    photos = Column(JSON)  # Array of photo URLs
    
    # Verification
    is_verified = Column(Boolean, default=False)
    verified_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    verified_at = Column(DateTime(timezone=True))
    
    # Integration
    synced_from = Column(String(100))  # fitbit, apple_health, google_fit, strava
    external_id = Column(String(255))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    participant = relationship("ChallengeParticipant", back_populates="activities")


class HealthMetric(Base):
    """Employee health metrics tracking"""
    __tablename__ = "health_metrics"
    
    metric_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Metric details
    metric_type = Column(SQLEnum(HealthMetricType), nullable=False, index=True)
    metric_value = Column(Float, nullable=False)
    metric_unit = Column(String(50))
    recorded_date = Column(Date, nullable=False, index=True)
    
    # Additional data for specific metrics
    systolic_bp = Column(Integer)  # For blood pressure
    diastolic_bp = Column(Integer)  # For blood pressure
    
    # Notes
    notes = Column(Text)
    
    # Source
    recorded_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    source = Column(String(100))  # manual, device, integration
    
    # Privacy
    is_private = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WellnessBenefit(Base):
    """Wellness benefits and perks offered"""
    __tablename__ = "wellness_benefits"
    
    benefit_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Benefit details
    benefit_name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))  # gym, mental_health, nutrition, etc.
    
    # Provider
    provider_name = Column(String(255))
    provider_website = Column(String(500))
    contact_info = Column(JSON)
    
    # Cost
    employee_cost = Column(Numeric(10, 2))
    employer_subsidy = Column(Numeric(10, 2))
    
    # Eligibility
    eligibility_criteria = Column(JSON)
    
    # Status
    is_active = Column(Boolean, default=True)
    start_date = Column(Date)
    end_date = Column(Date)
    
    # Media
    logo_url = Column(String(1000))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class WellnessBenefitEnrollment(Base):
    """Employee enrollment in wellness benefits"""
    __tablename__ = "wellness_benefit_enrollments"
    
    enrollment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    benefit_id = Column(UUID(as_uuid=True), ForeignKey("wellness_benefits.benefit_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    
    # Enrollment details
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    
    # Status
    is_active = Column(Boolean, default=True)
    cancelled_at = Column(DateTime(timezone=True))
    cancellation_reason = Column(Text)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class BurnoutAssessment(Base):
    """Burnout detection and assessment"""
    __tablename__ = "burnout_assessments"
    
    assessment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Assessment date
    assessment_date = Column(Date, nullable=False, index=True)
    
    # Scores (0-100)
    exhaustion_score = Column(Integer)
    cynicism_score = Column(Integer)
    efficacy_score = Column(Integer)
    overall_burnout_score = Column(Integer)
    
    # Risk level
    risk_level = Column(String(20))  # low, medium, high
    
    # Responses
    responses = Column(JSON)  # Question-answer pairs
    
    # Recommendations
    recommended_actions = Column(JSON)  # Array of action items
    
    # Follow-up
    follow_up_scheduled = Column(Boolean, default=False)
    follow_up_date = Column(Date)
    
    # Privacy
    is_anonymous = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
