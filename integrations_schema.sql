-- =====================================================
-- INTEGRATIONS & API PLATFORM SCHEMA
-- Phase 6: Platform & Integration
-- =====================================================

-- =====================================================
-- WEBHOOKS SYSTEM
-- =====================================================

-- Webhook endpoints registered by external systems
CREATE TABLE webhook_endpoints (
    webhook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    secret_key VARCHAR(255) NOT NULL, -- For HMAC signature verification
    description TEXT,
    events TEXT[] NOT NULL, -- Array of event types to subscribe to
    is_active BOOLEAN DEFAULT TRUE,
    retry_policy JSONB DEFAULT '{"max_attempts": 3, "backoff": "exponential"}',
    headers JSONB DEFAULT '{}', -- Custom headers to include
    timeout_seconds INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID REFERENCES users(user_id),
    last_triggered_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_webhook_endpoints_org ON webhook_endpoints(organization_id);
CREATE INDEX idx_webhook_endpoints_active ON webhook_endpoints(is_active) WHERE is_active = TRUE;

-- Webhook delivery logs
CREATE TABLE webhook_deliveries (
    delivery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhook_endpoints(webhook_id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL, -- pending, delivered, failed, retrying
    attempt_number INTEGER DEFAULT 1,
    response_status_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    next_retry_at TIMESTAMP
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_created ON webhook_deliveries(created_at);

-- Webhook events catalog
CREATE TABLE webhook_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL, -- employee, leave, attendance, payroll, etc.
    description TEXT,
    schema JSONB, -- JSON schema for the event payload
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default webhook events
INSERT INTO webhook_events (event_type, category, description) VALUES
('employee.created', 'employee', 'Triggered when a new employee is created'),
('employee.updated', 'employee', 'Triggered when employee details are updated'),
('employee.deleted', 'employee', 'Triggered when an employee is deleted'),
('leave.requested', 'leave', 'Triggered when a leave request is submitted'),
('leave.approved', 'leave', 'Triggered when a leave request is approved'),
('leave.rejected', 'leave', 'Triggered when a leave request is rejected'),
('attendance.checkin', 'attendance', 'Triggered when employee checks in'),
('attendance.checkout', 'attendance', 'Triggered when employee checks out'),
('payroll.processed', 'payroll', 'Triggered when payroll run is completed'),
('performance.review_completed', 'performance', 'Triggered when performance review is completed');

-- =====================================================
-- OAUTH 2.0 / SSO INTEGRATION
-- =====================================================

-- OAuth providers configuration
CREATE TABLE oauth_providers (
    provider_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
    provider_name VARCHAR(50) NOT NULL, -- google, microsoft, github, etc.
    client_id VARCHAR(255) NOT NULL,
    client_secret VARCHAR(255) NOT NULL, -- Encrypted
    authorization_url TEXT NOT NULL,
    token_url TEXT NOT NULL,
    user_info_url TEXT,
    scopes TEXT[] DEFAULT ARRAY['openid', 'profile', 'email'],
    is_active BOOLEAN DEFAULT TRUE,
    auto_create_users BOOLEAN DEFAULT FALSE,
    default_role_id UUID REFERENCES roles(role_id),
    config JSONB DEFAULT '{}', -- Additional provider-specific configuration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_oauth_providers_org ON oauth_providers(organization_id);
CREATE INDEX idx_oauth_providers_name ON oauth_providers(provider_name);

-- OAuth tokens for integrated accounts
CREATE TABLE oauth_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES oauth_providers(provider_id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP,
    scopes TEXT[],
    provider_user_id VARCHAR(255), -- User ID from the OAuth provider
    provider_email VARCHAR(255),
    provider_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP
);

CREATE INDEX idx_oauth_tokens_user ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_provider ON oauth_tokens(provider_id);
CREATE INDEX idx_oauth_tokens_provider_user ON oauth_tokens(provider_user_id);

-- =====================================================
-- API KEYS FOR THIRD-PARTY INTEGRATIONS
-- =====================================================

CREATE TABLE api_keys (
    api_key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    key_name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE, -- Hashed API key
    key_prefix VARCHAR(20) NOT NULL, -- First few characters for identification
    permissions TEXT[] DEFAULT ARRAY['read'], -- read, write, delete
    scopes TEXT[] DEFAULT ARRAY['*'], -- Which resources the key can access
    rate_limit_per_hour INTEGER DEFAULT 1000,
    ip_whitelist TEXT[], -- Optional IP restrictions
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    revoked_at TIMESTAMP,
    revoked_by UUID REFERENCES users(user_id),
    revoke_reason TEXT
);

CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = TRUE;

-- API key usage logs
CREATE TABLE api_key_usage (
    usage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(api_key_id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    ip_address INET,
    user_agent TEXT,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_key_usage_key ON api_key_usage(api_key_id);
CREATE INDEX idx_api_key_usage_created ON api_key_usage(created_at);

-- =====================================================
-- EMAIL SERVICE INTEGRATION
-- =====================================================

-- Email providers configuration (SendGrid, AWS SES, Mailgun, etc.)
CREATE TABLE email_providers (
    provider_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
    provider_name VARCHAR(50) NOT NULL, -- smtp, sendgrid, ses, mailgun
    is_default BOOLEAN DEFAULT FALSE,
    config JSONB NOT NULL, -- Provider-specific configuration (host, port, api_key, etc.)
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    reply_to_email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    daily_limit INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_providers_org ON email_providers(organization_id);
CREATE INDEX idx_email_providers_default ON email_providers(is_default) WHERE is_default = TRUE;

-- Enhanced email queue with provider support
CREATE TABLE integration_email_queue (
    email_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    provider_id UUID REFERENCES email_providers(provider_id),
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    cc_emails TEXT[],
    bcc_emails TEXT[],
    subject VARCHAR(500) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    template_name VARCHAR(100),
    template_data JSONB,
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    status VARCHAR(50) DEFAULT 'pending', -- pending, sending, sent, failed, bounced
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    bounced_at TIMESTAMP,
    bounce_reason TEXT,
    error_message TEXT,
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    provider_message_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id)
);

CREATE INDEX idx_integration_email_queue_org ON integration_email_queue(organization_id);
CREATE INDEX idx_integration_email_queue_status ON integration_email_queue(status);
CREATE INDEX idx_integration_email_queue_scheduled ON integration_email_queue(scheduled_for);

-- =====================================================
-- INTEGRATION LOGS & AUDIT
-- =====================================================

CREATE TABLE integration_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL, -- webhook, oauth, api_key, email
    integration_id UUID, -- References the specific integration
    event_type VARCHAR(100),
    status VARCHAR(50) NOT NULL, -- success, failure, warning
    request_data JSONB,
    response_data JSONB,
    error_message TEXT,
    duration_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_integration_logs_org ON integration_logs(organization_id);
CREATE INDEX idx_integration_logs_type ON integration_logs(integration_type);
CREATE INDEX idx_integration_logs_created ON integration_logs(created_at);

-- =====================================================
-- CALENDAR INTEGRATION (Google Calendar, Outlook)
-- =====================================================

CREATE TABLE calendar_integrations (
    integration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(employee_id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- google, outlook, apple
    provider_calendar_id VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_direction VARCHAR(20) DEFAULT 'bidirectional', -- oneway_to_provider, oneway_from_provider, bidirectional
    last_sync_at TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'active', -- active, error, paused
    sync_error TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calendar_integrations_user ON calendar_integrations(user_id);
CREATE INDEX idx_calendar_integrations_employee ON calendar_integrations(employee_id);
CREATE INDEX idx_calendar_integrations_sync ON calendar_integrations(sync_enabled) WHERE sync_enabled = TRUE;

-- Calendar events mapping
CREATE TABLE calendar_event_mappings (
    mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES calendar_integrations(integration_id) ON DELETE CASCADE,
    internal_event_type VARCHAR(50) NOT NULL, -- leave, meeting, training, etc.
    internal_event_id UUID NOT NULL,
    provider_event_id VARCHAR(255) NOT NULL,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'synced'
);

CREATE INDEX idx_calendar_event_mappings_integration ON calendar_event_mappings(integration_id);
CREATE INDEX idx_calendar_event_mappings_internal ON calendar_event_mappings(internal_event_type, internal_event_id);
CREATE INDEX idx_calendar_event_mappings_provider ON calendar_event_mappings(provider_event_id);

-- =====================================================
-- THIRD-PARTY APP INTEGRATIONS
-- =====================================================

CREATE TABLE app_integrations (
    integration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    app_name VARCHAR(100) NOT NULL, -- slack, teams, jira, etc.
    app_type VARCHAR(50) NOT NULL, -- messaging, project_management, accounting, etc.
    config JSONB NOT NULL, -- App-specific configuration
    credentials JSONB, -- Encrypted credentials
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}',
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    installed_by UUID REFERENCES users(user_id),
    last_used_at TIMESTAMP
);

CREATE INDEX idx_app_integrations_org ON app_integrations(organization_id);
CREATE INDEX idx_app_integrations_app ON app_integrations(app_name);
CREATE INDEX idx_app_integrations_active ON app_integrations(is_active) WHERE is_active = TRUE;

-- =====================================================
-- RATE LIMITING FOR INTEGRATIONS
-- =====================================================

CREATE TABLE integration_rate_limits (
    limit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL,
    integration_id UUID,
    window_start TIMESTAMP NOT NULL,
    window_size_minutes INTEGER DEFAULT 60,
    request_count INTEGER DEFAULT 0,
    limit_threshold INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_integration_rate_limits_org ON integration_rate_limits(organization_id);
CREATE INDEX idx_integration_rate_limits_window ON integration_rate_limits(window_start);
CREATE UNIQUE INDEX idx_integration_rate_limits_unique ON integration_rate_limits(integration_type, integration_id, window_start);

-- =====================================================
-- COMMENTS & NOTES
-- =====================================================

COMMENT ON TABLE webhook_endpoints IS 'Webhook endpoints registered by external systems for receiving event notifications';
COMMENT ON TABLE webhook_deliveries IS 'Log of webhook delivery attempts and responses';
COMMENT ON TABLE oauth_providers IS 'OAuth 2.0 providers configuration for SSO and third-party authentication';
COMMENT ON TABLE oauth_tokens IS 'OAuth tokens for user accounts connected to external providers';
COMMENT ON TABLE api_keys IS 'API keys for third-party systems to access the HR system programmatically';
COMMENT ON TABLE email_providers IS 'Email service provider configurations (SMTP, SendGrid, AWS SES, etc.)';
COMMENT ON TABLE calendar_integrations IS 'Calendar integrations for syncing leave and events with external calendars';
COMMENT ON TABLE app_integrations IS 'Third-party app integrations (Slack, Teams, JIRA, etc.)';
