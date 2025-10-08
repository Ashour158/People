# HR Management System - Advanced Features Implementation

This document describes the advanced features implemented to close the gap with enterprise HR systems like Zoho People.

## Table of Contents
1. [Event-Driven Architecture](#event-driven-architecture)
2. [Workflow Engine](#workflow-engine)
3. [Permission Matrix](#permission-matrix)
4. [Leave Accrual Policies](#leave-accrual-policies)
5. [Feature Flags](#feature-flags)
6. [Document Management](#document-management)
7. [Reporting Warehouse](#reporting-warehouse)
8. [Unified Notifications](#unified-notifications)
9. [Database Schema](#database-schema)
10. [API Usage Examples](#api-usage-examples)

---

## Event-Driven Architecture

### Overview
A complete event-driven architecture enables decoupling of business logic from notifications, integrations, and side effects.

### Components

#### 1. Domain Events (`backend/src/events/events.ts`)
Strongly-typed events for all domain actions:
- **Employee Events**: Created, Updated, Terminated
- **Leave Events**: Requested, Approved, Rejected
- **Timesheet Events**: Submitted, Approved, Rejected
- **Attendance Events**: CheckedIn, CheckedOut
- **Payroll Events**: RunCreated, RunProcessed, RunApproved

#### 2. Event Publisher (`backend/src/events/EventPublisher.ts`)
Publishes events to the outbox table for eventual consistency:
```typescript
await eventPublisher.publish({
  eventType: 'leave',
  eventName: 'leave.requested',
  organizationId: 'org-123',
  aggregateType: 'leave_request',
  aggregateId: 'leave-456',
  payload: {
    leaveRequestId: 'leave-456',
    employeeId: 'emp-789',
    // ... more data
  }
});
```

#### 3. Event Dispatcher (`backend/src/events/EventDispatcher.ts`)
Polls the outbox table and dispatches events to handlers:
- Supports both in-memory and message queue (RabbitMQ) dispatch
- Automatic retry on failure
- Configurable polling interval (default: 5 seconds)

#### 4. Event Handlers (`backend/src/events/EventHandlers.ts`)
Decoupled handlers for each event type:
- **EmployeeCreatedHandler**: Sends welcome email, creates default permissions
- **LeaveRequestedHandler**: Notifies approvers, checks conflicts
- **LeaveApprovedHandler**: Updates balance, notifies employee and team
- **TimesheetSubmittedHandler**: Notifies approvers, validates data
- **AttendanceCheckedInHandler**: Checks late arrival, updates presence

### Benefits
- **Decoupling**: Business logic is independent of notifications
- **Scalability**: Events can be processed asynchronously
- **Extensibility**: Add new handlers without modifying core logic
- **Reliability**: Event outbox pattern ensures no events are lost

---

## Workflow Engine

### Overview
A flexible workflow engine for multi-level approval chains with conditional logic.

### Database Schema
- `workflow_definitions`: Reusable workflow templates
- `workflow_nodes`: Individual steps (start, approval, condition, action, end)
- `workflow_edges`: Connections between nodes with conditions
- `workflow_instances`: Active workflow executions
- `workflow_tasks`: Individual approval tasks

### Features
1. **Multi-Level Approvals**: Chain multiple approvers
2. **Conditional Routing**: Use expressions to determine next step
3. **Parallel Approvals**: Allow multiple approvers simultaneously
4. **Auto-Escalation**: Escalate to next level after timeout
5. **Dynamic Approvers**: Select approver based on expressions

### Example Workflow
```typescript
// Create workflow definition
const workflowId = await workflowService.createWorkflowDefinition({
  organization_id: 'org-123',
  workflow_name: 'Leave Approval',
  workflow_code: 'leave_approval_v1',
  workflow_type: 'leave_approval',
  allow_parallel_approvals: false,
  require_all_approvals: true,
});

// Create nodes
const startNodeId = await workflowService.createWorkflowNode({
  workflow_id: workflowId,
  node_name: 'Start',
  node_type: 'start',
  node_order: 1,
});

const managerApprovalNodeId = await workflowService.createWorkflowNode({
  workflow_id: workflowId,
  node_name: 'Manager Approval',
  node_type: 'approval',
  node_order: 2,
  approver_type: 'reporting_manager',
  approval_timeout_hours: 24,
});

// Create edges
await workflowService.createWorkflowEdge({
  workflow_id: workflowId,
  from_node_id: startNodeId,
  to_node_id: managerApprovalNodeId,
  edge_type: 'default',
});

// Start workflow instance
const instanceId = await workflowService.startWorkflowInstance({
  organization_id: 'org-123',
  workflow_id: workflowId,
  entity_type: 'leave_request',
  entity_id: 'leave-456',
  instance_status: 'pending',
});
```

### Use Cases
- Leave approval workflows
- Attendance regularization approval
- Timesheet approval
- Expense approval
- Document approval
- Onboarding workflows

---

## Permission Matrix

### Overview
Fine-grained Role-Based Access Control (RBAC) with scope-based permissions.

### Schema
```sql
CREATE TABLE permission_matrix (
    matrix_id UUID PRIMARY KEY,
    role_id UUID NOT NULL,
    resource VARCHAR(100) NOT NULL,      -- e.g., 'employee', 'leave_request'
    action VARCHAR(50) NOT NULL,         -- e.g., 'view', 'create', 'approve'
    scope VARCHAR(50) NOT NULL,          -- 'organization', 'company', 'department', 'location', 'self'
    company_ids UUID[],                  -- Specific companies (when scope = 'company')
    department_ids UUID[],               -- Specific departments
    location_ids UUID[],                 -- Specific locations
    conditions JSONB                     -- Additional conditions
);
```

### Scopes
1. **Organization**: Access to all entities in organization
2. **Company**: Access limited to specific companies
3. **Department**: Access limited to specific departments
4. **Location**: Access limited to specific locations
5. **Self**: Access only to own data

### Example Usage
```typescript
// Manager can view employees in their department
INSERT INTO permission_matrix (role_id, resource, action, scope, department_ids)
VALUES ('manager-role-id', 'employee', 'view', 'department', ARRAY['dept-123']);

// HR can view all employees in organization
INSERT INTO permission_matrix (role_id, resource, action, scope)
VALUES ('hr-role-id', 'employee', 'view', 'organization');

// Employee can view only their own leave requests
INSERT INTO permission_matrix (role_id, resource, action, scope)
VALUES ('employee-role-id', 'leave_request', 'view', 'self');
```

---

## Leave Accrual Policies

### Overview
Flexible leave accrual calculation engine with support for multiple accrual methods.

### Accrual Types
1. **Monthly**: Accrues every month
2. **Quarterly**: Accrues every quarter
3. **Yearly**: Accrues once per year
4. **Anniversary-based**: Accrues on employment anniversary

### Calculation Methods
1. **Fixed**: Fixed days per period
2. **Prorated**: Prorated based on working days
3. **Tiered**: Different rates based on service years
4. **Rule-based**: Custom expressions (IF-THEN-ELSE)

### Example Policies

#### Fixed Accrual
```typescript
await accrualPolicyService.createAccrualPolicy({
  organization_id: 'org-123',
  policy_name: 'Standard Leave Accrual',
  policy_code: 'STANDARD_LEAVE',
  accrual_type: 'monthly',
  calculation_method: 'fixed',
  days_per_period: 1.25, // 15 days per year
  effective_from: new Date('2024-01-01'),
});
```

#### Tiered Accrual
```typescript
await accrualPolicyService.createAccrualPolicy({
  organization_id: 'org-123',
  policy_name: 'Tiered Leave Accrual',
  policy_code: 'TIERED_LEAVE',
  accrual_type: 'monthly',
  calculation_method: 'tiered',
  tier_rules: [
    { min_service_years: 0, max_service_years: 2, days_per_year: 15 },
    { min_service_years: 2, max_service_years: 5, days_per_year: 18 },
    { min_service_years: 5, days_per_year: 21 },
  ],
  effective_from: new Date('2024-01-01'),
});
```

#### Rule-Based Accrual
```typescript
await accrualPolicyService.createAccrualPolicy({
  organization_id: 'org-123',
  policy_name: 'Rule-Based Leave Accrual',
  policy_code: 'RULE_BASED_LEAVE',
  accrual_type: 'monthly',
  calculation_method: 'rule_based',
  accrual_rule_expression: 'IF service_years < 2 THEN 1.25 ELSE IF service_years < 5 THEN 1.5 ELSE 2.0',
  effective_from: new Date('2024-01-01'),
});
```

### Calculating Accrual
```typescript
const accrualDays = await accrualPolicyService.calculateAccrual(
  'emp-123',          // Employee ID
  'leave-type-456',   // Leave Type ID
  'org-789',          // Organization ID
  new Date('2024-01-01'), // Period start
  new Date('2024-01-31')  // Period end
);

// Record transaction
await accrualPolicyService.recordAccrualTransaction({
  organization_id: 'org-789',
  employee_id: 'emp-123',
  leave_type_id: 'leave-type-456',
  transaction_type: 'accrual',
  transaction_date: new Date(),
  days_accrued: accrualDays,
  previous_balance: 10.0,
  new_balance: 10.0 + accrualDays,
});
```

---

## Feature Flags

### Overview
Feature flag system for gradual rollout, A/B testing, and feature toggling.

### Flag Types
1. **Boolean**: Simple on/off flags
2. **Multivariate**: A/B testing with weighted variants
3. **Percentage**: Gradual rollout (0-100%)

### Features
- Organization-level overrides
- User-level overrides (for beta testing)
- Targeting rules (based on attributes)
- Percentage rollout with consistent hashing
- Analytics and evaluation tracking

### Example Usage

#### Creating a Flag
```typescript
await featureFlagService.createFlag({
  flag_key: 'feature.leave.auto_approval',
  flag_name: 'Leave Auto-Approval',
  description: 'Enable automatic approval for certain leave types',
  flag_type: 'boolean',
  default_enabled: false,
  is_enabled: true,
  rollout_percentage: 50, // 50% rollout
});
```

#### Checking Flag
```typescript
const isEnabled = await featureFlagService.isEnabled(
  'feature.leave.auto_approval',
  {
    organizationId: 'org-123',
    userId: 'user-456',
    userEmail: 'john@example.com',
  }
);

if (isEnabled) {
  // Feature is enabled for this user
  await autoApproveLeave(leaveRequestId);
}
```

#### Multivariate Testing
```typescript
const variant = await featureFlagService.getVariant(
  'feature.ui.dashboard_layout',
  { userId: 'user-456' }
);

switch (variant) {
  case 'variant_a':
    return <DashboardLayoutA />;
  case 'variant_b':
    return <DashboardLayoutB />;
  default:
    return <DefaultDashboard />;
}
```

#### Organization Override
```typescript
// Enable feature for specific organization
await featureFlagService.setOrganizationOverride(
  'flag-id-123',
  'org-789',
  true,
  'Beta testing organization'
);
```

---

## Document Management

### Overview
Complete document lifecycle management with versioning, e-signatures, and retention.

### Features
1. **Versioning**: Track document versions with parent/child relationships
2. **E-Signatures**: Electronic/digital signature support
3. **Access Control**: Fine-grained permissions (public, private, restricted)
4. **Sharing**: Internal and external sharing with expiry
5. **Full-Text Search**: PostgreSQL tsvector-based search
6. **Retention Policies**: Compliance-driven retention management
7. **Templates**: Document templates with variable substitution

### Document Categories
- Employee Documents
- Contracts
- Policies
- Certifications
- Training Materials
- Payroll Documents
- Performance Reviews

### Storage Options
- Local filesystem
- AWS S3
- Azure Blob Storage
- Google Cloud Storage

### Example Usage

#### Upload Document
```typescript
const documentId = await db.query(`
  INSERT INTO documents (
    organization_id, document_name, file_name, file_size_bytes,
    storage_type, storage_path, category_id, entity_type, entity_id
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING document_id
`, [
  'org-123',
  'Employment Contract - John Doe',
  'contract_john_doe.pdf',
  1024000,
  's3',
  's3://bucket/org-123/contracts/contract_john_doe.pdf',
  'contracts-category-id',
  'employee',
  'emp-456',
]);
```

#### Request Signature
```typescript
await db.query(`
  INSERT INTO document_signatures (
    organization_id, document_id, signer_user_id, signature_type,
    signature_status, expires_at
  ) VALUES ($1, $2, $3, $4, $5, $6)
`, [
  'org-123',
  documentId,
  'user-789',
  'electronic',
  'pending',
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
]);
```

#### Share Document
```typescript
await db.query(`
  INSERT INTO document_shares (
    organization_id, document_id, share_type, shared_with_email,
    can_view, can_download, expires_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7)
`, [
  'org-123',
  documentId,
  'external',
  'external@example.com',
  true,
  false,
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
]);
```

---

## Reporting Warehouse

### Overview
Star schema data warehouse for analytics and reporting.

### Dimension Tables

#### dim_date
Complete date dimension with:
- Date components (year, quarter, month, week, day)
- Fiscal periods
- Business attributes (weekend, holiday)
- Relative periods (current day/week/month/quarter/year)

#### dim_employee
Employee dimension with SCD Type 2 for historical tracking:
- Employee attributes
- Organizational hierarchy
- Department, designation, location
- Manager relationships

#### dim_leave_type
Leave type dimension with configuration

### Fact Tables

#### fact_attendance
Daily attendance records with:
- Working hours, overtime, breaks
- Late arrivals, early departures
- Work mode (office/remote/hybrid)
- Geolocation data

#### fact_leave_balance
Daily snapshots of leave balances:
- Allocated, used, pending, available days
- Carried forward days
- Balance year

#### fact_leave_requests
Leave request transactions with:
- Request details and dates
- Approval metrics (time to approve)
- Approver information
- Leave reason categories

#### fact_payroll
Monthly payroll summary:
- Earnings breakdown (basic, allowances, overtime, bonus)
- Deductions breakdown (PF, tax, insurance)
- Net pay
- Working days and attendance

#### fact_performance_reviews
Performance review metrics:
- Ratings (overall, performance, behavior, skill)
- Goal achievement
- Review cycle information

### Materialized Views

#### mv_headcount_by_department
Real-time headcount by department:
- Total employees
- Active/on leave/terminated counts
- Employment type breakdown

#### mv_leave_utilization
Leave utilization summary:
- Allocated vs used days
- Utilization percentage by employee and leave type

### Example Queries

#### Monthly Attendance Report
```sql
SELECT 
  de.full_name,
  de.department_name,
  COUNT(*) as total_days,
  COUNT(*) FILTER (WHERE fa.attendance_status = 'present') as days_present,
  ROUND(AVG(fa.working_hours), 2) as avg_hours,
  SUM(fa.overtime_hours) as total_overtime
FROM fact_attendance fa
JOIN dim_employee de ON fa.employee_key = de.employee_key
JOIN dim_date dd ON fa.date_key = dd.date_key
WHERE dd.year = 2024 AND dd.month = 1
  AND de.is_current = TRUE
GROUP BY de.full_name, de.department_name;
```

#### Leave Utilization Report
```sql
SELECT 
  department_name,
  leave_type_name,
  SUM(allocated_days) as total_allocated,
  SUM(used_days) as total_used,
  ROUND(AVG(utilization_percentage), 2) as avg_utilization
FROM mv_leave_utilization
WHERE balance_year = 2024
GROUP BY department_name, leave_type_name
ORDER BY avg_utilization DESC;
```

---

## Unified Notifications

### Overview
Multi-channel notification system with internationalization (i18n) support.

### Channels
1. **Email**: SMTP-based email notifications
2. **SMS**: Twilio/other SMS gateway integration
3. **Push**: Firebase Cloud Messaging (FCM) for mobile
4. **In-App**: Real-time in-app notifications
5. **Webhook**: HTTP webhooks for integrations

### Features
1. **Multi-Language**: Support for multiple languages per template
2. **Variable Substitution**: Dynamic content with `{{variable}}` syntax
3. **User Preferences**: Customizable notification preferences
4. **Queue System**: Priority-based queue with retry logic
5. **Delivery Tracking**: Track sent, delivered, opened, clicked events
6. **Quiet Hours**: Respect user quiet hours
7. **Digests**: Daily/weekly email digests

### Pre-configured Templates
- Leave: request submitted, approved, rejected, approval pending
- Employee: onboarding, birthday, work anniversary
- Attendance: late arrival, regularization approved
- Timesheet: submission reminder, approved
- Payroll: payslip generated, salary credited
- Performance: review initiated

### Example Usage

#### Send Notification
```typescript
await db.query(`
  INSERT INTO notification_queue (
    organization_id, template_code, recipient_user_id,
    channel_type, language_code, subject, body_html,
    template_variables, priority
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
`, [
  'org-123',
  'leave_request_approved',
  'user-456',
  'email',
  'en',
  'Leave Request Approved - Annual Leave',
  '<html>...</html>',
  JSON.stringify({
    employee_name: 'John Doe',
    leave_type: 'Annual Leave',
    from_date: '2024-02-01',
    to_date: '2024-02-05',
    approver_name: 'Jane Manager',
  }),
  'normal',
]);
```

#### Customize User Preferences
```typescript
await db.query(`
  INSERT INTO user_notification_preferences (
    user_id, organization_id, preferred_language,
    preferred_channels, enable_daily_digest, quiet_hours_enabled,
    quiet_hours_start, quiet_hours_end
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  ON CONFLICT (user_id, organization_id) DO UPDATE SET
    preferred_language = EXCLUDED.preferred_language,
    preferred_channels = EXCLUDED.preferred_channels
`, [
  'user-456',
  'org-123',
  'en',
  ['email', 'in_app'], // Preferred channels
  true,                // Enable daily digest
  true,                // Enable quiet hours
  '22:00:00',         // Quiet hours start
  '08:00:00',         // Quiet hours end
]);
```

---

## Database Schema

### Statistics
- **11 migrations** covering all modules
- **70+ tables** with proper relationships
- **Comprehensive indexing** for query performance
- **Foreign key constraints** for data integrity
- **Audit timestamps** (created_at, modified_at) on all tables
- **Soft deletes** (is_deleted flag) for data retention

### Schema Organization
1. **Core**: Organizations, companies, users, roles
2. **HR**: Employees, departments, designations, locations
3. **Leave**: Leave types, requests, balances, policies
4. **Attendance**: Records, shifts, regularizations
5. **Payroll**: Runs, components, salary structures
6. **Workflow**: Definitions, nodes, edges, instances, tasks
7. **Permissions**: Roles, permissions, permission matrix
8. **Feature Flags**: Flags, overrides, evaluations
9. **Documents**: Categories, documents, signatures, shares
10. **Reporting**: Dimensions, facts, aggregates, views
11. **Notifications**: Templates, queue, preferences

---

## API Usage Examples

### Complete Workflow: Leave Request with Accrual

#### 1. Check Leave Balance
```typescript
const balance = await leaveService.getLeaveBalance(
  'emp-123',
  'annual-leave-type-id',
  2024,
  'org-456'
);
console.log(`Available days: ${balance.available_days}`);
```

#### 2. Apply for Leave
```typescript
const leaveRequestId = await leaveService.applyLeave(
  'emp-123',
  'org-456',
  {
    leave_type_id: 'annual-leave-type-id',
    from_date: '2024-02-01',
    to_date: '2024-02-05',
    reason: 'Family vacation',
  }
);
```

#### 3. Event Published Automatically
```typescript
// EventPublisher publishes 'leave.requested' event
// EventHandler sends notification to manager
```

#### 4. Manager Approves
```typescript
await leaveService.processLeaveRequest(
  leaveRequestId,
  'org-456',
  'manager-789',
  'approve',
  'Approved for vacation'
);
```

#### 5. Leave Balance Updated
```typescript
// EventHandler updates balance automatically
// Notification sent to employee
// Team calendar updated
```

#### 6. Monthly Accrual
```typescript
// Run monthly accrual job
const accrualDays = await accrualPolicyService.calculateAccrual(
  'emp-123',
  'annual-leave-type-id',
  'org-456',
  new Date('2024-03-01'),
  new Date('2024-03-31')
);

await accrualPolicyService.recordAccrualTransaction({
  organization_id: 'org-456',
  employee_id: 'emp-123',
  leave_type_id: 'annual-leave-type-id',
  transaction_type: 'accrual',
  transaction_date: new Date('2024-03-31'),
  days_accrued: accrualDays,
  previous_balance: balance.available_days,
  new_balance: balance.available_days + accrualDays,
});
```

---

## Performance Considerations

### Database Optimization
1. **Indexes**: Comprehensive indexing on foreign keys and frequently queried columns
2. **Partitioning**: Consider partitioning large tables (audit_log, notification_queue) by date
3. **Materialized Views**: Refresh materialized views on schedule (e.g., daily)
4. **Query Optimization**: Use EXPLAIN ANALYZE to optimize slow queries

### Caching Strategy
1. **Feature Flags**: 5-minute in-memory cache
2. **User Permissions**: Cache per request (middleware level)
3. **Static Data**: Cache reference data (leave types, departments)
4. **Redis**: Use Redis for distributed caching in production

### Event Processing
1. **Batch Processing**: Process multiple events in single poll
2. **Retry Strategy**: Exponential backoff for failed events
3. **Dead Letter Queue**: Move failed events after max retries
4. **Monitoring**: Track event processing metrics

---

## Deployment

### Database Migrations
```bash
# Run all migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Create new migration
npm run migrate:create -- <name>
```

### Environment Variables
```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=hr_system
DATABASE_USER=postgres
DATABASE_PASSWORD=password

# Redis (optional)
REDIS_URL=redis://localhost:6379

# RabbitMQ (optional)
RABBITMQ_URL=amqp://localhost:5672

# Feature Flags
FEATURE_FLAG_CACHE_TTL=300000

# Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=password
```

### Monitoring
1. **Event Queue**: Monitor event_outbox for pending/failed events
2. **Notifications**: Monitor notification_queue for delivery failures
3. **Workflows**: Track workflow_instances for stuck workflows
4. **Database**: Monitor table sizes and query performance

---

## Future Enhancements

### Phase 1 (Completed)
✅ Event-driven architecture
✅ Workflow engine
✅ Permission matrix
✅ Leave accrual policies
✅ Feature flags
✅ Document management
✅ Reporting warehouse
✅ Unified notifications

### Phase 2 (In Progress)
- Webhook subscription system
- SSO (SAML/OIDC) integration
- SCIM provisioning
- Advanced analytics (attrition, forecasting)
- Policy engine (OPA/rule DSL)

### Phase 3 (Planned)
- Performance management (goals, KRAs, reviews)
- Timesheet cost allocation
- Integration with Finance/Payroll systems
- Mobile app with offline support
- AI-powered insights and recommendations

---

## Support

For questions or issues:
1. Check documentation in `docs/` directory
2. Review migration files for schema details
3. Examine service files for API usage
4. Create GitHub issue with detailed description

---

**License**: MIT
**Version**: 1.0.0
**Last Updated**: 2024
