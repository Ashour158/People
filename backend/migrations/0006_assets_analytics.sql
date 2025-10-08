-- =====================================================
-- Migration 0006: Assets & Analytics
-- Asset management, Analytics fact tables
-- =====================================================

-- =====================================================
-- ASSET CATEGORIES
-- =====================================================

CREATE TABLE IF NOT EXISTS asset_categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    category_name VARCHAR(200) NOT NULL,
    category_code VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Parent Category
    parent_category_id UUID REFERENCES asset_categories(category_id),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT unique_asset_category_code UNIQUE (organization_id, category_code)
);

CREATE INDEX idx_asset_categories_org ON asset_categories(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_asset_categories_parent ON asset_categories(parent_category_id) WHERE is_deleted = FALSE;

-- =====================================================
-- ASSETS
-- =====================================================

CREATE TABLE IF NOT EXISTS assets (
    asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Asset Details
    asset_name VARCHAR(200) NOT NULL,
    asset_code VARCHAR(50) NOT NULL,
    asset_tag VARCHAR(100),
    
    -- Category
    category_id UUID NOT NULL REFERENCES asset_categories(category_id),
    
    -- Asset Information
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    
    -- Purchase Details
    purchase_date DATE,
    purchase_price DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    vendor VARCHAR(200),
    
    -- Warranty
    warranty_expiry_date DATE,
    
    -- Depreciation
    depreciation_rate DECIMAL(5, 2),
    current_value DECIMAL(15, 2),
    
    -- Status
    status VARCHAR(50) DEFAULT 'available',
    condition VARCHAR(50),
    
    -- Location
    location_id UUID REFERENCES locations(location_id),
    
    -- Status
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT unique_asset_code UNIQUE (organization_id, asset_code)
);

CREATE INDEX idx_assets_org ON assets(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_assets_category ON assets(category_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_assets_status ON assets(status, organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_assets_location ON assets(location_id) WHERE is_deleted = FALSE;

-- =====================================================
-- ASSET ASSIGNMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS asset_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- Assignment Details
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_return_date DATE,
    actual_return_date DATE,
    
    -- Condition
    condition_at_assignment VARCHAR(50),
    condition_at_return VARCHAR(50),
    
    -- Status
    status VARCHAR(50) DEFAULT 'active',
    
    -- Notes
    assignment_notes TEXT,
    return_notes TEXT,
    
    -- Approval
    assigned_by UUID REFERENCES employees(employee_id),
    returned_to UUID REFERENCES employees(employee_id),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_asset_assignments_org ON asset_assignments(organization_id);
CREATE INDEX idx_asset_assignments_asset ON asset_assignments(asset_id);
CREATE INDEX idx_asset_assignments_emp ON asset_assignments(employee_id, status);
CREATE INDEX idx_asset_assignments_status ON asset_assignments(status);

-- =====================================================
-- ASSET MAINTENANCE
-- =====================================================

CREATE TABLE IF NOT EXISTS asset_maintenance (
    maintenance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
    
    -- Maintenance Details
    maintenance_type VARCHAR(50) NOT NULL,
    maintenance_date DATE NOT NULL,
    description TEXT,
    
    -- Cost
    cost DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Vendor
    service_provider VARCHAR(200),
    
    -- Next Maintenance
    next_maintenance_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'completed',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_asset_maintenance_org ON asset_maintenance(organization_id);
CREATE INDEX idx_asset_maintenance_asset ON asset_maintenance(asset_id, maintenance_date DESC);
CREATE INDEX idx_asset_maintenance_date ON asset_maintenance(maintenance_date);

-- =====================================================
-- ANALYTICS: FACT HEADCOUNT DAILY
-- =====================================================

CREATE TABLE IF NOT EXISTS fact_headcount_daily (
    fact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Date Dimension
    date_key DATE NOT NULL,
    year INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    month INTEGER NOT NULL,
    week INTEGER NOT NULL,
    
    -- Organization Dimensions
    company_id UUID REFERENCES companies(company_id),
    department_id UUID REFERENCES departments(department_id),
    location_id UUID REFERENCES locations(location_id),
    
    -- Metrics
    total_headcount INTEGER DEFAULT 0,
    active_employees INTEGER DEFAULT 0,
    new_hires INTEGER DEFAULT 0,
    exits INTEGER DEFAULT 0,
    
    -- Employment Type Breakdown
    full_time_count INTEGER DEFAULT 0,
    part_time_count INTEGER DEFAULT 0,
    contract_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_headcount_daily UNIQUE (organization_id, date_key, company_id, department_id, location_id)
);

CREATE INDEX idx_fact_headcount_org ON fact_headcount_daily(organization_id);
CREATE INDEX idx_fact_headcount_date ON fact_headcount_daily(date_key, organization_id);
CREATE INDEX idx_fact_headcount_period ON fact_headcount_daily(year, quarter, month);
CREATE INDEX idx_fact_headcount_company ON fact_headcount_daily(company_id, date_key);
CREATE INDEX idx_fact_headcount_dept ON fact_headcount_daily(department_id, date_key);

-- =====================================================
-- ANALYTICS: FACT LEAVE BALANCE DAILY
-- =====================================================

CREATE TABLE IF NOT EXISTS fact_leave_balance_daily (
    fact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Date Dimension
    date_key DATE NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    
    -- Dimensions
    employee_id UUID NOT NULL REFERENCES employees(employee_id),
    leave_type_id UUID NOT NULL REFERENCES leave_types(leave_type_id),
    department_id UUID REFERENCES departments(department_id),
    
    -- Metrics
    allocated_days DECIMAL(5, 2) DEFAULT 0,
    used_days DECIMAL(5, 2) DEFAULT 0,
    pending_days DECIMAL(5, 2) DEFAULT 0,
    available_days DECIMAL(5, 2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_leave_balance_daily UNIQUE (organization_id, date_key, employee_id, leave_type_id)
);

CREATE INDEX idx_fact_leave_balance_org ON fact_leave_balance_daily(organization_id);
CREATE INDEX idx_fact_leave_balance_date ON fact_leave_balance_daily(date_key, organization_id);
CREATE INDEX idx_fact_leave_balance_emp ON fact_leave_balance_daily(employee_id, date_key);
CREATE INDEX idx_fact_leave_balance_type ON fact_leave_balance_daily(leave_type_id, date_key);

-- =====================================================
-- ANALYTICS: FACT PAYROLL RUN SUMMARY
-- =====================================================

CREATE TABLE IF NOT EXISTS fact_payroll_run_summary (
    fact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Payroll Run
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(payroll_run_id),
    
    -- Period
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    
    -- Dimensions
    company_id UUID REFERENCES companies(company_id),
    department_id UUID REFERENCES departments(department_id),
    
    -- Aggregate Metrics
    employee_count INTEGER DEFAULT 0,
    total_gross DECIMAL(15, 2) DEFAULT 0,
    total_deductions DECIMAL(15, 2) DEFAULT 0,
    total_net DECIMAL(15, 2) DEFAULT 0,
    
    -- Component Breakdown (JSONB for flexibility)
    earnings_breakdown JSONB,
    deductions_breakdown JSONB,
    
    -- Average Metrics
    avg_gross_salary DECIMAL(15, 2),
    avg_net_salary DECIMAL(15, 2),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_payroll_summary UNIQUE (organization_id, payroll_run_id, company_id, department_id)
);

CREATE INDEX idx_fact_payroll_org ON fact_payroll_run_summary(organization_id);
CREATE INDEX idx_fact_payroll_run ON fact_payroll_run_summary(payroll_run_id);
CREATE INDEX idx_fact_payroll_period ON fact_payroll_run_summary(period_year, period_month, organization_id);
CREATE INDEX idx_fact_payroll_company ON fact_payroll_run_summary(company_id, period_year, period_month);
CREATE INDEX idx_fact_payroll_dept ON fact_payroll_run_summary(department_id, period_year, period_month);

-- =====================================================
-- ROW-LEVEL SECURITY (RLS) - PLACEHOLDERS
-- =====================================================

/*
COMMENT ON TABLE asset_categories IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE assets IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE asset_assignments IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE asset_maintenance IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE fact_headcount_daily IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE fact_leave_balance_daily IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE fact_payroll_run_summary IS 'Row-Level Security: Enable with organization_id filter';
*/

INSERT INTO schema_migrations (migration_name) VALUES ('0006_assets_analytics');
