"""
Advanced Reporting and Analytics Service
Enterprise reporting with custom report builder, scheduled reports, and advanced analytics
"""
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
from uuid import UUID
import json

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, text
import pandas as pd
import numpy as np

from app.core.config import settings
from app.services.pdf_service import pdf_service
from app.services.export_service import export_service
from app.services.email_service import email_service

logger = structlog.get_logger()


class ReportingService:
    """Enterprise reporting and analytics service"""
    
    def __init__(self):
        """Initialize reporting service"""
        self.supported_report_types = [
            "employee", "attendance", "leave", "payroll", "performance",
            "recruitment", "turnover", "demographics", "custom"
        ]
    
    async def build_custom_report(
        self,
        db: AsyncSession,
        organization_id: UUID,
        report_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Build custom report based on configuration
        
        Args:
            db: Database session
            organization_id: Organization UUID
            report_config: Report configuration
            
        Returns:
            Report data and metadata
        """
        try:
            report_type = report_config.get("report_type")
            filters = report_config.get("filters", {})
            columns = report_config.get("columns", [])
            aggregations = report_config.get("aggregations", [])
            group_by = report_config.get("group_by", [])
            
            # Build query based on report type
            if report_type == "employee":
                data = await self._build_employee_report(db, organization_id, filters, columns)
            elif report_type == "attendance":
                data = await self._build_attendance_report(db, organization_id, filters, columns)
            elif report_type == "leave":
                data = await self._build_leave_report(db, organization_id, filters, columns)
            elif report_type == "payroll":
                data = await self._build_payroll_report(db, organization_id, filters, columns)
            elif report_type == "performance":
                data = await self._build_performance_report(db, organization_id, filters, columns)
            elif report_type == "custom":
                data = await self._execute_custom_query(db, organization_id, report_config)
            else:
                raise ValueError(f"Unsupported report type: {report_type}")
            
            # Apply aggregations if specified
            if aggregations and data:
                data = await self._apply_aggregations(data, aggregations, group_by)
            
            logger.info(
                "custom_report_built",
                organization_id=str(organization_id),
                report_type=report_type,
                rows=len(data) if data else 0
            )
            
            return {
                "report_type": report_type,
                "data": data,
                "total_rows": len(data) if data else 0,
                "generated_at": datetime.now().isoformat(),
                "filters": filters
            }
            
        except Exception as e:
            logger.error("custom_report_build_failed", error=str(e))
            raise
    
    async def _build_employee_report(
        self,
        db: AsyncSession,
        organization_id: UUID,
        filters: Dict[str, Any],
        columns: List[str]
    ) -> List[Dict[str, Any]]:
        """Build employee report"""
        from app.models.models import Employee, Department, Company
        
        query = select(Employee).where(
            and_(
                Employee.organization_id == organization_id,
                Employee.is_deleted == False
            )
        )
        
        # Apply filters
        if filters.get("department_id"):
            query = query.where(Employee.department_id == filters["department_id"])
        
        if filters.get("employment_status"):
            query = query.where(Employee.employment_status == filters["employment_status"])
        
        if filters.get("employment_type"):
            query = query.where(Employee.employment_type == filters["employment_type"])
        
        result = await db.execute(query)
        employees = result.scalars().all()
        
        # Convert to dict
        data = []
        for emp in employees:
            row = {
                "employee_code": emp.employee_code,
                "full_name": f"{emp.first_name} {emp.last_name}",
                "email": emp.work_email,
                "designation": emp.designation,
                "employment_status": emp.employment_status,
                "date_of_joining": emp.date_of_joining,
            }
            data.append(row)
        
        return data
    
    async def _build_attendance_report(
        self,
        db: AsyncSession,
        organization_id: UUID,
        filters: Dict[str, Any],
        columns: List[str]
    ) -> List[Dict[str, Any]]:
        """Build attendance report"""
        from app.models.models import AttendanceLog, Employee
        
        start_date = filters.get("start_date", date.today() - timedelta(days=30))
        end_date = filters.get("end_date", date.today())
        
        query = select(AttendanceLog, Employee).join(
            Employee, AttendanceLog.employee_id == Employee.employee_id
        ).where(
            and_(
                AttendanceLog.organization_id == organization_id,
                AttendanceLog.attendance_date >= start_date,
                AttendanceLog.attendance_date <= end_date
            )
        )
        
        result = await db.execute(query)
        records = result.all()
        
        data = []
        for attendance, employee in records:
            row = {
                "employee_code": employee.employee_code,
                "employee_name": f"{employee.first_name} {employee.last_name}",
                "date": attendance.attendance_date,
                "check_in": attendance.check_in_time,
                "check_out": attendance.check_out_time,
                "total_hours": attendance.total_hours,
                "status": attendance.status,
                "late_minutes": attendance.late_minutes,
            }
            data.append(row)
        
        return data
    
    async def _build_leave_report(
        self,
        db: AsyncSession,
        organization_id: UUID,
        filters: Dict[str, Any],
        columns: List[str]
    ) -> List[Dict[str, Any]]:
        """Build leave report"""
        from app.models.models import LeaveRequest, Employee, LeaveType
        
        year = filters.get("year", datetime.now().year)
        
        query = select(LeaveRequest, Employee, LeaveType).join(
            Employee, LeaveRequest.employee_id == Employee.employee_id
        ).join(
            LeaveType, LeaveRequest.leave_type_id == LeaveType.leave_type_id
        ).where(
            and_(
                LeaveRequest.organization_id == organization_id,
                func.extract('year', LeaveRequest.start_date) == year
            )
        )
        
        result = await db.execute(query)
        records = result.all()
        
        data = []
        for leave, employee, leave_type in records:
            row = {
                "employee_code": employee.employee_code,
                "employee_name": f"{employee.first_name} {employee.last_name}",
                "leave_type": leave_type.leave_type_name,
                "start_date": leave.start_date,
                "end_date": leave.end_date,
                "days": leave.days,
                "status": leave.status,
                "reason": leave.reason,
            }
            data.append(row)
        
        return data
    
    async def _build_payroll_report(
        self,
        db: AsyncSession,
        organization_id: UUID,
        filters: Dict[str, Any],
        columns: List[str]
    ) -> List[Dict[str, Any]]:
        """Build payroll report"""
        from app.models.models import Payroll, Employee
        
        month = filters.get("month", datetime.now().month)
        year = filters.get("year", datetime.now().year)
        
        query = select(Payroll, Employee).join(
            Employee, Payroll.employee_id == Employee.employee_id
        ).where(
            and_(
                Payroll.organization_id == organization_id,
                Payroll.month == month,
                Payroll.year == year
            )
        )
        
        result = await db.execute(query)
        records = result.all()
        
        data = []
        for payroll, employee in records:
            row = {
                "employee_code": employee.employee_code,
                "employee_name": f"{employee.first_name} {employee.last_name}",
                "basic_salary": payroll.basic_salary,
                "allowances": payroll.allowances,
                "deductions": payroll.deductions,
                "gross_salary": payroll.gross_salary,
                "net_salary": payroll.net_salary,
                "payment_status": payroll.payment_status,
            }
            data.append(row)
        
        return data
    
    async def _build_performance_report(
        self,
        db: AsyncSession,
        organization_id: UUID,
        filters: Dict[str, Any],
        columns: List[str]
    ) -> List[Dict[str, Any]]:
        """Build performance report"""
        # Placeholder for performance report
        return []
    
    async def _execute_custom_query(
        self,
        db: AsyncSession,
        organization_id: UUID,
        report_config: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Execute custom SQL query (with safety checks)"""
        # This is a placeholder - in production, implement proper query validation
        # and security measures to prevent SQL injection
        raise NotImplementedError("Custom queries not yet implemented")
    
    async def _apply_aggregations(
        self,
        data: List[Dict[str, Any]],
        aggregations: List[Dict[str, str]],
        group_by: List[str]
    ) -> List[Dict[str, Any]]:
        """Apply aggregations to data"""
        try:
            if not data:
                return data
            
            # Convert to pandas DataFrame
            df = pd.DataFrame(data)
            
            if group_by:
                # Group and aggregate
                agg_dict = {}
                for agg in aggregations:
                    column = agg.get("column")
                    function = agg.get("function", "sum")
                    
                    if column in df.columns:
                        agg_dict[column] = function
                
                if agg_dict:
                    df = df.groupby(group_by).agg(agg_dict).reset_index()
            
            # Convert back to list of dicts
            return df.to_dict('records')
            
        except Exception as e:
            logger.error("aggregation_failed", error=str(e))
            return data
    
    async def schedule_report(
        self,
        db: AsyncSession,
        organization_id: UUID,
        report_config: Dict[str, Any],
        schedule_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Schedule report for automatic generation and delivery
        
        Args:
            db: Database session
            organization_id: Organization UUID
            report_config: Report configuration
            schedule_config: Schedule configuration (frequency, recipients, format)
            
        Returns:
            Schedule metadata
        """
        try:
            # Store schedule in database (implementation depends on your models)
            schedule = {
                "report_id": str(UUID()),
                "organization_id": str(organization_id),
                "report_config": report_config,
                "frequency": schedule_config.get("frequency", "monthly"),
                "recipients": schedule_config.get("recipients", []),
                "format": schedule_config.get("format", "pdf"),
                "next_run": self._calculate_next_run(schedule_config.get("frequency")),
                "is_active": True,
                "created_at": datetime.now().isoformat()
            }
            
            logger.info(
                "report_scheduled",
                organization_id=str(organization_id),
                frequency=schedule["frequency"]
            )
            
            return schedule
            
        except Exception as e:
            logger.error("report_scheduling_failed", error=str(e))
            raise
    
    def _calculate_next_run(self, frequency: str) -> datetime:
        """Calculate next report run time"""
        now = datetime.now()
        
        if frequency == "daily":
            return now + timedelta(days=1)
        elif frequency == "weekly":
            return now + timedelta(weeks=1)
        elif frequency == "monthly":
            # Next month, same day
            if now.month == 12:
                return now.replace(year=now.year + 1, month=1)
            else:
                return now.replace(month=now.month + 1)
        elif frequency == "quarterly":
            return now + timedelta(days=90)
        else:
            return now + timedelta(days=30)
    
    async def generate_and_send_report(
        self,
        db: AsyncSession,
        organization_id: UUID,
        report_config: Dict[str, Any],
        recipients: List[str],
        format: str = "pdf"
    ):
        """
        Generate report and send to recipients
        
        Args:
            db: Database session
            organization_id: Organization UUID
            report_config: Report configuration
            recipients: List of email addresses
            format: Export format (pdf, excel, csv)
        """
        try:
            # Build report
            report_data = await self.build_custom_report(db, organization_id, report_config)
            
            # Generate file
            if format == "pdf":
                file_content = await pdf_service.generate_custom_report_pdf(
                    db,
                    organization_id,
                    report_config,
                    report_data["data"]
                )
                filename = f"report_{datetime.now().strftime('%Y%m%d')}.pdf"
                content_type = "application/pdf"
            
            elif format == "excel":
                file_content = await export_service.export_to_excel(
                    report_data["data"],
                    sheet_name=report_config.get("title", "Report")
                )
                filename = f"report_{datetime.now().strftime('%Y%m%d')}.xlsx"
                content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            
            elif format == "csv":
                file_content = await export_service.export_to_csv(report_data["data"])
                filename = f"report_{datetime.now().strftime('%Y%m%d')}.csv"
                content_type = "text/csv"
            
            else:
                raise ValueError(f"Unsupported format: {format}")
            
            # Send email to recipients
            for recipient in recipients:
                await email_service.send_report(
                    to_email=recipient,
                    report_title=report_config.get("title", "Scheduled Report"),
                    report_data=file_content,
                    filename=filename,
                    content_type=content_type
                )
            
            logger.info(
                "report_generated_and_sent",
                organization_id=str(organization_id),
                recipients=len(recipients),
                format=format
            )
            
        except Exception as e:
            logger.error("report_generation_and_send_failed", error=str(e))
            raise
    
    async def get_analytics_dashboard(
        self,
        db: AsyncSession,
        organization_id: UUID,
        period: str = "month"
    ) -> Dict[str, Any]:
        """
        Get analytics dashboard with KPIs and trends
        
        Args:
            db: Database session
            organization_id: Organization UUID
            period: Time period (week, month, quarter, year)
            
        Returns:
            Dashboard data with KPIs
        """
        try:
            from app.models.models import Employee, AttendanceLog, LeaveRequest
            
            # Calculate date range
            end_date = date.today()
            if period == "week":
                start_date = end_date - timedelta(days=7)
            elif period == "month":
                start_date = end_date - timedelta(days=30)
            elif period == "quarter":
                start_date = end_date - timedelta(days=90)
            elif period == "year":
                start_date = end_date - timedelta(days=365)
            else:
                start_date = end_date - timedelta(days=30)
            
            # Employee count
            emp_count_result = await db.execute(
                select(func.count(Employee.employee_id)).where(
                    and_(
                        Employee.organization_id == organization_id,
                        Employee.employment_status == "active",
                        Employee.is_deleted == False
                    )
                )
            )
            total_employees = emp_count_result.scalar() or 0
            
            # Attendance rate
            attendance_result = await db.execute(
                select(
                    func.count(AttendanceLog.attendance_id),
                    func.sum(func.case((AttendanceLog.status == "present", 1), else_=0))
                ).where(
                    and_(
                        AttendanceLog.organization_id == organization_id,
                        AttendanceLog.attendance_date >= start_date,
                        AttendanceLog.attendance_date <= end_date
                    )
                )
            )
            attendance_stats = attendance_result.first()
            total_attendance = attendance_stats[0] or 0
            present_count = attendance_stats[1] or 0
            attendance_rate = (present_count / total_attendance * 100) if total_attendance > 0 else 0
            
            # Leave statistics
            leave_result = await db.execute(
                select(
                    func.count(LeaveRequest.leave_request_id),
                    func.sum(func.case((LeaveRequest.status == "approved", 1), else_=0))
                ).where(
                    and_(
                        LeaveRequest.organization_id == organization_id,
                        LeaveRequest.start_date >= start_date
                    )
                )
            )
            leave_stats = leave_result.first()
            total_leaves = leave_stats[0] or 0
            approved_leaves = leave_stats[1] or 0
            
            dashboard = {
                "organization_id": str(organization_id),
                "period": period,
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                },
                "kpis": {
                    "total_employees": total_employees,
                    "attendance_rate": round(attendance_rate, 2),
                    "total_leave_requests": total_leaves,
                    "approved_leaves": approved_leaves,
                },
                "generated_at": datetime.now().isoformat()
            }
            
            logger.info("analytics_dashboard_generated", organization_id=str(organization_id))
            
            return dashboard
            
        except Exception as e:
            logger.error("analytics_dashboard_failed", error=str(e))
            raise


# Singleton instance
reporting_service = ReportingService()
