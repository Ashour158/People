-- =====================================================
-- COMPLIANCE AND AUDIT TABLES
-- =====================================================

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    user_id UUID REFERENCES employees(employee_id),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'approve', 'reject', 'export')),
    before_data JSONB,
    after_data JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Compliance Documents
CREATE TABLE IF NOT EXISTS compliance_documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    employee_id UUID NOT NULL REFERENCES employees(employee_id),
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(200) NOT NULL,
    document_number VARCHAR(100),
    issuing_authority VARCHAR(200),
    issue_date DATE,
    expiry_date DATE,
    verification_status VARCHAR(20) NOT NULL CHECK (verification_status IN ('pending', 'in_progress', 'verified', 'rejected', 'expired')),
    verified_by UUID REFERENCES employees(employee_id),
    verified_at TIMESTAMP,
    verification_notes TEXT,
    file_path TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_compliance_docs_org ON compliance_documents(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_compliance_docs_emp ON compliance_documents(employee_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_compliance_docs_status ON compliance_documents(verification_status) WHERE is_deleted = FALSE;
CREATE INDEX idx_compliance_docs_expiry ON compliance_documents(expiry_date) WHERE is_deleted = FALSE AND expiry_date IS NOT NULL;

-- Data Retention Policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id),
    entity_type VARCHAR(100) NOT NULL,
    retention_period_days INTEGER NOT NULL CHECK (retention_period_days > 0),
    delete_after_retention BOOLEAN DEFAULT FALSE,
    anonymize_after_retention BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    modified_at TIMESTAMP DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    UNIQUE(organization_id, entity_type)
);

CREATE INDEX idx_retention_policies_org ON data_retention_policies(organization_id) WHERE is_deleted = FALSE;

-- GDPR Consents
CREATE TABLE IF NOT EXISTS gdpr_consents (
    consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(employee_id),
    consent_type VARCHAR(100) NOT NULL,
    consent_given BOOLEAN NOT NULL,
    consent_date TIMESTAMP NOT NULL,
    consent_withdrawn_date TIMESTAMP,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_gdpr_consents_emp ON gdpr_consents(employee_id);
CREATE INDEX idx_gdpr_consents_type ON gdpr_consents(consent_type);

COMMENT ON TABLE audit_logs IS 'Complete audit trail of all system activities';
COMMENT ON TABLE compliance_documents IS 'Employee compliance documents with verification tracking';
COMMENT ON TABLE data_retention_policies IS 'Data retention policies per entity type';
COMMENT ON TABLE gdpr_consents IS 'GDPR consent tracking for employees';
