"""
Benefits Administration Models
Complete benefits management system with plans, enrollment, and claims
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, Text, JSON, ForeignKey, Enum as SQLEnum, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.database import Base


class BenefitType(str, enum.Enum):
    """Benefit types"""
    HEALTH_INSURANCE = "health_insurance"
    DENTAL_INSURANCE = "dental_insurance"
    VISION_INSURANCE = "vision_insurance"
    LIFE_INSURANCE = "life_insurance"
    DISABILITY_INSURANCE = "disability_insurance"
    RETIREMENT_401K = "retirement_401k"
    PENSION = "pension"
    PTO = "pto"
    SICK_LEAVE = "sick_leave"
    PARENTAL_LEAVE = "parental_leave"
    WELLNESS = "wellness"
    EDUCATION = "education"
    COMMUTER = "commuter"
    CUSTOM = "custom"


class PlanStatus(str, enum.Enum):
    """Plan status"""
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"


class EnrollmentStatus(str, enum.Enum):
    """Enrollment status"""
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"
    WAIVED = "waived"


class ClaimStatus(str, enum.Enum):
    """Claim status"""
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    PARTIALLY_APPROVED = "partially_approved"
    REJECTED = "rejected"
    PAID = "paid"


class CoverageLevel(str, enum.Enum):
    """Coverage level"""
    EMPLOYEE_ONLY = "employee_only"
    EMPLOYEE_SPOUSE = "employee_spouse"
    EMPLOYEE_CHILDREN = "employee_children"
    FAMILY = "family"


class BenefitPlan(Base):
    """Benefit plans offered by organization"""
    __tablename__ = "benefit_plans"
    
    plan_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.company_id"), index=True)
    
    # Plan details
    plan_code = Column(String(50), unique=True, nullable=False, index=True)
    plan_name = Column(String(500), nullable=False)
    description = Column(Text)
    benefit_type = Column(SQLEnum(BenefitType), nullable=False)
    status = Column(SQLEnum(PlanStatus), default=PlanStatus.ACTIVE)
    
    # Provider
    provider_name = Column(String(200))
    provider_contact = Column(String(200))
    policy_number = Column(String(200))
    
    # Coverage details
    coverage_levels = Column(JSON)  # Available coverage levels
    coverage_details = Column(JSON)  # What's covered
    exclusions = Column(JSON)  # What's not covered
    
    # Costs
    employer_contribution_percent = Column(Float, default=0.0)
    employee_contribution_percent = Column(Float, default=0.0)
    monthly_premium = Column(Numeric(10, 2))
    annual_maximum = Column(Numeric(10, 2))
    deductible = Column(Numeric(10, 2))
    out_of_pocket_max = Column(Numeric(10, 2))
    copay_amount = Column(Numeric(10, 2))
    
    # Eligibility
    eligibility_criteria = Column(JSON)  # Employment type, tenure, etc.
    waiting_period_days = Column(Integer, default=0)
    
    # Enrollment
    is_open_enrollment = Column(Boolean, default=False)
    open_enrollment_start = Column(Date)
    open_enrollment_end = Column(Date)
    auto_enroll = Column(Boolean, default=False)
    
    # Dependents
    allows_dependents = Column(Boolean, default=False)
    max_dependents = Column(Integer)
    dependent_age_limit = Column(Integer)
    
    # Document
    plan_document_url = Column(String(1000))
    summary_of_benefits_url = Column(String(1000))
    
    # Validity
    effective_date = Column(Date, nullable=False)
    expiration_date = Column(Date)
    
    # Statistics
    total_enrollments = Column(Integer, default=0)
    total_claims = Column(Integer, default=0)
    total_claims_amount = Column(Numeric(12, 2), default=0)
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)
    
    # Relationships
    enrollments = relationship("BenefitEnrollment", back_populates="plan")


class BenefitEnrollment(Base):
    """Employee benefit enrollments"""
    __tablename__ = "benefit_enrollments"
    
    enrollment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("benefit_plans.plan_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Enrollment details
    status = Column(SQLEnum(EnrollmentStatus), default=EnrollmentStatus.PENDING)
    coverage_level = Column(SQLEnum(CoverageLevel), default=CoverageLevel.EMPLOYEE_ONLY)
    
    # Dates
    enrollment_date = Column(Date, nullable=False, server_default=func.current_date())
    effective_date = Column(Date, nullable=False)
    termination_date = Column(Date)
    
    # Costs
    employee_premium = Column(Numeric(10, 2))
    employer_premium = Column(Numeric(10, 2))
    total_premium = Column(Numeric(10, 2))
    payroll_deduction = Column(Numeric(10, 2))
    
    # Beneficiaries
    primary_beneficiary = Column(JSON)
    secondary_beneficiary = Column(JSON)
    
    # Dependents
    covered_dependents = Column(JSON)  # List of dependent details
    total_dependents = Column(Integer, default=0)
    
    # Elections
    annual_election = Column(Numeric(10, 2))  # For FSA, HSA
    remaining_balance = Column(Numeric(10, 2))
    
    # Approval
    approved_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    approved_at = Column(DateTime(timezone=True))
    
    # Waiver
    is_waived = Column(Boolean, default=False)
    waiver_reason = Column(Text)
    waiver_date = Column(Date)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    plan = relationship("BenefitPlan", back_populates="enrollments")
    claims = relationship("BenefitClaim", back_populates="enrollment")


class BenefitClaim(Base):
    """Benefit claims"""
    __tablename__ = "benefit_claims"
    
    claim_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enrollment_id = Column(UUID(as_uuid=True), ForeignKey("benefit_enrollments.enrollment_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Claim details
    claim_number = Column(String(100), unique=True, nullable=False, index=True)
    claim_type = Column(String(100))  # Medical, Dental, Prescription, etc.
    description = Column(Text)
    
    # Service details
    service_date = Column(Date, nullable=False)
    provider_name = Column(String(200))
    provider_id = Column(String(100))
    diagnosis_code = Column(String(50))
    procedure_code = Column(String(50))
    
    # Amounts
    claimed_amount = Column(Numeric(10, 2), nullable=False)
    approved_amount = Column(Numeric(10, 2))
    paid_amount = Column(Numeric(10, 2))
    employee_responsibility = Column(Numeric(10, 2))
    
    # Status
    status = Column(SQLEnum(ClaimStatus), default=ClaimStatus.SUBMITTED)
    
    # Processing
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True))
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    approved_at = Column(DateTime(timezone=True))
    paid_at = Column(DateTime(timezone=True))
    
    # Rejection
    rejection_reason = Column(Text)
    can_appeal = Column(Boolean, default=True)
    appeal_deadline = Column(Date)
    
    # Documents
    receipt_urls = Column(JSON)  # List of uploaded receipts
    supporting_docs_urls = Column(JSON)
    
    # Payment
    payment_method = Column(String(50))  # direct_deposit, check, card
    payment_reference = Column(String(200))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    enrollment = relationship("BenefitEnrollment", back_populates="claims")


class Dependent(Base):
    """Employee dependents for benefit coverage"""
    __tablename__ = "benefit_dependents"
    
    dependent_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Personal info
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    middle_name = Column(String(100))
    date_of_birth = Column(Date, nullable=False)
    gender = Column(String(20))
    
    # Relationship
    relationship_type = Column(String(50), nullable=False)  # spouse, child, domestic_partner
    
    # Identification
    ssn = Column(String(20))  # Encrypted
    id_number = Column(String(100))
    
    # Contact
    email = Column(String(200))
    phone_number = Column(String(20))
    address = Column(Text)
    
    # Student status (for children)
    is_student = Column(Boolean, default=False)
    school_name = Column(String(200))
    expected_graduation_date = Column(Date)
    
    # Disability
    has_disability = Column(Boolean, default=False)
    disability_details = Column(Text)
    
    # Documents
    birth_certificate_url = Column(String(1000))
    marriage_certificate_url = Column(String(1000))
    
    # Status
    is_active = Column(Boolean, default=True)
    inactivation_date = Column(Date)
    inactivation_reason = Column(String(200))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class FlexibleSpendingAccount(Base):
    """FSA/HSA accounts"""
    __tablename__ = "benefit_fsa_accounts"
    
    account_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Account details
    account_type = Column(String(50), nullable=False)  # FSA, HSA, Dependent Care FSA
    account_number = Column(String(100), unique=True)
    
    # Plan year
    plan_year = Column(Integer, nullable=False)
    effective_date = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=False)
    
    # Balances
    annual_election = Column(Numeric(10, 2), nullable=False)
    current_balance = Column(Numeric(10, 2), default=0)
    amount_contributed = Column(Numeric(10, 2), default=0)
    amount_spent = Column(Numeric(10, 2), default=0)
    rollover_amount = Column(Numeric(10, 2), default=0)
    
    # Contribution
    per_paycheck_contribution = Column(Numeric(10, 2))
    total_contributions = Column(Integer, default=0)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class OpenEnrollmentPeriod(Base):
    """Open enrollment periods"""
    __tablename__ = "benefit_open_enrollment"
    
    period_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Period details
    title = Column(String(500), nullable=False)
    description = Column(Text)
    plan_year = Column(Integer, nullable=False)
    
    # Dates
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    # Available plans
    available_plans = Column(JSON)  # List of plan IDs
    
    # Configuration
    require_completion = Column(Boolean, default=False)
    allow_waiver = Column(Boolean, default=True)
    reminder_enabled = Column(Boolean, default=True)
    reminder_days_before = Column(Integer, default=7)
    
    # Statistics
    total_eligible = Column(Integer, default=0)
    total_completed = Column(Integer, default=0)
    completion_rate = Column(Float, default=0.0)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class BenefitChangeEvent(Base):
    """Life events allowing benefit changes outside open enrollment"""
    __tablename__ = "benefit_change_events"
    
    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Event details
    event_type = Column(String(100), nullable=False)  # marriage, birth, adoption, divorce, etc.
    event_date = Column(Date, nullable=False)
    description = Column(Text)
    
    # Supporting documents
    document_urls = Column(JSON)
    
    # Status
    status = Column(String(50), default="pending")  # pending, approved, rejected
    
    # Change window
    change_deadline = Column(Date)
    changes_made = Column(JSON)  # List of changes made
    
    # Approval
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    reviewed_at = Column(DateTime(timezone=True))
    approval_notes = Column(Text)
    
    # Metadata
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


class BenefitAuditLog(Base):
    """Audit log for benefit changes"""
    __tablename__ = "benefit_audit_logs"
    
    log_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    
    # Reference
    entity_type = Column(String(50), nullable=False)  # plan, enrollment, claim
    entity_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Action
    action = Column(String(50), nullable=False)  # create, update, delete, approve, etc.
    changes = Column(JSON)  # What changed
    
    # User
    performed_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    performed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Context
    ip_address = Column(String(45))
    user_agent = Column(String(500))
