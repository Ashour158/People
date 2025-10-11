"""
US Compliance Implementation
Handles US-specific compliance requirements
"""

from typing import Dict, Any, List
from datetime import date, datetime
from decimal import Decimal
import logging

from .base_compliance import BaseCompliance

logger = logging.getLogger(__name__)


class USCompliance(BaseCompliance):
    """
    US compliance implementation
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("US", config)
        self.state = config.get('state', 'CA')
        self.federal_tax_brackets = self._get_federal_tax_brackets()
        self.state_tax_brackets = self._get_state_tax_brackets()
        self.social_security_rate = Decimal('0.062')  # 6.2%
        self.medicare_rate = Decimal('0.0145')  # 1.45%
        self.social_security_wage_base = Decimal('160200')  # 2024 limit
        
    def calculate_income_tax(self, gross_salary: Decimal, employee_data: Dict[str, Any]) -> Decimal:
        """
        Calculate US income tax (federal + state)
        """
        # Federal tax
        federal_tax = self._calculate_federal_tax(gross_salary, employee_data)
        
        # State tax
        state_tax = self._calculate_state_tax(gross_salary, employee_data)
        
        return federal_tax + state_tax
    
    def calculate_social_security(self, gross_salary: Decimal, employee_data: Dict[str, Any]) -> Decimal:
        """
        Calculate social security tax
        """
        # Apply wage base limit
        taxable_wages = min(gross_salary, self.social_security_wage_base)
        return taxable_wages * self.social_security_rate
    
    def calculate_health_insurance(self, gross_salary: Decimal, employee_data: Dict[str, Any]) -> Decimal:
        """
        Calculate Medicare tax
        """
        # Regular Medicare tax
        medicare_tax = gross_salary * self.medicare_rate
        
        # Additional Medicare tax for high earners
        if gross_salary > Decimal('200000'):
            additional_medicare = (gross_salary - Decimal('200000')) * Decimal('0.009')
            medicare_tax += additional_medicare
        
        return medicare_tax
    
    def get_working_hours_limits(self) -> Dict[str, int]:
        """
        Get US working hours limits
        """
        return {
            'max_weekly': 40,
            'max_daily': 8,
            'overtime_threshold': 40,
            'overtime_rate': 1.5
        }
    
    def get_leave_entitlements(self, employee_data: Dict[str, Any]) -> Dict[str, int]:
        """
        Get US leave entitlements
        """
        # FMLA eligibility (12 weeks unpaid)
        fmla_eligible = employee_data.get('tenure_months', 0) >= 12
        
        return {
            'fmla_weeks': 12 if fmla_eligible else 0,
            'sick_leave': 0,  # No federal requirement
            'vacation_leave': 0,  # No federal requirement
            'personal_leave': 0
        }
    
    def get_public_holidays(self, year: int) -> List[date]:
        """
        Get US public holidays
        """
        holidays = [
            date(year, 1, 1),    # New Year's Day
            date(year, 1, 15),   # Martin Luther King Jr. Day
            date(year, 2, 19),   # Presidents' Day
            date(year, 5, 27),   # Memorial Day
            date(year, 6, 19),   # Juneteenth
            date(year, 7, 4),    # Independence Day
            date(year, 9, 2),    # Labor Day
            date(year, 10, 14),  # Columbus Day
            date(year, 11, 11),  # Veterans Day
            date(year, 11, 28),  # Thanksgiving
            date(year, 12, 25)   # Christmas Day
        ]
        
        return holidays
    
    def get_reporting_requirements(self) -> List[Dict[str, Any]]:
        """
        Get US reporting requirements
        """
        return [
            {
                'report_type': 'W-2',
                'frequency': 'annual',
                'due_date': 'January 31',
                'description': 'Wage and Tax Statement'
            },
            {
                'report_type': '941',
                'frequency': 'quarterly',
                'due_date': 'Last day of month following quarter',
                'description': 'Employer\'s Quarterly Federal Tax Return'
            },
            {
                'report_type': '940',
                'frequency': 'annual',
                'due_date': 'January 31',
                'description': 'Employer\'s Annual Federal Unemployment Tax Return'
            }
        ]
    
    def _calculate_federal_tax(self, gross_salary: Decimal, employee_data: Dict[str, Any]) -> Decimal:
        """
        Calculate federal income tax
        """
        # Get filing status
        filing_status = employee_data.get('filing_status', 'single')
        
        # Get tax brackets for filing status
        brackets = self.federal_tax_brackets.get(filing_status, [])
        
        # Calculate tax
        tax = Decimal('0')
        remaining_income = gross_salary
        
        for bracket in brackets:
            if remaining_income <= 0:
                break
                
            bracket_min = Decimal(str(bracket['min']))
            bracket_max = Decimal(str(bracket['max']))
            bracket_rate = Decimal(str(bracket['rate']))
            
            if remaining_income > bracket_min:
                taxable_in_bracket = min(remaining_income - bracket_min, bracket_max - bracket_min)
                tax += taxable_in_bracket * bracket_rate
                remaining_income -= taxable_in_bracket
        
        return tax
    
    def _calculate_state_tax(self, gross_salary: Decimal, employee_data: Dict[str, Any]) -> Decimal:
        """
        Calculate state income tax
        """
        # Get state tax brackets
        brackets = self.state_tax_brackets.get(self.state, [])
        
        if not brackets:
            return Decimal('0')  # No state income tax
        
        # Calculate tax
        tax = Decimal('0')
        remaining_income = gross_salary
        
        for bracket in brackets:
            if remaining_income <= 0:
                break
                
            bracket_min = Decimal(str(bracket['min']))
            bracket_max = Decimal(str(bracket['max']))
            bracket_rate = Decimal(str(bracket['rate']))
            
            if remaining_income > bracket_min:
                taxable_in_bracket = min(remaining_income - bracket_min, bracket_max - bracket_min)
                tax += taxable_in_bracket * bracket_rate
                remaining_income -= taxable_in_bracket
        
        return tax
    
    def _get_federal_tax_brackets(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get federal tax brackets for 2024
        """
        return {
            'single': [
                {'min': 0, 'max': 11000, 'rate': 0.10},
                {'min': 11000, 'max': 44725, 'rate': 0.12},
                {'min': 44725, 'max': 95375, 'rate': 0.22},
                {'min': 95375, 'max': 182050, 'rate': 0.24},
                {'min': 182050, 'max': 231250, 'rate': 0.32},
                {'min': 231250, 'max': 578125, 'rate': 0.35},
                {'min': 578125, 'max': float('inf'), 'rate': 0.37}
            ],
            'married_joint': [
                {'min': 0, 'max': 22000, 'rate': 0.10},
                {'min': 22000, 'max': 89450, 'rate': 0.12},
                {'min': 89450, 'max': 190750, 'rate': 0.22},
                {'min': 190750, 'max': 364200, 'rate': 0.24},
                {'min': 364200, 'max': 462500, 'rate': 0.32},
                {'min': 462500, 'max': 693750, 'rate': 0.35},
                {'min': 693750, 'max': float('inf'), 'rate': 0.37}
            ]
        }
    
    def _get_state_tax_brackets(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get state tax brackets for major states
        """
        return {
            'CA': [
                {'min': 0, 'max': 10099, 'rate': 0.01},
                {'min': 10099, 'max': 23942, 'rate': 0.02},
                {'min': 23942, 'max': 37788, 'rate': 0.04},
                {'min': 37788, 'max': 52455, 'rate': 0.06},
                {'min': 52455, 'max': 66295, 'rate': 0.08},
                {'min': 66295, 'max': 338639, 'rate': 0.093},
                {'min': 338639, 'max': 406364, 'rate': 0.103},
                {'min': 406364, 'max': 677275, 'rate': 0.113},
                {'min': 677275, 'max': float('inf'), 'rate': 0.123}
            ],
            'NY': [
                {'min': 0, 'max': 8500, 'rate': 0.04},
                {'min': 8500, 'max': 11700, 'rate': 0.045},
                {'min': 11700, 'max': 13900, 'rate': 0.0525},
                {'min': 13900, 'max': 21400, 'rate': 0.059},
                {'min': 21400, 'max': 80650, 'rate': 0.0625},
                {'min': 80650, 'max': 215400, 'rate': 0.0685},
                {'min': 215400, 'max': 1077550, 'rate': 0.0965},
                {'min': 1077550, 'max': 5000000, 'rate': 0.103},
                {'min': 5000000, 'max': 25000000, 'rate': 0.109},
                {'min': 25000000, 'max': float('inf'), 'rate': 0.109}
            ],
            'TX': []  # No state income tax
        }
