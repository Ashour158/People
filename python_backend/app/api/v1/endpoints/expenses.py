"""
Expense Management API endpoints
Complete expense tracking and reimbursement system
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import Optional, List
import structlog
from datetime import datetime, date
import uuid

from app.db.database import get_db
from app.schemas.expense import (
    ExpensePolicyCreate, ExpensePolicyUpdate, ExpensePolicyResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseSubmit, ExpenseApprove, ExpenseReject,
    ExpenseReimburse, ExpenseResponse, ExpenseListResponse, ExpenseSummary,
    ExpenseCommentCreate, ExpenseCommentResponse, ReceiptOCRResponse, BaseResponse
)
from app.models.expense import ExpensePolicy, Expense, ExpenseComment, ExpenseAuditLog, ExpenseStatus
from app.middleware.auth import security, AuthMiddleware

router = APIRouter(prefix="/expenses", tags=["Expenses"])
logger = structlog.get_logger()


# Expense Policy Endpoints
@router.post("/policies", response_model=ExpensePolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_expense_policy(
    data: ExpensePolicyCreate,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Create new expense policy"""
    policy = ExpensePolicy(
        organization_id=current_user["organization_id"],
        company_id=current_user.get("company_id"),
        policy_name=data.policy_name,
        description=data.description,
        category=data.category,
        max_amount_per_expense=data.max_amount_per_expense,
        max_amount_per_day=data.max_amount_per_day,
        max_amount_per_month=data.max_amount_per_month,
        requires_receipt_above=data.requires_receipt_above,
        requires_manager_approval=data.requires_manager_approval,
        requires_finance_approval=data.requires_finance_approval,
        finance_approval_threshold=data.finance_approval_threshold,
        allowed_currencies=data.allowed_currencies,
        business_justification_required=data.business_justification_required,
        advance_notice_days=data.advance_notice_days,
        effective_from=data.effective_from,
        effective_to=data.effective_to,
        created_by=current_user["user_id"]
    )
    
    db.add(policy)
    await db.commit()
    await db.refresh(policy)
    
    logger.info(f"Expense policy created: {policy.policy_name}")
    return policy


@router.get("/policies", response_model=List[ExpensePolicyResponse])
async def list_expense_policies(
    category: Optional[str] = None,
    is_active: bool = True,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """List expense policies"""
    query = select(ExpensePolicy).where(
        and_(
            ExpensePolicy.organization_id == current_user["organization_id"],
            ExpensePolicy.is_active == is_active
        )
    )
    
    if category:
        query = query.where(ExpensePolicy.category == category)
    
    result = await db.execute(query)
    policies = result.scalars().all()
    return policies


# Expense Endpoints
@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    data: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Create new expense"""
    # Generate expense number
    expense_number = f"EXP-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Calculate total amount
    total_amount = data.amount + data.tax_amount
    
    expense = Expense(
        organization_id=current_user["organization_id"],
        employee_id=current_user["employee_id"],
        expense_number=expense_number,
        expense_date=data.expense_date,
        category=data.category,
        description=data.description,
        merchant=data.merchant,
        amount=data.amount,
        currency=data.currency,
        tax_amount=data.tax_amount,
        total_amount=total_amount,
        receipt_url=data.receipt_url,
        receipt_number=data.receipt_number,
        has_receipt=bool(data.receipt_url),
        project_id=data.project_id,
        client_name=data.client_name,
        business_purpose=data.business_purpose,
        attendees=data.attendees,
        is_billable=data.is_billable,
        is_mileage=data.is_mileage,
        mileage_distance=data.mileage_distance,
        mileage_rate=data.mileage_rate,
        status=ExpenseStatus.DRAFT,
        created_by=current_user["user_id"]
    )
    
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    
    # Create audit log
    audit_log = ExpenseAuditLog(
        expense_id=expense.expense_id,
        action="created",
        new_status=ExpenseStatus.DRAFT.value,
        performed_by=current_user["user_id"]
    )
    db.add(audit_log)
    await db.commit()
    
    logger.info(f"Expense created: {expense.expense_number}")
    return expense


@router.get("", response_model=ExpenseListResponse)
async def list_expenses(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    category: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    employee_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """List expenses with filtering"""
    query = select(Expense).where(
        and_(
            Expense.organization_id == current_user["organization_id"],
            Expense.is_deleted == False
        )
    )
    
    # Apply filters
    if status:
        query = query.where(Expense.status == status)
    if category:
        query = query.where(Expense.category == category)
    if from_date:
        query = query.where(Expense.expense_date >= from_date)
    if to_date:
        query = query.where(Expense.expense_date <= to_date)
    if employee_id:
        query = query.where(Expense.employee_id == employee_id)
    else:
        # By default, show only user's own expenses unless they're a manager/admin
        if current_user["role"] not in ["admin", "hr_manager", "manager"]:
            query = query.where(Expense.employee_id == current_user["employee_id"])
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    query = query.order_by(Expense.expense_date.desc())
    query = query.offset((page - 1) * limit).limit(limit)
    
    result = await db.execute(query)
    expenses = result.scalars().all()
    
    return ExpenseListResponse(
        expenses=expenses,
        total=total,
        page=page,
        limit=limit
    )


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: str,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Get expense by ID"""
    result = await db.execute(
        select(Expense).where(
            and_(
                Expense.expense_id == expense_id,
                Expense.organization_id == current_user["organization_id"],
                Expense.is_deleted == False
            )
        )
    )
    
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    return expense


@router.patch("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    data: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Update expense (only in DRAFT status)"""
    result = await db.execute(
        select(Expense).where(
            and_(
                Expense.expense_id == expense_id,
                Expense.organization_id == current_user["organization_id"],
                Expense.employee_id == current_user["employee_id"],
                Expense.status == ExpenseStatus.DRAFT,
                Expense.is_deleted == False
            )
        )
    )
    
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found or cannot be modified"
        )
    
    # Update fields
    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(expense, field, value)
    
    # Recalculate total if amount or tax changed
    if 'amount' in update_data or 'tax_amount' in update_data:
        expense.total_amount = expense.amount + expense.tax_amount
    
    expense.modified_by = current_user["user_id"]
    expense.modified_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(expense)
    
    logger.info(f"Expense updated: {expense.expense_number}")
    return expense


@router.post("/submit", response_model=BaseResponse)
async def submit_expenses(
    data: ExpenseSubmit,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Submit expenses for approval"""
    submitted_count = 0
    
    for expense_id in data.expense_ids:
        result = await db.execute(
            select(Expense).where(
                and_(
                    Expense.expense_id == expense_id,
                    Expense.organization_id == current_user["organization_id"],
                    Expense.employee_id == current_user["employee_id"],
                    Expense.status == ExpenseStatus.DRAFT
                )
            )
        )
        
        expense = result.scalar_one_or_none()
        if expense:
            expense.status = ExpenseStatus.SUBMITTED
            expense.submitted_at = datetime.utcnow()
            expense.modified_by = current_user["user_id"]
            expense.modified_at = datetime.utcnow()
            
            # Create audit log
            audit_log = ExpenseAuditLog(
                expense_id=expense.expense_id,
                action="submitted",
                old_status=ExpenseStatus.DRAFT.value,
                new_status=ExpenseStatus.SUBMITTED.value,
                performed_by=current_user["user_id"]
            )
            db.add(audit_log)
            
            submitted_count += 1
    
    await db.commit()
    
    return BaseResponse(
        success=True,
        message=f"{submitted_count} expense(s) submitted for approval"
    )


@router.post("/approve", response_model=BaseResponse)
async def approve_expense(
    data: ExpenseApprove,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Approve expense (manager/admin only)"""
    result = await db.execute(
        select(Expense).where(
            and_(
                Expense.expense_id == data.expense_id,
                Expense.organization_id == current_user["organization_id"],
                Expense.status == ExpenseStatus.SUBMITTED
            )
        )
    )
    
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found or already processed"
        )
    
    expense.status = ExpenseStatus.APPROVED
    expense.approved_by = current_user["user_id"]
    expense.approved_at = datetime.utcnow()
    expense.modified_by = current_user["user_id"]
    expense.modified_at = datetime.utcnow()
    
    # Create audit log
    audit_log = ExpenseAuditLog(
        expense_id=expense.expense_id,
        action="approved",
        old_status=ExpenseStatus.SUBMITTED.value,
        new_status=ExpenseStatus.APPROVED.value,
        performed_by=current_user["user_id"]
    )
    db.add(audit_log)
    
    # Add comment if provided
    if data.comments:
        comment = ExpenseComment(
            expense_id=expense.expense_id,
            comment_text=data.comments,
            commented_by=current_user["user_id"]
        )
        db.add(comment)
    
    await db.commit()
    
    logger.info(f"Expense approved: {expense.expense_number}")
    return BaseResponse(success=True, message="Expense approved successfully")


@router.post("/reject", response_model=BaseResponse)
async def reject_expense(
    data: ExpenseReject,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Reject expense (manager/admin only)"""
    result = await db.execute(
        select(Expense).where(
            and_(
                Expense.expense_id == data.expense_id,
                Expense.organization_id == current_user["organization_id"],
                Expense.status == ExpenseStatus.SUBMITTED
            )
        )
    )
    
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found or already processed"
        )
    
    expense.status = ExpenseStatus.REJECTED
    expense.rejected_by = current_user["user_id"]
    expense.rejected_at = datetime.utcnow()
    expense.rejection_reason = data.rejection_reason
    expense.modified_by = current_user["user_id"]
    expense.modified_at = datetime.utcnow()
    
    # Create audit log
    audit_log = ExpenseAuditLog(
        expense_id=expense.expense_id,
        action="rejected",
        old_status=ExpenseStatus.SUBMITTED.value,
        new_status=ExpenseStatus.REJECTED.value,
        changes={"rejection_reason": data.rejection_reason},
        performed_by=current_user["user_id"]
    )
    db.add(audit_log)
    
    await db.commit()
    
    logger.info(f"Expense rejected: {expense.expense_number}")
    return BaseResponse(success=True, message="Expense rejected")


@router.post("/reimburse", response_model=BaseResponse)
async def reimburse_expenses(
    data: ExpenseReimburse,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Process reimbursement (finance/admin only)"""
    reimbursed_count = 0
    
    for expense_id in data.expense_ids:
        result = await db.execute(
            select(Expense).where(
                and_(
                    Expense.expense_id == expense_id,
                    Expense.organization_id == current_user["organization_id"],
                    Expense.status == ExpenseStatus.APPROVED
                )
            )
        )
        
        expense = result.scalar_one_or_none()
        if expense:
            expense.status = ExpenseStatus.REIMBURSED
            expense.reimbursement_date = data.reimbursement_date
            expense.payment_method = data.payment_method
            expense.payment_reference = data.payment_reference
            expense.reimbursed_amount = expense.total_amount
            expense.modified_by = current_user["user_id"]
            expense.modified_at = datetime.utcnow()
            
            # Create audit log
            audit_log = ExpenseAuditLog(
                expense_id=expense.expense_id,
                action="reimbursed",
                old_status=ExpenseStatus.APPROVED.value,
                new_status=ExpenseStatus.REIMBURSED.value,
                performed_by=current_user["user_id"]
            )
            db.add(audit_log)
            
            reimbursed_count += 1
    
    await db.commit()
    
    return BaseResponse(
        success=True,
        message=f"{reimbursed_count} expense(s) reimbursed"
    )


@router.get("/summary/stats", response_model=ExpenseSummary)
async def get_expense_summary(
    employee_id: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Get expense summary statistics"""
    query = select(Expense).where(
        and_(
            Expense.organization_id == current_user["organization_id"],
            Expense.is_deleted == False
        )
    )
    
    if employee_id:
        query = query.where(Expense.employee_id == employee_id)
    elif current_user["role"] not in ["admin", "hr_manager"]:
        query = query.where(Expense.employee_id == current_user["employee_id"])
    
    if from_date:
        query = query.where(Expense.expense_date >= from_date)
    if to_date:
        query = query.where(Expense.expense_date <= to_date)
    
    result = await db.execute(query)
    expenses = result.scalars().all()
    
    summary = ExpenseSummary(
        total_expenses=len(expenses),
        total_amount=sum(e.total_amount for e in expenses),
        pending_approval=len([e for e in expenses if e.status == ExpenseStatus.SUBMITTED]),
        pending_amount=sum(e.total_amount for e in expenses if e.status == ExpenseStatus.SUBMITTED),
        approved=len([e for e in expenses if e.status == ExpenseStatus.APPROVED]),
        approved_amount=sum(e.total_amount for e in expenses if e.status == ExpenseStatus.APPROVED),
        reimbursed=len([e for e in expenses if e.status == ExpenseStatus.REIMBURSED]),
        reimbursed_amount=sum(e.total_amount for e in expenses if e.status == ExpenseStatus.REIMBURSED)
    )
    
    return summary


# Expense Comments
@router.post("/{expense_id}/comments", response_model=ExpenseCommentResponse, status_code=status.HTTP_201_CREATED)
async def add_expense_comment(
    expense_id: str,
    data: ExpenseCommentCreate,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Add comment to expense"""
    # Verify expense exists
    result = await db.execute(
        select(Expense).where(
            and_(
                Expense.expense_id == expense_id,
                Expense.organization_id == current_user["organization_id"]
            )
        )
    )
    
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    comment = ExpenseComment(
        expense_id=expense_id,
        comment_text=data.comment_text,
        commented_by=current_user["user_id"]
    )
    
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    
    return comment


@router.get("/{expense_id}/comments", response_model=List[ExpenseCommentResponse])
async def list_expense_comments(
    expense_id: str,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """List expense comments"""
    result = await db.execute(
        select(ExpenseComment).where(
            ExpenseComment.expense_id == expense_id
        ).order_by(ExpenseComment.commented_at.desc())
    )
    
    comments = result.scalars().all()
    return comments


@router.delete("/{expense_id}", response_model=BaseResponse)
async def delete_expense(
    expense_id: str,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Soft delete expense (only in DRAFT status)"""
    result = await db.execute(
        select(Expense).where(
            and_(
                Expense.expense_id == expense_id,
                Expense.organization_id == current_user["organization_id"],
                Expense.employee_id == current_user["employee_id"],
                Expense.status == ExpenseStatus.DRAFT,
                Expense.is_deleted == False
            )
        )
    )
    
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found or cannot be deleted"
        )
    
    expense.is_deleted = True
    expense.modified_by = current_user["user_id"]
    expense.modified_at = datetime.utcnow()
    
    await db.commit()
    
    return BaseResponse(success=True, message="Expense deleted successfully")
