"""
Shared Event Schemas for Microservices Communication
Pydantic models for event payloads to ensure type safety across services
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


# ==========================================
# EMPLOYEE SERVICE EVENT PAYLOADS
# ==========================================

class EmployeeCreatedPayload(BaseModel):
    """Payload for employee.created event"""
    employee_id: UUID
    organization_id: UUID
    first_name: str
    last_name: str
    email: EmailStr
    employee_number: str
    department_id: Optional[UUID] = None
    designation_id: Optional[UUID] = None
    manager_id: Optional[UUID] = None
    date_of_joining: date
    employment_type: str


class EmployeeUpdatedPayload(BaseModel):
    """Payload for employee.updated event"""
    employee_id: UUID
    organization_id: UUID
    updated_fields: List[str]
    previous_values: Dict[str, Any]
    new_values: Dict[str, Any]


class EmployeeActivatedPayload(BaseModel):
    """Payload for employee.activated event"""
    employee_id: UUID
    organization_id: UUID
    activated_by: UUID
    activation_date: datetime


class EmployeeDeactivatedPayload(BaseModel):
    """Payload for employee.deactivated event"""
    employee_id: UUID
    organization_id: UUID
    deactivated_by: UUID
    deactivation_date: datetime
    reason: Optional[str] = None


# ==========================================
# ATTENDANCE SERVICE EVENT PAYLOADS
# ==========================================

class AttendanceCheckedInPayload(BaseModel):
    """Payload for attendance.checked_in event"""
    attendance_id: UUID
    employee_id: UUID
    organization_id: UUID
    check_in_time: datetime
    location: Optional[Dict[str, float]] = None  # {"lat": 0.0, "lng": 0.0}
    device_info: Optional[str] = None


class AttendanceCheckedOutPayload(BaseModel):
    """Payload for attendance.checked_out event"""
    attendance_id: UUID
    employee_id: UUID
    organization_id: UUID
    check_in_time: datetime
    check_out_time: datetime
    work_hours: float
    location: Optional[Dict[str, float]] = None


class AttendanceRegularizedPayload(BaseModel):
    """Payload for attendance.regularized event"""
    attendance_id: UUID
    employee_id: UUID
    organization_id: UUID
    original_date: date
    regularization_reason: str
    requested_by: UUID
    requested_at: datetime


# ==========================================
# LEAVE SERVICE EVENT PAYLOADS
# ==========================================

class LeaveRequestedPayload(BaseModel):
    """Payload for leave.requested event"""
    leave_id: UUID
    employee_id: UUID
    organization_id: UUID
    leave_type_id: UUID
    leave_type_name: str
    start_date: date
    end_date: date
    number_of_days: float
    reason: str
    status: str = "pending"


class LeaveApprovedPayload(BaseModel):
    """Payload for leave.approved event"""
    leave_id: UUID
    employee_id: UUID
    organization_id: UUID
    leave_type_name: str
    start_date: date
    end_date: date
    number_of_days: float
    approved_by: UUID
    approved_at: datetime
    approver_comments: Optional[str] = None


class LeaveRejectedPayload(BaseModel):
    """Payload for leave.rejected event"""
    leave_id: UUID
    employee_id: UUID
    organization_id: UUID
    leave_type_name: str
    start_date: date
    end_date: date
    rejected_by: UUID
    rejected_at: datetime
    rejection_reason: str


class LeaveBalanceUpdatedPayload(BaseModel):
    """Payload for leave.balance_updated event"""
    employee_id: UUID
    organization_id: UUID
    leave_type_id: UUID
    leave_type_name: str
    previous_balance: float
    new_balance: float
    change_amount: float
    change_reason: str


# ==========================================
# PAYROLL SERVICE EVENT PAYLOADS
# ==========================================

class PayrollGeneratedPayload(BaseModel):
    """Payload for payroll.generated event"""
    payroll_id: UUID
    organization_id: UUID
    pay_period_start: date
    pay_period_end: date
    employee_count: int
    total_gross_pay: Decimal
    total_net_pay: Decimal
    generated_by: UUID
    generated_at: datetime


class PayrollApprovedPayload(BaseModel):
    """Payload for payroll.approved event"""
    payroll_id: UUID
    organization_id: UUID
    approved_by: UUID
    approved_at: datetime


class SalaryDisbursedPayload(BaseModel):
    """Payload for salary.disbursed event"""
    payslip_id: UUID
    employee_id: UUID
    organization_id: UUID
    pay_period: str
    net_pay: Decimal
    payment_date: date
    payment_method: str
    transaction_reference: Optional[str] = None


# ==========================================
# PERFORMANCE SERVICE EVENT PAYLOADS
# ==========================================

class GoalCreatedPayload(BaseModel):
    """Payload for performance.goal_created event"""
    goal_id: UUID
    employee_id: UUID
    organization_id: UUID
    goal_title: str
    goal_type: str
    target_date: Optional[date] = None
    created_by: UUID


class ReviewCompletedPayload(BaseModel):
    """Payload for performance.review_completed event"""
    review_id: UUID
    employee_id: UUID
    organization_id: UUID
    review_cycle_id: UUID
    review_type: str
    overall_rating: Optional[float] = None
    completed_by: UUID
    completed_at: datetime


class FeedbackGivenPayload(BaseModel):
    """Payload for performance.feedback_given event"""
    feedback_id: UUID
    feedback_for_employee_id: UUID
    feedback_by_employee_id: UUID
    organization_id: UUID
    feedback_type: str
    rating: Optional[int] = None


# ==========================================
# NOTIFICATION SERVICE EVENT PAYLOADS
# ==========================================

class NotificationSentPayload(BaseModel):
    """Payload for notification.sent event"""
    notification_id: UUID
    recipient_id: UUID
    organization_id: UUID
    notification_type: str
    channel: str  # email, sms, push, in_app
    title: str
    message: str
    sent_at: datetime


class EmailSentPayload(BaseModel):
    """Payload for notification.email_sent event"""
    email_id: UUID
    recipient_email: EmailStr
    subject: str
    template: str
    sent_at: datetime
    success: bool
    error_message: Optional[str] = None


# ==========================================
# DOCUMENT SERVICE EVENT PAYLOADS
# ==========================================

class DocumentUploadedPayload(BaseModel):
    """Payload for document.uploaded event"""
    document_id: UUID
    employee_id: UUID
    organization_id: UUID
    document_type: str
    file_name: str
    file_size: int
    uploaded_by: UUID


class DocumentSignedPayload(BaseModel):
    """Payload for document.signed event"""
    signature_id: UUID
    document_id: UUID
    signer_id: UUID
    organization_id: UUID
    signed_at: datetime


# ==========================================
# EXPENSE SERVICE EVENT PAYLOADS
# ==========================================

class ExpenseSubmittedPayload(BaseModel):
    """Payload for expense.submitted event"""
    expense_id: UUID
    employee_id: UUID
    organization_id: UUID
    category: str
    amount: Decimal
    currency: str
    expense_date: date
    submitted_at: datetime


class ExpenseApprovedPayload(BaseModel):
    """Payload for expense.approved event"""
    expense_id: UUID
    employee_id: UUID
    organization_id: UUID
    amount: Decimal
    approved_by: UUID
    approved_at: datetime


# ==========================================
# RECRUITMENT SERVICE EVENT PAYLOADS
# ==========================================

class JobPostedPayload(BaseModel):
    """Payload for recruitment.job_posted event"""
    job_id: UUID
    organization_id: UUID
    job_title: str
    department_id: Optional[UUID] = None
    posted_by: UUID
    posted_at: datetime


class ApplicationReceivedPayload(BaseModel):
    """Payload for recruitment.application_received event"""
    application_id: UUID
    job_id: UUID
    applicant_name: str
    applicant_email: EmailStr
    organization_id: UUID
    applied_at: datetime


class OfferAcceptedPayload(BaseModel):
    """Payload for recruitment.offer_accepted event"""
    offer_id: UUID
    application_id: UUID
    applicant_id: UUID
    organization_id: UUID
    job_title: str
    joining_date: date
    accepted_at: datetime


# ==========================================
# WORKFLOW SERVICE EVENT PAYLOADS
# ==========================================

class WorkflowStartedPayload(BaseModel):
    """Payload for workflow.started event"""
    workflow_id: UUID
    workflow_instance_id: UUID
    workflow_type: str
    entity_type: str
    entity_id: UUID
    organization_id: UUID
    initiated_by: UUID


class WorkflowStepCompletedPayload(BaseModel):
    """Payload for workflow.step_completed event"""
    workflow_instance_id: UUID
    step_id: UUID
    step_name: str
    completed_by: UUID
    action_taken: str  # approved, rejected, etc.
    comments: Optional[str] = None


class WorkflowCompletedPayload(BaseModel):
    """Payload for workflow.completed event"""
    workflow_instance_id: UUID
    workflow_type: str
    final_status: str
    entity_type: str
    entity_id: UUID
    organization_id: UUID
    completed_at: datetime


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def validate_event_payload(event_type: str, payload: Dict[str, Any]) -> BaseModel:
    """
    Validate event payload against the schema for its type
    
    Args:
        event_type: Type of the event
        payload: Event payload data
        
    Returns:
        Validated payload model
        
    Raises:
        ValueError: If event type is unknown or payload is invalid
    """
    payload_models = {
        "employee.created": EmployeeCreatedPayload,
        "employee.updated": EmployeeUpdatedPayload,
        "employee.activated": EmployeeActivatedPayload,
        "employee.deactivated": EmployeeDeactivatedPayload,
        "attendance.checked_in": AttendanceCheckedInPayload,
        "attendance.checked_out": AttendanceCheckedOutPayload,
        "attendance.regularized": AttendanceRegularizedPayload,
        "leave.requested": LeaveRequestedPayload,
        "leave.approved": LeaveApprovedPayload,
        "leave.rejected": LeaveRejectedPayload,
        "leave.balance_updated": LeaveBalanceUpdatedPayload,
        "payroll.generated": PayrollGeneratedPayload,
        "payroll.approved": PayrollApprovedPayload,
        "salary.disbursed": SalaryDisbursedPayload,
        "performance.goal_created": GoalCreatedPayload,
        "performance.review_completed": ReviewCompletedPayload,
        "performance.feedback_given": FeedbackGivenPayload,
        "notification.sent": NotificationSentPayload,
        "notification.email_sent": EmailSentPayload,
        "document.uploaded": DocumentUploadedPayload,
        "document.signed": DocumentSignedPayload,
        "expense.submitted": ExpenseSubmittedPayload,
        "expense.approved": ExpenseApprovedPayload,
        "recruitment.job_posted": JobPostedPayload,
        "recruitment.application_received": ApplicationReceivedPayload,
        "recruitment.offer_accepted": OfferAcceptedPayload,
        "workflow.started": WorkflowStartedPayload,
        "workflow.step_completed": WorkflowStepCompletedPayload,
        "workflow.completed": WorkflowCompletedPayload,
    }
    
    model_class = payload_models.get(event_type)
    if not model_class:
        raise ValueError(f"Unknown event type: {event_type}")
    
    return model_class(**payload)
