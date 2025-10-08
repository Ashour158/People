-- =====================================================
-- Migration 0004: Payroll Core (MENA Focus)
-- Compensation, Payroll, Gratuity, End-of-Service, Loans, Tax
-- =====================================================

-- =====================================================
-- COMPENSATION COMPONENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS compensation_components (
    component_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    component_name VARCHAR(100) NOT NULL,
    component_code VARCHAR(50) NOT NULL,
    component_type VARCHAR(50) NOT NULL,
    
    -- Calculation
    calculation_method VARCHAR(50),
    is_taxable BOOLEAN DEFAULT TRUE,
    is_statutory BOOLEAN DEFAULT FALSE,
    
    -- MENA Specific
    is_basic_salary BOOLEAN DEFAULT FALSE,
    is_housing_allowance BOOLEAN DEFAULT FALSE,
    is_transport_allowance BOOLEAN DEFAULT FALSE,
    affects_gratuity BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT unique_component_code_per_org UNIQUE (organization_id, component_code)
);

CREATE INDEX idx_compensation_components_org ON compensation_components(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_compensation_components_type ON compensation_components(component_type, organization_id) WHERE is_deleted = FALSE;

-- =====================================================
-- EMPLOYEE COMPENSATION
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_compensation (
    compensation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- Effective Period
    effective_from DATE NOT NULL,
    effective_to DATE,
    
    -- Total Compensation
    total_annual_ctc DECIMAL(15, 2),
    total_monthly_ctc DECIMAL(15, 2),
    
    -- Currency
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Status
    is_current BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_employee_compensation_org ON employee_compensation(organization_id);
CREATE INDEX idx_employee_compensation_emp ON employee_compensation(employee_id, is_current);
CREATE INDEX idx_employee_compensation_dates ON employee_compensation(effective_from, effective_to);

-- =====================================================
-- EMPLOYEE COMPENSATION LINES
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_compensation_lines (
    line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compensation_id UUID NOT NULL REFERENCES employee_compensation(compensation_id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES compensation_components(component_id),
    
    -- Amount
    amount DECIMAL(15, 2) NOT NULL,
    calculation_basis VARCHAR(50),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compensation_lines_compensation ON employee_compensation_lines(compensation_id);
CREATE INDEX idx_compensation_lines_component ON employee_compensation_lines(component_id);

-- =====================================================
-- PAYROLL RUNS
-- =====================================================

CREATE TABLE IF NOT EXISTS payroll_runs (
    payroll_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id),
    
    -- Period
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    payment_date DATE,
    
    -- Run Details
    run_name VARCHAR(200),
    run_type VARCHAR(50) DEFAULT 'regular',
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',
    
    -- Totals
    total_employees INTEGER DEFAULT 0,
    total_gross DECIMAL(15, 2) DEFAULT 0,
    total_deductions DECIMAL(15, 2) DEFAULT 0,
    total_net DECIMAL(15, 2) DEFAULT 0,
    
    -- Processing
    processed_by UUID REFERENCES users(user_id),
    processed_at TIMESTAMP,
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    CONSTRAINT unique_payroll_run UNIQUE (organization_id, period_year, period_month, run_type)
);

CREATE INDEX idx_payroll_runs_org ON payroll_runs(organization_id);
CREATE INDEX idx_payroll_runs_period ON payroll_runs(period_year, period_month, organization_id);
CREATE INDEX idx_payroll_runs_status ON payroll_runs(status, organization_id);

-- =====================================================
-- PAYROLL ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS payroll_items (
    payroll_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(payroll_run_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- Amounts
    gross_salary DECIMAL(15, 2) NOT NULL,
    total_earnings DECIMAL(15, 2) DEFAULT 0,
    total_deductions DECIMAL(15, 2) DEFAULT 0,
    net_salary DECIMAL(15, 2) NOT NULL,
    
    -- MENA Specific Calculations
    gratuity_amount DECIMAL(15, 2) DEFAULT 0,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',
    payment_status VARCHAR(50) DEFAULT 'pending',
    
    -- Payment Details
    payment_method VARCHAR(50),
    bank_account_number VARCHAR(100),
    payment_reference VARCHAR(200),
    paid_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payroll_items_org ON payroll_items(organization_id);
CREATE INDEX idx_payroll_items_run ON payroll_items(payroll_run_id);
CREATE INDEX idx_payroll_items_emp ON payroll_items(employee_id);
CREATE INDEX idx_payroll_items_status ON payroll_items(status);

-- =====================================================
-- PAYROLL ITEM DETAILS
-- =====================================================

CREATE TABLE IF NOT EXISTS payroll_item_details (
    detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_item_id UUID NOT NULL REFERENCES payroll_items(payroll_item_id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES compensation_components(component_id),
    
    -- Amount
    amount DECIMAL(15, 2) NOT NULL,
    component_type VARCHAR(50) NOT NULL,
    
    -- Calculation Details
    calculation_basis VARCHAR(50),
    calculation_value DECIMAL(15, 2),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payroll_details_item ON payroll_item_details(payroll_item_id);
CREATE INDEX idx_payroll_details_component ON payroll_item_details(component_id);

-- =====================================================
-- SALARY SLIPS
-- =====================================================

CREATE TABLE IF NOT EXISTS salary_slips (
    salary_slip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    payroll_item_id UUID NOT NULL REFERENCES payroll_items(payroll_item_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- Period
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    
    -- Document
    slip_number VARCHAR(100),
    pdf_url VARCHAR(500),
    
    -- Status
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    is_downloaded BOOLEAN DEFAULT FALSE,
    downloaded_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_salary_slips_org ON salary_slips(organization_id);
CREATE INDEX idx_salary_slips_emp ON salary_slips(employee_id, period_year, period_month);
CREATE INDEX idx_salary_slips_period ON salary_slips(period_year, period_month);

-- =====================================================
-- GRATUITY POLICIES (MENA Specific)
-- =====================================================

CREATE TABLE IF NOT EXISTS gratuity_policies (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    policy_name VARCHAR(200) NOT NULL,
    country VARCHAR(100) NOT NULL,
    
    -- Calculation Rules
    calculation_method VARCHAR(50) NOT NULL,
    
    -- Service Duration Rules (in months)
    tier1_months INTEGER DEFAULT 60,
    tier1_days_per_year DECIMAL(5, 2) DEFAULT 21,
    tier2_days_per_year DECIMAL(5, 2) DEFAULT 30,
    
    -- Resignation vs Termination
    resignation_percentage DECIMAL(5, 2) DEFAULT 100,
    termination_percentage DECIMAL(5, 2) DEFAULT 100,
    
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

CREATE INDEX idx_gratuity_policies_org ON gratuity_policies(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_gratuity_policies_country ON gratuity_policies(country) WHERE is_deleted = FALSE;

-- =====================================================
-- END OF SERVICE CALCULATIONS (MENA Specific)
-- =====================================================

CREATE TABLE IF NOT EXISTS end_of_service_calculations (
    calculation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- Separation Details
    separation_date DATE NOT NULL,
    separation_reason VARCHAR(50) NOT NULL,
    years_of_service DECIMAL(5, 2),
    
    -- Gratuity Calculation
    policy_id UUID REFERENCES gratuity_policies(policy_id),
    basic_salary_for_calculation DECIMAL(15, 2),
    gratuity_amount DECIMAL(15, 2),
    
    -- Other EOS Components
    unused_leave_encashment DECIMAL(15, 2) DEFAULT 0,
    notice_period_payment DECIMAL(15, 2) DEFAULT 0,
    other_benefits DECIMAL(15, 2) DEFAULT 0,
    
    -- Deductions
    loans_outstanding DECIMAL(15, 2) DEFAULT 0,
    advances_outstanding DECIMAL(15, 2) DEFAULT 0,
    other_deductions DECIMAL(15, 2) DEFAULT 0,
    
    -- Final Settlement
    total_amount DECIMAL(15, 2),
    net_payable DECIMAL(15, 2),
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,
    
    -- Payment
    payment_date DATE,
    payment_reference VARCHAR(200),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_eos_calculations_org ON end_of_service_calculations(organization_id);
CREATE INDEX idx_eos_calculations_emp ON end_of_service_calculations(employee_id);
CREATE INDEX idx_eos_calculations_status ON end_of_service_calculations(status);

-- =====================================================
-- REIMBURSEMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS reimbursements (
    reimbursement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- Request Details
    reimbursement_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Receipt
    receipt_url VARCHAR(500),
    receipt_date DATE,
    
    -- Status & Approval
    status VARCHAR(50) DEFAULT 'pending',
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Payment
    payment_date DATE,
    payment_reference VARCHAR(200),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_reimbursements_org ON reimbursements(organization_id);
CREATE INDEX idx_reimbursements_emp ON reimbursements(employee_id, status);
CREATE INDEX idx_reimbursements_status ON reimbursements(status, organization_id);

-- =====================================================
-- LOANS
-- =====================================================

CREATE TABLE IF NOT EXISTS loans (
    loan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- Loan Details
    loan_type VARCHAR(50) NOT NULL,
    loan_amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) DEFAULT 0,
    
    -- Repayment
    repayment_period_months INTEGER NOT NULL,
    monthly_installment DECIMAL(15, 2) NOT NULL,
    start_date DATE NOT NULL,
    
    -- Balance
    total_repaid DECIMAL(15, 2) DEFAULT 0,
    outstanding_balance DECIMAL(15, 2),
    
    -- Status & Approval
    status VARCHAR(50) DEFAULT 'pending',
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Disbursement
    disbursement_date DATE,
    disbursement_reference VARCHAR(200),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_loans_org ON loans(organization_id);
CREATE INDEX idx_loans_emp ON loans(employee_id, status);
CREATE INDEX idx_loans_status ON loans(status, organization_id);

-- =====================================================
-- LOAN INSTALLMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS loan_installments (
    installment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    loan_id UUID NOT NULL REFERENCES loans(loan_id) ON DELETE CASCADE,
    
    -- Installment Details
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    installment_amount DECIMAL(15, 2) NOT NULL,
    
    -- Payment
    status VARCHAR(50) DEFAULT 'pending',
    paid_date DATE,
    paid_amount DECIMAL(15, 2),
    payment_reference VARCHAR(200),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loan_installments_org ON loan_installments(organization_id);
CREATE INDEX idx_loan_installments_loan ON loan_installments(loan_id, installment_number);
CREATE INDEX idx_loan_installments_status ON loan_installments(status, due_date);

-- =====================================================
-- TAX DECLARATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS tax_declarations (
    declaration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- Tax Period
    tax_year INTEGER NOT NULL,
    
    -- Declaration Details
    exemption_regime VARCHAR(50),
    declaration_data JSONB,
    
    -- Amounts
    total_taxable_income DECIMAL(15, 2),
    total_exemptions DECIMAL(15, 2),
    total_deductions DECIMAL(15, 2),
    tax_amount DECIMAL(15, 2),
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',
    submitted_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    CONSTRAINT unique_tax_declaration UNIQUE (organization_id, employee_id, tax_year)
);

CREATE INDEX idx_tax_declarations_org ON tax_declarations(organization_id);
CREATE INDEX idx_tax_declarations_emp ON tax_declarations(employee_id, tax_year);
CREATE INDEX idx_tax_declarations_year ON tax_declarations(tax_year, organization_id);

-- =====================================================
-- ROW-LEVEL SECURITY (RLS) - PLACEHOLDERS
-- =====================================================

/*
COMMENT ON TABLE compensation_components IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE employee_compensation IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE payroll_runs IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE payroll_items IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE gratuity_policies IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE end_of_service_calculations IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE reimbursements IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE loans IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE tax_declarations IS 'Row-Level Security: Enable with organization_id filter';
*/

INSERT INTO schema_migrations (migration_name) VALUES ('0004_payroll_core');
