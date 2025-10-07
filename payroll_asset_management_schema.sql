-- =====================================================
-- HR SYSTEM - PART 4: PAYROLL & ASSET MANAGEMENT
-- =====================================================

-- =====================================================
-- SECTION 1: PAYROLL & COMPENSATION MANAGEMENT
-- =====================================================

-- Compensation Components (Salary structure elements)
CREATE TABLE compensation_components (
    component_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    
    component_name VARCHAR(100) NOT NULL,
    component_code VARCHAR(50) NOT NULL,
    component_type VARCHAR(50) NOT NULL, -- earning, deduction, reimbursement
    
    calculation_type VARCHAR(50), -- fixed, percentage, formula
    calculation_value DECIMAL(12,2),
    calculation_formula TEXT, -- For complex calculations
    
    -- Tax Settings
    is_taxable BOOLEAN DEFAULT FALSE,
    is_provident_fund_applicable BOOLEAN DEFAULT FALSE,
    is_esi_applicable BOOLEAN DEFAULT FALSE, -- Employee State Insurance
    
    -- Display
    display_order INTEGER DEFAULT 0,
    is_visible_on_payslip BOOLEAN DEFAULT TRUE,
    
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    UNIQUE(organization_id, component_code)
);

CREATE INDEX idx_comp_components_org ON compensation_components(organization_id) WHERE is_deleted = FALSE;

-- Employee Compensation Structure
CREATE TABLE employee_compensation (
    compensation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    effective_from_date DATE NOT NULL,
    effective_to_date DATE,
    
    -- Basic Details
    annual_ctc DECIMAL(12,2) NOT NULL, -- Cost to Company
    monthly_gross DECIMAL(12,2) NOT NULL,
    monthly_net DECIMAL(12,2),
    
    -- Salary Type
    salary_type VARCHAR(50) DEFAULT 'monthly', -- monthly, hourly, daily
    payment_frequency VARCHAR(50) DEFAULT 'monthly', -- monthly, bi-weekly, weekly
    
    -- Salary Mode
    payment_mode VARCHAR(50) DEFAULT 'bank_transfer', -- bank_transfer, cash, cheque
    
    revision_type VARCHAR(50), -- new_hire, promotion, annual_increment, special
    revision_reason TEXT,
    
    is_current BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_emp_compensation_emp ON employee_compensation(employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_emp_compensation_current ON employee_compensation(employee_id, is_current) WHERE is_deleted = FALSE;

-- Employee Compensation Details (Component breakdown)
CREATE TABLE employee_compensation_details (
    detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compensation_id UUID NOT NULL REFERENCES employee_compensation(compensation_id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES compensation_components(component_id),
    
    amount DECIMAL(12,2) NOT NULL,
    
    -- For percentage-based components
    calculation_base VARCHAR(50), -- basic, gross, ctc
    percentage_value DECIMAL(5,2),
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comp_details_compensation ON employee_compensation_details(compensation_id);

-- Payroll Runs (Monthly payroll processing)
CREATE TABLE payroll_runs (
    payroll_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    
    run_name VARCHAR(100) NOT NULL,
    run_code VARCHAR(50) NOT NULL,
    
    -- Period
    period_month INTEGER NOT NULL, -- 1-12
    period_year INTEGER NOT NULL,
    pay_period_start_date DATE NOT NULL,
    pay_period_end_date DATE NOT NULL,
    
    -- Payment
    payment_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft', 
    -- draft, processing, calculated, approved, paid, cancelled
    
    -- Statistics
    total_employees INTEGER DEFAULT 0,
    total_gross_amount DECIMAL(15,2) DEFAULT 0,
    total_deductions DECIMAL(15,2) DEFAULT 0,
    total_net_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Processing
    processed_by UUID REFERENCES employees(employee_id),
    processed_at TIMESTAMP,
    
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    
    paid_by UUID REFERENCES employees(employee_id),
    paid_at TIMESTAMP,
    
    notes TEXT,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    UNIQUE(organization_id, run_code)
);

CREATE INDEX idx_payroll_runs_org ON payroll_runs(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_payroll_runs_period ON payroll_runs(period_year, period_month);

-- Payroll Items (Individual employee payroll for a run)
CREATE TABLE payroll_items (
    payroll_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(payroll_run_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- Attendance Data
    working_days DECIMAL(5,2) DEFAULT 0,
    present_days DECIMAL(5,2) DEFAULT 0,
    leave_days DECIMAL(5,2) DEFAULT 0,
    paid_leave_days DECIMAL(5,2) DEFAULT 0,
    unpaid_leave_days DECIMAL(5,2) DEFAULT 0,
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    
    -- Amounts
    gross_salary DECIMAL(12,2) NOT NULL,
    total_earnings DECIMAL(12,2) NOT NULL,
    total_deductions DECIMAL(12,2) NOT NULL,
    net_salary DECIMAL(12,2) NOT NULL,
    
    -- Tax
    taxable_income DECIMAL(12,2) DEFAULT 0,
    tax_deducted DECIMAL(12,2) DEFAULT 0,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, processed, paid, hold
    
    hold_reason TEXT,
    payment_reference VARCHAR(100),
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payroll_items_run ON payroll_items(payroll_run_id);
CREATE INDEX idx_payroll_items_employee ON payroll_items(employee_id);

-- Payroll Item Details (Component-wise breakdown)
CREATE TABLE payroll_item_details (
    detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_item_id UUID NOT NULL REFERENCES payroll_items(payroll_item_id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES compensation_components(component_id),
    
    amount DECIMAL(12,2) NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payroll_item_details_item ON payroll_item_details(payroll_item_id);

-- Salary Slips (Generated documents)
CREATE TABLE salary_slips (
    slip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_item_id UUID NOT NULL REFERENCES payroll_items(payroll_item_id) ON DELETE CASCADE,
    
    slip_number VARCHAR(50) UNIQUE NOT NULL,
    
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by UUID REFERENCES employees(employee_id),
    
    -- Document
    file_path VARCHAR(500),
    file_size BIGINT,
    
    -- Status
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    
    is_downloaded BOOLEAN DEFAULT FALSE,
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP,
    
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_salary_slips_item ON salary_slips(payroll_item_id);

-- Bonuses & One-time Payments
CREATE TABLE bonuses (
    bonus_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    bonus_type VARCHAR(50) NOT NULL, -- performance, festive, retention, referral, spot
    bonus_name VARCHAR(100) NOT NULL,
    
    amount DECIMAL(12,2) NOT NULL,
    
    -- Period
    applicable_month INTEGER,
    applicable_year INTEGER,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, paid, rejected
    
    reason TEXT,
    
    requested_by UUID REFERENCES employees(employee_id),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    
    paid_in_payroll_run_id UUID REFERENCES payroll_runs(payroll_run_id),
    paid_at TIMESTAMP,
    
    rejection_reason TEXT,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_bonuses_employee ON bonuses(employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_bonuses_status ON bonuses(status);

-- Loan Management
CREATE TABLE employee_loans (
    loan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    loan_type VARCHAR(50) NOT NULL, -- salary_advance, personal, emergency
    loan_amount DECIMAL(12,2) NOT NULL,
    
    -- Repayment
    interest_rate DECIMAL(5,2) DEFAULT 0,
    installment_amount DECIMAL(12,2) NOT NULL,
    number_of_installments INTEGER NOT NULL,
    installments_paid INTEGER DEFAULT 0,
    
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, active, completed, rejected
    
    reason TEXT,
    
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    
    rejection_reason TEXT,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_loans_employee ON employee_loans(employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_loans_status ON employee_loans(status);

-- Loan Installments
CREATE TABLE loan_installments (
    installment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES employee_loans(loan_id) ON DELETE CASCADE,
    
    installment_number INTEGER NOT NULL,
    installment_amount DECIMAL(12,2) NOT NULL,
    
    due_date DATE NOT NULL,
    
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, skipped
    
    paid_in_payroll_run_id UUID REFERENCES payroll_runs(payroll_run_id),
    paid_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loan_installments_loan ON loan_installments(loan_id);

-- Reimbursements
CREATE TABLE reimbursements (
    reimbursement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    reimbursement_type VARCHAR(50) NOT NULL, -- travel, medical, telephone, internet, food, other
    
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    
    expense_date DATE NOT NULL,
    description TEXT,
    
    -- Supporting Documents
    receipt_file_path VARCHAR(500),
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, paid, rejected
    
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    reviewed_by UUID REFERENCES employees(employee_id),
    reviewed_at TIMESTAMP,
    
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    
    paid_in_payroll_run_id UUID REFERENCES payroll_runs(payroll_run_id),
    paid_at TIMESTAMP,
    
    rejection_reason TEXT,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_reimbursements_employee ON reimbursements(employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_reimbursements_status ON reimbursements(status);

-- Tax Declarations (for tax calculation)
CREATE TABLE tax_declarations (
    declaration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    financial_year VARCHAR(20) NOT NULL, -- e.g., 2024-25
    
    -- Income Details
    previous_employer_income DECIMAL(12,2) DEFAULT 0,
    other_income DECIMAL(12,2) DEFAULT 0,
    
    -- Investment Declarations (Section 80C, etc.)
    investments_80c DECIMAL(12,2) DEFAULT 0, -- PPF, EPF, Life Insurance, etc.
    investments_80d DECIMAL(12,2) DEFAULT 0, -- Medical Insurance
    investments_80e DECIMAL(12,2) DEFAULT 0, -- Education Loan Interest
    investments_other DECIMAL(12,2) DEFAULT 0,
    
    -- HRA Details
    monthly_rent DECIMAL(12,2) DEFAULT 0,
    rent_paid_from DATE,
    rent_paid_to DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, submitted, approved, rejected
    
    submitted_at TIMESTAMP,
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    
    rejection_reason TEXT,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_tax_declarations_employee ON tax_declarations(employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_tax_declarations_year ON tax_declarations(financial_year);

-- =====================================================
-- SECTION 2: ASSET MANAGEMENT
-- =====================================================

-- Asset Categories
CREATE TABLE asset_categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    category_name VARCHAR(100) NOT NULL,
    category_code VARCHAR(50) NOT NULL,
    parent_category_id UUID REFERENCES asset_categories(category_id),
    
    description TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    UNIQUE(organization_id, category_code)
);

CREATE INDEX idx_asset_categories_org ON asset_categories(organization_id) WHERE is_deleted = FALSE;

-- Assets
CREATE TABLE assets (
    asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    
    asset_name VARCHAR(200) NOT NULL,
    asset_code VARCHAR(50) NOT NULL,
    category_id UUID REFERENCES asset_categories(category_id),
    
    asset_type VARCHAR(50), -- laptop, desktop, mobile, furniture, vehicle, other
    
    -- Details
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    
    -- Purchase Info
    purchase_date DATE,
    purchase_price DECIMAL(12,2),
    vendor_name VARCHAR(200),
    invoice_number VARCHAR(100),
    
    -- Warranty
    warranty_start_date DATE,
    warranty_end_date DATE,
    warranty_details TEXT,
    
    -- Depreciation
    depreciation_method VARCHAR(50), -- straight_line, declining_balance, none
    depreciation_rate DECIMAL(5,2),
    current_value DECIMAL(12,2),
    
    -- Physical Details
    location_id UUID REFERENCES locations(location_id),
    
    -- Condition
    condition VARCHAR(50) DEFAULT 'good', -- excellent, good, fair, poor, damaged
    
    -- Status
    status VARCHAR(50) DEFAULT 'available', 
    -- available, assigned, under_maintenance, retired, lost, damaged
    
    description TEXT,
    notes TEXT,
    
    -- Images
    image_urls JSONB, -- Array of image URLs
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    UNIQUE(organization_id, asset_code)
);

CREATE INDEX idx_assets_org ON assets(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_category ON assets(category_id);

-- Asset Assignments
CREATE TABLE asset_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    assigned_date DATE NOT NULL,
    expected_return_date DATE,
    actual_return_date DATE,
    
    -- Assignment Details
    purpose TEXT,
    terms_accepted BOOLEAN DEFAULT FALSE,
    terms_accepted_at TIMESTAMP,
    
    -- Condition at Assignment
    condition_at_assignment VARCHAR(50),
    notes_at_assignment TEXT,
    
    -- Condition at Return
    condition_at_return VARCHAR(50),
    notes_at_return TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, returned, overdue
    
    assigned_by UUID REFERENCES employees(employee_id),
    returned_to UUID REFERENCES employees(employee_id),
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_asset_assignments_asset ON asset_assignments(asset_id);
CREATE INDEX idx_asset_assignments_employee ON asset_assignments(employee_id);
CREATE INDEX idx_asset_assignments_status ON asset_assignments(status);

-- Asset Maintenance
CREATE TABLE asset_maintenance (
    maintenance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
    
    maintenance_type VARCHAR(50) NOT NULL, -- preventive, corrective, emergency
    
    scheduled_date DATE,
    completed_date DATE,
    
    description TEXT NOT NULL,
    cost DECIMAL(12,2) DEFAULT 0,
    
    vendor_name VARCHAR(200),
    vendor_contact VARCHAR(100),
    
    performed_by VARCHAR(200),
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled', 
    -- scheduled, in_progress, completed, cancelled
    
    notes TEXT,
    
    next_maintenance_date DATE,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_asset_maintenance_asset ON asset_maintenance(asset_id);
CREATE INDEX idx_asset_maintenance_status ON asset_maintenance(status);
CREATE INDEX idx_asset_maintenance_date ON asset_maintenance(scheduled_date);

-- Asset Requests (Employees requesting assets)
CREATE TABLE asset_requests (
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    asset_type VARCHAR(50) NOT NULL,
    category_id UUID REFERENCES asset_categories(category_id),
    
    request_reason TEXT NOT NULL,
    urgency VARCHAR(50) DEFAULT 'normal', -- low, normal, high, critical
    
    required_by_date DATE,
    
    specifications JSONB, -- Specific requirements
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', 
    -- pending, approved, assigned, rejected, cancelled
    
    assigned_asset_id UUID REFERENCES assets(asset_id),
    
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    reviewed_by UUID REFERENCES employees(employee_id),
    reviewed_at TIMESTAMP,
    
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    
    rejection_reason TEXT,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_asset_requests_employee ON asset_requests(employee_id);
CREATE INDEX idx_asset_requests_status ON asset_requests(status);

-- Asset Audit Log
CREATE TABLE asset_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
    
    action VARCHAR(50) NOT NULL, -- created, assigned, returned, maintenance, updated, retired
    
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    
    old_location_id UUID,
    new_location_id UUID,
    
    old_assigned_to UUID,
    new_assigned_to UUID,
    
    changes JSONB, -- Detailed changes
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

CREATE INDEX idx_asset_audit_asset ON asset_audit_log(asset_id);
CREATE INDEX idx_asset_audit_date ON asset_audit_log(created_at);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update modified_at timestamp
CREATE OR REPLACE FUNCTION update_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all relevant tables
CREATE TRIGGER update_compensation_components_timestamp
    BEFORE UPDATE ON compensation_components
    FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER update_employee_compensation_timestamp
    BEFORE UPDATE ON employee_compensation
    FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER update_payroll_runs_timestamp
    BEFORE UPDATE ON payroll_runs
    FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER update_payroll_items_timestamp
    BEFORE UPDATE ON payroll_items
    FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER update_bonuses_timestamp
    BEFORE UPDATE ON bonuses
    FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER update_employee_loans_timestamp
    BEFORE UPDATE ON employee_loans
    FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER update_reimbursements_timestamp
    BEFORE UPDATE ON reimbursements
    FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER update_tax_declarations_timestamp
    BEFORE UPDATE ON tax_declarations
    FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER update_assets_timestamp
    BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER update_asset_assignments_timestamp
    BEFORE UPDATE ON asset_assignments
    FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER update_asset_maintenance_timestamp
    BEFORE UPDATE ON asset_maintenance
    FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

CREATE TRIGGER update_asset_requests_timestamp
    BEFORE UPDATE ON asset_requests
    FOR EACH ROW EXECUTE FUNCTION update_modified_timestamp();

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Current Employee Compensation View
CREATE OR REPLACE VIEW v_current_employee_compensation AS
SELECT 
    ec.employee_id,
    e.employee_code,
    e.first_name,
    e.last_name,
    ec.annual_ctc,
    ec.monthly_gross,
    ec.monthly_net,
    ec.effective_from_date,
    ec.payment_frequency,
    ec.payment_mode
FROM employee_compensation ec
JOIN employees e ON ec.employee_id = e.employee_id
WHERE ec.is_current = TRUE 
    AND ec.is_deleted = FALSE 
    AND e.is_deleted = FALSE;

-- Active Asset Assignments View
CREATE OR REPLACE VIEW v_active_asset_assignments AS
SELECT 
    aa.assignment_id,
    a.asset_code,
    a.asset_name,
    a.asset_type,
    e.employee_code,
    e.first_name || ' ' || e.last_name AS employee_name,
    aa.assigned_date,
    aa.expected_return_date,
    aa.status,
    CASE 
        WHEN aa.expected_return_date < CURRENT_DATE THEN TRUE 
        ELSE FALSE 
    END AS is_overdue
FROM asset_assignments aa
JOIN assets a ON aa.asset_id = a.asset_id
JOIN employees e ON aa.employee_id = e.employee_id
WHERE aa.status = 'active' 
    AND aa.is_deleted = FALSE;

-- Payroll Summary View
CREATE OR REPLACE VIEW v_payroll_summary AS
SELECT 
    pr.payroll_run_id,
    pr.run_name,
    pr.period_month,
    pr.period_year,
    pr.status,
    pr.payment_date,
    COUNT(pi.payroll_item_id) AS employee_count,
    SUM(pi.gross_salary) AS total_gross,
    SUM(pi.total_deductions) AS total_deductions,
    SUM(pi.net_salary) AS total_net
FROM payroll_runs pr
LEFT JOIN payroll_items pi ON pr.payroll_run_id = pi.payroll_run_id
WHERE pr.is_deleted = FALSE
GROUP BY pr.payroll_run_id, pr.run_name, pr.period_month, pr.period_year, 
         pr.status, pr.payment_date;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE compensation_components IS 'Defines salary components like Basic, HRA, Allowances, Deductions';
COMMENT ON TABLE employee_compensation IS 'Employee salary structure with revision history';
COMMENT ON TABLE payroll_runs IS 'Monthly or periodic payroll processing batches';
COMMENT ON TABLE payroll_items IS 'Individual employee payroll entries in a run';
COMMENT ON TABLE salary_slips IS 'Generated salary slip documents';
COMMENT ON TABLE bonuses IS 'One-time bonus payments to employees';
COMMENT ON TABLE employee_loans IS 'Employee loans and advances';
COMMENT ON TABLE reimbursements IS 'Employee expense reimbursements';
COMMENT ON TABLE tax_declarations IS 'Employee tax investment declarations';

COMMENT ON TABLE assets IS 'Company assets like laptops, mobiles, furniture';
COMMENT ON TABLE asset_assignments IS 'Asset assignment to employees';
COMMENT ON TABLE asset_maintenance IS 'Asset maintenance records';
COMMENT ON TABLE asset_requests IS 'Employee asset requests';
COMMENT ON TABLE asset_audit_log IS 'Complete audit trail for all asset changes';
