-- Create database and user
CREATE DATABASE hr_system;
CREATE USER hr_user WITH PASSWORD 'hrms_secure_password_123';
GRANT ALL PRIVILEGES ON DATABASE hr_system TO hr_user;

-- Create extensions
\c hr_system;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create initial organization
INSERT INTO organizations (organization_id, organization_name, organization_code, industry, contact_email, is_active)
VALUES (
    uuid_generate_v4(),
    'Default Organization',
    'DEFAULT_ORG',
    'Technology',
    'admin@hrmanagement.com',
    true
);

-- Create initial company
INSERT INTO companies (company_id, organization_id, company_name, company_code, legal_name, is_active)
SELECT 
    uuid_generate_v4(),
    o.organization_id,
    'Default Company',
    'DEFAULT_COMP',
    'Default Company Ltd.',
    true
FROM organizations o 
WHERE o.organization_code = 'DEFAULT_ORG';

-- Create initial admin user
INSERT INTO users (user_id, organization_id, email, password_hash, role, is_active, is_verified)
SELECT 
    uuid_generate_v4(),
    o.organization_id,
    'admin@hrmanagement.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8.8.8.8', -- password: admin123
    'super_admin',
    true,
    true
FROM organizations o 
WHERE o.organization_code = 'DEFAULT_ORG';

-- Create initial employee for admin
INSERT INTO employees (employee_id, user_id, organization_id, company_id, employee_code, first_name, last_name, job_title, employment_status, employment_type, hire_date, is_deleted)
SELECT 
    uuid_generate_v4(),
    u.user_id,
    u.organization_id,
    c.company_id,
    'ADMIN001',
    'System',
    'Administrator',
    'System Administrator',
    'active',
    'full_time',
    CURRENT_DATE,
    false
FROM users u, companies c, organizations o
WHERE u.email = 'admin@hrmanagement.com' 
  AND c.organization_id = o.organization_id 
  AND o.organization_code = 'DEFAULT_ORG';

-- Create default leave types
INSERT INTO leave_types (leave_type_id, organization_id, leave_type_name, leave_type_code, description, days_per_year, is_paid, requires_approval, is_active)
SELECT 
    uuid_generate_v4(),
    o.organization_id,
    'Annual Leave',
    'ANNUAL',
    'Annual vacation leave',
    21.0,
    true,
    true,
    true
FROM organizations o 
WHERE o.organization_code = 'DEFAULT_ORG';

INSERT INTO leave_types (leave_type_id, organization_id, leave_type_name, leave_type_code, description, days_per_year, is_paid, requires_approval, is_active)
SELECT 
    uuid_generate_v4(),
    o.organization_id,
    'Sick Leave',
    'SICK',
    'Sick leave for illness',
    7.0,
    true,
    true,
    true
FROM organizations o 
WHERE o.organization_code = 'DEFAULT_ORG';

INSERT INTO leave_types (leave_type_id, organization_id, leave_type_name, leave_type_code, description, days_per_year, is_paid, requires_approval, is_active)
SELECT 
    uuid_generate_v4(),
    o.organization_id,
    'Personal Leave',
    'PERSONAL',
    'Personal leave for personal matters',
    5.0,
    true,
    true,
    true
FROM organizations o 
WHERE o.organization_code = 'DEFAULT_ORG';
