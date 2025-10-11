"""
Employee Microservice
Handles employee-related operations in a microservices architecture
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import logging
import asyncio
from datetime import datetime, date
import json

from ..database import get_db
from ..models import Employee, Department, Position
from ..schemas import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from ..services.notification_service import NotificationService
from ..services.audit_service import AuditService
from ..utils.rate_limiter import RateLimiter
from ..utils.cache import CacheManager

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Employee Microservice",
    description="Microservice for employee management operations",
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

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]
)

# Dependencies
rate_limiter = RateLimiter()
cache_manager = CacheManager()
notification_service = NotificationService()
audit_service = AuditService()

@app.middleware("http")
async def rate_limit_middleware(request, call_next):
    """Rate limiting middleware"""
    client_ip = request.client.host
    if not rate_limiter.is_allowed(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    response = await call_next(request)
    return response

@app.middleware("http")
async def cache_middleware(request, call_next):
    """Cache middleware for GET requests"""
    if request.method == "GET":
        cache_key = f"{request.url.path}:{request.query_params}"
        cached_response = cache_manager.get(cache_key)
        if cached_response:
            return cached_response
    
    response = await call_next(request)
    
    if request.method == "GET" and response.status_code == 200:
        cache_manager.set(cache_key, response, ttl=300)  # 5 minutes
    
    return response

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "employee-service",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.get("/employees", response_model=List[EmployeeResponse])
async def get_employees(
    skip: int = 0,
    limit: int = 100,
    department: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get list of employees with filtering"""
    try:
        query = db.query(Employee)
        
        if department:
            query = query.filter(Employee.department == department)
        
        if is_active is not None:
            query = query.filter(Employee.is_active == is_active)
        
        employees = query.offset(skip).limit(limit).all()
        
        # Log audit trail
        await audit_service.log_action(
            action="get_employees",
            resource="employees",
            details={"filters": {"department": department, "is_active": is_active}}
        )
        
        return employees
        
    except Exception as e:
        logger.error(f"Error getting employees: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/employees/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: str, db: Session = Depends(get_db)):
    """Get specific employee by ID"""
    try:
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Log audit trail
        await audit_service.log_action(
            action="get_employee",
            resource="employee",
            resource_id=employee_id
        )
        
        return employee
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting employee {employee_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/employees", response_model=EmployeeResponse)
async def create_employee(
    employee: EmployeeCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create new employee"""
    try:
        # Create employee
        db_employee = Employee(**employee.dict())
        db.add(db_employee)
        db.commit()
        db.refresh(db_employee)
        
        # Send welcome notification
        background_tasks.add_task(
            notification_service.send_welcome_notification,
            db_employee.id,
            db_employee.email
        )
        
        # Log audit trail
        await audit_service.log_action(
            action="create_employee",
            resource="employee",
            resource_id=db_employee.id,
            details={"employee_data": employee.dict()}
        )
        
        return db_employee
        
    except Exception as e:
        logger.error(f"Error creating employee: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: str,
    employee_update: EmployeeUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Update employee information"""
    try:
        db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
        
        if not db_employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Store old values for audit
        old_values = {
            "first_name": db_employee.first_name,
            "last_name": db_employee.last_name,
            "email": db_employee.email,
            "department": db_employee.department,
            "position": db_employee.position,
            "salary": db_employee.salary
        }
        
        # Update employee
        update_data = employee_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_employee, field, value)
        
        db.commit()
        db.refresh(db_employee)
        
        # Send update notification
        background_tasks.add_task(
            notification_service.send_update_notification,
            db_employee.id,
            db_employee.email,
            update_data
        )
        
        # Log audit trail
        await audit_service.log_action(
            action="update_employee",
            resource="employee",
            resource_id=employee_id,
            details={
                "old_values": old_values,
                "new_values": update_data
            }
        )
        
        return db_employee
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating employee {employee_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/employees/{employee_id}")
async def delete_employee(
    employee_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Delete employee (soft delete)"""
    try:
        db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
        
        if not db_employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Soft delete
        db_employee.is_active = False
        db_employee.deleted_at = datetime.now()
        db.commit()
        
        # Send termination notification
        background_tasks.add_task(
            notification_service.send_termination_notification,
            db_employee.id,
            db_employee.email
        )
        
        # Log audit trail
        await audit_service.log_action(
            action="delete_employee",
            resource="employee",
            resource_id=employee_id
        )
        
        return {"message": "Employee deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting employee {employee_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/employees/{employee_id}/profile")
async def get_employee_profile(employee_id: str, db: Session = Depends(get_db)):
    """Get comprehensive employee profile"""
    try:
        employee = db.query(Employee).filter(Employee.id == employee_id).first()
        
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Get additional profile data
        profile_data = {
            "employee": employee,
            "department_info": db.query(Department).filter(
                Department.name == employee.department
            ).first(),
            "position_info": db.query(Position).filter(
                Position.title == employee.position
            ).first(),
            "recent_activities": await audit_service.get_employee_activities(employee_id),
            "performance_summary": await get_performance_summary(employee_id),
            "attendance_summary": await get_attendance_summary(employee_id)
        }
        
        return profile_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting employee profile {employee_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/employees/{employee_id}/bulk-update")
async def bulk_update_employees(
    employee_ids: List[str],
    update_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Bulk update multiple employees"""
    try:
        updated_employees = []
        
        for employee_id in employee_ids:
            db_employee = db.query(Employee).filter(Employee.id == employee_id).first()
            
            if db_employee:
                for field, value in update_data.items():
                    setattr(db_employee, field, value)
                updated_employees.append(employee_id)
        
        db.commit()
        
        # Send bulk update notifications
        background_tasks.add_task(
            notification_service.send_bulk_update_notification,
            updated_employees,
            update_data
        )
        
        # Log audit trail
        await audit_service.log_action(
            action="bulk_update_employees",
            resource="employees",
            details={
                "employee_ids": employee_ids,
                "update_data": update_data,
                "updated_count": len(updated_employees)
            }
        )
        
        return {
            "message": f"Updated {len(updated_employees)} employees",
            "updated_employees": updated_employees
        }
        
    except Exception as e:
        logger.error(f"Error bulk updating employees: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

async def get_performance_summary(employee_id: str) -> Dict[str, Any]:
    """Get performance summary for employee"""
    # This would typically call the performance microservice
    return {
        "current_rating": 4.2,
        "goals_completed": 8,
        "goals_total": 10,
        "last_review_date": "2024-01-15"
    }

async def get_attendance_summary(employee_id: str) -> Dict[str, Any]:
    """Get attendance summary for employee"""
    # This would typically call the attendance microservice
    return {
        "attendance_rate": 95.5,
        "days_present": 22,
        "days_absent": 1,
        "late_arrivals": 2
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
