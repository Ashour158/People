-- =====================================================
-- Migration 0007: Enhanced Permissions, Accrual Policies, and Workflow Engine
-- Adds permission matrix with scope, accrual policy schema, and workflow engine
-- =====================================================

-- =====================================================
-- ENHANCED PERMISSION MATRIX WITH SCOPE
-- =====================================================

-- Add scope column to permissions table if not exists
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS scope VARCHAR(50) DEFAULT 'organization';
-- Possible scopes: 'organization', 'company', 'department', 'location', 'self'

CREATE INDEX IF NOT EXISTS idx_permissions_scope ON permissions(scope);

-- Create permission matrix table that connects roles, resources, actions, and scopes
CREATE TABLE IF NOT EXISTS permission_matrix (
    matrix_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    resource VARCHAR(100) NOT NULL, -- e.g., 'employee', 'leave_request', 'attendance', 'payroll'
    action VARCHAR(50) NOT NULL,    -- e.g., 'view', 'create', 'edit', 'delete', 'approve', 'export'
    scope VARCHAR(50) NOT NULL,     -- e.g., 'organization', 'company', 'department', 'location', 'self'
    
    -- Scope Filters (optional, applied when scope is not 'organization')
    company_ids UUID[],           -- Specific companies (when scope = 'company')
    department_ids UUID[],        -- Specific departments (when scope = 'department')
    location_ids UUID[],          -- Specific locations (when scope = 'location')
    
    -- Conditions (optional rule expressions)
    conditions JSONB,             -- Additional conditions as JSON expressions
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID REFERENCES users(user_id),
    
    CONSTRAINT unique_role_resource_action_scope UNIQUE (role_id, resource, action, scope)
);

CREATE INDEX idx_permission_matrix_role ON permission_matrix(role_id) WHERE is_active = TRUE;
CREATE INDEX idx_permission_matrix_resource ON permission_matrix(resource) WHERE is_active = TRUE;
CREATE INDEX idx_permission_matrix_scope ON permission_matrix(scope) WHERE is_active = TRUE;

COMMENT ON TABLE permission_matrix IS 'Fine-grained permission control with scope and conditions';

-- =====================================================
-- LEAVE ACCRUAL POLICIES
-- =====================================================

-- Accrual Policy Table
CREATE TABLE IF NOT EXISTS leave_accrual_policies (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    policy_name VARCHAR(100) NOT NULL,
    policy_code VARCHAR(50) NOT NULL,
    description TEXT,
    
    leave_type_id UUID REFERENCES leave_types(leave_type_id) ON DELETE CASCADE,
    
    -- Accrual Configuration
    accrual_type VARCHAR(50) NOT NULL, -- 'monthly', 'quarterly', 'yearly', 'per_payroll', 'anniversary_based'
    accrual_frequency VARCHAR(50),     -- 'monthly', 'bi-weekly', 'weekly', etc.
    
    -- Accrual Calculation Method
    calculation_method VARCHAR(50) NOT NULL, -- 'fixed', 'prorated', 'tiered', 'rule_based'
    
    -- Fixed/Prorated Settings
    days_per_period DECIMAL(5,2),     -- Fixed days per accrual period
    max_accrual_days DECIMAL(5,2),    -- Maximum days that can be accrued
    
    -- Tiered Settings (stored as JSON)
    -- Example: [{"min_service_years": 0, "max_service_years": 2, "days_per_year": 15}, ...]
    tier_rules JSONB,
    
    -- Rule-Based Settings (expressions)
    -- Example: "IF service_years < 2 THEN 1.25 ELSE IF service_years < 5 THEN 1.5 ELSE 2.0"
    accrual_rule_expression TEXT,
    
    -- Eligibility
    eligibility_criteria JSONB,        -- Conditions for eligibility
    minimum_service_days INTEGER DEFAULT 0,
    
    -- Carry Forward Rules
    allows_carry_forward BOOLEAN DEFAULT FALSE,
    max_carry_forward_days DECIMAL(5,2),
    carry_forward_expiry_months INTEGER,
    
    -- Accrual Cap
    max_balance_cap DECIMAL(5,2),     -- Maximum leave balance allowed
    
    -- Proration Rules
    prorate_on_joining BOOLEAN DEFAULT TRUE,
    prorate_on_leaving BOOLEAN DEFAULT TRUE,
    
    -- Effective Period
    effective_from DATE NOT NULL,
    effective_to DATE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID REFERENCES users(user_id),
    deleted_at TIMESTAMP,
    
    CONSTRAINT unique_policy_code_per_org UNIQUE (organization_id, policy_code)
);

CREATE INDEX idx_accrual_policies_org ON leave_accrual_policies(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_accrual_policies_leave_type ON leave_accrual_policies(leave_type_id) WHERE is_active = TRUE;
CREATE INDEX idx_accrual_policies_active ON leave_accrual_policies(is_active, organization_id) WHERE is_deleted = FALSE;

COMMENT ON TABLE leave_accrual_policies IS 'Leave accrual policy definitions with rule expressions';

-- Accrual Transaction Log (tracks actual accrual events)
CREATE TABLE IF NOT EXISTS leave_accrual_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    employee_id UUID NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(leave_type_id) ON DELETE CASCADE,
    policy_id UUID REFERENCES leave_accrual_policies(policy_id),
    
    -- Transaction Details
    transaction_type VARCHAR(50) NOT NULL, -- 'accrual', 'adjustment', 'carry_forward', 'expiry'
    transaction_date DATE NOT NULL,
    
    -- Amounts
    days_accrued DECIMAL(5,2) NOT NULL,
    previous_balance DECIMAL(5,2),
    new_balance DECIMAL(5,2),
    
    -- Reference Period
    accrual_period_start DATE,
    accrual_period_end DATE,
    
    -- Calculation Details
    calculation_basis JSONB,          -- Details of how accrual was calculated
    rule_expression_used TEXT,
    
    -- Notes
    description TEXT,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    processed_at TIMESTAMP,
    processed_by UUID REFERENCES users(user_id)
);

CREATE INDEX idx_accrual_trans_org ON leave_accrual_transactions(organization_id);
CREATE INDEX idx_accrual_trans_employee ON leave_accrual_transactions(employee_id, transaction_date DESC);
CREATE INDEX idx_accrual_trans_leave_type ON leave_accrual_transactions(leave_type_id);
CREATE INDEX idx_accrual_trans_date ON leave_accrual_transactions(transaction_date DESC);

COMMENT ON TABLE leave_accrual_transactions IS 'Audit trail of all leave accrual events';

-- =====================================================
-- WORKFLOW ENGINE TABLES
-- =====================================================

-- Workflow Definitions (Templates)
CREATE TABLE IF NOT EXISTS workflow_definitions (
    workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    workflow_name VARCHAR(200) NOT NULL,
    workflow_code VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Workflow Type
    workflow_type VARCHAR(50) NOT NULL, -- 'leave_approval', 'attendance_regularization', 'timesheet_approval', 'expense_approval', etc.
    
    -- Workflow Configuration
    -- Can store as JSON graph or use normalized tables below
    workflow_graph JSONB,              -- Optional: Complete workflow as JSON graph
    
    -- Trigger Configuration
    trigger_event VARCHAR(100),        -- Event that triggers this workflow
    trigger_conditions JSONB,          -- Conditions for triggering
    
    -- Workflow Settings
    allow_parallel_approvals BOOLEAN DEFAULT FALSE,
    require_all_approvals BOOLEAN DEFAULT TRUE,
    auto_escalation_enabled BOOLEAN DEFAULT FALSE,
    escalation_hours INTEGER,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Version Control
    version INTEGER DEFAULT 1,
    parent_workflow_id UUID REFERENCES workflow_definitions(workflow_id),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID REFERENCES users(user_id),
    deleted_at TIMESTAMP,
    
    CONSTRAINT unique_workflow_code_per_org UNIQUE (organization_id, workflow_code, version)
);

CREATE INDEX idx_workflow_defs_org ON workflow_definitions(organization_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_workflow_defs_type ON workflow_definitions(workflow_type) WHERE is_active = TRUE;
CREATE INDEX idx_workflow_defs_active ON workflow_definitions(is_active, organization_id) WHERE is_deleted = FALSE;

COMMENT ON TABLE workflow_definitions IS 'Workflow template definitions';

-- Workflow Nodes (Steps in workflow)
CREATE TABLE IF NOT EXISTS workflow_nodes (
    node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(workflow_id) ON DELETE CASCADE,
    
    node_name VARCHAR(200) NOT NULL,
    node_type VARCHAR(50) NOT NULL,   -- 'start', 'approval', 'condition', 'notification', 'action', 'end'
    node_order INTEGER NOT NULL,       -- Sequence order in workflow
    
    -- Node Configuration
    node_config JSONB,                 -- Configuration specific to node type
    
    -- For Approval Nodes
    approver_type VARCHAR(50),         -- 'reporting_manager', 'role', 'user', 'department_head', 'dynamic'
    approver_role_id UUID REFERENCES roles(role_id),
    approver_user_id UUID REFERENCES users(user_id),
    approver_expression TEXT,          -- Dynamic approver selection expression
    
    -- Approval Settings
    approval_required BOOLEAN DEFAULT TRUE,
    approval_timeout_hours INTEGER,
    
    -- For Condition Nodes
    condition_expression TEXT,         -- Boolean expression to evaluate
    
    -- For Action Nodes
    action_type VARCHAR(50),           -- 'send_email', 'send_notification', 'update_status', 'call_api'
    action_config JSONB,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_nodes_workflow ON workflow_nodes(workflow_id, node_order);
CREATE INDEX idx_workflow_nodes_type ON workflow_nodes(node_type);

COMMENT ON TABLE workflow_nodes IS 'Individual nodes/steps in a workflow';

-- Workflow Edges (Connections between nodes)
CREATE TABLE IF NOT EXISTS workflow_edges (
    edge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(workflow_id) ON DELETE CASCADE,
    
    from_node_id UUID NOT NULL REFERENCES workflow_nodes(node_id) ON DELETE CASCADE,
    to_node_id UUID NOT NULL REFERENCES workflow_nodes(node_id) ON DELETE CASCADE,
    
    -- Edge Configuration
    edge_name VARCHAR(200),
    edge_type VARCHAR(50) DEFAULT 'default', -- 'default', 'conditional', 'success', 'failure'
    
    -- Condition for traversing this edge
    condition_expression TEXT,         -- Expression that must evaluate to true
    priority INTEGER DEFAULT 0,        -- Higher priority edges evaluated first
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_workflow_edge UNIQUE (workflow_id, from_node_id, to_node_id)
);

CREATE INDEX idx_workflow_edges_workflow ON workflow_edges(workflow_id);
CREATE INDEX idx_workflow_edges_from ON workflow_edges(from_node_id);
CREATE INDEX idx_workflow_edges_to ON workflow_edges(to_node_id);

COMMENT ON TABLE workflow_edges IS 'Connections between workflow nodes';

-- Workflow Instances (Active workflow executions)
CREATE TABLE IF NOT EXISTS workflow_instances (
    instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    workflow_id UUID NOT NULL REFERENCES workflow_definitions(workflow_id),
    
    -- Instance Context
    entity_type VARCHAR(100) NOT NULL, -- 'leave_request', 'attendance_regularization', etc.
    entity_id UUID NOT NULL,           -- ID of the entity this workflow is processing
    
    -- Instance State
    current_node_id UUID REFERENCES workflow_nodes(node_id),
    instance_status VARCHAR(50) NOT NULL, -- 'pending', 'in_progress', 'completed', 'rejected', 'cancelled', 'error'
    
    -- Execution Tracking
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Instance Data
    instance_data JSONB,               -- Data context for this workflow instance
    execution_log JSONB,               -- Log of execution steps
    
    -- Error Handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_instances_org ON workflow_instances(organization_id);
CREATE INDEX idx_workflow_instances_workflow ON workflow_instances(workflow_id);
CREATE INDEX idx_workflow_instances_entity ON workflow_instances(entity_type, entity_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(instance_status, started_at);

COMMENT ON TABLE workflow_instances IS 'Active execution instances of workflows';

-- Workflow Tasks (Individual approval tasks)
CREATE TABLE IF NOT EXISTS workflow_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    instance_id UUID NOT NULL REFERENCES workflow_instances(instance_id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES workflow_nodes(node_id),
    
    -- Task Assignment
    assigned_to_user_id UUID REFERENCES users(user_id),
    assigned_to_role_id UUID REFERENCES roles(role_id),
    
    -- Task Status
    task_status VARCHAR(50) NOT NULL,  -- 'pending', 'approved', 'rejected', 'delegated', 'escalated'
    
    -- Task Action
    action_taken_at TIMESTAMP,
    action_taken_by UUID REFERENCES users(user_id),
    comments TEXT,
    
    -- Escalation
    escalated_at TIMESTAMP,
    escalated_to_user_id UUID REFERENCES users(user_id),
    
    -- Delegation
    delegated_to_user_id UUID REFERENCES users(user_id),
    delegation_reason TEXT,
    
    -- Task Data
    task_data JSONB,
    
    -- SLA
    due_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_tasks_instance ON workflow_tasks(instance_id);
CREATE INDEX idx_workflow_tasks_user ON workflow_tasks(assigned_to_user_id, task_status);
CREATE INDEX idx_workflow_tasks_role ON workflow_tasks(assigned_to_role_id, task_status);
CREATE INDEX idx_workflow_tasks_status ON workflow_tasks(task_status, created_at);

COMMENT ON TABLE workflow_tasks IS 'Individual approval/action tasks in workflow instances';

-- =====================================================
-- ENHANCED AUDIT LOG UPDATES
-- =====================================================

-- Add IP and user_agent if not already present (they should exist from migration 0001)
-- This is idempotent
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_log' AND column_name = 'ip_address') THEN
        ALTER TABLE audit_log ADD COLUMN ip_address VARCHAR(45);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'audit_log' AND column_name = 'user_agent') THEN
        ALTER TABLE audit_log ADD COLUMN user_agent TEXT;
    END IF;
END$$;

-- Add indices for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_audit_log_ip ON audit_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_agent ON audit_log(user_agent);

-- =====================================================
-- SEED DATA FOR PERMISSION MATRIX
-- =====================================================

-- Insert default permission matrix entries for Admin role
-- First, get the admin role ID (assuming it exists)
DO $$
DECLARE
    admin_role_id UUID;
BEGIN
    -- Get admin role ID
    SELECT role_id INTO admin_role_id FROM roles WHERE role_code = 'admin' LIMIT 1;
    
    IF admin_role_id IS NOT NULL THEN
        -- Insert permission matrix entries for admin (full organization scope)
        INSERT INTO permission_matrix (role_id, resource, action, scope, is_active) VALUES
        -- Employee permissions
        (admin_role_id, 'employee', 'view', 'organization', TRUE),
        (admin_role_id, 'employee', 'create', 'organization', TRUE),
        (admin_role_id, 'employee', 'edit', 'organization', TRUE),
        (admin_role_id, 'employee', 'delete', 'organization', TRUE),
        (admin_role_id, 'employee', 'export', 'organization', TRUE),
        
        -- Leave permissions
        (admin_role_id, 'leave_request', 'view', 'organization', TRUE),
        (admin_role_id, 'leave_request', 'create', 'organization', TRUE),
        (admin_role_id, 'leave_request', 'approve', 'organization', TRUE),
        (admin_role_id, 'leave_request', 'delete', 'organization', TRUE),
        
        -- Attendance permissions
        (admin_role_id, 'attendance', 'view', 'organization', TRUE),
        (admin_role_id, 'attendance', 'edit', 'organization', TRUE),
        (admin_role_id, 'attendance', 'approve', 'organization', TRUE),
        
        -- Payroll permissions
        (admin_role_id, 'payroll', 'view', 'organization', TRUE),
        (admin_role_id, 'payroll', 'process', 'organization', TRUE),
        (admin_role_id, 'payroll', 'approve', 'organization', TRUE)
        ON CONFLICT (role_id, resource, action, scope) DO NOTHING;
    END IF;
END$$;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN permission_matrix.scope IS 'Defines the scope of permission: organization, company, department, location, self';
COMMENT ON COLUMN permission_matrix.conditions IS 'JSON expression for additional conditions, e.g., {"employee_status": ["active", "on_leave"]}';
COMMENT ON COLUMN leave_accrual_policies.accrual_rule_expression IS 'Rule expression for dynamic accrual calculation, e.g., IF-THEN-ELSE logic';
COMMENT ON COLUMN workflow_nodes.approver_expression IS 'Dynamic expression to determine approver, e.g., "reporting_manager.reporting_manager" for skip-level';
COMMENT ON COLUMN workflow_edges.condition_expression IS 'Boolean expression to determine if edge should be traversed';
