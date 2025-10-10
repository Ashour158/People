# API Integration & UAT Guide

## Overview
This document provides a complete guide for API integrations and User Acceptance Testing (UAT) for the HR Management System.

**Last Updated**: October 10, 2025  
**Status**: Ready for UAT Phase 1

---

## 🔌 API Integration Summary

### ✅ Completed Integrations

#### 1. Performance Management Module
**Base URL**: `/api/v1/performance`

| Frontend Page | API Endpoints | Status |
|--------------|---------------|--------|
| Goals Dashboard | `/goals/employee/{id}`, `/goals` | ✅ Connected |
| Performance Reviews | `/reviews`, `/review-cycles` | ✅ Connected |
| 360° Feedback | `/feedback`, `/feedback/employee/{id}` | ✅ Connected |
| KPI Tracking | `/kpis/employee/{id}`, `/kpis/data` | ✅ Connected |

**Key Features**:
- Create and track SMART goals
- Multi-level review cycles (self, manager, peer, 360°)
- Real-time feedback collection
- KPI tracking with trend analysis

#### 2. Recruitment Module
**Base URL**: `/api/v1/recruitment`

| Frontend Page | API Endpoints | Status |
|--------------|---------------|--------|
| Job Postings | `/jobs`, `/jobs/{id}/publish` | ✅ Connected |
| Candidate Pipeline | `/candidates`, `/applications` | ✅ Connected |
| Interview Scheduling | `/interviews`, `/interviews/{id}/feedback` | ✅ Connected |
| Offer Management | `/offers` | ✅ Connected |

**Key Features**:
- Job posting creation and publishing
- Candidate tracking through hiring stages
- Interview scheduling with calendar integration
- Offer letter generation and tracking

#### 3. Payroll Module
**Base URL**: `/api/v1/payroll`

| Frontend Page | API Endpoints | Status |
|--------------|---------------|--------|
| Payroll Dashboard | `/payslip/{id}`, `/reports/monthly-summary` | ✅ Connected |
| Salary Slips | `/payslip/{employee_id}` | ✅ Connected |
| Payroll Processing | `/process`, `/calculate-tax` | ✅ Connected |

**Key Features**:
- Monthly payroll processing
- Tax calculation
- Bonus and loan management
- Year-to-date summaries

#### 4. Expense Management Module
**Base URL**: `/api/v1/expenses`

| Frontend Page | API Endpoints | Status |
|--------------|---------------|--------|
| Expense Dashboard | `/`, `/summary/stats` | ✅ Connected |
| Expense Claims | `/`, `/submit`, `/approve` | ✅ Connected |
| Expense Policies | `/policies` | ✅ Connected |

**Key Features**:
- Policy-based expense submission
- Multi-level approval workflow
- Receipt upload and verification
- Reimbursement tracking

#### 5. Timesheet Module
**Base URL**: `/api/v1/timesheet`

| Frontend Page | API Endpoints | Status |
|--------------|---------------|--------|
| Timesheet Entry | `/entries`, `/entries/submit` | ✅ Connected |
| Project Management | `/projects` | ✅ Connected |
| Time Analytics | `/analytics/employee/{id}/summary` | ✅ Connected |

**Key Features**:
- Daily time entry logging
- Project-based time tracking
- Billable vs non-billable hours
- Time approval workflow

---

## 🔐 Authentication & Authorization

### JWT Token Flow
```
1. User logs in → Receives access token (24h expiry)
2. Token stored in localStorage
3. Token sent in Authorization header: Bearer {token}
4. Refresh token used for token renewal
5. WebSocket connection authenticated with token
```

### Role-Based Permissions

| Role | Key Permissions | Access Level |
|------|----------------|--------------|
| **Super Admin** | All permissions (*) | Full system access |
| **Admin** | Employee, Attendance, Leave management | Organization-wide |
| **HR Manager** | Recruitment, Performance, Reports | HR modules |
| **Manager** | Team approvals, Team reports | Team-level |
| **Employee** | Self-service operations | Own data only |
| **Finance** | Payroll, Expenses, Financial reports | Finance modules |
| **Recruiter** | Recruitment pipeline | Recruitment only |

### Permission Checks
```typescript
// Check single permission
hasPermission(user.permissions, EMPLOYEE_PERMISSIONS.VIEW_ALL)

// Check role
hasRole(user.role, ROLES.ADMIN)

// Route protection
<ProtectedRoute requiredRole="admin">
  <AdminPage />
</ProtectedRoute>

// UI element protection
{hasPermission(user.permissions, 'employees:create') && (
  <Button>Create Employee</Button>
)}
```

---

## 🔴 Real-time Features (WebSocket)

### Connection Setup
```typescript
// Automatic connection on login
websocketService.connect(token);

// Subscribe to channels
websocketService.subscribe([
  'user:{user_id}',
  'organization:{org_id}',
  'employee:{employee_id}'
]);
```

### Real-time Events

| Event | Description | Use Case |
|-------|-------------|----------|
| `notification` | General notifications | All modules |
| `attendance:update` | Attendance status change | Real-time attendance tracking |
| `leave:approved` | Leave request approved | Instant notification to employee |
| `leave:rejected` | Leave request rejected | Instant notification to employee |
| `expense:update` | Expense status change | Approval workflow updates |
| `payroll:update` | Payroll processed | Salary slip available |

### Usage Example
```typescript
// Listen for leave approvals
websocketService.on('leave:approved', (data) => {
  showNotification('Your leave request was approved!');
  refetchLeaveData();
});
```

---

## ✅ Form Validation

### Validation Schemas Available

#### Performance Management
- `goalSchema` - Goal creation with SMART criteria
- `performanceReviewSchema` - Review submission
- `feedbackSchema` - Feedback provision

#### Recruitment
- `jobPostingSchema` - Job posting creation
- `candidateSchema` - Candidate registration
- `interviewScheduleSchema` - Interview scheduling

#### Payroll
- `salaryStructureSchema` - Salary structure setup
- `bonusSchema` - Bonus allocation

#### Expenses
- `expensePolicySchema` - Policy creation
- `expenseSchema` - Expense claim submission

#### Timesheet
- `timesheetEntrySchema` - Time entry logging
- `projectSchema` - Project creation

### Validation Usage
```typescript
import { yupResolver } from '@hookform/resolvers/yup';
import { goalSchema } from '../validations';

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: yupResolver(goalSchema),
});
```

---

## 🧪 UAT Test Scenarios

### Phase 1: Core Modules (Week 1-2)

#### Employee Management
- [ ] Create new employee
- [ ] Update employee details
- [ ] View employee profile
- [ ] Soft delete employee
- [ ] Search and filter employees

#### Attendance Management
- [ ] Check-in with geolocation
- [ ] Check-out with notes
- [ ] Request attendance regularization
- [ ] Manager approval of regularization
- [ ] View monthly attendance summary

#### Leave Management
- [ ] Apply for leave
- [ ] View leave balance
- [ ] Manager approval/rejection
- [ ] Cancel pending leave
- [ ] View leave history

### Phase 2: Advanced Modules (Week 3-4)

#### Performance Management
- [ ] Create individual goal
- [ ] Update goal progress
- [ ] Submit self-review
- [ ] Provide 360° feedback
- [ ] View performance analytics

#### Recruitment
- [ ] Create job posting
- [ ] Publish job to careers page
- [ ] Add candidate profile
- [ ] Schedule interview
- [ ] Submit interview feedback
- [ ] Create job offer
- [ ] Track application pipeline

#### Expense Management
- [ ] Submit expense claim
- [ ] Upload receipt
- [ ] Manager approval
- [ ] Finance reimbursement
- [ ] View expense statistics

#### Payroll
- [ ] Create salary structure
- [ ] Process monthly payroll
- [ ] Download salary slip
- [ ] Add bonus
- [ ] View YTD summary

#### Timesheet
- [ ] Log daily hours
- [ ] Create project
- [ ] Submit timesheet
- [ ] Manager approval
- [ ] View time analytics

### Phase 3: Integration & Real-time (Week 5)

#### WebSocket Features
- [ ] Receive real-time notifications
- [ ] Real-time leave approval updates
- [ ] Real-time attendance updates
- [ ] Real-time expense updates
- [ ] Notification badge updates

#### Permissions
- [ ] Role-based page access
- [ ] Permission-based UI elements
- [ ] Cross-module permissions
- [ ] Permission denied handling

---

## 📝 UAT Test Data

### Test Users

```
Super Admin
- Email: admin@company.com
- Password: Admin@123
- Access: Full system

HR Manager
- Email: hr@company.com
- Password: Hr@123
- Access: HR modules

Manager
- Email: manager@company.com
- Password: Manager@123
- Access: Team management

Employee
- Email: employee@company.com
- Password: Employee@123
- Access: Self-service

Finance
- Email: finance@company.com
- Password: Finance@123
- Access: Financial modules

Recruiter
- Email: recruiter@company.com
- Password: Recruiter@123
- Access: Recruitment
```

### Test Scenarios Data

#### Goals
```json
{
  "title": "Increase team productivity by 20%",
  "description": "Implement automation tools and optimize workflows",
  "goal_type": "team",
  "category": "process",
  "target_value": 120,
  "start_date": "2025-01-01",
  "end_date": "2025-12-31"
}
```

#### Job Posting
```json
{
  "job_title": "Senior Software Engineer",
  "department": "Engineering",
  "location": "New York, NY",
  "job_type": "Full-time",
  "experience_level": "Senior Level",
  "openings": 2,
  "salary_range_min": 100000,
  "salary_range_max": 150000
}
```

#### Expense Claim
```json
{
  "category": "travel",
  "amount": 500,
  "expense_date": "2025-01-15",
  "merchant_name": "Airlines Inc",
  "description": "Flight ticket for client meeting",
  "has_receipt": true
}
```

---

## 🐛 Error Handling

### Common Error Scenarios

| Error Code | Description | User Message | Resolution |
|------------|-------------|--------------|------------|
| 400 | Validation Error | "Please check your input" | Display field errors |
| 401 | Unauthorized | "Please log in again" | Redirect to login |
| 403 | Forbidden | "You don't have permission" | Show permission error |
| 404 | Not Found | "Resource not found" | Show not found page |
| 422 | Validation Failed | "Invalid data format" | Display validation errors |
| 500 | Server Error | "Something went wrong" | Show error boundary |

### Error Handling in API Calls
```typescript
try {
  const response = await employeeApi.create(data);
  showSuccess('Employee created successfully');
} catch (error) {
  if (error.response?.status === 400) {
    // Show validation errors
    showValidationErrors(error.response.data.errors);
  } else if (error.response?.status === 403) {
    // Show permission error
    showError('You don\'t have permission to perform this action');
  } else {
    // Generic error
    showError('An error occurred. Please try again.');
  }
}
```

---

## 📊 Performance Benchmarks

### API Response Times (Target)

| Operation | Target | Acceptable |
|-----------|--------|------------|
| Authentication | < 200ms | < 500ms |
| GET List (paginated) | < 300ms | < 800ms |
| GET Single | < 150ms | < 400ms |
| POST Create | < 400ms | < 1s |
| PUT Update | < 400ms | < 1s |
| DELETE | < 200ms | < 500ms |

### WebSocket
- Connection time: < 1s
- Message delivery: < 100ms
- Reconnection: < 3s

---

## 🔍 Debugging & Troubleshooting

### Browser Console Logs
```
WebSocket connected ✓
Subscribed to channels: ['user:123', 'org:456'] ✓
Received notification: {...} ✓
```

### API Request Debugging
```typescript
// Enable API logging in development
axios.interceptors.request.use(request => {
  console.log('Starting Request', request);
  return request;
});
```

### Common Issues

#### WebSocket Not Connecting
1. Check token is valid
2. Verify backend WebSocket server is running
3. Check firewall/proxy settings
4. Verify CORS configuration

#### Permission Denied
1. Check user role in auth store
2. Verify permissions are loaded
3. Check backend permission middleware
4. Clear cache and re-login

#### Validation Errors
1. Check required fields
2. Verify data formats
3. Check min/max constraints
4. Review validation schema

---

## 📞 Support & Escalation

### UAT Issues Reporting

**Priority Levels**:
- **P0**: System down, data loss
- **P1**: Feature broken, no workaround
- **P2**: Feature broken, workaround available
- **P3**: Minor issue, cosmetic

**Report Format**:
```
Title: Brief description
Priority: P0/P1/P2/P3
Module: Performance/Recruitment/etc.
Steps to Reproduce:
1. ...
2. ...
3. ...
Expected: ...
Actual: ...
Screenshots: [attach]
Browser: Chrome/Firefox/Safari
User Role: Admin/Manager/Employee
```

---

## ✅ Sign-off Checklist

### Before Production Release

#### Technical
- [ ] All API integrations tested
- [ ] WebSocket connectivity verified
- [ ] Permissions working correctly
- [ ] Validation on all forms
- [ ] Error handling implemented
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Database backups configured

#### Functional
- [ ] All UAT scenarios passed
- [ ] User roles tested
- [ ] Real-time features working
- [ ] Reports generating correctly
- [ ] Mobile responsiveness verified
- [ ] Browser compatibility checked

#### Documentation
- [ ] User manuals created
- [ ] Admin guides prepared
- [ ] API documentation updated
- [ ] Training materials ready
- [ ] Support documentation complete

---

**Document Version**: 1.0  
**Next Review**: After UAT Phase 1 completion  
**Prepared by**: Development Team  
**Approved by**: [Pending]
