"""
Expense Management Models
Complete expense tracking and reimbursement system
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, Text, JSON, ForeignKey, Enum as SQLEnum, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.database import Base


class ExpenseStatus(str, enum.Enum):
    """Expense status"""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    REIMBURSED = "reimbursed"
    CANCELLED = "cancelled"


class ExpenseCategory(str, enum.Enum):
    """Expense categories"""
    TRAVEL = "travel"
    ACCOMMODATION = "accommodation"
    MEALS = "meals"
    TRANSPORTATION = "transportation"
    OFFICE_SUPPLIES = "office_supplies"
    EQUIPMENT = "equipment"
    TRAINING = "training"
    ENTERTAINMENT = "entertainment"
    COMMUNICATION = "communication"
    MEDICAL = "medical"
    OTHER = "other"


class PaymentMethod(str, enum.Enum):
    """Payment methods"""
    BANK_TRANSFER = "bank_transfer"
    CHECK = "check"
    CASH = "cash"
    PAYROLL = "payroll"


class ExpensePolicy(Base):
    """Expense policies and rules"""
    __tablename__ = "expense_policies"
    
    policy_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.company_id"), index=True)
    
    # Policy details
    policy_name = Column(String(200), nullable=False)
    description = Column(Text)
    category = Column(SQLEnum(ExpenseCategory), nullable=False)
    
    # Limits
    max_amount_per_expense = Column(Numeric(10, 2))
    max_amount_per_day = Column(Numeric(10, 2))
    max_amount_per_month = Column(Numeric(10, 2))
    requires_receipt_above = Column(Numeric(10, 2), default=25.00)
    
    # Approval rules
    requires_manager_approval = Column(Boolean, default=True)
    requires_finance_approval = Column(Boolean, default=False)
    finance_approval_threshold = Column(Numeric(10, 2))
    
    # Additional rules
    allowed_currencies = Column(JSON)  # ["USD", "EUR", "GBP"]
    business_justification_required = Column(Boolean, default=False)
    advance_notice_days = Column(Integer, default=0)
    
    # Status
    is_active = Column(Boolean, default=True)
    effective_from = Column(Date)
    effective_to = Column(Date)
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    expenses = relationship("Expense", back_populates="policy")


class Expense(Base):
    """Employee expense records"""
    __tablename__ = "expenses"
    
    expense_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False, index=True)
    policy_id = Column(UUID(as_uuid=True), ForeignKey("expense_policies.policy_id"))
    
    # Expense details
    expense_number = Column(String(50), unique=True, index=True)
    expense_date = Column(Date, nullable=False, index=True)
    category = Column(SQLEnum(ExpenseCategory), nullable=False)
    description = Column(Text, nullable=False)
    merchant = Column(String(255))
    
    # Amount
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    tax_amount = Column(Numeric(10, 2), default=0)
    total_amount = Column(Numeric(10, 2), nullable=False)
    
    # Receipt
    receipt_url = Column(String(1000))
    receipt_number = Column(String(100))
    has_receipt = Column(Boolean, default=False)
    
    # Business details
    project_id = Column(UUID(as_uuid=True))
    client_name = Column(String(255))
    business_purpose = Column(Text)
    attendees = Column(JSON)  # For meal expenses
    
    # Status and workflow
    status = Column(SQLEnum(ExpenseStatus), default=ExpenseStatus.DRAFT, index=True)
    submitted_at = Column(DateTime(timezone=True))
    
    # Approval
    approved_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    approved_at = Column(DateTime(timezone=True))
    rejected_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    rejected_at = Column(DateTime(timezone=True))
    rejection_reason = Column(Text)
    
    # Reimbursement
    reimbursement_date = Column(Date)
    payment_method = Column(SQLEnum(PaymentMethod))
    payment_reference = Column(String(100))
    reimbursed_amount = Column(Numeric(10, 2))
    
    # Flags
    is_billable = Column(Boolean, default=False)
    is_mileage = Column(Boolean, default=False)
    mileage_distance = Column(Float)
    mileage_rate = Column(Numeric(10, 4))
    
    # Metadata
    is_deleted = Column(Boolean, default=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    policy = relationship("ExpensePolicy", back_populates="expenses")
    comments = relationship("ExpenseComment", back_populates="expense", cascade="all, delete-orphan")
    audit_logs = relationship("ExpenseAuditLog", back_populates="expense", cascade="all, delete-orphan")


class ExpenseComment(Base):
    """Comments on expense records"""
    __tablename__ = "expense_comments"
    
    comment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.expense_id"), nullable=False, index=True)
    
    comment_text = Column(Text, nullable=False)
    commented_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"), nullable=False)
    commented_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    expense = relationship("Expense", back_populates="comments")


class ExpenseAuditLog(Base):
    """Audit trail for expense changes"""
    __tablename__ = "expense_audit_logs"
    
    log_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.expense_id"), nullable=False, index=True)
    
    action = Column(String(50), nullable=False)  # created, submitted, approved, rejected, etc.
    old_status = Column(String(50))
    new_status = Column(String(50))
    changes = Column(JSON)
    
    performed_by = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    performed_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    
    # Relationships
    expense = relationship("Expense", back_populates="audit_logs")
