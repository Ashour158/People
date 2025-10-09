"""
Survey and Engagement Schemas
Pydantic schemas for survey API requests and responses
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID
from enum import Enum


class SurveyTypeEnum(str, Enum):
    ENGAGEMENT = "engagement"
    PULSE = "pulse"
    EXIT = "exit"
    ONBOARDING = "onboarding"
    CUSTOM = "custom"
    ENPS = "enps"
    SATISFACTION = "satisfaction"


class SurveyStatusEnum(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"
    ARCHIVED = "archived"


class QuestionTypeEnum(str, Enum):
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


class ResponseStatusEnum(str, Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


# Survey Question Schemas
class SurveyQuestionBase(BaseModel):
    question_text: str = Field(..., max_length=2000)
    question_type: QuestionTypeEnum
    question_order: int = Field(..., ge=1)
    is_required: bool = False
    options: Optional[List[str]] = None
    min_value: Optional[int] = None
    max_value: Optional[int] = None
    min_label: Optional[str] = None
    max_label: Optional[str] = None


class SurveyQuestionCreate(SurveyQuestionBase):
    pass


class SurveyQuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    question_type: Optional[QuestionTypeEnum] = None
    question_order: Optional[int] = None
    is_required: Optional[bool] = None
    options: Optional[List[str]] = None
    min_value: Optional[int] = None
    max_value: Optional[int] = None


class SurveyQuestionResponse(SurveyQuestionBase):
    question_id: UUID
    survey_id: UUID
    organization_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# Survey Schemas
class SurveyBase(BaseModel):
    title: str = Field(..., max_length=500)
    description: Optional[str] = None
    survey_type: SurveyTypeEnum
    is_anonymous: bool = False
    allow_multiple_responses: bool = False
    is_mandatory: bool = False


class SurveyCreate(SurveyBase):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    target_all_employees: bool = True
    target_departments: Optional[List[UUID]] = None
    target_locations: Optional[List[str]] = None
    target_employees: Optional[List[UUID]] = None
    questions: Optional[List[SurveyQuestionCreate]] = None


class SurveyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[SurveyStatusEnum] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_anonymous: Optional[bool] = None
    thank_you_message: Optional[str] = None


class SurveyResponse(SurveyBase):
    survey_id: UUID
    organization_id: UUID
    status: SurveyStatusEnum
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    total_questions: int
    total_responses: int
    completion_rate: float
    created_by: Optional[UUID]
    created_at: datetime
    questions: Optional[List[SurveyQuestionResponse]] = None
    
    class Config:
        from_attributes = True


class SurveyListResponse(BaseModel):
    survey_id: UUID
    title: str
    survey_type: SurveyTypeEnum
    status: SurveyStatusEnum
    total_questions: int
    total_responses: int
    completion_rate: float
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Survey Answer Schemas
class SurveyAnswerBase(BaseModel):
    question_id: UUID
    answer_text: Optional[str] = None
    answer_value: Optional[int] = None
    answer_options: Optional[List[str]] = None
    answer_date: Optional[date] = None


class SurveyAnswerCreate(SurveyAnswerBase):
    pass


class SurveyAnswerResponse(SurveyAnswerBase):
    answer_id: UUID
    response_id: UUID
    answered_at: datetime
    
    class Config:
        from_attributes = True


# Survey Response Schemas
class SurveyResponseCreate(BaseModel):
    survey_id: UUID
    answers: List[SurveyAnswerCreate]


class SurveyResponseUpdate(BaseModel):
    status: Optional[ResponseStatusEnum] = None
    answers: Optional[List[SurveyAnswerCreate]] = None


class SurveyResponseDetail(BaseModel):
    response_id: UUID
    survey_id: UUID
    employee_id: Optional[UUID]
    status: ResponseStatusEnum
    completion_time: Optional[int]
    started_at: datetime
    completed_at: Optional[datetime]
    answers: List[SurveyAnswerResponse]
    
    class Config:
        from_attributes = True


# Engagement Score Schemas
class EngagementScoreBase(BaseModel):
    year: int
    quarter: Optional[int] = None
    month: Optional[int] = None


class EngagementScoreCreate(EngagementScoreBase):
    employee_id: Optional[UUID] = None
    department_id: Optional[UUID] = None
    overall_score: float
    enps_score: Optional[float] = None


class EngagementScoreResponse(EngagementScoreBase):
    score_id: UUID
    organization_id: UUID
    employee_id: Optional[UUID]
    department_id: Optional[UUID]
    overall_score: float
    enps_score: Optional[float]
    satisfaction_score: Optional[float]
    culture_score: Optional[float]
    leadership_score: Optional[float]
    growth_score: Optional[float]
    recognition_score: Optional[float]
    wellbeing_score: Optional[float]
    response_rate: float
    trend: Optional[str]
    change_from_previous: Optional[float]
    calculated_at: datetime
    
    class Config:
        from_attributes = True


# Pulse Survey Schemas
class PulseSurveyCreate(BaseModel):
    question: str
    frequency: str = Field(..., pattern="^(daily|weekly|monthly)$")
    notification_time: str = Field(..., pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    target_departments: Optional[List[UUID]] = None


class PulseSurveyResponse(BaseModel):
    pulse_id: UUID
    question: str
    frequency: str
    is_active: bool
    total_responses: int
    average_score: Optional[float]
    created_at: datetime
    
    class Config:
        from_attributes = True


class PulseResponseCreate(BaseModel):
    pulse_id: UUID
    score: int = Field(..., ge=1, le=10)
    comment: Optional[str] = None


class PulseResponseDetail(BaseModel):
    pulse_response_id: UUID
    pulse_id: UUID
    employee_id: UUID
    score: int
    comment: Optional[str]
    responded_at: datetime
    
    class Config:
        from_attributes = True


# Action Plan Schemas
class ActionPlanCreate(BaseModel):
    survey_id: Optional[UUID] = None
    title: str = Field(..., max_length=500)
    description: Optional[str] = None
    priority: str = Field(..., pattern="^(high|medium|low)$")
    department_id: Optional[UUID] = None
    focus_area: Optional[str] = None
    start_date: Optional[date] = None
    target_completion_date: Optional[date] = None
    owner_id: Optional[UUID] = None


class ActionPlanUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    progress_percentage: Optional[int] = Field(None, ge=0, le=100)
    actual_completion_date: Optional[date] = None


class ActionPlanResponse(BaseModel):
    action_plan_id: UUID
    organization_id: UUID
    survey_id: Optional[UUID]
    title: str
    description: Optional[str]
    priority: str
    department_id: Optional[UUID]
    focus_area: Optional[str]
    start_date: Optional[date]
    target_completion_date: Optional[date]
    actual_completion_date: Optional[date]
    status: str
    progress_percentage: int
    owner_id: Optional[UUID]
    created_by: Optional[UUID]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Analytics Schemas
class SurveyAnalytics(BaseModel):
    survey_id: UUID
    total_sent: int
    total_responses: int
    completion_rate: float
    average_completion_time: int  # seconds
    response_by_day: Dict[str, int]
    question_analytics: List[Dict[str, Any]]


class EngagementTrend(BaseModel):
    period: str
    overall_score: float
    enps_score: Optional[float]
    response_rate: float


class DepartmentComparison(BaseModel):
    department_id: UUID
    department_name: str
    overall_score: float
    enps_score: Optional[float]
    response_rate: float
    total_responses: int


class EngagementDashboard(BaseModel):
    organization_id: UUID
    current_period: EngagementScoreResponse
    trends: List[EngagementTrend]
    department_comparison: List[DepartmentComparison]
    top_action_items: List[str]
    participation_rate: float
