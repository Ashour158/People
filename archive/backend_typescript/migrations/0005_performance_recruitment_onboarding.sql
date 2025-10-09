-- =====================================================
-- Migration 0005: Performance, Recruitment & Onboarding
-- Performance cycles, Goals, Reviews, Recruitment, Onboarding
-- =====================================================

-- =====================================================
-- PERFORMANCE CYCLES
-- =====================================================

CREATE TABLE IF NOT EXISTS performance_cycles (
    cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    cycle_name VARCHAR(200) NOT NULL,
    cycle_year INTEGER NOT NULL,
    
    -- Cycle Period
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Review Settings
    review_type VARCHAR(50) NOT NULL,
    self_review_enabled BOOLEAN DEFAULT TRUE,
    manager_review_enabled BOOLEAN DEFAULT TRUE,
    peer_review_enabled BOOLEAN DEFAULT FALSE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT unique_cycle_year UNIQUE (organization_id, cycle_year, cycle_name)
);

CREATE INDEX idx_performance_cycles_org ON performance_cycles(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_performance_cycles_year ON performance_cycles(cycle_year, organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_performance_cycles_status ON performance_cycles(status, organization_id);

-- =====================================================
-- GOALS
-- =====================================================

CREATE TABLE IF NOT EXISTS goals (
    goal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    cycle_id UUID REFERENCES performance_cycles(cycle_id) ON DELETE CASCADE,
    
    -- Goal Details
    goal_title VARCHAR(300) NOT NULL,
    goal_description TEXT,
    goal_type VARCHAR(50),
    
    -- SMART Framework
    specific_description TEXT,
    measurable_criteria TEXT,
    target_value VARCHAR(200),
    
    -- Period
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    
    -- Progress
    progress_percentage INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'not_started',
    
    -- Approval
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    
    -- Completion
    completed_at TIMESTAMP,
    
    -- Weight
    weight_percentage DECIMAL(5, 2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_goals_org ON goals(organization_id);
CREATE INDEX idx_goals_emp ON goals(employee_id, status);
CREATE INDEX idx_goals_cycle ON goals(cycle_id);
CREATE INDEX idx_goals_status ON goals(status, organization_id);

-- =====================================================
-- GOAL CHECK-INS
-- =====================================================

CREATE TABLE IF NOT EXISTS goal_check_ins (
    check_in_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
    
    -- Check-in Details
    check_in_date DATE NOT NULL,
    progress_update TEXT NOT NULL,
    progress_percentage INTEGER,
    
    -- Challenges & Support
    challenges_faced TEXT,
    support_needed TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

CREATE INDEX idx_goal_check_ins_goal ON goal_check_ins(goal_id, check_in_date DESC);

-- =====================================================
-- PERFORMANCE REVIEWS
-- =====================================================

CREATE TABLE IF NOT EXISTS performance_reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES performance_cycles(cycle_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- Reviewer
    reviewer_id UUID NOT NULL REFERENCES employees(employee_id),
    reviewer_type VARCHAR(50) NOT NULL,
    
    -- Overall Rating
    overall_rating DECIMAL(3, 2),
    overall_comments TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',
    
    -- Submission
    submitted_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_performance_reviews_org ON performance_reviews(organization_id);
CREATE INDEX idx_performance_reviews_emp ON performance_reviews(employee_id);
CREATE INDEX idx_performance_reviews_cycle ON performance_reviews(cycle_id);
CREATE INDEX idx_performance_reviews_reviewer ON performance_reviews(reviewer_id);

-- =====================================================
-- FEEDBACK
-- =====================================================

CREATE TABLE IF NOT EXISTS feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Feedback Participants
    feedback_for_id UUID NOT NULL REFERENCES employees(employee_id),
    feedback_from_id UUID NOT NULL REFERENCES employees(employee_id),
    
    -- Feedback Details
    feedback_type VARCHAR(50) NOT NULL,
    feedback_text TEXT NOT NULL,
    
    -- Rating
    rating DECIMAL(3, 2),
    
    -- Context
    context VARCHAR(50),
    is_anonymous BOOLEAN DEFAULT FALSE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'submitted',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_org ON feedback(organization_id);
CREATE INDEX idx_feedback_for ON feedback(feedback_for_id, created_at DESC);
CREATE INDEX idx_feedback_from ON feedback(feedback_from_id);
CREATE INDEX idx_feedback_type ON feedback(feedback_type);

-- =====================================================
-- COMPETENCIES
-- =====================================================

CREATE TABLE IF NOT EXISTS competencies (
    competency_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    competency_name VARCHAR(200) NOT NULL,
    competency_code VARCHAR(50) NOT NULL,
    description TEXT,
    competency_type VARCHAR(50),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT unique_competency_code UNIQUE (organization_id, competency_code)
);

CREATE INDEX idx_competencies_org ON competencies(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_competencies_type ON competencies(competency_type) WHERE is_deleted = FALSE;

-- =====================================================
-- COMPETENCY RATINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS competency_ratings (
    rating_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES performance_reviews(review_id) ON DELETE CASCADE,
    competency_id UUID NOT NULL REFERENCES competencies(competency_id),
    
    rating DECIMAL(3, 2) NOT NULL,
    comments TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_competency_ratings_review ON competency_ratings(review_id);
CREATE INDEX idx_competency_ratings_competency ON competency_ratings(competency_id);

-- =====================================================
-- JOB REQUISITIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS job_requisitions (
    requisition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id),
    
    -- Requisition Details
    job_title VARCHAR(200) NOT NULL,
    department_id UUID REFERENCES departments(department_id),
    location_id UUID REFERENCES locations(location_id),
    
    -- Position Details
    number_of_positions INTEGER DEFAULT 1,
    employment_type VARCHAR(50) NOT NULL,
    
    -- Requirements
    min_experience_years INTEGER,
    max_experience_years INTEGER,
    required_qualifications TEXT,
    preferred_qualifications TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',
    priority VARCHAR(20) DEFAULT 'medium',
    
    -- Approval
    requested_by UUID REFERENCES employees(employee_id),
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_job_requisitions_org ON job_requisitions(organization_id);
CREATE INDEX idx_job_requisitions_status ON job_requisitions(status, organization_id);
CREATE INDEX idx_job_requisitions_dept ON job_requisitions(department_id);

-- =====================================================
-- JOB POSTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS job_postings (
    posting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    requisition_id UUID NOT NULL REFERENCES job_requisitions(requisition_id) ON DELETE CASCADE,
    
    -- Posting Details
    posting_title VARCHAR(300) NOT NULL,
    job_description TEXT NOT NULL,
    
    -- Posting Dates
    posting_date DATE DEFAULT CURRENT_DATE,
    application_deadline DATE,
    
    -- Compensation Range
    min_salary DECIMAL(15, 2),
    max_salary DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',
    is_internal_only BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_job_postings_org ON job_postings(organization_id);
CREATE INDEX idx_job_postings_requisition ON job_postings(requisition_id);
CREATE INDEX idx_job_postings_status ON job_postings(status, posting_date);

-- =====================================================
-- CANDIDATES
-- =====================================================

CREATE TABLE IF NOT EXISTS candidates (
    candidate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    
    -- Professional Information
    current_company VARCHAR(200),
    current_position VARCHAR(200),
    total_experience_years DECIMAL(4, 2),
    
    -- Documents
    resume_url VARCHAR(500),
    
    -- Source
    source VARCHAR(50),
    
    -- Status
    status VARCHAR(50) DEFAULT 'new',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_candidate_email UNIQUE (organization_id, email)
);

CREATE INDEX idx_candidates_org ON candidates(organization_id);
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_candidates_status ON candidates(status, organization_id);

-- =====================================================
-- JOB APPLICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS job_applications (
    application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    posting_id UUID NOT NULL REFERENCES job_postings(posting_id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(candidate_id) ON DELETE CASCADE,
    
    -- Application Details
    cover_letter TEXT,
    application_date DATE DEFAULT CURRENT_DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'applied',
    current_stage VARCHAR(50),
    
    -- Rating
    overall_rating DECIMAL(3, 2),
    
    -- Assignment
    assigned_recruiter_id UUID REFERENCES employees(employee_id),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_applications_org ON job_applications(organization_id);
CREATE INDEX idx_job_applications_posting ON job_applications(posting_id);
CREATE INDEX idx_job_applications_candidate ON job_applications(candidate_id);
CREATE INDEX idx_job_applications_status ON job_applications(status, organization_id);
CREATE INDEX idx_job_applications_recruiter ON job_applications(assigned_recruiter_id);

-- =====================================================
-- INTERVIEW SCHEDULES
-- =====================================================

CREATE TABLE IF NOT EXISTS interview_schedules (
    interview_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES job_applications(application_id) ON DELETE CASCADE,
    
    -- Interview Details
    interview_round INTEGER NOT NULL,
    interview_type VARCHAR(50) NOT NULL,
    
    -- Schedule
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    
    -- Location/Link
    location VARCHAR(300),
    meeting_link VARCHAR(500),
    
    -- Interviewer
    interviewer_id UUID REFERENCES employees(employee_id),
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_interview_schedules_org ON interview_schedules(organization_id);
CREATE INDEX idx_interview_schedules_application ON interview_schedules(application_id);
CREATE INDEX idx_interview_schedules_interviewer ON interview_schedules(interviewer_id, scheduled_date);
CREATE INDEX idx_interview_schedules_status ON interview_schedules(status);

-- =====================================================
-- INTERVIEW FEEDBACK
-- =====================================================

CREATE TABLE IF NOT EXISTS interview_feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES interview_schedules(interview_id) ON DELETE CASCADE,
    
    -- Feedback
    overall_rating DECIMAL(3, 2),
    technical_rating DECIMAL(3, 2),
    communication_rating DECIMAL(3, 2),
    cultural_fit_rating DECIMAL(3, 2),
    
    -- Comments
    strengths TEXT,
    weaknesses TEXT,
    overall_comments TEXT,
    
    -- Recommendation
    recommendation VARCHAR(50),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

CREATE INDEX idx_interview_feedback_interview ON interview_feedback(interview_id);

-- =====================================================
-- ONBOARDING PROGRAMS
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_programs (
    program_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    program_name VARCHAR(200) NOT NULL,
    description TEXT,
    duration_days INTEGER NOT NULL,
    
    -- Target
    target_department_id UUID REFERENCES departments(department_id),
    target_designation_id UUID REFERENCES designations(designation_id),
    
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

CREATE INDEX idx_onboarding_programs_org ON onboarding_programs(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_onboarding_programs_dept ON onboarding_programs(target_department_id) WHERE is_deleted = FALSE;

-- =====================================================
-- ONBOARDING TASKS
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES onboarding_programs(program_id) ON DELETE CASCADE,
    
    task_name VARCHAR(300) NOT NULL,
    task_description TEXT,
    
    -- Task Details
    task_type VARCHAR(50),
    day_number INTEGER NOT NULL,
    
    -- Assignment
    assigned_to_role VARCHAR(50),
    
    -- Required
    is_mandatory BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_onboarding_tasks_program ON onboarding_tasks(program_id, day_number);

-- =====================================================
-- EMPLOYEE ONBOARDING
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_onboarding (
    onboarding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES onboarding_programs(program_id),
    
    -- Onboarding Period
    start_date DATE NOT NULL,
    expected_completion_date DATE NOT NULL,
    actual_completion_date DATE,
    
    -- Buddy
    buddy_id UUID REFERENCES employees(employee_id),
    
    -- Progress
    progress_percentage INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'in_progress',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employee_onboarding_org ON employee_onboarding(organization_id);
CREATE INDEX idx_employee_onboarding_emp ON employee_onboarding(employee_id);
CREATE INDEX idx_employee_onboarding_status ON employee_onboarding(status);

-- =====================================================
-- ONBOARDING TASK PROGRESS
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_task_progress (
    progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    onboarding_id UUID NOT NULL REFERENCES employee_onboarding(onboarding_id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES onboarding_tasks(task_id) ON DELETE CASCADE,
    
    -- Progress
    status VARCHAR(50) DEFAULT 'pending',
    completed_at TIMESTAMP,
    completed_by UUID REFERENCES employees(employee_id),
    
    -- Feedback
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_onboarding_task_progress_onboarding ON onboarding_task_progress(onboarding_id);
CREATE INDEX idx_onboarding_task_progress_task ON onboarding_task_progress(task_id);
CREATE INDEX idx_onboarding_task_progress_status ON onboarding_task_progress(status);

-- =====================================================
-- ROW-LEVEL SECURITY (RLS) - PLACEHOLDERS
-- =====================================================

/*
COMMENT ON TABLE performance_cycles IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE goals IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE performance_reviews IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE feedback IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE competencies IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE job_requisitions IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE job_postings IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE candidates IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE job_applications IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE interview_schedules IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE onboarding_programs IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE employee_onboarding IS 'Row-Level Security: Enable with organization_id filter';
*/

INSERT INTO schema_migrations (migration_name) VALUES ('0005_performance_recruitment_onboarding');
