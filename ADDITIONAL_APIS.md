# Additional API Endpoints - HR Management System

This document extends the base API_REFERENCE.md with additional module endpoints.

Base URL: `http://localhost:5000/api/v1`

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Performance Management APIs

### Performance Cycles

#### Create Performance Cycle
**POST** `/performance/cycles`
**Auth Required:** Yes
**Permission:** `performance.manage`

**Request Body:**
```json
{
  "cycle_name": "Annual Performance Review 2024",
  "cycle_code": "APR2024",
  "cycle_type": "annual",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "review_start_date": "2024-12-01",
  "review_end_date": "2024-12-31",
  "description": "Annual performance review cycle for 2024"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "cycle_id": "uuid",
    "cycle_name": "Annual Performance Review 2024",
    "cycle_type": "annual",
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  }
}
```

#### Get Performance Cycles
**GET** `/performance/cycles`
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [...],
  "meta": { "page": 1, "perPage": 10, "total": 5, "totalPages": 1 }
}
```

### Goals Management

#### Create Goal
**POST** `/performance/goals`
**Auth Required:** Yes

**Request Body:**
```json
{
  "employee_id": "uuid",
  "cycle_id": "uuid",
  "goal_title": "Improve customer satisfaction by 20%",
  "goal_description": "Increase CSAT score from 80% to 96%",
  "goal_category": "individual",
  "goal_type": "performance",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "target_value": "96%",
  "weight_percentage": 30
}
```

**Response:** `201 Created`

#### Update Goal Progress
**POST** `/performance/goals/:id/progress`
**Auth Required:** Yes

**Request Body:**
```json
{
  "progress_percentage": 75,
  "actual_value": "90%",
  "progress_notes": "Achieved 90% CSAT, on track to reach 96%"
}
```

### Performance Reviews

#### Create Review
**POST** `/performance/reviews`
**Auth Required:** Yes

**Request Body:**
```json
{
  "employee_id": "uuid",
  "reviewer_id": "uuid",
  "cycle_id": "uuid",
  "review_type": "manager",
  "review_period_start": "2024-01-01",
  "review_period_end": "2024-12-31"
}
```

#### Submit Review
**POST** `/performance/reviews/:id/submit`
**Auth Required:** Yes

**Response:** `200 OK`

### Feedback

#### Create Feedback
**POST** `/performance/feedback`
**Auth Required:** Yes

**Request Body:**
```json
{
  "employee_id": "uuid",
  "feedback_from_employee_id": "uuid",
  "feedback_type": "positive",
  "feedback_category": "technical",
  "feedback_text": "Excellent technical skills and problem-solving ability",
  "is_anonymous": false
}
```

---

## Payroll Management APIs

### Compensation Components

#### Create Component
**POST** `/payroll/components`
**Auth Required:** Yes
**Permission:** `payroll.manage`

**Request Body:**
```json
{
  "component_name": "Basic Salary",
  "component_code": "BASIC",
  "component_type": "earning",
  "calculation_type": "fixed",
  "calculation_value": 50000,
  "is_taxable": true,
  "is_visible_on_payslip": true,
  "display_order": 1
}
```

**Response:** `201 Created`

#### Get Components
**GET** `/payroll/components`
**Auth Required:** Yes

**Query Parameters:**
- `component_type` (string): Filter by type (earning, deduction, reimbursement)

### Employee Compensation

#### Create Employee Compensation
**POST** `/payroll/employee-compensation`
**Auth Required:** Yes
**Permission:** `payroll.manage`

**Request Body:**
```json
{
  "employee_id": "uuid",
  "effective_from_date": "2024-01-01",
  "annual_ctc": 600000,
  "monthly_gross": 50000,
  "salary_type": "monthly",
  "payment_frequency": "monthly",
  "payment_mode": "bank_transfer"
}
```

**Response:** `201 Created`

#### Get Employee Compensation
**GET** `/payroll/employee-compensation/:employeeId`
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "compensation_id": "uuid",
      "employee_id": "uuid",
      "effective_from_date": "2024-01-01",
      "annual_ctc": 600000,
      "monthly_gross": 50000
    }
  ]
}
```

### Payroll Runs

#### Create Payroll Run
**POST** `/payroll/runs`
**Auth Required:** Yes
**Permission:** `payroll.manage`

**Request Body:**
```json
{
  "run_name": "January 2024 Payroll",
  "run_code": "PAY202401",
  "period_month": 1,
  "period_year": 2024,
  "pay_date": "2024-02-01"
}
```

**Response:** `201 Created`

#### Process Payroll Run
**POST** `/payroll/runs/:id/process`
**Auth Required:** Yes
**Permission:** `payroll.process`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Payroll run processing started",
  "data": { "run_id": "uuid", "run_status": "processing" }
}
```

#### Finalize Payroll Run
**POST** `/payroll/runs/:id/finalize`
**Auth Required:** Yes
**Permission:** `payroll.finalize`

**Response:** `200 OK`

#### Get Payslips
**GET** `/payroll/payslips`
**Auth Required:** Yes

**Query Parameters:**
- `employee_id` (uuid): Filter by employee
- `run_id` (uuid): Filter by payroll run

---

## Recruitment Management APIs

### Job Postings

#### Create Job Posting
**POST** `/recruitment/jobs`
**Auth Required:** Yes
**Permission:** `recruitment.manage`

**Request Body:**
```json
{
  "job_title": "Senior Software Engineer",
  "job_code": "SSE2024001",
  "department_id": "uuid",
  "location_id": "uuid",
  "employment_type": "full_time",
  "experience_level": "senior",
  "job_description": "We are looking for an experienced software engineer...",
  "required_skills": "Java, Spring Boot, Microservices, AWS"
}
```

**Response:** `201 Created`

#### Get Job Postings
**GET** `/recruitment/jobs`
**Auth Required:** Yes

**Query Parameters:**
- `job_status` (string): Filter by status (draft, published, closed)

#### Publish Job
**POST** `/recruitment/jobs/:id/publish`
**Auth Required:** Yes
**Permission:** `recruitment.manage`

**Response:** `200 OK`

#### Close Job
**POST** `/recruitment/jobs/:id/close`
**Auth Required:** Yes
**Permission:** `recruitment.manage`

**Response:** `200 OK`

### Candidates

#### Create Candidate
**POST** `/recruitment/candidates`
**Auth Required:** Yes
**Permission:** `recruitment.manage`

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone_number": "+1234567890",
  "resume_url": "https://example.com/resumes/john-doe.pdf"
}
```

**Response:** `201 Created`

#### Get Candidates
**GET** `/recruitment/candidates`
**Auth Required:** Yes

### Job Applications

#### Create Application
**POST** `/recruitment/applications`
**Auth Required:** Yes

**Request Body:**
```json
{
  "job_posting_id": "uuid",
  "candidate_id": "uuid"
}
```

**Response:** `201 Created`

#### Get Applications
**GET** `/recruitment/applications`
**Auth Required:** Yes

**Query Parameters:**
- `job_posting_id` (uuid): Filter by job posting

#### Update Application Status
**PUT** `/recruitment/applications/:id/status`
**Auth Required:** Yes
**Permission:** `recruitment.manage`

**Request Body:**
```json
{
  "status": "interview"
}
```

**Valid statuses:** `applied`, `screening`, `interview`, `offered`, `hired`, `rejected`

### Interviews

#### Schedule Interview
**POST** `/recruitment/interviews`
**Auth Required:** Yes
**Permission:** `recruitment.manage`

**Request Body:**
```json
{
  "application_id": "uuid",
  "interview_type": "technical",
  "scheduled_date": "2024-02-15T10:00:00Z"
}
```

**Response:** `201 Created`

#### Get Interviews
**GET** `/recruitment/interviews`
**Auth Required:** Yes

#### Add Interview Feedback
**POST** `/recruitment/interviews/:id/feedback`
**Auth Required:** Yes

**Request Body:**
```json
{
  "feedback": "Strong technical skills, good problem-solving approach",
  "rating": 4
}
```

**Response:** `200 OK`

---

## Common Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error",
  "errors": [
    { "field": "email", "message": "\"email\" must be a valid email" }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `perPage` (number): Items per page (default: 10, max: 100)

**Response Meta:**
```json
{
  "meta": {
    "page": 1,
    "perPage": 10,
    "total": 150,
    "totalPages": 15
  }
}
```
