-- =====================================================
-- AI AND ML INTEGRATION SCHEMA
-- Database schema for AI/ML features
-- =====================================================

-- =====================================================
-- AI CONFIGURATION & SETTINGS
-- =====================================================

-- AI Service Configuration
CREATE TABLE ai_configurations (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Provider Settings
    ai_provider VARCHAR(50) DEFAULT 'openai', -- openai, azure, google, aws, custom
    api_endpoint VARCHAR(500),
    model_name VARCHAR(100),
    
    -- Feature Flags
    resume_parsing_enabled BOOLEAN DEFAULT FALSE,
    candidate_matching_enabled BOOLEAN DEFAULT FALSE,
    attrition_prediction_enabled BOOLEAN DEFAULT FALSE,
    performance_prediction_enabled BOOLEAN DEFAULT FALSE,
    sentiment_analysis_enabled BOOLEAN DEFAULT FALSE,
    chatbot_enabled BOOLEAN DEFAULT FALSE,
    skills_analysis_enabled BOOLEAN DEFAULT FALSE,
    
    -- Rate Limits
    daily_request_limit INTEGER DEFAULT 1000,
    hourly_request_limit INTEGER DEFAULT 100,
    
    -- Privacy Settings
    anonymize_data BOOLEAN DEFAULT TRUE,
    require_consent BOOLEAN DEFAULT TRUE,
    log_predictions BOOLEAN DEFAULT TRUE,
    
    -- Cache Settings
    cache_enabled BOOLEAN DEFAULT TRUE,
    cache_ttl_seconds INTEGER DEFAULT 86400,
    
    -- Cost Management
    monthly_budget_usd DECIMAL(10, 2),
    cost_per_request DECIMAL(10, 4),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_org_ai_config UNIQUE (organization_id)
);

-- AI Usage Tracking
CREATE TABLE ai_usage_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Request Details
    feature_type VARCHAR(50) NOT NULL, -- resume_parsing, candidate_matching, etc.
    api_endpoint VARCHAR(200),
    request_method VARCHAR(10),
    
    -- User Context
    user_id UUID,
    ip_address VARCHAR(45),
    
    -- Request/Response
    request_data JSONB,
    response_data JSONB,
    processing_time_ms INTEGER,
    
    -- Status
    status VARCHAR(20), -- success, error, rate_limited
    error_message TEXT,
    
    -- Cost Tracking
    tokens_used INTEGER,
    cost_usd DECIMAL(10, 4),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_usage_org ON ai_usage_logs(organization_id);
CREATE INDEX idx_ai_usage_feature ON ai_usage_logs(feature_type);
CREATE INDEX idx_ai_usage_date ON ai_usage_logs(created_at);
CREATE INDEX idx_ai_usage_cost ON ai_usage_logs(organization_id, created_at, cost_usd);

-- =====================================================
-- RESUME PARSING
-- =====================================================

-- Parsed Resumes Storage
CREATE TABLE parsed_resumes (
    parsed_resume_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Original File
    original_filename VARCHAR(255),
    file_path VARCHAR(500),
    file_type VARCHAR(50),
    file_size_bytes INTEGER,
    
    -- Parsed Data
    candidate_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    location VARCHAR(255),
    
    -- Professional Summary
    professional_summary TEXT,
    total_experience_years DECIMAL(4, 2),
    
    -- Skills
    skills JSONB, -- [{skill: "Python", proficiency: "Expert", years: 5}]
    skill_categories JSONB, -- {technical: [...], soft: [...], languages: [...]}
    
    -- Experience
    work_experience JSONB, -- [{company, title, duration, responsibilities, achievements}]
    
    -- Education
    education JSONB, -- [{degree, institution, year, gpa, major}]
    
    -- Certifications
    certifications JSONB, -- [{name, issuer, date, expiry}]
    
    -- Languages
    languages JSONB, -- [{language: "English", proficiency: "Native"}]
    
    -- Additional Info
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    
    -- Parsing Metadata
    parsing_method VARCHAR(50), -- openai, custom_nlp, rule_based
    parsing_confidence DECIMAL(5, 2), -- 0-100
    parsing_version VARCHAR(20),
    
    -- Status
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parsed_resumes_org ON parsed_resumes(organization_id);
CREATE INDEX idx_parsed_resumes_email ON parsed_resumes(email);
CREATE INDEX idx_parsed_resumes_created ON parsed_resumes(created_at DESC);

-- =====================================================
-- CANDIDATE MATCHING & SCORING
-- =====================================================

-- Candidate Match Scores
CREATE TABLE candidate_match_scores (
    score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Overall Score
    overall_score DECIMAL(5, 2) NOT NULL, -- 0-100
    recommendation VARCHAR(50), -- strong_fit, good_fit, potential_fit, not_recommended
    confidence_level DECIMAL(5, 2), -- 0-100
    
    -- Component Scores
    skills_match_score DECIMAL(5, 2),
    experience_match_score DECIMAL(5, 2),
    education_match_score DECIMAL(5, 2),
    location_match_score DECIMAL(5, 2),
    cultural_fit_score DECIMAL(5, 2),
    
    -- Detailed Analysis
    matched_skills JSONB, -- [{skill, required_level, candidate_level}]
    skill_gaps JSONB, -- [{skill, required_level, gap}]
    strengths JSONB, -- [strength1, strength2, ...]
    concerns JSONB, -- [concern1, concern2, ...]
    
    -- Recommendations
    interview_focus_areas TEXT[],
    suggested_questions TEXT[],
    training_recommendations TEXT[],
    
    -- Metadata
    model_version VARCHAR(20),
    calculation_method VARCHAR(50),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    review_feedback TEXT
);

CREATE INDEX idx_match_scores_org ON candidate_match_scores(organization_id);
CREATE INDEX idx_match_scores_score ON candidate_match_scores(overall_score DESC);
CREATE INDEX idx_match_scores_calculated ON candidate_match_scores(calculated_at DESC);

-- =====================================================
-- ATTRITION PREDICTION
-- =====================================================

-- Employee Attrition Risk Scores
CREATE TABLE attrition_predictions (
    prediction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID,
    
    -- Risk Assessment
    risk_score DECIMAL(5, 2) NOT NULL, -- 0-100
    risk_level VARCHAR(20) NOT NULL, -- low, medium, high, critical
    confidence DECIMAL(5, 2), -- 0-100
    
    -- Predicted Timeline
    predicted_exit_date DATE,
    prediction_timeframe VARCHAR(50), -- within_month, 1-3_months, 3-6_months, 6-12_months
    
    -- Contributing Factors
    contributing_factors JSONB, -- [{factor, weight, score, description}]
    risk_indicators JSONB, -- {tenure_risk, performance_risk, engagement_risk, etc.}
    
    -- Data Sources
    data_points_analyzed JSONB, -- {performance_reviews: 5, attendance: 250, surveys: 3}
    analysis_date_range JSONB, -- {from: date, to: date}
    
    -- Recommendations
    retention_actions JSONB, -- [{action, priority, expected_impact, estimated_cost}]
    manager_talking_points TEXT[],
    intervention_urgency VARCHAR(20), -- immediate, soon, monitor
    
    -- Metadata
    model_version VARCHAR(20),
    prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Status & Review
    is_active BOOLEAN DEFAULT TRUE,
    review_notes TEXT,
    actions_taken JSONB,
    
    -- Outcome Tracking
    actual_exit_date DATE,
    prediction_accuracy VARCHAR(20) -- correct, incorrect, prevented
);

CREATE INDEX idx_attrition_org ON attrition_predictions(organization_id);
CREATE INDEX idx_attrition_employee ON attrition_predictions(employee_id);
CREATE INDEX idx_attrition_risk ON attrition_predictions(risk_level, is_active);
CREATE INDEX idx_attrition_date ON attrition_predictions(prediction_date DESC);
CREATE INDEX idx_attrition_high_risk ON attrition_predictions(organization_id, risk_level) WHERE risk_level IN ('high', 'critical');

-- =====================================================
-- PERFORMANCE PREDICTION
-- =====================================================

-- Employee Performance Predictions
CREATE TABLE performance_predictions (
    prediction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID,
    
    -- Prediction Details
    predicted_rating VARCHAR(50), -- excellent, good, meets_expectations, needs_improvement
    predicted_score DECIMAL(5, 2), -- 0-100
    confidence DECIMAL(5, 2), -- 0-100
    
    -- Performance Indicators
    trend_direction VARCHAR(20), -- improving, stable, declining
    trend_strength DECIMAL(5, 2), -- 0-100
    performance_velocity DECIMAL(10, 2), -- rate of change
    
    -- Goal Achievement Likelihood
    goal_completion_probability JSONB, -- [{goal_id, probability, concerns}]
    
    -- Contributing Factors
    performance_factors JSONB, -- [{factor, impact, trend}]
    strengths JSONB,
    areas_for_improvement JSONB,
    
    -- Recommendations
    development_recommendations JSONB, -- [{area, actions, priority}]
    training_suggestions TEXT[],
    mentoring_needs BOOLEAN,
    
    -- High-Potential Indicators
    high_potential_score DECIMAL(5, 2),
    promotion_readiness VARCHAR(50), -- ready, needs_development, not_ready
    succession_candidate BOOLEAN,
    
    -- Metadata
    prediction_for_period VARCHAR(50), -- next_quarter, next_half, next_year
    model_version VARCHAR(20),
    prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Outcome Tracking
    actual_rating VARCHAR(50),
    actual_score DECIMAL(5, 2),
    prediction_accuracy DECIMAL(5, 2)
);

CREATE INDEX idx_performance_pred_org ON performance_predictions(organization_id);
CREATE INDEX idx_performance_pred_employee ON performance_predictions(employee_id);
CREATE INDEX idx_performance_pred_date ON performance_predictions(prediction_date DESC);

-- =====================================================
-- SENTIMENT ANALYSIS
-- =====================================================

-- Sentiment Analysis Results
CREATE TABLE sentiment_analyses (
    analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Source
    source_type VARCHAR(50) NOT NULL, -- survey_response, feedback, review, exit_interview, pulse
    source_id UUID,
    employee_id UUID,
    department_id UUID,
    
    -- Text Content
    text_content TEXT NOT NULL,
    text_language VARCHAR(10),
    
    -- Sentiment Scores
    sentiment_score DECIMAL(5, 2), -- -100 (very negative) to +100 (very positive)
    sentiment_category VARCHAR(20), -- very_positive, positive, neutral, negative, very_negative
    confidence DECIMAL(5, 2), -- 0-100
    
    -- Emotion Detection
    emotions JSONB, -- {joy: 0.8, sadness: 0.1, anger: 0.0, fear: 0.1}
    dominant_emotion VARCHAR(50),
    
    -- Topic Extraction
    topics JSONB, -- [{topic, relevance, sentiment}]
    key_phrases TEXT[],
    entities JSONB, -- {people: [], organizations: [], locations: []}
    
    -- Categorization
    categories TEXT[], -- compensation, work_environment, management, career_growth
    intent VARCHAR(50), -- compliment, complaint, suggestion, question
    urgency VARCHAR(20), -- low, medium, high, critical
    
    -- Action Items
    requires_action BOOLEAN DEFAULT FALSE,
    action_type VARCHAR(50), -- follow_up, escalate, acknowledge, monitor
    suggested_response TEXT,
    
    -- Metadata
    analysis_method VARCHAR(50), -- openai, custom_model
    model_version VARCHAR(20),
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sentiment_org ON sentiment_analyses(organization_id);
CREATE INDEX idx_sentiment_employee ON sentiment_analyses(employee_id);
CREATE INDEX idx_sentiment_type ON sentiment_analyses(source_type);
CREATE INDEX idx_sentiment_score ON sentiment_analyses(sentiment_score);
CREATE INDEX idx_sentiment_date ON sentiment_analyses(analyzed_at DESC);
CREATE INDEX idx_sentiment_requires_action ON sentiment_analyses(organization_id, requires_action) WHERE requires_action = TRUE;

-- Sentiment Trends Aggregation
CREATE TABLE sentiment_trends (
    trend_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Aggregation Scope
    period VARCHAR(20) NOT NULL, -- daily, weekly, monthly, quarterly
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    department_id UUID,
    
    -- Aggregated Metrics
    average_sentiment DECIMAL(5, 2),
    sentiment_distribution JSONB, -- {very_positive: 20, positive: 40, neutral: 30, negative: 8, very_negative: 2}
    response_count INTEGER,
    
    -- Trends
    sentiment_change DECIMAL(5, 2), -- vs previous period
    trend_direction VARCHAR(20), -- improving, stable, declining
    
    -- Top Topics
    top_positive_topics JSONB,
    top_negative_topics JSONB,
    emerging_issues TEXT[],
    
    -- Metadata
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_sentiment_trend UNIQUE (organization_id, period, period_start, department_id)
);

CREATE INDEX idx_sentiment_trends_org ON sentiment_trends(organization_id);
CREATE INDEX idx_sentiment_trends_period ON sentiment_trends(period_start DESC);

-- =====================================================
-- SKILLS INTELLIGENCE
-- =====================================================

-- Skills Gap Analysis
CREATE TABLE skills_gap_analyses (
    analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    department_id UUID,
    
    -- Scope
    analysis_scope VARCHAR(50), -- organization, department, team, role
    scope_name VARCHAR(255),
    
    -- Current State
    current_skills JSONB, -- [{skill, proficiency_avg, employee_count}]
    skill_inventory_summary JSONB,
    
    -- Required Skills
    required_skills JSONB, -- [{skill, required_level, priority}]
    future_skills JSONB, -- skills needed for future initiatives
    
    -- Gap Analysis
    skill_gaps JSONB, -- [{skill, current_avg, required, gap_size, impact}]
    critical_gaps TEXT[],
    emerging_gaps TEXT[],
    
    -- Impact Assessment
    business_impact VARCHAR(50), -- low, medium, high, critical
    readiness_score DECIMAL(5, 2), -- 0-100
    risk_areas TEXT[],
    
    -- Recommendations
    training_recommendations JSONB, -- [{skill, program, cost, duration, priority}]
    hiring_recommendations JSONB, -- [{role, skills_needed, priority}]
    upskilling_candidates JSONB, -- [{employee_id, potential, recommended_path}]
    
    -- Cost Estimation
    estimated_training_cost DECIMAL(12, 2),
    estimated_hiring_cost DECIMAL(12, 2),
    estimated_timeline_months INTEGER,
    
    -- Metadata
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until DATE,
    model_version VARCHAR(20)
);

CREATE INDEX idx_skills_gap_org ON skills_gap_analyses(organization_id);
CREATE INDEX idx_skills_gap_dept ON skills_gap_analyses(department_id);
CREATE INDEX idx_skills_gap_date ON skills_gap_analyses(analysis_date DESC);

-- Learning Path Recommendations
CREATE TABLE learning_recommendations (
    recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID,
    
    -- Recommendation Context
    recommendation_type VARCHAR(50), -- skill_gap, career_growth, role_change, performance_improvement
    trigger_reason TEXT,
    priority VARCHAR(20), -- low, medium, high, critical
    
    -- Learning Path
    recommended_courses JSONB, -- [{course_id, course_name, provider, duration, cost}]
    learning_path JSONB, -- ordered sequence of courses
    estimated_completion_time VARCHAR(50),
    
    -- Skills Targeted
    target_skills JSONB, -- [{skill, current_level, target_level, importance}]
    skill_development_plan JSONB,
    
    -- Expected Outcomes
    expected_benefits TEXT[],
    career_impact VARCHAR(50),
    performance_impact VARCHAR(50),
    
    -- Personalization Factors
    learning_style VARCHAR(50),
    time_availability VARCHAR(50),
    budget_constraint DECIMAL(10, 2),
    
    -- Metadata
    model_version VARCHAR(20),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, in_progress, completed, rejected
    employee_feedback TEXT,
    completion_rate DECIMAL(5, 2)
);

CREATE INDEX idx_learning_rec_org ON learning_recommendations(organization_id);
CREATE INDEX idx_learning_rec_employee ON learning_recommendations(employee_id);
CREATE INDEX idx_learning_rec_status ON learning_recommendations(status);

-- =====================================================
-- CHATBOT / VIRTUAL ASSISTANT
-- =====================================================

-- Chatbot Conversations
CREATE TABLE chatbot_conversations (
    conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    employee_id UUID,
    
    -- Session Info
    session_id VARCHAR(255) NOT NULL,
    channel VARCHAR(50), -- web, slack, teams, mobile
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, resolved, escalated, abandoned
    
    -- Metadata
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    
    -- Context
    initial_intent VARCHAR(100),
    resolved_intent VARCHAR(100),
    satisfaction_rating INTEGER -- 1-5
);

CREATE INDEX idx_chatbot_conv_org ON chatbot_conversations(organization_id);
CREATE INDEX idx_chatbot_conv_employee ON chatbot_conversations(employee_id);
CREATE INDEX idx_chatbot_conv_date ON chatbot_conversations(started_at DESC);

-- Chatbot Messages
CREATE TABLE chatbot_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES chatbot_conversations(conversation_id) ON DELETE CASCADE,
    
    -- Message Details
    message_type VARCHAR(20) NOT NULL, -- user, bot, system
    message_content TEXT NOT NULL,
    
    -- Intent & Analysis
    detected_intent VARCHAR(100),
    confidence DECIMAL(5, 2),
    entities JSONB, -- extracted entities from message
    
    -- Bot Response
    response_type VARCHAR(50), -- answer, clarification, escalation, form
    response_source VARCHAR(50), -- knowledge_base, api_call, human_handoff
    
    -- Metadata
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_time_ms INTEGER
);

CREATE INDEX idx_chatbot_msg_conv ON chatbot_messages(conversation_id);
CREATE INDEX idx_chatbot_msg_date ON chatbot_messages(sent_at);

-- Chatbot Knowledge Base
CREATE TABLE chatbot_knowledge_base (
    kb_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Content
    category VARCHAR(100), -- policies, procedures, faq, benefits
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT[],
    
    -- Usage
    usage_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    requires_review BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP
);

CREATE INDEX idx_kb_org ON chatbot_knowledge_base(organization_id);
CREATE INDEX idx_kb_category ON chatbot_knowledge_base(category);

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- AI Usage Summary View
CREATE VIEW v_ai_usage_summary AS
SELECT 
    organization_id,
    feature_type,
    DATE(created_at) as usage_date,
    COUNT(*) as request_count,
    SUM(tokens_used) as total_tokens,
    SUM(cost_usd) as total_cost,
    AVG(processing_time_ms) as avg_processing_time,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count
FROM ai_usage_logs
GROUP BY organization_id, feature_type, DATE(created_at);

-- High-Risk Employees View
CREATE VIEW v_high_risk_employees AS
SELECT 
    ap.organization_id,
    ap.employee_id,
    ap.risk_score,
    ap.risk_level,
    ap.predicted_exit_date,
    ap.prediction_date
FROM attrition_predictions ap
WHERE ap.is_active = TRUE 
AND ap.risk_level IN ('high', 'critical');

-- Sentiment Overview View
CREATE VIEW v_sentiment_overview AS
SELECT 
    organization_id,
    department_id,
    DATE(analyzed_at) as analysis_date,
    COUNT(*) as response_count,
    AVG(sentiment_score) as avg_sentiment,
    SUM(CASE WHEN requires_action THEN 1 ELSE 0 END) as action_required_count
FROM sentiment_analyses
WHERE analyzed_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY organization_id, department_id, DATE(analyzed_at);

-- =====================================================
-- FUNCTIONS FOR AI OPERATIONS
-- =====================================================

-- Function to calculate AI usage cost for organization
CREATE OR REPLACE FUNCTION calculate_ai_costs(
    p_organization_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE (
    feature_type VARCHAR,
    request_count BIGINT,
    total_cost DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aul.feature_type,
        COUNT(*) as request_count,
        SUM(aul.cost_usd) as total_cost
    FROM ai_usage_logs aul
    WHERE aul.organization_id = p_organization_id
    AND DATE(aul.created_at) BETWEEN p_start_date AND p_end_date
    GROUP BY aul.feature_type
    ORDER BY total_cost DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get latest attrition risk for employee
CREATE OR REPLACE FUNCTION get_latest_attrition_risk(
    p_employee_id UUID
) RETURNS TABLE (
    risk_score DECIMAL,
    risk_level VARCHAR,
    prediction_date TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.risk_score,
        ap.risk_level,
        ap.prediction_date
    FROM attrition_predictions ap
    WHERE ap.employee_id = p_employee_id
    AND ap.is_active = TRUE
    ORDER BY ap.prediction_date DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
