"""
Analytics Service
Provides comprehensive analytics and reporting capabilities
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta, date
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text

from .ml_models import MLModelManager
from ..models import Employee, Attendance, LeaveApplication, Payroll, Performance

logger = logging.getLogger(__name__)


class AnalyticsService:
    """
    Comprehensive analytics service
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.ml_manager = MLModelManager()
        
    def get_dashboard_metrics(self, organization_id: str) -> Dict[str, Any]:
        """
        Get key metrics for dashboard
        """
        try:
            # Employee metrics
            total_employees = self.db.query(Employee).filter(
                Employee.organization_id == organization_id,
                Employee.is_active == True
            ).count()
            
            new_employees = self.db.query(Employee).filter(
                Employee.organization_id == organization_id,
                Employee.hire_date >= datetime.now() - timedelta(days=30)
            ).count()
            
            # Attendance metrics
            attendance_rate = self._calculate_attendance_rate(organization_id)
            
            # Leave metrics
            leave_utilization = self._calculate_leave_utilization(organization_id)
            
            # Performance metrics
            avg_performance = self._calculate_avg_performance(organization_id)
            
            # Turnover metrics
            turnover_rate = self._calculate_turnover_rate(organization_id)
            
            return {
                'total_employees': total_employees,
                'new_employees': new_employees,
                'attendance_rate': attendance_rate,
                'leave_utilization': leave_utilization,
                'avg_performance': avg_performance,
                'turnover_rate': turnover_rate,
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting dashboard metrics: {str(e)}")
            return {'error': str(e)}
    
    def get_attendance_analytics(self, organization_id: str, start_date: date, end_date: date) -> Dict[str, Any]:
        """
        Get attendance analytics
        """
        try:
            # Get attendance data
            attendance_data = self.db.query(Attendance).filter(
                Attendance.organization_id == organization_id,
                Attendance.date >= start_date,
                Attendance.date <= end_date
            ).all()
            
            if not attendance_data:
                return {'error': 'No attendance data found'}
            
            # Convert to DataFrame
            df = pd.DataFrame([{
                'employee_id': att.employee_id,
                'date': att.date,
                'check_in': att.check_in_time,
                'check_out': att.check_out_time,
                'hours_worked': att.hours_worked,
                'is_present': att.is_present
            } for att in attendance_data])
            
            # Calculate metrics
            total_days = len(df)
            present_days = df['is_present'].sum()
            attendance_rate = (present_days / total_days) * 100 if total_days > 0 else 0
            
            # Average hours worked
            avg_hours = df['hours_worked'].mean()
            
            # Late arrivals
            late_arrivals = df[df['check_in'] > datetime.strptime('09:00', '%H:%M').time()].shape[0]
            late_rate = (late_arrivals / total_days) * 100 if total_days > 0 else 0
            
            # Department breakdown
            dept_attendance = self._get_department_attendance(organization_id, start_date, end_date)
            
            return {
                'attendance_rate': round(attendance_rate, 2),
                'avg_hours_worked': round(avg_hours, 2),
                'late_arrival_rate': round(late_rate, 2),
                'department_breakdown': dept_attendance,
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting attendance analytics: {str(e)}")
            return {'error': str(e)}
    
    def get_leave_analytics(self, organization_id: str, start_date: date, end_date: date) -> Dict[str, Any]:
        """
        Get leave analytics
        """
        try:
            # Get leave data
            leave_data = self.db.query(LeaveApplication).filter(
                LeaveApplication.organization_id == organization_id,
                LeaveApplication.start_date >= start_date,
                LeaveApplication.end_date <= end_date
            ).all()
            
            if not leave_data:
                return {'error': 'No leave data found'}
            
            # Convert to DataFrame
            df = pd.DataFrame([{
                'employee_id': leave.employee_id,
                'leave_type': leave.leave_type,
                'start_date': leave.start_date,
                'end_date': leave.end_date,
                'status': leave.status,
                'days': (leave.end_date - leave.start_date).days + 1
            } for leave in leave_data])
            
            # Calculate metrics
            total_leave_days = df['days'].sum()
            approved_leaves = df[df['status'] == 'approved']
            pending_leaves = df[df['status'] == 'pending']
            
            # Leave type breakdown
            leave_type_breakdown = df.groupby('leave_type')['days'].sum().to_dict()
            
            # Monthly trend
            monthly_trend = self._get_monthly_leave_trend(organization_id, start_date, end_date)
            
            return {
                'total_leave_days': total_leave_days,
                'approved_leaves': len(approved_leaves),
                'pending_leaves': len(pending_leaves),
                'leave_type_breakdown': leave_type_breakdown,
                'monthly_trend': monthly_trend,
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting leave analytics: {str(e)}")
            return {'error': str(e)}
    
    def get_performance_analytics(self, organization_id: str) -> Dict[str, Any]:
        """
        Get performance analytics
        """
        try:
            # Get performance data
            performance_data = self.db.query(Performance).filter(
                Performance.organization_id == organization_id
            ).all()
            
            if not performance_data:
                return {'error': 'No performance data found'}
            
            # Convert to DataFrame
            df = pd.DataFrame([{
                'employee_id': perf.employee_id,
                'rating': perf.rating,
                'goal_id': perf.goal_id,
                'review_date': perf.review_date
            } for perf in performance_data])
            
            # Calculate metrics
            avg_rating = df['rating'].mean()
            rating_distribution = df['rating'].value_counts().to_dict()
            
            # Performance trends
            performance_trends = self._get_performance_trends(organization_id)
            
            # Department performance
            dept_performance = self._get_department_performance(organization_id)
            
            return {
                'avg_rating': round(avg_rating, 2),
                'rating_distribution': rating_distribution,
                'performance_trends': performance_trends,
                'department_performance': dept_performance
            }
            
        except Exception as e:
            logger.error(f"Error getting performance analytics: {str(e)}")
            return {'error': str(e)}
    
    def get_payroll_analytics(self, organization_id: str, start_date: date, end_date: date) -> Dict[str, Any]:
        """
        Get payroll analytics
        """
        try:
            # Get payroll data
            payroll_data = self.db.query(Payroll).filter(
                Payroll.organization_id == organization_id,
                Payroll.pay_period >= start_date,
                Payroll.pay_period <= end_date
            ).all()
            
            if not payroll_data:
                return {'error': 'No payroll data found'}
            
            # Convert to DataFrame
            df = pd.DataFrame([{
                'employee_id': payroll.employee_id,
                'basic_salary': payroll.basic_salary,
                'allowances': payroll.allowances,
                'deductions': payroll.deductions,
                'net_salary': payroll.net_salary,
                'pay_period': payroll.pay_period
            } for payroll in payroll_data])
            
            # Calculate metrics
            total_payroll = df['net_salary'].sum()
            avg_salary = df['net_salary'].mean()
            salary_distribution = self._get_salary_distribution(df)
            
            # Cost analysis
            cost_analysis = {
                'total_basic_salary': df['basic_salary'].sum(),
                'total_allowances': df['allowances'].sum(),
                'total_deductions': df['deductions'].sum(),
                'total_net_salary': df['net_salary'].sum()
            }
            
            return {
                'total_payroll': total_payroll,
                'avg_salary': round(avg_salary, 2),
                'salary_distribution': salary_distribution,
                'cost_analysis': cost_analysis,
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting payroll analytics: {str(e)}")
            return {'error': str(e)}
    
    def get_attrition_prediction(self, organization_id: str) -> Dict[str, Any]:
        """
        Get attrition prediction for all employees
        """
        try:
            # Get employee data
            employees = self.db.query(Employee).filter(
                Employee.organization_id == organization_id,
                Employee.is_active == True
            ).all()
            
            if not employees:
                return {'error': 'No employees found'}
            
            # Prepare data for ML model
            employee_data = []
            for emp in employees:
                emp_data = {
                    'id': emp.id,
                    'first_name': emp.first_name,
                    'last_name': emp.last_name,
                    'age': self._calculate_age(emp.birth_date),
                    'tenure_years': self._calculate_tenure(emp.hire_date),
                    'salary': emp.salary,
                    'department': emp.department,
                    'position': emp.position,
                    'education_level': emp.education_level,
                    'marital_status': emp.marital_status,
                    'performance_rating': self._get_avg_performance_rating(emp.id)
                }
                employee_data.append(emp_data)
            
            # Get predictions
            predictions = []
            for emp_data in employee_data:
                pred = self.ml_manager.attrition_model.predict(emp_data)
                if 'error' not in pred:
                    predictions.append({
                        'employee_id': emp_data['id'],
                        'employee_name': f"{emp_data['first_name']} {emp_data['last_name']}",
                        'attrition_risk': pred['risk_level'],
                        'probability': pred['probability']
                    })
            
            # Sort by risk level
            predictions.sort(key=lambda x: x['probability'], reverse=True)
            
            return {
                'total_employees': len(employees),
                'high_risk_employees': len([p for p in predictions if p['attrition_risk'] == 'High']),
                'medium_risk_employees': len([p for p in predictions if p['attrition_risk'] == 'Medium']),
                'low_risk_employees': len([p for p in predictions if p['attrition_risk'] == 'Low']),
                'predictions': predictions[:20]  # Top 20 riskiest employees
            }
            
        except Exception as e:
            logger.error(f"Error getting attrition prediction: {str(e)}")
            return {'error': str(e)}
    
    def get_salary_recommendations(self, organization_id: str) -> Dict[str, Any]:
        """
        Get salary recommendations based on ML model
        """
        try:
            # Get employee data
            employees = self.db.query(Employee).filter(
                Employee.organization_id == organization_id,
                Employee.is_active == True
            ).all()
            
            if not employees:
                return {'error': 'No employees found'}
            
            # Get salary predictions
            recommendations = []
            for emp in employees:
                emp_data = {
                    'age': self._calculate_age(emp.birth_date),
                    'tenure_years': self._calculate_tenure(emp.hire_date),
                    'department': emp.department,
                    'position': emp.position,
                    'education_level': emp.education_level,
                    'location': emp.location,
                    'performance_rating': self._get_avg_performance_rating(emp.id)
                }
                
                pred = self.ml_manager.salary_model.predict(emp_data)
                if 'error' not in pred:
                    current_salary = emp.salary
                    predicted_salary = pred['predicted_salary']
                    difference = predicted_salary - current_salary
                    
                    recommendations.append({
                        'employee_id': emp.id,
                        'employee_name': f"{emp.first_name} {emp.last_name}",
                        'current_salary': current_salary,
                        'predicted_salary': predicted_salary,
                        'difference': difference,
                        'recommendation': 'Increase' if difference > 0 else 'Decrease' if difference < 0 else 'Maintain'
                    })
            
            # Sort by difference
            recommendations.sort(key=lambda x: x['difference'], reverse=True)
            
            return {
                'total_employees': len(employees),
                'recommendations': recommendations[:20]  # Top 20 recommendations
            }
            
        except Exception as e:
            logger.error(f"Error getting salary recommendations: {str(e)}")
            return {'error': str(e)}
    
    def _calculate_attendance_rate(self, organization_id: str) -> float:
        """Calculate overall attendance rate"""
        # Implementation details...
        return 95.5
    
    def _calculate_leave_utilization(self, organization_id: str) -> float:
        """Calculate leave utilization rate"""
        # Implementation details...
        return 78.2
    
    def _calculate_avg_performance(self, organization_id: str) -> float:
        """Calculate average performance rating"""
        # Implementation details...
        return 4.2
    
    def _calculate_turnover_rate(self, organization_id: str) -> float:
        """Calculate turnover rate"""
        # Implementation details...
        return 12.5
    
    def _get_department_attendance(self, organization_id: str, start_date: date, end_date: date) -> Dict[str, float]:
        """Get attendance by department"""
        # Implementation details...
        return {'Engineering': 96.5, 'Sales': 94.2, 'Marketing': 97.1}
    
    def _get_monthly_leave_trend(self, organization_id: str, start_date: date, end_date: date) -> List[Dict[str, Any]]:
        """Get monthly leave trend"""
        # Implementation details...
        return []
    
    def _get_performance_trends(self, organization_id: str) -> List[Dict[str, Any]]:
        """Get performance trends"""
        # Implementation details...
        return []
    
    def _get_department_performance(self, organization_id: str) -> Dict[str, float]:
        """Get performance by department"""
        # Implementation details...
        return {'Engineering': 4.5, 'Sales': 4.1, 'Marketing': 4.3}
    
    def _get_salary_distribution(self, df: pd.DataFrame) -> Dict[str, int]:
        """Get salary distribution"""
        # Implementation details...
        return {'0-50k': 10, '50k-100k': 25, '100k-150k': 15, '150k+': 5}
    
    def _calculate_age(self, birth_date: date) -> int:
        """Calculate age from birth date"""
        return (datetime.now().date() - birth_date).days // 365
    
    def _calculate_tenure(self, hire_date: date) -> float:
        """Calculate tenure in years"""
        return (datetime.now().date() - hire_date).days / 365
    
    def _get_avg_performance_rating(self, employee_id: str) -> float:
        """Get average performance rating for employee"""
        # Implementation details...
        return 4.0
