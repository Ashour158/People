-- =====================================================
-- HR MANAGEMENT SYSTEM - NEW MODULES DATABASE SCHEMA
-- =====================================================
-- This migration adds tables for:
-- 1. Onboarding
-- 2. Offboarding
-- 3. Performance Management
-- 4. Timesheet & Project Tracking
-- =====================================================

-- =====================================================
-- ONBOARDING MODULE
-- =====================================================

-- Onboarding Programs
CREATE TABLE IF NOT EXISTS onboarding_programs (
    program_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    program_name VARCHAR(100) NOT NULL,
    program_code VARCHAR(50) NOT NULL,
    description TEXT,
    duration_days INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(organization_id, program_code)
);

CREATE INDEX idx_onboarding_programs_org ON onboarding_programs(organization_id) WHERE is_deleted = FALSE;

-- Onboarding Tasks
CREATE TABLE IF NOT EXISTS onboarding_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES onboarding_programs(program_id),
    task_name VARCHAR(200) NOT NULL,
    task_description TEXT,
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('document', 'training', 'meeting', 'system_access', 'equipment', 'other')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assigned_to_role VARCHAR(100),
    due_days_after_joining INTEGER NOT NULL DEFAULT 1,
    is_mandatory BOOLEAN DEFAULT TRUE,
    task_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_onboarding_tasks_program ON onboarding_tasks(program_id) WHERE is_deleted = FALSE;

-- Employee Onboarding
CREATE TABLE IF NOT EXISTS employee_onboarding (
    onboarding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id),
    program_id UUID NOT NULL REFERENCES onboarding_programs(program_id),
    start_date DATE NOT NULL,
    expected_completion_date DATE NOT NULL,
    actual_completion_date DATE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold')),
    buddy_id UUID REFERENCES employees(employee_id),
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_employee_onboarding_emp ON employee_onboarding(employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_employee_onboarding_status ON employee_onboarding(status) WHERE is_deleted = FALSE;

-- Onboarding Task Progress
CREATE TABLE IF NOT EXISTS onboarding_task_progress (
    progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    onboarding_id UUID NOT NULL REFERENCES employee_onboarding(onboarding_id),
    task_id UUID NOT NULL REFERENCES onboarding_tasks(task_id),
    employee_id UUID NOT NULL REFERENCES employees(employee_id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'overdue')),
    assigned_to UUID REFERENCES employees(employee_id),
    due_date DATE NOT NULL,
    completed_date TIMESTAMP,
    completed_by UUID REFERENCES employees(employee_id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_onboarding_task_progress_onboarding ON onboarding_task_progress(onboarding_id);
CREATE INDEX idx_onboarding_task_progress_emp ON onboarding_task_progress(employee_id);
CREATE INDEX idx_onboarding_task_progress_status ON onboarding_task_progress(status);

-- =====================================================
-- OFFBOARDING MODULE
-- =====================================================

-- Offboarding Checklists
CREATE TABLE IF NOT EXISTS offboarding_checklists (
    checklist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    checklist_name VARCHAR(100) NOT NULL,
    applicable_for VARCHAR(20) NOT NULL CHECK (applicable_for IN ('all', 'resignation', 'termination', 'retirement')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_offboarding_checklists_org ON offboarding_checklists(organization_id) WHERE is_deleted = FALSE;

-- Offboarding Tasks
CREATE TABLE IF NOT EXISTS offboarding_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES offboarding_checklists(checklist_id),
    task_name VARCHAR(200) NOT NULL,
    task_description TEXT,
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('clearance', 'documentation', 'asset_return', 'knowledge_transfer', 'access_revoke', 'other')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    responsible_department VARCHAR(100),
    due_days_before_last_day INTEGER NOT NULL DEFAULT 0,
    is_mandatory BOOLEAN DEFAULT TRUE,
    task_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_offboarding_tasks_checklist ON offboarding_tasks(checklist_id) WHERE is_deleted = FALSE;

-- Employee Offboarding
CREATE TABLE IF NOT EXISTS employee_offboarding (
    offboarding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    resignation_date DATE NOT NULL,
    last_working_day DATE NOT NULL,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('resignation', 'termination', 'retirement', 'contract_end', 'other')),
    reason_details TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('initiated', 'in_progress', 'completed', 'cancelled')),
    notice_period_days INTEGER NOT NULL DEFAULT 30,
    exit_interview_date DATE,
    exit_interview_conducted_by UUID REFERENCES employees(employee_id),
    exit_interview_notes TEXT,
    final_settlement_amount DECIMAL(15, 2),
    final_settlement_date DATE,
    rehire_eligible BOOLEAN DEFAULT TRUE,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_employee_offboarding_emp ON employee_offboarding(employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_employee_offboarding_org ON employee_offboarding(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_employee_offboarding_status ON employee_offboarding(status) WHERE is_deleted = FALSE;

-- Offboarding Task Progress
CREATE TABLE IF NOT EXISTS offboarding_task_progress (
    progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offboarding_id UUID NOT NULL REFERENCES employee_offboarding(offboarding_id),
    task_id UUID NOT NULL REFERENCES offboarding_tasks(task_id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'not_applicable')),
    assigned_to UUID REFERENCES employees(employee_id),
    due_date DATE NOT NULL,
    completed_date TIMESTAMP,
    completed_by UUID REFERENCES employees(employee_id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_offboarding_task_progress_offboarding ON offboarding_task_progress(offboarding_id);
CREATE INDEX idx_offboarding_task_progress_status ON offboarding_task_progress(status);

-- =====================================================
-- PERFORMANCE MANAGEMENT MODULE
-- =====================================================

-- Performance Cycles
CREATE TABLE IF NOT EXISTS performance_cycles (
    cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    cycle_name VARCHAR(100) NOT NULL,
    cycle_type VARCHAR(20) NOT NULL CHECK (cycle_type IN ('annual', 'semi_annual', 'quarterly', 'monthly')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    review_start_date DATE,
    review_end_date DATE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    enable_self_assessment BOOLEAN DEFAULT TRUE,
    enable_peer_review BOOLEAN DEFAULT FALSE,
    enable_360_review BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_performance_cycles_org ON performance_cycles(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_performance_cycles_status ON performance_cycles(status) WHERE is_deleted = FALSE;

-- Performance Goals (OKR/KPI)
CREATE TABLE IF NOT EXISTS performance_goals (
    goal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id),
    cycle_id UUID REFERENCES performance_cycles(cycle_id),
    goal_title VARCHAR(200) NOT NULL,
    goal_description TEXT,
    goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('okr', 'kpi', 'smart', 'project', 'learning')),
    category VARCHAR(20) NOT NULL CHECK (category IN ('individual', 'team', 'organizational')),
    parent_goal_id UUID REFERENCES performance_goals(goal_id),
    start_date DATE NOT NULL,
    target_date DATE NOT NULL,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'active', 'on_track', 'at_risk', 'behind', 'completed', 'cancelled')),
    metric_type VARCHAR(20) CHECK (metric_type IN ('number', 'percentage', 'boolean', 'currency')),
    target_value DECIMAL(15, 2),
    current_value DECIMAL(15, 2) DEFAULT 0,
    weight_percentage INTEGER CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
    aligned_to TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_performance_goals_emp ON performance_goals(employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_performance_goals_cycle ON performance_goals(cycle_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_performance_goals_status ON performance_goals(status) WHERE is_deleted = FALSE;

-- Performance Reviews
CREATE TABLE IF NOT EXISTS performance_reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id),
    cycle_id UUID NOT NULL REFERENCES performance_cycles(cycle_id),
    reviewer_id UUID NOT NULL REFERENCES employees(employee_id),
    review_type VARCHAR(20) NOT NULL CHECK (review_type IN ('self', 'manager', 'peer', '360')),
    review_status VARCHAR(20) NOT NULL CHECK (review_status IN ('draft', 'submitted', 'completed', 'acknowledged')),
    overall_rating DECIMAL(3, 2) CHECK (overall_rating >= 1 AND overall_rating <= 5),
    competency_rating DECIMAL(3, 2) CHECK (competency_rating >= 1 AND competency_rating <= 5),
    goal_achievement_rating DECIMAL(3, 2) CHECK (goal_achievement_rating >= 1 AND goal_achievement_rating <= 5),
    strengths TEXT,
    areas_of_improvement TEXT,
    achievements TEXT,
    development_areas TEXT,
    comments TEXT,
    submitted_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_performance_reviews_emp ON performance_reviews(employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_performance_reviews_cycle ON performance_reviews(cycle_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_performance_reviews_reviewer ON performance_reviews(reviewer_id) WHERE is_deleted = FALSE;

-- Feedback (360-degree)
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_for_employee_id UUID NOT NULL REFERENCES employees(employee_id),
    feedback_from_employee_id UUID REFERENCES employees(employee_id),
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('positive', 'constructive', 'peer', 'manager', '360')),
    feedback_category VARCHAR(50),
    feedback_text TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    visibility VARCHAR(20) NOT NULL CHECK (visibility IN ('private', 'manager', 'employee', 'public')),
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_feedback_for_emp ON feedback(feedback_for_employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_feedback_from_emp ON feedback(feedback_from_employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_feedback_type ON feedback(feedback_type) WHERE is_deleted = FALSE;

-- Competencies Master
CREATE TABLE IF NOT EXISTS competencies (
    competency_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    competency_name VARCHAR(100) NOT NULL,
    competency_category VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_competencies_org ON competencies(organization_id) WHERE is_deleted = FALSE;

-- Employee Competencies (Mapping & Assessment)
CREATE TABLE IF NOT EXISTS employee_competencies (
    mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id),
    competency_id UUID NOT NULL REFERENCES competencies(competency_id),
    proficiency_level VARCHAR(20) NOT NULL CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    assessment_date DATE NOT NULL,
    assessed_by UUID NOT NULL REFERENCES employees(employee_id),
    target_level VARCHAR(20) CHECK (target_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_employee_competencies_emp ON employee_competencies(employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_employee_competencies_comp ON employee_competencies(competency_id) WHERE is_deleted = FALSE;

-- =====================================================
-- TIMESHEET & PROJECT TRACKING MODULE
-- =====================================================

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    project_code VARCHAR(50) NOT NULL,
    project_name VARCHAR(200) NOT NULL,
    project_type VARCHAR(20) NOT NULL CHECK (project_type IN ('internal', 'client', 'billable', 'non_billable')),
    client_name VARCHAR(200),
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    budget DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) NOT NULL CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
    project_manager_id UUID REFERENCES employees(employee_id),
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(organization_id, project_code)
);

CREATE INDEX idx_projects_org ON projects(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_projects_status ON projects(status) WHERE is_deleted = FALSE;
CREATE INDEX idx_projects_pm ON projects(project_manager_id) WHERE is_deleted = FALSE;

-- Project Members
CREATE TABLE IF NOT EXISTS project_members (
    member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(project_id),
    employee_id UUID NOT NULL REFERENCES employees(employee_id),
    role VARCHAR(100) NOT NULL,
    hourly_rate DECIMAL(10, 2),
    allocation_percentage INTEGER CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_project_members_project ON project_members(project_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_members_emp ON project_members(employee_id) WHERE is_deleted = FALSE;

-- Project Tasks
CREATE TABLE IF NOT EXISTS project_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(project_id),
    task_name VARCHAR(200) NOT NULL,
    task_description TEXT,
    assigned_to UUID REFERENCES employees(employee_id),
    estimated_hours DECIMAL(8, 2),
    actual_hours DECIMAL(8, 2) DEFAULT 0,
    status VARCHAR(20) NOT NULL CHECK (status IN ('todo', 'in_progress', 'review', 'completed', 'blocked')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    start_date DATE,
    due_date DATE,
    completed_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_project_tasks_project ON project_tasks(project_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_tasks_assigned ON project_tasks(assigned_to) WHERE is_deleted = FALSE;
CREATE INDEX idx_project_tasks_status ON project_tasks(status) WHERE is_deleted = FALSE;

-- Timesheet Entries
CREATE TABLE IF NOT EXISTS timesheet_entries (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id),
    project_id UUID REFERENCES projects(project_id),
    task_id UUID REFERENCES project_tasks(task_id),
    work_date DATE NOT NULL,
    hours_worked DECIMAL(5, 2) NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
    is_billable BOOLEAN DEFAULT FALSE,
    description TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    submitted_at TIMESTAMP,
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_timesheet_entries_emp ON timesheet_entries(employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_timesheet_entries_project ON timesheet_entries(project_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_timesheet_entries_date ON timesheet_entries(work_date) WHERE is_deleted = FALSE;
CREATE INDEX idx_timesheet_entries_status ON timesheet_entries(status) WHERE is_deleted = FALSE;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE onboarding_programs IS 'Master onboarding programs with templates and workflows';
COMMENT ON TABLE onboarding_tasks IS 'Tasks to be completed during employee onboarding';
COMMENT ON TABLE employee_onboarding IS 'Employee-specific onboarding progress tracking';
COMMENT ON TABLE onboarding_task_progress IS 'Individual task completion status for each employee';

COMMENT ON TABLE offboarding_checklists IS 'Master offboarding checklists for different exit types';
COMMENT ON TABLE offboarding_tasks IS 'Tasks to be completed during employee offboarding';
COMMENT ON TABLE employee_offboarding IS 'Employee-specific offboarding process tracking';
COMMENT ON TABLE offboarding_task_progress IS 'Individual clearance task status for exiting employees';

COMMENT ON TABLE performance_cycles IS 'Annual/periodic performance review cycles';
COMMENT ON TABLE performance_goals IS 'OKR/KPI goals for employees';
COMMENT ON TABLE performance_reviews IS 'Performance review records (self, manager, peer, 360)';
COMMENT ON TABLE feedback IS '360-degree feedback and continuous feedback';
COMMENT ON TABLE competencies IS 'Master list of competencies/skills';
COMMENT ON TABLE employee_competencies IS 'Employee competency mapping and proficiency levels';

COMMENT ON TABLE projects IS 'Projects for timesheet and project tracking';
COMMENT ON TABLE project_members IS 'Team members assigned to projects';
COMMENT ON TABLE project_tasks IS 'Tasks within projects';
COMMENT ON TABLE timesheet_entries IS 'Time entries for projects and tasks';
