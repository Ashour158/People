"""
Pydantic schemas for Expense Management
Request/response validation for expense tracking and reimbursement
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


# Expense Policy Schemas
class ExpensePolicyCreate(BaseModel):
    """Create expense policy"""
    policy_name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: str
    max_amount_per_expense: Optional[Decimal] = None
    max_amount_per_day: Optional[Decimal] = None
    max_amount_per_month: Optional[Decimal] = None
    requires_receipt_above: Decimal = Field(default=25.00)
    requires_manager_approval: bool = True
    requires_finance_approval: bool = False
    finance_approval_threshold: Optional[Decimal] = None
    allowed_currencies: Optional[List[str]] = ["USD"]
    business_justification_required: bool = False
    advance_notice_days: int = 0
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None


class ExpensePolicyUpdate(BaseModel):
    """Update expense policy"""
    policy_name: Optional[str] = None
    description: Optional[str] = None
    max_amount_per_expense: Optional[Decimal] = None
    max_amount_per_day: Optional[Decimal] = None
    max_amount_per_month: Optional[Decimal] = None
    requires_receipt_above: Optional[Decimal] = None
    requires_manager_approval: Optional[bool] = None
    requires_finance_approval: Optional[bool] = None
    finance_approval_threshold: Optional[Decimal] = None
    business_justification_required: Optional[bool] = None
    is_active: Optional[bool] = None


class ExpensePolicyResponse(BaseModel):
    """Expense policy response"""
    policy_id: UUID
    organization_id: UUID
    company_id: Optional[UUID]
    policy_name: str
    description: Optional[str]
    category: str
    max_amount_per_expense: Optional[Decimal]
    max_amount_per_day: Optional[Decimal]
    max_amount_per_month: Optional[Decimal]
    requires_receipt_above: Decimal
    requires_manager_approval: bool
    requires_finance_approval: bool
    finance_approval_threshold: Optional[Decimal]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Expense Schemas
class ExpenseCreate(BaseModel):
    """Create expense"""
    expense_date: date
    category: str
    description: str = Field(..., min_length=1)
    merchant: Optional[str] = None
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="USD", max_length=3)
    tax_amount: Decimal = Field(default=0)
    receipt_url: Optional[str] = None
    receipt_number: Optional[str] = None
    project_id: Optional[UUID] = None
    client_name: Optional[str] = None
    business_purpose: Optional[str] = None
    attendees: Optional[List[str]] = None
    is_billable: bool = False
    is_mileage: bool = False
    mileage_distance: Optional[float] = None
    mileage_rate: Optional[Decimal] = None

    @validator('tax_amount')
    def validate_tax_amount(cls, v, values):
        if v < 0:
            raise ValueError('Tax amount cannot be negative')
        return v


class ExpenseUpdate(BaseModel):
    """Update expense"""
    expense_date: Optional[date] = None
    category: Optional[str] = None
    description: Optional[str] = None
    merchant: Optional[str] = None
    amount: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    receipt_url: Optional[str] = None
    receipt_number: Optional[str] = None
    business_purpose: Optional[str] = None
    attendees: Optional[List[str]] = None


class ExpenseSubmit(BaseModel):
    """Submit expense for approval"""
    expense_ids: List[UUID]


class ExpenseApprove(BaseModel):
    """Approve expense"""
    expense_id: UUID
    comments: Optional[str] = None


class ExpenseReject(BaseModel):
    """Reject expense"""
    expense_id: UUID
    rejection_reason: str = Field(..., min_length=1)


class ExpenseReimburse(BaseModel):
    """Process reimbursement"""
    expense_ids: List[UUID]
    payment_method: str
    payment_reference: Optional[str] = None
    reimbursement_date: date


class ExpenseResponse(BaseModel):
    """Expense response"""
    expense_id: UUID
    organization_id: UUID
    employee_id: UUID
    expense_number: str
    expense_date: date
    category: str
    description: str
    merchant: Optional[str]
    amount: Decimal
    currency: str
    tax_amount: Decimal
    total_amount: Decimal
    receipt_url: Optional[str]
    has_receipt: bool
    status: str
    submitted_at: Optional[datetime]
    approved_by: Optional[UUID]
    approved_at: Optional[datetime]
    rejected_by: Optional[UUID]
    rejected_at: Optional[datetime]
    rejection_reason: Optional[str]
    reimbursement_date: Optional[date]
    payment_method: Optional[str]
    is_billable: bool
    created_at: datetime
    modified_at: Optional[datetime]

    class Config:
        from_attributes = True


class ExpenseListResponse(BaseModel):
    """Paginated expense list response"""
    expenses: List[ExpenseResponse]
    total: int
    page: int
    limit: int


class ExpenseSummary(BaseModel):
    """Expense summary statistics"""
    total_expenses: int
    total_amount: Decimal
    pending_approval: int
    pending_amount: Decimal
    approved: int
    approved_amount: Decimal
    reimbursed: int
    reimbursed_amount: Decimal


# Expense Comment Schemas
class ExpenseCommentCreate(BaseModel):
    """Create expense comment"""
    comment_text: str = Field(..., min_length=1)


class ExpenseCommentResponse(BaseModel):
    """Expense comment response"""
    comment_id: UUID
    expense_id: UUID
    comment_text: str
    commented_by: UUID
    commented_at: datetime

    class Config:
        from_attributes = True


# Receipt OCR Schema
class ReceiptOCRRequest(BaseModel):
    """Receipt OCR processing request"""
    receipt_image: str  # Base64 encoded image


class ReceiptOCRResponse(BaseModel):
    """Receipt OCR processing response"""
    merchant: Optional[str]
    amount: Optional[Decimal]
    date: Optional[date]
    receipt_number: Optional[str]
    currency: Optional[str]
    tax_amount: Optional[Decimal]
    confidence: float


# Base response
class BaseResponse(BaseModel):
    """Base response schema"""
    success: bool = True
    message: Optional[str] = None
