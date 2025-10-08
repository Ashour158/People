"""Leave API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_
from typing import Optional
from datetime import date, datetime
import structlog
import uuid

from app.db.database import get_db
from app.schemas.schemas import (
    LeaveRequestCreate, LeaveRequestUpdate, LeaveApproval,
    LeaveResponse, BaseResponse, PaginatedResponse
)
from app.models.models import LeaveRequest, LeaveType, Employee
from app.middleware.auth import security, AuthMiddleware
from app.events.event_dispatcher import EventDispatcher, Events

router = APIRouter(prefix="/leave", tags=["Leave Management"])
logger = structlog.get_logger()


@router.post("", response_model=BaseResponse, status_code=status.HTTP_201_CREATED)
async def create_leave_request(
    data: LeaveRequestCreate,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Create new leave request"""
    
    employee_id = current_user["employee_id"]
    organization_id = current_user["organization_id"]
    
    # Verify leave type exists
    result = await db.execute(
        select(LeaveType).where(
            and_(
                LeaveType.leave_type_id == data.leave_type_id,
                LeaveType.organization_id == organization_id,
                LeaveType.is_active == True
            )
        )
    )
    leave_type = result.scalar_one_or_none()
    
    if not leave_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave type not found"
        )
    
    # Calculate total days
    total_days = (data.end_date - data.start_date).days + 1
    
    # Check for overlapping leave requests
    result = await db.execute(
        select(LeaveRequest).where(
            and_(
                LeaveRequest.employee_id == employee_id,
                LeaveRequest.status.in_(["pending", "approved"]),
                or_(
                    and_(
                        LeaveRequest.start_date <= data.start_date,
                        LeaveRequest.end_date >= data.start_date
                    ),
                    and_(
                        LeaveRequest.start_date <= data.end_date,
                        LeaveRequest.end_date >= data.end_date
                    )
                )
            )
        )
    )
    overlapping = result.scalar_one_or_none()
    
    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Leave request overlaps with existing request"
        )
    
    try:
        # Create leave request
        leave_request = LeaveRequest(
            leave_request_id=uuid.uuid4(),
            employee_id=employee_id,
            organization_id=organization_id,
            leave_type_id=data.leave_type_id,
            start_date=data.start_date,
            end_date=data.end_date,
            total_days=total_days,
            reason=data.reason,
            status="pending"
        )
        db.add(leave_request)
        
        await db.commit()
        
        await EventDispatcher.dispatch(Events.LEAVE_APPLIED, {
            "leave_request_id": str(leave_request.leave_request_id),
            "employee_id": str(employee_id),
            "total_days": total_days
        })
        
        logger.info(f"Leave request created for employee: {employee_id}")
        
        return BaseResponse(
            success=True,
            message="Leave request submitted successfully"
        )
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Leave request error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create leave request"
        )


@router.get("", response_model=PaginatedResponse)
async def list_leave_requests(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """List leave requests"""
    
    organization_id = current_user["organization_id"]
    
    # Build query
    query = select(LeaveRequest).where(
        LeaveRequest.organization_id == organization_id
    )
    
    # Apply filters
    if status:
        query = query.where(LeaveRequest.status == status)
    
    if employee_id:
        query = query.where(LeaveRequest.employee_id == employee_id)
    else:
        # Non-admins can only view their own requests
        if current_user["role"] not in ["admin", "hr_manager", "manager"]:
            query = query.where(LeaveRequest.employee_id == current_user["employee_id"])
    
    # Get total count
    count_query = query.with_only_columns(func.count())
    total = (await db.execute(count_query)).scalar()
    
    # Apply pagination
    offset = (page - 1) * limit
    query = query.order_by(LeaveRequest.created_at.desc()).offset(offset).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    requests = result.scalars().all()
    
    # Convert to dict
    leave_data = [
        {
            "leave_request_id": str(req.leave_request_id),
            "employee_id": str(req.employee_id),
            "leave_type_id": str(req.leave_type_id),
            "start_date": str(req.start_date),
            "end_date": str(req.end_date),
            "total_days": req.total_days,
            "reason": req.reason,
            "status": req.status,
            "approver_id": str(req.approver_id) if req.approver_id else None,
            "approved_date": req.approved_date.isoformat() if req.approved_date else None,
            "created_at": req.created_at.isoformat()
        }
        for req in requests
    ]
    
    return PaginatedResponse(
        success=True,
        data=leave_data,
        pagination={
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    )


@router.get("/{leave_request_id}", response_model=LeaveResponse)
async def get_leave_request(
    leave_request_id: str,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Get leave request by ID"""
    
    result = await db.execute(
        select(LeaveRequest).where(
            and_(
                LeaveRequest.leave_request_id == leave_request_id,
                LeaveRequest.organization_id == current_user["organization_id"]
            )
        )
    )
    
    leave_request = result.scalar_one_or_none()
    if not leave_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found"
        )
    
    # Check access permissions
    if (current_user["role"] not in ["admin", "hr_manager", "manager"] and
        str(leave_request.employee_id) != current_user["employee_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return LeaveResponse.from_orm(leave_request)


@router.put("/{leave_request_id}/approve", response_model=BaseResponse)
async def approve_leave_request(
    leave_request_id: str,
    data: LeaveApproval,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Approve or reject leave request"""
    
    # Only managers, HR, and admins can approve
    if current_user["role"] not in ["admin", "hr_manager", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    result = await db.execute(
        select(LeaveRequest).where(
            and_(
                LeaveRequest.leave_request_id == leave_request_id,
                LeaveRequest.organization_id == current_user["organization_id"]
            )
        )
    )
    
    leave_request = result.scalar_one_or_none()
    if not leave_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found"
        )
    
    if leave_request.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Leave request already processed"
        )
    
    try:
        # Update status
        leave_request.status = data.status
        leave_request.approver_id = current_user["employee_id"]
        leave_request.approved_date = datetime.utcnow()
        leave_request.approver_comments = data.comments
        
        await db.commit()
        
        # Dispatch appropriate event
        if data.status == "approved":
            await EventDispatcher.dispatch(Events.LEAVE_APPROVED, {
                "leave_request_id": str(leave_request_id),
                "employee_id": str(leave_request.employee_id)
            })
        else:
            await EventDispatcher.dispatch(Events.LEAVE_REJECTED, {
                "leave_request_id": str(leave_request_id),
                "employee_id": str(leave_request.employee_id)
            })
        
        logger.info(f"Leave request {data.status}: {leave_request_id}")
        
        return BaseResponse(
            success=True,
            message=f"Leave request {data.status} successfully"
        )
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Leave approval error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process leave request"
        )


@router.delete("/{leave_request_id}", response_model=BaseResponse)
async def cancel_leave_request(
    leave_request_id: str,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Cancel leave request"""
    
    result = await db.execute(
        select(LeaveRequest).where(
            and_(
                LeaveRequest.leave_request_id == leave_request_id,
                LeaveRequest.employee_id == current_user["employee_id"]
            )
        )
    )
    
    leave_request = result.scalar_one_or_none()
    if not leave_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found"
        )
    
    if leave_request.status not in ["pending", "approved"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel this leave request"
        )
    
    try:
        leave_request.status = "cancelled"
        await db.commit()
        
        await EventDispatcher.dispatch(Events.LEAVE_CANCELLED, {
            "leave_request_id": str(leave_request_id),
            "employee_id": str(leave_request.employee_id)
        })
        
        logger.info(f"Leave request cancelled: {leave_request_id}")
        
        return BaseResponse(
            success=True,
            message="Leave request cancelled successfully"
        )
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Leave cancellation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel leave request"
        )
