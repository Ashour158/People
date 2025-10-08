-- =====================================================
-- Migration 0008: Feature Flags Framework
-- Support for incremental feature rollout and A/B testing
-- =====================================================

-- =====================================================
-- FEATURE FLAGS
-- =====================================================

CREATE TABLE IF NOT EXISTS feature_flags (
    flag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    flag_key VARCHAR(100) NOT NULL UNIQUE,
    flag_name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Flag Type
    flag_type VARCHAR(50) NOT NULL DEFAULT 'boolean', -- 'boolean', 'multivariate', 'percentage'
    
    -- Default Value
    default_enabled BOOLEAN DEFAULT FALSE,
    default_value JSONB,
    
    -- Targeting Rules (stored as JSON)
    -- Example: {"rules": [{"attribute": "organization_id", "operator": "in", "values": ["uuid1", "uuid2"]}]}
    targeting_rules JSONB,
    
    -- Multivariate Options (for A/B testing)
    -- Example: [{"key": "variant_a", "weight": 50}, {"key": "variant_b", "weight": 50}]
    variants JSONB,
    
    -- Percentage Rollout
    rollout_percentage INTEGER DEFAULT 0, -- 0-100
    
    -- Status
    is_enabled BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID REFERENCES users(user_id),
    archived_at TIMESTAMP
);

CREATE INDEX idx_feature_flags_key ON feature_flags(flag_key) WHERE is_archived = FALSE;
CREATE INDEX idx_feature_flags_enabled ON feature_flags(is_enabled) WHERE is_archived = FALSE;

COMMENT ON TABLE feature_flags IS 'Feature flag definitions for incremental rollout';

-- Organization-level Feature Overrides
CREATE TABLE IF NOT EXISTS feature_flag_overrides (
    override_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    flag_id UUID NOT NULL REFERENCES feature_flags(flag_id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Override Value
    is_enabled BOOLEAN NOT NULL,
    override_value JSONB,
    
    -- Override Reason
    reason TEXT,
    
    -- Expiry
    expires_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID REFERENCES users(user_id),
    
    CONSTRAINT unique_flag_org_override UNIQUE (flag_id, organization_id)
);

CREATE INDEX idx_feature_flag_overrides_flag ON feature_flag_overrides(flag_id);
CREATE INDEX idx_feature_flag_overrides_org ON feature_flag_overrides(organization_id);

COMMENT ON TABLE feature_flag_overrides IS 'Organization-specific feature flag overrides';

-- User-level Feature Overrides
CREATE TABLE IF NOT EXISTS feature_flag_user_overrides (
    override_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    flag_id UUID NOT NULL REFERENCES feature_flags(flag_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Override Value
    is_enabled BOOLEAN NOT NULL,
    override_value JSONB,
    
    -- Override Reason
    reason TEXT,
    
    -- Expiry
    expires_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    
    CONSTRAINT unique_flag_user_override UNIQUE (flag_id, user_id)
);

CREATE INDEX idx_feature_flag_user_overrides_flag ON feature_flag_user_overrides(flag_id);
CREATE INDEX idx_feature_flag_user_overrides_user ON feature_flag_user_overrides(user_id);

COMMENT ON TABLE feature_flag_user_overrides IS 'User-specific feature flag overrides for beta testing';

-- Feature Flag Evaluation Log (for analytics)
CREATE TABLE IF NOT EXISTS feature_flag_evaluations (
    evaluation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    flag_id UUID NOT NULL REFERENCES feature_flags(flag_id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Evaluation Result
    evaluated_value BOOLEAN NOT NULL,
    variant_key VARCHAR(100),
    
    -- Context
    evaluation_context JSONB,
    
    -- Metadata
    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Partitioned by date for efficient querying and archival
CREATE INDEX idx_feature_flag_evals_flag_date ON feature_flag_evaluations(flag_id, evaluated_at DESC);
CREATE INDEX idx_feature_flag_evals_org_date ON feature_flag_evaluations(organization_id, evaluated_at DESC) WHERE organization_id IS NOT NULL;

COMMENT ON TABLE feature_flag_evaluations IS 'Log of feature flag evaluations for analytics';

-- =====================================================
-- SEED DEFAULT FEATURE FLAGS
-- =====================================================

INSERT INTO feature_flags (flag_key, flag_name, description, flag_type, default_enabled, is_enabled) VALUES
-- Core HR Features
('feature.employee.bulk_import', 'Employee Bulk Import', 'Enable bulk employee import from CSV/Excel', 'boolean', TRUE, TRUE),
('feature.employee.advanced_search', 'Advanced Employee Search', 'Enable advanced search with filters', 'boolean', TRUE, TRUE),
('feature.employee.org_chart', 'Organization Chart', 'Enable interactive organization chart view', 'boolean', FALSE, FALSE),

-- Leave Management Features
('feature.leave.auto_approval', 'Leave Auto-Approval', 'Enable automatic approval for certain leave types', 'boolean', FALSE, FALSE),
('feature.leave.team_calendar', 'Team Leave Calendar', 'Enable team leave calendar view', 'boolean', TRUE, TRUE),
('feature.leave.accrual_system', 'Leave Accrual System', 'Enable leave accrual policy engine', 'boolean', FALSE, FALSE),

-- Attendance Features
('feature.attendance.geofencing', 'Attendance Geofencing', 'Enable location-based attendance tracking', 'boolean', FALSE, FALSE),
('feature.attendance.facial_recognition', 'Facial Recognition', 'Enable facial recognition for attendance', 'boolean', FALSE, FALSE),
('feature.attendance.shift_swapping', 'Shift Swapping', 'Enable employees to swap shifts', 'boolean', FALSE, FALSE),

-- Performance Management
('feature.performance.goals', 'Goal Management', 'Enable goal setting and tracking', 'boolean', FALSE, FALSE),
('feature.performance.reviews', 'Performance Reviews', 'Enable performance review cycles', 'boolean', FALSE, FALSE),
('feature.performance.360_feedback', '360-Degree Feedback', 'Enable 360-degree feedback', 'boolean', FALSE, FALSE),

-- Payroll
('feature.payroll.automation', 'Payroll Automation', 'Enable automated payroll processing', 'boolean', FALSE, FALSE),
('feature.payroll.tax_calculator', 'Tax Calculator', 'Enable automatic tax calculation', 'boolean', FALSE, FALSE),

-- Timesheet
('feature.timesheet.project_tracking', 'Project Time Tracking', 'Enable project-based timesheet', 'boolean', FALSE, FALSE),
('feature.timesheet.approval_workflow', 'Timesheet Approval', 'Enable timesheet approval workflow', 'boolean', FALSE, FALSE),

-- Advanced Features
('feature.advanced.workflow_engine', 'Workflow Engine', 'Enable custom workflow engine', 'boolean', FALSE, FALSE),
('feature.advanced.analytics', 'Advanced Analytics', 'Enable advanced HR analytics', 'boolean', FALSE, FALSE),
('feature.advanced.sso', 'Single Sign-On', 'Enable SSO integration', 'boolean', FALSE, FALSE),
('feature.advanced.api_integrations', 'API Integrations', 'Enable third-party API integrations', 'boolean', FALSE, FALSE),

-- Experimental Features
('feature.experimental.ai_assistant', 'AI Assistant', 'Enable AI-powered HR assistant', 'boolean', FALSE, FALSE),
('feature.experimental.predictive_analytics', 'Predictive Analytics', 'Enable AI-based predictive analytics', 'boolean', FALSE, FALSE)
ON CONFLICT (flag_key) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN feature_flags.targeting_rules IS 'JSON rules for targeting specific organizations/users';
COMMENT ON COLUMN feature_flags.variants IS 'Multivariate options for A/B testing';
COMMENT ON COLUMN feature_flags.rollout_percentage IS 'Percentage rollout (0-100) for gradual feature release';
