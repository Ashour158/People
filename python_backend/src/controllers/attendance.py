"""
Attendance Management Controller (API Routes).
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query

from ..services.attendance import attendance_service
from ..validators.attendance import (
    CheckInSchema,
    CheckOutSchema,
    RegularizationRequestSchema
)
from ..middleware.auth import get_current_user
from ..utils.response import success_response

router = APIRouter(prefix="/api/v1/attendance", tags=["Attendance Management"])


@router.post("/check-in")
async def check_in(
    data: CheckInSchema,
    current_user: dict = Depends(get_current_user)
):
    """Check in for the day."""
    employee_id = current_user['employee_id']
    organization_id = current_user['organization_id']
    
    if not employee_id:
        return success_response(None, status_code=401)
    
    result = attendance_service.check_in(
        employee_id,
        organization_id,
        data.model_dump()
    )
    return success_response(result, message="Checked in successfully", status_code=201)


@router.post("/check-out")
async def check_out(
    data: CheckOutSchema,
    current_user: dict = Depends(get_current_user)
):
    """Check out for the day."""
    employee_id = current_user['employee_id']
    organization_id = current_user['organization_id']
    
    if not employee_id:
        return success_response(None, status_code=401)
    
    result = attendance_service.check_out(
        employee_id,
        organization_id,
        data.model_dump()
    )
    return success_response(result, message="Checked out successfully")


@router.get("/records")
async def get_attendance(
    employee_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    attendance_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get attendance records with filters."""
    organization_id = current_user['organization_id']
    
    filters = {
        'employee_id': employee_id,
        'from_date': from_date,
        'to_date': to_date,
        'attendance_status': attendance_status,
        'page': page,
        'limit': limit
    }
    
    # If not admin, only show own attendance
    if not employee_id and 'attendance.view_all' not in current_user.get('permissions', []):
        filters['employee_id'] = current_user['employee_id']
    
    result = attendance_service.get_attendance(organization_id, filters)
    return success_response(result['attendance'], meta=result['meta'])


@router.post("/regularization")
async def request_regularization(
    data: RegularizationRequestSchema,
    current_user: dict = Depends(get_current_user)
):
    """Request attendance regularization."""
    employee_id = current_user['employee_id']
    organization_id = current_user['organization_id']
    
    if not employee_id:
        return success_response(None, status_code=401)
    
    result = attendance_service.request_regularization(
        employee_id,
        organization_id,
        data.model_dump()
    )
    return success_response(result, message="Regularization request submitted", status_code=201)


@router.get("/summary")
async def get_attendance_summary(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get attendance summary for the current user."""
    employee_id = current_user['employee_id']
    organization_id = current_user['organization_id']
    
    if not employee_id:
        return success_response(None, status_code=401)
    
    result = attendance_service.get_attendance_summary(
        employee_id,
        organization_id,
        month,
        year
    )
    return success_response(result)


@router.get("/today")
async def get_today_attendance(
    current_user: dict = Depends(get_current_user)
):
    """Get today's attendance record for the current user."""
    employee_id = current_user['employee_id']
    organization_id = current_user['organization_id']
    
    if not employee_id:
        return success_response(None, status_code=401)
    
    result = attendance_service.get_today_attendance(employee_id, organization_id)
    return success_response(result)
