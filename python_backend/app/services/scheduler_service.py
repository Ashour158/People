"""
Scheduler Service
Enterprise-grade task scheduling for automated jobs
Handles leave accrual, reminders, birthday wishes, and periodic tasks
"""
import asyncio
from datetime import datetime, date, timedelta
from typing import Optional, Callable, Dict, Any, List
from uuid import UUID
import calendar

from celery import Celery
from celery.schedules import crontab
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func

from app.core.config import settings
from app.db.database import get_db
from app.models.models import (
    Employee, LeaveBalance, LeaveType, Organization,
    Company, Department, LeaveRequest, Payroll
)
from app.services.email_service import email_service
from app.services.notification_service import notification_service

logger = structlog.get_logger()

# Initialize Celery
celery_app = Celery(
    "hr_scheduler",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour
    task_soft_time_limit=3000,  # 50 minutes
)


class SchedulerService:
    """Enterprise task scheduler with monitoring and error handling"""
    
    def __init__(self):
        """Initialize scheduler service"""
        self.running_tasks: Dict[str, asyncio.Task] = {}
    
    async def start_scheduled_jobs(self):
        """Start all scheduled jobs"""
        logger.info("starting_scheduled_jobs")
        
        # Define schedule
        schedules = {
            "leave_accrual": self._schedule_leave_accrual,
            "birthday_wishes": self._schedule_birthday_wishes,
            "payroll_reminders": self._schedule_payroll_reminders,
            "probation_end_reminders": self._schedule_probation_reminders,
            "contract_renewal_reminders": self._schedule_contract_reminders,
            "leave_balance_alerts": self._schedule_leave_alerts,
            "attendance_anomalies": self._schedule_attendance_checks,
            "performance_review_reminders": self._schedule_performance_reminders,
            "workflow_escalations": self._schedule_workflow_escalations,
        }
        
        for name, schedule_func in schedules.items():
            task = asyncio.create_task(schedule_func())
            self.running_tasks[name] = task
            logger.info(f"scheduled_job_started", job=name)
    
    async def stop_scheduled_jobs(self):
        """Stop all scheduled jobs"""
        logger.info("stopping_scheduled_jobs")
        
        for name, task in self.running_tasks.items():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                logger.info(f"scheduled_job_stopped", job=name)
    
    async def _schedule_leave_accrual(self):
        """Run leave accrual on 1st of every month"""
        while True:
            try:
                now = datetime.now()
                # Calculate next run (1st of next month at 00:00)
                if now.day == 1 and now.hour == 0:
                    await self.accrue_leave_balances()
                    await asyncio.sleep(3600)  # Sleep 1 hour to avoid duplicate runs
                else:
                    # Calculate time until next 1st at 00:00
                    next_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                    if now.day >= 1:
                        next_month = (next_month + timedelta(days=32)).replace(day=1)
                    
                    sleep_seconds = (next_month - now).total_seconds()
                    await asyncio.sleep(sleep_seconds)
            except Exception as e:
                logger.error("leave_accrual_schedule_error", error=str(e))
                await asyncio.sleep(3600)  # Retry after 1 hour
    
    async def _schedule_birthday_wishes(self):
        """Send birthday wishes daily at 9 AM"""
        while True:
            try:
                now = datetime.now()
                # Run at 9 AM
                if now.hour == 9 and now.minute < 5:
                    await self.send_birthday_wishes()
                    await asyncio.sleep(300)  # Sleep 5 minutes
                else:
                    # Calculate time until next 9 AM
                    next_run = now.replace(hour=9, minute=0, second=0, microsecond=0)
                    if now.hour >= 9:
                        next_run += timedelta(days=1)
                    
                    sleep_seconds = (next_run - now).total_seconds()
                    await asyncio.sleep(sleep_seconds)
            except Exception as e:
                logger.error("birthday_wishes_schedule_error", error=str(e))
                await asyncio.sleep(3600)
    
    async def _schedule_payroll_reminders(self):
        """Send payroll reminders 5 days before month end"""
        while True:
            try:
                now = datetime.now()
                # Run on 25th of every month at 9 AM
                if now.day == 25 and now.hour == 9:
                    await self.send_payroll_reminders()
                    await asyncio.sleep(3600)
                else:
                    # Calculate next 25th
                    next_run = now.replace(day=25, hour=9, minute=0, second=0, microsecond=0)
                    if now.day >= 25:
                        next_month = (now.replace(day=1) + timedelta(days=32)).replace(day=1)
                        next_run = next_month.replace(day=25, hour=9, minute=0, second=0, microsecond=0)
                    
                    sleep_seconds = (next_run - now).total_seconds()
                    await asyncio.sleep(sleep_seconds)
            except Exception as e:
                logger.error("payroll_reminders_schedule_error", error=str(e))
                await asyncio.sleep(3600)
    
    async def _schedule_probation_reminders(self):
        """Send probation end reminders 7 days before"""
        while True:
            try:
                await self.send_probation_reminders()
                await asyncio.sleep(86400)  # Daily check
            except Exception as e:
                logger.error("probation_reminders_schedule_error", error=str(e))
                await asyncio.sleep(3600)
    
    async def _schedule_contract_reminders(self):
        """Send contract renewal reminders 30 days before"""
        while True:
            try:
                await self.send_contract_reminders()
                await asyncio.sleep(86400)  # Daily check
            except Exception as e:
                logger.error("contract_reminders_schedule_error", error=str(e))
                await asyncio.sleep(3600)
    
    async def _schedule_leave_alerts(self):
        """Send leave balance alerts weekly"""
        while True:
            try:
                await self.send_leave_balance_alerts()
                await asyncio.sleep(604800)  # Weekly (7 days)
            except Exception as e:
                logger.error("leave_alerts_schedule_error", error=str(e))
                await asyncio.sleep(3600)
    
    async def _schedule_attendance_checks(self):
        """Check for attendance anomalies daily"""
        while True:
            try:
                await self.check_attendance_anomalies()
                await asyncio.sleep(86400)  # Daily
            except Exception as e:
                logger.error("attendance_checks_schedule_error", error=str(e))
                await asyncio.sleep(3600)
    
    async def _schedule_performance_reminders(self):
        """Send performance review reminders"""
        while True:
            try:
                await self.send_performance_reminders()
                await asyncio.sleep(86400)  # Daily check
            except Exception as e:
                logger.error("performance_reminders_schedule_error", error=str(e))
                await asyncio.sleep(3600)
    
    async def _schedule_workflow_escalations(self):
        """Check and escalate overdue workflow approvals every 15 minutes"""
        while True:
            try:
                await self.check_workflow_escalations()
                await asyncio.sleep(900)  # Every 15 minutes
            except Exception as e:
                logger.error("workflow_escalations_schedule_error", error=str(e))
                await asyncio.sleep(3600)  # Retry after 1 hour on error
    
    async def accrue_leave_balances(self):
        """
        Accrue leave balances for all active employees
        Runs on 1st of every month
        """
        try:
            logger.info("starting_leave_accrual")
            
            async for db in get_db():
                # Get all active employees
                result = await db.execute(
                    select(Employee).where(
                        and_(
                            Employee.employment_status == "active",
                            Employee.is_deleted == False
                        )
                    )
                )
                employees = result.scalars().all()
                
                accrued_count = 0
                for employee in employees:
                    try:
                        # Get leave types for this organization
                        leave_types_result = await db.execute(
                            select(LeaveType).where(
                                and_(
                                    LeaveType.organization_id == employee.organization_id,
                                    LeaveType.is_active == True
                                )
                            )
                        )
                        leave_types = leave_types_result.scalars().all()
                        
                        for leave_type in leave_types:
                            if not leave_type.is_accrual_enabled:
                                continue
                            
                            # Calculate monthly accrual
                            monthly_accrual = leave_type.annual_quota / 12 if leave_type.annual_quota else 0
                            
                            # Get or create leave balance
                            balance_result = await db.execute(
                                select(LeaveBalance).where(
                                    and_(
                                        LeaveBalance.employee_id == employee.employee_id,
                                        LeaveBalance.leave_type_id == leave_type.leave_type_id,
                                        LeaveBalance.year == datetime.now().year
                                    )
                                )
                            )
                            balance = balance_result.scalar_one_or_none()
                            
                            if balance:
                                # Update existing balance
                                balance.balance += monthly_accrual
                                balance.accrued += monthly_accrual
                                balance.modified_at = datetime.now()
                            else:
                                # Create new balance
                                balance = LeaveBalance(
                                    employee_id=employee.employee_id,
                                    leave_type_id=leave_type.leave_type_id,
                                    organization_id=employee.organization_id,
                                    year=datetime.now().year,
                                    balance=monthly_accrual,
                                    accrued=monthly_accrual,
                                    used=0,
                                    carried_forward=0
                                )
                                db.add(balance)
                            
                            accrued_count += 1
                        
                        await db.commit()
                        
                    except Exception as e:
                        logger.error(
                            "employee_leave_accrual_failed",
                            employee_id=str(employee.employee_id),
                            error=str(e)
                        )
                        await db.rollback()
                
                logger.info(
                    "leave_accrual_completed",
                    total_employees=len(employees),
                    total_accruals=accrued_count
                )
                
        except Exception as e:
            logger.error("leave_accrual_failed", error=str(e))
            raise
    
    async def send_birthday_wishes(self):
        """Send birthday wishes to employees"""
        try:
            logger.info("sending_birthday_wishes")
            
            async for db in get_db():
                today = date.today()
                
                # Get employees with birthdays today
                result = await db.execute(
                    select(Employee).where(
                        and_(
                            Employee.employment_status == "active",
                            Employee.is_deleted == False,
                            func.extract('month', Employee.date_of_birth) == today.month,
                            func.extract('day', Employee.date_of_birth) == today.day
                        )
                    )
                )
                employees = result.scalars().all()
                
                sent_count = 0
                for employee in employees:
                    try:
                        # Send email
                        await email_service.send_birthday_wish(
                            to_email=employee.work_email,
                            employee_name=f"{employee.first_name} {employee.last_name}"
                        )
                        
                        # Send notification
                        await notification_service.send_notification(
                            user_id=employee.employee_id,
                            title="Happy Birthday! 🎉",
                            message=f"Wishing you a wonderful birthday, {employee.first_name}!",
                            notification_type="birthday"
                        )
                        
                        sent_count += 1
                        
                    except Exception as e:
                        logger.error(
                            "birthday_wish_failed",
                            employee_id=str(employee.employee_id),
                            error=str(e)
                        )
                
                logger.info(
                    "birthday_wishes_sent",
                    total_birthdays=len(employees),
                    sent=sent_count
                )
                
        except Exception as e:
            logger.error("birthday_wishes_failed", error=str(e))
    
    async def send_payroll_reminders(self):
        """Send payroll processing reminders to HR"""
        try:
            logger.info("sending_payroll_reminders")
            
            async for db in get_db():
                # Get all organizations
                result = await db.execute(
                    select(Organization).where(Organization.is_active == True)
                )
                organizations = result.scalars().all()
                
                for org in organizations:
                    try:
                        # Get HR admins for this organization
                        hr_result = await db.execute(
                            select(Employee).where(
                                and_(
                                    Employee.organization_id == org.organization_id,
                                    Employee.employment_status == "active",
                                    Employee.role.in_(["hr_admin", "super_admin"])
                                )
                            )
                        )
                        hr_admins = hr_result.scalars().all()
                        
                        for admin in hr_admins:
                            await email_service.send_payroll_reminder(
                                to_email=admin.work_email,
                                admin_name=f"{admin.first_name} {admin.last_name}",
                                organization_name=org.organization_name,
                                month=datetime.now().strftime("%B %Y")
                            )
                        
                    except Exception as e:
                        logger.error(
                            "payroll_reminder_failed",
                            organization_id=str(org.organization_id),
                            error=str(e)
                        )
                
                logger.info("payroll_reminders_sent", organizations=len(organizations))
                
        except Exception as e:
            logger.error("payroll_reminders_failed", error=str(e))
    
    async def send_probation_reminders(self):
        """Send probation end reminders"""
        try:
            async for db in get_db():
                # Get employees ending probation in next 7 days
                target_date = date.today() + timedelta(days=7)
                
                result = await db.execute(
                    select(Employee).where(
                        and_(
                            Employee.employment_status == "active",
                            Employee.probation_end_date == target_date
                        )
                    )
                )
                employees = result.scalars().all()
                
                for employee in employees:
                    # Notify HR
                    hr_result = await db.execute(
                        select(Employee).where(
                            and_(
                                Employee.organization_id == employee.organization_id,
                                Employee.role.in_(["hr_admin", "super_admin"])
                            )
                        )
                    )
                    hr_admins = hr_result.scalars().all()
                    
                    for admin in hr_admins:
                        await notification_service.send_notification(
                            user_id=admin.employee_id,
                            title="Probation Ending Soon",
                            message=f"{employee.first_name} {employee.last_name}'s probation ends on {target_date}",
                            notification_type="reminder"
                        )
                
                logger.info("probation_reminders_sent", count=len(employees))
                
        except Exception as e:
            logger.error("probation_reminders_failed", error=str(e))
    
    async def send_contract_reminders(self):
        """Send contract renewal reminders 30 days before expiry"""
        try:
            async for db in get_db():
                target_date = date.today() + timedelta(days=30)
                
                result = await db.execute(
                    select(Employee).where(
                        and_(
                            Employee.employment_status == "active",
                            Employee.contract_end_date == target_date
                        )
                    )
                )
                employees = result.scalars().all()
                
                for employee in employees:
                    # Notify HR
                    hr_result = await db.execute(
                        select(Employee).where(
                            and_(
                                Employee.organization_id == employee.organization_id,
                                Employee.role.in_(["hr_admin", "super_admin"])
                            )
                        )
                    )
                    hr_admins = hr_result.scalars().all()
                    
                    for admin in hr_admins:
                        await notification_service.send_notification(
                            user_id=admin.employee_id,
                            title="Contract Renewal Due",
                            message=f"{employee.first_name} {employee.last_name}'s contract expires on {target_date}",
                            notification_type="reminder"
                        )
                
                logger.info("contract_reminders_sent", count=len(employees))
                
        except Exception as e:
            logger.error("contract_reminders_failed", error=str(e))
    
    async def send_leave_balance_alerts(self):
        """Send leave balance alerts for low balances"""
        try:
            async for db in get_db():
                # Get balances below threshold
                result = await db.execute(
                    select(LeaveBalance, Employee).join(
                        Employee, LeaveBalance.employee_id == Employee.employee_id
                    ).where(
                        and_(
                            LeaveBalance.balance < 5,  # Less than 5 days
                            LeaveBalance.year == datetime.now().year,
                            Employee.employment_status == "active"
                        )
                    )
                )
                records = result.all()
                
                for balance, employee in records:
                    await notification_service.send_notification(
                        user_id=employee.employee_id,
                        title="Low Leave Balance",
                        message=f"Your leave balance is low: {balance.balance} days remaining",
                        notification_type="alert"
                    )
                
                logger.info("leave_balance_alerts_sent", count=len(records))
                
        except Exception as e:
            logger.error("leave_balance_alerts_failed", error=str(e))
    
    async def check_attendance_anomalies(self):
        """Check for attendance anomalies and alert HR"""
        # Implementation for attendance pattern analysis
        logger.info("checking_attendance_anomalies")
    
    async def send_performance_reminders(self):
        """Send performance review reminders"""
        # Implementation for performance review reminders
        logger.info("sending_performance_reminders")
    
    async def check_workflow_escalations(self):
        """Check and escalate overdue workflow approvals"""
        try:
            logger.info("checking_workflow_escalations")
            
            # Import here to avoid circular dependency
            from app.services.workflow_escalation_service import workflow_escalation_service
            
            # Run the escalation check
            result = await workflow_escalation_service.check_and_escalate_workflows()
            
            logger.info(
                "workflow_escalations_completed",
                total_checked=result.get("total_checked", 0),
                escalated=result.get("escalated", 0),
                reminded=result.get("reminded", 0)
            )
            
        except Exception as e:
            logger.error("workflow_escalations_failed", error=str(e))


# Singleton instance
scheduler_service = SchedulerService()


# Celery Tasks
@celery_app.task(name="tasks.accrue_leave_balances")
def accrue_leave_balances_task():
    """Celery task for leave accrual"""
    asyncio.run(scheduler_service.accrue_leave_balances())


@celery_app.task(name="tasks.send_birthday_wishes")
def send_birthday_wishes_task():
    """Celery task for birthday wishes"""
    asyncio.run(scheduler_service.send_birthday_wishes())


@celery_app.task(name="tasks.send_payroll_reminders")
def send_payroll_reminders_task():
    """Celery task for payroll reminders"""
    asyncio.run(scheduler_service.send_payroll_reminders())


@celery_app.task(name="tasks.check_workflow_escalations")
def check_workflow_escalations_task():
    """Celery task for checking workflow escalations"""
    asyncio.run(scheduler_service.check_workflow_escalations())


# Celery Beat Schedule
celery_app.conf.beat_schedule = {
    'accrue-leave-monthly': {
        'task': 'tasks.accrue_leave_balances',
        'schedule': crontab(day_of_month='1', hour='0', minute='0'),
    },
    'send-birthday-wishes-daily': {
        'task': 'tasks.send_birthday_wishes',
        'schedule': crontab(hour='9', minute='0'),
    },
    'send-payroll-reminders-monthly': {
        'task': 'tasks.send_payroll_reminders',
        'schedule': crontab(day_of_month='25', hour='9', minute='0'),
    },
    'check-workflow-escalations': {
        'task': 'tasks.check_workflow_escalations',
        'schedule': crontab(minute='*/15'),  # Every 15 minutes
    },
}
