"""
Survey and Engagement Models
Database models for survey builder, responses, and engagement analytics
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, Text, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.database import Base


class SurveyType(str, enum.Enum):
    """Survey types"""
    ENGAGEMENT = "engagement"
    PULSE = "pulse"
    EXIT = "exit"
    ONBOARDING = "onboarding"
    CUSTOM = "custom"
    ENPS = "enps"
    SATISFACTION = "satisfaction"


class SurveyStatus(str, enum.Enum):
    """Survey status"""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"
    ARCHIVED = "archived"


class QuestionType(str, enum.Enum):
    """Question types"""
    TEXT = "text"
    TEXTAREA = "textarea"
    MULTIPLE_CHOICE = "multiple_choice"
    CHECKBOX = "checkbox"
    RATING = "rating"
    SCALE = "scale"
    NPS = "nps"
    DROPDOWN = "dropdown"
    DATE = "date"
    YES_NO = "yes_no"


class ResponseStatus(str, enum.Enum):
    """Response status"""
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class Survey(Base):
    """Survey configuration and metadata"""
    __tablename__ = "surveys"
    
    survey_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Survey details
    title = Column(String(500), nullable=False)
    description = Column(Text)
    survey_type = Column(SQLEnum(SurveyType), nullable=False)
    status = Column(SQLEnum(SurveyStatus), default=SurveyStatus.DRAFT)
    
    # Configuration
    is_anonymous = Column(Boolean, default=False)
    allow_multiple_responses = Column(Boolean, default=False)
    is_mandatory = Column(Boolean, default=False)
    
    # Schedule
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    reminder_enabled = Column(Boolean, default=True)
    reminder_frequency_days = Column(Integer, default=3)
    
    # Targeting
    target_all_employees = Column(Boolean, default=True)
    target_departments = Column(JSON)  # List of department IDs
    target_locations = Column(JSON)  # List of location IDs
    target_employees = Column(JSON)  # List of employee IDs
    
    # Display settings
    show_progress = Column(Boolean, default=True)
    randomize_questions = Column(Boolean, default=False)
    thank_you_message = Column(Text)
    
    # Analytics
    total_questions = Column(Integer, default=0)
    total_responses = Column(Integer, default=0)
    completion_rate = Column(Float, default=0.0)
    average_completion_time = Column(Integer)  # in seconds
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)
    
    # Relationships
    questions = relationship("SurveyQuestion", back_populates="survey", cascade="all, delete-orphan")
    responses = relationship("SurveyResponse", back_populates="survey")


class SurveyQuestion(Base):
    """Survey questions with various types"""
    __tablename__ = "survey_questions"
    
    question_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survey_id = Column(UUID(as_uuid=True), ForeignKey("surveys.survey_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Question details
    question_text = Column(Text, nullable=False)
    question_type = Column(SQLEnum(QuestionType), nullable=False)
    question_order = Column(Integer, nullable=False)
    
    # Configuration
    is_required = Column(Boolean, default=False)
    options = Column(JSON)  # For multiple choice, checkboxes, dropdown
    min_value = Column(Integer)  # For scale/rating
    max_value = Column(Integer)  # For scale/rating
    min_label = Column(String(100))  # Label for min value
    max_label = Column(String(100))  # Label for max value
    
    # Conditional logic
    depends_on_question_id = Column(UUID(as_uuid=True))
    depends_on_answer = Column(String(500))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    survey = relationship("Survey", back_populates="questions")
    answers = relationship("SurveyAnswer", back_populates="question")


class SurveyResponse(Base):
    """Survey responses from employees"""
    __tablename__ = "survey_responses"
    
    response_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survey_id = Column(UUID(as_uuid=True), ForeignKey("surveys.survey_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), index=True)  # Nullable for anonymous
    
    # Response metadata
    status = Column(SQLEnum(ResponseStatus), default=ResponseStatus.IN_PROGRESS)
    completion_time = Column(Integer)  # in seconds
    
    # Analytics
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Device info
    device_type = Column(String(50))  # mobile, desktop, tablet
    browser = Column(String(100))
    ip_address = Column(String(45))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    survey = relationship("Survey", back_populates="responses")
    answers = relationship("SurveyAnswer", back_populates="response", cascade="all, delete-orphan")


class SurveyAnswer(Base):
    """Individual answers to survey questions"""
    __tablename__ = "survey_answers"
    
    answer_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    response_id = Column(UUID(as_uuid=True), ForeignKey("survey_responses.response_id"), nullable=False, index=True)
    question_id = Column(UUID(as_uuid=True), ForeignKey("survey_questions.question_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Answer data
    answer_text = Column(Text)  # For text/textarea
    answer_value = Column(Integer)  # For rating/scale/NPS
    answer_options = Column(JSON)  # For multiple choice/checkbox (array of selected options)
    answer_date = Column(Date)  # For date questions
    
    # Metadata
    answered_at = Column(DateTime(timezone=True), server_default=func.now())
    time_spent = Column(Integer)  # seconds spent on this question
    
    # Relationships
    response = relationship("SurveyResponse", back_populates="answers")
    question = relationship("SurveyQuestion", back_populates="answers")


class EngagementScore(Base):
    """Calculated engagement scores for employees/departments"""
    __tablename__ = "engagement_scores"
    
    score_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Scope
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), index=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.department_id"), index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.company_id"), index=True)
    
    # Period
    year = Column(Integer, nullable=False)
    quarter = Column(Integer)  # 1-4
    month = Column(Integer)  # 1-12
    
    # Scores
    overall_score = Column(Float)  # 0-100
    enps_score = Column(Float)  # -100 to 100
    satisfaction_score = Column(Float)  # 0-100
    
    # Dimensions
    culture_score = Column(Float)
    leadership_score = Column(Float)
    growth_score = Column(Float)
    recognition_score = Column(Float)
    wellbeing_score = Column(Float)
    
    # Sentiment analysis
    sentiment_score = Column(Float)  # -1 to 1
    sentiment_category = Column(String(50))  # positive, neutral, negative
    
    # Participation
    total_surveys = Column(Integer, default=0)
    completed_surveys = Column(Integer, default=0)
    response_rate = Column(Float, default=0.0)
    
    # Trend
    trend = Column(String(20))  # improving, declining, stable
    change_from_previous = Column(Float)
    
    # Metadata
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PulseSurvey(Base):
    """Quick pulse surveys for frequent engagement checks"""
    __tablename__ = "pulse_surveys"
    
    pulse_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Pulse details
    question = Column(Text, nullable=False)
    frequency = Column(String(20))  # daily, weekly, monthly
    is_active = Column(Boolean, default=True)
    
    # Configuration
    notification_time = Column(String(10))  # HH:MM format
    target_departments = Column(JSON)
    
    # Analytics
    total_responses = Column(Integer, default=0)
    average_score = Column(Float)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class PulseResponse(Base):
    """Responses to pulse surveys"""
    __tablename__ = "pulse_responses"
    
    pulse_response_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pulse_id = Column(UUID(as_uuid=True), ForeignKey("pulse_surveys.pulse_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    
    # Response
    score = Column(Integer, nullable=False)  # 1-5 or 1-10
    comment = Column(Text)
    
    # Metadata
    responded_at = Column(DateTime(timezone=True), server_default=func.now())


class ActionPlan(Base):
    """Action plans based on survey insights"""
    __tablename__ = "action_plans"
    
    action_plan_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    survey_id = Column(UUID(as_uuid=True), ForeignKey("surveys.survey_id"), index=True)
    
    # Plan details
    title = Column(String(500), nullable=False)
    description = Column(Text)
    priority = Column(String(20))  # high, medium, low
    
    # Scope
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.department_id"), index=True)
    focus_area = Column(String(100))  # culture, leadership, growth, etc.
    
    # Timeline
    start_date = Column(Date)
    target_completion_date = Column(Date)
    actual_completion_date = Column(Date)
    
    # Tracking
    status = Column(String(50))  # planned, in_progress, completed, cancelled
    progress_percentage = Column(Integer, default=0)
    
    # Ownership
    owner_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
