"""Employee API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import Optional
import structlog

from app.db.database import get_db
from app.schemas.schemas import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse,
    BaseResponse, PaginatedResponse
)
from app.models.models import Employee, User
from app.middleware.auth import security, AuthMiddleware
from app.core.security import hash_password
from app.events.event_dispatcher import EventDispatcher, Events
from datetime import datetime
import uuid

router = APIRouter(prefix="/employees", tags=["Employees"])
logger = structlog.get_logger()


@router.post("", response_model=BaseResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    data: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Create new employee"""
    
    organization_id = current_user["organization_id"]
    
    # Check if email already exists
    result = await db.execute(
        select(User).where(
            and_(
                User.email == data.email,
                User.organization_id == organization_id
            )
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    
    try:
        # Create user
        user = User(
            user_id=uuid.uuid4(),
            organization_id=organization_id,
            email=data.email,
            password_hash=hash_password("TempPass@123"),  # Temporary password
            role="employee",
            is_active=True
        )
        db.add(user)
        
        # Create employee
        employee = Employee(
            employee_id=uuid.uuid4(),
            user_id=user.user_id,
            organization_id=organization_id,
            company_id=current_user.get("company_id"),
            employee_code=data.employee_code,
            first_name=data.first_name,
            last_name=data.last_name,
            middle_name=data.middle_name,
            phone=data.phone,
            date_of_birth=data.date_of_birth,
            gender=data.gender,
            marital_status=data.marital_status,
            nationality=data.nationality,
            address=data.address,
            city=data.city,
            state=data.state,
            country=data.country,
            postal_code=data.postal_code,
            hire_date=data.hire_date or datetime.now().date(),
            job_title=data.job_title,
            department_id=data.department_id,
            manager_id=data.manager_id,
            employment_type=data.employment_type,
            employment_status="active",
            work_location=data.work_location,
            created_by=current_user["user_id"]
        )
        db.add(employee)
        
        await db.commit()
        
        await EventDispatcher.dispatch(Events.EMPLOYEE_CREATED, {
            "employee_id": str(employee.employee_id),
            "email": data.email
        })
        
        logger.info(f"Employee created: {employee.employee_code}")
        
        return BaseResponse(
            success=True,
            message="Employee created successfully"
        )
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Employee creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create employee"
        )


@router.get("", response_model=PaginatedResponse)
async def list_employees(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    department_id: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """List employees with pagination and filters"""
    
    organization_id = current_user["organization_id"]
    
    # Build query
    query = select(Employee).where(
        and_(
            Employee.organization_id == organization_id,
            Employee.is_deleted == False
        )
    )
    
    # Apply filters
    if search:
        query = query.where(
            or_(
                Employee.first_name.ilike(f"%{search}%"),
                Employee.last_name.ilike(f"%{search}%"),
                Employee.employee_code.ilike(f"%{search}%"),
                Employee.email.ilike(f"%{search}%")
            )
        )
    
    if department_id:
        query = query.where(Employee.department_id == department_id)
    
    if status:
        query = query.where(Employee.employment_status == status)
    
    # Get total count
    count_query = query.with_only_columns(func.count())
    total = (await db.execute(count_query)).scalar()
    
    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    employees = result.scalars().all()
    
    # Convert to dict
    employees_data = [
        {
            "employee_id": str(emp.employee_id),
            "employee_code": emp.employee_code,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "email": emp.user.email if emp.user else None,
            "phone": emp.phone,
            "job_title": emp.job_title,
            "department_id": str(emp.department_id) if emp.department_id else None,
            "employment_status": emp.employment_status,
            "employment_type": emp.employment_type,
            "hire_date": str(emp.hire_date) if emp.hire_date else None,
        }
        for emp in employees
    ]
    
    return PaginatedResponse(
        success=True,
        data=employees_data,
        pagination={
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    )


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Get employee by ID"""
    
    result = await db.execute(
        select(Employee, User).join(User).where(
            and_(
                Employee.employee_id == employee_id,
                Employee.organization_id == current_user["organization_id"],
                Employee.is_deleted == False
            )
        )
    )
    
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    employee, user = row
    
    return EmployeeResponse(
        employee_id=employee.employee_id,
        employee_code=employee.employee_code,
        first_name=employee.first_name,
        last_name=employee.last_name,
        middle_name=employee.middle_name,
        email=user.email,
        phone=employee.phone,
        job_title=employee.job_title,
        department_id=employee.department_id,
        employment_status=employee.employment_status,
        employment_type=employee.employment_type,
        hire_date=employee.hire_date,
        profile_picture_url=employee.profile_picture_url,
        created_at=employee.created_at
    )


@router.put("/{employee_id}", response_model=BaseResponse)
async def update_employee(
    employee_id: str,
    data: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Update employee"""
    
    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.employee_id == employee_id,
                Employee.organization_id == current_user["organization_id"],
                Employee.is_deleted == False
            )
        )
    )
    
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Update fields
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(employee, key, value)
    
    employee.modified_by = current_user["user_id"]
    employee.modified_at = datetime.utcnow()
    
    await db.commit()
    
    await EventDispatcher.dispatch(Events.EMPLOYEE_UPDATED, {
        "employee_id": str(employee.employee_id)
    })
    
    logger.info(f"Employee updated: {employee.employee_code}")
    
    return BaseResponse(
        success=True,
        message="Employee updated successfully"
    )


@router.delete("/{employee_id}", response_model=BaseResponse)
async def delete_employee(
    employee_id: str,
    db: AsyncSession = Depends(get_db),
    credentials = Depends(security),
    current_user = Depends(AuthMiddleware.get_current_user)
):
    """Soft delete employee"""
    
    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.employee_id == employee_id,
                Employee.organization_id == current_user["organization_id"],
                Employee.is_deleted == False
            )
        )
    )
    
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Soft delete
    employee.is_deleted = True
    employee.modified_by = current_user["user_id"]
    employee.modified_at = datetime.utcnow()
    
    await db.commit()
    
    await EventDispatcher.dispatch(Events.EMPLOYEE_DELETED, {
        "employee_id": str(employee.employee_id)
    })
    
    logger.info(f"Employee deleted: {employee.employee_code}")
    
    return BaseResponse(
        success=True,
        message="Employee deleted successfully"
    )
