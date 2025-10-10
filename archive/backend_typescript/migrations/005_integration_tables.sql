-- =====================================================
-- INTEGRATION TABLES
-- =====================================================

-- Integration Configurations
CREATE TABLE IF NOT EXISTS integration_configs (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('calendar', 'communication', 'payroll', 'accounting', 'sso')),
    provider VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    credentials JSONB NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(organization_id, integration_type, provider)
);

CREATE INDEX idx_integration_configs_org ON integration_configs(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_integration_configs_type ON integration_configs(integration_type) WHERE is_deleted = FALSE;

-- Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('meeting', 'interview', 'leave', 'holiday', 'training', 'other')),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    location VARCHAR(200),
    attendees JSONB DEFAULT '[]'::jsonb,
    organizer_id UUID REFERENCES employees(employee_id),
    external_event_id VARCHAR(200),
    external_link TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_calendar_events_org ON calendar_events(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_calendar_events_organizer ON calendar_events(organizer_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_calendar_events_time ON calendar_events(start_time, end_time) WHERE is_deleted = FALSE;
CREATE INDEX idx_calendar_events_type ON calendar_events(event_type) WHERE is_deleted = FALSE;

COMMENT ON TABLE integration_configs IS 'Configuration for external integrations (Calendar, Communication, Payroll, etc.)';
COMMENT ON TABLE calendar_events IS 'Calendar events synced with external calendar systems';
