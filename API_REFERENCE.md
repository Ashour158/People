# API Documentation - HR Management System

Base URL: `http://localhost:8000/api/v1`

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### Register Organization
Create a new organization with the first admin user.

**POST** `/auth/register`

**Request Body:**
```json
{
  "organization_name": "My Company",
  "organization_code": "MYCOMP",
  "username": "admin",
  "email": "admin@example.com",
  "password": "Password123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "+1234567890"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "user_id": "uuid",
      "username": "admin",
      "email": "admin@example.com",
      "organization": {
        "organization_id": "uuid",
        "organization_name": "My Company",
        "organization_code": "MYCOMP"
      }
    }
  }
}
```

### Login
Authenticate a user and receive a JWT token.

**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "Password123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "user_id": "uuid",
      "username": "admin",
      "email": "admin@example.com",
      "organization_id": "uuid"
    }
  }
}
```

### Get Current User
Get the authenticated user's profile.

**GET** `/auth/me`
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "username": "admin",
    "email": "admin@example.com",
    "organization_name": "My Company",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Change Password
Change the authenticated user's password.

**POST** `/auth/change-password`
**Auth Required:** Yes

**Request Body:**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword123!"
}
```

**Response:** `200 OK`

### Forgot Password
Request a password reset email.

**POST** `/auth/forgot-password`

**Request Body:**
```json
{
  "email": "admin@example.com"
}
```

**Response:** `200 OK`

### Reset Password
Reset password using the token from email.

**POST** `/auth/reset-password`

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewPassword123!"
}
```

**Response:** `200 OK`

### Logout
Logout the authenticated user.

**POST** `/auth/logout`
**Auth Required:** Yes

**Response:** `200 OK`

---

## Employee Endpoints

### List Employees
Get a paginated list of employees.

**GET** `/employees`
**Auth Required:** Yes
**Permission:** `employee.view`

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `perPage` (number): Items per page (default: 10, max: 100)
- `company_id` (uuid): Filter by company
- `department_id` (uuid): Filter by department
- `employee_status` (string): Filter by status (active, inactive, terminated, on_leave)
- `search` (string): Search by name, email, or code

**Example:** `/employees?page=1&perPage=10&employee_status=active`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "employee_id": "uuid",
      "employee_code": "EMP001",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "phone_number": "+1234567890",
      "department_name": "Engineering",
      "designation_name": "Software Engineer",
      "employee_status": "active"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### Get Employee
Get a specific employee by ID.

**GET** `/employees/:id`
**Auth Required:** Yes
**Permission:** `employee.view`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "employee_id": "uuid",
    "employee_code": "EMP001",
    "first_name": "John",
    "middle_name": "M",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone_number": "+1234567890",
    "date_of_birth": "1990-01-01",
    "gender": "male",
    "department_name": "Engineering",
    "designation_name": "Software Engineer",
    "location_name": "New York",
    "manager_name": "Jane Smith",
    "date_of_joining": "2020-01-15",
    "employment_type": "full_time",
    "employee_status": "active"
  }
}
```

### Create Employee
Create a new employee.

**POST** `/employees`
**Auth Required:** Yes
**Permission:** `employee.create`

**Request Body:**
```json
{
  "company_id": "uuid",
  "employee_code": "EMP002",
  "first_name": "Jane",
  "middle_name": "M",
  "last_name": "Smith",
  "email": "jane.smith@example.com",
  "phone_number": "+1234567890",
  "date_of_birth": "1992-05-15",
  "gender": "female",
  "department_id": "uuid",
  "designation_id": "uuid",
  "location_id": "uuid",
  "manager_id": "uuid",
  "date_of_joining": "2021-03-01",
  "employment_type": "full_time",
  "employee_status": "active"
}
```

**Response:** `201 Created`

### Update Employee
Update an existing employee.

**PUT** `/employees/:id`
**Auth Required:** Yes
**Permission:** `employee.update`

**Request Body:**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "phone_number": "+1234567890",
  "department_id": "uuid",
  "employee_status": "active"
}
```

**Response:** `200 OK`

### Delete Employee
Soft delete an employee.

**DELETE** `/employees/:id`
**Auth Required:** Yes
**Permission:** `employee.delete`

**Response:** `200 OK`

---

## Attendance Endpoints

### Check In
Mark attendance check-in for the current user.

**POST** `/attendance/check-in`
**Auth Required:** Yes

**Request Body:** (all optional)
```json
{
  "check_in_time": "2024-01-15T09:00:00Z",
  "location": "Office",
  "notes": "Early arrival"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "attendance_id": "uuid",
    "employee_id": "uuid",
    "attendance_date": "2024-01-15",
    "check_in_time": "2024-01-15T09:00:00Z",
    "attendance_status": "present"
  }
}
```

### Check Out
Mark attendance check-out for the current user.

**POST** `/attendance/check-out`
**Auth Required:** Yes

**Request Body:** (all optional)
```json
{
  "check_out_time": "2024-01-15T18:00:00Z",
  "location": "Office",
  "notes": "Regular checkout"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "attendance_id": "uuid",
    "check_in_time": "2024-01-15T09:00:00Z",
    "check_out_time": "2024-01-15T18:00:00Z",
    "total_hours": 9.0
  }
}
```

### Get Attendance
Get attendance records.

**GET** `/attendance`
**Auth Required:** Yes

**Query Parameters:**
- `page` (number): Page number
- `perPage` (number): Items per page
- `employee_id` (uuid): Filter by employee (admins only)
- `from_date` (date): Filter from date
- `to_date` (date): Filter to date

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "attendance_id": "uuid",
      "employee_code": "EMP001",
      "first_name": "John",
      "last_name": "Doe",
      "attendance_date": "2024-01-15",
      "check_in_time": "2024-01-15T09:00:00Z",
      "check_out_time": "2024-01-15T18:00:00Z",
      "total_hours": 9.0,
      "attendance_status": "present"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 10,
    "total": 30,
    "totalPages": 3
  }
}
```

### Request Regularization
Request attendance regularization for a past date.

**POST** `/attendance/regularization`
**Auth Required:** Yes

**Request Body:**
```json
{
  "attendance_date": "2024-01-14",
  "requested_check_in": "2024-01-14T09:00:00Z",
  "requested_check_out": "2024-01-14T18:00:00Z",
  "reason": "Forgot to check in/out",
  "supporting_document_url": "https://example.com/doc.pdf"
}
```

**Response:** `201 Created`

---

## Leave Endpoints

### Get Leave Types
Get available leave types for the organization.

**GET** `/leave/types`
**Auth Required:** Yes

**Query Parameters:**
- `company_id` (uuid): Filter by company (optional)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "leave_type_id": "uuid",
      "leave_type_name": "Annual Leave",
      "leave_code": "AL",
      "leave_category": "paid",
      "is_paid": true,
      "default_days_per_year": 20,
      "allows_half_day": true,
      "color_code": "#4CAF50"
    }
  ]
}
```

### Apply for Leave
Submit a leave application.

**POST** `/leave/apply`
**Auth Required:** Yes

**Request Body:**
```json
{
  "leave_type_id": "uuid",
  "from_date": "2024-02-01",
  "to_date": "2024-02-05",
  "is_half_day": false,
  "reason": "Family vacation",
  "contact_details": "+1234567890"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "leave_application_id": "uuid",
    "employee_id": "uuid",
    "leave_type_id": "uuid",
    "from_date": "2024-02-01",
    "to_date": "2024-02-05",
    "total_days": 5,
    "leave_status": "pending"
  }
}
```

### Get Leave Applications
Get leave applications.

**GET** `/leave`
**Auth Required:** Yes

**Query Parameters:**
- `page` (number): Page number
- `perPage` (number): Items per page
- `employee_id` (uuid): Filter by employee (admins only)
- `leave_status` (string): Filter by status (pending, approved, rejected, cancelled)
- `leave_type_id` (uuid): Filter by leave type

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "leave_application_id": "uuid",
      "employee_code": "EMP001",
      "first_name": "John",
      "last_name": "Doe",
      "leave_type_name": "Annual Leave",
      "from_date": "2024-02-01",
      "to_date": "2024-02-05",
      "total_days": 5,
      "leave_status": "pending",
      "reason": "Family vacation"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

### Approve/Reject Leave
Approve or reject a leave application.

**POST** `/leave/:id/action`
**Auth Required:** Yes
**Permission:** `leave.approve`

**Request Body:**
```json
{
  "action": "approve",
  "comments": "Approved for requested dates"
}
```

OR

```json
{
  "action": "reject",
  "rejection_reason": "Insufficient staffing during this period",
  "comments": "Please reschedule"
}
```

**Response:** `200 OK`

### Get Leave Balance
Get leave balance for an employee.

**GET** `/leave/balance/:employeeId?`
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "leave_type_name": "Annual Leave",
      "leave_code": "AL",
      "allocated_days": 20,
      "used_days": 5,
      "available_days": 15,
      "pending_days": 2
    }
  ]
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "\"email\" must be a valid email"
    }
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

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Too many requests from this IP, please try again later."
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

## Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Login endpoint**: 5 requests per 15 minutes per IP

---

## Postman Collection

You can import this API into Postman for testing. A Postman collection will be provided separately.

---

## WebSocket Events (Future)

Real-time events will be implemented via WebSocket in future versions:
- New leave application
- Attendance updates
- Notifications
