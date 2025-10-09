-- =====================================================
-- Migration 0010: Reporting Warehouse Layer
-- Star schema with fact and dimension tables for analytics
-- =====================================================

-- =====================================================
-- DIMENSION TABLES
-- =====================================================

-- Dimension: Date
CREATE TABLE IF NOT EXISTS dim_date (
    date_key INTEGER PRIMARY KEY, -- Format: YYYYMMDD
    
    full_date DATE NOT NULL UNIQUE,
    
    -- Date Components
    year INTEGER NOT NULL,
    quarter INTEGER NOT NULL, -- 1-4
    month INTEGER NOT NULL, -- 1-12
    month_name VARCHAR(20) NOT NULL,
    month_abbr VARCHAR(3) NOT NULL,
    week_of_year INTEGER NOT NULL, -- 1-53
    day_of_month INTEGER NOT NULL, -- 1-31
    day_of_week INTEGER NOT NULL, -- 1-7 (Monday = 1)
    day_name VARCHAR(20) NOT NULL,
    day_abbr VARCHAR(3) NOT NULL,
    
    -- Business Date Attributes
    is_weekend BOOLEAN NOT NULL,
    is_holiday BOOLEAN DEFAULT FALSE,
    holiday_name VARCHAR(200),
    
    -- Fiscal Period (configurable per organization)
    fiscal_year INTEGER,
    fiscal_quarter INTEGER,
    fiscal_month INTEGER,
    fiscal_week INTEGER,
    
    -- Relative Periods
    is_current_day BOOLEAN DEFAULT FALSE,
    is_current_week BOOLEAN DEFAULT FALSE,
    is_current_month BOOLEAN DEFAULT FALSE,
    is_current_quarter BOOLEAN DEFAULT FALSE,
    is_current_year BOOLEAN DEFAULT FALSE,
    
    -- Additional Attributes
    days_in_month INTEGER NOT NULL,
    quarter_start_date DATE NOT NULL,
    quarter_end_date DATE NOT NULL,
    month_start_date DATE NOT NULL,
    month_end_date DATE NOT NULL,
    year_start_date DATE NOT NULL,
    year_end_date DATE NOT NULL
);

CREATE INDEX idx_dim_date_full_date ON dim_date(full_date);
CREATE INDEX idx_dim_date_year_month ON dim_date(year, month);
CREATE INDEX idx_dim_date_year_quarter ON dim_date(year, quarter);

COMMENT ON TABLE dim_date IS 'Date dimension for time-based analytics';

-- Dimension: Employee
CREATE TABLE IF NOT EXISTS dim_employee (
    employee_key SERIAL PRIMARY KEY,
    
    -- Source Keys
    employee_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    
    -- Employee Attributes (Type 2 SCD - Slowly Changing Dimension)
    employee_code VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    
    -- Employment Details
    employee_status VARCHAR(50),
    employment_type VARCHAR(50),
    hire_date DATE,
    termination_date DATE,
    
    -- Organizational Hierarchy
    department_id UUID,
    department_name VARCHAR(200),
    designation_id UUID,
    designation_name VARCHAR(200),
    location_id UUID,
    location_name VARCHAR(200),
    company_id UUID,
    company_name VARCHAR(200),
    
    -- Manager Relationship
    reporting_manager_id UUID,
    reporting_manager_name VARCHAR(255),
    
    -- Demographics (for anonymized reporting)
    age_group VARCHAR(20), -- '18-25', '26-35', '36-45', '46-55', '55+'
    gender VARCHAR(20),
    
    -- SCD Type 2 Columns
    effective_date DATE NOT NULL,
    expiry_date DATE,
    is_current BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(employee_id, effective_date)
);

CREATE INDEX idx_dim_employee_id ON dim_employee(employee_id);
CREATE INDEX idx_dim_employee_current ON dim_employee(employee_id, is_current) WHERE is_current = TRUE;
CREATE INDEX idx_dim_employee_org ON dim_employee(organization_id);
CREATE INDEX idx_dim_employee_dept ON dim_employee(department_id);
CREATE INDEX idx_dim_employee_status ON dim_employee(employee_status);

COMMENT ON TABLE dim_employee IS 'Employee dimension with SCD Type 2 for historical tracking';

-- Dimension: Leave Type
CREATE TABLE IF NOT EXISTS dim_leave_type (
    leave_type_key SERIAL PRIMARY KEY,
    
    leave_type_id UUID NOT NULL UNIQUE,
    organization_id UUID NOT NULL,
    
    leave_type_name VARCHAR(100) NOT NULL,
    leave_code VARCHAR(20),
    is_paid BOOLEAN,
    requires_approval BOOLEAN,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dim_leave_type_org ON dim_leave_type(organization_id);

COMMENT ON TABLE dim_leave_type IS 'Leave type dimension';

-- =====================================================
-- FACT TABLES
-- =====================================================

-- Fact: Attendance
CREATE TABLE IF NOT EXISTS fact_attendance (
    attendance_fact_id BIGSERIAL PRIMARY KEY,
    
    -- Dimension Keys
    date_key INTEGER NOT NULL REFERENCES dim_date(date_key),
    employee_key INTEGER NOT NULL REFERENCES dim_employee(employee_key),
    
    -- Source Keys
    attendance_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    
    -- Attendance Measures
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    working_hours DECIMAL(5,2),
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    break_hours DECIMAL(5,2) DEFAULT 0,
    
    -- Attendance Status
    attendance_status VARCHAR(50), -- 'present', 'absent', 'half_day', 'late', 'on_leave'
    is_late BOOLEAN DEFAULT FALSE,
    late_by_minutes INTEGER DEFAULT 0,
    is_early_departure BOOLEAN DEFAULT FALSE,
    early_departure_by_minutes INTEGER DEFAULT 0,
    
    -- Work Mode
    work_mode VARCHAR(50), -- 'office', 'remote', 'hybrid'
    
    -- Location
    check_in_location VARCHAR(200),
    check_in_latitude DECIMAL(10, 8),
    check_in_longitude DECIMAL(11, 8),
    
    -- Shift Information
    shift_id UUID,
    shift_name VARCHAR(100),
    scheduled_start_time TIME,
    scheduled_end_time TIME,
    scheduled_hours DECIMAL(5,2),
    
    -- Deductions/Adjustments
    late_deduction_hours DECIMAL(5,2) DEFAULT 0,
    early_departure_deduction_hours DECIMAL(5,2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(attendance_id, date_key)
);

CREATE INDEX idx_fact_attendance_date ON fact_attendance(date_key);
CREATE INDEX idx_fact_attendance_employee ON fact_attendance(employee_key);
CREATE INDEX idx_fact_attendance_org ON fact_attendance(organization_id);
CREATE INDEX idx_fact_attendance_status ON fact_attendance(attendance_status);
CREATE INDEX idx_fact_attendance_date_emp ON fact_attendance(date_key, employee_key);

COMMENT ON TABLE fact_attendance IS 'Attendance fact table for daily attendance metrics';

-- Fact: Leave Balance (Snapshot)
CREATE TABLE IF NOT EXISTS fact_leave_balance (
    balance_fact_id BIGSERIAL PRIMARY KEY,
    
    -- Dimension Keys
    date_key INTEGER NOT NULL REFERENCES dim_date(date_key),
    employee_key INTEGER NOT NULL REFERENCES dim_employee(employee_key),
    leave_type_key INTEGER NOT NULL REFERENCES dim_leave_type(leave_type_key),
    
    -- Source Keys
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    leave_type_id UUID NOT NULL,
    
    -- Balance Measures (as of date_key)
    allocated_days DECIMAL(5,2) NOT NULL,
    used_days DECIMAL(5,2) NOT NULL DEFAULT 0,
    pending_days DECIMAL(5,2) NOT NULL DEFAULT 0,
    available_days DECIMAL(5,2) NOT NULL,
    carried_forward_days DECIMAL(5,2) DEFAULT 0,
    
    -- Period
    balance_year INTEGER NOT NULL,
    
    -- Metadata
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(date_key, employee_key, leave_type_key, balance_year)
);

CREATE INDEX idx_fact_leave_balance_date ON fact_leave_balance(date_key);
CREATE INDEX idx_fact_leave_balance_employee ON fact_leave_balance(employee_key);
CREATE INDEX idx_fact_leave_balance_leave_type ON fact_leave_balance(leave_type_key);
CREATE INDEX idx_fact_leave_balance_org ON fact_leave_balance(organization_id);

COMMENT ON TABLE fact_leave_balance IS 'Daily snapshot of leave balances';

-- Fact: Leave Requests
CREATE TABLE IF NOT EXISTS fact_leave_requests (
    leave_request_fact_id BIGSERIAL PRIMARY KEY,
    
    -- Dimension Keys
    request_date_key INTEGER NOT NULL REFERENCES dim_date(date_key),
    employee_key INTEGER NOT NULL REFERENCES dim_employee(employee_key),
    leave_type_key INTEGER NOT NULL REFERENCES dim_leave_type(leave_type_key),
    approval_date_key INTEGER REFERENCES dim_date(date_key),
    
    -- Source Keys
    leave_request_id UUID NOT NULL UNIQUE,
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    leave_type_id UUID NOT NULL,
    
    -- Leave Request Details
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    total_days DECIMAL(5,2) NOT NULL,
    working_days DECIMAL(5,2) NOT NULL,
    
    -- Status
    request_status VARCHAR(50) NOT NULL, -- 'pending', 'approved', 'rejected', 'cancelled'
    
    -- Approval Metrics
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    approval_time_hours INTEGER, -- Time taken to approve (in hours)
    
    -- Approver Information
    approver_id UUID,
    approver_name VARCHAR(255),
    
    -- Reason
    leave_reason_category VARCHAR(100), -- 'vacation', 'sick', 'personal', 'family', 'other'
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fact_leave_requests_request_date ON fact_leave_requests(request_date_key);
CREATE INDEX idx_fact_leave_requests_employee ON fact_leave_requests(employee_key);
CREATE INDEX idx_fact_leave_requests_leave_type ON fact_leave_requests(leave_type_key);
CREATE INDEX idx_fact_leave_requests_status ON fact_leave_requests(request_status);
CREATE INDEX idx_fact_leave_requests_org ON fact_leave_requests(organization_id);
CREATE INDEX idx_fact_leave_requests_period ON fact_leave_requests(from_date, to_date);

COMMENT ON TABLE fact_leave_requests IS 'Leave request transactions for analytics';

-- Fact: Payroll (Monthly Summary)
CREATE TABLE IF NOT EXISTS fact_payroll (
    payroll_fact_id BIGSERIAL PRIMARY KEY,
    
    -- Dimension Keys
    payroll_date_key INTEGER NOT NULL REFERENCES dim_date(date_key),
    employee_key INTEGER NOT NULL REFERENCES dim_employee(employee_key),
    
    -- Source Keys
    payroll_run_id UUID,
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    
    -- Period
    payroll_year INTEGER NOT NULL,
    payroll_month INTEGER NOT NULL,
    
    -- Salary Components (Earnings)
    basic_salary DECIMAL(12,2) DEFAULT 0,
    hra DECIMAL(12,2) DEFAULT 0,
    special_allowance DECIMAL(12,2) DEFAULT 0,
    other_allowances DECIMAL(12,2) DEFAULT 0,
    overtime_pay DECIMAL(12,2) DEFAULT 0,
    bonus DECIMAL(12,2) DEFAULT 0,
    incentives DECIMAL(12,2) DEFAULT 0,
    
    total_earnings DECIMAL(12,2) NOT NULL,
    
    -- Deductions
    provident_fund DECIMAL(12,2) DEFAULT 0,
    professional_tax DECIMAL(12,2) DEFAULT 0,
    income_tax DECIMAL(12,2) DEFAULT 0,
    health_insurance DECIMAL(12,2) DEFAULT 0,
    loan_deduction DECIMAL(12,2) DEFAULT 0,
    other_deductions DECIMAL(12,2) DEFAULT 0,
    
    total_deductions DECIMAL(12,2) NOT NULL,
    
    -- Net Pay
    net_pay DECIMAL(12,2) NOT NULL,
    
    -- Working Days
    total_working_days INTEGER,
    days_present DECIMAL(5,2),
    days_absent DECIMAL(5,2),
    leave_days DECIMAL(5,2),
    
    -- Payment Status
    payment_status VARCHAR(50), -- 'draft', 'processed', 'paid', 'on_hold'
    payment_date DATE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(payroll_date_key, employee_key, payroll_year, payroll_month)
);

CREATE INDEX idx_fact_payroll_date ON fact_payroll(payroll_date_key);
CREATE INDEX idx_fact_payroll_employee ON fact_payroll(employee_key);
CREATE INDEX idx_fact_payroll_org ON fact_payroll(organization_id);
CREATE INDEX idx_fact_payroll_period ON fact_payroll(payroll_year, payroll_month);
CREATE INDEX idx_fact_payroll_status ON fact_payroll(payment_status);

COMMENT ON TABLE fact_payroll IS 'Monthly payroll summary for analytics';

-- Fact: Performance Reviews
CREATE TABLE IF NOT EXISTS fact_performance_reviews (
    review_fact_id BIGSERIAL PRIMARY KEY,
    
    -- Dimension Keys
    review_date_key INTEGER NOT NULL REFERENCES dim_date(date_key),
    employee_key INTEGER NOT NULL REFERENCES dim_employee(employee_key),
    reviewer_key INTEGER REFERENCES dim_employee(employee_key),
    
    -- Source Keys
    review_id UUID NOT NULL UNIQUE,
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    reviewer_id UUID,
    
    -- Review Cycle
    review_cycle_id UUID,
    review_cycle_name VARCHAR(200),
    review_type VARCHAR(50), -- 'annual', 'mid_year', 'quarterly', 'probation'
    
    -- Review Period
    review_period_start DATE,
    review_period_end DATE,
    
    -- Ratings
    overall_rating DECIMAL(3,2), -- 1.0 to 5.0
    performance_rating DECIMAL(3,2),
    behavior_rating DECIMAL(3,2),
    skill_rating DECIMAL(3,2),
    
    -- Goals
    goals_achieved INTEGER DEFAULT 0,
    total_goals INTEGER DEFAULT 0,
    goal_achievement_percentage DECIMAL(5,2),
    
    -- Review Status
    review_status VARCHAR(50), -- 'draft', 'submitted', 'completed', 'acknowledged'
    
    -- Timestamps
    submitted_at TIMESTAMP,
    completed_at TIMESTAMP,
    acknowledged_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fact_perf_reviews_date ON fact_performance_reviews(review_date_key);
CREATE INDEX idx_fact_perf_reviews_employee ON fact_performance_reviews(employee_key);
CREATE INDEX idx_fact_perf_reviews_reviewer ON fact_performance_reviews(reviewer_key);
CREATE INDEX idx_fact_perf_reviews_org ON fact_performance_reviews(organization_id);
CREATE INDEX idx_fact_perf_reviews_cycle ON fact_performance_reviews(review_cycle_id);

COMMENT ON TABLE fact_performance_reviews IS 'Performance review metrics for analytics';

-- =====================================================
-- AGGREGATE TABLES (Pre-computed for performance)
-- =====================================================

-- Aggregate: Monthly Attendance Summary
CREATE TABLE IF NOT EXISTS agg_monthly_attendance (
    agg_id BIGSERIAL PRIMARY KEY,
    
    organization_id UUID NOT NULL,
    employee_key INTEGER NOT NULL REFERENCES dim_employee(employee_key),
    
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    
    -- Attendance Metrics
    total_working_days INTEGER NOT NULL,
    days_present INTEGER NOT NULL,
    days_absent INTEGER NOT NULL,
    days_on_leave INTEGER NOT NULL,
    days_half_day INTEGER NOT NULL,
    
    total_working_hours DECIMAL(8,2) NOT NULL,
    total_overtime_hours DECIMAL(8,2) DEFAULT 0,
    
    late_arrivals INTEGER DEFAULT 0,
    early_departures INTEGER DEFAULT 0,
    
    -- Attendance Percentage
    attendance_percentage DECIMAL(5,2),
    
    -- Metadata
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, employee_key, year, month)
);

CREATE INDEX idx_agg_monthly_att_emp ON agg_monthly_attendance(employee_key);
CREATE INDEX idx_agg_monthly_att_period ON agg_monthly_attendance(year, month);

COMMENT ON TABLE agg_monthly_attendance IS 'Pre-computed monthly attendance summaries';

-- =====================================================
-- MATERIALIZED VIEWS
-- =====================================================

-- View: Employee Headcount by Department
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_headcount_by_department AS
SELECT 
    de.organization_id,
    de.department_id,
    de.department_name,
    de.company_id,
    de.company_name,
    COUNT(*) as total_employees,
    COUNT(*) FILTER (WHERE de.employee_status = 'active') as active_employees,
    COUNT(*) FILTER (WHERE de.employee_status = 'on_leave') as on_leave,
    COUNT(*) FILTER (WHERE de.employee_status = 'terminated') as terminated,
    COUNT(*) FILTER (WHERE de.employment_type = 'full_time') as full_time,
    COUNT(*) FILTER (WHERE de.employment_type = 'part_time') as part_time,
    COUNT(*) FILTER (WHERE de.employment_type = 'contract') as contract
FROM dim_employee de
WHERE de.is_current = TRUE
GROUP BY de.organization_id, de.department_id, de.department_name, de.company_id, de.company_name;

CREATE UNIQUE INDEX idx_mv_headcount_dept ON mv_headcount_by_department(organization_id, department_id);

-- View: Leave Utilization Summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_leave_utilization AS
SELECT 
    flb.organization_id,
    flb.employee_key,
    de.full_name as employee_name,
    de.department_name,
    flb.leave_type_key,
    dlt.leave_type_name,
    flb.balance_year,
    MAX(flb.allocated_days) as allocated_days,
    MAX(flb.used_days) as used_days,
    MAX(flb.available_days) as available_days,
    ROUND((MAX(flb.used_days) / NULLIF(MAX(flb.allocated_days), 0) * 100), 2) as utilization_percentage
FROM fact_leave_balance flb
JOIN dim_employee de ON flb.employee_key = de.employee_key AND de.is_current = TRUE
JOIN dim_leave_type dlt ON flb.leave_type_key = dlt.leave_type_key
WHERE flb.balance_year = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY flb.organization_id, flb.employee_key, de.full_name, de.department_name,
         flb.leave_type_key, dlt.leave_type_name, flb.balance_year;

CREATE UNIQUE INDEX idx_mv_leave_util ON mv_leave_utilization(organization_id, employee_key, leave_type_key, balance_year);

-- =====================================================
-- FUNCTIONS FOR ETL
-- =====================================================

-- Function to populate dim_date for a date range
CREATE OR REPLACE FUNCTION populate_dim_date(start_date DATE, end_date DATE) RETURNS INTEGER AS $$
DECLARE
    current_date DATE := start_date;
    rows_inserted INTEGER := 0;
BEGIN
    WHILE current_date <= end_date LOOP
        INSERT INTO dim_date (
            date_key, full_date, year, quarter, month, month_name, month_abbr,
            week_of_year, day_of_month, day_of_week, day_name, day_abbr,
            is_weekend, days_in_month,
            quarter_start_date, quarter_end_date,
            month_start_date, month_end_date,
            year_start_date, year_end_date
        ) VALUES (
            TO_CHAR(current_date, 'YYYYMMDD')::INTEGER,
            current_date,
            EXTRACT(YEAR FROM current_date),
            EXTRACT(QUARTER FROM current_date),
            EXTRACT(MONTH FROM current_date),
            TO_CHAR(current_date, 'Month'),
            TO_CHAR(current_date, 'Mon'),
            EXTRACT(WEEK FROM current_date),
            EXTRACT(DAY FROM current_date),
            EXTRACT(ISODOW FROM current_date),
            TO_CHAR(current_date, 'Day'),
            TO_CHAR(current_date, 'Dy'),
            EXTRACT(ISODOW FROM current_date) >= 6,
            EXTRACT(DAY FROM (DATE_TRUNC('month', current_date) + INTERVAL '1 month - 1 day')),
            DATE_TRUNC('quarter', current_date),
            (DATE_TRUNC('quarter', current_date) + INTERVAL '3 months - 1 day')::DATE,
            DATE_TRUNC('month', current_date),
            (DATE_TRUNC('month', current_date) + INTERVAL '1 month - 1 day')::DATE,
            DATE_TRUNC('year', current_date),
            (DATE_TRUNC('year', current_date) + INTERVAL '1 year - 1 day')::DATE
        ) ON CONFLICT (date_key) DO NOTHING;
        
        rows_inserted := rows_inserted + 1;
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN rows_inserted;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL DATA LOAD
-- =====================================================

-- Populate dim_date for 5 years (2020-2025)
SELECT populate_dim_date('2020-01-01'::DATE, '2025-12-31'::DATE);

COMMENT ON FUNCTION populate_dim_date IS 'Populate date dimension for a given date range';
