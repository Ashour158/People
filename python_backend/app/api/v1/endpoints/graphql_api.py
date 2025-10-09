"""
GraphQL API Implementation
Provides flexible query capabilities alongside REST API
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import strawberry
from strawberry.fastapi import GraphQLRouter
from typing import List, Optional
from datetime import datetime, date
import structlog

from app.db.database import get_db
from app.middleware.auth import AuthMiddleware
from app.models.models import Employee, User

logger = structlog.get_logger()


# ============= GraphQL Types =============

@strawberry.type
class EmployeeType:
    """Employee GraphQL type"""
    employee_id: str
    employee_code: str
    first_name: str
    last_name: str
    email: Optional[str]
    phone: Optional[str]
    date_of_birth: Optional[date]
    hire_date: date
    employment_type: str
    employment_status: str
    department: Optional[str]
    designation: Optional[str]
    
    @strawberry.field
    def full_name(self) -> str:
        """Computed field for full name"""
        return f"{self.first_name} {self.last_name}"


@strawberry.type
class UserType:
    """User GraphQL type"""
    user_id: str
    email: str
    role: str
    is_active: bool
    created_at: datetime


@strawberry.type
class AttendanceType:
    """Attendance GraphQL type"""
    attendance_id: str
    employee_id: str
    check_in_time: datetime
    check_out_time: Optional[datetime]
    work_hours: Optional[float]
    status: str
    date: date


@strawberry.type
class LeaveType:
    """Leave GraphQL type"""
    leave_id: str
    employee_id: str
    leave_type: str
    start_date: date
    end_date: date
    total_days: float
    status: str
    reason: Optional[str]


@strawberry.type
class GoalType:
    """Performance goal GraphQL type"""
    goal_id: str
    employee_id: str
    title: str
    description: str
    target_value: Optional[float]
    current_value: Optional[float]
    progress_percentage: float
    status: str
    start_date: date
    end_date: date


@strawberry.type
class PayrollType:
    """Payroll GraphQL type"""
    payroll_id: str
    employee_id: str
    pay_period_start: date
    pay_period_end: date
    gross_salary: float
    deductions: float
    net_salary: float
    payment_status: str


@strawberry.type
class OrganizationStatsType:
    """Organization statistics"""
    total_employees: int
    active_employees: int
    departments: int
    average_tenure_months: float
    gender_distribution: str  # JSON string
    age_distribution: str  # JSON string


@strawberry.type
class AttendanceStatsType:
    """Attendance statistics"""
    present_today: int
    absent_today: int
    on_leave_today: int
    attendance_rate: float
    average_work_hours: float


# ============= GraphQL Inputs =============

@strawberry.input
class EmployeeFilterInput:
    """Filter input for employee queries"""
    employment_status: Optional[str] = None
    employment_type: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    hire_date_from: Optional[date] = None
    hire_date_to: Optional[date] = None
    search: Optional[str] = None


@strawberry.input
class AttendanceFilterInput:
    """Filter input for attendance queries"""
    employee_id: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    status: Optional[str] = None


@strawberry.input
class LeaveFilterInput:
    """Filter input for leave queries"""
    employee_id: Optional[str] = None
    leave_type: Optional[str] = None
    status: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None


@strawberry.input
class EmployeeCreateInput:
    """Input for creating employee"""
    employee_code: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    hire_date: date
    employment_type: str
    employment_status: str = "active"


@strawberry.input
class EmployeeUpdateInput:
    """Input for updating employee"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    employment_status: Optional[str] = None


# ============= GraphQL Queries =============

@strawberry.type
class Query:
    """Root Query type"""
    
    @strawberry.field
    async def employees(
        self,
        filter: Optional[EmployeeFilterInput] = None,
        limit: int = 10,
        offset: int = 0
    ) -> List[EmployeeType]:
        """Query employees with optional filters"""
        # Mock data for demonstration
        employees = [
            EmployeeType(
                employee_id="emp1",
                employee_code="EMP001",
                first_name="John",
                last_name="Doe",
                email="john.doe@company.com",
                phone="+1234567890",
                date_of_birth=date(1990, 1, 15),
                hire_date=date(2020, 1, 1),
                employment_type="full_time",
                employment_status="active",
                department="Engineering",
                designation="Senior Developer"
            ),
            EmployeeType(
                employee_id="emp2",
                employee_code="EMP002",
                first_name="Jane",
                last_name="Smith",
                email="jane.smith@company.com",
                phone="+1234567891",
                date_of_birth=date(1992, 5, 20),
                hire_date=date(2021, 3, 15),
                employment_type="full_time",
                employment_status="active",
                department="Sales",
                designation="Sales Manager"
            )
        ]
        
        # Apply filters if provided
        if filter:
            if filter.employment_status:
                employees = [e for e in employees if e.employment_status == filter.employment_status]
            if filter.department:
                employees = [e for e in employees if e.department == filter.department]
            if filter.search:
                search = filter.search.lower()
                employees = [
                    e for e in employees 
                    if search in e.first_name.lower() or search in e.last_name.lower()
                ]
        
        return employees[offset:offset + limit]
    
    @strawberry.field
    async def employee(self, employee_id: str) -> Optional[EmployeeType]:
        """Get single employee by ID"""
        # Mock data
        return EmployeeType(
            employee_id=employee_id,
            employee_code="EMP001",
            first_name="John",
            last_name="Doe",
            email="john.doe@company.com",
            phone="+1234567890",
            date_of_birth=date(1990, 1, 15),
            hire_date=date(2020, 1, 1),
            employment_type="full_time",
            employment_status="active",
            department="Engineering",
            designation="Senior Developer"
        )
    
    @strawberry.field
    async def attendance(
        self,
        filter: Optional[AttendanceFilterInput] = None,
        limit: int = 10,
        offset: int = 0
    ) -> List[AttendanceType]:
        """Query attendance records"""
        # Mock data
        records = [
            AttendanceType(
                attendance_id="att1",
                employee_id="emp1",
                check_in_time=datetime(2024, 1, 15, 9, 0, 0),
                check_out_time=datetime(2024, 1, 15, 18, 0, 0),
                work_hours=9.0,
                status="present",
                date=date(2024, 1, 15)
            )
        ]
        
        if filter and filter.employee_id:
            records = [r for r in records if r.employee_id == filter.employee_id]
        
        return records[offset:offset + limit]
    
    @strawberry.field
    async def leaves(
        self,
        filter: Optional[LeaveFilterInput] = None,
        limit: int = 10,
        offset: int = 0
    ) -> List[LeaveType]:
        """Query leave requests"""
        # Mock data
        leaves = [
            LeaveType(
                leave_id="leave1",
                employee_id="emp1",
                leave_type="Annual Leave",
                start_date=date(2024, 2, 15),
                end_date=date(2024, 2, 19),
                total_days=5.0,
                status="approved",
                reason="Family vacation"
            )
        ]
        
        if filter:
            if filter.employee_id:
                leaves = [l for l in leaves if l.employee_id == filter.employee_id]
            if filter.status:
                leaves = [l for l in leaves if l.status == filter.status]
        
        return leaves[offset:offset + limit]
    
    @strawberry.field
    async def goals(
        self,
        employee_id: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[GoalType]:
        """Query performance goals"""
        # Mock data
        goals = [
            GoalType(
                goal_id="goal1",
                employee_id="emp1",
                title="Increase Sales by 20%",
                description="Achieve 20% growth in sales revenue",
                target_value=1000000.0,
                current_value=750000.0,
                progress_percentage=75.0,
                status="in_progress",
                start_date=date(2024, 1, 1),
                end_date=date(2024, 12, 31)
            )
        ]
        
        if employee_id:
            goals = [g for g in goals if g.employee_id == employee_id]
        if status:
            goals = [g for g in goals if g.status == status]
        
        return goals
    
    @strawberry.field
    async def organization_stats(self) -> OrganizationStatsType:
        """Get organization-wide statistics"""
        return OrganizationStatsType(
            total_employees=150,
            active_employees=145,
            departments=8,
            average_tenure_months=24.5,
            gender_distribution='{"male": 60, "female": 38, "other": 2}',
            age_distribution='{"20-30": 45, "31-40": 60, "41-50": 35, "51+": 10}'
        )
    
    @strawberry.field
    async def attendance_stats(self, date: Optional[date] = None) -> AttendanceStatsType:
        """Get attendance statistics for a date"""
        return AttendanceStatsType(
            present_today=120,
            absent_today=5,
            on_leave_today=10,
            attendance_rate=92.3,
            average_work_hours=8.5
        )


# ============= GraphQL Mutations =============

@strawberry.type
class Mutation:
    """Root Mutation type"""
    
    @strawberry.mutation
    async def create_employee(
        self,
        input: EmployeeCreateInput
    ) -> EmployeeType:
        """Create a new employee"""
        # In production, this would insert into database
        return EmployeeType(
            employee_id="new_emp_id",
            employee_code=input.employee_code,
            first_name=input.first_name,
            last_name=input.last_name,
            email=input.email,
            phone=input.phone,
            date_of_birth=input.date_of_birth,
            hire_date=input.hire_date,
            employment_type=input.employment_type,
            employment_status=input.employment_status,
            department=None,
            designation=None
        )
    
    @strawberry.mutation
    async def update_employee(
        self,
        employee_id: str,
        input: EmployeeUpdateInput
    ) -> EmployeeType:
        """Update an existing employee"""
        # In production, this would update database
        return EmployeeType(
            employee_id=employee_id,
            employee_code="EMP001",
            first_name=input.first_name or "John",
            last_name=input.last_name or "Doe",
            email=input.email or "john.doe@company.com",
            phone=input.phone,
            date_of_birth=date(1990, 1, 15),
            hire_date=date(2020, 1, 1),
            employment_type="full_time",
            employment_status=input.employment_status or "active",
            department="Engineering",
            designation="Senior Developer"
        )
    
    @strawberry.mutation
    async def delete_employee(self, employee_id: str) -> bool:
        """Soft delete an employee"""
        # In production, this would soft delete in database
        logger.info(f"Employee {employee_id} deleted")
        return True


# ============= GraphQL Schema =============

schema = strawberry.Schema(query=Query, mutation=Mutation)

# Create GraphQL router
graphql_router = GraphQLRouter(
    schema,
    path="/graphql",
    graphql_ide="apollo-sandbox"  # or "graphiql"
)


# ============= FastAPI Router for GraphQL =============

router = APIRouter(prefix="/graphql", tags=["GraphQL"])

@router.get("/schema")
async def get_graphql_schema():
    """Get GraphQL schema definition"""
    return {
        "schema": str(schema),
        "endpoint": "/api/v1/graphql",
        "ide": "apollo-sandbox"
    }


@router.get("/playground")
async def graphql_playground():
    """GraphQL playground documentation"""
    return {
        "message": "GraphQL API is available",
        "endpoint": "/api/v1/graphql",
        "documentation": {
            "queries": [
                "employees(filter, limit, offset)",
                "employee(employee_id)",
                "attendance(filter, limit, offset)",
                "leaves(filter, limit, offset)",
                "goals(employee_id, status)",
                "organization_stats()",
                "attendance_stats(date)"
            ],
            "mutations": [
                "create_employee(input)",
                "update_employee(employee_id, input)",
                "delete_employee(employee_id)"
            ],
            "example_query": """
query GetEmployees {
  employees(limit: 10, offset: 0) {
    employee_id
    full_name
    email
    department
    employment_status
  }
}
            """,
            "example_mutation": """
mutation CreateEmployee {
  create_employee(input: {
    employee_code: "EMP003"
    first_name: "Alice"
    last_name: "Johnson"
    email: "alice@company.com"
    hire_date: "2024-01-15"
    employment_type: "full_time"
  }) {
    employee_id
    full_name
    email
  }
}
            """
        }
    }
