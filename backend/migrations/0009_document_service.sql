-- =====================================================
-- Migration 0009: Document Service
-- Document management with metadata, object storage, and retention
-- =====================================================

-- =====================================================
-- DOCUMENT CATEGORIES
-- =====================================================

CREATE TABLE IF NOT EXISTS document_categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    category_name VARCHAR(200) NOT NULL,
    category_code VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Parent category (for hierarchy)
    parent_category_id UUID REFERENCES document_categories(category_id),
    
    -- Icon and styling
    icon VARCHAR(50),
    color VARCHAR(7),
    
    -- Retention Policy
    retention_days INTEGER, -- NULL means indefinite
    auto_delete_on_expiry BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE, -- System categories cannot be deleted
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID REFERENCES users(user_id),
    
    CONSTRAINT unique_category_code_per_org UNIQUE (organization_id, category_code)
);

CREATE INDEX idx_doc_categories_org ON document_categories(organization_id) WHERE is_active = TRUE;
CREATE INDEX idx_doc_categories_parent ON document_categories(parent_category_id);

COMMENT ON TABLE document_categories IS 'Document categories for organization';

-- =====================================================
-- DOCUMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Document Metadata
    document_name VARCHAR(500) NOT NULL,
    display_name VARCHAR(500),
    description TEXT,
    
    category_id UUID REFERENCES document_categories(category_id),
    
    -- File Information
    file_name VARCHAR(500) NOT NULL,
    file_extension VARCHAR(20),
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100),
    
    -- Storage Information
    storage_type VARCHAR(50) NOT NULL DEFAULT 'local', -- 'local', 's3', 'azure', 'gcs'
    storage_path TEXT NOT NULL, -- Full path or key in storage
    storage_bucket VARCHAR(200), -- Bucket/container name for cloud storage
    
    -- File Hash (for deduplication and integrity)
    file_hash VARCHAR(128), -- SHA-256 hash
    
    -- Versioning
    version_number INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES documents(document_id), -- Previous version
    is_latest_version BOOLEAN DEFAULT TRUE,
    
    -- Access Control
    visibility VARCHAR(50) DEFAULT 'private', -- 'public', 'private', 'restricted'
    access_level VARCHAR(50) DEFAULT 'organization', -- 'organization', 'company', 'department', 'user'
    
    -- Allowed viewers (when visibility = 'restricted')
    allowed_user_ids UUID[],
    allowed_role_ids UUID[],
    allowed_department_ids UUID[],
    
    -- Entity Associations
    entity_type VARCHAR(100), -- 'employee', 'leave_request', 'attendance', etc.
    entity_id UUID,
    
    -- Security
    is_encrypted BOOLEAN DEFAULT FALSE,
    encryption_key_id VARCHAR(200),
    
    -- Signed URL (for secure access)
    signed_url_expires_at TIMESTAMP,
    
    -- Document Properties
    is_template BOOLEAN DEFAULT FALSE,
    requires_signature BOOLEAN DEFAULT FALSE,
    is_confidential BOOLEAN DEFAULT FALSE,
    
    -- Retention and Lifecycle
    retention_policy_id UUID, -- Link to retention policy
    retention_date DATE, -- Date when document should be deleted/archived
    archived_at TIMESTAMP,
    
    -- Tags
    tags TEXT[],
    
    -- Status
    document_status VARCHAR(50) DEFAULT 'active', -- 'active', 'archived', 'deleted', 'processing'
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID REFERENCES users(user_id),
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(user_id),
    
    -- Full-text search
    search_vector tsvector
);

CREATE INDEX idx_documents_org ON documents(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_documents_category ON documents(category_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_documents_status ON documents(document_status) WHERE is_deleted = FALSE;
CREATE INDEX idx_documents_retention ON documents(retention_date) WHERE retention_date IS NOT NULL AND is_deleted = FALSE;
CREATE INDEX idx_documents_hash ON documents(file_hash, organization_id);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX idx_documents_search ON documents USING GIN(search_vector);

COMMENT ON TABLE documents IS 'Document metadata with object storage references';

-- =====================================================
-- DOCUMENT SIGNATURES
-- =====================================================

CREATE TABLE IF NOT EXISTS document_signatures (
    signature_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    
    -- Signer Information
    signer_user_id UUID NOT NULL REFERENCES users(user_id),
    signer_employee_id UUID REFERENCES employees(employee_id),
    
    -- Signature Details
    signature_type VARCHAR(50) NOT NULL, -- 'electronic', 'digital', 'wet'
    signature_data TEXT, -- Encrypted signature data or reference
    
    -- IP and Device Info
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info JSONB,
    
    -- Geolocation
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_name VARCHAR(200),
    
    -- Status
    signature_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'signed', 'declined', 'expired'
    
    -- Timestamps
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    signed_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Comments
    comments TEXT,
    decline_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_doc_signatures_document ON document_signatures(document_id);
CREATE INDEX idx_doc_signatures_signer ON document_signatures(signer_user_id);
CREATE INDEX idx_doc_signatures_status ON document_signatures(signature_status, requested_at);

COMMENT ON TABLE document_signatures IS 'Electronic/digital signatures for documents';

-- =====================================================
-- DOCUMENT ACCESS LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS document_access_log (
    access_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    
    -- Accessor Information
    user_id UUID REFERENCES users(user_id),
    employee_id UUID REFERENCES employees(employee_id),
    
    -- Access Details
    access_type VARCHAR(50) NOT NULL, -- 'view', 'download', 'print', 'share', 'edit', 'delete'
    access_method VARCHAR(50), -- 'web', 'mobile', 'api'
    
    -- IP and Device Info
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Geolocation
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Timestamp
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Partitioned by month for efficient querying
CREATE INDEX idx_doc_access_log_document ON document_access_log(document_id, accessed_at DESC);
CREATE INDEX idx_doc_access_log_user ON document_access_log(user_id, accessed_at DESC);
CREATE INDEX idx_doc_access_log_org ON document_access_log(organization_id, accessed_at DESC);

COMMENT ON TABLE document_access_log IS 'Audit log of document access events';

-- =====================================================
-- DOCUMENT SHARING
-- =====================================================

CREATE TABLE IF NOT EXISTS document_shares (
    share_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    
    -- Sharing Details
    share_type VARCHAR(50) NOT NULL, -- 'internal', 'external', 'public_link'
    
    -- Shared with
    shared_with_user_id UUID REFERENCES users(user_id),
    shared_with_email VARCHAR(255), -- For external sharing
    
    -- Permissions
    can_view BOOLEAN DEFAULT TRUE,
    can_download BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_share BOOLEAN DEFAULT FALSE,
    
    -- Link Sharing
    share_link_token VARCHAR(200) UNIQUE,
    share_link_password VARCHAR(255), -- Hashed password
    
    -- Expiry
    expires_at TIMESTAMP,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    revoked_by UUID REFERENCES users(user_id),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    shared_by UUID REFERENCES users(user_id),
    
    -- Access Statistics
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP
);

CREATE INDEX idx_doc_shares_document ON document_shares(document_id) WHERE is_active = TRUE AND is_revoked = FALSE;
CREATE INDEX idx_doc_shares_user ON document_shares(shared_with_user_id) WHERE is_active = TRUE;
CREATE INDEX idx_doc_shares_token ON document_shares(share_link_token) WHERE is_active = TRUE;
CREATE INDEX idx_doc_shares_expiry ON document_shares(expires_at) WHERE is_active = TRUE AND expires_at > NOW();

COMMENT ON TABLE document_shares IS 'Document sharing with internal and external users';

-- =====================================================
-- RETENTION POLICIES
-- =====================================================

CREATE TABLE IF NOT EXISTS document_retention_policies (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    policy_name VARCHAR(200) NOT NULL,
    policy_code VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Retention Rules
    retention_period_days INTEGER NOT NULL, -- Days to retain document
    
    -- Actions on Expiry
    action_on_expiry VARCHAR(50) NOT NULL, -- 'delete', 'archive', 'notify'
    
    -- Applicable To
    applies_to_category_ids UUID[],
    applies_to_entity_types VARCHAR(100)[],
    
    -- Notification Settings
    notify_before_days INTEGER, -- Days before expiry to send notification
    notification_recipients UUID[], -- User IDs to notify
    
    -- Legal Hold
    legal_hold_enabled BOOLEAN DEFAULT FALSE, -- Prevents deletion even after retention period
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID REFERENCES users(user_id),
    
    CONSTRAINT unique_retention_policy_code_per_org UNIQUE (organization_id, policy_code)
);

CREATE INDEX idx_retention_policies_org ON document_retention_policies(organization_id) WHERE is_active = TRUE;

COMMENT ON TABLE document_retention_policies IS 'Document retention policies for compliance';

-- =====================================================
-- DOCUMENT TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS document_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(organization_id) ON DELETE CASCADE, -- NULL for system templates
    
    template_name VARCHAR(200) NOT NULL,
    template_code VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Template Type
    template_type VARCHAR(100) NOT NULL, -- 'offer_letter', 'appointment_letter', 'exit_letter', etc.
    
    -- Document Reference
    document_id UUID REFERENCES documents(document_id), -- Template file
    
    -- Template Content (for simple text templates)
    template_content TEXT,
    
    -- Variables/Placeholders
    -- Example: ["employee_name", "department", "salary", "joining_date"]
    variables TEXT[],
    
    -- Default Values
    default_values JSONB,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE, -- System templates cannot be modified
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID REFERENCES users(user_id)
);

CREATE INDEX idx_doc_templates_org ON document_templates(organization_id) WHERE is_active = TRUE;
CREATE INDEX idx_doc_templates_type ON document_templates(template_type) WHERE is_active = TRUE;

COMMENT ON TABLE document_templates IS 'Document templates for automated document generation';

-- =====================================================
-- SEED DEFAULT DOCUMENT CATEGORIES
-- =====================================================

INSERT INTO document_categories (organization_id, category_name, category_code, description, is_system, icon, color) VALUES
(NULL, 'Employee Documents', 'employee_docs', 'Employee-related documents', TRUE, 'badge', '#1976d2'),
(NULL, 'Contracts', 'contracts', 'Employment contracts and agreements', TRUE, 'file-contract', '#2e7d32'),
(NULL, 'Policies', 'policies', 'Company policies and procedures', TRUE, 'file-alt', '#f57c00'),
(NULL, 'Certifications', 'certifications', 'Professional certifications and licenses', TRUE, 'certificate', '#7b1fa2'),
(NULL, 'Training Materials', 'training', 'Training and learning resources', TRUE, 'graduation-cap', '#0288d1'),
(NULL, 'Payroll Documents', 'payroll', 'Payslips and tax documents', TRUE, 'money-check', '#388e3c'),
(NULL, 'Performance Reviews', 'performance', 'Performance evaluation documents', TRUE, 'chart-line', '#c62828'),
(NULL, 'Other', 'other', 'Miscellaneous documents', TRUE, 'file', '#616161')
ON CONFLICT DO NOTHING;

-- =====================================================
-- TRIGGERS FOR SEARCH VECTOR
-- =====================================================

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_document_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.document_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(NEW.tags, ' ')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search vector
CREATE TRIGGER document_search_vector_update
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_document_search_vector();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN documents.storage_path IS 'Full path or object key in storage system';
COMMENT ON COLUMN documents.file_hash IS 'SHA-256 hash for deduplication and integrity verification';
COMMENT ON COLUMN documents.signed_url_expires_at IS 'Expiry timestamp for pre-signed URLs';
COMMENT ON COLUMN documents.search_vector IS 'Full-text search vector (auto-updated by trigger)';
