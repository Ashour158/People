"""
Attendance Management Service.
"""
from datetime import datetime, date
from typing import Optional, Dict, Any, List

from ..config.database import query, transaction
from ..middleware.exceptions import AppError, NotFoundError
from ..utils.pagination import get_pagination, get_pagination_meta


class AttendanceService:
    """Service for attendance management operations."""
    
    def check_in(self, employee_id: str, organization_id: str, data: Dict[str, Any]) -> Dict:
        """
        Check in an employee.
        
        Args:
            employee_id: Employee UUID
            organization_id: Organization UUID
            data: Check-in data
            
        Returns:
            Created attendance record
        """
        def _check_in(cursor):
            today = date.today().isoformat()
            
            # Check if already checked in today
            cursor.execute(
                """
                SELECT attendance_id FROM attendance 
                WHERE employee_id = %s AND attendance_date = %s AND check_out_time IS NULL
                """,
                (employee_id, today)
            )
            
            if cursor.fetchone():
                raise AppError(400, 'Already checked in today')
            
            check_in_time = data.get('check_in_time') or datetime.now()
            
            cursor.execute(
                """
                INSERT INTO attendance (
                    employee_id, organization_id, attendance_date, check_in_time,
                    check_in_location, check_in_notes, attendance_status, 
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, 'present', NOW(), NOW())
                RETURNING *
                """,
                (
                    employee_id,
                    organization_id,
                    today,
                    check_in_time,
                    data.get('location'),
                    data.get('notes')
                )
            )
            
            return dict(cursor.fetchone())
        
        return transaction(_check_in)
    
    def check_out(self, employee_id: str, organization_id: str, data: Dict[str, Any]) -> Dict:
        """
        Check out an employee.
        
        Args:
            employee_id: Employee UUID
            organization_id: Organization UUID
            data: Check-out data
            
        Returns:
            Updated attendance record
        """
        def _check_out(cursor):
            today = date.today().isoformat()
            check_out_time = data.get('check_out_time') or datetime.now()
            
            cursor.execute(
                """
                UPDATE attendance 
                SET check_out_time = %s, 
                    check_out_location = %s, 
                    check_out_notes = %s,
                    total_hours = EXTRACT(EPOCH FROM (%s - check_in_time)) / 3600,
                    updated_at = NOW()
                WHERE employee_id = %s 
                    AND attendance_date = %s 
                    AND check_out_time IS NULL
                RETURNING *
                """,
                (
                    check_out_time,
                    data.get('location'),
                    data.get('notes'),
                    check_out_time,
                    employee_id,
                    today
                )
            )
            
            result = cursor.fetchone()
            if not result:
                raise AppError(400, 'No active check-in found for today')
            
            return dict(result)
        
        return transaction(_check_out)
    
    def get_attendance(
        self, 
        organization_id: str, 
        filters: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Get attendance records with filters.
        
        Args:
            organization_id: Organization UUID
            filters: Optional filter dictionary
            
        Returns:
            Dictionary with attendance records and pagination metadata
        """
        filters = filters or {}
        pagination = get_pagination(filters)
        
        where_conditions = ['a.organization_id = %s']
        params = [organization_id]
        
        if filters.get('employee_id'):
            where_conditions.append('a.employee_id = %s')
            params.append(filters['employee_id'])
        
        if filters.get('from_date'):
            where_conditions.append('a.attendance_date >= %s')
            params.append(filters['from_date'])
        
        if filters.get('to_date'):
            where_conditions.append('a.attendance_date <= %s')
            params.append(filters['to_date'])
        
        if filters.get('attendance_status'):
            where_conditions.append('a.attendance_status = %s')
            params.append(filters['attendance_status'])
        
        where_clause = ' AND '.join(where_conditions)
        
        # Get total count
        count_results = query(
            f"SELECT COUNT(*) as total FROM attendance a WHERE {where_clause}",
            tuple(params)
        )
        total = count_results[0]['total'] if count_results else 0
        
        # Get paginated results
        params.extend([pagination['per_page'], pagination['offset']])
        results = query(
            f"""
            SELECT 
                a.*,
                e.employee_code, e.first_name, e.last_name, e.profile_picture_url,
                d.department_name
            FROM attendance a
            JOIN employees e ON a.employee_id = e.employee_id
            LEFT JOIN departments d ON e.department_id = d.department_id
            WHERE {where_clause}
            ORDER BY a.attendance_date DESC, a.check_in_time DESC
            LIMIT %s OFFSET %s
            """,
            tuple(params)
        )
        
        return {
            'attendance': results,
            'meta': get_pagination_meta(total, pagination['page'], pagination['per_page'])
        }
    
    def request_regularization(
        self,
        employee_id: str,
        organization_id: str,
        data: Dict[str, Any]
    ) -> Dict:
        """
        Request attendance regularization.
        
        Args:
            employee_id: Employee UUID
            organization_id: Organization UUID
            data: Regularization request data
            
        Returns:
            Created regularization request
        """
        def _request_regularization(cursor):
            cursor.execute(
                """
                INSERT INTO attendance_regularization (
                    employee_id, organization_id, attendance_date,
                    requested_check_in_time, requested_check_out_time,
                    reason, status, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, 'pending', NOW(), NOW())
                RETURNING *
                """,
                (
                    employee_id,
                    organization_id,
                    data['attendance_date'],
                    data['check_in_time'],
                    data.get('check_out_time'),
                    data['reason']
                )
            )
            
            return dict(cursor.fetchone())
        
        return transaction(_request_regularization)
    
    def get_attendance_summary(
        self,
        employee_id: str,
        organization_id: str,
        month: Optional[int] = None,
        year: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get attendance summary for an employee.
        
        Args:
            employee_id: Employee UUID
            organization_id: Organization UUID
            month: Optional month (1-12)
            year: Optional year
            
        Returns:
            Attendance summary statistics
        """
        target_month = month or datetime.now().month
        target_year = year or datetime.now().year
        
        results = query(
            """
            SELECT 
                COUNT(*) as total_days,
                COUNT(*) FILTER (WHERE attendance_status = 'present') as present_days,
                COUNT(*) FILTER (WHERE attendance_status = 'absent') as absent_days,
                COUNT(*) FILTER (WHERE attendance_status = 'half_day') as half_days,
                COUNT(*) FILTER (WHERE attendance_status = 'late') as late_days,
                COALESCE(AVG(total_hours) FILTER (WHERE total_hours IS NOT NULL), 0) as avg_hours,
                COALESCE(SUM(total_hours) FILTER (WHERE total_hours IS NOT NULL), 0) as total_hours
            FROM attendance
            WHERE employee_id = %s 
                AND organization_id = %s
                AND EXTRACT(MONTH FROM attendance_date) = %s
                AND EXTRACT(YEAR FROM attendance_date) = %s
            """,
            (employee_id, organization_id, target_month, target_year)
        )
        
        summary = results[0] if results else {}
        summary['month'] = target_month
        summary['year'] = target_year
        
        return summary
    
    def get_today_attendance(self, employee_id: str, organization_id: str) -> Optional[Dict]:
        """
        Get today's attendance record for an employee.
        
        Args:
            employee_id: Employee UUID
            organization_id: Organization UUID
            
        Returns:
            Today's attendance record or None
        """
        today = date.today().isoformat()
        
        results = query(
            """
            SELECT * FROM attendance
            WHERE employee_id = %s 
                AND organization_id = %s
                AND attendance_date = %s
            """,
            (employee_id, organization_id, today)
        )
        
        return results[0] if results else None


# Create singleton instance
attendance_service = AttendanceService()
