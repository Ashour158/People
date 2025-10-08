# HR Management System - Complete API Documentation

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication
All API endpoints (except auth endpoints) require JWT authentication.

**Authorization Header:**
```
Authorization: Bearer <access_token>
```

---

## API Endpoints

### 1. Onboarding Module

#### Get Onboarding Programs
```http
GET /onboarding/programs
```
**Query Parameters:**
- `is_active` (boolean, optional): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "program_id": "uuid",
      "program_name": "Standard Onboarding",
      "duration_days": 30,
      "is_active": true
    }
  ]
}
```

#### Get Employee Onboarding Status
```http
GET /onboarding/employees/:employee_id
```

#### Complete Onboarding Task
```http
POST /onboarding/tasks/:progress_id/complete
```
**Body:**
```json
{
  "employee_id": "uuid",
  "notes": "Task completed successfully"
}
```

#### Get Pending Tasks
```http
GET /onboarding/employees/:employee_id/pending
```

#### Get Onboarding Statistics
```http
GET /onboarding/statistics
```

---

### 2. Offboarding Module

#### Initiate Offboarding
```http
POST /offboarding/initiate
```
**Body:**
```json
{
  "employee_id": "uuid",
  "resignation_date": "2024-01-15",
  "last_working_day": "2024-02-15",
  "reason": "resignation",
  "reason_details": "Career growth opportunity",
  "notice_period_days": 30,
  "rehire_eligible": true
}
```

#### Get Employee Offboarding Status
```http
GET /offboarding/employees/:employee_id
```

#### Complete Offboarding Task
```http
POST /offboarding/tasks/:progress_id/complete
```

#### Conduct Exit Interview
```http
POST /offboarding/:offboarding_id/exit-interview
```

#### Process Final Settlement
```http
POST /offboarding/:offboarding_id/final-settlement
```

#### Get Pending Clearances
```http
GET /offboarding/pending-clearances
```

---

### 3. Performance Management Module

#### Create Performance Cycle
```http
POST /performance/cycles
```
**Body:**
```json
{
  "cycle_name": "Annual Review 2024",
  "cycle_type": "annual",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "enable_self_assessment": true,
  "enable_peer_review": true,
  "enable_360_review": false
}
```

#### Get Performance Cycles
```http
GET /performance/cycles
```
**Query Parameters:**
- `status` (string, optional): Filter by status (draft, active, completed, archived)

#### Create Goal
```http
POST /performance/goals
```
**Body:**
```json
{
  "employee_id": "uuid",
  "cycle_id": "uuid",
  "goal_title": "Improve customer satisfaction",
  "goal_description": "Increase CSAT score from 85% to 90%",
  "goal_type": "kpi",
  "category": "individual",
  "start_date": "2024-01-01",
  "target_date": "2024-12-31",
  "metric_type": "percentage",
  "target_value": 90,
  "weight_percentage": 25
}
```

#### Get Employee Goals
```http
GET /performance/employees/:employee_id/goals
```
**Query Parameters:**
- `cycle_id` (string, optional)
- `status` (string, optional)

#### Update Goal Progress
```http
PUT /performance/goals/:goal_id/progress
```
**Body:**
```json
{
  "employee_id": "uuid",
  "current_value": 87,
  "progress_percentage": 60,
  "notes": "Making good progress"
}
```

#### Provide Feedback
```http
POST /performance/feedback
```
**Body:**
```json
{
  "feedback_for_employee_id": "uuid",
  "feedback_type": "positive",
  "feedback_category": "teamwork",
  "feedback_text": "Excellent collaboration on the project",
  "is_anonymous": false,
  "visibility": "employee"
}
```

#### Get Employee Feedback
```http
GET /performance/employees/:employee_id/feedback
```

#### Assess Competency
```http
POST /performance/competencies/assess
```
**Body:**
```json
{
  "employee_id": "uuid",
  "competency_id": "uuid",
  "proficiency_level": "advanced",
  "target_level": "expert",
  "notes": "Strong technical skills, ready for expert level"
}
```

#### Get Performance Analytics
```http
GET /performance/analytics
```
**Query Parameters:**
- `cycle_id` (string, optional)
- `department_id` (string, optional)

#### Get Top Performers
```http
GET /performance/analytics/top-performers
```
**Query Parameters:**
- `cycle_id` (string, required)
- `limit` (number, optional, default: 10)

---

### 4. Timesheet & Project Tracking Module

#### Create Project
```http
POST /timesheet/projects
```
**Body:**
```json
{
  "project_code": "PROJ-001",
  "project_name": "Website Redesign",
  "project_type": "billable",
  "client_name": "Acme Corp",
  "start_date": "2024-01-01",
  "end_date": "2024-06-30",
  "budget": 100000,
  "currency": "USD"
}
```

#### Get Projects
```http
GET /timesheet/projects
```
**Query Parameters:**
- `status` (string, optional)
- `project_type` (string, optional)

#### Add Project Member
```http
POST /timesheet/projects/members
```
**Body:**
```json
{
  "project_id": "uuid",
  "employee_id": "uuid",
  "role": "Developer",
  "hourly_rate": 75.00,
  "allocation_percentage": 100,
  "start_date": "2024-01-01"
}
```

#### Create Timesheet Entry
```http
POST /timesheet/entries
```
**Body:**
```json
{
  "project_id": "uuid",
  "task_id": "uuid",
  "work_date": "2024-01-15",
  "hours_worked": 8.5,
  "is_billable": true,
  "description": "Implemented user authentication feature"
}
```

#### Get Timesheet Entries
```http
GET /timesheet/entries/:employee_id?
```
**Query Parameters:**
- `start_date` (date, optional)
- `end_date` (date, optional)
- `project_id` (string, optional)
- `status` (string, optional)

#### Submit Timesheet
```http
POST /timesheet/entries/submit
```
**Body:**
```json
{
  "entry_ids": ["uuid1", "uuid2", "uuid3"]
}
```

#### Approve Timesheet Entry
```http
POST /timesheet/entries/:entry_id/approve
```

#### Reject Timesheet Entry
```http
POST /timesheet/entries/:entry_id/reject
```
**Body:**
```json
{
  "rejection_reason": "Hours seem excessive, please review"
}
```

#### Get Employee Time Summary
```http
GET /timesheet/analytics/employee/:employee_id/summary
```
**Query Parameters:**
- `start_date` (date, required)
- `end_date` (date, required)

#### Get Project Time Summary
```http
GET /timesheet/analytics/project/:project_id/summary
```

#### Get Pending Approvals
```http
GET /timesheet/analytics/pending-approvals
```

---

### 5. Compliance Module

#### Get Audit Logs
```http
GET /compliance/audit-logs
```
**Query Parameters:**
- `entity_type` (string, optional)
- `entity_id` (string, optional)
- `user_id` (string, optional)
- `action` (string, optional)
- `start_date` (date, optional)
- `end_date` (date, optional)
- `limit` (number, optional, default: 50)
- `offset` (number, optional, default: 0)

#### Get Audit Trail for Entity
```http
GET /compliance/audit-logs/:entity_type/:entity_id
```

#### Create Compliance Document
```http
POST /compliance/documents
```
**Body:**
```json
{
  "employee_id": "uuid",
  "document_type": "passport",
  "document_name": "John Doe Passport",
  "document_number": "AB123456",
  "issuing_authority": "Government",
  "issue_date": "2020-01-01",
  "expiry_date": "2030-01-01",
  "file_path": "/uploads/documents/passport-123.pdf"
}
```

#### Verify Document
```http
POST /compliance/documents/:document_id/verify
```
**Body:**
```json
{
  "verification_status": "verified",
  "verification_notes": "Document verified successfully"
}
```

#### Get Employee Documents
```http
GET /compliance/documents/employee/:employee_id
```
**Query Parameters:**
- `document_type` (string, optional)
- `verification_status` (string, optional)

#### Get Expiring Documents
```http
GET /compliance/documents/expiring
```
**Query Parameters:**
- `days` (number, optional, default: 30)

#### Create Data Retention Policy
```http
POST /compliance/retention-policies
```
**Body:**
```json
{
  "entity_type": "audit_logs",
  "retention_period_days": 365,
  "delete_after_retention": false,
  "anonymize_after_retention": true
}
```

#### Get Retention Policies
```http
GET /compliance/retention-policies
```

#### Apply Retention Policies
```http
POST /compliance/retention-policies/apply
```

#### Record GDPR Consent
```http
POST /compliance/gdpr/consent
```
**Body:**
```json
{
  "employee_id": "uuid",
  "consent_type": "data_processing",
  "consent_given": true
}
```

#### Withdraw Consent
```http
POST /compliance/gdpr/consent/withdraw
```

#### Export Employee Data (GDPR)
```http
GET /compliance/gdpr/export/:employee_id
```

#### Delete Employee Data (GDPR)
```http
DELETE /compliance/gdpr/delete/:employee_id
```

#### Get Compliance Report
```http
GET /compliance/reports/:report_type
```
**Report Types:**
- `document_verification`
- `data_retention`
- `audit_activity`
- `gdpr_consents`

---

### 6. Analytics Module

#### Get Dashboard Metrics
```http
GET /analytics/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "headcount": {
      "metric": "headcount",
      "value": 150,
      "change": 5,
      "trend": "up"
    },
    "attrition_rate": {
      "metric": "attrition_rate",
      "value": 8.5,
      "trend": "stable"
    },
    "attendance_rate": {
      "metric": "attendance_rate",
      "value": 94.2,
      "trend": "up"
    },
    "pending_approvals": {
      "leave": 12,
      "timesheet": 8,
      "onboarding_tasks": 5,
      "offboarding_tasks": 2
    }
  }
}
```

#### Get Attrition Analysis
```http
GET /analytics/attrition
```
**Query Parameters:**
- `period_months` (number, optional, default: 12)

#### Get Attendance Trends
```http
GET /analytics/attendance-trends
```
**Query Parameters:**
- `period_days` (number, optional, default: 30)

#### Get Department Analytics
```http
GET /analytics/departments
```

#### Predict Attrition Risk
```http
GET /analytics/attrition-risk
```

#### Export Report
```http
GET /analytics/export
```
**Query Parameters:**
- `report_type` (string, required): headcount, attendance, performance
- `format` (string, optional, default: csv): csv, xlsx, pdf

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Rate Limiting

- Authentication endpoints: 5 requests per minute per IP
- All other endpoints: 100 requests per minute per user

---

## Pagination

List endpoints support pagination with the following query parameters:
- `page` (number, default: 1)
- `limit` (number, default: 10, max: 100)

**Response format:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```
