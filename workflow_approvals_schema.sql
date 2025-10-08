-- =====================================================
-- WORKFLOW AND APPROVAL SYSTEM
-- Generic, reusable workflow engine for HR processes
-- =====================================================

-- Workflow Definitions (Templates)
CREATE TABLE workflow_definitions (
    workflow_definition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    workflow_name VARCHAR(100) NOT NULL,
    workflow_code VARCHAR(50) NOT NULL,
    
    -- Module this workflow applies to
    module_type VARCHAR(50) NOT NULL, -- leave, attendance, expense, timesheet, etc.
    
    description TEXT,
    
    -- Configuration
    requires_sequential_approval BOOLEAN DEFAULT TRUE, -- If false, parallel approval
    auto_approve_on_all_levels BOOLEAN DEFAULT TRUE, -- Auto approve when all levels done
    allow_delegate_approval BOOLEAN DEFAULT FALSE,
    allow_cancellation_by_requester BOOLEAN DEFAULT TRUE,
    
    -- Escalation
    enable_escalation BOOLEAN DEFAULT FALSE,
    escalation_hours INTEGER DEFAULT 24,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by UUID,
    
    UNIQUE(organization_id, workflow_code)
);

CREATE INDEX idx_workflow_definitions_org ON workflow_definitions(organization_id) WHERE is_active = TRUE;
CREATE INDEX idx_workflow_definitions_module ON workflow_definitions(module_type, is_active);

-- Workflow Approval Levels (part of workflow definition)
CREATE TABLE workflow_approval_levels (
    level_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_definition_id UUID NOT NULL REFERENCES workflow_definitions(workflow_definition_id) ON DELETE CASCADE,
    
    level_number INTEGER NOT NULL,
    level_name VARCHAR(100),
    
    -- Who approves at this level
    approver_type VARCHAR(50) NOT NULL, 
    -- reporting_manager, department_head, hr_manager, custom_role, specific_user
    
    -- For custom role or specific user
    custom_role_id UUID REFERENCES roles(role_id),
    specific_user_id UUID REFERENCES users(user_id),
    
    -- Conditions for this level to apply
    conditions JSONB, -- {"leave_days": {"gt": 5}, "amount": {"gte": 1000}}
    
    is_mandatory BOOLEAN DEFAULT TRUE,
    can_be_skipped BOOLEAN DEFAULT FALSE,
    
    -- Notifications
    send_notification BOOLEAN DEFAULT TRUE,
    notification_template TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(workflow_definition_id, level_number)
);

CREATE INDEX idx_workflow_levels_definition ON workflow_approval_levels(workflow_definition_id, level_number);

-- Workflow Instances (actual workflows in progress)
CREATE TABLE workflow_instances (
    workflow_instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    workflow_definition_id UUID NOT NULL REFERENCES workflow_definitions(workflow_definition_id),
    
    -- What entity is this workflow for
    entity_type VARCHAR(50) NOT NULL, -- leave_request, attendance_regularization, expense_claim, etc.
    entity_id UUID NOT NULL,
    
    -- Who initiated this workflow
    initiated_by UUID NOT NULL REFERENCES employees(employee_id),
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Current state
    current_status VARCHAR(20) DEFAULT 'pending', 
    -- pending, in_progress, approved, rejected, cancelled, escalated
    
    current_level INTEGER DEFAULT 1,
    total_levels INTEGER NOT NULL,
    
    -- Completion
    completed_at TIMESTAMP,
    completed_by UUID REFERENCES employees(employee_id),
    
    -- Cancellation
    cancelled_at TIMESTAMP,
    cancelled_by UUID REFERENCES employees(employee_id),
    cancellation_reason TEXT,
    
    -- Metadata
    metadata JSONB, -- Store entity-specific data
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_instances_org ON workflow_instances(organization_id, current_status);
CREATE INDEX idx_workflow_instances_entity ON workflow_instances(entity_type, entity_id);
CREATE INDEX idx_workflow_instances_initiator ON workflow_instances(initiated_by);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(current_status, created_at DESC);

-- Workflow Approval Steps (individual approval actions in a workflow instance)
CREATE TABLE workflow_approval_steps (
    step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(workflow_instance_id) ON DELETE CASCADE,
    
    step_level INTEGER NOT NULL,
    step_sequence INTEGER DEFAULT 1, -- For parallel approvals at same level
    
    -- Approver details
    approver_id UUID NOT NULL REFERENCES employees(employee_id),
    approver_type VARCHAR(50), -- reporting_manager, department_head, hr_manager, etc.
    
    -- Delegation
    delegated_from UUID REFERENCES employees(employee_id),
    delegation_reason TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', 
    -- pending, approved, rejected, skipped, delegated, escalated
    
    -- Action details
    action_taken VARCHAR(20), -- approve, reject, delegate, skip
    action_date TIMESTAMP,
    comments TEXT,
    rejection_reason TEXT,
    
    -- Notifications
    notified_at TIMESTAMP,
    reminder_count INTEGER DEFAULT 0,
    last_reminder_at TIMESTAMP,
    
    -- SLA
    due_date TIMESTAMP,
    is_overdue BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMP,
    escalated_to UUID REFERENCES employees(employee_id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_steps_instance ON workflow_approval_steps(workflow_instance_id, step_level);
CREATE INDEX idx_workflow_steps_approver ON workflow_approval_steps(approver_id, status);
CREATE INDEX idx_workflow_steps_status ON workflow_approval_steps(status, created_at DESC);
CREATE INDEX idx_workflow_steps_overdue ON workflow_approval_steps(is_overdue, due_date) WHERE status = 'pending';

-- Workflow History / Audit Trail
CREATE TABLE workflow_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(workflow_instance_id) ON DELETE CASCADE,
    
    action_type VARCHAR(50) NOT NULL, 
    -- initiated, approved, rejected, cancelled, escalated, delegated, reminded, completed
    
    action_by UUID REFERENCES employees(employee_id),
    action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    from_status VARCHAR(20),
    to_status VARCHAR(20),
    
    step_level INTEGER,
    
    comments TEXT,
    metadata JSONB,
    
    -- IP and device info for security
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_history_instance ON workflow_history(workflow_instance_id, action_date DESC);
CREATE INDEX idx_workflow_history_action ON workflow_history(action_type, action_date DESC);

-- Workflow Delegation Rules
CREATE TABLE workflow_delegation_rules (
    delegation_rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    -- Who is delegating
    delegator_id UUID NOT NULL REFERENCES employees(employee_id),
    
    -- To whom
    delegate_to_id UUID NOT NULL REFERENCES employees(employee_id),
    
    -- Scope
    workflow_types VARCHAR(50)[], -- NULL means all workflows
    
    -- Time period
    effective_from DATE NOT NULL,
    effective_to DATE NOT NULL,
    
    reason TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_delegation_rules_delegator ON workflow_delegation_rules(delegator_id) WHERE is_active = TRUE;
CREATE INDEX idx_delegation_rules_delegate ON workflow_delegation_rules(delegate_to_id) WHERE is_active = TRUE;
CREATE INDEX idx_delegation_rules_dates ON workflow_delegation_rules(effective_from, effective_to) WHERE is_active = TRUE;

-- Approval Notifications Queue
CREATE TABLE approval_notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    
    workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(workflow_instance_id) ON DELETE CASCADE,
    workflow_step_id UUID REFERENCES workflow_approval_steps(step_id) ON DELETE CASCADE,
    
    recipient_id UUID NOT NULL REFERENCES employees(employee_id),
    
    notification_type VARCHAR(50) NOT NULL, 
    -- approval_required, approval_approved, approval_rejected, reminder, escalation
    
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Channels
    send_email BOOLEAN DEFAULT TRUE,
    send_in_app BOOLEAN DEFAULT TRUE,
    send_sms BOOLEAN DEFAULT FALSE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, read
    
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_approval_notifications_recipient ON approval_notifications(recipient_id, status);
CREATE INDEX idx_approval_notifications_workflow ON approval_notifications(workflow_instance_id);
CREATE INDEX idx_approval_notifications_status ON approval_notifications(status, created_at);

-- Views for common queries

-- Pending Approvals View (for manager dashboards)
CREATE VIEW vw_pending_approvals AS
SELECT 
    was.step_id,
    was.workflow_instance_id,
    wi.entity_type,
    wi.entity_id,
    wi.initiated_by,
    wi.initiated_at,
    was.approver_id,
    was.step_level,
    was.due_date,
    was.is_overdue,
    was.notified_at,
    wd.workflow_name,
    wd.module_type,
    e.employee_code,
    e.full_name as requester_name,
    e.email as requester_email,
    wi.organization_id
FROM workflow_approval_steps was
JOIN workflow_instances wi ON was.workflow_instance_id = wi.workflow_instance_id
JOIN workflow_definitions wd ON wi.workflow_definition_id = wd.workflow_definition_id
JOIN employees e ON wi.initiated_by = e.employee_id
WHERE was.status = 'pending'
  AND wi.current_status IN ('pending', 'in_progress');

-- Workflow Status Summary View
CREATE VIEW vw_workflow_summary AS
SELECT 
    wi.workflow_instance_id,
    wi.entity_type,
    wi.entity_id,
    wi.current_status,
    wi.current_level,
    wi.total_levels,
    wi.initiated_by,
    wi.initiated_at,
    wd.workflow_name,
    e.full_name as requester_name,
    COUNT(was.step_id) as total_steps,
    COUNT(CASE WHEN was.status = 'approved' THEN 1 END) as approved_steps,
    COUNT(CASE WHEN was.status = 'rejected' THEN 1 END) as rejected_steps,
    COUNT(CASE WHEN was.status = 'pending' THEN 1 END) as pending_steps,
    wi.organization_id
FROM workflow_instances wi
JOIN workflow_definitions wd ON wi.workflow_definition_id = wd.workflow_definition_id
JOIN employees e ON wi.initiated_by = e.employee_id
LEFT JOIN workflow_approval_steps was ON wi.workflow_instance_id = was.workflow_instance_id
GROUP BY wi.workflow_instance_id, wi.entity_type, wi.entity_id, wi.current_status,
         wi.current_level, wi.total_levels, wi.initiated_by, wi.initiated_at,
         wd.workflow_name, e.full_name, wi.organization_id;

-- Functions for workflow automation

-- Function to check and mark overdue approvals
CREATE OR REPLACE FUNCTION check_overdue_approvals()
RETURNS void AS $$
BEGIN
    UPDATE workflow_approval_steps
    SET is_overdue = TRUE,
        modified_at = NOW()
    WHERE status = 'pending'
      AND due_date < NOW()
      AND is_overdue = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-escalate overdue approvals
CREATE OR REPLACE FUNCTION escalate_overdue_approvals()
RETURNS TABLE(escalated_count INTEGER) AS $$
DECLARE
    escalated_count INTEGER := 0;
    step_record RECORD;
BEGIN
    -- Find overdue approvals that haven't been escalated
    FOR step_record IN 
        SELECT was.step_id, was.workflow_instance_id, was.approver_id,
               wi.organization_id, wd.enable_escalation
        FROM workflow_approval_steps was
        JOIN workflow_instances wi ON was.workflow_instance_id = wi.workflow_instance_id
        JOIN workflow_definitions wd ON wi.workflow_definition_id = wd.workflow_definition_id
        WHERE was.status = 'pending'
          AND was.is_overdue = TRUE
          AND was.escalated_at IS NULL
          AND wd.enable_escalation = TRUE
    LOOP
        -- Mark as escalated
        UPDATE workflow_approval_steps
        SET escalated_at = NOW(),
            modified_at = NOW()
        WHERE step_id = step_record.step_id;
        
        -- Log in history
        INSERT INTO workflow_history (
            workflow_instance_id, action_type, action_date,
            step_level, comments
        ) VALUES (
            step_record.workflow_instance_id,
            'escalated',
            NOW(),
            (SELECT step_level FROM workflow_approval_steps WHERE step_id = step_record.step_id),
            'Approval overdue - automatically escalated'
        );
        
        escalated_count := escalated_count + 1;
    END LOOP;
    
    RETURN QUERY SELECT escalated_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update workflow instance status when step is completed
CREATE OR REPLACE FUNCTION update_workflow_instance_status()
RETURNS TRIGGER AS $$
DECLARE
    pending_count INTEGER;
    rejected_count INTEGER;
    instance_total_levels INTEGER;
    instance_current_level INTEGER;
BEGIN
    -- Count pending and rejected steps for this workflow instance
    SELECT COUNT(*) INTO pending_count
    FROM workflow_approval_steps
    WHERE workflow_instance_id = NEW.workflow_instance_id
      AND status = 'pending';
    
    SELECT COUNT(*) INTO rejected_count
    FROM workflow_approval_steps
    WHERE workflow_instance_id = NEW.workflow_instance_id
      AND status = 'rejected';
    
    -- Get workflow instance details
    SELECT current_level, total_levels 
    INTO instance_current_level, instance_total_levels
    FROM workflow_instances
    WHERE workflow_instance_id = NEW.workflow_instance_id;
    
    -- If any step is rejected, mark workflow as rejected
    IF NEW.status = 'rejected' THEN
        UPDATE workflow_instances
        SET current_status = 'rejected',
            completed_at = NOW(),
            completed_by = NEW.approver_id,
            modified_at = NOW()
        WHERE workflow_instance_id = NEW.workflow_instance_id;
        
    -- If all steps approved and at final level, mark as approved
    ELSIF pending_count = 0 AND instance_current_level >= instance_total_levels THEN
        UPDATE workflow_instances
        SET current_status = 'approved',
            completed_at = NOW(),
            completed_by = NEW.approver_id,
            modified_at = NOW()
        WHERE workflow_instance_id = NEW.workflow_instance_id;
        
    -- If current level completed, move to next level
    ELSIF NEW.status = 'approved' THEN
        UPDATE workflow_instances
        SET current_status = 'in_progress',
            current_level = current_level + 1,
            modified_at = NOW()
        WHERE workflow_instance_id = NEW.workflow_instance_id
          AND current_level < total_levels;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_workflow_status
AFTER UPDATE OF status ON workflow_approval_steps
FOR EACH ROW
WHEN (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected'))
EXECUTE FUNCTION update_workflow_instance_status();

-- Comments
COMMENT ON TABLE workflow_definitions IS 'Reusable workflow templates for various HR processes';
COMMENT ON TABLE workflow_approval_levels IS 'Approval level configuration for each workflow definition';
COMMENT ON TABLE workflow_instances IS 'Active workflow instances tracking approval progress';
COMMENT ON TABLE workflow_approval_steps IS 'Individual approval actions within a workflow instance';
COMMENT ON TABLE workflow_history IS 'Complete audit trail of all workflow actions';
COMMENT ON TABLE workflow_delegation_rules IS 'Temporary delegation of approval authority';
COMMENT ON TABLE approval_notifications IS 'Queue for approval-related notifications';
