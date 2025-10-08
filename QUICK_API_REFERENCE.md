# Quick API Reference - New Modules

## Performance Management

### Cycles
```bash
# Create cycle
POST /api/v1/performance/cycles
{
  "cycle_name": "Annual 2024",
  "cycle_code": "APR2024",
  "cycle_type": "annual",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31"
}

# List cycles
GET /api/v1/performance/cycles?page=1&perPage=10

# Get cycle by ID
GET /api/v1/performance/cycles/:id

# Update cycle
PUT /api/v1/performance/cycles/:id

# Delete cycle
DELETE /api/v1/performance/cycles/:id
```

### Goals
```bash
# Create goal
POST /api/v1/performance/goals
{
  "employee_id": "uuid",
  "goal_title": "Increase sales by 20%",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "weight_percentage": 30
}

# Update progress
POST /api/v1/performance/goals/:id/progress
{
  "progress_percentage": 75,
  "actual_value": "18%",
  "progress_notes": "On track"
}

# List goals
GET /api/v1/performance/goals?employee_id=uuid&cycle_id=uuid
```

### Reviews
```bash
# Create review
POST /api/v1/performance/reviews
{
  "employee_id": "uuid",
  "reviewer_id": "uuid",
  "cycle_id": "uuid",
  "review_type": "manager"
}

# Update review
PUT /api/v1/performance/reviews/:id
{
  "overall_rating": 4,
  "strengths": "...",
  "areas_of_improvement": "..."
}

# Submit review
POST /api/v1/performance/reviews/:id/submit
```

### Feedback
```bash
# Create feedback
POST /api/v1/performance/feedback
{
  "employee_id": "uuid",
  "feedback_from_employee_id": "uuid",
  "feedback_type": "positive",
  "feedback_text": "Great work on the project!"
}
```

## Payroll Management

### Components
```bash
# Create component
POST /api/v1/payroll/components
{
  "component_name": "Basic Salary",
  "component_code": "BASIC",
  "component_type": "earning",
  "calculation_type": "fixed",
  "calculation_value": 50000,
  "is_taxable": true
}

# List components
GET /api/v1/payroll/components?component_type=earning
```

### Employee Compensation
```bash
# Create compensation
POST /api/v1/payroll/employee-compensation
{
  "employee_id": "uuid",
  "effective_from_date": "2024-01-01",
  "annual_ctc": 600000,
  "monthly_gross": 50000,
  "salary_type": "monthly"
}

# Get employee compensation
GET /api/v1/payroll/employee-compensation/:employeeId
```

### Payroll Runs
```bash
# Create run
POST /api/v1/payroll/runs
{
  "run_name": "January 2024",
  "run_code": "PAY202401",
  "period_month": 1,
  "period_year": 2024,
  "pay_date": "2024-02-01"
}

# Process run
POST /api/v1/payroll/runs/:id/process

# Finalize run
POST /api/v1/payroll/runs/:id/finalize

# List payslips
GET /api/v1/payroll/payslips?employee_id=uuid&run_id=uuid
```

## Recruitment Management

### Jobs
```bash
# Create job
POST /api/v1/recruitment/jobs
{
  "job_title": "Senior Developer",
  "job_code": "SD2024001",
  "employment_type": "full_time",
  "experience_level": "senior",
  "job_description": "...",
  "required_skills": "Java, Spring, AWS"
}

# Publish job
POST /api/v1/recruitment/jobs/:id/publish

# Close job
POST /api/v1/recruitment/jobs/:id/close

# List jobs
GET /api/v1/recruitment/jobs?job_status=published
```

### Candidates
```bash
# Create candidate
POST /api/v1/recruitment/candidates
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone_number": "+1234567890",
  "resume_url": "https://..."
}

# List candidates
GET /api/v1/recruitment/candidates
```

### Applications
```bash
# Create application
POST /api/v1/recruitment/applications
{
  "job_posting_id": "uuid",
  "candidate_id": "uuid"
}

# Update status
PUT /api/v1/recruitment/applications/:id/status
{
  "status": "interview"
}
# Valid statuses: applied, screening, interview, offered, hired, rejected

# List applications
GET /api/v1/recruitment/applications?job_posting_id=uuid
```

### Interviews
```bash
# Schedule interview
POST /api/v1/recruitment/interviews
{
  "application_id": "uuid",
  "interview_type": "technical",
  "scheduled_date": "2024-02-15T10:00:00Z"
}

# Update interview
PUT /api/v1/recruitment/interviews/:id
{
  "scheduled_date": "2024-02-16T14:00:00Z",
  "interview_status": "completed"
}

# Add feedback
POST /api/v1/recruitment/interviews/:id/feedback
{
  "feedback": "Strong technical skills",
  "rating": 4
}

# List interviews
GET /api/v1/recruitment/interviews
```

## Common Patterns

### Authentication
All requests require JWT token:
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Pagination
```bash
GET /api/v1/{module}/{endpoint}?page=1&perPage=20
```

### Filtering
```bash
GET /api/v1/performance/goals?employee_id=uuid&cycle_id=uuid
GET /api/v1/payroll/payslips?employee_id=uuid&run_id=uuid
GET /api/v1/recruitment/jobs?job_status=published
```

### Response Format
```json
{
  "success": true,
  "data": {...},
  "meta": {
    "page": 1,
    "perPage": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

## Testing with cURL

```bash
# Set your token
export TOKEN="your_jwt_token_here"

# Create a performance goal
curl -X POST http://localhost:5000/api/v1/performance/goals \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "uuid",
    "goal_title": "Improve code quality",
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  }'

# Create a job posting
curl -X POST http://localhost:5000/api/v1/recruitment/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "job_title": "Backend Developer",
    "job_code": "BD2024001",
    "employment_type": "full_time",
    "job_description": "We are looking for..."
  }'

# Process payroll
curl -X POST http://localhost:5000/api/v1/payroll/runs/uuid/process \
  -H "Authorization: Bearer $TOKEN"
```

## HTTP Status Codes

- `200 OK` - Successful GET, PUT
- `201 Created` - Successful POST (create)
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error
