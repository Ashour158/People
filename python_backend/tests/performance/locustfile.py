"""
Locust Performance Tests for HR Management System

This file contains load testing scenarios for the HR system.
Run with: locust -f locustfile.py --host=http://localhost:8000
"""

from locust import HttpUser, task, between, TaskSet
import random
import json


class AuthenticationTasks(TaskSet):
    """Authentication related tasks"""

    def on_start(self):
        """Called when a simulated user starts"""
        # Login to get token
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "Test@123"
            },
            name="/api/v1/auth/login"
        )
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.token = data.get("access_token", "")
                self.client.headers["Authorization"] = f"Bearer {self.token}"
            except:
                self.token = None
        else:
            self.token = None

    @task(1)
    def refresh_token(self):
        """Refresh authentication token"""
        if self.token:
            self.client.post(
                "/api/v1/auth/refresh",
                headers={"Authorization": f"Bearer {self.token}"},
                name="/api/v1/auth/refresh"
            )


class EmployeeTasks(TaskSet):
    """Employee management tasks"""

    def on_start(self):
        """Login before starting tasks"""
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": "admin@test.com",
                "password": "Admin@123"
            }
        )
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.token = data.get("access_token", "")
                self.client.headers["Authorization"] = f"Bearer {self.token}"
            except:
                self.token = None

    @task(10)
    def list_employees(self):
        """Get list of employees"""
        page = random.randint(1, 5)
        self.client.get(
            f"/api/v1/employees?page={page}&limit=10",
            name="/api/v1/employees [list]"
        )

    @task(5)
    def search_employees(self):
        """Search for employees"""
        search_terms = ["john", "smith", "admin", "test"]
        search = random.choice(search_terms)
        self.client.get(
            f"/api/v1/employees?search={search}",
            name="/api/v1/employees [search]"
        )

    @task(3)
    def get_employee_details(self):
        """Get single employee details"""
        # Assume employee IDs exist from 1-100
        employee_id = random.randint(1, 100)
        self.client.get(
            f"/api/v1/employees/{employee_id}",
            name="/api/v1/employees/:id"
        )

    @task(1)
    def filter_employees_by_department(self):
        """Filter employees by department"""
        departments = ["Engineering", "HR", "Sales", "Marketing"]
        dept = random.choice(departments)
        self.client.get(
            f"/api/v1/employees?department={dept}",
            name="/api/v1/employees [filter]"
        )


class AttendanceTasks(TaskSet):
    """Attendance tracking tasks"""

    def on_start(self):
        """Login before starting tasks"""
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": "employee@test.com",
                "password": "Employee@123"
            }
        )
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.token = data.get("access_token", "")
                self.client.headers["Authorization"] = f"Bearer {self.token}"
            except:
                self.token = None

    @task(5)
    def check_in(self):
        """Clock in"""
        self.client.post(
            "/api/v1/attendance/check-in",
            json={
                "location": "Office",
                "latitude": 25.2048,
                "longitude": 55.2708
            },
            name="/api/v1/attendance/check-in"
        )

    @task(5)
    def check_out(self):
        """Clock out"""
        self.client.post(
            "/api/v1/attendance/check-out",
            json={
                "location": "Office",
                "latitude": 25.2048,
                "longitude": 55.2708
            },
            name="/api/v1/attendance/check-out"
        )

    @task(10)
    def get_attendance_history(self):
        """Get attendance history"""
        self.client.get(
            "/api/v1/attendance/history?limit=30",
            name="/api/v1/attendance/history"
        )

    @task(3)
    def get_monthly_summary(self):
        """Get monthly attendance summary"""
        self.client.get(
            "/api/v1/attendance/summary?month=current",
            name="/api/v1/attendance/summary"
        )


class LeaveTasks(TaskSet):
    """Leave management tasks"""

    def on_start(self):
        """Login before starting tasks"""
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": "employee@test.com",
                "password": "Employee@123"
            }
        )
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.token = data.get("access_token", "")
                self.client.headers["Authorization"] = f"Bearer {self.token}"
            except:
                self.token = None

    @task(10)
    def get_leave_balance(self):
        """Get leave balance"""
        self.client.get(
            "/api/v1/leave/balance",
            name="/api/v1/leave/balance"
        )

    @task(8)
    def list_leave_requests(self):
        """List leave requests"""
        self.client.get(
            "/api/v1/leave/requests",
            name="/api/v1/leave/requests [list]"
        )

    @task(2)
    def submit_leave_request(self):
        """Submit a new leave request"""
        leave_types = ["ANNUAL", "SICK", "CASUAL"]
        self.client.post(
            "/api/v1/leave/requests",
            json={
                "leave_type": random.choice(leave_types),
                "start_date": "2024-12-01",
                "end_date": "2024-12-05",
                "reason": "Performance test leave request"
            },
            name="/api/v1/leave/requests [create]"
        )

    @task(5)
    def get_leave_request_details(self):
        """Get leave request details"""
        request_id = random.randint(1, 100)
        self.client.get(
            f"/api/v1/leave/requests/{request_id}",
            name="/api/v1/leave/requests/:id"
        )


class DashboardTasks(TaskSet):
    """Dashboard and reporting tasks"""

    def on_start(self):
        """Login before starting tasks"""
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": "admin@test.com",
                "password": "Admin@123"
            }
        )
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.token = data.get("access_token", "")
                self.client.headers["Authorization"] = f"Bearer {self.token}"
            except:
                self.token = None

    @task(5)
    def get_dashboard_stats(self):
        """Get dashboard statistics"""
        self.client.get(
            "/api/v1/dashboard/stats",
            name="/api/v1/dashboard/stats"
        )

    @task(3)
    def get_attendance_report(self):
        """Get attendance report"""
        self.client.get(
            "/api/v1/reports/attendance?period=monthly",
            name="/api/v1/reports/attendance"
        )

    @task(2)
    def get_leave_report(self):
        """Get leave report"""
        self.client.get(
            "/api/v1/reports/leave?period=monthly",
            name="/api/v1/reports/leave"
        )


class HRSystemUser(HttpUser):
    """
    Simulated user for HR System
    
    This user will perform various tasks with different weights
    to simulate realistic usage patterns
    """
    
    # Wait time between tasks (1-3 seconds)
    wait_time = between(1, 3)
    
    # Task distribution - higher weight = more frequent
    tasks = {
        EmployeeTasks: 30,      # 30% - Most common operation
        AttendanceTasks: 25,    # 25% - Daily attendance tracking
        LeaveTasks: 20,         # 20% - Leave management
        DashboardTasks: 15,     # 15% - Dashboard viewing
        AuthenticationTasks: 10 # 10% - Authentication operations
    }
    
    def on_start(self):
        """Called when a user starts"""
        # Verify the API is accessible
        try:
            response = self.client.get("/api/v1/health", name="/api/v1/health")
            if response.status_code != 200:
                print(f"Warning: Health check failed with status {response.status_code}")
        except Exception as e:
            print(f"Warning: Could not reach API health endpoint: {e}")


class AdminUser(HttpUser):
    """
    Simulated admin user with more intensive operations
    """
    
    wait_time = between(2, 5)
    
    tasks = {
        EmployeeTasks: 40,
        DashboardTasks: 35,
        LeaveTasks: 15,
        AttendanceTasks: 10,
    }
    
    weight = 2  # Admin users are less common


class EmployeeUser(HttpUser):
    """
    Simulated regular employee user
    """
    
    wait_time = between(3, 7)
    
    tasks = {
        AttendanceTasks: 40,
        LeaveTasks: 30,
        DashboardTasks: 20,
        EmployeeTasks: 10,
    }
    
    weight = 5  # Regular employees are more common
