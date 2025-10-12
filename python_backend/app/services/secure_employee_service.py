"""
Secure Employee Service with Field-Level Encryption
CRITICAL: Handles encryption/decryption of sensitive employee data
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional, Dict, Any
import structlog
from uuid import UUID

from app.models.models import Employee
from app.core.encryption import (
    encrypt_ssn, decrypt_ssn,
    encrypt_salary, decrypt_salary,
    encrypt_bank_account, decrypt_bank_account,
    encrypt_personal_id, decrypt_personal_id
)

logger = structlog.get_logger()


class SecureEmployeeService:
    """Service for handling employee data with encryption"""
    
    @staticmethod
    async def create_employee_with_encryption(
        db: AsyncSession,
        employee_data: Dict[str, Any],
        organization_id: UUID
    ) -> Employee:
        """
        Create employee with encrypted sensitive fields
        
        Args:
            db: Database session
            employee_data: Employee data dictionary
            organization_id: Organization ID
            
        Returns:
            Created employee with encrypted sensitive data
        """
        try:
            # Extract sensitive fields for encryption
            sensitive_fields = {
                'ssn': employee_data.pop('ssn', None),
                'salary': employee_data.pop('salary', None),
                'bank_account': employee_data.pop('bank_account', None),
                'personal_id': employee_data.pop('personal_id', None),
                'tax_id': employee_data.pop('tax_id', None),
                'medical_info': employee_data.pop('medical_info', None)
            }
            
            # Create employee with non-sensitive data
            employee = Employee(
                organization_id=organization_id,
                **employee_data
            )
            
            # Encrypt and store sensitive fields
            if sensitive_fields['ssn']:
                employee.ssn = encrypt_ssn(sensitive_fields['ssn'])
            
            if sensitive_fields['salary']:
                employee.salary = encrypt_salary(sensitive_fields['salary'])
            
            if sensitive_fields['bank_account']:
                employee.bank_account = encrypt_bank_account(sensitive_fields['bank_account'])
            
            if sensitive_fields['personal_id']:
                employee.personal_id = encrypt_personal_id(sensitive_fields['personal_id'])
            
            if sensitive_fields['tax_id']:
                employee.tax_id = encrypt_salary(sensitive_fields['tax_id'])  # Reuse salary encryption
            
            if sensitive_fields['medical_info']:
                employee.medical_info = encrypt_salary(sensitive_fields['medical_info'])  # Reuse salary encryption
            
            db.add(employee)
            await db.commit()
            await db.refresh(employee)
            
            logger.info(f"Employee created with encrypted sensitive data: {employee.employee_id}")
            return employee
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to create employee with encryption: {e}")
            raise
    
    @staticmethod
    async def get_employee_with_decryption(
        db: AsyncSession,
        employee_id: UUID,
        organization_id: UUID,
        include_sensitive: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Get employee with optional decryption of sensitive fields
        
        Args:
            db: Database session
            employee_id: Employee ID
            organization_id: Organization ID
            include_sensitive: Whether to decrypt sensitive fields
            
        Returns:
            Employee data with optionally decrypted sensitive fields
        """
        try:
            result = await db.execute(
                select(Employee).where(
                    and_(
                        Employee.employee_id == employee_id,
                        Employee.organization_id == organization_id,
                        Employee.is_deleted == False
                    )
                )
            )
            employee = result.scalar_one_or_none()
            
            if not employee:
                return None
            
            # Convert to dictionary
            employee_dict = {
                'employee_id': str(employee.employee_id),
                'user_id': str(employee.user_id),
                'organization_id': str(employee.organization_id),
                'company_id': str(employee.company_id),
                'employee_code': employee.employee_code,
                'first_name': employee.first_name,
                'last_name': employee.last_name,
                'middle_name': employee.middle_name,
                'date_of_birth': employee.date_of_birth,
                'gender': employee.gender,
                'marital_status': employee.marital_status,
                'nationality': employee.nationality,
                'phone': employee.phone,
                'personal_email': employee.personal_email,
                'emergency_contact_name': employee.emergency_contact_name,
                'emergency_contact_phone': employee.emergency_contact_phone,
                'address': employee.address,
                'city': employee.city,
                'state': employee.state,
                'country': employee.country,
                'postal_code': employee.postal_code,
                'profile_picture_url': employee.profile_picture_url,
                'hire_date': employee.hire_date,
                'employment_type': employee.employment_type,
                'employment_status': employee.employment_status,
                'termination_date': employee.termination_date,
                'termination_reason': employee.termination_reason,
                'job_title': employee.job_title,
                'department_id': str(employee.department_id) if employee.department_id else None,
                'manager_id': str(employee.manager_id) if employee.manager_id else None,
                'work_location': employee.work_location,
                'created_at': employee.created_at,
                'modified_at': employee.modified_at
            }
            
            # Decrypt sensitive fields if requested
            if include_sensitive:
                if employee.ssn:
                    employee_dict['ssn'] = decrypt_ssn(employee.ssn)
                
                if employee.salary:
                    employee_dict['salary'] = decrypt_salary(employee.salary)
                
                if employee.bank_account:
                    employee_dict['bank_account'] = decrypt_bank_account(employee.bank_account)
                
                if employee.personal_id:
                    employee_dict['personal_id'] = decrypt_personal_id(employee.personal_id)
                
                if employee.tax_id:
                    employee_dict['tax_id'] = decrypt_salary(employee.tax_id)
                
                if employee.medical_info:
                    employee_dict['medical_info'] = decrypt_salary(employee.medical_info)
            
            return employee_dict
            
        except Exception as e:
            logger.error(f"Failed to get employee with decryption: {e}")
            raise
    
    @staticmethod
    async def update_employee_sensitive_data(
        db: AsyncSession,
        employee_id: UUID,
        organization_id: UUID,
        sensitive_data: Dict[str, Any]
    ) -> bool:
        """
        Update employee sensitive data with encryption
        
        Args:
            db: Database session
            employee_id: Employee ID
            organization_id: Organization ID
            sensitive_data: Dictionary of sensitive fields to update
            
        Returns:
            True if successful, False otherwise
        """
        try:
            result = await db.execute(
                select(Employee).where(
                    and_(
                        Employee.employee_id == employee_id,
                        Employee.organization_id == organization_id,
                        Employee.is_deleted == False
                    )
                )
            )
            employee = result.scalar_one_or_none()
            
            if not employee:
                return False
            
            # Encrypt and update sensitive fields
            if 'ssn' in sensitive_data and sensitive_data['ssn']:
                employee.ssn = encrypt_ssn(sensitive_data['ssn'])
            
            if 'salary' in sensitive_data and sensitive_data['salary']:
                employee.salary = encrypt_salary(sensitive_data['salary'])
            
            if 'bank_account' in sensitive_data and sensitive_data['bank_account']:
                employee.bank_account = encrypt_bank_account(sensitive_data['bank_account'])
            
            if 'personal_id' in sensitive_data and sensitive_data['personal_id']:
                employee.personal_id = encrypt_personal_id(sensitive_data['personal_id'])
            
            if 'tax_id' in sensitive_data and sensitive_data['tax_id']:
                employee.tax_id = encrypt_salary(sensitive_data['tax_id'])
            
            if 'medical_info' in sensitive_data and sensitive_data['medical_info']:
                employee.medical_info = encrypt_salary(sensitive_data['medical_info'])
            
            await db.commit()
            
            logger.info(f"Employee sensitive data updated with encryption: {employee_id}")
            return True
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to update employee sensitive data: {e}")
            return False
    
    @staticmethod
    async def delete_employee_sensitive_data(
        db: AsyncSession,
        employee_id: UUID,
        organization_id: UUID
    ) -> bool:
        """
        Securely delete employee sensitive data (set to NULL)
        
        Args:
            db: Database session
            employee_id: Employee ID
            organization_id: Organization ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            result = await db.execute(
                select(Employee).where(
                    and_(
                        Employee.employee_id == employee_id,
                        Employee.organization_id == organization_id,
                        Employee.is_deleted == False
                    )
                )
            )
            employee = result.scalar_one_or_none()
            
            if not employee:
                return False
            
            # Securely delete sensitive fields
            employee.ssn = None
            employee.salary = None
            employee.bank_account = None
            employee.personal_id = None
            employee.tax_id = None
            employee.medical_info = None
            
            await db.commit()
            
            logger.info(f"Employee sensitive data securely deleted: {employee_id}")
            return True
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to delete employee sensitive data: {e}")
            return False
