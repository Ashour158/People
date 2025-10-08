-- =====================================================
-- INTEGRATION & API ACCESS SCHEMA
-- API Keys and Webhooks for Third-Party Integrations
-- =====================================================

-- API Keys for External Integrations
CREATE TABLE api_keys (
    api_key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Key Details
    key_name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE, -- bcrypt hash of the API key
    key_prefix VARCHAR(20) NOT NULL, -- First few characters for identification (e.g., "pk_live_")
    
    -- Permissions
    scopes JSONB DEFAULT '[]'::jsonb, -- Array of allowed scopes: ["employees:read", "attendance:write", etc.]
    ip_whitelist TEXT[], -- Array of allowed IP addresses (null = all IPs allowed)
    
    -- Usage Limits
    rate_limit_per_hour INTEGER DEFAULT 1000,
    rate_limit_per_day INTEGER DEFAULT 10000,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP, -- NULL means no expiration
    last_used_at TIMESTAMP,
    usage_count BIGINT DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID REFERENCES users(user_id),
    revoked_at TIMESTAMP,
    revoked_by UUID REFERENCES users(user_id),
    revoked_reason TEXT,
    
    -- Indexes
    CONSTRAINT unique_org_key_name UNIQUE (organization_id, key_name)
);

CREATE INDEX idx_api_keys_organization ON api_keys(organization_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = TRUE;

-- API Key Usage Logs (for rate limiting and auditing)
CREATE TABLE api_key_usage_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(api_key_id) ON DELETE CASCADE,
    
    -- Request Details
    request_method VARCHAR(10) NOT NULL,
    request_path VARCHAR(500) NOT NULL,
    request_ip VARCHAR(45) NOT NULL,
    user_agent TEXT,
    
    -- Response Details
    response_status INTEGER NOT NULL,
    response_time_ms INTEGER,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_key_usage_logs_api_key ON api_key_usage_logs(api_key_id);
CREATE INDEX idx_api_key_usage_logs_created_at ON api_key_usage_logs(created_at);

-- Webhooks Configuration
CREATE TABLE webhooks (
    webhook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Webhook Details
    webhook_name VARCHAR(100) NOT NULL,
    webhook_url VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Events to Subscribe
    events TEXT[] NOT NULL, -- Array of event types: ["employee.created", "attendance.checked_in", etc.]
    
    -- Security
    secret_key VARCHAR(255) NOT NULL, -- Used to sign webhook payloads (HMAC)
    
    -- Configuration
    is_active BOOLEAN DEFAULT TRUE,
    retry_enabled BOOLEAN DEFAULT TRUE,
    max_retries INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    
    -- Headers (optional custom headers to include in webhook requests)
    custom_headers JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    last_triggered_at TIMESTAMP,
    last_success_at TIMESTAMP,
    last_failure_at TIMESTAMP,
    failure_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID REFERENCES users(user_id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_org_webhook_name UNIQUE (organization_id, webhook_name)
);

CREATE INDEX idx_webhooks_organization ON webhooks(organization_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active) WHERE is_active = TRUE;

-- Webhook Delivery Logs
CREATE TABLE webhook_deliveries (
    delivery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(webhook_id) ON DELETE CASCADE,
    
    -- Event Details
    event_type VARCHAR(100) NOT NULL,
    event_id UUID NOT NULL, -- ID of the entity that triggered the event
    payload JSONB NOT NULL,
    
    -- Delivery Attempt
    attempt_number INTEGER DEFAULT 1,
    http_status INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,
    
    -- Status
    status VARCHAR(20) NOT NULL, -- 'pending', 'success', 'failed', 'retrying'
    error_message TEXT,
    
    -- Timestamps
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    next_retry_at TIMESTAMP
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at) WHERE status = 'retrying';
CREATE INDEX idx_webhook_deliveries_event ON webhook_deliveries(event_type, event_id);

-- Comments
COMMENT ON TABLE api_keys IS 'API keys for external integrations and third-party applications';
COMMENT ON TABLE api_key_usage_logs IS 'Usage logs for API keys - used for rate limiting and auditing';
COMMENT ON TABLE webhooks IS 'Webhook configurations for real-time event notifications';
COMMENT ON TABLE webhook_deliveries IS 'Log of all webhook delivery attempts with status and retry information';
