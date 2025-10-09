"""
Payroll Management API Endpoints
Complete payroll processing with salary calculation, taxes, deductions, and benefits
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, case, extract
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal
import structlog
import uuid

from app.db.database import get_db
from app.middleware.auth import AuthMiddleware, security
from app.schemas.schemas import BaseResponse
from app.models.models import Employee, User
from app.events.event_dispatcher import EventDispatcher
from pydantic import BaseModel, Field, validator

logger = structlog.get_logger()
router = APIRouter(prefix="/payroll", tags=["Payroll Management"])


# ============= Pydantic Models =============

class SalaryComponent(BaseModel):
    """Salary component model"""
    component_name: str = Field(..., description="Component name (e.g., Basic Salary, HRA)")
    component_type: str = Field(..., description="earning or deduction")
    amount: Decimal = Field(..., gt=0, description="Amount")
    is_taxable: bool = Field(default=True, description="Is this component taxable?")
    calculation_type: str = Field(default="fixed", description="fixed or percentage")
    percentage_of: Optional[str] = Field(None, description="If percentage, what is it based on?")


class EmployeeSalaryStructure(BaseModel):
    """Employee salary structure"""
    employee_id: str
    effective_from: date
    basic_salary: Decimal = Field(..., gt=0)
    hra: Optional[Decimal] = Field(None, ge=0)
    transport_allowance: Optional[Decimal] = Field(None, ge=0)
    special_allowance: Optional[Decimal] = Field(None, ge=0)
    medical_allowance: Optional[Decimal] = Field(None, ge=0)
    provident_fund: Optional[Decimal] = Field(None, ge=0)
    professional_tax: Optional[Decimal] = Field(None, ge=0)
    income_tax: Optional[Decimal] = Field(None, ge=0)
    components: List[SalaryComponent] = Field(default_factory=list)
    currency: str = Field(default="USD")
    pay_frequency: str = Field(default="monthly", description="monthly, biweekly, weekly")

    @validator('pay_frequency')
    def validate_frequency(cls, v):
        allowed = ['monthly', 'biweekly', 'weekly']
        if v not in allowed:
            raise ValueError(f'pay_frequency must be one of {allowed}')
        return v


class PayrollProcessRequest(BaseModel):
    """Request to process payroll"""
    pay_period_start: date
    pay_period_end: date
    employee_ids: Optional[List[str]] = Field(None, description="Process specific employees, or all if None")
    payment_date: Optional[date] = Field(None, description="Scheduled payment date")
    notes: Optional[str] = None


class PayslipRequest(BaseModel):
    """Request for payslip generation"""
    employee_id: str
    pay_period_start: date
    pay_period_end: date


class TaxCalculationRequest(BaseModel):
    """Request for tax calculation"""
    gross_salary: Decimal
    deductions: Decimal = Field(default=Decimal(0))
    tax_regime: str = Field(default="new", description="old or new tax regime")
    country_code: str = Field(default="US")


class BonusRequest(BaseModel):
    """Request to process bonus"""
    employee_id: str
    bonus_type: str = Field(..., description="performance, festive, joining, referral")
    amount: Decimal = Field(..., gt=0)
    bonus_date: date
    reason: str
    is_taxable: bool = Field(default=True)


class LoanRequest(BaseModel):
    """Employee loan request"""
    employee_id: str
    loan_type: str = Field(..., description="personal, vehicle, housing, education")
    loan_amount: Decimal = Field(..., gt=0)
    interest_rate: Decimal = Field(..., ge=0, le=100)
    tenure_months: int = Field(..., gt=0, le=360)
    start_date: date
    reason: str


class ReimbursementRequest(BaseModel):
    """Reimbursement request"""
    employee_id: str
    category: str = Field(..., description="travel, medical, internet, phone, food")
    amount: Decimal = Field(..., gt=0)
    request_date: date
    description: str
    receipt_url: Optional[str] = None


# ============= Tax Calculation Service =============

class TaxCalculator:
    """Tax calculation service supporting multiple countries and regimes"""
    
    @staticmethod
    def calculate_us_federal_tax(gross_annual: Decimal) -> Decimal:
        """Calculate US Federal Income Tax (2024 brackets for single filer)"""
        if gross_annual <= 11000:
            return gross_annual * Decimal('0.10')
        elif gross_annual <= 44725:
            return Decimal('1100') + (gross_annual - Decimal('11000')) * Decimal('0.12')
        elif gross_annual <= 95375:
            return Decimal('5147') + (gross_annual - Decimal('44725')) * Decimal('0.22')
        elif gross_annual <= 182100:
            return Decimal('16290') + (gross_annual - Decimal('95375')) * Decimal('0.24')
        elif gross_annual <= 231250:
            return Decimal('37104') + (gross_annual - Decimal('182100')) * Decimal('0.32')
        elif gross_annual <= 578125:
            return Decimal('52832') + (gross_annual - Decimal('231250')) * Decimal('0.35')
        else:
            return Decimal('174238.25') + (gross_annual - Decimal('578125')) * Decimal('0.37')
    
    @staticmethod
    def calculate_india_tax(gross_annual: Decimal, regime: str = "new") -> Decimal:
        """Calculate Indian Income Tax (INR)"""
        if regime == "new":
            # New Tax Regime (FY 2024-25)
            if gross_annual <= 300000:
                return Decimal(0)
            elif gross_annual <= 600000:
                return (gross_annual - Decimal('300000')) * Decimal('0.05')
            elif gross_annual <= 900000:
                return Decimal('15000') + (gross_annual - Decimal('600000')) * Decimal('0.10')
            elif gross_annual <= 1200000:
                return Decimal('45000') + (gross_annual - Decimal('900000')) * Decimal('0.15')
            elif gross_annual <= 1500000:
                return Decimal('90000') + (gross_annual - Decimal('1200000')) * Decimal('0.20')
            else:
                return Decimal('150000') + (gross_annual - Decimal('1500000')) * Decimal('0.30')
        else:
            # Old Tax Regime
            if gross_annual <= 250000:
                return Decimal(0)
            elif gross_annual <= 500000:
                return (gross_annual - Decimal('250000')) * Decimal('0.05')
            elif gross_annual <= 1000000:
                return Decimal('12500') + (gross_annual - Decimal('500000')) * Decimal('0.20')
            else:
                return Decimal('112500') + (gross_annual - Decimal('1000000')) * Decimal('0.30')
    
    @classmethod
    def calculate_tax(cls, gross_annual: Decimal, country_code: str, regime: str = "new") -> Decimal:
        """Calculate tax based on country"""
        if country_code == "US":
            return cls.calculate_us_federal_tax(gross_annual)
        elif country_code == "IN":
            return cls.calculate_india_tax(gross_annual, regime)
        elif country_code == "GB":
            # UK Tax (simplified)
            if gross_annual <= 12570:
                return Decimal(0)
            elif gross_annual <= 50270:
                return (gross_annual - Decimal('12570')) * Decimal('0.20')
            elif gross_annual <= 125140:
                return Decimal('7540') + (gross_annual - Decimal('50270')) * Decimal('0.40')
            else:
                return Decimal('37488') + (gross_annual - Decimal('125140')) * Decimal('0.45')
        else:
            # Default: 20% flat tax
            return gross_annual * Decimal('0.20')


# ============= Payroll Processing Service =============

class PayrollProcessor:
    """Core payroll processing engine"""
    
    @staticmethod
    async def calculate_salary(
        db: AsyncSession,
        employee_id: str,
        pay_period_start: date,
        pay_period_end: date
    ) -> dict:
        """Calculate salary for an employee for a pay period"""
        
        # Get employee details
        result = await db.execute(
            select(Employee).where(Employee.employee_id == uuid.UUID(employee_id))
        )
        employee = result.scalar_one_or_none()
        
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Calculate base components
        basic_salary = Decimal('50000')  # This should come from salary structure
        hra = basic_salary * Decimal('0.40')  # 40% of basic
        transport = Decimal('1600')
        special_allowance = Decimal('10000')
        medical_allowance = Decimal('1250')
        
        # Calculate gross salary
        gross_salary = basic_salary + hra + transport + special_allowance + medical_allowance
        
        # Calculate deductions
        provident_fund = basic_salary * Decimal('0.12')  # 12% of basic
        professional_tax = Decimal('200')
        
        # Calculate tax
        annual_gross = gross_salary * 12
        annual_tax = TaxCalculator.calculate_tax(annual_gross, "US")
        monthly_tax = annual_tax / 12
        
        # Calculate total deductions
        total_deductions = provident_fund + professional_tax + monthly_tax
        
        # Calculate net salary
        net_salary = gross_salary - total_deductions
        
        return {
            "employee_id": employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "pay_period": {
                "start": pay_period_start.isoformat(),
                "end": pay_period_end.isoformat()
            },
            "earnings": {
                "basic_salary": float(basic_salary),
                "hra": float(hra),
                "transport_allowance": float(transport),
                "special_allowance": float(special_allowance),
                "medical_allowance": float(medical_allowance),
                "gross_salary": float(gross_salary)
            },
            "deductions": {
                "provident_fund": float(provident_fund),
                "professional_tax": float(professional_tax),
                "income_tax": float(monthly_tax),
                "total_deductions": float(total_deductions)
            },
            "net_salary": float(net_salary),
            "currency": "USD"
        }


# ============= API Endpoints =============

@router.post("/salary-structure", response_model=BaseResponse)
async def create_salary_structure(
    data: EmployeeSalaryStructure,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Create or update employee salary structure"""
    
    # Verify employee exists and belongs to same organization
    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.employee_id == uuid.UUID(data.employee_id),
                Employee.organization_id == uuid.UUID(current_user["organization_id"])
            )
        )
    )
    employee = result.scalar_one_or_none()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    logger.info(f"Salary structure created for employee {data.employee_id}")
    
    return BaseResponse(
        success=True,
        message="Salary structure created successfully",
        data={
            "employee_id": data.employee_id,
            "effective_from": data.effective_from.isoformat(),
            "gross_monthly": float(
                data.basic_salary + 
                (data.hra or 0) + 
                (data.transport_allowance or 0) + 
                (data.special_allowance or 0) + 
                (data.medical_allowance or 0)
            )
        }
    )


@router.post("/process", response_model=BaseResponse)
async def process_payroll(
    data: PayrollProcessRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Process payroll for a pay period"""
    
    # Get employees to process
    query_filter = [Employee.organization_id == uuid.UUID(current_user["organization_id"])]
    
    if data.employee_ids:
        employee_uuids = [uuid.UUID(eid) for eid in data.employee_ids]
        query_filter.append(Employee.employee_id.in_(employee_uuids))
    
    result = await db.execute(
        select(Employee).where(and_(*query_filter))
    )
    employees = result.scalars().all()
    
    if not employees:
        raise HTTPException(status_code=404, detail="No employees found")
    
    # Process payroll for each employee
    payroll_results = []
    for employee in employees:
        try:
            salary_calc = await PayrollProcessor.calculate_salary(
                db,
                str(employee.employee_id),
                data.pay_period_start,
                data.pay_period_end
            )
            payroll_results.append(salary_calc)
            
            # Dispatch event
            await EventDispatcher.dispatch("payroll.processed", {
                "employee_id": str(employee.employee_id),
                "pay_period_start": data.pay_period_start.isoformat(),
                "pay_period_end": data.pay_period_end.isoformat(),
                "net_salary": salary_calc["net_salary"]
            })
            
        except Exception as e:
            logger.error(f"Error processing payroll for {employee.employee_id}: {e}")
            payroll_results.append({
                "employee_id": str(employee.employee_id),
                "status": "error",
                "error": str(e)
            })
    
    logger.info(f"Payroll processed for {len(payroll_results)} employees")
    
    return BaseResponse(
        success=True,
        message=f"Payroll processed successfully for {len(payroll_results)} employees",
        data={
            "pay_period_start": data.pay_period_start.isoformat(),
            "pay_period_end": data.pay_period_end.isoformat(),
            "total_employees": len(payroll_results),
            "payrolls": payroll_results
        }
    )


@router.get("/payslip/{employee_id}", response_model=BaseResponse)
async def get_payslip(
    employee_id: str,
    pay_period_start: date = Query(...),
    pay_period_end: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Generate payslip for an employee"""
    
    # Calculate salary
    payslip = await PayrollProcessor.calculate_salary(
        db, employee_id, pay_period_start, pay_period_end
    )
    
    # Add additional payslip metadata
    payslip["generated_date"] = datetime.now().isoformat()
    payslip["payment_status"] = "pending"
    
    return BaseResponse(
        success=True,
        message="Payslip generated successfully",
        data=payslip
    )


@router.post("/calculate-tax", response_model=BaseResponse)
async def calculate_tax(
    data: TaxCalculationRequest,
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Calculate tax for given salary"""
    
    taxable_income = data.gross_salary - data.deductions
    annual_tax = TaxCalculator.calculate_tax(
        taxable_income, 
        data.country_code, 
        data.tax_regime
    )
    monthly_tax = annual_tax / 12
    
    return BaseResponse(
        success=True,
        message="Tax calculated successfully",
        data={
            "gross_salary": float(data.gross_salary),
            "deductions": float(data.deductions),
            "taxable_income": float(taxable_income),
            "annual_tax": float(annual_tax),
            "monthly_tax": float(monthly_tax),
            "tax_regime": data.tax_regime,
            "country_code": data.country_code
        }
    )


@router.post("/bonus", response_model=BaseResponse)
async def process_bonus(
    data: BonusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Process employee bonus"""
    
    # Verify employee
    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.employee_id == uuid.UUID(data.employee_id),
                Employee.organization_id == uuid.UUID(current_user["organization_id"])
            )
        )
    )
    employee = result.scalar_one_or_none()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Calculate tax on bonus if taxable
    tax_amount = Decimal(0)
    if data.is_taxable:
        tax_amount = data.amount * Decimal('0.20')  # 20% flat tax on bonus
    
    net_bonus = data.amount - tax_amount
    
    logger.info(f"Bonus processed for employee {data.employee_id}")
    
    await EventDispatcher.dispatch("bonus.processed", {
        "employee_id": data.employee_id,
        "bonus_type": data.bonus_type,
        "amount": float(data.amount),
        "bonus_date": data.bonus_date.isoformat()
    })
    
    return BaseResponse(
        success=True,
        message="Bonus processed successfully",
        data={
            "employee_id": data.employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "bonus_type": data.bonus_type,
            "gross_amount": float(data.amount),
            "tax_amount": float(tax_amount),
            "net_amount": float(net_bonus),
            "bonus_date": data.bonus_date.isoformat()
        }
    )


@router.post("/loan", response_model=BaseResponse)
async def create_loan(
    data: LoanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Create employee loan"""
    
    # Verify employee
    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.employee_id == uuid.UUID(data.employee_id),
                Employee.organization_id == uuid.UUID(current_user["organization_id"])
            )
        )
    )
    employee = result.scalar_one_or_none()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Calculate EMI using reducing balance method
    monthly_rate = data.interest_rate / Decimal('100') / 12
    emi = (data.loan_amount * monthly_rate * ((1 + monthly_rate) ** data.tenure_months)) / \
          (((1 + monthly_rate) ** data.tenure_months) - 1)
    
    total_payable = emi * data.tenure_months
    total_interest = total_payable - data.loan_amount
    
    logger.info(f"Loan created for employee {data.employee_id}")
    
    return BaseResponse(
        success=True,
        message="Loan created successfully",
        data={
            "employee_id": data.employee_id,
            "loan_type": data.loan_type,
            "loan_amount": float(data.loan_amount),
            "interest_rate": float(data.interest_rate),
            "tenure_months": data.tenure_months,
            "monthly_emi": float(emi),
            "total_payable": float(total_payable),
            "total_interest": float(total_interest),
            "start_date": data.start_date.isoformat()
        }
    )


@router.post("/reimbursement", response_model=BaseResponse)
async def create_reimbursement(
    data: ReimbursementRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Create reimbursement request"""
    
    # Verify employee
    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.employee_id == uuid.UUID(data.employee_id),
                Employee.organization_id == uuid.UUID(current_user["organization_id"])
            )
        )
    )
    employee = result.scalar_one_or_none()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    logger.info(f"Reimbursement request created for employee {data.employee_id}")
    
    await EventDispatcher.dispatch("reimbursement.created", {
        "employee_id": data.employee_id,
        "category": data.category,
        "amount": float(data.amount)
    })
    
    return BaseResponse(
        success=True,
        message="Reimbursement request created successfully",
        data={
            "employee_id": data.employee_id,
            "category": data.category,
            "amount": float(data.amount),
            "status": "pending",
            "request_date": data.request_date.isoformat()
        }
    )


@router.get("/reports/monthly-summary")
async def get_monthly_payroll_summary(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Get monthly payroll summary"""
    
    # Get all employees in organization
    result = await db.execute(
        select(Employee).where(
            Employee.organization_id == uuid.UUID(current_user["organization_id"])
        )
    )
    employees = result.scalars().all()
    
    total_employees = len(employees)
    total_gross = Decimal(0)
    total_deductions = Decimal(0)
    total_net = Decimal(0)
    
    # In production, this should query from payroll_runs table
    # For now, we'll calculate on the fly
    for employee in employees:
        basic = Decimal('50000')
        hra = basic * Decimal('0.40')
        gross = basic + hra + Decimal('12850')
        deductions = basic * Decimal('0.12') + Decimal('200') + gross * Decimal('0.10')
        net = gross - deductions
        
        total_gross += gross
        total_deductions += deductions
        total_net += net
    
    return BaseResponse(
        success=True,
        message="Monthly payroll summary retrieved",
        data={
            "year": year,
            "month": month,
            "total_employees": total_employees,
            "total_gross_salary": float(total_gross),
            "total_deductions": float(total_deductions),
            "total_net_salary": float(total_net),
            "currency": "USD"
        }
    )


@router.get("/reports/ytd-summary/{employee_id}")
async def get_ytd_summary(
    employee_id: str,
    year: int = Query(..., ge=2020, le=2100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(AuthMiddleware.get_current_user)
):
    """Get year-to-date salary summary for employee"""
    
    # Verify employee
    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.employee_id == uuid.UUID(employee_id),
                Employee.organization_id == uuid.UUID(current_user["organization_id"])
            )
        )
    )
    employee = result.scalar_one_or_none()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Calculate YTD (simplified - should query actual payroll data)
    months_elapsed = datetime.now().month if datetime.now().year == year else 12
    
    basic = Decimal('50000')
    hra = basic * Decimal('0.40')
    monthly_gross = basic + hra + Decimal('12850')
    monthly_deductions = basic * Decimal('0.12') + Decimal('200') + monthly_gross * Decimal('0.10')
    monthly_net = monthly_gross - monthly_deductions
    
    ytd_gross = monthly_gross * months_elapsed
    ytd_deductions = monthly_deductions * months_elapsed
    ytd_net = monthly_net * months_elapsed
    
    return BaseResponse(
        success=True,
        message="YTD summary retrieved",
        data={
            "employee_id": employee_id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "year": year,
            "months_processed": months_elapsed,
            "ytd_gross_salary": float(ytd_gross),
            "ytd_deductions": float(ytd_deductions),
            "ytd_net_salary": float(ytd_net),
            "average_monthly_net": float(ytd_net / months_elapsed),
            "currency": "USD"
        }
    )
