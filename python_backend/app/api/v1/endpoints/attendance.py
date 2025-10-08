"""Attendance API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import Optional
from datetime import datetime, date, timedelta
import structlog
import uuid

from app.db.database import get_db
from app.schemas.schemas import (
    AttendanceCheckIn, AttendanceCheckOut, AttendanceResponse,
    AttendanceRegularization, BaseResponse, PaginatedResponse
)
from app.models.models import Attendance, Employee
from app.middleware.auth import security, AuthMiddleware
from app.events.event_dispatcher import EventDispatcher, Events

router = APIRouter(prefix="/attendance", tags=["Attendance"])
logger = structlog.get_logger()


@router.post("/check-in", response_model=BaseResponse)
async def check_in(
    data: AttendanceCheckIn,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Check in attendance"""
    
    employee_id = current_user["employee_id"]
    organization_id = current_user["organization_id"]
    today = date.today()
    
    # Check if already checked in today
    result = await db.execute(
        select(Attendance).where(
            and_(
                Attendance.employee_id == employee_id,
                Attendance.attendance_date == today
            )
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing and existing.check_in_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already checked in today"
        )
    
    try:
        # Create attendance record
        attendance = Attendance(
            attendance_id=uuid.uuid4(),
            employee_id=employee_id,
            organization_id=organization_id,
            attendance_date=today,
            check_in_time=datetime.now(),
            check_in_latitude=data.latitude,
            check_in_longitude=data.longitude,
            check_in_location=data.location,
            work_type=data.work_type,
            notes=data.notes,
            status="present"
        )
        db.add(attendance)
        
        await db.commit()
        
        await EventDispatcher.dispatch(Events.ATTENDANCE_CHECK_IN, {
            "employee_id": str(employee_id),
            "attendance_id": str(attendance.attendance_id),
            "check_in_time": attendance.check_in_time.isoformat()
        })
        
        logger.info(f"Check-in recorded for employee: {employee_id}")
        
        return BaseResponse(
            success=True,
            message="Checked in successfully"
        )
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Check-in error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record check-in"
        )


@router.post("/check-out", response_model=BaseResponse)
async def check_out(
    data: AttendanceCheckOut,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Check out attendance"""
    
    employee_id = current_user["employee_id"]
    
    # Get attendance record
    result = await db.execute(
        select(Attendance).where(
            and_(
                Attendance.attendance_id == data.attendance_id,
                Attendance.employee_id == employee_id
            )
        )
    )
    attendance = result.scalar_one_or_none()
    
    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found"
        )
    
    if attendance.check_out_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already checked out"
        )
    
    try:
        # Update attendance record
        attendance.check_out_time = datetime.now()
        attendance.check_out_latitude = data.latitude
        attendance.check_out_longitude = data.longitude
        attendance.check_out_location = data.location
        
        if data.notes:
            attendance.notes = (attendance.notes or "") + f"\nCheckout: {data.notes}"
        
        # Calculate work hours
        if attendance.check_in_time:
            duration = attendance.check_out_time - attendance.check_in_time
            attendance.work_hours = duration.total_seconds() / 3600
            
            # Calculate overtime (assuming 8 hour work day)
            if attendance.work_hours > 8:
                attendance.overtime_hours = attendance.work_hours - 8
        
        await db.commit()
        
        await EventDispatcher.dispatch(Events.ATTENDANCE_CHECK_OUT, {
            "employee_id": str(employee_id),
            "attendance_id": str(attendance.attendance_id),
            "check_out_time": attendance.check_out_time.isoformat(),
            "work_hours": attendance.work_hours
        })
        
        logger.info(f"Check-out recorded for employee: {employee_id}")
        
        return BaseResponse(
            success=True,
            message=f"Checked out successfully. Total hours: {attendance.work_hours:.2f}"
        )
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Check-out error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record check-out"
        )


@router.get("", response_model=PaginatedResponse)
async def list_attendance(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    employee_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """List attendance records"""
    
    organization_id = current_user["organization_id"]
    
    # Default date range: current month
    if not start_date:
        start_date = date.today().replace(day=1)
    if not end_date:
        end_date = date.today()
    
    # Build query
    query = select(Attendance).where(
        and_(
            Attendance.organization_id == organization_id,
            Attendance.attendance_date >= start_date,
            Attendance.attendance_date <= end_date
        )
    )
    
    # Filter by employee if not viewing own records
    if employee_id:
        query = query.where(Attendance.employee_id == employee_id)
    else:
        # Non-admins can only view their own records
        if current_user["role"] not in ["admin", "hr_manager"]:
            query = query.where(Attendance.employee_id == current_user["employee_id"])
    
    # Get total count
    count_query = query.with_only_columns(func.count())
    total = (await db.execute(count_query)).scalar()
    
    # Apply pagination
    offset = (page - 1) * limit
    query = query.order_by(Attendance.attendance_date.desc()).offset(offset).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    records = result.scalars().all()
    
    # Convert to dict
    attendance_data = [
        {
            "attendance_id": str(rec.attendance_id),
            "employee_id": str(rec.employee_id),
            "attendance_date": str(rec.attendance_date),
            "check_in_time": rec.check_in_time.isoformat() if rec.check_in_time else None,
            "check_out_time": rec.check_out_time.isoformat() if rec.check_out_time else None,
            "work_hours": rec.work_hours,
            "overtime_hours": rec.overtime_hours,
            "status": rec.status,
            "work_type": rec.work_type,
        }
        for rec in records
    ]
    
    return PaginatedResponse(
        success=True,
        data=attendance_data,
        pagination={
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    )


@router.post("/regularization", response_model=BaseResponse)
async def request_regularization(
    data: AttendanceRegularization,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Request attendance regularization"""
    
    employee_id = current_user["employee_id"]
    organization_id = current_user["organization_id"]
    
    # Check if attendance exists for this date
    result = await db.execute(
        select(Attendance).where(
            and_(
                Attendance.employee_id == employee_id,
                Attendance.attendance_date == data.attendance_date
            )
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing and existing.is_regularized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance already regularized"
        )
    
    try:
        if existing:
            # Update existing record
            existing.check_in_time = data.requested_check_in
            existing.check_out_time = data.requested_check_out
            existing.is_regularized = True
            existing.notes = (existing.notes or "") + f"\nRegularization: {data.reason}"
            
            # Recalculate work hours
            duration = data.requested_check_out - data.requested_check_in
            existing.work_hours = duration.total_seconds() / 3600
        else:
            # Create new record
            attendance = Attendance(
                attendance_id=uuid.uuid4(),
                employee_id=employee_id,
                organization_id=organization_id,
                attendance_date=data.attendance_date,
                check_in_time=data.requested_check_in,
                check_out_time=data.requested_check_out,
                is_regularized=True,
                notes=f"Regularization: {data.reason}",
                status="present"
            )
            
            # Calculate work hours
            duration = data.requested_check_out - data.requested_check_in
            attendance.work_hours = duration.total_seconds() / 3600
            
            db.add(attendance)
        
        await db.commit()
        
        await EventDispatcher.dispatch(Events.ATTENDANCE_REGULARIZATION, {
            "employee_id": str(employee_id),
            "attendance_date": str(data.attendance_date)
        })
        
        logger.info(f"Regularization requested for employee: {employee_id}")
        
        return BaseResponse(
            success=True,
            message="Regularization request submitted successfully"
        )
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Regularization error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit regularization request"
        )


@router.get("/summary", response_model=dict)
async def get_attendance_summary(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Get attendance summary for a month"""
    
    employee_id = current_user["employee_id"]
    
    # Default to current month
    if not month:
        month = date.today().month
    if not year:
        year = date.today().year
    
    # Calculate date range
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
    
    # Get attendance records
    result = await db.execute(
        select(Attendance).where(
            and_(
                Attendance.employee_id == employee_id,
                Attendance.attendance_date >= start_date,
                Attendance.attendance_date <= end_date
            )
        )
    )
    records = result.scalars().all()
    
    # Calculate summary
    total_days = (end_date - start_date).days + 1
    present_days = len([r for r in records if r.status == "present"])
    absent_days = total_days - present_days
    total_hours = sum(r.work_hours or 0 for r in records)
    total_overtime = sum(r.overtime_hours or 0 for r in records)
    late_days = len([r for r in records if r.late_minutes > 0])
    
    return {
        "success": True,
        "data": {
            "month": month,
            "year": year,
            "total_days": total_days,
            "present_days": present_days,
            "absent_days": absent_days,
            "total_hours": round(total_hours, 2),
            "total_overtime": round(total_overtime, 2),
            "late_days": late_days,
            "average_hours_per_day": round(total_hours / present_days, 2) if present_days > 0 else 0
        }
    }
