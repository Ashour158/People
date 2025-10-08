-- =====================================================
-- Migration 0003: Leave & Attendance
-- Leave management, Attendance tracking, Shifts
-- =====================================================

-- =====================================================
-- LEAVE TYPES
-- =====================================================

CREATE TABLE IF NOT EXISTS leave_types (
    leave_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    leave_type_name VARCHAR(100) NOT NULL,
    leave_type_code VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Leave Rules
    max_days_per_year DECIMAL(5, 2),
    carry_forward_allowed BOOLEAN DEFAULT FALSE,
    max_carry_forward_days DECIMAL(5, 2),
    
    -- Approval Settings
    requires_approval BOOLEAN DEFAULT TRUE,
    approval_levels INTEGER DEFAULT 1,
    
    -- Accrual Settings
    is_accrual_based BOOLEAN DEFAULT FALSE,
    accrual_rate DECIMAL(5, 2),
    accrual_frequency VARCHAR(20),
    
    -- Gender Specific
    applicable_for_gender VARCHAR(20),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT unique_leave_type_code_per_org UNIQUE (organization_id, leave_type_code)
);

CREATE INDEX idx_leave_types_org ON leave_types(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_leave_types_active ON leave_types(is_active, organization_id) WHERE is_deleted = FALSE;

-- =====================================================
-- LEAVE BALANCES
-- =====================================================

CREATE TABLE IF NOT EXISTS leave_balances (
    leave_balance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(leave_type_id) ON DELETE CASCADE,
    
    year INTEGER NOT NULL,
    
    -- Balance Tracking
    allocated_days DECIMAL(5, 2) DEFAULT 0,
    used_days DECIMAL(5, 2) DEFAULT 0,
    pending_days DECIMAL(5, 2) DEFAULT 0,
    available_days DECIMAL(5, 2) DEFAULT 0,
    carried_forward_days DECIMAL(5, 2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_leave_balance UNIQUE (organization_id, employee_id, leave_type_id, year)
);

CREATE INDEX idx_leave_balances_org ON leave_balances(organization_id);
CREATE INDEX idx_leave_balances_emp ON leave_balances(employee_id, year);
CREATE INDEX idx_leave_balances_year ON leave_balances(year, organization_id);

-- =====================================================
-- LEAVE BALANCE LEDGER
-- =====================================================

CREATE TABLE IF NOT EXISTS leave_balance_ledger (
    ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    leave_balance_id UUID NOT NULL REFERENCES leave_balances(leave_balance_id) ON DELETE CASCADE,
    
    transaction_type VARCHAR(50) NOT NULL,
    transaction_date DATE NOT NULL,
    days DECIMAL(5, 2) NOT NULL,
    
    -- Reference
    reference_type VARCHAR(50),
    reference_id UUID,
    
    -- Balance After Transaction
    balance_after DECIMAL(5, 2),
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

CREATE INDEX idx_leave_ledger_org ON leave_balance_ledger(organization_id);
CREATE INDEX idx_leave_ledger_balance ON leave_balance_ledger(leave_balance_id, transaction_date DESC);

-- =====================================================
-- LEAVE REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS leave_requests (
    leave_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(leave_type_id) ON DELETE CASCADE,
    
    -- Request Details
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(5, 2) NOT NULL,
    
    -- Reason & Notes
    reason TEXT NOT NULL,
    emergency_contact VARCHAR(200),
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    
    -- Approval
    current_approver_id UUID REFERENCES employees(employee_id),
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    rejected_by UUID REFERENCES employees(employee_id),
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_leave_requests_org ON leave_requests(organization_id);
CREATE INDEX idx_leave_requests_emp ON leave_requests(employee_id, status);
CREATE INDEX idx_leave_requests_status ON leave_requests(status, organization_id);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX idx_leave_requests_approver ON leave_requests(current_approver_id, status);

-- =====================================================
-- LEAVE APPROVAL WORKFLOW
-- =====================================================

CREATE TABLE IF NOT EXISTS leave_approval_workflow (
    workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_request_id UUID NOT NULL REFERENCES leave_requests(leave_request_id) ON DELETE CASCADE,
    
    approval_level INTEGER NOT NULL,
    approver_id UUID NOT NULL REFERENCES employees(employee_id),
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    action VARCHAR(50),
    comments TEXT,
    
    -- Timestamp
    acted_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leave_workflow_request ON leave_approval_workflow(leave_request_id, approval_level);
CREATE INDEX idx_leave_workflow_approver ON leave_approval_workflow(approver_id, status);

-- =====================================================
-- SHIFTS
-- =====================================================

CREATE TABLE IF NOT EXISTS shifts (
    shift_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    shift_name VARCHAR(100) NOT NULL,
    shift_code VARCHAR(50) NOT NULL,
    
    -- Shift Timing
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Break Configuration
    break_duration_minutes INTEGER DEFAULT 0,
    
    -- Grace Periods
    late_arrival_grace_minutes INTEGER DEFAULT 0,
    early_exit_grace_minutes INTEGER DEFAULT 0,
    
    -- Working Hours
    working_hours_per_day DECIMAL(4, 2),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT unique_shift_code_per_org UNIQUE (organization_id, shift_code)
);

CREATE INDEX idx_shifts_org ON shifts(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_shifts_active ON shifts(is_active, organization_id) WHERE is_deleted = FALSE;

-- =====================================================
-- SHIFT ASSIGNMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS shift_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES shifts(shift_id) ON DELETE CASCADE,
    
    -- Assignment Period
    effective_from DATE NOT NULL,
    effective_to DATE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_shift_assignments_org ON shift_assignments(organization_id);
CREATE INDEX idx_shift_assignments_emp ON shift_assignments(employee_id, effective_from);
CREATE INDEX idx_shift_assignments_shift ON shift_assignments(shift_id);
CREATE INDEX idx_shift_assignments_active ON shift_assignments(is_active, employee_id);

-- =====================================================
-- ATTENDANCE
-- =====================================================

CREATE TABLE IF NOT EXISTS attendance (
    attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- Date & Shift
    attendance_date DATE NOT NULL,
    shift_id UUID REFERENCES shifts(shift_id),
    
    -- Check In/Out
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    
    -- Location
    check_in_location VARCHAR(500),
    check_out_location VARCHAR(500),
    check_in_latitude DECIMAL(10, 8),
    check_in_longitude DECIMAL(11, 8),
    check_out_latitude DECIMAL(10, 8),
    check_out_longitude DECIMAL(11, 8),
    
    -- Working Hours
    working_hours DECIMAL(5, 2),
    overtime_hours DECIMAL(5, 2),
    break_hours DECIMAL(5, 2),
    
    -- Status
    status VARCHAR(50) DEFAULT 'present',
    is_late BOOLEAN DEFAULT FALSE,
    is_early_exit BOOLEAN DEFAULT FALSE,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_attendance_per_day UNIQUE (organization_id, employee_id, attendance_date)
);

CREATE INDEX idx_attendance_org ON attendance(organization_id);
CREATE INDEX idx_attendance_emp ON attendance(employee_id, attendance_date DESC);
CREATE INDEX idx_attendance_date ON attendance(attendance_date, organization_id);
CREATE INDEX idx_attendance_status ON attendance(status, organization_id);

-- =====================================================
-- ATTENDANCE REGULARIZATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS attendance_regularizations (
    regularization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    attendance_id UUID NOT NULL REFERENCES attendance(attendance_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- Regularization Details
    regularization_type VARCHAR(50) NOT NULL,
    requested_check_in_time TIMESTAMP,
    requested_check_out_time TIMESTAMP,
    reason TEXT NOT NULL,
    
    -- Status & Approval
    status VARCHAR(50) DEFAULT 'pending',
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_attendance_reg_org ON attendance_regularizations(organization_id);
CREATE INDEX idx_attendance_reg_emp ON attendance_regularizations(employee_id, status);
CREATE INDEX idx_attendance_reg_attendance ON attendance_regularizations(attendance_id);
CREATE INDEX idx_attendance_reg_status ON attendance_regularizations(status, organization_id);

-- =====================================================
-- ATTENDANCE SUMMARY
-- =====================================================

CREATE TABLE IF NOT EXISTS attendance_summary (
    summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- Period
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    
    -- Summary Counts
    total_working_days INTEGER DEFAULT 0,
    present_days INTEGER DEFAULT 0,
    absent_days INTEGER DEFAULT 0,
    half_days INTEGER DEFAULT 0,
    late_days INTEGER DEFAULT 0,
    
    -- Hours Summary
    total_working_hours DECIMAL(8, 2) DEFAULT 0,
    total_overtime_hours DECIMAL(8, 2) DEFAULT 0,
    
    -- Leave Summary
    leave_days DECIMAL(5, 2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_attendance_summary UNIQUE (organization_id, employee_id, period_year, period_month)
);

CREATE INDEX idx_attendance_summary_org ON attendance_summary(organization_id);
CREATE INDEX idx_attendance_summary_emp ON attendance_summary(employee_id, period_year, period_month);
CREATE INDEX idx_attendance_summary_period ON attendance_summary(period_year, period_month, organization_id);

-- =====================================================
-- ROW-LEVEL SECURITY (RLS) - PLACEHOLDERS
-- =====================================================

/*
COMMENT ON TABLE leave_types IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE leave_balances IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE leave_balance_ledger IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE leave_requests IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE leave_approval_workflow IS 'Row-Level Security: Enable via join with leave_requests';
COMMENT ON TABLE shifts IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE shift_assignments IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE attendance IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE attendance_regularizations IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE attendance_summary IS 'Row-Level Security: Enable with organization_id filter';
*/

INSERT INTO schema_migrations (migration_name) VALUES ('0003_leave_attendance');
