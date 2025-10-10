# Foundational Architecture Implementation - README

## Overview

This implementation provides a comprehensive foundational architecture for the multi-tenant HR Management System with MENA-focused features. The implementation follows clean architecture principles with domain-driven design.

## ✅ What Was Implemented

### 1. Database Migrations (6 SQL Files)

Located in `backend/migrations/`:

- **0001_core_org_security.sql**: Organizations, Users, Roles, Permissions, Audit Log, Events Outbox, Notifications
- **0002_hr_core.sql**: Departments, Designations, Locations, Employees, Employee details
- **0003_leave_attendance.sql**: Leave Types, Leave Balances, Leave Requests, Attendance, Shifts
- **0004_payroll_core.sql**: MENA-focused Payroll, Gratuity, End-of-Service, Loans, Reimbursements, Tax
- **0005_performance_recruitment_onboarding.sql**: Performance Cycles, Goals, Reviews, Recruitment, Onboarding
- **0006_assets_analytics.sql**: Asset Management, Analytics Fact Tables

**Key Features**:
- All tables include `organization_id` for multi-tenant isolation
- Comprehensive indexes for performance
- Composite unique constraints for data integrity
- RLS (Row-Level Security) placeholders with documentation
- MENA-specific fields (gratuity, end-of-service calculations)

**Migration Infrastructure**:
- `backend/src/database/migrate.ts`: Automated migration runner
- `backend/src/database/seed.ts`: Database seeding script
- Migration tracking via `schema_migrations` table
- Idempotent migrations - safe to run multiple times
- Transaction-wrapped for data safety

### 2. TypeScript Domain Models

Located in `backend/src/domain/`:

**Value Objects** (Immutable, validated):
- `Email.ts`: Email with validation and parsing
- `Money.ts`: Currency-aware money calculations with MENA currencies
- `DateRange.ts`: Date range validation and duration calculations

**Core Entities**:
- `Employee.ts`: Existing employee entity (enhanced)
- `LeaveType.ts`: Leave type configuration with accrual logic
- `LeaveRequest.ts`: Leave request with approval workflow
- `PayrollRun.ts`: Payroll run with status management
- `entities.ts`: Lightweight interfaces for other entities

**Enums** (`enums.ts`):
- Employment types, statuses, leave types, payroll types
- Performance, recruitment, onboarding states
- Notification, asset, and audit enums

### 3. Repository Layer

Located in `backend/src/repositories/`:

**Interfaces** (`interfaces.ts`):
- `IEmployeeRepository`: Employee data access contract
- `ILeaveRepository`: Leave management data access
- `IPayrollRunRepository`: Payroll data access
- `IEventOutboxRepository`: Event sourcing outbox pattern
- `IAuditLogRepository`: Audit logging data access

**Implementations** (`implementations.ts`):
- Skeleton PostgreSQL implementations
- Basic `create()` methods implemented
- Complex queries throw `NotImplementedError` as documented
- Ready for full implementation in subsequent features

### 4. Services Layer

Located in `backend/src/services/`:

**Services Implemented**:
- `EmployeeService.ts`: Employee creation with events and audit
- `LeaveService.ts`: Leave request creation (stub with validation)
- `PayrollRunService.ts`: Draft payroll run creation
- `AuditService.ts`: Change tracking and audit logging

**Key Features**:
- Business logic encapsulation
- Event publishing integration
- Audit logging integration
- Validation before persistence

### 5. Events Infrastructure

Located in `backend/src/events/`:

**Components**:
- `events.ts`: Typed event definitions for all domain events
- `EventPublisher.ts`: Publishes events to outbox table
- `EventDispatcher.ts`: Stub for event processing (documented pattern)

**Event Types**:
- Employee events (created, updated, terminated)
- Leave events (requested, approved, rejected)
- Payroll events (created, processed, approved)
- Attendance events (check-in, check-out)

### 6. Validation Layer

Located in `backend/src/validators/`:

**Schemas** (`schemas.ts`):
- Zod schemas for type-safe runtime validation
- Employee create/update schemas
- Leave request schemas
- Payroll run schemas
- Common pagination and date range schemas

### 7. Configuration & Environment

Located in `backend/src/config/`:

**env.ts**:
- Zod-based environment validation
- Type-safe configuration access
- MENA-specific settings (currency, country codes)
- Multi-tenancy settings (RLS enable flag)
- Comprehensive database, Redis, JWT configuration

**Updated .env.example**:
- New environment variables documented
- MENA country codes
- RLS enable flag
- Default currency setting

### 8. Multi-Tenancy Utilities

Located in `backend/src/middleware/`:

**tenantContext.ts**:
- `tenantContext()`: Middleware to extract organization from auth
- `setOrganizationContext()`: Sets RLS context in database session
- `withOrgContext()`: Transaction helper with automatic context setting
- `ensureOrgScope()`: Query helper to add organization filters
- `validateOrgOwnership()`: Entity ownership validation
- `mockAuthMiddleware()`: Testing helper

## 📋 Project Structure

```
backend/
├── migrations/              # Database migrations (6 files)
├── src/
│   ├── config/
│   │   └── env.ts          # Environment configuration with Zod
│   ├── database/
│   │   ├── migrate.ts      # Migration runner script
│   │   └── seed.ts         # Database seeding script
│   ├── domain/
│   │   ├── Email.ts        # Email value object
│   │   ├── Money.ts        # Money value object
│   │   ├── DateRange.ts    # Date range value object
│   │   ├── Employee.ts     # Employee entity (existing)
│   │   ├── LeaveType.ts    # Leave type entity
│   │   ├── LeaveRequest.ts # Leave request entity
│   │   ├── PayrollRun.ts   # Payroll run entity
│   │   ├── entities.ts     # Additional entity interfaces
│   │   └── enums.ts        # Central enumerations
│   ├── repositories/
│   │   ├── interfaces.ts   # Repository contracts
│   │   └── implementations.ts # PostgreSQL implementations
│   ├── services/
│   │   ├── EmployeeService.ts
│   │   ├── LeaveService.ts
│   │   ├── PayrollRunService.ts
│   │   └── AuditService.ts
│   ├── events/
│   │   ├── events.ts       # Event definitions
│   │   ├── EventPublisher.ts
│   │   └── EventDispatcher.ts
│   ├── validators/
│   │   └── schemas.ts      # Zod validation schemas
│   └── middleware/
│       └── tenantContext.ts # Multi-tenancy utilities
```

## 🎯 Design Patterns Used

1. **Domain-Driven Design (DDD)**:
   - Value Objects for immutable concepts
   - Entities with business logic
   - Repository pattern for data access
   - Service layer for business operations

2. **Multi-Tenancy**:
   - Shared schema with tenant ID
   - RLS-ready with placeholders
   - Query helpers for organization scope
   - Transaction context helpers

3. **Event Sourcing (Outbox Pattern)**:
   - Domain events published to outbox
   - Transactional consistency
   - Eventual consistency for async operations
   - Extensible event handler registration

4. **Clean Architecture**:
   - Clear separation of concerns
   - Dependency inversion (interfaces)
   - Domain logic independent of infrastructure
   - Testable design

## 🚀 How to Use

### Running Migrations

**Using npm scripts (Recommended)**:

```bash
# Install dependencies first
cd backend
npm install

# Run all pending migrations
npm run migrate

# Seed the database with sample data
npm run seed
```

**Using psql directly** (Alternative):

```bash
psql -U postgres -d hr_system -f backend/migrations/0001_core_org_security.sql
psql -U postgres -d hr_system -f backend/migrations/0002_hr_core.sql
psql -U postgres -d hr_system -f backend/migrations/0003_leave_attendance.sql
psql -U postgres -d hr_system -f backend/migrations/0004_payroll_core.sql
psql -U postgres -d hr_system -f backend/migrations/0005_performance_recruitment_onboarding.sql
psql -U postgres -d hr_system -f backend/migrations/0006_assets_analytics.sql
```

**Migration Features**:
- Automatic tracking of applied migrations
- Idempotent - safe to run multiple times
- Runs migrations in correct order
- Transaction-wrapped for safety
- Clear progress output

**Seed Data**:
The seed script creates:
- Demo organization (code: DEMO)
- Demo company
- Admin user (email: admin@democompany.com, password: Admin@123)
- Sample departments (Engineering, HR, Finance, Sales)
- Sample leave types (Annual, Sick, Casual, Maternity, Paternity)

### Using Services

```typescript
import { EmployeeService } from './services/EmployeeService';
import { EventPublisher } from './events/EventPublisher';
import { AuditService } from './services/AuditService';

// Setup dependencies
const eventPublisher = new EventPublisher(eventOutboxRepo);
const auditService = new AuditService(auditLogRepo);
const employeeService = new EmployeeService(
  employeeRepo,
  eventPublisher,
  auditService
);

// Create an employee
const employee = await employeeService.createEmployee(
  {
    organization_id: 'org-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    hire_date: new Date(),
    employment_status: EmployeeStatus.ACTIVE,
  },
  'user-456' // createdBy
);
```

### Using Tenant Context

```typescript
import { tenantContext, withOrgContext } from './middleware/tenantContext';

// In Express app
app.use(authenticate); // Your auth middleware
app.use(tenantContext()); // Extract organization from auth

// In a controller
app.get('/api/v1/employees', async (req, res) => {
  const organizationId = req.organizationId!;
  
  // Use withOrgContext for queries
  const employees = await withOrgContext(
    pool,
    organizationId,
    async (client) => {
      const result = await client.query(
        'SELECT * FROM employees WHERE organization_id = $1',
        [organizationId]
      );
      return result.rows;
    }
  );
  
  res.json({ employees });
});
```

## 🔐 Security Considerations

1. **Multi-Tenancy Isolation**:
   - All queries must filter by `organization_id`
   - Use `ensureOrgScope()` helper to avoid mistakes
   - RLS provides database-level defense in depth

2. **Audit Logging**:
   - All entity changes are audited
   - Includes old/new values and diff
   - Cannot be deleted (append-only)

3. **Event Sourcing**:
   - All business events are persisted
   - Provides event replay capability
   - Audit trail of all actions

## 📝 Next Steps

To complete the implementation:

1. **Implement Repository Methods**:
   - Replace `NotImplementedError` with actual queries
   - Add transaction support
   - Optimize queries with proper indexes

2. **Complete Service Layer**:
   - Implement complex business rules
   - Add validation logic
   - Integrate with external services

3. **Event Handlers**:
   - Implement event dispatcher logic
   - Register event handlers
   - Add retry logic and error handling

4. **Testing**:
   - Unit tests for domain models
   - Integration tests for repositories
   - Service tests with mocks
   - E2E tests for critical flows

5. **API Layer**:
   - Connect services to controllers
   - Add request/response DTOs
   - Implement pagination helpers
   - Add API documentation

## 📚 Documentation

- Database schema comments in SQL files
- TypeScript JSDoc comments on complex functions
- README notes in EventDispatcher for implementation guidance
- ADR references in codebase

## ⚠️ Known Limitations

1. **Partial Implementation**:
   - Repository methods are stubs (by design)
   - Event dispatcher is a stub (documented)
   - Some services have minimal implementation

2. **Existing Code Issues**:
   - Pre-existing controllers have TypeScript errors
   - These are NOT part of this foundational work
   - Should be addressed in feature-specific work

3. **Testing**:
   - Minimal tests added (focused on structure)
   - Comprehensive testing is next phase

## 🎉 Summary

This implementation provides a solid foundation for building a production-ready, multi-tenant HR system with:

- ✅ Comprehensive database schema (6 migrations, 80+ tables)
- ✅ Type-safe domain models with business logic
- ✅ Clean architecture with clear separation of concerns
- ✅ Event-driven design for scalability
- ✅ Multi-tenancy utilities and patterns
- ✅ MENA-specific features (gratuity, EOS, etc.)
- ✅ Validation and configuration infrastructure
- ✅ Audit logging for compliance

The architecture is extensible, testable, and ready for feature development!
