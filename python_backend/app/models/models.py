"""
Database models for HR Management System
This file contains all SQLAlchemy models
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Float, Text, ForeignKey, Enum as SQLEnum, Date, Time, JSON, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.database import Base


# Enums
class RoleEnum(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    HR_MANAGER = "hr_manager"
    MANAGER = "manager"
    EMPLOYEE = "employee"


class EmploymentStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    TERMINATED = "terminated"
    RESIGNED = "resigned"


class EmploymentType(str, enum.Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERN = "intern"


class LeaveStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


# Organizations
class Organization(Base):
    __tablename__ = "organizations"
    
    organization_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_name = Column(String(255), nullable=False)
    organization_code = Column(String(50), unique=True, nullable=False)
    industry = Column(String(100))
    contact_email = Column(String(255))
    contact_phone = Column(String(20))
    address = Column(Text)
    website = Column(String(255))
    logo_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    companies = relationship("Company", back_populates="organization")
    users = relationship("User", back_populates="organization")


# Companies
class Company(Base):
    __tablename__ = "companies"
    
    company_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"))
    company_name = Column(String(255), nullable=False)
    company_code = Column(String(50), nullable=False)
    legal_name = Column(String(255))
    registration_number = Column(String(100))
    tax_id = Column(String(100))
    contact_email = Column(String(255))
    contact_phone = Column(String(20))
    address = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="companies")
    employees = relationship("Employee", back_populates="company")


# Users
class User(Base):
    __tablename__ = "users"
    
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(RoleEnum), default=RoleEnum.EMPLOYEE)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime(timezone=True))
    failed_login_attempts = Column(Integer, default=0)
    account_locked_until = Column(DateTime(timezone=True))
    password_reset_token = Column(String(255))
    password_reset_expires = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="users")
    employee = relationship("Employee", back_populates="user", uselist=False)


# Employees
class Employee(Base):
    __tablename__ = "employees"
    
    employee_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), unique=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"))
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.company_id"))
    employee_code = Column(String(50), nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    middle_name = Column(String(100))
    date_of_birth = Column(Date)
    gender = Column(String(20))
    marital_status = Column(String(20))
    nationality = Column(String(50))
    phone = Column(String(20))
    personal_email = Column(String(255))
    emergency_contact_name = Column(String(255))
    emergency_contact_phone = Column(String(20))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))
    profile_picture_url = Column(String(500))
    
    # Employment details
    hire_date = Column(Date)
    employment_type = Column(SQLEnum(EmploymentType), default=EmploymentType.FULL_TIME)
    employment_status = Column(SQLEnum(EmploymentStatus), default=EmploymentStatus.ACTIVE)
    termination_date = Column(Date)
    termination_reason = Column(Text)
    job_title = Column(String(255))
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.department_id"))
    manager_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    work_location = Column(String(255))
    
    # Metadata
    is_deleted = Column(Boolean, default=False)
    created_by = Column(UUID(as_uuid=True))
    modified_by = Column(UUID(as_uuid=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="employee")
    company = relationship("Company", back_populates="employees")
    department = relationship("Department", back_populates="employees")
    attendance_records = relationship("Attendance", back_populates="employee")
    leave_requests = relationship("LeaveRequest", back_populates="employee")


# Departments
class Department(Base):
    __tablename__ = "departments"
    
    department_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"))
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.company_id"))
    department_name = Column(String(255), nullable=False)
    department_code = Column(String(50), nullable=False)
    description = Column(Text)
    parent_department_id = Column(UUID(as_uuid=True), ForeignKey("departments.department_id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    employees = relationship("Employee", back_populates="department")


# Attendance
class Attendance(Base):
    __tablename__ = "attendance"
    
    attendance_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"))
    attendance_date = Column(Date, nullable=False, index=True)
    check_in_time = Column(DateTime(timezone=True))
    check_out_time = Column(DateTime(timezone=True))
    work_hours = Column(Float)
    overtime_hours = Column(Float)
    late_minutes = Column(Integer, default=0)
    early_leave_minutes = Column(Integer, default=0)
    work_type = Column(String(50), default="office")  # office, remote, client_site, field_work
    
    # Location tracking
    check_in_latitude = Column(Float)
    check_in_longitude = Column(Float)
    check_in_location = Column(String(255))
    check_out_latitude = Column(Float)
    check_out_longitude = Column(Float)
    check_out_location = Column(String(255))
    
    # Device info
    ip_address = Column(String(45))
    device = Column(String(255))
    
    # Notes
    notes = Column(Text)
    status = Column(String(50), default="present")  # present, absent, half_day, on_leave
    is_regularized = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    employee = relationship("Employee", back_populates="attendance_records")


# Leave Types
class LeaveType(Base):
    __tablename__ = "leave_types"
    
    leave_type_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"))
    leave_type_name = Column(String(100), nullable=False)
    leave_type_code = Column(String(50), nullable=False)
    description = Column(Text)
    days_per_year = Column(Float, nullable=False)
    is_paid = Column(Boolean, default=True)
    requires_approval = Column(Boolean, default=True)
    can_be_carried_forward = Column(Boolean, default=False)
    max_carry_forward_days = Column(Float, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())


# Leave Requests
class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    
    leave_request_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.organization_id"))
    leave_type_id = Column(UUID(as_uuid=True), ForeignKey("leave_types.leave_type_id"))
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_days = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(SQLEnum(LeaveStatus), default=LeaveStatus.PENDING)
    approver_id = Column(UUID(as_uuid=True), ForeignKey("employees.employee_id"))
    approved_date = Column(DateTime(timezone=True))
    approver_comments = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    employee = relationship("Employee", back_populates="leave_requests", foreign_keys=[employee_id])


# Add more models as needed for other modules
# This is a foundation that can be extended
