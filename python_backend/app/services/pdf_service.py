"""
PDF Generation Service
Handles PDF generation for payslips, reports, documents, and exports
Enterprise-grade implementation with templates and customization
"""
import asyncio
import base64
import io
from datetime import datetime, date
from typing import Optional, Dict, Any, List, BinaryIO
from pathlib import Path
from uuid import UUID

from weasyprint import HTML, CSS
from jinja2 import Environment, FileSystemLoader, select_autoescape
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.models import Employee, Organization, Company, Department

logger = structlog.get_logger()


class PDFService:
    """Enterprise PDF generation service with template support"""
    
    def __init__(self):
        """Initialize PDF service with Jinja2 template engine"""
        self.template_dir = Path(__file__).parent.parent / "templates" / "pdf"
        self.template_dir.mkdir(parents=True, exist_ok=True)
        
        self.env = Environment(
            loader=FileSystemLoader(str(self.template_dir)),
            autoescape=select_autoescape(['html', 'xml'])
        )
        
        # Register custom filters
        self.env.filters['format_currency'] = self._format_currency
        self.env.filters['format_date'] = self._format_date
        self.env.filters['format_number'] = self._format_number
    
    @staticmethod
    def _format_currency(value: float, currency: str = "USD") -> str:
        """Format currency with symbol"""
        symbols = {
            "USD": "$", "EUR": "€", "GBP": "£", "INR": "₹",
            "AED": "AED", "SAR": "SAR", "QAR": "QAR"
        }
        symbol = symbols.get(currency, currency)
        return f"{symbol}{value:,.2f}"
    
    @staticmethod
    def _format_date(value, format_str: str = "%Y-%m-%d") -> str:
        """Format date"""
        if isinstance(value, (datetime, date)):
            return value.strftime(format_str)
        return str(value)
    
    @staticmethod
    def _format_number(value: float, decimals: int = 2) -> str:
        """Format number with decimals"""
        return f"{value:,.{decimals}f}"
    
    async def generate_payslip_pdf(
        self,
        db: AsyncSession,
        employee_id: UUID,
        month: str,
        year: int,
        payroll_data: Dict[str, Any]
    ) -> bytes:
        """
        Generate payslip PDF for an employee
        
        Args:
            db: Database session
            employee_id: Employee UUID
            month: Month name
            year: Year
            payroll_data: Payroll calculation data
            
        Returns:
            PDF bytes
        """
        try:
            # Fetch employee data
            employee = await db.get(Employee, employee_id)
            if not employee:
                raise ValueError(f"Employee {employee_id} not found")
            
            # Fetch organization and company
            organization = await db.get(Organization, employee.organization_id)
            company = await db.get(Company, employee.company_id)
            department = await db.get(Department, employee.department_id) if employee.department_id else None
            
            # Prepare template context
            context = {
                "employee": {
                    "employee_code": employee.employee_code,
                    "full_name": f"{employee.first_name} {employee.last_name}",
                    "designation": employee.designation,
                    "department": department.department_name if department else "N/A",
                    "date_of_joining": employee.date_of_joining,
                    "bank_account": employee.bank_account_number,
                },
                "organization": {
                    "name": organization.organization_name,
                    "logo": organization.logo_url,
                    "address": organization.address,
                    "contact": organization.contact_email,
                },
                "company": {
                    "name": company.company_name if company else organization.organization_name,
                },
                "payroll": payroll_data,
                "period": {
                    "month": month,
                    "year": year,
                    "generated_date": datetime.now(),
                },
            }
            
            # Render HTML from template
            template = self.env.get_template("payslip.html")
            html_content = template.render(**context)
            
            # Generate PDF
            pdf_bytes = await self._html_to_pdf(html_content)
            
            logger.info(
                "payslip_generated",
                employee_id=str(employee_id),
                month=month,
                year=year,
                size_kb=len(pdf_bytes) / 1024
            )
            
            return pdf_bytes
            
        except Exception as e:
            logger.error("payslip_generation_failed", error=str(e), employee_id=str(employee_id))
            raise
    
    async def generate_employee_report_pdf(
        self,
        db: AsyncSession,
        organization_id: UUID,
        report_data: List[Dict[str, Any]],
        report_title: str,
        filters: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """
        Generate employee report PDF
        
        Args:
            db: Database session
            organization_id: Organization UUID
            report_data: List of employee data dictionaries
            report_title: Report title
            filters: Applied filters
            
        Returns:
            PDF bytes
        """
        try:
            organization = await db.get(Organization, organization_id)
            
            context = {
                "organization": {
                    "name": organization.organization_name,
                    "logo": organization.logo_url,
                },
                "report": {
                    "title": report_title,
                    "generated_date": datetime.now(),
                    "total_records": len(report_data),
                    "filters": filters or {},
                },
                "data": report_data,
            }
            
            template = self.env.get_template("employee_report.html")
            html_content = template.render(**context)
            
            pdf_bytes = await self._html_to_pdf(html_content)
            
            logger.info(
                "employee_report_generated",
                organization_id=str(organization_id),
                records=len(report_data),
                size_kb=len(pdf_bytes) / 1024
            )
            
            return pdf_bytes
            
        except Exception as e:
            logger.error("employee_report_generation_failed", error=str(e))
            raise
    
    async def generate_attendance_report_pdf(
        self,
        db: AsyncSession,
        organization_id: UUID,
        attendance_data: List[Dict[str, Any]],
        start_date: date,
        end_date: date,
        filters: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """
        Generate attendance report PDF
        
        Args:
            db: Database session
            organization_id: Organization UUID
            attendance_data: Attendance records
            start_date: Report start date
            end_date: Report end date
            filters: Applied filters
            
        Returns:
            PDF bytes
        """
        try:
            organization = await db.get(Organization, organization_id)
            
            # Calculate summary statistics
            total_present = sum(1 for r in attendance_data if r.get("status") == "present")
            total_absent = sum(1 for r in attendance_data if r.get("status") == "absent")
            total_late = sum(1 for r in attendance_data if r.get("late_minutes", 0) > 0)
            
            context = {
                "organization": {
                    "name": organization.organization_name,
                    "logo": organization.logo_url,
                },
                "report": {
                    "title": "Attendance Report",
                    "start_date": start_date,
                    "end_date": end_date,
                    "generated_date": datetime.now(),
                    "total_records": len(attendance_data),
                    "filters": filters or {},
                },
                "summary": {
                    "total_present": total_present,
                    "total_absent": total_absent,
                    "total_late": total_late,
                    "attendance_rate": (total_present / len(attendance_data) * 100) if attendance_data else 0,
                },
                "data": attendance_data,
            }
            
            template = self.env.get_template("attendance_report.html")
            html_content = template.render(**context)
            
            pdf_bytes = await self._html_to_pdf(html_content)
            
            logger.info(
                "attendance_report_generated",
                organization_id=str(organization_id),
                records=len(attendance_data),
                size_kb=len(pdf_bytes) / 1024
            )
            
            return pdf_bytes
            
        except Exception as e:
            logger.error("attendance_report_generation_failed", error=str(e))
            raise
    
    async def generate_leave_report_pdf(
        self,
        db: AsyncSession,
        organization_id: UUID,
        leave_data: List[Dict[str, Any]],
        year: int,
        filters: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """
        Generate leave report PDF
        
        Args:
            db: Database session
            organization_id: Organization UUID
            leave_data: Leave records
            year: Report year
            filters: Applied filters
            
        Returns:
            PDF bytes
        """
        try:
            organization = await db.get(Organization, organization_id)
            
            # Calculate summary
            total_approved = sum(1 for r in leave_data if r.get("status") == "approved")
            total_pending = sum(1 for r in leave_data if r.get("status") == "pending")
            total_rejected = sum(1 for r in leave_data if r.get("status") == "rejected")
            total_days = sum(r.get("days", 0) for r in leave_data if r.get("status") == "approved")
            
            context = {
                "organization": {
                    "name": organization.organization_name,
                    "logo": organization.logo_url,
                },
                "report": {
                    "title": "Leave Report",
                    "year": year,
                    "generated_date": datetime.now(),
                    "total_records": len(leave_data),
                    "filters": filters or {},
                },
                "summary": {
                    "total_approved": total_approved,
                    "total_pending": total_pending,
                    "total_rejected": total_rejected,
                    "total_days": total_days,
                },
                "data": leave_data,
            }
            
            template = self.env.get_template("leave_report.html")
            html_content = template.render(**context)
            
            pdf_bytes = await self._html_to_pdf(html_content)
            
            logger.info(
                "leave_report_generated",
                organization_id=str(organization_id),
                records=len(leave_data),
                size_kb=len(pdf_bytes) / 1024
            )
            
            return pdf_bytes
            
        except Exception as e:
            logger.error("leave_report_generation_failed", error=str(e))
            raise
    
    async def generate_custom_report_pdf(
        self,
        db: AsyncSession,
        organization_id: UUID,
        report_config: Dict[str, Any],
        data: List[Dict[str, Any]]
    ) -> bytes:
        """
        Generate custom report PDF based on configuration
        
        Args:
            db: Database session
            organization_id: Organization UUID
            report_config: Report configuration (title, columns, styling)
            data: Report data
            
        Returns:
            PDF bytes
        """
        try:
            organization = await db.get(Organization, organization_id)
            
            context = {
                "organization": {
                    "name": organization.organization_name,
                    "logo": organization.logo_url,
                },
                "report": {
                    "title": report_config.get("title", "Custom Report"),
                    "description": report_config.get("description", ""),
                    "generated_date": datetime.now(),
                    "total_records": len(data),
                    "columns": report_config.get("columns", []),
                },
                "data": data,
                "styling": report_config.get("styling", {}),
            }
            
            template = self.env.get_template("custom_report.html")
            html_content = template.render(**context)
            
            pdf_bytes = await self._html_to_pdf(html_content)
            
            logger.info(
                "custom_report_generated",
                organization_id=str(organization_id),
                title=report_config.get("title"),
                records=len(data),
                size_kb=len(pdf_bytes) / 1024
            )
            
            return pdf_bytes
            
        except Exception as e:
            logger.error("custom_report_generation_failed", error=str(e))
            raise
    
    async def _html_to_pdf(self, html_content: str, css_content: Optional[str] = None) -> bytes:
        """
        Convert HTML to PDF using WeasyPrint
        
        Args:
            html_content: HTML string
            css_content: Optional CSS string
            
        Returns:
            PDF bytes
        """
        try:
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            
            def _generate():
                html = HTML(string=html_content, base_url=str(self.template_dir))
                
                if css_content:
                    css = CSS(string=css_content)
                    return html.write_pdf(stylesheets=[css])
                else:
                    return html.write_pdf()
            
            pdf_bytes = await loop.run_in_executor(None, _generate)
            return pdf_bytes
            
        except Exception as e:
            logger.error("pdf_conversion_failed", error=str(e))
            raise
    
    async def generate_offer_letter_pdf(
        self,
        db: AsyncSession,
        candidate_data: Dict[str, Any],
        offer_data: Dict[str, Any],
        organization_id: UUID
    ) -> bytes:
        """
        Generate offer letter PDF for recruitment
        
        Args:
            db: Database session
            candidate_data: Candidate information
            offer_data: Offer details (salary, position, etc.)
            organization_id: Organization UUID
            
        Returns:
            PDF bytes
        """
        try:
            organization = await db.get(Organization, organization_id)
            
            context = {
                "organization": {
                    "name": organization.organization_name,
                    "logo": organization.logo_url,
                    "address": organization.address,
                    "contact": organization.contact_email,
                },
                "candidate": candidate_data,
                "offer": offer_data,
                "generated_date": datetime.now(),
            }
            
            template = self.env.get_template("offer_letter.html")
            html_content = template.render(**context)
            
            pdf_bytes = await self._html_to_pdf(html_content)
            
            logger.info(
                "offer_letter_generated",
                organization_id=str(organization_id),
                candidate=candidate_data.get("name"),
                size_kb=len(pdf_bytes) / 1024
            )
            
            return pdf_bytes
            
        except Exception as e:
            logger.error("offer_letter_generation_failed", error=str(e))
            raise
    
    async def generate_experience_certificate_pdf(
        self,
        db: AsyncSession,
        employee_id: UUID,
        exit_data: Dict[str, Any]
    ) -> bytes:
        """
        Generate experience certificate PDF for exiting employees
        
        Args:
            db: Database session
            employee_id: Employee UUID
            exit_data: Exit details
            
        Returns:
            PDF bytes
        """
        try:
            employee = await db.get(Employee, employee_id)
            organization = await db.get(Organization, employee.organization_id)
            department = await db.get(Department, employee.department_id) if employee.department_id else None
            
            context = {
                "organization": {
                    "name": organization.organization_name,
                    "logo": organization.logo_url,
                    "address": organization.address,
                },
                "employee": {
                    "full_name": f"{employee.first_name} {employee.last_name}",
                    "designation": employee.designation,
                    "department": department.department_name if department else "N/A",
                    "date_of_joining": employee.date_of_joining,
                    "date_of_exit": exit_data.get("date_of_exit"),
                    "employee_code": employee.employee_code,
                },
                "exit": exit_data,
                "generated_date": datetime.now(),
            }
            
            template = self.env.get_template("experience_certificate.html")
            html_content = template.render(**context)
            
            pdf_bytes = await self._html_to_pdf(html_content)
            
            logger.info(
                "experience_certificate_generated",
                employee_id=str(employee_id),
                size_kb=len(pdf_bytes) / 1024
            )
            
            return pdf_bytes
            
        except Exception as e:
            logger.error("experience_certificate_generation_failed", error=str(e))
            raise


# Singleton instance
pdf_service = PDFService()
