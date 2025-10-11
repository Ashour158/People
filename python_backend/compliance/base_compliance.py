"""
Base Compliance Class
Provides common functionality for regional compliance
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, date
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class BaseCompliance(ABC):
    """
    Abstract base class for regional compliance
    """
    
    def __init__(self, country_code: str, config: Dict[str, Any]):
        self.country_code = country_code
        self.config = config
        self.currency = config.get('currency', 'USD')
        self.tax_year_start = config.get('tax_year_start', date(2024, 1, 1))
        self.tax_year_end = config.get('tax_year_end', date(2024, 12, 31))
        
    @abstractmethod
    def calculate_income_tax(self, gross_salary: Decimal, employee_data: Dict[str, Any]) -> Decimal:
        """
        Calculate income tax for employee
        Args:
            gross_salary: Employee's gross salary
            employee_data: Employee information
        Returns: Tax amount
        """
        pass
    
    @abstractmethod
    def calculate_social_security(self, gross_salary: Decimal, employee_data: Dict[str, Any]) -> Decimal:
        """
        Calculate social security contributions
        Args:
            gross_salary: Employee's gross salary
            employee_data: Employee information
        Returns: Social security amount
        """
        pass
    
    @abstractmethod
    def calculate_health_insurance(self, gross_salary: Decimal, employee_data: Dict[str, Any]) -> Decimal:
        """
        Calculate health insurance contributions
        Args:
            gross_salary: Employee's gross salary
            employee_data: Employee information
        Returns: Health insurance amount
        """
        pass
    
    @abstractmethod
    def get_working_hours_limits(self) -> Dict[str, int]:
        """
        Get working hours limits for the country
        Returns: Dict with limits
        """
        pass
    
    @abstractmethod
    def get_leave_entitlements(self, employee_data: Dict[str, Any]) -> Dict[str, int]:
        """
        Get leave entitlements for employee
        Args:
            employee_data: Employee information
        Returns: Dict with leave entitlements
        """
        pass
    
    @abstractmethod
    def get_public_holidays(self, year: int) -> List[date]:
        """
        Get public holidays for the year
        Args:
            year: Year to get holidays for
        Returns: List of holiday dates
        """
        pass
    
    @abstractmethod
    def get_reporting_requirements(self) -> List[Dict[str, Any]]:
        """
        Get reporting requirements for the country
        Returns: List of reporting requirements
        """
        pass
    
    def calculate_total_deductions(self, gross_salary: Decimal, employee_data: Dict[str, Any]) -> Dict[str, Decimal]:
        """
        Calculate all deductions for employee
        Args:
            gross_salary: Employee's gross salary
            employee_data: Employee information
        Returns: Dict with all deductions
        """
        deductions = {
            'income_tax': self.calculate_income_tax(gross_salary, employee_data),
            'social_security': self.calculate_social_security(gross_salary, employee_data),
            'health_insurance': self.calculate_health_insurance(gross_salary, employee_data)
        }
        
        deductions['total'] = sum(deductions.values())
        return deductions
    
    def calculate_net_salary(self, gross_salary: Decimal, employee_data: Dict[str, Any]) -> Decimal:
        """
        Calculate net salary after all deductions
        Args:
            gross_salary: Employee's gross salary
            employee_data: Employee information
        Returns: Net salary amount
        """
        deductions = self.calculate_total_deductions(gross_salary, employee_data)
        return gross_salary - deductions['total']
    
    def validate_working_hours(self, hours_worked: int) -> bool:
        """
        Validate if working hours are within legal limits
        Args:
            hours_worked: Hours worked in a period
        Returns: True if valid
        """
        limits = self.get_working_hours_limits()
        return hours_worked <= limits.get('max_weekly', 40)
    
    def get_compliance_status(self) -> Dict[str, Any]:
        """
        Get compliance status for the country
        Returns: Dict with compliance information
        """
        return {
            'country_code': self.country_code,
            'currency': self.currency,
            'tax_year_start': self.tax_year_start,
            'tax_year_end': self.tax_year_end,
            'working_hours_limits': self.get_working_hours_limits(),
            'reporting_requirements': self.get_reporting_requirements()
        }
    
    def __str__(self):
        return f"{self.__class__.__name__}(country={self.country_code})"
    
    def __repr__(self):
        return f"{self.__class__.__name__}(country={self.country_code}, currency={self.currency})"
