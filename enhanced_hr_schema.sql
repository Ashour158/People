-- =====================================================
-- ENHANCED MULTI-TENANT HR MANAGEMENT SYSTEM
-- Complete Database Schema with Multi-Company Support
-- =====================================================

-- =====================================================
-- SECTION 1: MULTI-TENANCY & ORGANIZATION STRUCTURE
-- =====================================================

-- Organizations (Top Level - Complete Isolation)
CREATE TABLE organizations (
    organization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_name VARCHAR(200) NOT NULL,
    organization_code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Subscription & Billing
    subscription_plan VARCHAR(50) DEFAULT 'trial', -- trial, basic, professional, enterprise
    subscription_status VARCHAR(20) DEFAULT 'active', -- active, suspended, cancelled
    subscription_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subscription_end_date DATE,
    max_employees INTEGER DEFAULT 50,
    max_companies INTEGER DEFAULT 1,
    
    -- Organization Settings
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'DD-MM-YYYY',
    currency VARCHAR(3) DEFAULT 'USD',
    language VARCHAR(10) DEFAULT 'en',
    
    -- Contact Information
    primary_contact_name VARCHAR(100),
    primary_contact_email VARCHAR(255) NOT NULL,
    primary_contact_phone VARCHAR(20),
    
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Branding
    logo_url VARCHAR(500),
    primary_color VARCHAR(7) DEFAULT '#1976d2',
    secondary_color VARCHAR(7) DEFAULT '#424242',
    
    -- Features Enabled
    features_enabled JSONB DEFAULT '{"attendance": true, "leave": true, "performance": true, "recruitment": true, "learning": true, "timesheet": true, "payroll": false}'::jsonb,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    deleted_at TIMESTAMP
);

-- Companies (Within Organization - Multiple Companies Support)
CREATE TABLE companies (
    company_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    company_name VARCHAR(200) NOT NULL,
    company_code VARCHAR(50) NOT NULL,
    legal_name VARCHAR(200),
    
    -- Registration Details
    registration_number VARCHAR(100),
    tax_id VARCHAR(100),
    incorporation_date DATE,
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),
    
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Company Settings
    timezone VARCHAR(50),
    date_format VARCHAR(20),
    currency VARCHAR(3),
    fiscal_year_start_month INTEGER DEFAULT 1,
    
    -- Company Type
    company_type VARCHAR(50), -- headquarters, branch, subsidiary
    parent_company_id UUID REFERENCES companies(company_id),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    UNIQUE(organization_id, company_code)
);

CREATE INDEX idx_companies_org ON companies(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_companies_parent ON companies(parent_company_id) WHERE is_deleted = FALSE;

-- =====================================================
-- SECTION 2: ORGANIZATIONAL STRUCTURE
-- =====================================================

-- Departments
CREATE TABLE departments (
    department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    department_name VARCHAR(100) NOT NULL,
    department_code VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Hierarchy
    parent_department_id UUID REFERENCES departments(department_id),
    department_level INTEGER DEFAULT 1,
    department_path TEXT, -- For hierarchical queries: /1/5/12/
    
    -- Leadership
    department_head_id UUID, -- References employees (added later)
    
    -- Cost Center
    cost_center_code VARCHAR(50),
    budget_amount DECIMAL(15,2),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    UNIQUE(company_id, department_code)
);

CREATE INDEX idx_departments_company ON departments(company_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_departments_parent ON departments(parent_department_id) WHERE is_deleted = FALSE;

-- Locations/Offices
CREATE TABLE locations (
    location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    location_name VARCHAR(100) NOT NULL,
    location_code VARCHAR(50) NOT NULL,
    location_type VARCHAR(50), -- headquarters, branch, regional_office, warehouse, remote
    
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    
    -- Geo Coordinates (for attendance tracking)
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    geo_fence_radius_meters INTEGER DEFAULT 100,
    
    -- Contact
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Settings
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    is_headquarters BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    UNIQUE(company_id, location_code)
);

CREATE INDEX idx_locations_company ON locations(company_id) WHERE is_deleted = FALSE;

-- Job Titles/Designations
CREATE TABLE designations (
    designation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE, -- NULL means applicable to all companies
    
    designation_name VARCHAR(100) NOT NULL,
    designation_code VARCHAR(50) NOT NULL,
    
    -- Job Details
    job_description TEXT,
    responsibilities TEXT,
    requirements TEXT,
    
    -- Classification
    job_level VARCHAR(50), -- entry, mid, senior, lead, manager, director, executive
    job_family VARCHAR(100), -- Engineering, Sales, Marketing, etc.
    job_category VARCHAR(50), -- Technical, Administrative, Operational
    
    -- Hierarchy
    reports_to_designation_id UUID REFERENCES designations(designation_id),
    
    -- Compensation
    salary_grade VARCHAR(20),
    min_salary DECIMAL(12,2),
    max_salary DECIMAL(12,2),
    currency VARCHAR(3),
    
    -- Department Association
    department_id UUID REFERENCES departments(department_id),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    UNIQUE(organization_id, designation_code)
);

CREATE INDEX idx_designations_org ON designations(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_designations_company ON designations(company_id) WHERE is_deleted = FALSE;

-- =====================================================
-- SECTION 3: EMPLOYEE MANAGEMENT (CORE)
-- =====================================================

-- Employees
CREATE TABLE employees (
    employee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    
    -- Employee Code
    employee_code VARCHAR(50) NOT NULL,
    badge_number VARCHAR(50),
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(300) GENERATED ALWAYS AS (
        TRIM(CONCAT(first_name, ' ', COALESCE(middle_name, ''), ' ', last_name))
    ) STORED,
    
    preferred_name VARCHAR(100),
    display_name VARCHAR(200),
    
    -- Contact Information
    email VARCHAR(255) NOT NULL,
    personal_email VARCHAR(255),
    phone_number VARCHAR(20),
    personal_phone VARCHAR(20),
    
    -- Personal Details
    date_of_birth DATE,
    gender VARCHAR(20), -- male, female, other, prefer_not_to_say
    blood_group VARCHAR(10),
    marital_status VARCHAR(20), -- single, married, divorced, widowed
    nationality VARCHAR(100),
    
    -- Government IDs
    national_id VARCHAR(100),
    passport_number VARCHAR(100),
    passport_expiry_date DATE,
    ssn_last_4 VARCHAR(4), -- Store only last 4 digits for security
    
    -- Profile
    profile_picture_url VARCHAR(500),
    bio TEXT,
    skills TEXT[],
    languages TEXT[],
    
    -- Employment Information
    hire_date DATE NOT NULL,
    original_hire_date DATE,
    probation_period_months INTEGER DEFAULT 3,
    probation_end_date DATE,
    confirmation_date DATE,
    
    employment_type VARCHAR(50) NOT NULL, -- full_time, part_time, contract, intern, consultant
    employee_category VARCHAR(50), -- permanent, temporary, seasonal
    
    -- Status
    employee_status VARCHAR(20) NOT NULL DEFAULT 'active', 
    -- active, on_leave, on_probation, suspended, terminated, resigned
    
    termination_date DATE,
    termination_reason TEXT,
    termination_type VARCHAR(50), -- voluntary, involuntary
    is_rehire_eligible BOOLEAN DEFAULT TRUE,
    
    last_working_date DATE,
    exit_interview_completed BOOLEAN DEFAULT FALSE,
    
    -- Organizational Structure
    department_id UUID REFERENCES departments(department_id),
    designation_id UUID REFERENCES designations(designation_id),
    location_id UUID REFERENCES locations(location_id),
    
    -- Reporting Structure
    reporting_manager_id UUID REFERENCES employees(employee_id),
    dotted_line_manager_id UUID REFERENCES employees(employee_id),
    
    -- Work Details
    work_email VARCHAR(255),
    work_phone VARCHAR(20),
    work_location_type VARCHAR(20) DEFAULT 'office', -- office, remote, hybrid
    
    seating_location VARCHAR(100),
    desk_number VARCHAR(50),
    
    -- Schedule
    work_schedule VARCHAR(50) DEFAULT 'regular', -- regular, flexible, shift
    weekly_hours DECIMAL(5,2) DEFAULT 40.00,
    
    -- Communication Preferences
    preferred_language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Additional Information
    about_me TEXT,
    hobbies TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    
    -- System Fields
    is_user BOOLEAN DEFAULT TRUE, -- Can login
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    deleted_at TIMESTAMP,
    
    UNIQUE(organization_id, employee_code),
    UNIQUE(organization_id, email)
);

CREATE INDEX idx_employees_org ON employees(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_employees_company ON employees(company_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_employees_status ON employees(employee_status) WHERE is_deleted = FALSE;
CREATE INDEX idx_employees_manager ON employees(reporting_manager_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_employees_department ON employees(department_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_employees_email ON employees(email) WHERE is_deleted = FALSE;
CREATE INDEX idx_employees_fullname ON employees(full_name) WHERE is_deleted = FALSE;

-- Add foreign key for department head (circular reference)
ALTER TABLE departments 
ADD CONSTRAINT fk_departments_head 
FOREIGN KEY (department_head_id) REFERENCES employees(employee_id);

-- Employee Addresses
CREATE TABLE employee_addresses (
    address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    address_type VARCHAR(50) NOT NULL, -- current, permanent, mailing
    
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employee_addresses_emp ON employee_addresses(employee_id);

-- Emergency Contacts
CREATE TABLE emergency_contacts (
    contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    contact_name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    
    phone_number VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    email VARCHAR(255),
    
    address TEXT,
    
    is_primary BOOLEAN DEFAULT FALSE,
    priority_order INTEGER DEFAULT 1,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_emergency_contacts_emp ON emergency_contacts(employee_id);

-- Employee Documents
CREATE TABLE employee_documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    document_type VARCHAR(50) NOT NULL, 
    -- id_proof, address_proof, education_certificate, experience_letter, 
    -- offer_letter, appointment_letter, relieving_letter, etc.
    
    document_name VARCHAR(255) NOT NULL,
    document_number VARCHAR(100),
    
    file_name VARCHAR(255),
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes INTEGER,
    file_type VARCHAR(50),
    
    description TEXT,
    
    issue_date DATE,
    expiry_date DATE,
    
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES employees(employee_id),
    verified_at TIMESTAMP,
    
    is_mandatory BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    uploaded_by UUID REFERENCES employees(employee_id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employee_documents_emp ON employee_documents(employee_id);
CREATE INDEX idx_employee_documents_expiry ON employee_documents(expiry_date) 
    WHERE expiry_date IS NOT NULL AND is_deleted = FALSE;

-- Work Experience (Previous Employment)
CREATE TABLE work_experience (
    experience_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    company_name VARCHAR(200) NOT NULL,
    job_title VARCHAR(100) NOT NULL,
    
    from_date DATE NOT NULL,
    to_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    
    location VARCHAR(200),
    
    job_description TEXT,
    key_responsibilities TEXT,
    achievements TEXT,
    
    reason_for_leaving TEXT,
    
    notice_served_days INTEGER,
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES employees(employee_id),
    verified_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_work_experience_emp ON work_experience(employee_id);

-- Education
CREATE TABLE education (
    education_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    education_level VARCHAR(50) NOT NULL, 
    -- high_school, diploma, bachelors, masters, doctorate, certificate
    
    degree_name VARCHAR(100) NOT NULL,
    field_of_study VARCHAR(100),
    specialization VARCHAR(100),
    
    institution_name VARCHAR(200) NOT NULL,
    university_name VARCHAR(200),
    
    location VARCHAR(200),
    country VARCHAR(100),
    
    start_date DATE,
    end_date DATE,
    is_ongoing BOOLEAN DEFAULT FALSE,
    
    grade_type VARCHAR(20), -- percentage, cgpa, gpa
    grade_value VARCHAR(20),
    
    is_highest_qualification BOOLEAN DEFAULT FALSE,
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES employees(employee_id),
    verified_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_education_emp ON education(employee_id);

-- Certifications
CREATE TABLE certifications (
    certification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    certification_name VARCHAR(200) NOT NULL,
    certification_number VARCHAR(100),
    
    issuing_organization VARCHAR(200) NOT NULL,
    
    issue_date DATE NOT NULL,
    expiry_date DATE,
    does_not_expire BOOLEAN DEFAULT FALSE,
    
    credential_url VARCHAR(500),
    
    description TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_certifications_emp ON certifications(employee_id);
CREATE INDEX idx_certifications_expiry ON certifications(expiry_date) 
    WHERE expiry_date IS NOT NULL AND does_not_expire = FALSE;

-- Employee Bank Details
CREATE TABLE employee_bank_details (
    bank_detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    account_holder_name VARCHAR(200) NOT NULL,
    bank_name VARCHAR(200) NOT NULL,
    
    account_number_encrypted VARCHAR(500) NOT NULL, -- Encrypted
    account_number_last_4 VARCHAR(4), -- For display
    
    account_type VARCHAR(50), -- savings, current, salary
    
    ifsc_code VARCHAR(50), -- For India
    swift_code VARCHAR(50), -- For International
    iban VARCHAR(100),
    routing_number VARCHAR(50),
    
    branch_name VARCHAR(200),
    branch_code VARCHAR(50),
    
    is_primary BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES employees(employee_id),
    verified_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employee_bank_emp ON employee_bank_details(employee_id);

-- Employee Dependents/Family Members
CREATE TABLE employee_dependents (
    dependent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    dependent_name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50) NOT NULL, -- spouse, child, parent, sibling
    
    date_of_birth DATE,
    gender VARCHAR(20),
    
    is_dependent BOOLEAN DEFAULT TRUE, -- For tax/insurance purposes
    is_nominee BOOLEAN DEFAULT FALSE, -- For insurance/gratuity
    
    phone_number VARCHAR(20),
    email VARCHAR(255),
    
    -- For Insurance
    is_covered_in_insurance BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employee_dependents_emp ON employee_dependents(employee_id);

-- =====================================================
-- SECTION 4: USER MANAGEMENT & AUTHENTICATION
-- =====================================================

-- Users (Login Accounts)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(255),
    
    -- Multi-Factor Authentication
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    mfa_backup_codes TEXT[],
    
    -- Security
    is_active BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    
    failed_login_attempts INTEGER DEFAULT 0,
    last_failed_login TIMESTAMP,
    locked_until TIMESTAMP,
    
    -- Password Management
    must_change_password BOOLEAN DEFAULT FALSE,
    password_changed_at TIMESTAMP,
    password_expires_at TIMESTAMP,
    password_history TEXT[], -- Store hashes of last 5 passwords
    
    -- Session Management
    last_login TIMESTAMP,
    last_login_ip VARCHAR(45),
    current_session_token VARCHAR(500),
    session_expires_at TIMESTAMP,
    
    -- Email Verification
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP,
    
    -- Password Reset
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    
    -- Preferences
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    theme VARCHAR(20) DEFAULT 'light',
    
    notification_preferences JSONB DEFAULT '{
        "email": true, 
        "push": true, 
        "sms": false
    }'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_org ON users(organization_id) WHERE is_active = TRUE;
CREATE INDEX idx_users_employee ON users(employee_id);
CREATE INDEX idx_users_email ON users(email) WHERE is_active = TRUE;
CREATE INDEX idx_users_username ON users(username) WHERE is_active = TRUE;

-- Roles (RBAC)
CREATE TABLE roles (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE, -- NULL means org-wide
    
    role_name VARCHAR(100) NOT NULL,
    role_code VARCHAR(50) NOT NULL,
    description TEXT,
    
    role_type VARCHAR(50) DEFAULT 'custom', -- system, custom
    
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    UNIQUE(organization_id, role_code)
);

CREATE INDEX idx_roles_org ON roles(organization_id) WHERE is_active = TRUE;

-- Permissions
CREATE TABLE permissions (
    permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    permission_code VARCHAR(100) UNIQUE NOT NULL,
    permission_name VARCHAR(100) NOT NULL,
    
    module VARCHAR(50) NOT NULL, -- employees, attendance, leave, performance, etc.
    resource VARCHAR(50) NOT NULL, -- specific resource within module
    
    action VARCHAR(20) NOT NULL, -- view, create, edit, delete, approve, export
    
    description TEXT,
    
    is_system BOOLEAN DEFAULT TRUE
);

-- Seed system permissions
INSERT INTO permissions (permission_code, permission_name, module, resource, action, description) VALUES
-- Employee Management
('employees.view', 'View Employees', 'employees', 'employee', 'view', 'View employee details'),
('employees.create', 'Create Employees', 'employees', 'employee', 'create', 'Create new employees'),
('employees.edit', 'Edit Employees', 'employees', 'employee', 'edit', 'Edit employee information'),
('employees.delete', 'Delete Employees', 'employees', 'employee', 'delete', 'Delete employees'),
('employees.export', 'Export Employees', 'employees', 'employee', 'export', 'Export employee data'),

-- Attendance
('attendance.view', 'View Attendance', 'attendance', 'attendance', 'view', 'View attendance records'),
('attendance.mark', 'Mark Attendance', 'attendance', 'attendance', 'create', 'Mark attendance'),
('attendance.edit', 'Edit Attendance', 'attendance', 'attendance', 'edit', 'Edit attendance records'),
('attendance.approve', 'Approve Attendance', 'attendance', 'attendance', 'approve', 'Approve attendance regularization'),

-- Leave Management
('leave.view', 'View Leave', 'leave', 'leave_request', 'view', 'View leave requests'),
('leave.apply', 'Apply Leave', 'leave', 'leave_request', 'create', 'Apply for leave'),
('leave.approve', 'Approve Leave', 'leave', 'leave_request', 'approve', 'Approve leave requests'),
('leave.cancel', 'Cancel Leave', 'leave', 'leave_request', 'delete', 'Cancel leave requests');

-- Role Permissions Mapping
CREATE TABLE role_permissions (
    role_permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(user_id),
    
    UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);

-- User Roles Mapping
CREATE TABLE user_roles (
    user_role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    
    -- Scope
    company_id UUID REFERENCES companies(company_id), -- NULL means all companies
    department_id UUID REFERENCES departments(department_id), -- NULL means all departments
    location_id UUID REFERENCES locations(location_id), -- NULL means all locations
    
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(user_id),
    
    expires_at TIMESTAMP,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(user_id, role_id, company_id, department_id, location_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_user_roles_role ON user_roles(role_id) WHERE is_active = TRUE;

-- Login History/Audit
CREATE TABLE login_history (
    login_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_timestamp TIMESTAMP,
    
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(50), -- desktop, mobile, tablet
    browser VARCHAR(100),
    os VARCHAR(100),
    
    location_city VARCHAR(100),
    location_country VARCHAR(100),
    
    login_status VARCHAR(20), -- success, failed, locked
    failure_reason VARCHAR(100),
    
    session_duration_seconds INTEGER
);

CREATE INDEX idx_login_history_user ON login_history(user_id);
CREATE INDEX idx_login_history_timestamp ON login_history(login_timestamp);

-- Audit Log (System-wide Activity Tracking)
CREATE TABLE audit_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    user_id UUID REFERENCES users(user_id),
    employee_id UUID REFERENCES employees(employee_id),
    
    action VARCHAR(50) NOT NULL, -- create, update, delete, view, export, approve, reject
    entity_type VARCHAR(50) NOT NULL, -- employee, leave_request, attendance, etc.
    entity_id UUID,
    entity_name VARCHAR(255),
    
    module VARCHAR(50), -- employees, leave, attendance, etc.
    
    old_values JSONB,
    new_values JSONB,
    changes JSONB, -- Specific fields changed
    
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_org ON audit_log(organization_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);

-- =====================================================
-- SECTION 5: NOTIFICATIONS & COMMUNICATIONS
-- =====================================================

-- Notification Templates
CREATE TABLE notification_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE, -- NULL means system template
    
    template_code VARCHAR(100) UNIQUE NOT NULL,
    template_name VARCHAR(200) NOT NULL,
    
    notification_type VARCHAR(50) NOT NULL, -- email, push, sms, in_app
    
    subject VARCHAR(255),
    body_template TEXT NOT NULL,
    
    -- Variables available in template
    available_variables TEXT[],
    
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications (In-App)
CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    notification_type VARCHAR(50) NOT NULL, -- info, warning, success, error, announcement
    category VARCHAR(50), -- leave, attendance, performance, system
    
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    action_url VARCHAR(500),
    action_text VARCHAR(50),
    
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    is_dismissed BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMP,
    
    expires_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Email Queue
CREATE TABLE email_queue (
    email_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    to_email VARCHAR(255) NOT NULL,
    cc_emails TEXT[],
    bcc_emails TEXT[],
    
    from_email VARCHAR(255),
    from_name VARCHAR(100),
    reply_to VARCHAR(255),
    
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    
    attachments JSONB,
    
    template_id UUID REFERENCES notification_templates(template_id),
    template_variables JSONB,
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, cancelled
    
    priority INTEGER DEFAULT 5, -- 1-10, lower = higher priority
    
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_queue_status ON email_queue(status, scheduled_at);

-- =====================================================
-- SECTION 6: SYSTEM CONFIGURATION
-- =====================================================

-- System Settings (Per Organization)
CREATE TABLE system_settings (
    setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    category VARCHAR(50) NOT NULL, -- general, attendance, leave, security, etc.
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    data_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json, date
    
    description TEXT,
    
    is_public BOOLEAN DEFAULT FALSE, -- Can be accessed by regular users
    is_editable BOOLEAN DEFAULT TRUE,
    
    default_value TEXT,
    
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID REFERENCES users(user_id),
    
    UNIQUE(organization_id, category, setting_key)
);

CREATE INDEX idx_system_settings_org ON system_settings(organization_id);

-- Custom Fields (Flexible Field Addition)
CREATE TABLE custom_fields (
    field_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    module_name VARCHAR(50) NOT NULL, -- employees, leave_requests, etc.
    
    field_name VARCHAR(100) NOT NULL, -- internal name
    field_label VARCHAR(100) NOT NULL, -- display label
    
    field_type VARCHAR(50) NOT NULL, 
    -- text, number, date, datetime, dropdown, multi_select, checkbox, textarea, url, email, phone
    
    field_options JSONB, -- For dropdown, multi_select
    
    validation_rules JSONB,
    
    is_required BOOLEAN DEFAULT FALSE,
    is_unique BOOLEAN DEFAULT FALSE,
    is_searchable BOOLEAN DEFAULT TRUE,
    is_filterable BOOLEAN DEFAULT TRUE,
    
    default_value TEXT,
    
    help_text TEXT,
    placeholder TEXT,
    
    display_order INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, module_name, field_name)
);

CREATE INDEX idx_custom_fields_org ON custom_fields(organization_id) WHERE is_active = TRUE;
CREATE INDEX idx_custom_fields_module ON custom_fields(module_name) WHERE is_active = TRUE;

-- Custom Field Values
CREATE TABLE custom_field_values (
    value_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    field_id UUID NOT NULL REFERENCES custom_fields(field_id) ON DELETE CASCADE,
    
    entity_type VARCHAR(50) NOT NULL, -- employees, leave_requests, etc.
    entity_id UUID NOT NULL,
    
    field_value TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(field_id, entity_id)
);

CREATE INDEX idx_custom_field_values_entity ON custom_field_values(entity_type, entity_id);
CREATE INDEX idx_custom_field_values_field ON custom_field_values(field_id);

-- API Keys (For External Integrations)
CREATE TABLE api_keys (
    api_key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    key_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    api_secret_hash VARCHAR(255),
    
    permissions TEXT[], -- List of permission codes
    
    rate_limit_per_minute INTEGER DEFAULT 60,
    
    allowed_ips TEXT[], -- IP whitelist
    
    is_active BOOLEAN DEFAULT TRUE,
    
    expires_at TIMESTAMP,
    
    last_used_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_keys_org ON api_keys(organization_id) WHERE is_active = TRUE;
CREATE INDEX idx_api_keys_key ON api_keys(api_key) WHERE is_active = TRUE;

-- Webhooks
CREATE TABLE webhooks (
    webhook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    webhook_name VARCHAR(100) NOT NULL,
    webhook_url VARCHAR(500) NOT NULL,
    
    events TEXT[] NOT NULL, -- employee.created, leave.approved, etc.
    
    is_active BOOLEAN DEFAULT TRUE,
    
    secret_key VARCHAR(255), -- For signature verification
    
    headers JSONB, -- Custom headers
    
    retry_count INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    
    last_triggered_at TIMESTAMP,
    
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhooks_org ON webhooks(organization_id) WHERE is_active = TRUE;

-- =====================================================
-- END OF SCHEMA PART 1
-- =====================================================

-- Add comments for documentation
COMMENT ON TABLE organizations IS 'Top-level multi-tenant isolation';
COMMENT ON TABLE companies IS 'Multiple companies within an organization';
COMMENT ON TABLE employees IS 'Core employee master data with multi-company support';
COMMENT ON TABLE users IS 'User authentication and session management';
COMMENT ON TABLE roles IS 'Role-based access control with org and company scope';
COMMENT ON TABLE audit_log IS 'Complete audit trail of all system activities';