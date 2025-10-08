# Database Migrations Guide

## Overview

This guide explains how to use the database migration and seeding system for the HR Management System.

## Prerequisites

- PostgreSQL 15+ installed and running
- Node.js 18+ installed
- Backend dependencies installed (`npm install`)

## Quick Start

```bash
# 1. Set up your environment
cd backend
cp .env.example .env
# Edit .env with your database credentials

# 2. Run migrations
npm run migrate

# 3. (Optional) Seed with sample data
npm run seed
```

## Migration System

### Features

- **Automatic tracking**: Keeps track of which migrations have been applied
- **Idempotent**: Safe to run multiple times - only pending migrations are executed
- **Ordered execution**: Migrations run in alphabetical order (0001, 0002, etc.)
- **Transaction safety**: Each migration runs in a transaction for data integrity
- **Clear output**: Visual feedback on progress and status

### Migration Files

Located in `backend/migrations/`:

1. **0001_core_org_security.sql** - Core multi-tenant foundation
   - Organizations, companies, users, roles, permissions
   - Audit logging, events outbox, notifications

2. **0002_hr_core.sql** - HR management core
   - Departments, designations, locations
   - Employees and employee details

3. **0003_leave_attendance.sql** - Leave and attendance
   - Leave types, balances, requests, approvals
   - Attendance tracking, shifts, shift assignments

4. **0004_payroll_core.sql** - Payroll system (MENA-focused)
   - Payroll runs, employee payroll records
   - Gratuity, end-of-service calculations
   - Loans, reimbursements, tax calculations

5. **0005_performance_recruitment_onboarding.sql** - Performance and recruitment
   - Performance cycles, goals, reviews, feedback
   - Job requisitions, candidates, applications
   - Onboarding checklists and tasks

6. **0006_assets_analytics.sql** - Assets and analytics
   - Asset management and assignments
   - Analytics fact tables for reporting

### Running Migrations

**Via npm**:
```bash
cd backend
npm run migrate
```

**Via Makefile** (from project root):
```bash
make db-migrate
```

**Output example**:
```
🚀 Starting database migrations...

✓ Migrations tracking table ready
✓ Found 2 previously applied migrations
✓ Found 6 migration files

📋 Pending migrations: 4
   - 0003_leave_attendance.sql
   - 0004_payroll_core.sql
   - 0005_performance_recruitment_onboarding.sql
   - 0006_assets_analytics.sql

📄 Running migration: 0003_leave_attendance.sql
✓ Successfully applied: 0003_leave_attendance.sql
...

✅ All migrations completed successfully!
```

### Migration Tracking

Migrations are tracked in the `schema_migrations` table:

```sql
SELECT * FROM schema_migrations ORDER BY migration_id;
```

This table contains:
- `migration_id`: Unique ID for each migration
- `migration_name`: Name of the migration file (without .sql)
- `executed_at`: Timestamp when migration was applied

## Seed System

### Features

The seed script populates the database with sample data for testing and development.

### What Gets Seeded

1. **Organization**: Demo Company Ltd (code: DEMO)
2. **Company**: Demo Company
3. **Admin Role**: System Administrator role
4. **Admin User**: 
   - Email: `admin@democompany.com`
   - Password: `Admin@123`
5. **Departments**: Engineering, HR, Finance, Sales
6. **Leave Types**: Annual (21 days), Sick (10 days), Casual (7 days), Maternity (90 days), Paternity (14 days)

### Running Seed

**Via npm**:
```bash
cd backend
npm run seed
```

**Via Makefile** (from project root):
```bash
make db-seed
```

**Output example**:
```
🌱 Starting database seeding...

📋 Seeding sample data...
   - Creating organization...
   ✓ Organization created: 33e21e6f-7347-46db-b7dd-f01d316b957b
   - Creating company...
   ✓ Company created: a4e9c657-b6cf-4948-820c-f6f387e4517e
   - Creating roles...
   ✓ Admin role created: 755c20e7-3ac4-4741-9803-d23114a6291b
   - Creating admin user...
   ✓ Admin user created: 3b31726b-6170-42c3-baee-68a98be13269
   - Assigning role to user...
   ✓ Role assigned
   - Creating departments...
   ✓ 4 departments created
   - Creating leave types...
   ✓ 5 leave types created

✅ Database seeding completed successfully!

📝 Sample credentials:
   Email: admin@democompany.com
   Password: Admin@123
```

### Idempotency

The seed script is idempotent - it uses `ON CONFLICT` clauses to update existing records instead of creating duplicates. This means you can run it multiple times safely.

## Common Workflows

### Initial Setup

```bash
# 1. Create database
createdb hr_system

# 2. Configure environment
cd backend
cp .env.example .env
# Edit .env with your credentials

# 3. Install dependencies
npm install

# 4. Run migrations
npm run migrate

# 5. Seed with sample data (optional)
npm run seed
```

### Reset Database

```bash
# Via Makefile (recommended)
make db-reset

# Or manually
dropdb hr_system
createdb hr_system
cd backend && npm run migrate && npm run seed
```

### Adding New Migrations

When you need to add a new migration:

1. Create a new SQL file in `backend/migrations/`:
   ```
   0007_your_feature_name.sql
   ```

2. Include the tracking at the end of your migration:
   ```sql
   INSERT INTO schema_migrations (migration_name) VALUES ('0007_your_feature_name');
   ```

3. Run migrations:
   ```bash
   npm run migrate
   ```

## Troubleshooting

### "SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string"

This error occurs when PostgreSQL password authentication is configured but no password is provided.

**Solution**: Set `DB_PASSWORD` in your `.env` file or configure PostgreSQL to use peer/trust authentication.

### "relation already exists"

This usually means a migration was partially applied or the database wasn't clean.

**Solution**: 
```bash
# Reset the database
dropdb hr_system
createdb hr_system
npm run migrate
```

### "column does not exist"

This indicates the migration files and seed script might be out of sync with the actual schema.

**Solution**: Ensure all migrations are applied before running seed:
```bash
npm run migrate
npm run seed
```

## Environment Variables

Required environment variables in `.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hr_system
DB_USER=postgres
DB_PASSWORD=your_password
DB_POOL_MIN=2
DB_POOL_MAX=10

# JWT (required for seed script)
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Security (required for seed script)
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
```

## Best Practices

1. **Always backup** production databases before running migrations
2. **Test migrations** on a staging environment first
3. **Use transactions** - migrations are automatically wrapped in transactions
4. **Version control** - commit migration files to git
5. **Sequential naming** - use numeric prefixes (0001, 0002, etc.)
6. **One migration per feature** - keep migrations focused and atomic
7. **Include rollback** - document how to rollback if needed

## Support

For issues or questions:
1. Check this documentation
2. Review the `backend/FOUNDATION_README.md`
3. Open an issue on GitHub
