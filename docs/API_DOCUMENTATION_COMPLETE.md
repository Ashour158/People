# Python HR Management System - Complete API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Core Modules](#core-modules)
4. [API Endpoints](#api-endpoints)
5. [GraphQL API](#graphql-api)
6. [OAuth 2.0](#oauth-20)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Pagination](#pagination)
10. [Examples](#examples)

## Overview

The HR Management System API is a comprehensive RESTful and GraphQL API built with FastAPI, providing complete HR functionality including employee management, payroll, performance tracking, workflow automation, and AI-powered analytics.

### Base URL
- **Production**: `https://api.hr-system.com/api/v1`
- **Staging**: `https://staging-api.hr-system.com/api/v1`
- **Development**: `http://localhost:5000/api/v1`

### API Version
Current Version: **v1**

### Technology Stack
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **Authentication**: JWT + OAuth 2.0
- **Documentation**: OpenAPI 3.0 (Swagger UI)

## Authentication

### JWT Authentication

All API endpoints (except `/auth/login`, `/auth/register`, and OAuth endpoints) require JWT authentication.

#### Headers
```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

#### Obtaining a Token

**POST** `/auth/login`

```json
{
  "email": "user@company.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": {
      "user_id": "uuid",
      "email": "user@company.com",
      "role": "admin"
    }
  }
}
```

#### Refreshing Token

**POST** `/auth/refresh-token`

```json
{
  "refresh_token": "your_refresh_token"
}
```

## Core Modules

### 1. Employee Management
Manage employee information, profiles, and organizational structure.

### 2. Attendance Tracking
Track employee check-in/out, work hours, and attendance patterns.

### 3. Leave Management
Handle leave requests, approvals, and balance tracking.

### 4. Payroll Management ⭐ **NEW**
Complete payroll processing with tax calculation, bonuses, loans, and reimbursements.

### 5. Performance Management ⭐ **NEW**
Goals, KPIs, reviews, 360-degree feedback, and development plans.

### 6. Workflow Engine ⭐ **NEW**
Custom approval workflows with SLA tracking and escalation management.

### 7. AI & Analytics ⭐ **NEW**
ML-powered insights, attrition prediction, leave forecasting, and workforce planning.

## API Endpoints

### Authentication Endpoints

#### Register New Organization
**POST** `/auth/register`

```json
{
  "organization_name": "ACME Corporation",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@acme.com",
  "password": "SecurePassword123!"
}
```

#### Login
**POST** `/auth/login`

```json
{
  "email": "john@acme.com",
  "password": "SecurePassword123!"
}
```

#### Password Reset Request
**POST** `/auth/forgot-password`

```json
{
  "email": "john@acme.com"
}
```

#### Change Password
**POST** `/auth/change-password`

```json
{
  "old_password": "OldPassword123!",
  "new_password": "NewPassword123!"
}
```

---

### Employee Endpoints

#### List Employees
**GET** `/employees?page=1&limit=20&search=john`

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 20, max: 100)
- `search` (string): Search by name or email
- `department` (string): Filter by department
- `employment_status` (string): active, inactive, terminated

**Response:**
```json
{
  "success": true,
  "data": {
    "employees": [
      {
        "employee_id": "uuid",
        "employee_code": "EMP001",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@company.com",
        "department": "Engineering",
        "designation": "Senior Developer",
        "employment_status": "active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150
    }
  }
}
```

#### Get Employee Details
**GET** `/employees/{employee_id}`

#### Create Employee
**POST** `/employees`

```json
{
  "employee_code": "EMP001",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@company.com",
  "phone": "+1234567890",
  "date_of_birth": "1990-01-15",
  "hire_date": "2024-01-01",
  "employment_type": "full_time",
  "employment_status": "active"
}
```

#### Update Employee
**PUT** `/employees/{employee_id}`

#### Delete Employee (Soft Delete)
**DELETE** `/employees/{employee_id}`

---

### Payroll Endpoints ⭐ **NEW**

#### Create Salary Structure
**POST** `/payroll/salary-structure`

```json
{
  "employee_id": "uuid",
  "effective_from": "2024-01-01",
  "basic_salary": 50000,
  "hra": 20000,
  "transport_allowance": 1600,
  "special_allowance": 10000,
  "medical_allowance": 1250,
  "provident_fund": 6000,
  "professional_tax": 200,
  "income_tax": 8000,
  "currency": "USD",
  "pay_frequency": "monthly"
}
```

#### Process Payroll
**POST** `/payroll/process`

```json
{
  "pay_period_start": "2024-01-01",
  "pay_period_end": "2024-01-31",
  "employee_ids": ["uuid1", "uuid2"],  // Optional, process all if null
  "payment_date": "2024-02-05",
  "notes": "January 2024 payroll"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pay_period_start": "2024-01-01",
    "pay_period_end": "2024-01-31",
    "total_employees": 150,
    "payrolls": [
      {
        "employee_id": "uuid",
        "employee_name": "John Doe",
        "earnings": {
          "basic_salary": 50000,
          "hra": 20000,
          "gross_salary": 82850
        },
        "deductions": {
          "provident_fund": 6000,
          "professional_tax": 200,
          "income_tax": 8000,
          "total_deductions": 14200
        },
        "net_salary": 68650
      }
    ]
  }
}
```

#### Generate Payslip
**GET** `/payroll/payslip/{employee_id}?pay_period_start=2024-01-01&pay_period_end=2024-01-31`

#### Calculate Tax
**POST** `/payroll/calculate-tax`

```json
{
  "gross_salary": 100000,
  "deductions": 50000,
  "tax_regime": "new",
  "country_code": "US"
}
```

#### Process Bonus
**POST** `/payroll/bonus`

```json
{
  "employee_id": "uuid",
  "bonus_type": "performance",
  "amount": 10000,
  "bonus_date": "2024-03-15",
  "reason": "Excellent Q1 performance",
  "is_taxable": true
}
```

#### Create Loan
**POST** `/payroll/loan`

```json
{
  "employee_id": "uuid",
  "loan_type": "personal",
  "loan_amount": 50000,
  "interest_rate": 8.5,
  "tenure_months": 24,
  "start_date": "2024-02-01",
  "reason": "Personal emergency"
}
```

#### Monthly Payroll Summary
**GET** `/payroll/reports/monthly-summary?year=2024&month=1`

---

### Performance Management Endpoints ⭐ **NEW**

#### Create Goal
**POST** `/performance/goals`

```json
{
  "employee_id": "uuid",
  "title": "Increase Sales by 20%",
  "description": "Achieve 20% growth in sales revenue",
  "goal_type": "individual",
  "category": "revenue",
  "target_value": 1000000,
  "weight": 30,
  "start_date": "2024-01-01",
  "end_date": "2024-12-31"
}
```

#### Update Goal Progress
**PUT** `/performance/goals/{goal_id}/progress`

```json
{
  "current_value": 750000,
  "status": "in_progress",
  "progress_notes": "75% achieved, on track"
}
```

#### Get Employee Goals
**GET** `/performance/goals/employee/{employee_id}?status=in_progress`

#### Create Review Cycle
**POST** `/performance/review-cycles`

```json
{
  "name": "Q1 2024 Reviews",
  "cycle_type": "quarterly",
  "start_date": "2024-01-01",
  "end_date": "2024-03-31"
}
```

#### Submit 360-Degree Feedback
**POST** `/performance/feedback`

```json
{
  "employee_id": "uuid",
  "feedback_type": "peer",
  "reviewer_id": "uuid",
  "review_cycle_id": "uuid",
  "competencies": [
    {
      "competency_name": "Communication",
      "rating": 4.5,
      "comments": "Excellent communicator"
    },
    {
      "competency_name": "Leadership",
      "rating": 4.0,
      "comments": "Shows strong leadership potential"
    }
  ],
  "overall_comments": "Great team player",
  "strengths": ["Communication", "Problem Solving"],
  "development_areas": ["Time Management"]
}
```

#### Create KPI
**POST** `/performance/kpis`

```json
{
  "kpi_name": "Sales Target Achievement",
  "description": "Monthly sales target",
  "measurement_unit": "currency",
  "target_value": 100000,
  "frequency": "monthly",
  "calculation_method": "actual_vs_target"
}
```

#### Performance Trends
**GET** `/performance/analytics/performance-trends?period=quarterly`

---

### Workflow Engine Endpoints ⭐ **NEW**

#### Create Workflow Definition
**POST** `/workflows/definitions`

```json
{
  "workflow_name": "Leave Approval Workflow",
  "workflow_type": "leave",
  "description": "Standard leave approval process",
  "trigger_event": "manual",
  "stages": [
    {
      "stage_name": "Manager Approval",
      "stage_order": 1,
      "approver_type": "manager",
      "approval_type": "any",
      "sla_hours": 24,
      "escalation_enabled": true,
      "escalation_after_hours": 48,
      "escalation_to": "department_head"
    },
    {
      "stage_name": "HR Approval",
      "stage_order": 2,
      "approver_type": "role",
      "approver_ids": ["hr_manager"],
      "approval_type": "any",
      "sla_hours": 48
    }
  ],
  "allow_comments": true,
  "allow_attachments": true
}
```

#### Start Workflow Instance
**POST** `/workflows/instances`

```json
{
  "workflow_id": "uuid",
  "initiated_by": "uuid",
  "request_data": {
    "leave_type": "Annual Leave",
    "start_date": "2024-02-15",
    "end_date": "2024-02-19",
    "total_days": 5
  },
  "priority": "normal",
  "comments": "Family vacation"
}
```

#### Take Workflow Action
**POST** `/workflows/instances/action`

```json
{
  "instance_id": "uuid",
  "action": "approval",
  "comments": "Approved - enjoy your vacation"
}
```

#### List Workflow Instances
**GET** `/workflows/instances?status=pending&assigned_to_me=true&page=1&limit=20`

#### Workflow Analytics
**GET** `/workflows/analytics/performance?start_date=2024-01-01&end_date=2024-03-31`

---

### AI & Analytics Endpoints ⭐ **NEW**

#### Predict Employee Attrition
**GET** `/analytics/attrition/predict?risk_threshold=0.5`

**Response:**
```json
{
  "success": true,
  "data": {
    "total_employees_analyzed": 150,
    "at_risk_employees": 12,
    "predictions": [
      {
        "employee_id": "uuid",
        "employee_name": "John Doe",
        "risk_level": "high",
        "risk_score": 0.85,
        "risk_factors": [
          "Low satisfaction score",
          "No promotions in 2+ years",
          "Below-market compensation"
        ],
        "recommended_actions": [
          "Conduct one-on-one feedback session",
          "Discuss career development opportunities",
          "Review and adjust compensation"
        ]
      }
    ]
  }
}
```

#### Forecast Leave Requests
**GET** `/analytics/leave/forecast?forecast_days=30`

**Response:**
```json
{
  "success": true,
  "data": {
    "forecast_period_days": 30,
    "total_predicted_leaves": 240,
    "average_daily_leaves": 8.0,
    "peak_day": {
      "date": "2024-02-23",
      "predicted_leaves": 15,
      "seasonality_factor": 1.4
    },
    "forecast": [
      {
        "date": "2024-02-01",
        "predicted_leaves": 8,
        "confidence_lower": 5,
        "confidence_upper": 11,
        "trend": "stable"
      }
    ]
  }
}
```

#### Workforce Planning
**GET** `/analytics/workforce/planning?target_growth_rate=0.15&planning_months=12`

**Response:**
```json
{
  "success": true,
  "data": {
    "initial_headcount": 150,
    "target_headcount": 172,
    "total_hires_needed": 31,
    "expected_attrition": 9,
    "monthly_projections": [...]
  }
}
```

#### Skill Gap Analysis
**GET** `/analytics/skills/gap-analysis`

#### Performance Trends
**GET** `/analytics/performance/trends?period_months=12`

#### Recruitment Analytics
**GET** `/analytics/recruitment/time-to-hire`

#### Employee Sentiment Analysis
**GET** `/analytics/sentiment/analysis`

---

## GraphQL API ⭐ **NEW**

The system provides a GraphQL endpoint for flexible querying.

### Endpoint
**POST** `/graphql`

### GraphQL Playground
Visit `/api/v1/graphql` in your browser for interactive GraphQL playground.

### Example Queries

#### Query Employees
```graphql
query GetEmployees {
  employees(limit: 10, offset: 0, filter: {
    employment_status: "active",
    department: "Engineering"
  }) {
    employee_id
    employee_code
    full_name
    email
    department
    designation
  }
}
```

#### Query with Multiple Resources
```graphql
query Dashboard {
  organization_stats {
    total_employees
    active_employees
    average_tenure_months
  }
  
  attendance_stats {
    present_today
    absent_today
    attendance_rate
  }
  
  employees(limit: 5) {
    full_name
    employment_status
  }
}
```

#### Create Employee Mutation
```graphql
mutation CreateEmployee {
  create_employee(input: {
    employee_code: "EMP003"
    first_name: "Alice"
    last_name: "Johnson"
    email: "alice@company.com"
    hire_date: "2024-01-15"
    employment_type: "full_time"
  }) {
    employee_id
    full_name
    email
  }
}
```

---

## OAuth 2.0 ⭐ **NEW**

### Supported Providers
- Google
- Microsoft
- GitHub

### OAuth Flow

#### Step 1: Get Authorization URL
**GET** `/oauth/authorize/{provider}?redirect_uri=https://yourapp.com/callback`

**Response:**
```json
{
  "success": true,
  "data": {
    "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
    "state": "random_state_string",
    "provider": "google"
  }
}
```

#### Step 2: Handle Callback
**POST** `/oauth/callback/{provider}`

```json
{
  "provider": "google",
  "code": "authorization_code_from_provider",
  "redirect_uri": "https://yourapp.com/callback",
  "state": "random_state_string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": {
      "user_id": "uuid",
      "email": "user@gmail.com"
    },
    "provider": "google"
  }
}
```

---

## Error Handling

All errors follow consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "detail": "Detailed error information",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Internal Server Error

### Common Error Codes
- `AUTHENTICATION_REQUIRED` - No authentication provided
- `INVALID_TOKEN` - JWT token invalid or expired
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `VALIDATION_ERROR` - Request validation failed
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `RATE_LIMIT_EXCEEDED` - Too many requests

---

## Rate Limiting

API implements rate limiting to prevent abuse:

- **Default**: 100 requests per minute per IP
- **Authenticated**: 1000 requests per minute per user
- **OAuth endpoints**: 10 requests per minute per IP

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

---

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 20, max: 100)

**Response includes:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## Examples

### Complete Employee Onboarding Flow

```python
import requests

BASE_URL = "https://api.hr-system.com/api/v1"
headers = {"Authorization": "Bearer YOUR_TOKEN"}

# 1. Create employee
employee = requests.post(
    f"{BASE_URL}/employees",
    headers=headers,
    json={
        "employee_code": "EMP001",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@company.com",
        "hire_date": "2024-01-15",
        "employment_type": "full_time"
    }
).json()

employee_id = employee["data"]["employee_id"]

# 2. Create salary structure
requests.post(
    f"{BASE_URL}/payroll/salary-structure",
    headers=headers,
    json={
        "employee_id": employee_id,
        "effective_from": "2024-01-15",
        "basic_salary": 60000,
        "currency": "USD"
    }
)

# 3. Create performance goals
requests.post(
    f"{BASE_URL}/performance/goals",
    headers=headers,
    json={
        "employee_id": employee_id,
        "title": "Complete Onboarding",
        "goal_type": "individual",
        "category": "learning",
        "start_date": "2024-01-15",
        "end_date": "2024-02-15"
    }
)
```

### Process Monthly Payroll

```python
# Process payroll for all employees
response = requests.post(
    f"{BASE_URL}/payroll/process",
    headers=headers,
    json={
        "pay_period_start": "2024-01-01",
        "pay_period_end": "2024-01-31",
        "payment_date": "2024-02-05"
    }
).json()

print(f"Processed payroll for {response['data']['total_employees']} employees")
```

---

## Additional Resources

- **Interactive API Docs**: `/api/v1/docs` (Swagger UI)
- **Alternative Docs**: `/api/v1/redoc` (ReDoc)
- **OpenAPI Schema**: `/api/v1/openapi.json`
- **GraphQL Playground**: `/api/v1/graphql`
- **Health Check**: `/health`

## Support

For issues and questions:
- **GitHub Issues**: https://github.com/Ashour158/People/issues
- **Email**: support@hr-system.com
- **Documentation**: https://docs.hr-system.com
