"""
Leave Management Controller (API Routes).
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query

from ..services.leave import leave_service
from ..validators.leave import (
    ApplyLeaveSchema,
    ApproveRejectLeaveSchema,
    CancelLeaveSchema
)
from ..middleware.auth import get_current_user
from ..utils.response import success_response

router = APIRouter(prefix="/api/v1/leave", tags=["Leave Management"])


@router.get("/types")
async def get_leave_types(
    company_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get leave types for the organization."""
    organization_id = current_user['organization_id']
    result = leave_service.get_leave_types(organization_id, company_id)
    return success_response(result)


@router.post("/apply")
async def apply_leave(
    data: ApplyLeaveSchema,
    current_user: dict = Depends(get_current_user)
):
    """Apply for leave."""
    employee_id = current_user['employee_id']
    organization_id = current_user['organization_id']
    
    if not employee_id:
        return success_response(None, status_code=401)
    
    result = leave_service.apply_leave(
        employee_id,
        organization_id,
        data.model_dump()
    )
    return success_response(result, message="Leave application submitted", status_code=201)


@router.get("/applications")
async def get_leave_applications(
    employee_id: Optional[str] = Query(None),
    leave_status: Optional[str] = Query(None),
    leave_type_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get leave applications with filters."""
    organization_id = current_user['organization_id']
    
    filters = {
        'employee_id': employee_id,
        'leave_status': leave_status,
        'leave_type_id': leave_type_id,
        'page': page,
        'limit': limit
    }
    
    # If not admin, only show own leaves
    if not employee_id and 'leave.view_all' not in current_user.get('permissions', []):
        filters['employee_id'] = current_user['employee_id']
    
    result = leave_service.get_leave_applications(organization_id, filters)
    return success_response(result['leaves'], meta=result['meta'])


@router.put("/{leave_id}/approve-reject")
async def approve_reject_leave(
    leave_id: str,
    data: ApproveRejectLeaveSchema,
    current_user: dict = Depends(get_current_user)
):
    """Approve or reject a leave application."""
    organization_id = current_user['organization_id']
    approver_id = current_user['employee_id']
    
    if not approver_id:
        return success_response(None, status_code=401)
    
    result = leave_service.approve_reject_leave(
        leave_id,
        organization_id,
        approver_id,
        data.action.value,
        data.model_dump()
    )
    return success_response(result, message=f"Leave {data.action.value}d successfully")


@router.get("/balance/{employee_id}")
async def get_leave_balance(
    employee_id: str,
    year: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get leave balance for an employee."""
    organization_id = current_user['organization_id']
    result = leave_service.get_leave_balance(employee_id, organization_id, year)
    return success_response(result)


@router.get("/balance")
async def get_my_leave_balance(
    year: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get leave balance for the current user."""
    employee_id = current_user['employee_id']
    organization_id = current_user['organization_id']
    
    if not employee_id:
        return success_response(None, status_code=401)
    
    result = leave_service.get_leave_balance(employee_id, organization_id, year)
    return success_response(result)


@router.put("/{leave_id}/cancel")
async def cancel_leave(
    leave_id: str,
    data: CancelLeaveSchema,
    current_user: dict = Depends(get_current_user)
):
    """Cancel a leave application."""
    organization_id = current_user['organization_id']
    employee_id = current_user['employee_id']
    
    if not employee_id:
        return success_response(None, status_code=401)
    
    result = leave_service.cancel_leave(
        leave_id,
        organization_id,
        employee_id,
        data.cancellation_reason
    )
    return success_response(result)


@router.get("/pending-approvals")
async def get_pending_approvals(
    current_user: dict = Depends(get_current_user)
):
    """Get pending leave approvals for the current manager."""
    approver_id = current_user['employee_id']
    organization_id = current_user['organization_id']
    
    if not approver_id:
        return success_response(None, status_code=401)
    
    result = leave_service.get_pending_approvals(approver_id, organization_id)
    return success_response(result)


@router.get("/calendar")
async def get_leave_calendar(
    department_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    employee_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get leave calendar (approved leaves)."""
    organization_id = current_user['organization_id']
    
    filters = {
        'department_id': department_id,
        'from_date': from_date,
        'to_date': to_date,
        'employee_id': employee_id
    }
    
    result = leave_service.get_leave_calendar(organization_id, filters)
    return success_response(result)
