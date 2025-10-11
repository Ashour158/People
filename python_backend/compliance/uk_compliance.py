"""
UK Compliance Implementation
Handles UK-specific compliance requirements
"""

from typing import Dict, Any, List
from datetime import date, datetime
from decimal import Decimal
import logging

from .base_compliance import BaseCompliance

logger = logging.getLogger(__name__)


class UKCompliance(BaseCompliance):
    """
    UK compliance implementation
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("UK", config)
        self.currency = "GBP"
        self.personal_allowance = Decimal('12570')  # 2024/25 tax year
        self.basic_rate_threshold = Decimal('50270')
        self.higher_rate_threshold = Decimal('125140')
        self.national_insurance_rate = Decimal('0.12')  # 12%
        self.national_insurance_threshold = Decimal('12570')
        self.national_insurance_upper_threshold = Decimal('50270')
        
    def calculate_income_tax(self, gross_salary: Decimal, employee_data: Dict[str, Any]) -> Decimal:
        """
        Calculate UK income tax
        """
        # Apply personal allowance
        taxable_income = max(Decimal('0'), gross_salary - self.personal_allowance)
        
        if taxable_income <= 0:
            return Decimal('0')
        
        tax = Decimal('0')
        
        # Basic rate (20%)
        if taxable_income > self.basic_rate_threshold:
            tax += self.basic_rate_threshold * Decimal('0.20')
            remaining_income = taxable_income - self.basic_rate_threshold
        else:
            tax += taxable_income * Decimal('0.20')
            remaining_income = Decimal('0')
        
        # Higher rate (40%)
        if remaining_income > 0:
            higher_rate_income = min(remaining_income, self.higher_rate_threshold - self.basic_rate_threshold)
            tax += higher_rate_income * Decimal('0.40')
            remaining_income -= higher_rate_income
        
        # Additional rate (45%)
        if remaining_income > 0:
            tax += remaining_income * Decimal('0.45')
        
        return tax
    
    def calculate_social_security(self, gross_salary: Decimal, employee_data: Dict[str, Any]) -> Decimal:
        """
        Calculate National Insurance contributions
        """
        # Primary threshold
        if gross_salary <= self.national_insurance_threshold:
            return Decimal('0')
        
        # Calculate NI
        ni_income = gross_salary - self.national_insurance_threshold
        
        if ni_income <= self.national_insurance_upper_threshold:
            return ni_income * self.national_insurance_rate
        else:
            # Basic rate + higher rate
            basic_rate_ni = self.national_insurance_upper_threshold * self.national_insurance_rate
            higher_rate_ni = (ni_income - self.national_insurance_upper_threshold) * Decimal('0.02')
            return basic_rate_ni + higher_rate_ni
    
    def calculate_health_insurance(self, gross_salary: Decimal, employee_data: Dict[str, Any]) -> Decimal:
        """
        UK has NHS, no separate health insurance
        """
        return Decimal('0')
    
    def get_working_hours_limits(self) -> Dict[str, int]:
        """
        Get UK working hours limits
        """
        return {
            'max_weekly': 48,  # Working Time Directive
            'max_daily': 8,
            'overtime_threshold': 40,
            'overtime_rate': 1.5,
            'rest_break': 20,  # 20 minutes for 6+ hours work
            'daily_rest': 11,  # 11 hours between shifts
            'weekly_rest': 24   # 24 hours per week
        }
    
    def get_leave_entitlements(self, employee_data: Dict[str, Any]) -> Dict[str, int]:
        """
        Get UK leave entitlements
        """
        # Statutory minimum
        statutory_leave = 28  # 28 days including bank holidays
        
        return {
            'annual_leave': 28,
            'sick_leave': 0,  # Statutory Sick Pay
            'maternity_leave': 52,  # 52 weeks
            'paternity_leave': 2,    # 2 weeks
            'parental_leave': 18,    # 18 weeks per child
            'shared_parental_leave': 50  # 50 weeks shared
        }
    
    def get_public_holidays(self, year: int) -> List[date]:
        """
        Get UK bank holidays
        """
        holidays = [
            date(year, 1, 1),    # New Year's Day
            date(year, 3, 29),  # Good Friday (varies)
            date(year, 4, 1),   # Easter Monday (varies)
            date(year, 5, 6),   # Early May Bank Holiday
            date(year, 5, 27),  # Spring Bank Holiday
            date(year, 8, 26),  # Summer Bank Holiday
            date(year, 12, 25), # Christmas Day
            date(year, 12, 26)  # Boxing Day
        ]
        
        return holidays
    
    def get_reporting_requirements(self) -> List[Dict[str, Any]]:
        """
        Get UK reporting requirements
        """
        return [
            {
                'report_type': 'P60',
                'frequency': 'annual',
                'due_date': 'May 31',
                'description': 'End of Year Certificate'
            },
            {
                'report_type': 'P11D',
                'frequency': 'annual',
                'due_date': 'July 6',
                'description': 'Benefits and Expenses'
            },
            {
                'report_type': 'RTI',
                'frequency': 'real_time',
                'due_date': 'On or before payday',
                'description': 'Real Time Information'
            },
            {
                'report_type': 'CIS',
                'frequency': 'monthly',
                'due_date': '19th of following month',
                'description': 'Construction Industry Scheme'
            }
        ]
    
    def calculate_pension_contributions(self, gross_salary: Decimal, employee_data: Dict[str, Any]) -> Decimal:
        """
        Calculate auto-enrollment pension contributions
        """
        # Minimum contribution rates
        employee_rate = Decimal('0.05')  # 5%
        employer_rate = Decimal('0.03')  # 3%
        
        # Check if employee is eligible
        age = employee_data.get('age', 0)
        if age < 22 or age > 65:
            return Decimal('0')
        
        # Calculate employee contribution
        return gross_salary * employee_rate
    
    def get_minimum_wage(self, age: int) -> Decimal:
        """
        Get UK minimum wage by age
        """
        if age < 18:
            return Decimal('6.40')  # Apprentice rate
        elif age < 21:
            return Decimal('8.60')  # 18-20 rate
        elif age < 23:
            return Decimal('11.44')  # 21-22 rate
        else:
            return Decimal('11.44')  # 23+ rate (National Living Wage)
    
    def calculate_statutory_sick_pay(self, gross_salary: Decimal, days_off: int) -> Decimal:
        """
        Calculate Statutory Sick Pay
        """
        if days_off < 4:
            return Decimal('0')  # No SSP for first 3 days
        
        # SSP rate for 2024/25
        ssp_rate = Decimal('116.75')  # Per week
        weeks_off = days_off / 7
        
        return ssp_rate * Decimal(str(weeks_off))
    
    def calculate_maternity_pay(self, gross_salary: Decimal, weeks_off: int) -> Decimal:
        """
        Calculate Statutory Maternity Pay
        """
        if weeks_off <= 6:
            return Decimal('0')  # No pay for first 6 weeks
        
        # First 6 weeks: 90% of average weekly earnings
        # Next 33 weeks: £184.03 per week (2024/25)
        
        if weeks_off <= 39:
            return gross_salary * Decimal('0.90') * Decimal('6') + Decimal('184.03') * Decimal(str(weeks_off - 6))
        else:
            return gross_salary * Decimal('0.90') * Decimal('6') + Decimal('184.03') * Decimal('33')
