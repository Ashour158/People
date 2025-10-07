# HR Management System - API Documentation

## Base URL
```
Production: https://api.yourdomain.com/api/v1
Development: http://localhost:5000/api/v1
```

## Authentication

All API requests (except auth endpoints) require a JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Token Expiration
- Access Token: 24 hours
- Refresh Token: 7 days

---

## 1. Authentication Endpoints

### 1.1 Register Organization

Create a new organization with first admin user.

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "organization_name": "Acme Corporation",
  "organization_code": "ACME",
  "company_name": "Acme Inc",
  "email": "admin@acme.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "phone_number": "1234567890",
  "timezone": "America/New_York",
  "currency": "USD"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "user_id": "uuid",
      "email": "admin@acme.com",
      "name": "John Doe"
    },
    "organization": {
      "organization_id": "uuid",
      "organization_name": "Acme Corporation"
    },
    "tokens": {
      "access_token": "eyJhbGc...",
      "refresh_token": "eyJhbGc...",
      "expires_in": "24h"
    }
  }
}
```

### 1.2 Login

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "remember_me": false
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "user_id": "uuid",
      "email": "user@example.com",
      "employee_id": "uuid",
      "name": "John Doe",
      "organization_id": "uuid"
    },
    "tokens": {
      "access_token": "eyJhbGc...",
      "refresh_token": "eyJhbGc..."
    }
  }
}
```

### 1.3 Refresh Token

**Endpoint:** `POST /auth/refresh-token`

**Request Body:**
```json
{
  "refresh_token": "eyJhbGc..."
}
```

### 1.4 Forgot Password

**Endpoint:** `POST /auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### 1.5 Reset Password

**Endpoint:** `POST /auth/reset-password`

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePass123!"
}
```

### 1.6 Change Password

**Endpoint:** `POST /auth/change-password`
**Auth Required:** Yes

**Request Body:**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword123!"
}
```

### 1.7 Get Current User

**Endpoint:** `GET /auth/me`
**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "employee_id": "uuid",
    "employee_code": "EMP001",
    "name": "John Doe",
    "organization_id": "uuid",
    "organization_name": "Acme Corporation",
    "roles": [
      {
        "role_id": "uuid",
        "role_name": "Manager",
        "role_code": "manager"
      }
    ],
    "permissions": ["employees.view", "employees.create", "leave.approve"]
  }
}
```

### 1.8 Logout

**Endpoint:** `POST /auth/logout`
**Auth Required:** Yes

---

## 2. Employee Management

### 2.1 Get All Employees

**Endpoint:** `GET /employees`
**Auth Required:** Yes
**Permission:** `employees.view`

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 10, max: 100)
- `search` (string): Search by name, code, or email
- `company_id` (uuid): Filter by company
- `department_id` (uuid): Filter by department
- `location_id` (uuid): Filter by location
- `employee_status` (string): Filter by status (active, on_probation, etc.)
- `employment_type` (string): Filter by type (full_time, part_time, etc.)

**Example:** `GET /employees?page=1&limit=20&search=john&department_id=uuid&status=active`

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
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone_number": "1234567890",
      "hire_date": "2024-01-01",
      "employment_type": "full_time",
      "employee_status": "active",
      "company_name": "Acme Inc",
      "department_name": "Engineering",
      "designation_name": "Senior Developer",
      "location_name": "New York",
      "manager_name": "Jane Smith",
      "profile_picture_url": "https://...",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### 2.2 Get Employee by ID

**Endpoint:** `GET /employees/:id`
**Auth Required:** Yes
**Permission:** `employees.view`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "employee_id": "uuid",
    "employee_code": "EMP001",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "personal_email": "john.personal@gmail.com",
    "phone_number": "1234567890",
    "date_of_birth": "1990-01-01",
    "gender": "male",
    "blood_group": "O+",
    "marital_status": "married",
    "nationality": "American",
    "hire_date": "2024-01-01",
    "employment_type": "full_time",
    "employee_status": "active",
    "company_name": "Acme Inc",
    "department_name": "Engineering",
    "designation_name": "Senior Developer",
    "location_name": "New York",
    "manager_name": "Jane Smith",
    "manager_email": "jane@example.com",
    "addresses": [
      {
        "address_id": "uuid",
        "address_type": "current",
        "address_line1": "123 Main St",
        "city": "New York",
        "state": "NY",
        "country": "USA",
        "postal_code": "10001",
        "is_primary": true
      }
    ],
    "emergency_contacts": [
      {
        "contact_id": "uuid",
        "contact_name": "Jane Doe",
        "relationship": "spouse",
        "phone_number": "0987654321",
        "is_primary": true
      }
    ],
    "education": [],
    "work_experience": []
  }
}
```

### 2.3 Create Employee

**Endpoint:** `POST /employees`
**Auth Required:** Yes
**Permission:** `employees.create`

**Request Body:**
```json
{
  "employee_code": "EMP002",
  "first_name": "Jane",
  "middle_name": "Marie",
  "last_name": "Smith",
  "email": "jane@example.com",
  "personal_email": "jane.personal@gmail.com",
  "phone_number": "1234567890",
  "date_of_birth": "1992-05-15",
  "gender": "female",
  "blood_group": "A+",
  "marital_status": "single",
  "nationality": "American",
  "company_id": "uuid",
  "department_id": "uuid",
  "designation_id": "uuid",
  "location_id": "uuid",
  "hire_date": "2024-01-15",
  "employment_type": "full_time",
  "probation_period_months": 3,
  "reporting_manager_id": "uuid",
  "work_location_type": "office",
  "emergency_contact_name": "John Smith",
  "emergency_contact_phone": "0987654321",
  "emergency_contact_relationship": "father"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "employee_id": "uuid",
    "employee_code": "EMP002",
    "full_name": "Jane Marie Smith",
    "email": "jane@example.com"
  }
}
```

### 2.4 Update Employee

**Endpoint:** `PUT /employees/:id`
**Auth Required:** Yes
**Permission:** `employees.edit`

**Request Body:** (Same as create, all fields optional)
```json
{
  "first_name": "Jane",
  "phone_number": "1234567890",
  "department_id": "uuid"
}
```

### 2.5 Terminate Employee

**Endpoint:** `POST /employees/:id/terminate`
**Auth Required:** Yes
**Permission:** `employees.edit`

**Request Body:**
```json
{
  "termination_date": "2024-12-31",
  "last_working_date": "2024-12-31",
  "termination_reason": "Resignation",
  "termination_type": "voluntary",
  "is_rehire_eligible": true
}
```

### 2.6 Delete Employee (Soft Delete)

**Endpoint:** `DELETE /employees/:id`
**Auth Required:** Yes
**Permission:** `employees.delete`

### 2.7 Get Employee's Team

**Endpoint:** `GET /employees/:id/team`
**Auth Required:** Yes
**Permission:** `employees.view`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "employee_id": "uuid",
      "employee_code": "EMP003",
      "full_name": "Bob Johnson",
      "email": "bob@example.com",
      "designation_name": "Developer",
      "hire_date": "2024-02-01"
    }
  ]
}
```

### 2.8 Get Employee Statistics

**Endpoint:** `GET /employees/stats`
**Auth Required:** Yes
**Permission:** `employees.view`

**Query Parameters:**
- `company_id` (uuid): Filter by company

**Response:**
```json
{
  "success": true,
  "data": {
    "total_employees": 250,
    "active_employees": 230,
    "on_probation": 15,
    "on_leave": 5,
    "terminated": 0,
    "full_time": 200,
    "part_time": 30,
    "contract": 15,
    "interns": 5,
    "male_count": 150,
    "female_count": 100,
    "new_hires_last_month": 10,
    "exits_last_month": 2
  }
}
```

---

## 3. Attendance Management

### 3.1 Check-In

**Endpoint:** `POST /attendance/check-in`
**Auth Required:** Yes

**Request Body:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "location": "New York Office",
  "work_type": "office"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Checked in successfully",
  "data": {
    "attendance_id": "uuid",
    "check_in_time": "2024-01-15T09:00:00Z",
    "is_late": false,
    "late_by_minutes": 0
  }
}
```

### 3.2 Check-Out

**Endpoint:** `POST /attendance/check-out`
**Auth Required:** Yes

**Request Body:**
```json
{
  "attendance_id": "uuid",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "notes": "Completed all tasks"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Checked out successfully",
  "data": {
    "attendance_id": "uuid",
    "check_out_time": "2024-01-15T18:00:00Z",
    "total_hours": 9.0,
    "is_early_departure": false
  }
}
```

### 3.3 Get Attendance Records

**Endpoint:** `GET /attendance`
**Auth Required:** Yes
**Permission:** `attendance.view`

**Query Parameters:**
- `employee_id` (uuid): Filter by employee
- `from_date` (date): Start date
- `to_date` (date): End date
- `status` (string): Filter by status
- `department_id` (uuid): Filter by department
- `page` (integer)
- `limit` (integer)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "attendance_id": "uuid",
      "employee_code": "EMP001",
      "full_name": "John Doe",
      "attendance_date": "2024-01-15",
      "check_in_time": "2024-01-15T09:00:00Z",
      "check_out_time": "2024-01-15T18:00:00Z",
      "total_hours": 9.0,
      "net_hours": 8.0,
      "attendance_status": "present",
      "work_type": "office",
      "is_late": false,
      "is_early_departure": false
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### 3.4 Get Attendance Summary

**Endpoint:** `GET /attendance/summary/:employee_id?`
**Auth Required:** Yes

**Query Parameters:**
- `month` (integer): Month (1-12)
- `year` (integer): Year

**Response:**
```json
{
  "success": true,
  "data": {
    "month": 1,
    "year": 2024,
    "total_days": 22,
    "present_days": 20,
    "absent_days": 0,
    "half_days": 1,
    "leave_days": 1,
    "late_arrivals": 2,
    "early_departures": 1,
    "total_hours": 160.0,
    "overtime_hours": 5.0,
    "avg_hours_per_day": 8.0
  }
}
```

### 3.5 Request Regularization

**Endpoint:** `POST /attendance/regularize`
**Auth Required:** Yes

**Request Body:**
```json
{
  "attendance_date": "2024-01-15",
  "requested_check_in": "2024-01-15T09:00:00Z",
  "requested_check_out": "2024-01-15T18:00:00Z",
  "reason": "Forgot to check in/out",
  "supporting_document_url": "https://..."
}
```

### 3.6 Process Regularization

**Endpoint:** `POST /attendance/regularizations/:id/process`
**Auth Required:** Yes
**Permission:** `attendance.approve`

**Request Body:**
```json
{
  "action": "approve",
  "comments": "Approved"
}
```

### 3.7 Get Team Attendance

**Endpoint:** `GET /attendance/team`
**Auth Required:** Yes
**Permission:** `attendance.view`

**Query Parameters:**
- `date` (string): Date (YYYY-MM-DD)

---

## 4. Leave Management

### 4.1 Get Leave Types

**Endpoint:** `GET /leave/types`
**Auth Required:** Yes

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "leave_type_id": "uuid",
      "leave_type_name": "Annual Leave",
      "leave_code": "AL",
      "leave_category": "earned",
      "description": "Annual paid leave",
      "is_paid": true,
      "default_days_per_year": 20,
      "min_days_per_request": 0.5,
      "max_days_per_request": 15,
      "can_carry_forward": true,
      "max_carry_forward_days": 5,
      "allows_half_day": true,
      "requires_document": false,
      "notice_period_days": 3,
      "color_code": "#4CAF50"
    }
  ]
}
```

### 4.2 Get Leave Balance

**Endpoint:** `GET /leave/balance/:employee_id?`
**Auth Required:** Yes

**Query Parameters:**
- `year` (integer): Year

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "balance_id": "uuid",
      "employee_id": "uuid",
      "leave_type_id": "uuid",
      "leave_type_name": "Annual Leave",
      "year": 2024,
      "allocated_days": 20.0,
      "accrued_days": 0.0,
      "carried_forward_days": 3.0,
      "used_days": 5.0,
      "pending_approval_days": 2.0,
      "available_days": 16.0
    }
  ]
}
```

### 4.3 Apply for Leave

**Endpoint:** `POST /leave/requests`
**Auth Required:** Yes

**Request Body:**
```json
{
  "leave_type_id": "uuid",
  "from_date": "2024-02-01",
  "to_date": "2024-02-05",
  "is_half_day": false,
  "reason": "Personal vacation",
  "contact_details": "Available on phone",
  "delegate_to_employee_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Leave request submitted successfully",
  "data": {
    "leave_request_id": "uuid",
    "request_number": "LR-2024-00001",
    "working_days": 5.0,
    "status": "pending"
  }
}
```

### 4.4 Get Leave Requests

**Endpoint:** `GET /leave/requests`
**Auth Required:** Yes
**Permission:** `leave.view`

**Query Parameters:**
- `employee_id` (uuid)
- `status` (string): pending, approved, rejected, cancelled
- `leave_type_id` (uuid)
- `from_date` (date)
- `to_date` (date)
- `page`, `limit`

### 4.5 Approve/Reject Leave

**Endpoint:** `POST /leave/requests/:id/process`
**Auth Required:** Yes
**Permission:** `leave.approve`

**Request Body:**
```json
{
  "action": "approve",
  "comments": "Approved for vacation",
  "rejection_reason": null
}
```

### 4.6 Cancel Leave Request

**Endpoint:** `POST /leave/requests/:id/cancel`
**Auth Required:** Yes

**Request Body:**
```json
{
  "cancellation_reason": "Plans changed"
}
```

### 4.7 Get Pending Approvals

**Endpoint:** `GET /leave/approvals/pending`
**Auth Required:** Yes
**Permission:** `leave.approve`

### 4.8 Get Leave Calendar

**Endpoint:** `GET /leave/calendar`
**Auth Required:** Yes
**Permission:** `leave.view`

**Query Parameters:**
- `department_id` (uuid)
- `from_date` (date)
- `to_date` (date)

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address"
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

### 409 Conflict
```json
{
  "success": false,
  "error": "Email already exists"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Too many requests. Please try again later."
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

- **General API**: 100 requests per 15 minutes
- **Login**: 5 attempts per 15 minutes
- **Account Lockout**: After 5 failed login attempts, account locked for 30 minutes

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response Meta:**
```json
{
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  }
}
```

---

## Postman Collection

Import the Postman collection for easy testing:

```json
{
  "info": {
    "name": "HR Management System API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [...]
}
```

---

## WebSocket Events (Future)

For real-time notifications:

```javascript
const socket = io('https://api.yourdomain.com', {
  auth: { token: 'your-jwt-token' }
});

socket.on('leave.approved', (data) => {
  console.log('Leave approved:', data);
});

socket.on('attendance.reminder', (data) => {
  console.log('Attendance reminder:', data);
});
```

---

## Support

For API support, contact: api-support@yourdomain.com

**Documentation Version:** 1.0.0  
**Last Updated:** 2024-01-15