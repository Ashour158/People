"""
Database Query Optimization Service
Provides optimized database queries with proper joins and caching
"""

from typing import List, Dict, Any, Optional, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload, contains_eager
from sqlalchemy import and_, or_, func, desc, asc
from app.models.models import (
    Employee, User, Department, Company, Organization,
    Attendance, LeaveRequest, PerformanceReview, PayrollRecord,
    JobPosting, Candidate, ExpenseClaim, Ticket, Document,
    Workflow, CompliancePolicy, Integration, Notification, AuditLog
)
from app.core.redis_client import cache_service
import structlog
from datetime import datetime, timedelta
import json

logger = structlog.get_logger()

class QueryOptimizationService:
    """Service for optimized database queries with proper joins and caching"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # ============================================
    # EMPLOYEE QUERY OPTIMIZATIONS
    # ============================================
    
    async def get_employees_with_relations(
        self, 
        organization_id: str,
        limit: int = 50,
        offset: int = 0,
        include_inactive: bool = False
    ) -> List[Dict[str, Any]]:
        """Get employees with all related data in a single optimized query"""
        
        cache_key = f"employees:org:{organization_id}:limit:{limit}:offset:{offset}:active:{not include_inactive}"
        cached_result = await cache_service.get(cache_key)
        if cached_result:
            return json.loads(cached_result)
        
        # Build query with proper joins
        query = (
            select(Employee)
            .options(
                selectinload(Employee.user),
                selectinload(Employee.department),
                selectinload(Employee.company),
                selectinload(Employee.manager)
            )
            .where(Employee.organization_id == organization_id)
            .order_by(Employee.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        
        if not include_inactive:
            query = query.where(Employee.employment_status == 'ACTIVE')
        
        result = await self.db.execute(query)
        employees = result.scalars().all()
        
        # Convert to dict format
        employee_data = []
        for emp in employees:
            emp_dict = {
                'employee_id': str(emp.employee_id),
                'employee_code': emp.employee_code,
                'first_name': emp.first_name,
                'last_name': emp.last_name,
                'email': emp.personal_email,
                'phone': emp.phone,
                'job_title': emp.job_title,
                'employment_status': emp.employment_status,
                'employment_type': emp.employment_type,
                'hire_date': emp.hire_date.isoformat() if emp.hire_date else None,
                'department': {
                    'department_id': str(emp.department.department_id) if emp.department else None,
                    'name': emp.department.name if emp.department else None
                } if emp.department else None,
                'company': {
                    'company_id': str(emp.company.company_id) if emp.company else None,
                    'name': emp.company.name if emp.company else None
                } if emp.company else None,
                'manager': {
                    'employee_id': str(emp.manager.employee_id) if emp.manager else None,
                    'name': f"{emp.manager.first_name} {emp.manager.last_name}" if emp.manager else None
                } if emp.manager else None
            }
            employee_data.append(emp_dict)
        
        # Cache for 5 minutes
        await cache_service.set(cache_key, json.dumps(employee_data), ttl=300)
        
        return employee_data
    
    async def get_employee_attendance_summary(
        self, 
        employee_id: str, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get employee attendance summary with optimized query"""
        
        cache_key = f"attendance:summary:{employee_id}:{start_date.date()}:{end_date.date()}"
        cached_result = await cache_service.get(cache_key)
        if cached_result:
            return json.loads(cached_result)
        
        # Single query with aggregations
        query = (
            select(
                func.count(Attendance.attendance_id).label('total_days'),
                func.count(func.case([(Attendance.status == 'PRESENT', 1)])).label('present_days'),
                func.count(func.case([(Attendance.status == 'ABSENT', 1)])).label('absent_days'),
                func.count(func.case([(Attendance.status == 'LATE', 1)])).label('late_days'),
                func.avg(
                    func.extract('epoch', Attendance.check_out_time - Attendance.check_in_time) / 3600
                ).label('avg_hours_per_day')
            )
            .where(
                and_(
                    Attendance.employee_id == employee_id,
                    Attendance.date >= start_date,
                    Attendance.date <= end_date
                )
            )
        )
        
        result = await self.db.execute(query)
        row = result.first()
        
        summary = {
            'total_days': row.total_days or 0,
            'present_days': row.present_days or 0,
            'absent_days': row.absent_days or 0,
            'late_days': row.late_days or 0,
            'attendance_rate': (row.present_days / row.total_days * 100) if row.total_days > 0 else 0,
            'avg_hours_per_day': float(row.avg_hours_per_day) if row.avg_hours_per_day else 0
        }
        
        # Cache for 1 hour
        await cache_service.set(cache_key, json.dumps(summary), ttl=3600)
        
        return summary
    
    # ============================================
    # LEAVE QUERY OPTIMIZATIONS
    # ============================================
    
    async def get_leave_requests_with_employee_data(
        self,
        organization_id: str,
        status: Optional[str] = None,
        leave_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get leave requests with employee data in optimized query"""
        
        cache_key = f"leave_requests:org:{organization_id}:status:{status}:type:{leave_type}:limit:{limit}"
        cached_result = await cache_service.get(cache_key)
        if cached_result:
            return json.loads(cached_result)
        
        # Build query with joins
        query = (
            select(LeaveRequest)
            .join(Employee, LeaveRequest.employee_id == Employee.employee_id)
            .options(
                selectinload(LeaveRequest.employee).selectinload(Employee.user),
                selectinload(LeaveRequest.employee).selectinload(Employee.department)
            )
            .where(Employee.organization_id == organization_id)
            .order_by(LeaveRequest.created_at.desc())
            .limit(limit)
        )
        
        # Apply filters
        if status:
            query = query.where(LeaveRequest.status == status)
        if leave_type:
            query = query.where(LeaveRequest.leave_type == leave_type)
        if start_date:
            query = query.where(LeaveRequest.start_date >= start_date)
        if end_date:
            query = query.where(LeaveRequest.end_date <= end_date)
        
        result = await self.db.execute(query)
        leave_requests = result.scalars().all()
        
        # Convert to dict format
        leave_data = []
        for lr in leave_requests:
            leave_dict = {
                'leave_request_id': str(lr.leave_request_id),
                'employee_id': str(lr.employee_id),
                'employee_name': f"{lr.employee.first_name} {lr.employee.last_name}",
                'department': lr.employee.department.name if lr.employee.department else None,
                'leave_type': lr.leave_type,
                'start_date': lr.start_date.isoformat(),
                'end_date': lr.end_date.isoformat(),
                'days_requested': lr.days_requested,
                'status': lr.status,
                'reason': lr.reason,
                'created_at': lr.created_at.isoformat()
            }
            leave_data.append(leave_dict)
        
        # Cache for 10 minutes
        await cache_service.set(cache_key, json.dumps(leave_data), ttl=600)
        
        return leave_data
    
    # ============================================
    # PERFORMANCE QUERY OPTIMIZATIONS
    # ============================================
    
    async def get_performance_reviews_with_relations(
        self,
        organization_id: str,
        review_period_start: Optional[datetime] = None,
        review_period_end: Optional[datetime] = None,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get performance reviews with employee and reviewer data"""
        
        cache_key = f"performance_reviews:org:{organization_id}:period:{review_period_start}:{review_period_end}:status:{status}"
        cached_result = await cache_service.get(cache_key)
        if cached_result:
            return json.loads(cached_result)
        
        # Build optimized query
        query = (
            select(PerformanceReview)
            .join(Employee, PerformanceReview.employee_id == Employee.employee_id)
            .options(
                selectinload(PerformanceReview.employee).selectinload(Employee.user),
                selectinload(PerformanceReview.employee).selectinload(Employee.department),
                selectinload(PerformanceReview.reviewer).selectinload(Employee.user)
            )
            .where(Employee.organization_id == organization_id)
            .order_by(PerformanceReview.review_period_start.desc())
            .limit(limit)
        )
        
        # Apply filters
        if review_period_start:
            query = query.where(PerformanceReview.review_period_start >= review_period_start)
        if review_period_end:
            query = query.where(PerformanceReview.review_period_end <= review_period_end)
        if status:
            query = query.where(PerformanceReview.status == status)
        
        result = await self.db.execute(query)
        reviews = result.scalars().all()
        
        # Convert to dict format
        review_data = []
        for review in reviews:
            review_dict = {
                'review_id': str(review.review_id),
                'employee_id': str(review.employee_id),
                'employee_name': f"{review.employee.first_name} {review.employee.last_name}",
                'department': review.employee.department.name if review.employee.department else None,
                'reviewer_id': str(review.reviewer_id),
                'reviewer_name': f"{review.reviewer.first_name} {review.reviewer.last_name}",
                'review_period_start': review.review_period_start.isoformat(),
                'review_period_end': review.review_period_end.isoformat(),
                'overall_rating': review.overall_rating,
                'goals_achieved': review.goals_achieved,
                'status': review.status,
                'created_at': review.created_at.isoformat()
            }
            review_data.append(review_dict)
        
        # Cache for 15 minutes
        await cache_service.set(cache_key, json.dumps(review_data), ttl=900)
        
        return review_data
    
    # ============================================
    # PAYROLL QUERY OPTIMIZATIONS
    # ============================================
    
    async def get_payroll_summary_by_period(
        self,
        organization_id: str,
        pay_period_start: datetime,
        pay_period_end: datetime
    ) -> Dict[str, Any]:
        """Get payroll summary for a specific period"""
        
        cache_key = f"payroll:summary:org:{organization_id}:period:{pay_period_start.date()}:{pay_period_end.date()}"
        cached_result = await cache_service.get(cache_key)
        if cached_result:
            return json.loads(cached_result)
        
        # Single aggregated query
        query = (
            select(
                func.count(PayrollRecord.payroll_id).label('total_records'),
                func.sum(PayrollRecord.basic_salary).label('total_basic_salary'),
                func.sum(PayrollRecord.overtime_pay).label('total_overtime_pay'),
                func.sum(PayrollRecord.bonuses).label('total_bonuses'),
                func.sum(PayrollRecord.deductions).label('total_deductions'),
                func.sum(PayrollRecord.net_salary).label('total_net_salary'),
                func.avg(PayrollRecord.net_salary).label('avg_net_salary')
            )
            .join(Employee, PayrollRecord.employee_id == Employee.employee_id)
            .where(
                and_(
                    Employee.organization_id == organization_id,
                    PayrollRecord.pay_period_start >= pay_period_start,
                    PayrollRecord.pay_period_end <= pay_period_end
                )
            )
        )
        
        result = await self.db.execute(query)
        row = result.first()
        
        summary = {
            'total_records': row.total_records or 0,
            'total_basic_salary': float(row.total_basic_salary) if row.total_basic_salary else 0,
            'total_overtime_pay': float(row.total_overtime_pay) if row.total_overtime_pay else 0,
            'total_bonuses': float(row.total_bonuses) if row.total_bonuses else 0,
            'total_deductions': float(row.total_deductions) if row.total_deductions else 0,
            'total_net_salary': float(row.total_net_salary) if row.total_net_salary else 0,
            'avg_net_salary': float(row.avg_net_salary) if row.avg_net_salary else 0
        }
        
        # Cache for 1 hour
        await cache_service.set(cache_key, json.dumps(summary), ttl=3600)
        
        return summary
    
    # ============================================
    # RECRUITMENT QUERY OPTIMIZATIONS
    # ============================================
    
    async def get_recruitment_pipeline_data(
        self,
        organization_id: str,
        job_posting_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get recruitment pipeline data with candidate counts by status"""
        
        cache_key = f"recruitment:pipeline:org:{organization_id}:job:{job_posting_id}"
        cached_result = await cache_service.get(cache_key)
        if cached_result:
            return json.loads(cached_result)
        
        # Build query for pipeline data
        base_query = (
            select(Candidate)
            .join(JobPosting, Candidate.job_posting_id == JobPosting.job_posting_id)
            .where(JobPosting.organization_id == organization_id)
        )
        
        if job_posting_id:
            base_query = base_query.where(Candidate.job_posting_id == job_posting_id)
        
        # Get candidate counts by status
        status_query = (
            select(
                Candidate.status,
                func.count(Candidate.candidate_id).label('count')
            )
            .join(JobPosting, Candidate.job_posting_id == JobPosting.job_posting_id)
            .where(JobPosting.organization_id == organization_id)
            .group_by(Candidate.status)
        )
        
        if job_posting_id:
            status_query = status_query.where(Candidate.job_posting_id == job_posting_id)
        
        result = await self.db.execute(status_query)
        status_counts = {row.status: row.count for row in result}
        
        # Get recent candidates
        recent_candidates_query = (
            base_query
            .order_by(Candidate.created_at.desc())
            .limit(10)
        )
        
        result = await self.db.execute(recent_candidates_query)
        recent_candidates = result.scalars().all()
        
        pipeline_data = {
            'status_counts': status_counts,
            'total_candidates': sum(status_counts.values()),
            'recent_candidates': [
                {
                    'candidate_id': str(c.candidate_id),
                    'first_name': c.first_name,
                    'last_name': c.last_name,
                    'email': c.email,
                    'status': c.status,
                    'created_at': c.created_at.isoformat()
                }
                for c in recent_candidates
            ]
        }
        
        # Cache for 30 minutes
        await cache_service.set(cache_key, json.dumps(pipeline_data), ttl=1800)
        
        return pipeline_data
    
    # ============================================
    # ANALYTICS QUERY OPTIMIZATIONS
    # ============================================
    
    async def get_hr_analytics_dashboard(
        self,
        organization_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get comprehensive HR analytics dashboard data"""
        
        cache_key = f"analytics:dashboard:org:{organization_id}:{start_date.date()}:{end_date.date()}"
        cached_result = await cache_service.get(cache_key)
        if cached_result:
            return json.loads(cached_result)
        
        # Multiple optimized queries for dashboard data
        analytics_data = {}
        
        # Employee count by department
        dept_query = (
            select(
                Department.name,
                func.count(Employee.employee_id).label('count')
            )
            .join(Employee, Department.department_id == Employee.department_id)
            .where(Employee.organization_id == organization_id)
            .group_by(Department.name)
        )
        
        result = await self.db.execute(dept_query)
        analytics_data['employees_by_department'] = {
            row.name: row.count for row in result
        }
        
        # Attendance summary
        attendance_query = (
            select(
                func.count(Attendance.attendance_id).label('total_records'),
                func.count(func.case([(Attendance.status == 'PRESENT', 1)])).label('present_count'),
                func.count(func.case([(Attendance.status == 'ABSENT', 1)])).label('absent_count'),
                func.count(func.case([(Attendance.status == 'LATE', 1)])).label('late_count')
            )
            .join(Employee, Attendance.employee_id == Employee.employee_id)
            .where(
                and_(
                    Employee.organization_id == organization_id,
                    Attendance.date >= start_date,
                    Attendance.date <= end_date
                )
            )
        )
        
        result = await self.db.execute(attendance_query)
        row = result.first()
        analytics_data['attendance_summary'] = {
            'total_records': row.total_records or 0,
            'present_count': row.present_count or 0,
            'absent_count': row.absent_count or 0,
            'late_count': row.late_count or 0,
            'attendance_rate': (row.present_count / row.total_records * 100) if row.total_records > 0 else 0
        }
        
        # Leave requests summary
        leave_query = (
            select(
                LeaveRequest.leave_type,
                func.count(LeaveRequest.leave_request_id).label('count')
            )
            .join(Employee, LeaveRequest.employee_id == Employee.employee_id)
            .where(
                and_(
                    Employee.organization_id == organization_id,
                    LeaveRequest.start_date >= start_date,
                    LeaveRequest.end_date <= end_date
                )
            )
            .group_by(LeaveRequest.leave_type)
        )
        
        result = await self.db.execute(leave_query)
        analytics_data['leave_requests_by_type'] = {
            row.leave_type: row.count for row in result
        }
        
        # Performance reviews summary
        performance_query = (
            select(
                func.avg(PerformanceReview.overall_rating).label('avg_rating'),
                func.count(PerformanceReview.review_id).label('total_reviews')
            )
            .join(Employee, PerformanceReview.employee_id == Employee.employee_id)
            .where(
                and_(
                    Employee.organization_id == organization_id,
                    PerformanceReview.review_period_start >= start_date,
                    PerformanceReview.review_period_end <= end_date
                )
            )
        )
        
        result = await self.db.execute(performance_query)
        row = result.first()
        analytics_data['performance_summary'] = {
            'avg_rating': float(row.avg_rating) if row.avg_rating else 0,
            'total_reviews': row.total_reviews or 0
        }
        
        # Cache for 1 hour
        await cache_service.set(cache_key, json.dumps(analytics_data), ttl=3600)
        
        return analytics_data
    
    # ============================================
    # CACHE MANAGEMENT
    # ============================================
    
    async def invalidate_employee_cache(self, employee_id: str):
        """Invalidate cache for specific employee"""
        patterns = [
            f"employees:*employee:{employee_id}*",
            f"attendance:*employee:{employee_id}*",
            f"performance:*employee:{employee_id}*"
        ]
        
        for pattern in patterns:
            await cache_service.delete_pattern(pattern)
    
    async def invalidate_organization_cache(self, organization_id: str):
        """Invalidate cache for specific organization"""
        patterns = [
            f"*:org:{organization_id}:*",
            f"analytics:*org:{organization_id}*"
        ]
        
        for pattern in patterns:
            await cache_service.delete_pattern(pattern)
    
    async def clear_all_cache(self):
        """Clear all cached data"""
        await cache_service.flush_all()
        logger.info("All cache cleared")
