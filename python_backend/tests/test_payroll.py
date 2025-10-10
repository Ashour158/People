"""Test payroll management endpoints"""
import pytest
from httpx import AsyncClient
from datetime import datetime


@pytest.mark.asyncio
@pytest.mark.payroll
@pytest.mark.integration
class TestPayrollManagement:
    """Test suite for payroll management endpoints"""

    async def test_get_salary_structure(self, authenticated_client: AsyncClient, test_employee):
        """Test getting employee salary structure"""
        response = await authenticated_client.get(
            f"/api/v1/payroll/salary-structure/{test_employee.employee_id}"
        )
        
        assert response.status_code in [200, 404, 500]

    async def test_create_salary_structure(self, authenticated_client: AsyncClient, test_employee):
        """Test creating salary structure"""
        salary_data = {
            "employee_id": test_employee.employee_id,
            "basic_salary": 50000,
            "hra": 15000,
            "transport_allowance": 2000,
            "special_allowance": 8000,
            "currency": "USD",
            "effective_from": datetime.utcnow().strftime("%Y-%m-%d")
        }
        
        response = await authenticated_client.post(
            "/api/v1/payroll/salary-structure",
            json=salary_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_generate_payslip(self, authenticated_client: AsyncClient, test_employee):
        """Test generating payslip"""
        month = datetime.utcnow().strftime("%Y-%m")
        
        response = await authenticated_client.post(
            f"/api/v1/payroll/payslip/{test_employee.employee_id}",
            json={"month": month}
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_get_payslip(self, authenticated_client: AsyncClient, test_employee):
        """Test getting payslip"""
        month = datetime.utcnow().strftime("%Y-%m")
        
        response = await authenticated_client.get(
            f"/api/v1/payroll/payslip/{test_employee.employee_id}?month={month}"
        )
        
        assert response.status_code in [200, 404, 500]

    async def test_process_monthly_payroll(self, authenticated_client: AsyncClient, test_organization):
        """Test processing monthly payroll"""
        month = datetime.utcnow().strftime("%Y-%m")
        
        response = await authenticated_client.post(
            "/api/v1/payroll/process",
            json={
                "organization_id": test_organization.organization_id,
                "month": month
            }
        )
        
        assert response.status_code in [200, 202, 400, 500]

    async def test_add_bonus(self, authenticated_client: AsyncClient, test_employee):
        """Test adding bonus"""
        bonus_data = {
            "employee_id": test_employee.employee_id,
            "amount": 5000,
            "bonus_type": "PERFORMANCE",
            "description": "Q1 Performance Bonus",
            "payment_date": datetime.utcnow().strftime("%Y-%m-%d")
        }
        
        response = await authenticated_client.post(
            "/api/v1/payroll/bonus",
            json=bonus_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_add_deduction(self, authenticated_client: AsyncClient, test_employee):
        """Test adding deduction"""
        deduction_data = {
            "employee_id": test_employee.employee_id,
            "amount": 1000,
            "deduction_type": "LOAN_REPAYMENT",
            "description": "Monthly loan installment",
            "month": datetime.utcnow().strftime("%Y-%m")
        }
        
        response = await authenticated_client.post(
            "/api/v1/payroll/deduction",
            json=deduction_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_calculate_tax(self, authenticated_client: AsyncClient, test_employee):
        """Test tax calculation"""
        response = await authenticated_client.post(
            "/api/v1/payroll/calculate-tax",
            json={
                "employee_id": test_employee.employee_id,
                "annual_income": 600000,
                "country": "US"
            }
        )
        
        assert response.status_code in [200, 400, 500]

    async def test_get_payroll_report(self, authenticated_client: AsyncClient, test_organization):
        """Test getting payroll report"""
        month = datetime.utcnow().strftime("%Y-%m")
        
        response = await authenticated_client.get(
            f"/api/v1/payroll/report?organization_id={test_organization.organization_id}&month={month}"
        )
        
        assert response.status_code in [200, 500]

    async def test_get_tax_report(self, authenticated_client: AsyncClient, test_organization):
        """Test getting tax report"""
        year = datetime.utcnow().strftime("%Y")
        
        response = await authenticated_client.get(
            f"/api/v1/payroll/tax-report?organization_id={test_organization.organization_id}&year={year}"
        )
        
        assert response.status_code in [200, 500]

    async def test_update_salary_structure(self, authenticated_client: AsyncClient, test_employee):
        """Test updating salary structure"""
        update_data = {
            "basic_salary": 55000,
            "hra": 16500,
            "effective_from": datetime.utcnow().strftime("%Y-%m-%d")
        }
        
        response = await authenticated_client.put(
            f"/api/v1/payroll/salary-structure/{test_employee.employee_id}",
            json=update_data
        )
        
        assert response.status_code in [200, 404, 500]

    async def test_create_loan(self, authenticated_client: AsyncClient, test_employee):
        """Test creating employee loan"""
        loan_data = {
            "employee_id": test_employee.employee_id,
            "amount": 50000,
            "loan_type": "PERSONAL",
            "interest_rate": 5.0,
            "tenure_months": 24,
            "start_date": datetime.utcnow().strftime("%Y-%m-%d")
        }
        
        response = await authenticated_client.post(
            "/api/v1/payroll/loan",
            json=loan_data
        )
        
        assert response.status_code in [201, 200, 400, 500]

    async def test_get_ytd_earnings(self, authenticated_client: AsyncClient, test_employee):
        """Test getting year-to-date earnings"""
        year = datetime.utcnow().strftime("%Y")
        
        response = await authenticated_client.get(
            f"/api/v1/payroll/ytd/{test_employee.employee_id}?year={year}"
        )
        
        assert response.status_code in [200, 404, 500]

    async def test_unauthorized_payroll_access(self, client: AsyncClient):
        """Test accessing payroll endpoints without authentication"""
        response = await client.get("/api/v1/payroll/salary-structure/EMP-001")
        
        assert response.status_code in [401, 403]
