"""
Recruitment Module Pydantic Schemas
Validation schemas for recruitment APIs
"""
from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID


# Job Posting Schemas
class JobPostingBase(BaseModel):
    job_title: str = Field(..., max_length=255)
    job_description: str
    requirements: Optional[str] = None
    responsibilities: Optional[str] = None
    employment_type: str = Field(..., description="full_time, part_time, contract, internship, temporary")
    number_of_positions: int = Field(1, ge=1)
    experience_required: Optional[str] = None
    education_required: Optional[str] = None
    salary_min: Optional[Decimal] = None
    salary_max: Optional[Decimal] = None
    salary_currency: str = Field("USD", max_length=3)
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    location: Optional[str] = None
    remote_allowed: bool = False
    is_internal: bool = False
    is_external: bool = True
    is_urgent: bool = False


class JobPostingCreate(JobPostingBase):
    company_id: UUID
    department_id: Optional[UUID] = None
    hiring_manager_id: Optional[UUID] = None
    recruiter_id: Optional[UUID] = None


class JobPostingUpdate(BaseModel):
    job_title: Optional[str] = None
    job_description: Optional[str] = None
    requirements: Optional[str] = None
    responsibilities: Optional[str] = None
    employment_type: Optional[str] = None
    number_of_positions: Optional[int] = None
    experience_required: Optional[str] = None
    education_required: Optional[str] = None
    salary_min: Optional[Decimal] = None
    salary_max: Optional[Decimal] = None
    location: Optional[str] = None
    remote_allowed: Optional[bool] = None
    status: Optional[str] = None


class JobPostingResponse(JobPostingBase):
    job_id: UUID
    organization_id: UUID
    company_id: UUID
    department_id: Optional[UUID]
    job_code: Optional[str]
    status: str
    posted_date: Optional[datetime]
    closing_date: Optional[datetime]
    hiring_manager_id: Optional[UUID]
    recruiter_id: Optional[UUID]
    created_at: datetime
    modified_at: Optional[datetime]

    class Config:
        from_attributes = True


# Candidate Schemas
class CandidateBase(BaseModel):
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    email: EmailStr
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    current_company: Optional[str] = None
    current_designation: Optional[str] = None
    current_location: Optional[str] = None
    total_experience_years: Optional[float] = None
    notice_period_days: Optional[int] = None
    current_ctc: Optional[Decimal] = None
    expected_ctc: Optional[Decimal] = None
    currency: str = "USD"
    skills: List[str] = Field(default_factory=list)
    highest_education: Optional[str] = None
    certifications: List[str] = Field(default_factory=list)
    linkedin_url: Optional[str] = None
    source: Optional[str] = None


class CandidateCreate(CandidateBase):
    referred_by: Optional[UUID] = None


class CandidateUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    current_company: Optional[str] = None
    current_designation: Optional[str] = None
    skills: Optional[List[str]] = None


class CandidateResponse(CandidateBase):
    candidate_id: UUID
    organization_id: UUID
    resume_url: Optional[str]
    portfolio_url: Optional[str]
    referred_by: Optional[UUID]
    created_at: datetime
    modified_at: Optional[datetime]

    class Config:
        from_attributes = True


# Application Schemas
class ApplicationBase(BaseModel):
    cover_letter: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    job_id: UUID
    candidate_id: UUID


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    screening_score: Optional[int] = Field(None, ge=0, le=100)
    screening_notes: Optional[str] = None
    overall_rating: Optional[int] = Field(None, ge=1, le=5)
    current_stage: Optional[str] = None


class ApplicationResponse(ApplicationBase):
    application_id: UUID
    job_id: UUID
    candidate_id: UUID
    organization_id: UUID
    status: str
    applied_date: datetime
    screening_score: Optional[int]
    screening_notes: Optional[str]
    screened_by: Optional[UUID]
    screened_at: Optional[datetime]
    overall_rating: Optional[int]
    current_stage: Optional[str]
    created_at: datetime
    modified_at: Optional[datetime]

    class Config:
        from_attributes = True


# Interview Schemas
class InterviewBase(BaseModel):
    interview_round: str = Field(..., max_length=100)
    interview_type: str = Field(..., description="phone_screen, video, in_person, technical, hr, managerial, panel")
    scheduled_date: datetime
    duration_minutes: int = Field(60, ge=15, le=480)
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    interviewer_ids: List[UUID] = Field(default_factory=list)
    panel_lead_id: Optional[UUID] = None
    interview_notes: Optional[str] = None


class InterviewCreate(InterviewBase):
    application_id: UUID


class InterviewUpdate(BaseModel):
    status: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    meeting_link: Optional[str] = None


class InterviewFeedback(BaseModel):
    technical_rating: Optional[int] = Field(None, ge=1, le=5)
    communication_rating: Optional[int] = Field(None, ge=1, le=5)
    cultural_fit_rating: Optional[int] = Field(None, ge=1, le=5)
    overall_rating: int = Field(..., ge=1, le=5)
    feedback_text: str
    recommendation: str = Field(..., description="strong_hire, hire, maybe, no_hire, strong_no_hire")


class InterviewResponse(InterviewBase):
    interview_id: UUID
    application_id: UUID
    organization_id: UUID
    status: str
    meeting_id: Optional[str]
    technical_rating: Optional[int]
    communication_rating: Optional[int]
    cultural_fit_rating: Optional[int]
    overall_rating: Optional[int]
    feedback_text: Optional[str]
    recommendation: Optional[str]
    feedback_submitted_at: Optional[datetime]
    created_at: datetime
    modified_at: Optional[datetime]

    class Config:
        from_attributes = True


# Offer Schemas
class OfferBase(BaseModel):
    job_title: str = Field(..., max_length=255)
    department_id: Optional[UUID] = None
    reporting_to: Optional[UUID] = None
    employment_type: str
    start_date: Optional[date] = None
    annual_ctc: Decimal = Field(..., gt=0)
    base_salary: Optional[Decimal] = None
    bonus: Optional[Decimal] = None
    other_allowances: Optional[Decimal] = None
    currency: str = "USD"
    benefits: List[str] = Field(default_factory=list)
    valid_until: Optional[datetime] = None


class OfferCreate(OfferBase):
    application_id: UUID
    company_id: UUID


class OfferUpdate(BaseModel):
    status: Optional[str] = None
    start_date: Optional[date] = None
    actual_joining_date: Optional[date] = None
    response_notes: Optional[str] = None


class OfferResponse(OfferBase):
    offer_id: UUID
    application_id: UUID
    organization_id: UUID
    company_id: UUID
    status: str
    offer_letter_url: Optional[str]
    offer_date: Optional[datetime]
    responded_at: Optional[datetime]
    actual_joining_date: Optional[date]
    created_at: datetime
    modified_at: Optional[datetime]

    class Config:
        from_attributes = True


# Pipeline Schemas
class RecruitmentPipelineBase(BaseModel):
    pipeline_name: str = Field(..., max_length=255)
    description: Optional[str] = None
    stages: List[str] = Field(default_factory=lambda: [
        "New", "Screening", "Phone Interview", "Technical Interview",
        "HR Interview", "Manager Interview", "Offer", "Hired"
    ])
    is_default: bool = False


class RecruitmentPipelineCreate(RecruitmentPipelineBase):
    pass


class RecruitmentPipelineResponse(RecruitmentPipelineBase):
    pipeline_id: UUID
    organization_id: UUID
    is_active: bool
    created_at: datetime
    modified_at: Optional[datetime]

    class Config:
        from_attributes = True
