"""
Attendance Microservice
Handles attendance-related operations in a microservices architecture
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import logging
import asyncio
from datetime import datetime, date, timedelta
import json

from ..database import get_db
from ..models import Attendance, Employee
from ..schemas import AttendanceCreate, AttendanceUpdate, AttendanceResponse
from ..services.notification_service import NotificationService
from ..services.audit_service import AuditService
from ..utils.rate_limiter import RateLimiter
from ..utils.cache import CacheManager
from ..utils.geolocation import GeolocationService

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Attendance Microservice",
    description="Microservice for attendance management operations",
    version="1.0.0"
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependencies
rate_limiter = RateLimiter()
cache_manager = CacheManager()
notification_service = NotificationService()
audit_service = AuditService()
geolocation_service = GeolocationService()

@app.middleware("http")
async def rate_limit_middleware(request, call_next):
    """Rate limiting middleware"""
    client_ip = request.client.host
    if not rate_limiter.is_allowed(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    response = await call_next(request)
    return response

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "attendance-service",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.post("/attendance/check-in")
async def check_in(
    employee_id: str,
    location: Optional[Dict[str, float]] = None,
    device_info: Optional[Dict[str, str]] = None,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Employee check-in"""
    try:
        # Verify employee exists
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Check if already checked in today
        today = date.today()
        existing_attendance = db.query(Attendance).filter(
            Attendance.employee_id == employee_id,
            Attendance.date == today,
            Attendance.check_in_time.isnot(None)
        ).first()
        
        if existing_attendance:
            raise HTTPException(status_code=400, detail="Already checked in today")
        
        # Create attendance record
        attendance = Attendance(
            employee_id=employee_id,
            date=today,
            check_in_time=datetime.now().time(),
            location=json.dumps(location) if location else None,
            device_info=json.dumps(device_info) if device_info else None,
            is_present=True
        )
        
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        
        # Send check-in notification
        background_tasks.add_task(
            notification_service.send_check_in_notification,
            employee_id,
            employee.email
        )
        
        # Log audit trail
        await audit_service.log_action(
            action="check_in",
            resource="attendance",
            resource_id=attendance.id,
            details={
                "employee_id": employee_id,
                "location": location,
                "device_info": device_info
            }
        )
        
        return {
            "message": "Check-in successful",
            "attendance_id": attendance.id,
            "check_in_time": attendance.check_in_time,
            "location": location
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking in employee {employee_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/attendance/check-out")
async def check_out(
    employee_id: str,
    location: Optional[Dict[str, float]] = None,
    notes: Optional[str] = None,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Employee check-out"""
    try:
        # Find today's attendance record
        today = date.today()
        attendance = db.query(Attendance).filter(
            Attendance.employee_id == employee_id,
            Attendance.date == today,
            Attendance.check_in_time.isnot(None),
            Attendance.check_out_time.is_(None)
        ).first()
        
        if not attendance:
            raise HTTPException(status_code=400, detail="No check-in found for today")
        
        # Update attendance record
        attendance.check_out_time = datetime.now().time()
        attendance.location = json.dumps(location) if location else attendance.location
        attendance.notes = notes
        attendance.hours_worked = calculate_hours_worked(
            attendance.check_in_time,
            attendance.check_out_time
        )
        
        db.commit()
        
        # Send check-out notification
        background_tasks.add_task(
            notification_service.send_check_out_notification,
            employee_id,
            attendance.employee.email
        )
        
        # Log audit trail
        await audit_service.log_action(
            action="check_out",
            resource="attendance",
            resource_id=attendance.id,
            details={
                "employee_id": employee_id,
                "location": location,
                "notes": notes,
                "hours_worked": attendance.hours_worked
            }
        )
        
        return {
            "message": "Check-out successful",
            "attendance_id": attendance.id,
            "check_out_time": attendance.check_out_time,
            "hours_worked": attendance.hours_worked
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking out employee {employee_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/attendance/{employee_id}", response_model=List[AttendanceResponse])
async def get_employee_attendance(
    employee_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get attendance records for employee"""
    try:
        query = db.query(Attendance).filter(Attendance.employee_id == employee_id)
        
        if start_date:
            query = query.filter(Attendance.date >= start_date)
        
        if end_date:
            query = query.filter(Attendance.date <= end_date)
        
        attendance_records = query.order_by(Attendance.date.desc()).all()
        
        # Log audit trail
        await audit_service.log_action(
            action="get_attendance",
            resource="attendance",
            details={
                "employee_id": employee_id,
                "start_date": start_date,
                "end_date": end_date
            }
        )
        
        return attendance_records
        
    except Exception as e:
        logger.error(f"Error getting attendance for employee {employee_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/attendance/summary/{employee_id}")
async def get_attendance_summary(
    employee_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get attendance summary for employee"""
    try:
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()
        
        attendance_records = db.query(Attendance).filter(
            Attendance.employee_id == employee_id,
            Attendance.date >= start_date,
            Attendance.date <= end_date
        ).all()
        
        # Calculate summary statistics
        total_days = len(attendance_records)
        present_days = len([r for r in attendance_records if r.is_present])
        absent_days = total_days - present_days
        attendance_rate = (present_days / total_days * 100) if total_days > 0 else 0
        
        # Calculate total hours worked
        total_hours = sum([r.hours_worked or 0 for r in attendance_records])
        avg_hours_per_day = total_hours / total_days if total_days > 0 else 0
        
        # Late arrivals (assuming 9:00 AM start time)
        late_arrivals = len([
            r for r in attendance_records 
            if r.check_in_time and r.check_in_time > datetime.strptime("09:00", "%H:%M").time()
        ])
        
        return {
            "employee_id": employee_id,
            "period": {
                "start_date": start_date,
                "end_date": end_date
            },
            "summary": {
                "total_days": total_days,
                "present_days": present_days,
                "absent_days": absent_days,
                "attendance_rate": round(attendance_rate, 2),
                "total_hours_worked": round(total_hours, 2),
                "avg_hours_per_day": round(avg_hours_per_day, 2),
                "late_arrivals": late_arrivals
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting attendance summary for employee {employee_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/attendance/bulk-import")
async def bulk_import_attendance(
    attendance_data: List[Dict[str, Any]],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Bulk import attendance records"""
    try:
        imported_records = []
        
        for record_data in attendance_data:
            # Validate employee exists
            employee = db.query(Employee).filter(
                Employee.id == record_data.get("employee_id")
            ).first()
            
            if not employee:
                continue  # Skip invalid employee IDs
            
            # Create attendance record
            attendance = Attendance(
                employee_id=record_data["employee_id"],
                date=datetime.strptime(record_data["date"], "%Y-%m-%d").date(),
                check_in_time=datetime.strptime(record_data["check_in_time"], "%H:%M:%S").time() if record_data.get("check_in_time") else None,
                check_out_time=datetime.strptime(record_data["check_out_time"], "%H:%M:%S").time() if record_data.get("check_out_time") else None,
                hours_worked=record_data.get("hours_worked"),
                is_present=record_data.get("is_present", True),
                notes=record_data.get("notes")
            )
            
            db.add(attendance)
            imported_records.append(attendance)
        
        db.commit()
        
        # Send bulk import notification
        background_tasks.add_task(
            notification_service.send_bulk_import_notification,
            len(imported_records)
        )
        
        # Log audit trail
        await audit_service.log_action(
            action="bulk_import_attendance",
            resource="attendance",
            details={
                "total_records": len(attendance_data),
                "imported_records": len(imported_records)
            }
        )
        
        return {
            "message": f"Imported {len(imported_records)} attendance records",
            "imported_count": len(imported_records)
        }
        
    except Exception as e:
        logger.error(f"Error bulk importing attendance: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/attendance/reports/department")
async def get_department_attendance_report(
    department: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get department attendance report"""
    try:
        if not start_date:
            start_date = date.today() - timedelta(days=30)
        if not end_date:
            end_date = date.today()
        
        # Get employees in department
        employees = db.query(Employee).filter(
            Employee.department == department,
            Employee.is_active == True
        ).all()
        
        employee_ids = [emp.id for emp in employees]
        
        # Get attendance records
        attendance_records = db.query(Attendance).filter(
            Attendance.employee_id.in_(employee_ids),
            Attendance.date >= start_date,
            Attendance.date <= end_date
        ).all()
        
        # Calculate department statistics
        total_employee_days = len(employee_ids) * (end_date - start_date).days
        total_present_days = len([r for r in attendance_records if r.is_present])
        department_attendance_rate = (total_present_days / total_employee_days * 100) if total_employee_days > 0 else 0
        
        # Employee-wise statistics
        employee_stats = []
        for employee in employees:
            emp_records = [r for r in attendance_records if r.employee_id == employee.id]
            emp_present_days = len([r for r in emp_records if r.is_present])
            emp_attendance_rate = (emp_present_days / len(emp_records) * 100) if emp_records else 0
            
            employee_stats.append({
                "employee_id": employee.id,
                "employee_name": f"{employee.first_name} {employee.last_name}",
                "attendance_rate": round(emp_attendance_rate, 2),
                "present_days": emp_present_days,
                "total_days": len(emp_records)
            })
        
        return {
            "department": department,
            "period": {
                "start_date": start_date,
                "end_date": end_date
            },
            "summary": {
                "total_employees": len(employee_ids),
                "department_attendance_rate": round(department_attendance_rate, 2),
                "total_present_days": total_present_days,
                "total_employee_days": total_employee_days
            },
            "employee_statistics": employee_stats
        }
        
    except Exception as e:
        logger.error(f"Error getting department attendance report: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

def calculate_hours_worked(check_in_time, check_out_time):
    """Calculate hours worked between check-in and check-out"""
    if not check_in_time or not check_out_time:
        return None
    
    check_in_datetime = datetime.combine(date.today(), check_in_time)
    check_out_datetime = datetime.combine(date.today(), check_out_time)
    
    # Handle overnight shifts
    if check_out_datetime < check_in_datetime:
        check_out_datetime += timedelta(days=1)
    
    hours_worked = (check_out_datetime - check_in_datetime).total_seconds() / 3600
    return round(hours_worked, 2)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
