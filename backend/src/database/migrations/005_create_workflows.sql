-- =====================================================
-- WORKFLOW AUTOMATION TABLES
-- n8n-like workflow system for HR automation
-- =====================================================

-- Workflow definitions
CREATE TABLE workflows (
  workflow_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  workflow_name VARCHAR(200) NOT NULL,
  workflow_description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_type VARCHAR(50) NOT NULL, -- 'event', 'schedule', 'webhook', 'manual'
  trigger_config JSONB NOT NULL DEFAULT '{}', -- Configuration for the trigger
  nodes JSONB NOT NULL DEFAULT '[]', -- Array of workflow nodes (actions)
  created_by UUID NOT NULL REFERENCES users(user_id),
  modified_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN DEFAULT false,
  CONSTRAINT chk_trigger_type CHECK (trigger_type IN ('event', 'schedule', 'webhook', 'manual'))
);

-- Workflow executions (history)
CREATE TABLE workflow_executions (
  execution_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(workflow_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'running', -- 'running', 'success', 'failed', 'cancelled'
  trigger_data JSONB, -- The data that triggered the workflow
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  execution_time_ms INTEGER, -- Execution time in milliseconds
  CONSTRAINT chk_status CHECK (status IN ('running', 'success', 'failed', 'cancelled'))
);

-- Node execution details (for each step in the workflow)
CREATE TABLE workflow_node_executions (
  node_execution_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(execution_id) ON DELETE CASCADE,
  node_id VARCHAR(100) NOT NULL, -- Reference to node in workflow.nodes array
  node_type VARCHAR(50) NOT NULL, -- 'email', 'webhook', 'database', 'notification', 'condition'
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  input_data JSONB, -- Input data for this node
  output_data JSONB, -- Output data from this node
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  execution_time_ms INTEGER,
  CONSTRAINT chk_node_status CHECK (status IN ('running', 'success', 'failed', 'skipped'))
);

-- Indexes for performance
CREATE INDEX idx_workflows_org ON workflows(organization_id) WHERE is_deleted = false;
CREATE INDEX idx_workflows_active ON workflows(is_active) WHERE is_deleted = false;
CREATE INDEX idx_workflows_trigger_type ON workflows(trigger_type) WHERE is_deleted = false AND is_active = true;

CREATE INDEX idx_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_executions_status ON workflow_executions(status);
CREATE INDEX idx_executions_started ON workflow_executions(started_at DESC);

CREATE INDEX idx_node_executions_execution ON workflow_node_executions(execution_id);
CREATE INDEX idx_node_executions_status ON workflow_node_executions(status);

-- Add updated_at trigger for workflows
CREATE TRIGGER update_workflows_modified_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_at_column();

-- Comments for documentation
COMMENT ON TABLE workflows IS 'n8n-like workflow definitions for HR automation';
COMMENT ON TABLE workflow_executions IS 'Workflow execution history and status';
COMMENT ON TABLE workflow_node_executions IS 'Individual node execution details within workflows';

COMMENT ON COLUMN workflows.trigger_type IS 'Type of trigger: event (from event system), schedule (cron), webhook (HTTP), or manual';
COMMENT ON COLUMN workflows.trigger_config IS 'JSON configuration for the trigger, e.g., {"eventName": "employee.created"} or {"schedule": "0 9 * * *"}';
COMMENT ON COLUMN workflows.nodes IS 'Array of workflow nodes with actions, conditions, and their connections';
