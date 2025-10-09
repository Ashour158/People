"""
Recruitment Module Models
Complete recruitment and applicant tracking system models
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Float, Text, ForeignKey, Enum as SQLEnum, Date, Numeric
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.database import Base


# Enums
class JobStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"
    ON_HOLD = "on_hold"
    CANCELLED = "cancelled"


class EmploymentType(str, enum.Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERNSHIP = "internship"
    TEMPORARY = "temporary"


class ApplicationStatus(str, enum.Enum):
    NEW = "new"
    SCREENING = "screening"
    SHORTLISTED = "shortlisted"
    INTERVIEWING = "interviewing"
    OFFERED = "offered"
    HIRED = "hired"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class InterviewType(str, enum.Enum):
    PHONE_SCREEN = "phone_screen"
    VIDEO = "video"
    IN_PERSON = "in_person"
    TECHNICAL = "technical"
    HR = "hr"
    MANAGERIAL = "managerial"
    PANEL = "panel"


class InterviewStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    RESCHEDULED = "rescheduled"


class OfferStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    WITHDRAWN = "withdrawn"


# Models
class JobPosting(Base):
    """Job postings for recruitment"""
    __tablename__ = "job_postings"
    
    job_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.company_id"), nullable=False, index=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.department_id"))
    
    # Job details
    job_title = Column(String(255), nullable=False, index=True)
    job_code = Column(String(50), unique=True)
    job_description = Column(Text, nullable=False)
    requirements = Column(Text)
    responsibilities = Column(Text)
    
    # Employment details
    employment_type = Column(SQLEnum(EmploymentType), nullable=False)
    number_of_positions = Column(Integer, default=1)
    
    # Experience and education
    experience_required = Column(String(100))  # e.g., "2-5 years"
    education_required = Column(String(255))
    
    # Salary
    salary_min = Column(Numeric(15, 2))
    salary_max = Column(Numeric(15, 2))
    salary_currency = Column(String(3), default="USD")
    salary_period = Column(String(20), default="annual")  # annual, monthly, hourly
    
    # Skills
    required_skills = Column(ARRAY(String), default=[])
    preferred_skills = Column(ARRAY(String), default=[])
    
    # Location
    location = Column(String(255))
    remote_allowed = Column(Boolean, default=False)
    
    # Posting details
    status = Column(SQLEnum(JobStatus), default=JobStatus.DRAFT, index=True)
    posted_date = Column(DateTime(timezone=True))
    closing_date = Column(DateTime(timezone=True))
    
    # Hiring details
    hiring_manager_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    recruiter_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    
    # Visibility
    is_internal = Column(Boolean, default=False)
    is_external = Column(Boolean, default=True)
    is_urgent = Column(Boolean, default=False)
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class Candidate(Base):
    """Candidate information"""
    __tablename__ = "candidates"
    
    candidate_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Personal details
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(20))
    alternate_phone = Column(String(20))
    
    # Current employment
    current_company = Column(String(255))
    current_designation = Column(String(255))
    current_location = Column(String(255))
    
    # Experience
    total_experience_years = Column(Float)
    notice_period_days = Column(Integer)
    
    # Salary
    current_ctc = Column(Numeric(15, 2))
    expected_ctc = Column(Numeric(15, 2))
    currency = Column(String(3), default="USD")
    
    # Skills and qualifications
    skills = Column(ARRAY(String), default=[])
    highest_education = Column(String(255))
    certifications = Column(ARRAY(String), default=[])
    
    # Documents
    resume_url = Column(String(500))
    portfolio_url = Column(String(500))
    linkedin_url = Column(String(500))
    
    # Source
    source = Column(String(100))  # website, linkedin, referral, etc.
    referred_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class Application(Base):
    """Job applications"""
    __tablename__ = "applications"
    
    application_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("job_postings.job_id"), nullable=False, index=True)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.candidate_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Application details
    status = Column(SQLEnum(ApplicationStatus), default=ApplicationStatus.NEW, index=True)
    applied_date = Column(DateTime(timezone=True), server_default=func.now())
    
    # Cover letter
    cover_letter = Column(Text)
    
    # Screening
    screening_score = Column(Integer)  # 0-100
    screening_notes = Column(Text)
    screened_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    screened_at = Column(DateTime(timezone=True))
    
    # Assignment/Test
    assignment_sent = Column(Boolean, default=False)
    assignment_submitted = Column(Boolean, default=False)
    assignment_score = Column(Integer)
    
    # Overall assessment
    overall_rating = Column(Integer)  # 1-5 stars
    
    # Stage tracking
    current_stage = Column(String(100))
    
    # Rejection
    rejection_reason = Column(Text)
    rejected_at = Column(DateTime(timezone=True))
    rejected_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class Interview(Base):
    """Interview scheduling and tracking"""
    __tablename__ = "interviews"
    
    interview_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.application_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Interview details
    interview_round = Column(String(100), nullable=False)
    interview_type = Column(SQLEnum(InterviewType), nullable=False)
    status = Column(SQLEnum(InterviewStatus), default=InterviewStatus.SCHEDULED)
    
    # Scheduling
    scheduled_date = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes = Column(Integer, default=60)
    
    # Location/Meeting
    location = Column(String(255))
    meeting_link = Column(String(500))
    meeting_id = Column(String(255))
    
    # Interviewers
    interviewer_ids = Column(ARRAY(UUID(as_uuid=True)))
    panel_lead_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    
    # Preparation
    interview_notes = Column(Text)
    questions_template = Column(Text)
    
    # Feedback
    technical_rating = Column(Integer)  # 1-5
    communication_rating = Column(Integer)  # 1-5
    cultural_fit_rating = Column(Integer)  # 1-5
    overall_rating = Column(Integer)  # 1-5
    
    feedback_text = Column(Text)
    recommendation = Column(String(50))  # strong_hire, hire, maybe, no_hire, strong_no_hire
    
    # Metadata
    feedback_submitted_at = Column(DateTime(timezone=True))
    feedback_submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class Offer(Base):
    """Job offers"""
    __tablename__ = "offers"
    
    offer_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.application_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.company_id"), nullable=False)
    
    # Offer details
    status = Column(SQLEnum(OfferStatus), default=OfferStatus.DRAFT)
    offer_letter_url = Column(String(500))
    
    # Position details
    job_title = Column(String(255), nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.department_id"))
    reporting_to = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    
    # Employment terms
    employment_type = Column(SQLEnum(EmploymentType))
    start_date = Column(Date)
    
    # Compensation
    annual_ctc = Column(Numeric(15, 2), nullable=False)
    base_salary = Column(Numeric(15, 2))
    bonus = Column(Numeric(15, 2))
    other_allowances = Column(Numeric(15, 2))
    currency = Column(String(3), default="USD")
    
    # Benefits
    benefits = Column(ARRAY(String), default=[])
    
    # Validity
    offer_date = Column(DateTime(timezone=True))
    valid_until = Column(DateTime(timezone=True))
    
    # Response
    responded_at = Column(DateTime(timezone=True))
    response_notes = Column(Text)
    
    # Joining
    actual_joining_date = Column(Date)
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class RecruitmentPipeline(Base):
    """Recruitment pipeline configuration"""
    __tablename__ = "recruitment_pipelines"
    
    pipeline_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Pipeline details
    pipeline_name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Stages (JSON array of stage names)
    stages = Column(ARRAY(String), default=[
        "New",
        "Screening",
        "Phone Interview",
        "Technical Interview",
        "HR Interview",
        "Manager Interview",
        "Offer",
        "Hired"
    ])
    
    # Configuration
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
