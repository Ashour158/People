"""
Leave Management Service.
"""
from datetime import datetime, date
from typing import Optional, Dict, Any, List
from dateutil.relativedelta import relativedelta

from ..config.database import query, transaction
from ..middleware.exceptions import AppError, NotFoundError
from ..utils.pagination import get_pagination, get_pagination_meta


class LeaveService:
    """Service for leave management operations."""
    
    def get_leave_types(self, organization_id: str, company_id: Optional[str] = None) -> List[Dict]:
        """
        Get leave types for an organization.
        
        Args:
            organization_id: Organization UUID
            company_id: Optional company UUID
            
        Returns:
            List of leave types
        """
        where_clause = "organization_id = %s AND is_active = TRUE AND is_deleted = FALSE"
        params = [organization_id]
        
        if company_id:
            where_clause += " AND (company_id = %s OR company_id IS NULL)"
            params.append(company_id)
        
        results = query(
            f"""
            SELECT 
                leave_type_id, leave_type_name, leave_code, leave_category,
                description, is_paid, allocation_frequency, default_days_per_year,
                min_days_per_request, max_days_per_request, max_consecutive_days,
                can_carry_forward, max_carry_forward_days, allows_negative_balance,
                requires_document, notice_period_days, allows_half_day,
                includes_weekends, includes_holidays, color_code, icon
            FROM leave_types
            WHERE {where_clause}
            ORDER BY display_order, leave_type_name
            """,
            tuple(params)
        )
        
        return results
    
    def apply_leave(self, employee_id: str, organization_id: str, data: Dict[str, Any]) -> Dict:
        """
        Apply for leave.
        
        Args:
            employee_id: Employee UUID
            organization_id: Organization UUID
            data: Leave application data
            
        Returns:
            Created leave application
        """
        def _apply_leave(cursor):
            # Get leave type details
            cursor.execute(
                "SELECT * FROM leave_types WHERE leave_type_id = %s AND organization_id = %s",
                (data['leave_type_id'], organization_id)
            )
            leave_type = cursor.fetchone()
            
            if not leave_type:
                raise NotFoundError('Leave type not found')
            
            # Calculate leave days
            from_date = data['from_date']
            to_date = data['to_date']
            total_days = (to_date - from_date).days + 1
            
            if data.get('is_half_day'):
                total_days = 0.5
            
            # Check leave balance
            cursor.execute(
                """
                SELECT * FROM leave_balances 
                WHERE employee_id = %s AND leave_type_id = %s
                """,
                (employee_id, data['leave_type_id'])
            )
            balance = cursor.fetchone()
            
            if balance:
                if balance['available_days'] < total_days and not leave_type['allows_negative_balance']:
                    raise AppError(400, 'Insufficient leave balance')
            
            # Create leave application
            cursor.execute(
                """
                INSERT INTO leave_applications (
                    employee_id, organization_id, leave_type_id, from_date, to_date,
                    is_half_day, half_day_session, total_days, reason, contact_details,
                    supporting_document_url, leave_status, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending', NOW(), NOW())
                RETURNING *
                """,
                (
                    employee_id,
                    organization_id,
                    data['leave_type_id'],
                    data['from_date'],
                    data['to_date'],
                    data.get('is_half_day', False),
                    data.get('half_day_session'),
                    total_days,
                    data['reason'],
                    data.get('contact_details'),
                    data.get('supporting_document_url')
                )
            )
            
            return dict(cursor.fetchone())
        
        return transaction(_apply_leave)
    
    def get_leave_applications(
        self, 
        organization_id: str, 
        filters: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Get leave applications with filters.
        
        Args:
            organization_id: Organization UUID
            filters: Optional filter dictionary
            
        Returns:
            Dictionary with leaves and pagination metadata
        """
        filters = filters or {}
        pagination = get_pagination(filters)
        
        where_conditions = ['la.organization_id = %s']
        params = [organization_id]
        param_count = 1
        
        if filters.get('employee_id'):
            param_count += 1
            where_conditions.append(f'la.employee_id = %s')
            params.append(filters['employee_id'])
        
        if filters.get('leave_status'):
            param_count += 1
            where_conditions.append(f'la.leave_status = %s')
            params.append(filters['leave_status'])
        
        if filters.get('leave_type_id'):
            param_count += 1
            where_conditions.append(f'la.leave_type_id = %s')
            params.append(filters['leave_type_id'])
        
        where_clause = ' AND '.join(where_conditions)
        
        # Get total count
        count_results = query(
            f"SELECT COUNT(*) as total FROM leave_applications la WHERE {where_clause}",
            tuple(params)
        )
        total = count_results[0]['total'] if count_results else 0
        
        # Get paginated results
        params.extend([pagination['per_page'], pagination['offset']])
        results = query(
            f"""
            SELECT 
                la.*,
                e.employee_code, e.first_name, e.last_name,
                lt.leave_type_name, lt.leave_code, lt.color_code
            FROM leave_applications la
            JOIN employees e ON la.employee_id = e.employee_id
            JOIN leave_types lt ON la.leave_type_id = lt.leave_type_id
            WHERE {where_clause}
            ORDER BY la.created_at DESC
            LIMIT %s OFFSET %s
            """,
            tuple(params)
        )
        
        return {
            'leaves': results,
            'meta': get_pagination_meta(total, pagination['page'], pagination['per_page'])
        }
    
    def approve_reject_leave(
        self,
        leave_application_id: str,
        organization_id: str,
        approver_id: str,
        action: str,
        data: Dict[str, Any]
    ) -> Dict:
        """
        Approve or reject a leave application.
        
        Args:
            leave_application_id: Leave application UUID
            organization_id: Organization UUID
            approver_id: Approver employee UUID
            action: 'approve' or 'reject'
            data: Additional data (comments, rejection_reason)
            
        Returns:
            Updated leave application
        """
        def _approve_reject_leave(cursor):
            new_status = 'approved' if action == 'approve' else 'rejected'
            
            if action == 'reject':
                cursor.execute(
                    """
                    UPDATE leave_applications 
                    SET leave_status = %s,
                        rejected_by = %s,
                        rejected_at = NOW(),
                        rejection_reason = %s,
                        approver_comments = %s,
                        updated_at = NOW()
                    WHERE leave_application_id = %s AND organization_id = %s AND leave_status = 'pending'
                    RETURNING *
                    """,
                    (new_status, approver_id, data.get('rejection_reason'), data.get('comments'),
                     leave_application_id, organization_id)
                )
            else:
                cursor.execute(
                    """
                    UPDATE leave_applications 
                    SET leave_status = %s,
                        approved_by = %s,
                        approved_at = NOW(),
                        approver_comments = %s,
                        updated_at = NOW()
                    WHERE leave_application_id = %s AND organization_id = %s AND leave_status = 'pending'
                    RETURNING *
                    """,
                    (new_status, approver_id, data.get('comments'),
                     leave_application_id, organization_id)
                )
            
            result = cursor.fetchone()
            if not result:
                raise NotFoundError('Leave application not found or already processed')
            
            leave = dict(result)
            
            # Update leave balance if approved
            if action == 'approve':
                cursor.execute(
                    """
                    UPDATE leave_balances 
                    SET used_days = used_days + %s,
                        available_days = available_days - %s
                    WHERE employee_id = %s AND leave_type_id = %s
                    """,
                    (leave['total_days'], leave['total_days'], 
                     leave['employee_id'], leave['leave_type_id'])
                )
            
            return leave
        
        return transaction(_approve_reject_leave)
    
    def get_leave_balance(
        self, 
        employee_id: str, 
        organization_id: str, 
        year: Optional[int] = None
    ) -> List[Dict]:
        """
        Get leave balance for an employee.
        
        Args:
            employee_id: Employee UUID
            organization_id: Organization UUID
            year: Optional year filter
            
        Returns:
            List of leave balances
        """
        results = query(
            """
            SELECT 
                lb.*,
                lt.leave_type_name, lt.leave_code, lt.leave_category, 
                lt.color_code, lt.icon
            FROM leave_balances lb
            JOIN leave_types lt ON lb.leave_type_id = lt.leave_type_id
            WHERE lb.employee_id = %s AND lb.organization_id = %s
            ORDER BY lt.leave_type_name
            """,
            (employee_id, organization_id)
        )
        
        return results
    
    def cancel_leave(
        self,
        leave_application_id: str,
        organization_id: str,
        employee_id: str,
        cancellation_reason: str
    ) -> Dict[str, str]:
        """
        Cancel a leave application.
        
        Args:
            leave_application_id: Leave application UUID
            organization_id: Organization UUID
            employee_id: Employee UUID
            cancellation_reason: Reason for cancellation
            
        Returns:
            Success message
        """
        def _cancel_leave(cursor):
            cursor.execute(
                """
                UPDATE leave_applications
                SET 
                    leave_status = 'cancelled',
                    cancellation_reason = %s,
                    updated_at = NOW()
                WHERE leave_application_id = %s 
                    AND organization_id = %s
                    AND employee_id = %s
                    AND leave_status IN ('pending', 'approved')
                RETURNING *
                """,
                (cancellation_reason, leave_application_id, organization_id, employee_id)
            )
            
            result = cursor.fetchone()
            if not result:
                raise NotFoundError('Leave application not found or cannot be cancelled')
            
            leave = dict(result)
            
            # Restore leave balance if it was approved
            if leave['leave_status'] == 'approved':
                cursor.execute(
                    """
                    UPDATE leave_balances
                    SET used_days = used_days - %s,
                        available_days = available_days + %s
                    WHERE employee_id = %s AND leave_type_id = %s
                    """,
                    (leave['total_days'], leave['total_days'], 
                     employee_id, leave['leave_type_id'])
                )
            
            return {'message': 'Leave application cancelled successfully'}
        
        return transaction(_cancel_leave)
    
    def get_pending_approvals(self, approver_id: str, organization_id: str) -> List[Dict]:
        """
        Get pending leave approvals for a manager.
        
        Args:
            approver_id: Approver employee UUID
            organization_id: Organization UUID
            
        Returns:
            List of pending leave applications
        """
        results = query(
            """
            SELECT 
                la.leave_application_id, la.from_date, la.to_date, la.total_days,
                la.reason, la.created_at,
                e.employee_id, e.employee_code, e.first_name, e.last_name, 
                e.email, e.profile_picture_url,
                lt.leave_type_name, lt.leave_code, lt.color_code,
                d.department_name
            FROM leave_applications la
            JOIN employees e ON la.employee_id = e.employee_id
            JOIN leave_types lt ON la.leave_type_id = lt.leave_type_id
            LEFT JOIN departments d ON e.department_id = d.department_id
            WHERE e.manager_id = %s
                AND la.organization_id = %s
                AND la.leave_status = 'pending'
            ORDER BY la.created_at ASC
            """,
            (approver_id, organization_id)
        )
        
        return results
    
    def get_leave_calendar(
        self, 
        organization_id: str, 
        filters: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Get leave calendar (approved leaves).
        
        Args:
            organization_id: Organization UUID
            filters: Optional filters (department_id, from_date, to_date, employee_id)
            
        Returns:
            List of approved leaves for calendar view
        """
        filters = filters or {}
        
        where_conditions = ["la.organization_id = %s", "la.leave_status = 'approved'"]
        params = [organization_id]
        
        if filters.get('department_id'):
            where_conditions.append('e.department_id = %s')
            params.append(filters['department_id'])
        
        if filters.get('from_date'):
            where_conditions.append('la.from_date >= %s')
            params.append(filters['from_date'])
        
        if filters.get('to_date'):
            where_conditions.append('la.to_date <= %s')
            params.append(filters['to_date'])
        
        if filters.get('employee_id'):
            where_conditions.append('la.employee_id = %s')
            params.append(filters['employee_id'])
        
        where_clause = ' AND '.join(where_conditions)
        
        results = query(
            f"""
            SELECT 
                la.leave_application_id, la.from_date, la.to_date, la.total_days,
                la.is_half_day, la.half_day_session,
                e.employee_id, e.employee_code, e.first_name, e.last_name,
                e.profile_picture_url,
                lt.leave_type_name, lt.color_code,
                d.department_name
            FROM leave_applications la
            JOIN employees e ON la.employee_id = e.employee_id
            JOIN leave_types lt ON la.leave_type_id = lt.leave_type_id
            LEFT JOIN departments d ON e.department_id = d.department_id
            WHERE {where_clause}
            ORDER BY la.from_date ASC
            """,
            tuple(params)
        )
        
        return results


# Create singleton instance
leave_service = LeaveService()
