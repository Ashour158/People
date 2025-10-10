-- =====================================================
-- Migration 0002: HR Core
-- Departments, Designations, Locations, Employees
-- =====================================================

-- =====================================================
-- DEPARTMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS departments (
    department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    
    department_name VARCHAR(200) NOT NULL,
    department_code VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Hierarchy
    parent_department_id UUID REFERENCES departments(department_id),
    department_head_id UUID,
    
    -- Cost Center
    cost_center_code VARCHAR(50),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT unique_dept_code_per_org UNIQUE (organization_id, department_code)
);

CREATE INDEX idx_departments_org ON departments(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_departments_company ON departments(company_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_departments_parent ON departments(parent_department_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_departments_active ON departments(is_active, organization_id) WHERE is_deleted = FALSE;

-- =====================================================
-- DESIGNATIONS (Job Titles)
-- =====================================================

CREATE TABLE IF NOT EXISTS designations (
    designation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    designation_name VARCHAR(200) NOT NULL,
    designation_code VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Job Level
    job_level INTEGER,
    job_grade VARCHAR(50),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT unique_designation_code_per_org UNIQUE (organization_id, designation_code)
);

CREATE INDEX idx_designations_org ON designations(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_designations_active ON designations(is_active, organization_id) WHERE is_deleted = FALSE;

-- =====================================================
-- LOCATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS locations (
    location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    
    location_name VARCHAR(200) NOT NULL,
    location_code VARCHAR(50) NOT NULL,
    location_type VARCHAR(50),
    
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Geolocation
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    geofence_radius_meters INTEGER DEFAULT 100,
    
    -- Contact
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT unique_location_code_per_org UNIQUE (organization_id, location_code)
);

CREATE INDEX idx_locations_org ON locations(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_locations_company ON locations(company_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_locations_active ON locations(is_active, organization_id) WHERE is_deleted = FALSE;

-- =====================================================
-- EMPLOYEES
-- =====================================================

CREATE TABLE IF NOT EXISTS employees (
    employee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id),
    
    -- Employee Code
    employee_code VARCHAR(50) NOT NULL,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    full_name_arabic VARCHAR(300),
    
    -- Contact
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    
    -- Identification
    national_id VARCHAR(100),
    passport_number VARCHAR(50),
    
    -- Demographics
    date_of_birth DATE,
    gender VARCHAR(20),
    nationality VARCHAR(100),
    marital_status VARCHAR(20),
    
    -- Employment Details
    department_id UUID REFERENCES departments(department_id),
    designation_id UUID REFERENCES designations(designation_id),
    location_id UUID REFERENCES locations(location_id),
    reporting_manager_id UUID REFERENCES employees(employee_id),
    
    -- Employment Dates
    hire_date DATE NOT NULL,
    confirmation_date DATE,
    probation_end_date DATE,
    exit_date DATE,
    
    -- Employment Type & Status
    employment_type VARCHAR(50) NOT NULL,
    employment_status VARCHAR(50) DEFAULT 'active',
    
    -- Work Details
    work_email VARCHAR(255),
    work_phone VARCHAR(20),
    
    -- Profile
    profile_picture_url VARCHAR(500),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT unique_employee_code_per_org UNIQUE (organization_id, employee_code),
    CONSTRAINT unique_employee_email_per_org UNIQUE (organization_id, email)
);

CREATE INDEX idx_employees_org ON employees(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_employees_company ON employees(company_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_employees_user ON employees(user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_employees_department ON employees(department_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_employees_designation ON employees(designation_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_employees_location ON employees(location_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_employees_manager ON employees(reporting_manager_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_employees_status ON employees(employment_status, organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_employees_code ON employees(employee_code) WHERE is_deleted = FALSE;
CREATE INDEX idx_employees_email ON employees(email) WHERE is_deleted = FALSE;
CREATE INDEX idx_employees_hire_date ON employees(hire_date) WHERE is_deleted = FALSE;

-- =====================================================
-- EMPLOYEE ADDRESSES
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_addresses (
    address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    address_type VARCHAR(50) NOT NULL,
    
    -- Address Details
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Validity
    is_primary BOOLEAN DEFAULT FALSE,
    is_current BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_employee_addresses_org ON employee_addresses(organization_id);
CREATE INDEX idx_employee_addresses_emp ON employee_addresses(employee_id);
CREATE INDEX idx_employee_addresses_primary ON employee_addresses(employee_id, is_primary);

-- =====================================================
-- EMPLOYEE WORK HISTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_work_history (
    work_history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    company_name VARCHAR(200) NOT NULL,
    job_title VARCHAR(200),
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- Details
    description TEXT,
    reason_for_leaving VARCHAR(500),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_employee_work_history_org ON employee_work_history(organization_id);
CREATE INDEX idx_employee_work_history_emp ON employee_work_history(employee_id);

-- =====================================================
-- EMPLOYEE EDUCATION
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_education (
    education_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    degree VARCHAR(200) NOT NULL,
    field_of_study VARCHAR(200),
    institution VARCHAR(200) NOT NULL,
    
    -- Dates
    start_date DATE,
    end_date DATE,
    graduation_year INTEGER,
    
    -- Details
    grade VARCHAR(50),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_employee_education_org ON employee_education(organization_id);
CREATE INDEX idx_employee_education_emp ON employee_education(employee_id);

-- =====================================================
-- ROW-LEVEL SECURITY (RLS) - PLACEHOLDERS
-- =====================================================

/*
COMMENT ON TABLE departments IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE designations IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE locations IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE employees IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE employee_addresses IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE employee_work_history IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE employee_education IS 'Row-Level Security: Enable with organization_id filter';
*/

INSERT INTO schema_migrations (migration_name) VALUES ('0002_hr_core');
