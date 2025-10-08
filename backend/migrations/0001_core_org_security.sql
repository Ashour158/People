-- =====================================================
-- Migration 0001: Core Organization & Security
-- Multi-tenant foundation with organizations, users, roles, audit, events
-- =====================================================

-- =====================================================
-- ORGANIZATIONS & COMPANIES
-- =====================================================

-- Organizations (Top Level - Complete Isolation)
CREATE TABLE IF NOT EXISTS organizations (
    organization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_name VARCHAR(200) NOT NULL,
    organization_code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Subscription & Billing
    subscription_plan VARCHAR(50) DEFAULT 'trial',
    subscription_status VARCHAR(20) DEFAULT 'active',
    subscription_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subscription_end_date DATE,
    max_employees INTEGER DEFAULT 50,
    max_companies INTEGER DEFAULT 1,
    
    -- Organization Settings
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'DD-MM-YYYY',
    currency VARCHAR(3) DEFAULT 'USD',
    language VARCHAR(10) DEFAULT 'en',
    
    -- Contact Information
    primary_contact_name VARCHAR(100),
    primary_contact_email VARCHAR(255) NOT NULL,
    primary_contact_phone VARCHAR(20),
    
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

CREATE INDEX idx_organizations_code ON organizations(organization_code) WHERE is_deleted = FALSE;
CREATE INDEX idx_organizations_active ON organizations(is_active) WHERE is_deleted = FALSE;

-- Companies (Within Organization - Multiple Companies Support)
CREATE TABLE IF NOT EXISTS companies (
    company_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    company_name VARCHAR(200) NOT NULL,
    company_code VARCHAR(50) NOT NULL,
    legal_name VARCHAR(200),
    
    -- Registration Details
    registration_number VARCHAR(100),
    tax_id VARCHAR(100),
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(20),
    
    -- Company Settings
    timezone VARCHAR(50),
    currency VARCHAR(3),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT unique_company_code_per_org UNIQUE (organization_id, company_code)
);

CREATE INDEX idx_companies_org ON companies(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_companies_active ON companies(is_active, organization_id) WHERE is_deleted = FALSE;

-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Authentication
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(20),
    profile_picture_url VARCHAR(500),
    
    -- Security
    is_email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT unique_email_per_org UNIQUE (organization_id, email),
    CONSTRAINT unique_username_per_org UNIQUE (organization_id, username)
);

CREATE INDEX idx_users_org ON users(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_users_email ON users(email) WHERE is_deleted = FALSE;
CREATE INDEX idx_users_active ON users(is_active, organization_id) WHERE is_deleted = FALSE;

-- =====================================================
-- ROLES & PERMISSIONS (RBAC)
-- =====================================================

CREATE TABLE IF NOT EXISTS roles (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    role_name VARCHAR(100) NOT NULL,
    role_code VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Role Type
    is_system_role BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT unique_role_code_per_org UNIQUE (organization_id, role_code)
);

CREATE INDEX idx_roles_org ON roles(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_roles_active ON roles(is_active, organization_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS permissions (
    permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    permission_name VARCHAR(100) NOT NULL UNIQUE,
    permission_code VARCHAR(50) NOT NULL UNIQUE,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_code ON permissions(permission_code);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    
    CONSTRAINT unique_role_permission UNIQUE (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

CREATE TABLE IF NOT EXISTS user_roles (
    user_role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    
    CONSTRAINT unique_user_role UNIQUE (user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- =====================================================
-- AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Actor Information
    user_id UUID REFERENCES users(user_id),
    username VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Action Details
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    
    -- Change Tracking
    old_values JSONB,
    new_values JSONB,
    changes JSONB,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_org ON audit_log(organization_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- =====================================================
-- EVENT OUTBOX (Event-Driven Architecture)
-- =====================================================

CREATE TABLE IF NOT EXISTS events_outbox (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Event Details
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    
    -- Payload
    payload JSONB NOT NULL,
    metadata JSONB,
    
    -- Processing Status
    status VARCHAR(20) DEFAULT 'pending',
    processed_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_outbox_org ON events_outbox(organization_id);
CREATE INDEX idx_events_outbox_status ON events_outbox(status, created_at);
CREATE INDEX idx_events_outbox_type ON events_outbox(event_type);
CREATE INDEX idx_events_outbox_aggregate ON events_outbox(aggregate_type, aggregate_id);

-- =====================================================
-- NOTIFICATION TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    template_name VARCHAR(100) NOT NULL,
    template_code VARCHAR(50) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    
    -- Template Content
    subject VARCHAR(255),
    body_template TEXT NOT NULL,
    variables JSONB,
    
    -- Channel Support
    supports_email BOOLEAN DEFAULT TRUE,
    supports_sms BOOLEAN DEFAULT FALSE,
    supports_push BOOLEAN DEFAULT FALSE,
    supports_in_app BOOLEAN DEFAULT TRUE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_system_template BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    deleted_at TIMESTAMP,
    
    CONSTRAINT unique_template_code UNIQUE (organization_id, template_code)
);

CREATE INDEX idx_notification_templates_org ON notification_templates(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_notification_templates_type ON notification_templates(notification_type) WHERE is_deleted = FALSE;

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Recipient
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Notification Details
    template_id UUID REFERENCES notification_templates(template_id),
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    
    -- Content
    subject VARCHAR(255),
    message TEXT NOT NULL,
    data JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    sent_at TIMESTAMP,
    failed_at TIMESTAMP,
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_status ON notifications(status, created_at);
CREATE INDEX idx_notifications_type ON notifications(notification_type);

-- =====================================================
-- ROW-LEVEL SECURITY (RLS) - PLACEHOLDERS
-- =====================================================

/*
COMMENT ON TABLE organizations IS 'Row-Level Security: Not required - top level isolation';
COMMENT ON TABLE companies IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE users IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE roles IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE audit_log IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE events_outbox IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE notification_templates IS 'Row-Level Security: Enable with organization_id filter';
COMMENT ON TABLE notifications IS 'Row-Level Security: Enable with organization_id filter';

-- Example RLS Policy (Commented out - Enable when ready):
-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY organization_isolation ON companies
--   FOR ALL TO app_user
--   USING (organization_id = current_setting('app.current_organization_id')::uuid);
*/

-- =====================================================
-- MIGRATION METADATA
-- =====================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (migration_name) VALUES ('0001_core_org_security');
