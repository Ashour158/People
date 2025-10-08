// =====================================================
// WORKFLOW TYPES AND INTERFACES
// Type definitions for n8n-like workflow system
// =====================================================

export type TriggerType = 'event' | 'schedule' | 'webhook' | 'manual';
export type NodeType = 'email' | 'webhook' | 'database' | 'notification' | 'condition' | 'delay';
export type ExecutionStatus = 'running' | 'success' | 'failed' | 'cancelled';
export type NodeExecutionStatus = 'running' | 'success' | 'failed' | 'skipped';

// =====================================================
// WORKFLOW NODE INTERFACES
// =====================================================

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  config: NodeConfig;
  position?: { x: number; y: number }; // For visual representation
  connections?: {
    onSuccess?: string[]; // Node IDs to execute on success
    onError?: string[]; // Node IDs to execute on error
  };
}

// Base node configuration
export interface NodeConfig {
  [key: string]: any;
}

// Email node configuration
export interface EmailNodeConfig extends NodeConfig {
  to: string; // Can include template variables like {{employee.email}}
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

// Webhook node configuration
export interface WebhookNodeConfig extends NodeConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

// Database node configuration
export interface DatabaseNodeConfig extends NodeConfig {
  operation: 'insert' | 'update' | 'delete' | 'query';
  table: string;
  data?: Record<string, any>;
  where?: Record<string, any>;
}

// Notification node configuration
export interface NotificationNodeConfig extends NodeConfig {
  userId?: string;
  employeeId?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

// Condition node configuration
export interface ConditionNodeConfig extends NodeConfig {
  field: string; // Field to check (supports dot notation)
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'exists';
  value: any;
}

// Delay node configuration
export interface DelayNodeConfig extends NodeConfig {
  duration: number; // Duration in seconds
}

// =====================================================
// TRIGGER CONFIGURATION INTERFACES
// =====================================================

export interface TriggerConfig {
  [key: string]: any;
}

export interface EventTriggerConfig extends TriggerConfig {
  eventName: string; // e.g., 'employee.created', 'leave.approved'
  filters?: Record<string, any>; // Optional filters on event payload
}

export interface ScheduleTriggerConfig extends TriggerConfig {
  schedule: string; // Cron expression
  timezone?: string;
}

export interface WebhookTriggerConfig extends TriggerConfig {
  path: string; // Webhook path
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  authentication?: {
    type: 'none' | 'basic' | 'bearer' | 'apiKey';
    credentials?: Record<string, string>;
  };
}

// =====================================================
// WORKFLOW INTERFACES
// =====================================================

export interface Workflow {
  workflow_id: string;
  organization_id: string;
  workflow_name: string;
  workflow_description?: string;
  is_active: boolean;
  trigger_type: TriggerType;
  trigger_config: TriggerConfig;
  nodes: WorkflowNode[];
  created_by: string;
  modified_by?: string;
  created_at: Date;
  modified_at: Date;
  is_deleted: boolean;
}

export interface WorkflowExecution {
  execution_id: string;
  workflow_id: string;
  organization_id: string;
  status: ExecutionStatus;
  trigger_data?: any;
  started_at: Date;
  completed_at?: Date;
  error_message?: string;
  execution_time_ms?: number;
}

export interface WorkflowNodeExecution {
  node_execution_id: string;
  execution_id: string;
  node_id: string;
  node_type: NodeType;
  status: NodeExecutionStatus;
  input_data?: any;
  output_data?: any;
  error_message?: string;
  started_at: Date;
  completed_at?: Date;
  execution_time_ms?: number;
}

// =====================================================
// CREATE/UPDATE DTOs
// =====================================================

export interface CreateWorkflowDto {
  workflow_name: string;
  workflow_description?: string;
  is_active?: boolean;
  trigger_type: TriggerType;
  trigger_config: TriggerConfig;
  nodes: WorkflowNode[];
}

export interface UpdateWorkflowDto {
  workflow_name?: string;
  workflow_description?: string;
  is_active?: boolean;
  trigger_type?: TriggerType;
  trigger_config?: TriggerConfig;
  nodes?: WorkflowNode[];
}

// =====================================================
// WORKFLOW EXECUTION CONTEXT
// =====================================================

export interface WorkflowExecutionContext {
  workflow: Workflow;
  execution: WorkflowExecution;
  triggerData: any;
  variables: Record<string, any>; // Variables accumulated during execution
}
