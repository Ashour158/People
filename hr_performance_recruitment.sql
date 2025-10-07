-- =====================================================
-- HR SYSTEM - PART 3: PERFORMANCE & RECRUITMENT
-- =====================================================

-- =====================================================
-- SECTION 12: PERFORMANCE MANAGEMENT
-- =====================================================

-- Performance Cycles/Review Periods
CREATE TABLE performance_cycles (
    cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    
    cycle_name VARCHAR(100) NOT NULL,
    cycle_code VARCHAR(50) NOT NULL,
    
    cycle_type VARCHAR(50) DEFAULT 'annual', -- annual, semi_annual, quarterly, monthly, probation
    
    -- Period
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Review Period
    review_start_date DATE,
    review_end_date DATE,
    
    -- Self Assessment
    self_assessment_start_date DATE,
    self_assessment_end_date DATE,
    
    -- Manager Review
    manager_review_start_date DATE,
    manager_review_end_date DATE,
    
    -- Calibration
    calibration_start_date DATE,
    calibration_end_date DATE,
    
    -- Final Review
    final_review_date DATE,
    
    description TEXT,
    
    -- Settings
    enable_self_assessment BOOLEAN DEFAULT TRUE,
    enable_peer_review BOOLEAN DEFAULT FALSE,
    enable_360_review BOOLEAN DEFAULT FALSE,
    
    max_peer_reviewers INTEGER DEFAULT 3,
    
    -- Rating Scale
    rating_scale_min DECIMAL(3,2) DEFAULT 1.00,
    rating_scale_max DECIMAL(3,2) DEFAULT 5.00,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft',
    -- draft, active, review_in_progress, calibration, completed, cancelled
    
    -- Notifications
    send_reminders BOOLEAN DEFAULT TRUE,
    reminder_frequency_days INTEGER DEFAULT 3,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    UNIQUE(organization_id, cycle_code)
);

CREATE INDEX idx_perf_cycles_org ON performance_cycles(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_perf_cycles_status ON performance_cycles(status, start_date);

-- Goals/Objectives
CREATE TABLE goals (
    goal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    cycle_id UUID REFERENCES performance_cycles(cycle_id) ON DELETE CASCADE,
    
    goal_title VARCHAR(200) NOT NULL,
    goal_description TEXT,
    
    goal_category VARCHAR(50), -- individual, team, departmental, organizational
    goal_type VARCHAR(50), -- performance, development, project, stretch
    
    -- SMART Criteria
    is_specific BOOLEAN DEFAULT FALSE,
    is_measurable BOOLEAN DEFAULT FALSE,
    is_achievable BOOLEAN DEFAULT FALSE,
    is_relevant BOOLEAN DEFAULT FALSE,
    is_time_bound BOOLEAN DEFAULT FALSE,
    
    -- Measurement
    measurement_criteria TEXT,
    target_value VARCHAR(100),
    achieved_value VARCHAR(100),
    
    -- Timeline
    start_date DATE NOT NULL,
    target_date DATE NOT NULL,
    completion_date DATE,
    
    -- Progress
    progress_percentage DECIMAL(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    status VARCHAR(20) DEFAULT 'not_started',
    -- not_started, in_progress, on_track, at_risk, delayed, completed, cancelled
    
    -- Weight/Priority
    weight_percentage DECIMAL(5,2) DEFAULT 0,
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    
    -- Alignment
    parent_goal_id UUID REFERENCES goals(goal_id),
    aligned_with_org_goal BOOLEAN DEFAULT FALSE,
    aligned_goal_description TEXT,
    
    -- Manager Review
    manager_rating DECIMAL(3,2),
    manager_comments TEXT,
    
    -- Self Assessment
    self_rating DECIMAL(3,2),
    self_comments TEXT,
    
    -- Final Rating
    final_rating DECIMAL(3,2),
    
    -- Visibility
    is_private BOOLEAN DEFAULT FALSE,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_goals_emp ON goals(employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_goals_cycle ON goals(cycle_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_goals_status ON goals(status, target_date);
CREATE INDEX idx_goals_parent ON goals(parent_goal_id) WHERE is_deleted = FALSE;

-- Goal Check-ins/Updates
CREATE TABLE goal_check_ins (
    check_in_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
    
    check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    progress_percentage DECIMAL(5,2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    
    achievements TEXT,
    challenges TEXT,
    next_steps TEXT,
    
    support_needed TEXT,
    
    manager_feedback TEXT,
    
    created_by UUID REFERENCES employees(employee_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_goal_checkins_goal ON goal_check_ins(goal_id, check_in_date DESC);

-- Key Result Areas (KRA)
CREATE TABLE key_result_areas (
    kra_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    kra_name VARCHAR(200) NOT NULL,
    kra_code VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Applicability
    designation_ids UUID[],
    department_ids UUID[],
    job_family VARCHAR(100),
    
    -- Weight
    weight_percentage DECIMAL(5,2),
    
    -- Measurement
    measurement_criteria TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    
    UNIQUE(organization_id, kra_code)
);

CREATE INDEX idx_kra_org ON key_result_areas(organization_id) WHERE is_deleted = FALSE;

-- Competencies
CREATE TABLE competencies (
    competency_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    competency_name VARCHAR(100) NOT NULL,
    competency_code VARCHAR(50) NOT NULL,
    
    competency_category VARCHAR(50), 
    -- technical, behavioral, leadership, functional, core
    
    description TEXT,
    
    -- Proficiency Levels
    proficiency_levels JSONB DEFAULT '[
        {"level": 1, "name": "Basic", "description": "Foundational knowledge"},
        {"level": 2, "name": "Intermediate", "description": "Working knowledge"},
        {"level": 3, "name": "Advanced", "description": "Expert knowledge"},
        {"level": 4, "name": "Expert", "description": "Mastery level"},
        {"level": 5, "name": "Thought Leader", "description": "Industry expert"}
    ]'::jsonb,
    
    -- Applicability
    designation_ids UUID[],
    department_ids UUID[],
    
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    
    UNIQUE(organization_id, competency_code)
);

CREATE INDEX idx_competencies_org ON competencies(organization_id) WHERE is_deleted = FALSE;

-- Skills
CREATE TABLE skills (
    skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    skill_name VARCHAR(100) NOT NULL,
    skill_code VARCHAR(50) NOT NULL,
    
    skill_category VARCHAR(50), -- technical, soft_skill, domain, language, tool
    
    description TEXT,
    
    parent_skill_id UUID REFERENCES skills(skill_id),
    
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, skill_code)
);

CREATE INDEX idx_skills_org ON skills(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_skills_category ON skills(skill_category) WHERE is_deleted = FALSE;

-- Employee Skills
CREATE TABLE employee_skills (
    employee_skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
    
    proficiency_level INTEGER CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
    -- 1=Beginner, 2=Intermediate, 3=Advanced, 4=Expert, 5=Master
    
    years_of_experience DECIMAL(4,2),
    last_used_date DATE,
    
    is_primary_skill BOOLEAN DEFAULT FALSE,
    
    -- Assessment
    self_assessed BOOLEAN DEFAULT TRUE,
    manager_assessed BOOLEAN DEFAULT FALSE,
    
    assessed_by UUID REFERENCES employees(employee_id),
    assessed_date DATE,
    
    certification_url VARCHAR(500),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(employee_id, skill_id)
);

CREATE INDEX idx_emp_skills_emp ON employee_skills(employee_id);
CREATE INDEX idx_emp_skills_skill ON employee_skills(skill_id);

-- Performance Reviews
CREATE TABLE performance_reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES employees(employee_id), -- Manager/Reviewer
    cycle_id UUID NOT NULL REFERENCES performance_cycles(cycle_id) ON DELETE CASCADE,
    
    review_type VARCHAR(50) NOT NULL DEFAULT 'manager',
    -- self, manager, peer, skip_level, 360, probation
    
    -- Overall Ratings
    overall_rating DECIMAL(3,2),
    kra_rating DECIMAL(3,2),
    competency_rating DECIMAL(3,2),
    goal_achievement_rating DECIMAL(3,2),
    behavioral_rating DECIMAL(3,2),
    
    -- Normalized Rating (if different scale used)
    normalized_rating DECIMAL(3,2),
    
    -- Rating Category
    rating_category VARCHAR(50), 
    -- exceeds_expectations, meets_expectations, needs_improvement, unsatisfactory
    
    -- Review Content
    key_achievements TEXT,
    strengths TEXT,
    areas_of_improvement TEXT,
    challenges_faced TEXT,
    
    -- Development
    training_recommendations TEXT,
    career_aspirations TEXT,
    development_plan TEXT,
    
    -- Comments
    manager_comments TEXT,
    employee_comments TEXT,
    skip_level_comments TEXT,
    hr_comments TEXT,
    
    -- Potential Assessment
    potential_rating VARCHAR(20), -- high, medium, low
    readiness_for_promotion VARCHAR(20), -- ready_now, ready_in_6months, ready_in_1year, not_ready
    
    -- 9-Box Grid Position
    performance_potential_grid VARCHAR(20), -- high_performer_high_potential, etc.
    
    -- Recommendations
    promotion_recommended BOOLEAN DEFAULT FALSE,
    salary_revision_recommended BOOLEAN DEFAULT FALSE,
    recommended_increment_percentage DECIMAL(5,2),
    
    pip_recommended BOOLEAN DEFAULT FALSE, -- Performance Improvement Plan
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft',
    -- draft, self_completed, manager_in_progress, completed, acknowledged, calibrated
    
    -- Dates
    review_period_start DATE,
    review_period_end DATE,
    
    self_assessment_submitted_date TIMESTAMP,
    manager_review_submitted_date TIMESTAMP,
    completed_date TIMESTAMP,
    
    -- Acknowledgement
    acknowledged_by_employee BOOLEAN DEFAULT FALSE,
    employee_acknowledgement_date TIMESTAMP,
    employee_signature VARCHAR(500),
    
    acknowledged_by_manager BOOLEAN DEFAULT FALSE,
    manager_acknowledgement_date TIMESTAMP,
    
    -- Calibration
    is_calibrated BOOLEAN DEFAULT FALSE,
    pre_calibration_rating DECIMAL(3,2),
    post_calibration_rating DECIMAL(3,2),
    calibration_notes TEXT,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    UNIQUE(employee_id, cycle_id, review_type)
);

CREATE INDEX idx_perf_reviews_emp ON performance_reviews(employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_perf_reviews_cycle ON performance_reviews(cycle_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_perf_reviews_reviewer ON performance_reviews(reviewer_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_perf_reviews_status ON performance_reviews(status);

-- Review Rating Details (Detailed ratings for KRA/Competencies)
CREATE TABLE review_rating_details (
    rating_detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    review_id UUID NOT NULL REFERENCES performance_reviews(review_id) ON DELETE CASCADE,
    
    rating_category VARCHAR(50) NOT NULL, -- kra, competency, skill, goal, behavior
    category_item_id UUID NOT NULL, -- References KRA/Competency/Skill/Goal
    category_item_name VARCHAR(200),
    
    -- Ratings
    self_rating DECIMAL(3,2),
    manager_rating DECIMAL(3,2),
    final_rating DECIMAL(3,2),
    
    weight_percentage DECIMAL(5,2),
    weighted_score DECIMAL(5,2),
    
    -- Comments
    self_comments TEXT,
    manager_comments TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_review_rating_details_review ON review_rating_details(review_id);

-- Feedback (Continuous Feedback)
CREATE TABLE feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    feedback_for_employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    feedback_by_employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    feedback_type VARCHAR(50) NOT NULL, 
    -- peer, upward, manager, 360, continuous, appreciation, constructive
    
    feedback_category VARCHAR(50), -- positive, constructive, appreciation, concern
    
    feedback_text TEXT NOT NULL,
    
    -- Context
    situation TEXT,
    behavior TEXT,
    impact TEXT, -- SBI Model: Situation-Behavior-Impact
    
    is_anonymous BOOLEAN DEFAULT FALSE,
    
    -- Competencies/Skills mentioned
    competency_ids UUID[],
    skill_ids UUID[],
    
    -- Related To
    related_to_review_id UUID REFERENCES performance_reviews(review_id),
    related_to_goal_id UUID REFERENCES goals(goal_id),
    related_to_project VARCHAR(200),
    
    -- Visibility
    is_private BOOLEAN DEFAULT FALSE,
    visible_to_manager BOOLEAN DEFAULT TRUE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'submitted', -- draft, submitted, acknowledged, archived
    
    feedback_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Acknowledgement
    acknowledged_by_recipient BOOLEAN DEFAULT FALSE,
    acknowledged_date TIMESTAMP,
    recipient_response TEXT,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_for_emp ON feedback(feedback_for_employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_feedback_by_emp ON feedback(feedback_by_employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_feedback_date ON feedback(feedback_date DESC);

-- Performance Improvement Plans (PIP)
CREATE TABLE performance_improvement_plans (
    pip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES employees(employee_id),
    review_id UUID REFERENCES performance_reviews(review_id),
    
    pip_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Period
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_weeks INTEGER,
    
    -- Performance Issues
    performance_issues TEXT NOT NULL,
    improvement_areas TEXT NOT NULL,
    
    -- Goals & Expectations
    expected_improvements TEXT NOT NULL,
    success_criteria TEXT NOT NULL,
    
    -- Support
    support_provided TEXT,
    resources_provided TEXT,
    training_required TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',
    -- active, extended, successfully_completed, unsuccessfully_completed, terminated
    
    -- Outcome
    outcome VARCHAR(20), -- successful, unsuccessful, extended
    outcome_date DATE,
    outcome_notes TEXT,
    
    -- Actions
    action_taken VARCHAR(50), -- continued, promoted, terminated, role_change
    
    -- HR Notes
    hr_notes TEXT,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pip_emp ON performance_improvement_plans(employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_pip_status ON performance_improvement_plans(status);

-- PIP Check-ins
CREATE TABLE pip_check_ins (
    check_in_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    pip_id UUID NOT NULL REFERENCES performance_improvement_plans(pip_id) ON DELETE CASCADE,
    
    check_in_date DATE NOT NULL,
    check_in_week INTEGER,
    
    progress_summary TEXT NOT NULL,
    improvements_observed TEXT,
    concerns TEXT,
    
    manager_feedback TEXT,
    employee_response TEXT,
    
    next_steps TEXT,
    
    conducted_by UUID REFERENCES employees(employee_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pip_checkins_pip ON pip_check_ins(pip_id, check_in_date);

-- =====================================================
-- SECTION 13: RECRUITMENT/HIRING
-- =====================================================

-- Job Requisitions (Job Opening Requests)
CREATE TABLE job_requisitions (
    requisition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    
    requisition_number VARCHAR(50) UNIQUE NOT NULL,
    
    job_title VARCHAR(200) NOT NULL,
    
    department_id UUID REFERENCES departments(department_id),
    designation_id UUID REFERENCES designations(designation_id),
    location_id UUID REFERENCES locations(location_id),
    
    number_of_positions INTEGER NOT NULL DEFAULT 1,
    
    employment_type VARCHAR(50), -- full_time, part_time, contract, intern
    
    requisition_type VARCHAR(50), -- new_position, replacement, backfill
    
    -- If replacement
    replacing_employee_id UUID REFERENCES employees(employee_id),
    reason_for_replacement TEXT,
    
    -- Justification
    business_justification TEXT NOT NULL,
    
    -- Budget
    budget_approved BOOLEAN DEFAULT FALSE,
    budgeted_salary_min DECIMAL(12,2),
    budgeted_salary_max DECIMAL(12,2),
    currency VARCHAR(3),
    
    -- Timeline
    required_by_date DATE,
    
    -- Priority
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    
    -- Approval Workflow
    status VARCHAR(20) DEFAULT 'draft',
    -- draft, pending_approval, approved, rejected, on_hold, cancelled, fulfilled
    
    requested_by UUID REFERENCES employees(employee_id),
    requested_date DATE DEFAULT CURRENT_DATE,
    
    approved_by UUID REFERENCES employees(employee_id),
    approved_date DATE,
    rejection_reason TEXT,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_requisitions_company ON job_requisitions(company_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_job_requisitions_status ON job_requisitions(status);

-- Job Postings
CREATE TABLE job_postings (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    
    requisition_id UUID REFERENCES job_requisitions(requisition_id),
    
    job_code VARCHAR(50) UNIQUE NOT NULL,
    job_title VARCHAR(200) NOT NULL,
    
    department_id UUID REFERENCES departments(department_id),
    designation_id UUID REFERENCES designations(designation_id),
    location_id UUID REFERENCES locations(location_id),
    
    -- Job Details
    job_description TEXT NOT NULL,
    responsibilities TEXT NOT NULL,
    requirements TEXT NOT NULL,
    qualifications TEXT NOT NULL,
    
    preferred_skills TEXT,
    nice_to_have TEXT,
    
    -- Employment Details
    employment_type VARCHAR(50) NOT NULL,
    work_mode VARCHAR(50), -- on_site, remote, hybrid
    
    experience_min_years DECIMAL(4,2),
    experience_max_years DECIMAL(4,2),
    
    -- Compensation
    salary_min DECIMAL(12,2),
    salary_max DECIMAL(12,2),
    currency VARCHAR(3),
    is_salary_disclosed BOOLEAN DEFAULT FALSE,
    
    -- Benefits
    benefits TEXT,
    
    -- Positions
    number_of_positions INTEGER DEFAULT 1,
    positions_filled INTEGER DEFAULT 0,
    
    -- Hiring Team
    hiring_manager_id UUID REFERENCES employees(employee_id),
    recruiter_id UUID REFERENCES employees(employee_id),
    
    hiring_team_ids UUID[], -- Additional team members
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft',
    -- draft, open, on_hold, closed, cancelled, filled
    
    -- Publishing
    is_internal_posting BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    published_date DATE,
    
    posting_channels TEXT[], -- company_website, linkedin, indeed, internal
    
    -- Timeline
    posted_date DATE,
    closing_date DATE,
    expected_joining_date DATE,
    
    -- Application Settings
    requires_resume BOOLEAN DEFAULT TRUE,
    requires_cover_letter BOOLEAN DEFAULT FALSE,
    requires_portfolio BOOLEAN DEFAULT FALSE,
    
    application_form_fields JSONB,
    screening_questions JSONB,
    
    -- SEO
    job_category VARCHAR(100),
    job_tags TEXT[],
    
    -- Analytics
    views_count INTEGER DEFAULT 0,
    applications_count INTEGER DEFAULT 0,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID
);

CREATE INDEX idx_job_postings_company ON job_postings(company_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_job_postings_status ON job_postings(status) WHERE is_published = TRUE;
CREATE INDEX idx_job_postings_dates ON job_postings(posted_date, closing_date);

-- Candidates
CREATE TABLE candidates (
    candidate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    candidate_code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(300) GENERATED ALWAYS AS (
        TRIM(CONCAT(first_name, ' ', COALESCE(middle_name, ''), ' ', last_name))
    ) STORED,
    
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    alternate_phone VARCHAR(20),
    
    date_of_birth DATE,
    gender VARCHAR(20),
    
    -- Current Details
    current_company VARCHAR(200),
    current_designation VARCHAR(100),
    current_location VARCHAR(100),
    
    total_experience DECIMAL(4,2),
    relevant_experience DECIMAL(4,2),
    
    current_salary DECIMAL(12,2),
    expected_salary DECIMAL(12,2),
    currency VARCHAR(3),
    
    notice_period_days INTEGER,
    last_working_day DATE,
    can_join_immediately BOOLEAN DEFAULT FALSE,
    
    -- Documents
    resume_url VARCHAR(500),
    cover_letter_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    
    -- Social Profiles
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    twitter_url VARCHAR(500),
    personal_website VARCHAR(500),
    
    -- Source
    source VARCHAR(50), 
    -- job_portal, linkedin, referral, direct, career_page, recruiter, agency
    
    source_details VARCHAR(200),
    referrer_employee_id UUID REFERENCES employees(employee_id),
    
    -- Location Preferences
    current_city VARCHAR(100),
    preferred_locations TEXT[],
    willing_to_relocate BOOLEAN DEFAULT FALSE,
    
    -- Education
    highest_qualification VARCHAR(100),
    
    -- Skills
    skills TEXT[],
    
    -- Status
    status VARCHAR(20) DEFAULT 'new',
    -- new, screening, interviewing, offered, hired, rejected, withdrawn, on_hold
    
    overall_rating DECIMAL(3,2),
    
    -- Tags
    tags TEXT[],
    
    -- Privacy
    gdpr_consent BOOLEAN DEFAULT FALSE,
    gdpr_consent_date TIMESTAMP,
    data_retention_until DATE,
    
    -- Blacklist
    is_blacklisted BOOLEAN DEFAULT FALSE,
    blacklist_reason TEXT,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    UNIQUE(organization_id, email)
);

CREATE INDEX idx_candidates_org ON candidates(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_candidates_email ON candidates(email) WHERE is_deleted = FALSE;
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_fullname ON candidates(full_name);

-- Job Applications
CREATE TABLE job_applications (
    application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    application_number VARCHAR(50) UNIQUE NOT NULL,
    
    job_id UUID NOT NULL REFERENCES job_postings(job_id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(candidate_id) ON DELETE CASCADE,
    
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Application Data
    cover_letter TEXT,
    application_form_data JSONB,
    screening_answers JSONB,
    
    -- Status & Stage
    application_status VARCHAR(20) DEFAULT 'applied',
    -- applied, screening, shortlisted, interviewing, offered, hired, rejected, withdrawn
    
    current_stage VARCHAR(50) DEFAULT 'application_review',
    -- application_review, phone_screen, technical_test, technical_interview, 
    -- hr_interview, final_interview, reference_check, offer, hired
    
    -- Assignment
    assigned_recruiter_id UUID REFERENCES employees(employee_id),
    assigned_date TIMESTAMP,
    
    -- Screening
    is_shortlisted BOOLEAN DEFAULT FALSE,
    shortlisted_date TIMESTAMP,
    shortlisted_by UUID REFERENCES employees(employee_id),
    
    -- Ratings
    overall_rating DECIMAL(3,2),
    technical_rating DECIMAL(3,2),
    cultural_fit_rating DECIMAL(3,2),
    communication_rating DECIMAL(3,2),
    
    -- Rejection
    is_rejected BOOLEAN DEFAULT FALSE,
    rejected_date TIMESTAMP,
    rejected_by UUID REFERENCES employees(employee_id),
    rejection_stage VARCHAR(50),
    rejection_reason TEXT,
    rejection_category VARCHAR(50), -- not_qualified, cultural_fit, compensation, other
    
    can_reapply BOOLEAN DEFAULT TRUE,
    reapply_after_months INTEGER DEFAULT 6,
    
    -- Offer
    offer_extended BOOLEAN DEFAULT FALSE,
    offer_date DATE,
    
    -- Hired
    is_hired BOOLEAN DEFAULT FALSE,
    hired_date DATE,
    employee_id UUID REFERENCES employees(employee_id),
    
    -- Withdrawal
    is_withdrawn BOOLEAN DEFAULT FALSE,
    withdrawn_date TIMESTAMP,
    withdrawal_reason TEXT,
    
    -- Notes
    recruiter_notes TEXT,
    internal_notes TEXT,
    
    -- Analytics
    time_to_hire_days INTEGER,
    time_to_interview_days INTEGER,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(job_id, candidate_id)
);

CREATE INDEX idx_job_applications_job ON job_applications(job_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_job_applications_candidate ON job_applications(candidate_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_job_applications_status ON job_applications(application_status, current_stage);
CREATE INDEX idx_job_applications_recruiter ON job_applications(assigned_recruiter_id);

-- Interview Rounds/Templates
CREATE TABLE interview_rounds (
    round_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    round_name VARCHAR(100) NOT NULL,
    round_code VARCHAR(50) NOT NULL,
    
    job_id UUID REFERENCES job_postings(job_id) ON DELETE CASCADE,
    
    round_sequence INTEGER NOT NULL DEFAULT 1,
    
    round_type VARCHAR(50) NOT NULL,
    -- phone_screen, technical_test, coding_test, technical_interview, 
    -- hr_interview, behavioral_interview, panel_interview, case_study
    
    interview_mode VARCHAR(20), -- phone, video, in_person, online_test
    
    duration_minutes INTEGER DEFAULT 60,
    
    description TEXT,
    
    -- Evaluation
    evaluation_criteria JSONB,
    scorecard_template_id UUID,
    
    is_required BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, round_code)
);

CREATE INDEX idx_interview_rounds_org ON interview_rounds(organization_id) WHERE is_active = TRUE;
CREATE INDEX idx_interview_rounds_job ON interview_rounds(job_id);

-- Interview Schedules
CREATE TABLE interview_schedules (
    interview_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    application_id UUID NOT NULL REFERENCES job_applications(application_id) ON DELETE CASCADE,
    round_id UUID REFERENCES interview_rounds(round_id),
    
    interview_title VARCHAR(200),
    interview_type VARCHAR(50),
    
    -- Schedule
    interview_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER,
    timezone VARCHAR(50),
    
    -- Mode
    interview_mode VARCHAR(20) NOT NULL, -- video, in_person, phone, online_test
    
    -- Location/Meeting
    location VARCHAR(255),
    meeting_link VARCHAR(500),
    meeting_id VARCHAR(100),
    meeting_password VARCHAR(100),
    
    meeting_instructions TEXT,
    
    -- Interviewers
    interviewer_ids UUID[] NOT NULL,
    primary_interviewer_id UUID REFERENCES employees(employee_id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled',
    -- scheduled, rescheduled, completed, cancelled, no_show
    
    -- Candidate Confirmation
    candidate_confirmed BOOLEAN DEFAULT FALSE,
    candidate_confirmation_date TIMESTAMP,
    
    -- Completion
    completed_date TIMESTAMP,
    
    -- Feedback
    feedback_submitted_count INTEGER DEFAULT 0,
    total_interviewers_count INTEGER,
    all_feedback_received BOOLEAN DEFAULT FALSE,
    
    -- Reschedule
    reschedule_count INTEGER DEFAULT 0,
    reschedule_reason TEXT,
    original_interview_id UUID REFERENCES interview_schedules(interview_id),
    
    -- Cancellation
    cancelled_by UUID REFERENCES users(user_id),
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    
    -- No Show
    is_no_show BOOLEAN DEFAULT FALSE,
    no_show_by VARCHAR(20), -- candidate, interviewer
    
    -- Reminders
    reminder_sent_to_candidate BOOLEAN DEFAULT FALSE,
    reminder_sent_to_interviewers BOOLEAN DEFAULT FALSE,
    
    -- Notes
    internal_notes TEXT,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interview_schedules_app ON interview_schedules(application_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_interview_schedules_date ON interview_schedules(interview_date, start_time);
CREATE INDEX idx_interview_schedules_status ON interview_schedules(status);

-- Interview Feedback/Evaluation
CREATE TABLE interview_feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    interview_id UUID NOT NULL REFERENCES interview_schedules(interview_id) ON DELETE CASCADE,
    interviewer_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    
    -- Overall Assessment
    overall_rating DECIMAL(3,2) NOT NULL,
    
    -- Specific Ratings
    technical_skills_rating DECIMAL(3,2),
    problem_solving_rating DECIMAL(3,2),
    communication_rating DECIMAL(3,2),
    cultural_fit_rating DECIMAL(3,2),
    leadership_rating DECIMAL(3,2),
    attitude_rating DECIMAL(3,2),
    
    -- Detailed Feedback
    strengths TEXT,
    weaknesses TEXT,
    detailed_feedback TEXT NOT NULL,
    
    key_observations TEXT,
    
    -- Skills Assessment
    skills_evaluated JSONB,
    
    -- Questions Asked
    questions_asked TEXT,
    candidate_responses TEXT,
    
    -- Recommendation
    recommendation VARCHAR(20) NOT NULL,
    -- strong_hire, hire, maybe, no_hire, strong_no_hire
    
    recommendation_notes TEXT,
    
    -- Next Steps
    next_round_recommended BOOLEAN,
    suggested_next_round VARCHAR(100),
    
    concerns TEXT,
    
    -- Submitted
    is_submitted BOOLEAN DEFAULT FALSE,
    submitted_date TIMESTAMP,
    
    -- Time Tracking
    actual_duration_minutes INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(interview_id, interviewer_id)
);

CREATE INDEX idx_interview_feedback_interview ON interview_feedback(interview_id);
CREATE INDEX idx_interview_feedback_interviewer ON interview_feedback(interviewer_id);

-- Assessment Tests
CREATE TABLE assessment_tests (
    test_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    test_name VARCHAR(200) NOT NULL,
    test_code VARCHAR(50) NOT NULL,
    
    test_type VARCHAR(50), -- coding, technical, aptitude, personality, case_study
    
    description TEXT,
    instructions TEXT,
    
    duration_minutes INTEGER,
    
    -- Platform
    platform_name VARCHAR(100), -- HackerRank, Codility, Internal, etc.
    platform_test_id VARCHAR(200),
    
    passing_score DECIMAL(5,2),
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    
    UNIQUE(organization_id, test_code)
);

CREATE INDEX idx_assessment_tests_org ON assessment_tests(organization_id) WHERE is_active = TRUE;

-- Candidate Assessments
CREATE TABLE candidate_assessments (
    assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    application_id UUID NOT NULL REFERENCES job_applications(application_id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES assessment_tests(test_id),
    
    -- Invitation
    invited_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invited_by UUID REFERENCES employees(employee_id),
    
    test_link VARCHAR(500),
    access_code VARCHAR(100),
    
    -- Validity
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    
    -- Attempt
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    time_taken_minutes INTEGER,
    
    -- Results
    score DECIMAL(5,2),
    max_score DECIMAL(5,2),
    percentage DECIMAL(5,2),
    
    passed BOOLEAN,
    
    result_details JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'invited',
    -- invited, in_progress, completed, expired, cancelled
    
    -- Report
    report_url VARCHAR(500),
    
    -- Proctoring
    is_proctored BOOLEAN DEFAULT FALSE,
    proctoring_flags JSONB,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_candidate_assessments_app ON candidate_assessments(application_id);
CREATE INDEX idx_candidate_assessments_status ON candidate_assessments(status);

-- Offer Letters
CREATE TABLE offer_letters (
    offer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    
    offer_number VARCHAR(50) UNIQUE NOT NULL,
    
    application_id UUID NOT NULL REFERENCES job_applications(application_id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(candidate_id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES job_postings(job_id),
    
    -- Offer Details
    designation_id UUID REFERENCES designations(designation_id),
    department_id UUID REFERENCES departments(department_id),
    location_id UUID REFERENCES locations(location_id),
    
    employment_type VARCHAR(50),
    
    -- Dates
    offer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    offer_valid_until DATE NOT NULL,
    
    expected_joining_date DATE,
    actual_joining_date DATE,
    
    -- Compensation
    annual_ctc DECIMAL(12,2) NOT NULL,
    monthly_gross DECIMAL(12,2),
    monthly_net DECIMAL(12,2),
    currency VARCHAR(3),
    
    compensation_breakdown JSONB,
    
    -- Benefits
    benefits TEXT,
    
    -- Probation
    probation_period_months INTEGER DEFAULT 3,
    
    -- Notice Period
    notice_period_days INTEGER,
    
    -- Document
    offer_letter_template_id UUID,
    offer_letter_url VARCHAR(500),
    
    -- Additional Documents
    additional_documents JSONB,
    
    -- Terms & Conditions
    terms_and_conditions TEXT,
    special_terms TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft',
    -- draft, sent, viewed, accepted, rejected, withdrawn, expired, converted_to_employee
    
    -- Tracking
    sent_date TIMESTAMP,
    sent_by UUID REFERENCES employees(employee_id),
    
    viewed_date TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    
    -- Response
    response_date TIMESTAMP,
    accepted_date TIMESTAMP,
    rejected_date TIMESTAMP,
    
    rejection_reason TEXT,
    counter_offer_details TEXT,
    
    -- Negotiation
    negotiation_count INTEGER DEFAULT 0,
    negotiation_notes TEXT,
    
    -- Withdrawal
    withdrawn_date TIMESTAMP,
    withdrawn_by UUID REFERENCES employees(employee_id),
    withdrawal_reason TEXT,
    
    -- Approval
    approved_by UUID REFERENCES employees(employee_id),
    approved_date TIMESTAMP,
    
    -- Employee Record
    employee_id UUID REFERENCES employees(employee_id),
    employee_created_date DATE,
    
    -- Notes
    internal_notes TEXT,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_offer_letters_app ON offer_letters(application_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_offer_letters_candidate ON offer_letters(candidate_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_offer_letters_status ON offer_letters(status);
CREATE INDEX idx_offer_letters_dates ON offer_letters(offer_date, expected_joining_date);

-- Background Verification
CREATE TABLE background_verifications (
    verification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    candidate_id UUID NOT NULL REFERENCES candidates(candidate_id) ON DELETE CASCADE,
    offer_id UUID REFERENCES offer_letters(offer_id),
    
    verification_type VARCHAR(50),
    -- identity, address, education, employment, criminal, credit, reference
    
    verification_provider VARCHAR(100),
    provider_reference_number VARCHAR(100),
    
    initiated_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_date DATE,
    
    status VARCHAR(20) DEFAULT 'initiated',
    -- initiated, in_progress, completed, discrepancy_found, failed
    
    result VARCHAR(20), -- clear, minor_discrepancy, major_discrepancy, not_verified
    
    verification_details JSONB,
    discrepancy_details TEXT,
    
    report_url VARCHAR(500),
    
    verified_by UUID REFERENCES employees(employee_id),
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bg_verifications_candidate ON background_verifications(candidate_id);
CREATE INDEX idx_bg_verifications_status ON background_verifications(status);

-- Reference Checks
CREATE TABLE reference_checks (
    reference_check_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    candidate_id UUID NOT NULL REFERENCES candidates(candidate_id) ON DELETE CASCADE,
    application_id UUID REFERENCES job_applications(application_id),
    
    -- Reference Details
    reference_name VARCHAR(100) NOT NULL,
    reference_company VARCHAR(200),
    reference_designation VARCHAR(100),
    reference_email VARCHAR(255),
    reference_phone VARCHAR(20),
    
    relationship VARCHAR(50), -- manager, colleague, client, mentor
    
    -- Check Details
    check_date DATE,
    checked_by UUID REFERENCES employees(employee_id),
    
    -- Questions & Responses
    questions_asked JSONB,
    responses JSONB,
    
    -- Ratings
    overall_rating DECIMAL(3,2),
    work_quality_rating DECIMAL(3,2),
    teamwork_rating DECIMAL(3,2),
    reliability_rating DECIMAL(3,2),
    
    would_rehire BOOLEAN,
    
    -- Feedback
    strengths TEXT,
    areas_of_improvement TEXT,
    additional_comments TEXT,
    
    -- Red Flags
    red_flags TEXT,
    concerns TEXT,
    
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, completed, unable_to_reach, declined
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reference_checks_candidate ON reference_checks(candidate_id);
CREATE INDEX idx_reference_checks_app ON reference_checks(application_id);

-- Recruitment Pipeline Analytics
CREATE VIEW vw_recruitment_pipeline AS
SELECT 
    jp.job_id,
    jp.job_code,
    jp.job_title,
    jp.company_id,
    c.company_name,
    jp.department_id,
    d.department_name,
    jp.location_id,
    l.location_name,
    jp.status as job_status,
    jp.number_of_positions,
    COUNT(DISTINCT ja.application_id) as total_applications,
    COUNT(DISTINCT ja.application_id) FILTER (WHERE ja.application_status = 'applied') as new_applications,
    COUNT(DISTINCT ja.application_id) FILTER (WHERE ja.application_status = 'screening') as in_screening,
    COUNT(DISTINCT ja.application_id) FILTER (WHERE ja.is_shortlisted = TRUE) as shortlisted,
    COUNT(DISTINCT ja.application_id) FILTER (WHERE ja.application_status = 'interviewing') as in_interview,
    COUNT(DISTINCT ja.application_id) FILTER (WHERE ja.offer_extended = TRUE) as offers_extended,
    COUNT(DISTINCT ja.application_id) FILTER (WHERE ja.is_hired = TRUE) as hired,
    COUNT(DISTINCT ja.application_id) FILTER (WHERE ja.is_rejected = TRUE) as rejected,
    AVG(ja.time_to_hire_days) FILTER (WHERE ja.is_hired = TRUE) as avg_time_to_hire_days,
    jp.posted_date,
    jp.closing_date
FROM job_postings jp
LEFT JOIN companies c ON jp.company_id = c.company_id
LEFT JOIN departments d ON jp.department_id = d.department_id
LEFT JOIN locations l ON jp.location_id = l.location_id
LEFT JOIN job_applications ja ON jp.job_id = ja.job_id AND ja.is_deleted = FALSE
WHERE jp.is_deleted = FALSE
GROUP BY jp.job_id, jp.job_code, jp.job_title, jp.company_id, c.company_name, 
         jp.department_id, d.department_name, jp.location_id, l.location_name, 
         jp.status, jp.number_of_positions, jp.posted_date, jp.closing_date;

-- =====================================================
-- SECTION 14: ONBOARDING
-- =====================================================

-- Onboarding Programs/Templates
CREATE TABLE onboarding_programs (
    program_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(company_id) ON DELETE CASCADE,
    
    program_name VARCHAR(100) NOT NULL,
    program_code VARCHAR(50) NOT NULL,
    description TEXT,
    
    duration_days INTEGER NOT NULL DEFAULT 90,
    
    -- Applicability
    applicable_to VARCHAR(50) DEFAULT 'all',
    department_ids UUID[],
    designation_ids UUID[],
    location_ids UUID[],
    employment_types VARCHAR(50)[],
    
    -- Buddy Program
    assign_buddy BOOLEAN DEFAULT TRUE,
    
    -- Settings
    auto_assign_tasks BOOLEAN DEFAULT TRUE,
    send_welcome_email BOOLEAN DEFAULT TRUE,
    
    welcome_message TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, program_code)
);

CREATE INDEX idx_onboarding_programs_org ON onboarding_programs(organization_id) WHERE is_deleted = FALSE;

-- Onboarding Tasks/Checklist Items
CREATE TABLE onboarding_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    program_id UUID NOT NULL REFERENCES onboarding_programs(program_id) ON DELETE CASCADE,
    
    task_name VARCHAR(200) NOT NULL,
    task_description TEXT,
    
    task_category VARCHAR(50), -- hr, it, admin, training, documentation, meeting
    task_type VARCHAR(50), -- document, training, setup, meeting, survey
    
    -- Assignment
    assigned_to_role VARCHAR(50), -- hr, it, manager, buddy, employee, admin
    
    -- Timing
    due_days_after_joining INTEGER NOT NULL, -- Days after joining date
    
    -- Task Sequence
    task_sequence INTEGER DEFAULT 1,
    
    -- Requirements
    is_mandatory BOOLEAN DEFAULT TRUE,
    requires_document_upload BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    
    allowed_file_types VARCHAR(100),
    
    -- Instructions
    instructions TEXT,
    resource_links TEXT[],
    
    -- Completion Criteria
    completion_criteria TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_onboarding_tasks_program ON onboarding_tasks(program_id) WHERE is_active = TRUE;

-- Employee Onboarding
CREATE TABLE employee_onboarding (
    onboarding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES onboarding_programs(program_id) ON DELETE CASCADE,
    
    -- Dates
    joining_date DATE NOT NULL,
    expected_completion_date DATE NOT NULL,
    actual_completion_date DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'not_started',
    -- not_started, in_progress, completed, delayed, on_hold
    
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Tasks
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    pending_tasks INTEGER DEFAULT 0,
    
    -- Buddy
    buddy_id UUID REFERENCES employees(employee_id),
    
    -- Tracking
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Feedback
    onboarding_feedback_submitted BOOLEAN DEFAULT FALSE,
    onboarding_rating DECIMAL(3,2),
    onboarding_feedback TEXT,
    
    -- Notes
    notes TEXT,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(employee_id, program_id)
);

CREATE INDEX idx_emp_onboarding_emp ON employee_onboarding(employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_emp_onboarding_status ON employee_onboarding(status);

-- Onboarding Task Progress
CREATE TABLE onboarding_task_progress (
    progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    onboarding_id UUID NOT NULL REFERENCES employee_onboarding(onboarding_id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES onboarding_tasks(task_id) ON DELETE CASCADE,
    
    -- Assignment
    assigned_to_id UUID REFERENCES employees(employee_id),
    assigned_to_role VARCHAR(50),
    
    -- Timing
    due_date DATE NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, in_progress, completed, skipped, overdue
    
    started_date DATE,
    completion_date DATE,
    
    -- Document
    document_url VARCHAR(500),
    document_comments TEXT,
    
    -- Approval
    requires_approval BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN,
    approved_by UUID REFERENCES employees(employee_id),
    approved_at TIMESTAMP,
    approval_comments TEXT,
    rejection_reason TEXT,
    
    -- Notes
    completion_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(onboarding_id, task_id)
);

CREATE INDEX idx_onboarding_progress_onb ON onboarding_task_progress(onboarding_id);
CREATE INDEX idx_onboarding_progress_assigned ON onboarding_task_progress(assigned_to_id, status);
CREATE INDEX idx_onboarding_progress_due ON onboarding_task_progress(due_date) WHERE status IN ('pending', 'in_progress');

-- =====================================================
-- TRIGGERS FOR AUTOMATION
-- =====================================================

-- Auto-create onboarding tasks when employee joins
CREATE OR REPLACE FUNCTION trg_auto_create_onboarding_tasks()
RETURNS TRIGGER AS $
DECLARE
    v_task RECORD;
    v_assigned_to_id UUID;
BEGIN
    -- Create task progress for each task in the program
    FOR v_task IN 
        SELECT * FROM onboarding_tasks 
        WHERE program_id = NEW.program_id 
        AND is_active = TRUE
        ORDER BY task_sequence
    LOOP
        -- Determine who to assign the task to
        v_assigned_to_id := CASE 
            WHEN v_task.assigned_to_role = 'employee' THEN NEW.employee_id
            WHEN v_task.assigned_to_role = 'buddy' THEN NEW.buddy_id
            ELSE NULL
        END;
        
        INSERT INTO onboarding_task_progress (
            organization_id,
            onboarding_id,
            task_id,
            assigned_to_id,
            assigned_to_role,
            due_date,
            status,
            requires_approval
        ) VALUES (
            NEW.organization_id,
            NEW.onboarding_id,
            v_task.task_id,
            v_assigned_to_id,
            v_task.assigned_to_role,
            NEW.joining_date + v_task.due_days_after_joining,
            'pending',
            v_task.requires_approval
        );
    END LOOP;
    
    -- Update task counts
    UPDATE employee_onboarding
    SET total_tasks = (
        SELECT COUNT(*) FROM onboarding_task_progress 
        WHERE onboarding_id = NEW.onboarding_id
    )
    WHERE onboarding_id = NEW.onboarding_id;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_onboarding_tasks
    AFTER INSERT ON employee_onboarding
    FOR EACH ROW
    EXECUTE FUNCTION trg_auto_create_onboarding_tasks();

-- Update onboarding completion percentage
CREATE OR REPLACE FUNCTION trg_update_onboarding_progress()
RETURNS TRIGGER AS $
BEGIN
    UPDATE employee_onboarding
    SET 
        completed_tasks = (
            SELECT COUNT(*) FROM onboarding_task_progress 
            WHERE onboarding_id = NEW.onboarding_id AND status = 'completed'
        ),
        pending_tasks = (
            SELECT COUNT(*) FROM onboarding_task_progress 
            WHERE onboarding_id = NEW.onboarding_id AND status IN ('pending', 'in_progress')
        ),
        completion_percentage = (
            SELECT ROUND(
                (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / 
                 NULLIF(COUNT(*)::DECIMAL, 0)) * 100, 2
            )
            FROM onboarding_task_progress 
            WHERE onboarding_id = NEW.onboarding_id
        ),
        status = CASE 
            WHEN (SELECT COUNT(*) FROM onboarding_task_progress 
                  WHERE onboarding_id = NEW.onboarding_id AND status = 'completed') = 
                 (SELECT total_tasks FROM employee_onboarding WHERE onboarding_id = NEW.onboarding_id)
            THEN 'completed'
            WHEN (SELECT COUNT(*) FROM onboarding_task_progress 
                  WHERE onboarding_id = NEW.onboarding_id AND status IN ('in_progress', 'completed')) > 0
            THEN 'in_progress'
            ELSE status
        END,
        actual_completion_date = CASE 
            WHEN (SELECT COUNT(*) FROM onboarding_task_progress 
                  WHERE onboarding_id = NEW.onboarding_id AND status = 'completed') = 
                 (SELECT total_tasks FROM employee_onboarding WHERE onboarding_id = NEW.onboarding_id)
            THEN CURRENT_DATE
            ELSE actual_completion_date
        END,
        modified_at = CURRENT_TIMESTAMP
    WHERE onboarding_id = NEW.onboarding_id;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trg_onboarding_progress_update
    AFTER INSERT OR UPDATE ON onboarding_task_progress
    FOR EACH ROW
    EXECUTE FUNCTION trg_update_onboarding_progress();

-- Auto-generate unique numbers for requests
CREATE OR REPLACE FUNCTION generate_request_number(
    p_prefix VARCHAR,
    p_organization_id UUID,
    p_table_name VARCHAR,
    p_column_name VARCHAR
) RETURNS VARCHAR AS $
DECLARE
    v_year VARCHAR := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    v_sequence INTEGER;
    v_number VARCHAR;
BEGIN
    -- Get next sequence number for this year
    EXECUTE format(
        'SELECT COALESCE(MAX(
            CAST(
                SUBSTRING(%I FROM LENGTH(%L || ''-'' || %L || ''-'') + 1) 
                AS INTEGER
            )
        ), 0) + 1
        FROM %I
        WHERE organization_id = %L
        AND %I LIKE %L',
        p_column_name,
        p_prefix,
        v_year,
        p_table_name,
        p_organization_id,
        p_column_name,
        p_prefix || '-' || v_year || '-%'
    ) INTO v_sequence;
    
    v_number := p_prefix || '-' || v_year || '-' || LPAD(v_sequence::VARCHAR, 5, '0');
    
    RETURN v_number;
END;
$ LANGUAGE plpgsql;

-- Trigger to auto-generate leave request numbers
CREATE OR REPLACE FUNCTION trg_generate_leave_request_number()
RETURNS TRIGGER AS $
BEGIN
    IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
        NEW.request_number := generate_request_number(
            'LR',
            NEW.organization_id,
            'leave_requests',
            'request_number'
        );
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leave_request_number
    BEFORE INSERT ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION trg_generate_leave_request_number();

-- Similar triggers for other request numbers
CREATE OR REPLACE FUNCTION trg_generate_application_number()
RETURNS TRIGGER AS $
BEGIN
    IF NEW.application_number IS NULL OR NEW.application_number = '' THEN
        NEW.application_number := generate_request_number(
            'APP',
            NEW.organization_id,
            'job_applications',
            'application_number'
        );
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trg_application_number
    BEFORE INSERT ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION trg_generate_application_number();

-- =====================================================
-- UTILITY VIEWS
-- =====================================================

-- Employee Performance Summary
CREATE VIEW vw_employee_performance_summary AS
SELECT 
    e.employee_id,
    e.organization_id,
    e.company_id,
    e.employee_code,
    e.full_name,
    e.department_id,
    d.department_name,
    e.designation_id,
    des.designation_name,
    pr.cycle_id,
    pc.cycle_name,
    pr.review_type,
    pr.overall_rating,
    pr.rating_category,
    pr.status,
    COUNT(g.goal_id) as total_goals,
    COUNT(g.goal_id) FILTER (WHERE g.status = 'completed') as completed_goals,
    AVG(g.progress_percentage) as avg_goal_progress,
    pr.completed_date,
    pr.is_calibrated
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
LEFT JOIN designations des ON e.designation_id = des.designation_id
LEFT JOIN performance_reviews pr ON e.employee_id = pr.employee_id AND pr.is_deleted = FALSE
LEFT JOIN performance_cycles pc ON pr.cycle_id = pc.cycle_id
LEFT JOIN goals g ON e.employee_id = g.employee_id AND g.cycle_id = pr.cycle_id AND g.is_deleted = FALSE
WHERE e.is_deleted = FALSE
GROUP BY e.employee_id, e.organization_id, e.company_id, e.employee_code, e.full_name,
         e.department_id, d.department_name, e.designation_id, des.designation_name,
         pr.cycle_id, pc.cycle_name, pr.review_type, pr.overall_rating, pr.rating_category,
         pr.status, pr.completed_date, pr.is_calibrated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE performance_cycles IS 'Performance review cycles with configurable periods';
COMMENT ON TABLE goals IS 'SMART goals with progress tracking and alignment';
COMMENT ON TABLE performance_reviews IS 'Comprehensive performance reviews with ratings and feedback';
COMMENT ON TABLE job_postings IS 'Job openings with detailed requirements and hiring workflow';
COMMENT ON TABLE candidates IS 'Candidate database with GDPR compliance';
COMMENT ON TABLE job_applications IS 'Application tracking with stage management';
COMMENT ON TABLE interview_schedules IS 'Interview scheduling with multi-interviewer support';
COMMENT ON TABLE offer_letters IS 'Digital offer letters with acceptance tracking';
COMMENT ON TABLE employee_onboarding IS 'Structured onboarding programs with task management';

-- =====================================================
-- END OF PERFORMANCE & RECRUITMENT SCHEMA
-- =====================================================