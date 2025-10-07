-- =====================================================
-- HR SYSTEM - PART 2: ATTENDANCE & LEAVE MANAGEMENT
-- =====================================================

-- =====================================================
-- SECTION 7: ATTENDANCE MANAGEMENT
-- =====================================================

-- Work Shifts
CREATE TABLE work_shifts (
    shift_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    
    shift_name VARCHAR(100) NOT NULL,
    shift_code VARCHAR(50) NOT NULL,
    
    shift_type VARCHAR(50) DEFAULT 'regular', -- regular, night, rotational, flexible
    
    -- Timing
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Break Configuration
    total_break_minutes INTEGER DEFAULT 60,
    break_paid BOOLEAN DEFAULT TRUE,
    
    -- Grace Period
    grace_period_minutes INTEGER DEFAULT 15,
    late_grace_minutes INTEGER DEFAULT 10,
    early_departure_grace_minutes INTEGER DEFAULT 10,
    
    -- Core Hours (Mandatory presence time)
    has_core_hours BOOLEAN DEFAULT FALSE,
    core_hours_start TIME,
    core_hours_end TIME,
    
    -- Working Hours
    working_hours DECIMAL(5,2) GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
    ) STORED,
    
    net_working_hours DECIMAL(5,2) GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 - (total_break_minutes / 60.0)
    ) STORED,
    
    -- Overtime
    overtime_allowed BOOLEAN DEFAULT FALSE,
    max_overtime_hours DECIMAL(5,2),
    
    -- Flexibility
    is_flexible BOOLEAN DEFAULT FALSE,
    flexible_hours_range INTEGER, -- +/- hours allowed
    
    -- Days
    working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- Monday-Friday (1=Monday, 7=Sunday)
    
    -- Week Configuration
    week_off_days INTEGER[] DEFAULT ARRAY[6,7], -- Saturday, Sunday
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    UNIQUE(organization_id, shift_code)
);

CREATE INDEX idx_work_shifts_org ON work_shifts(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_work_shifts_company ON work_shifts(company_id) WHERE is_deleted = FALSE;

-- Shift Assignments (Employee-Shift Mapping)
CREATE TABLE shift_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES work_shifts(shift_id) ON DELETE CASCADE,
    
    effective_from DATE NOT NULL,
    effective_to DATE,
    
    is_permanent BOOLEAN DEFAULT TRUE,
    
    notes TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

CREATE INDEX idx_shift_assignments_emp ON shift_assignments(employee_id) WHERE is_active = TRUE;
CREATE INDEX idx_shift_assignments_dates ON shift_assignments(effective_from, effective_to) WHERE is_active = TRUE;

-- Shift Rotations (For rotational shifts)
CREATE TABLE shift_rotations (
    rotation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    rotation_name VARCHAR(100) NOT NULL,
    
    rotation_pattern JSONB NOT NULL, 
    -- Example: [{"shift_id": "uuid", "days": 7}, {"shift_id": "uuid2", "days": 7}]
    
    rotation_cycle_days INTEGER NOT NULL, -- Total days in rotation cycle
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Policies
CREATE TABLE attendance_policies (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    
    policy_name VARCHAR(100) NOT NULL,
    policy_code VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Late Coming Rules
    max_late_arrivals_per_month INTEGER DEFAULT 3,
    late_deduction_type VARCHAR(20), -- none, half_day, full_day, hours, fixed_amount
    late_deduction_after_minutes INTEGER DEFAULT 30,
    
    -- Early Departure Rules
    max_early_departures_per_month INTEGER DEFAULT 3,
    early_departure_deduction_type VARCHAR(20),
    early_departure_before_minutes INTEGER DEFAULT 30,
    
    -- Half Day/Full Day Thresholds
    half_day_threshold_hours DECIMAL(4,2) DEFAULT 4.00,
    full_day_threshold_hours DECIMAL(4,2) DEFAULT 8.00,
    
    -- Overtime
    overtime_calculation_method VARCHAR(50), -- none, actual, fixed_rate
    overtime_multiplier DECIMAL(3,2) DEFAULT 1.5,
    min_overtime_hours DECIMAL(4,2) DEFAULT 1.0,
    
    -- Weekend & Holiday Work
    weekend_work_allowed BOOLEAN DEFAULT FALSE,
    weekend_work_multiplier DECIMAL(3,2) DEFAULT 2.0,
    holiday_work_multiplier DECIMAL(3,2) DEFAULT 2.5,
    
    -- Tracking Requirements
    requires_geo_tracking BOOLEAN DEFAULT FALSE,
    geo_fence_radius_meters INTEGER DEFAULT 100,
    
    requires_ip_tracking BOOLEAN DEFAULT FALSE,
    allowed_ip_addresses TEXT[],
    
    requires_biometric BOOLEAN DEFAULT FALSE,
    requires_photo BOOLEAN DEFAULT FALSE,
    
    -- Check-in/out Requirements
    requires_checkout BOOLEAN DEFAULT TRUE,
    auto_checkout_enabled BOOLEAN DEFAULT FALSE,
    auto_checkout_after_hours INTEGER DEFAULT 12,
    
    -- Regularization
    allows_regularization BOOLEAN DEFAULT TRUE,
    max_regularization_days INTEGER DEFAULT 7, -- Days after which regularization not allowed
    requires_manager_approval BOOLEAN DEFAULT TRUE,
    
    -- Absence Rules
    consecutive_absences_alert INTEGER DEFAULT 3,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    UNIQUE(organization_id, policy_code)
);

CREATE INDEX idx_attendance_policies_org ON attendance_policies(organization_id) WHERE is_active = TRUE;

-- Attendance Records
CREATE TABLE attendance (
    attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    
    shift_id UUID REFERENCES work_shifts(shift_id),
    
    -- Check In
    check_in_time TIMESTAMP,
    check_in_location VARCHAR(255),
    check_in_latitude DECIMAL(10,8),
    check_in_longitude DECIMAL(11,8),
    check_in_ip_address VARCHAR(45),
    check_in_device VARCHAR(100),
    check_in_photo_url VARCHAR(500),
    check_in_method VARCHAR(50), -- web, mobile, biometric, manual
    
    -- Check Out
    check_out_time TIMESTAMP,
    check_out_location VARCHAR(255),
    check_out_latitude DECIMAL(10,8),
    check_out_longitude DECIMAL(11,8),
    check_out_ip_address VARCHAR(45),
    check_out_device VARCHAR(100),
    check_out_photo_url VARCHAR(500),
    check_out_method VARCHAR(50),
    
    -- Break Time
    total_break_minutes INTEGER DEFAULT 0,
    break_records JSONB, -- Array of break start/end times
    
    -- Calculated Hours
    total_hours DECIMAL(5,2),
    break_hours DECIMAL(5,2),
    net_hours DECIMAL(5,2),
    productive_hours DECIMAL(5,2),
    
    -- Overtime
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    overtime_approved BOOLEAN DEFAULT FALSE,
    overtime_approved_by UUID REFERENCES employees(employee_id),
    
    -- Status
    attendance_status VARCHAR(20) NOT NULL DEFAULT 'present',
    -- present, absent, half_day, on_leave, weekly_off, holiday, work_from_home
    
    work_type VARCHAR(20) DEFAULT 'office', -- office, remote, client_site, field_work
    
    -- Flags
    is_late BOOLEAN DEFAULT FALSE,
    late_by_minutes INTEGER DEFAULT 0,
    
    is_early_departure BOOLEAN DEFAULT FALSE,
    early_departure_minutes INTEGER DEFAULT 0,
    
    is_weekend_work BOOLEAN DEFAULT FALSE,
    is_holiday_work BOOLEAN DEFAULT FALSE,
    
    is_manually_added BOOLEAN DEFAULT FALSE,
    manual_entry_reason TEXT,
    
    -- Regularization
    is_regularized BOOLEAN DEFAULT FALSE,
    regularization_request_id UUID, -- References attendance_regularizations
    regularization_reason TEXT,
    regularized_by UUID REFERENCES employees(employee_id),
    regularized_at TIMESTAMP,
    
    -- Approval
    requires_approval BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    approval_notes TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    UNIQUE(employee_id, attendance_date)
);

CREATE INDEX idx_attendance_emp ON attendance(employee_id, attendance_date DESC);
CREATE INDEX idx_attendance_date ON attendance(attendance_date) WHERE is_approved = TRUE;
CREATE INDEX idx_attendance_status ON attendance(attendance_status, attendance_date);
CREATE INDEX idx_attendance_company ON attendance(company_id, attendance_date);

-- Attendance Regularization Requests
CREATE TABLE attendance_regularizations (
    regularization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    attendance_id UUID REFERENCES attendance(attendance_id) ON DELETE CASCADE,
    
    attendance_date DATE NOT NULL,
    
    regularization_type VARCHAR(50), -- missed_checkin, missed_checkout, wrong_time, other
    
    requested_check_in TIMESTAMP,
    requested_check_out TIMESTAMP,
    
    reason TEXT NOT NULL,
    supporting_document_url VARCHAR(500),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    
    -- Approval
    approver_id UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    approval_comments TEXT,
    rejection_reason TEXT,
    
    -- Metadata
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attendance_reg_emp ON attendance_regularizations(employee_id);
CREATE INDEX idx_attendance_reg_status ON attendance_regularizations(status);

-- Attendance Summary (Monthly aggregates for performance)
CREATE TABLE attendance_summary (
    summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    
    total_working_days INTEGER DEFAULT 0,
    present_days INTEGER DEFAULT 0,
    absent_days INTEGER DEFAULT 0,
    half_days INTEGER DEFAULT 0,
    leave_days DECIMAL(5,2) DEFAULT 0,
    weekend_days INTEGER DEFAULT 0,
    holiday_days INTEGER DEFAULT 0,
    
    late_arrivals INTEGER DEFAULT 0,
    early_departures INTEGER DEFAULT 0,
    
    total_hours DECIMAL(8,2) DEFAULT 0,
    overtime_hours DECIMAL(8,2) DEFAULT 0,
    
    regularizations_count INTEGER DEFAULT 0,
    
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(employee_id, year, month)
);

CREATE INDEX idx_attendance_summary_emp ON attendance_summary(employee_id, year, month);

-- =====================================================
-- SECTION 8: LEAVE MANAGEMENT
-- =====================================================

-- Leave Types
CREATE TABLE leave_types (
    leave_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    
    leave_type_name VARCHAR(100) NOT NULL,
    leave_code VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Leave Category
    leave_category VARCHAR(50), -- earned, sick, casual, maternity, paternity, bereavement, etc.
    
    -- Payment
    is_paid BOOLEAN DEFAULT TRUE,
    
    -- Allocation
    allocation_frequency VARCHAR(20) DEFAULT 'annual', -- annual, monthly, quarterly, one_time
    default_days_per_year DECIMAL(5,2) DEFAULT 0,
    
    -- Accrual
    accrual_enabled BOOLEAN DEFAULT FALSE,
    accrual_start_date VARCHAR(20), -- joining_date, fiscal_year, calendar_year
    accrual_rate DECIMAL(5,2), -- Days per month
    accrual_frequency VARCHAR(20), -- monthly, quarterly
    minimum_employment_days INTEGER DEFAULT 0, -- Min days before accrual starts
    
    -- Limits
    min_days_per_request DECIMAL(4,2) DEFAULT 0.5,
    max_days_per_request DECIMAL(5,2),
    max_consecutive_days DECIMAL(5,2),
    
    -- Carry Forward
    can_carry_forward BOOLEAN DEFAULT FALSE,
    max_carry_forward_days DECIMAL(5,2),
    carry_forward_expiry_months INTEGER, -- Months after which carried forward leaves expire
    
    -- Negative Balance
    allows_negative_balance BOOLEAN DEFAULT FALSE,
    max_negative_balance DECIMAL(5,2) DEFAULT 0,
    
    -- Encashment
    can_be_encashed BOOLEAN DEFAULT FALSE,
    encashment_rules JSONB,
    
    -- Requirements
    requires_document BOOLEAN DEFAULT FALSE,
    document_required_after_days DECIMAL(4,2),
    
    notice_period_days INTEGER DEFAULT 0,
    
    -- Restrictions
    can_apply_on_probation BOOLEAN DEFAULT TRUE,
    gender_specific VARCHAR(20), -- all, male, female
    marital_status_specific VARCHAR(20), -- all, married, unmarried
    
    -- Weekends & Holidays
    includes_weekends BOOLEAN DEFAULT TRUE,
    includes_holidays BOOLEAN DEFAULT TRUE,
    
    sandwich_leave_policy VARCHAR(20), -- allowed, restricted, auto_include
    
    -- Half Day
    allows_half_day BOOLEAN DEFAULT TRUE,
    half_day_counts_as DECIMAL(3,2) DEFAULT 0.5,
    
    -- Approval
    requires_approval BOOLEAN DEFAULT TRUE,
    approval_levels INTEGER DEFAULT 1,
    auto_approve_if_balance BOOLEAN DEFAULT FALSE,
    
    -- Calendar Display
    color_code VARCHAR(7) DEFAULT '#2196F3',
    icon VARCHAR(50),
    
    -- Priority (for leave calendar)
    display_order INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    UNIQUE(organization_id, leave_code)
);

CREATE INDEX idx_leave_types_org ON leave_types(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_leave_types_company ON leave_types(company_id) WHERE is_deleted = FALSE;

-- Leave Policies
CREATE TABLE leave_policies (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    
    policy_name VARCHAR(100) NOT NULL,
    policy_code VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Applicability
    applicable_to VARCHAR(50) DEFAULT 'all', 
    -- all, department, designation, location, employment_type, employee_group
    
    department_ids UUID[],
    designation_ids UUID[],
    location_ids UUID[],
    employment_types VARCHAR(50)[],
    
    -- Effective Period
    effective_from DATE NOT NULL,
    effective_to DATE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    UNIQUE(organization_id, policy_code)
);

CREATE INDEX idx_leave_policies_org ON leave_policies(organization_id) WHERE is_active = TRUE;

-- Leave Policy Rules (Mapping of leave types to policies)
CREATE TABLE leave_policy_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    policy_id UUID NOT NULL REFERENCES leave_policies(policy_id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(leave_type_id) ON DELETE CASCADE,
    
    annual_allocation DECIMAL(5,2) NOT NULL,
    
    -- Override settings (NULL means use leave type defaults)
    can_carry_forward BOOLEAN,
    max_carry_forward_days DECIMAL(5,2),
    
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(policy_id, leave_type_id)
);

-- Employee Leave Policies (Assignment)
CREATE TABLE employee_leave_policies (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES leave_policies(policy_id) ON DELETE CASCADE,
    
    effective_from DATE NOT NULL,
    effective_to DATE,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    assigned_by UUID,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(employee_id, policy_id, effective_from)
);

CREATE INDEX idx_emp_leave_policies_emp ON employee_leave_policies(employee_id) WHERE is_active = TRUE;

-- Leave Balances
CREATE TABLE leave_balances (
    balance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(leave_type_id) ON DELETE CASCADE,
    
    year INTEGER NOT NULL,
    
    -- Allocations
    opening_balance DECIMAL(6,2) DEFAULT 0,
    allocated_days DECIMAL(6,2) NOT NULL DEFAULT 0,
    accrued_days DECIMAL(6,2) DEFAULT 0,
    carried_forward_days DECIMAL(6,2) DEFAULT 0,
    credited_days DECIMAL(6,2) DEFAULT 0, -- Manual credits
    
    -- Deductions
    used_days DECIMAL(6,2) DEFAULT 0,
    pending_approval_days DECIMAL(6,2) DEFAULT 0,
    encashed_days DECIMAL(6,2) DEFAULT 0,
    lapsed_days DECIMAL(6,2) DEFAULT 0,
    
    -- Calculated Balance
    available_days DECIMAL(6,2) GENERATED ALWAYS AS (
        opening_balance + allocated_days + accrued_days + carried_forward_days + credited_days - 
        used_days - pending_approval_days - encashed_days - lapsed_days
    ) STORED,
    
    -- Metadata
    last_accrual_date DATE,
    next_accrual_date DATE,
    
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(employee_id, leave_type_id, year)
);

CREATE INDEX idx_leave_balances_emp ON leave_balances(employee_id, year);
CREATE INDEX idx_leave_balances_type ON leave_balances(leave_type_id, year);

-- Leave Requests
CREATE TABLE leave_requests (
    leave_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    
    request_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: LR-2024-0001
    
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(leave_type_id) ON DELETE CASCADE,
    
    -- Leave Dates
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    
    -- Half Day
    is_half_day BOOLEAN DEFAULT FALSE,
    half_day_session VARCHAR(20), -- first_half, second_half
    
    -- Days Calculation
    total_days DECIMAL(5,2) NOT NULL,
    working_days DECIMAL(5,2) NOT NULL,
    weekend_days DECIMAL(5,2) DEFAULT 0,
    holiday_days DECIMAL(5,2) DEFAULT 0,
    
    -- Reason & Documentation
    reason TEXT NOT NULL,
    contact_details VARCHAR(255),
    contact_address TEXT,
    
    supporting_document_url VARCHAR(500),
    
    -- Delegate
    delegate_to_employee_id UUID REFERENCES employees(employee_id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, approved, rejected, cancelled, withdrawn
    
    -- Workflow
    current_approval_level INTEGER DEFAULT 1,
    total_approval_levels INTEGER DEFAULT 1,
    
    -- Dates
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_date TIMESTAMP,
    rejected_date TIMESTAMP,
    cancelled_date TIMESTAMP,
    
    -- Approver Actions
    final_approver_id UUID REFERENCES employees(employee_id),
    final_approval_notes TEXT,
    rejection_reason TEXT,
    
    -- Cancellation
    cancelled_by UUID REFERENCES employees(employee_id),
    cancellation_reason TEXT,
    cancellation_type VARCHAR(20), -- employee, system, manager
    
    -- LOP (Loss of Pay)
    is_lop BOOLEAN DEFAULT FALSE,
    lop_days DECIMAL(5,2) DEFAULT 0,
    
    -- System Fields
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_leave_requests_emp ON leave_requests(employee_id, from_date DESC);
CREATE INDEX idx_leave_requests_status ON leave_requests(status, from_date);
CREATE INDEX idx_leave_requests_dates ON leave_requests(from_date, to_date);
CREATE INDEX idx_leave_requests_number ON leave_requests(request_number);

-- Leave Approval Workflow
CREATE TABLE leave_approval_workflow (
    workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    leave_request_id UUID NOT NULL REFERENCES leave_requests(leave_request_id) ON DELETE CASCADE,
    
    approval_level INTEGER NOT NULL,
    approver_id UUID NOT NULL REFERENCES employees(employee_id),
    approver_type VARCHAR(50), -- reporting_manager, hr, department_head, custom
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, skipped
    
    comments TEXT,
    
    action_date TIMESTAMP,
    
    is_final_approver BOOLEAN DEFAULT FALSE,
    
    notified_at TIMESTAMP,
    reminder_sent_at TIMESTAMP,
    
    UNIQUE(leave_request_id, approval_level)
);

CREATE INDEX idx_leave_workflow_request ON leave_approval_workflow(leave_request_id);
CREATE INDEX idx_leave_workflow_approver ON leave_approval_workflow(approver_id, status);

-- Holidays Calendar
CREATE TABLE holidays (
    holiday_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    
    holiday_name VARCHAR(100) NOT NULL,
    holiday_date DATE NOT NULL,
    
    holiday_type VARCHAR(50) DEFAULT 'public', 
    -- public, optional, regional, restricted
    
    description TEXT,
    
    -- Applicability
    location_ids UUID[], -- NULL means all locations
    department_ids UUID[], -- NULL means all departments
    
    is_mandatory BOOLEAN DEFAULT TRUE,
    is_restricted BOOLEAN DEFAULT FALSE, -- Restricted holidays (employee choice)
    
    -- Restricted Holiday Settings
    max_restricted_holidays_per_year INTEGER DEFAULT 2,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_recurring BOOLEAN DEFAULT FALSE, -- For annual recurring holidays
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_holidays_org ON holidays(organization_id, holiday_date);
CREATE INDEX idx_holidays_company ON holidays(company_id, holiday_date);
CREATE INDEX idx_holidays_date ON holidays(holiday_date) WHERE is_active = TRUE;

-- Compensatory Off (Comp-off)
CREATE TABLE compensatory_off (
    comp_off_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- Work Date (when extra work was done)
    work_date DATE NOT NULL,
    hours_worked DECIMAL(5,2) NOT NULL,
    
    reason TEXT NOT NULL, -- Weekend work, Holiday work, etc.
    
    -- Related Attendance
    attendance_id UUID REFERENCES attendance(attendance_id),
    
    -- Comp-off Credit
    comp_off_days DECIMAL(4,2) NOT NULL, -- Usually 1 day
    
    -- Validity
    granted_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    
    -- Usage
    is_used BOOLEAN DEFAULT FALSE,
    used_date DATE,
    leave_request_id UUID REFERENCES leave_requests(leave_request_id),
    
    -- Approval
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, expired
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    
    -- Metadata
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

CREATE INDEX idx_comp_off_emp ON compensatory_off(employee_id);
CREATE INDEX idx_comp_off_expiry ON compensatory_off(expiry_date) WHERE is_used = FALSE;

-- Leave Balance Transactions (Audit trail for balance changes)
CREATE TABLE leave_balance_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    employee_id UUID NOT NULL REFERENCES employees(employee_id),
    leave_type_id UUID NOT NULL REFERENCES leave_types(leave_type_id),
    
    transaction_type VARCHAR(50) NOT NULL,
    -- allocation, accrual, deduction, carry_forward, encashment, 
    -- adjustment, lapse, credit, cancellation_credit
    
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    days DECIMAL(6,2) NOT NULL, -- Positive for credit, negative for debit
    
    balance_before DECIMAL(6,2),
    balance_after DECIMAL(6,2),
    
    -- Reference
    reference_type VARCHAR(50), -- leave_request, manual_adjustment, system
    reference_id UUID,
    
    description TEXT,
    
    -- Performed By
    performed_by UUID REFERENCES users(user_id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leave_transactions_emp ON leave_balance_transactions(employee_id, transaction_date DESC);
CREATE INDEX idx_leave_transactions_type ON leave_balance_transactions(transaction_type, transaction_date);

-- Leave Encashment Requests
CREATE TABLE leave_encashment_requests (
    encashment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(leave_type_id) ON DELETE CASCADE,
    
    request_number VARCHAR(50) UNIQUE NOT NULL,
    
    days_to_encash DECIMAL(5,2) NOT NULL,
    
    encashment_amount DECIMAL(12,2),
    calculation_details JSONB,
    
    reason TEXT,
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, processed
    
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    processed_date DATE,
    payment_date DATE,
    
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leave_encashment_emp ON leave_encashment_requests(employee_id);
CREATE INDEX idx_leave_encashment_status ON leave_encashment_requests(status);

-- Leave Calendar (Team Calendar View)
CREATE TABLE leave_calendar_settings (
    setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    show_team_leaves BOOLEAN DEFAULT TRUE,
    show_department_leaves BOOLEAN DEFAULT TRUE,
    show_company_leaves BOOLEAN DEFAULT FALSE,
    
    show_leave_type BOOLEAN DEFAULT TRUE,
    show_employee_name BOOLEAN DEFAULT TRUE,
    
    calendar_start_day INTEGER DEFAULT 1, -- 1=Monday, 0=Sunday
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SECTION 9: WORK FROM HOME (WFH) MANAGEMENT
-- =====================================================

-- WFH Policies
CREATE TABLE wfh_policies (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    
    policy_name VARCHAR(100) NOT NULL,
    
    -- Limits
    max_wfh_days_per_month INTEGER,
    max_wfh_days_per_week INTEGER,
    max_consecutive_wfh_days INTEGER,
    
    -- Restrictions
    requires_advance_notice_days INTEGER DEFAULT 1,
    can_apply_on_probation BOOLEAN DEFAULT FALSE,
    
    blocked_days INTEGER[], -- Days of week when WFH not allowed
    blocked_dates DATE[], -- Specific dates
    
    requires_approval BOOLEAN DEFAULT TRUE,
    auto_approve BOOLEAN DEFAULT FALSE,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WFH Requests
CREATE TABLE wfh_requests (
    wfh_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    request_number VARCHAR(50) UNIQUE NOT NULL,
    
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    total_days DECIMAL(4,2) NOT NULL,
    
    reason TEXT NOT NULL,
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, cancelled
    
    approver_id UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    approval_notes TEXT,
    rejection_reason TEXT,
    
    cancelled_by UUID REFERENCES employees(employee_id),
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wfh_requests_emp ON wfh_requests(employee_id, from_date DESC);
CREATE INDEX idx_wfh_requests_status ON wfh_requests(status);

-- =====================================================
-- SECTION 10: OVERTIME MANAGEMENT
-- =====================================================

-- Overtime Requests
CREATE TABLE overtime_requests (
    overtime_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    request_number VARCHAR(50) UNIQUE NOT NULL,
    
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    attendance_id UUID REFERENCES attendance(attendance_id),
    
    work_date DATE NOT NULL,
    
    overtime_hours DECIMAL(5,2) NOT NULL,
    
    start_time TIME,
    end_time TIME,
    
    reason TEXT NOT NULL,
    work_description TEXT,
    
    is_pre_approved BOOLEAN DEFAULT FALSE,
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    approval_notes TEXT,
    rejection_reason TEXT,
    
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_overtime_requests_emp ON overtime_requests(employee_id, work_date DESC);
CREATE INDEX idx_overtime_requests_status ON overtime_requests(status);

-- =====================================================
-- SECTION 11: REPORTS & ANALYTICS VIEWS
-- =====================================================

-- Attendance Report View
CREATE VIEW vw_attendance_report AS
SELECT 
    a.attendance_id,
    a.organization_id,
    a.company_id,
    c.company_name,
    a.employee_id,
    e.employee_code,
    e.full_name as employee_name,
    e.email,
    d.department_name,
    des.designation_name,
    l.location_name,
    a.attendance_date,
    a.check_in_time,
    a.check_out_time,
    a.total_hours,
    a.net_hours,
    a.overtime_hours,
    a.attendance_status,
    a.work_type,
    a.is_late,
    a.late_by_minutes,
    a.is_early_departure,
    a.early_departure_minutes,
    a.is_regularized,
    a.is_approved,
    s.shift_name,
    s.start_time as shift_start_time,
    s.end_time as shift_end_time
FROM attendance a
LEFT JOIN employees e ON a.employee_id = e.employee_id
LEFT JOIN companies c ON a.company_id = c.company_id
LEFT JOIN departments d ON e.department_id = d.department_id
LEFT JOIN designations des ON e.designation_id = des.designation_id
LEFT JOIN locations l ON e.location_id = l.location_id
LEFT JOIN work_shifts s ON a.shift_id = s.shift_id
WHERE e.is_deleted = FALSE;

-- Leave Report View
CREATE VIEW vw_leave_report AS
SELECT 
    lr.leave_request_id,
    lr.organization_id,
    lr.company_id,
    c.company_name,
    lr.request_number,
    lr.employee_id,
    e.employee_code,
    e.full_name as employee_name,
    e.email,
    d.department_name,
    des.designation_name,
    l.location_name,
    lr.leave_type_id,
    lt.leave_type_name,
    lt.leave_category,
    lr.from_date,
    lr.to_date,
    lr.total_days,
    lr.working_days,
    lr.is_half_day,
    lr.reason,
    lr.status,
    lr.applied_date,
    lr.approved_date,
    lr.rejected_date,
    approver.full_name as approver_name,
    lr.rejection_reason
FROM leave_requests lr
LEFT JOIN employees e ON lr.employee_id = e.employee_id
LEFT JOIN companies c ON lr.company_id = c.company_id
LEFT JOIN departments d ON e.department_id = d.department_id
LEFT JOIN designations des ON e.designation_id = des.designation_id
LEFT JOIN locations l ON e.location_id = l.location_id
LEFT JOIN leave_types lt ON lr.leave_type_id = lt.leave_type_id
LEFT JOIN employees approver ON lr.final_approver_id = approver.employee_id
WHERE lr.is_deleted = FALSE AND e.is_deleted = FALSE;

-- Leave Balance View
CREATE VIEW vw_leave_balance AS
SELECT 
    lb.balance_id,
    lb.organization_id,
    lb.employee_id,
    e.employee_code,
    e.full_name as employee_name,
    e.email,
    e.company_id,
    c.company_name,
    d.department_name,
    des.designation_name,
    lb.leave_type_id,
    lt.leave_type_name,
    lt.leave_category,
    lb.year,
    lb.allocated_days,
    lb.accrued_days,
    lb.carried_forward_days,
    lb.credited_days,
    lb.used_days,
    lb.pending_approval_days,
    lb.encashed_days,
    lb.lapsed_days,
    lb.available_days,
    lb.last_updated
FROM leave_balances lb
LEFT JOIN employees e ON lb.employee_id = e.employee_id
LEFT JOIN companies c ON e.company_id = c.company_id
LEFT JOIN departments d ON e.department_id = d.department_id
LEFT JOIN designations des ON e.designation_id = des.designation_id
LEFT JOIN leave_types lt ON lb.leave_type_id = lt.leave_type_id
WHERE e.is_deleted = FALSE;

-- Employee Attendance Statistics View
CREATE VIEW vw_employee_attendance_stats AS
SELECT 
    e.employee_id,
    e.organization_id,
    e.company_id,
    e.employee_code,
    e.full_name as employee_name,
    DATE_TRUNC('month', a.attendance_date) as month,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE a.attendance_status = 'present') as present_days,
    COUNT(*) FILTER (WHERE a.attendance_status = 'absent') as absent_days,
    COUNT(*) FILTER (WHERE a.attendance_status = 'half_day') as half_days,
    COUNT(*) FILTER (WHERE a.attendance_status = 'on_leave') as leave_days,
    COUNT(*) FILTER (WHERE a.is_late = TRUE) as late_arrivals,
    COUNT(*) FILTER (WHERE a.is_early_departure = TRUE) as early_departures,
    SUM(a.total_hours) as total_hours_worked,
    SUM(a.overtime_hours) as total_overtime_hours,
    AVG(a.net_hours) FILTER (WHERE a.attendance_status = 'present') as avg_daily_hours
FROM employees e
LEFT JOIN attendance a ON e.employee_id = a.employee_id
WHERE e.is_deleted = FALSE
GROUP BY e.employee_id, e.organization_id, e.company_id, e.employee_code, e.full_name, DATE_TRUNC('month', a.attendance_date);

-- =====================================================
-- TRIGGERS FOR AUTOMATED CALCULATIONS
-- =====================================================

-- Function to calculate working days between dates
CREATE OR REPLACE FUNCTION calculate_working_days(
    p_from_date DATE,
    p_to_date DATE,
    p_organization_id UUID,
    p_company_id UUID,
    p_location_ids UUID[]
) RETURNS JSONB AS $
DECLARE
    v_working_days DECIMAL(5,2) := 0;
    v_weekend_days DECIMAL(5,2) := 0;
    v_holiday_days DECIMAL(5,2) := 0;
    v_current_date DATE;
    v_day_of_week INTEGER;
    v_is_holiday BOOLEAN;
BEGIN
    v_current_date := p_from_date;
    
    WHILE v_current_date <= p_to_date LOOP
        v_day_of_week := EXTRACT(ISODOW FROM v_current_date);
        
        -- Check if weekend (Saturday=6, Sunday=7)
        IF v_day_of_week IN (6, 7) THEN
            v_weekend_days := v_weekend_days + 1;
        ELSE
            -- Check if holiday
            SELECT EXISTS(
                SELECT 1 FROM holidays h
                WHERE h.holiday_date = v_current_date
                AND h.organization_id = p_organization_id
                AND (h.company_id = p_company_id OR h.company_id IS NULL)
                AND h.is_active = TRUE
                AND (h.location_ids IS NULL OR h.location_ids && p_location_ids)
            ) INTO v_is_holiday;
            
            IF v_is_holiday THEN
                v_holiday_days := v_holiday_days + 1;
            ELSE
                v_working_days := v_working_days + 1;
            END IF;
        END IF;
        
        v_current_date := v_current_date + 1;
    END LOOP;
    
    RETURN jsonb_build_object(
        'working_days', v_working_days,
        'weekend_days', v_weekend_days,
        'holiday_days', v_holiday_days,
        'total_days', v_working_days + v_weekend_days + v_holiday_days
    );
END;
$ LANGUAGE plpgsql;

-- Trigger to auto-calculate leave request days
CREATE OR REPLACE FUNCTION trg_calculate_leave_days()
RETURNS TRIGGER AS $
DECLARE
    v_days_info JSONB;
    v_location_ids UUID[];
BEGIN
    -- Get employee's location
    SELECT ARRAY[location_id] INTO v_location_ids
    FROM employees 
    WHERE employee_id = NEW.employee_id;
    
    -- Calculate days
    v_days_info := calculate_working_days(
        NEW.from_date,
        NEW.to_date,
        NEW.organization_id,
        NEW.company_id,
        v_location_ids
    );
    
    NEW.working_days := (v_days_info->>'working_days')::DECIMAL;
    NEW.weekend_days := (v_days_info->>'weekend_days')::DECIMAL;
    NEW.holiday_days := (v_days_info->>'holiday_days')::DECIMAL;
    NEW.total_days := (v_days_info->>'total_days')::DECIMAL;
    
    -- Adjust for half day
    IF NEW.is_half_day THEN
        NEW.total_days := 0.5;
        NEW.working_days := 0.5;
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leave_request_calculate_days
    BEFORE INSERT OR UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION trg_calculate_leave_days();

-- Trigger to update leave balance on approval
CREATE OR REPLACE FUNCTION trg_update_leave_balance_on_approval()
RETURNS TRIGGER AS $
BEGIN
    -- Only update if status changed to approved
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- Deduct from available balance
        UPDATE leave_balances
        SET 
            used_days = used_days + NEW.working_days,
            pending_approval_days = GREATEST(pending_approval_days - NEW.working_days, 0),
            last_updated = CURRENT_TIMESTAMP
        WHERE employee_id = NEW.employee_id
        AND leave_type_id = NEW.leave_type_id
        AND year = EXTRACT(YEAR FROM NEW.from_date);
        
        -- Create transaction record
        INSERT INTO leave_balance_transactions (
            organization_id,
            employee_id,
            leave_type_id,
            transaction_type,
            transaction_date,
            days,
            reference_type,
            reference_id,
            description,
            performed_by
        ) VALUES (
            NEW.organization_id,
            NEW.employee_id,
            NEW.leave_type_id,
            'deduction',
            NEW.approved_date::DATE,
            -NEW.working_days,
            'leave_request',
            NEW.leave_request_id,
            'Leave approved: ' || NEW.request_number,
            NEW.final_approver_id
        );
    END IF;
    
    -- Handle cancellation - credit back
    IF NEW.status = 'cancelled' AND OLD.status = 'approved' THEN
        UPDATE leave_balances
        SET 
            used_days = GREATEST(used_days - NEW.working_days, 0),
            last_updated = CURRENT_TIMESTAMP
        WHERE employee_id = NEW.employee_id
        AND leave_type_id = NEW.leave_type_id
        AND year = EXTRACT(YEAR FROM NEW.from_date);
        
        -- Create transaction record
        INSERT INTO leave_balance_transactions (
            organization_id,
            employee_id,
            leave_type_id,
            transaction_type,
            transaction_date,
            days,
            reference_type,
            reference_id,
            description,
            performed_by
        ) VALUES (
            NEW.organization_id,
            NEW.employee_id,
            NEW.leave_type_id,
            'cancellation_credit',
            CURRENT_DATE,
            NEW.working_days,
            'leave_request',
            NEW.leave_request_id,
            'Leave cancelled: ' || NEW.request_number,
            NEW.cancelled_by
        );
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leave_balance_update
    AFTER UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION trg_update_leave_balance_on_approval();

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to get employee's pending approvals
CREATE OR REPLACE FUNCTION get_pending_approvals(p_approver_id UUID)
RETURNS TABLE (
    approval_type VARCHAR,
    entity_id UUID,
    entity_number VARCHAR,
    employee_name VARCHAR,
    request_date TIMESTAMP,
    days_pending INTEGER
) AS $
BEGIN
    RETURN QUERY
    -- Leave approvals
    SELECT 
        'leave'::VARCHAR as approval_type,
        lr.leave_request_id as entity_id,
        lr.request_number as entity_number,
        e.full_name as employee_name,
        lr.applied_date as request_date,
        EXTRACT(DAY FROM CURRENT_TIMESTAMP - lr.applied_date)::INTEGER as days_pending
    FROM leave_requests lr
    JOIN employees e ON lr.employee_id = e.employee_id
    JOIN leave_approval_workflow law ON lr.leave_request_id = law.leave_request_id
    WHERE law.approver_id = p_approver_id
    AND law.status = 'pending'
    AND lr.status = 'pending'
    
    UNION ALL
    
    -- Attendance regularizations
    SELECT 
        'attendance_regularization'::VARCHAR,
        ar.regularization_id,
        'ATT-REG-' || ar.regularization_id::TEXT,
        e.full_name,
        ar.requested_at,
        EXTRACT(DAY FROM CURRENT_TIMESTAMP - ar.requested_at)::INTEGER
    FROM attendance_regularizations ar
    JOIN employees e ON ar.employee_id = e.employee_id
    WHERE ar.approver_id = p_approver_id
    AND ar.status = 'pending'
    
    ORDER BY request_date ASC;
END;
$ LANGUAGE plpgsql;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional composite indexes for common queries
CREATE INDEX idx_attendance_emp_date_status ON attendance(employee_id, attendance_date, attendance_status);
CREATE INDEX idx_leave_requests_emp_status_dates ON leave_requests(employee_id, status, from_date, to_date);
CREATE INDEX idx_leave_balances_emp_year_type ON leave_balances(employee_id, year, leave_type_id);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE work_shifts IS 'Define work shifts with flexible timing and grace periods';
COMMENT ON TABLE attendance IS 'Core attendance tracking with geo-location and device info';
COMMENT ON TABLE leave_types IS 'Configurable leave types with accrual and carry-forward rules';
COMMENT ON TABLE leave_requests IS 'Leave applications with multi-level approval workflow';
COMMENT ON TABLE leave_balances IS 'Real-time leave balance tracking per employee per year';
COMMENT ON TABLE holidays IS 'Organization-wide holiday calendar with location-specific settings';

-- =====================================================
-- END OF ATTENDANCE & LEAVE MANAGEMENT SCHEMA
-- =====================================================