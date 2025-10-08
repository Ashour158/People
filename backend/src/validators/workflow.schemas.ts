// =====================================================
// WORKFLOW VALIDATION SCHEMAS
// Zod schemas for workflow validation
// =====================================================

import { z } from 'zod';

// Node types
const nodeTypeEnum = z.enum(['email', 'webhook', 'database', 'notification', 'condition', 'delay']);

// Trigger types
const triggerTypeEnum = z.enum(['event', 'schedule', 'webhook', 'manual']);

// =====================================================
// NODE CONFIG SCHEMAS
// =====================================================

const emailNodeConfigSchema = z.object({
  to: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  cc: z.string().optional(),
  bcc: z.string().optional(),
});

const webhookNodeConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
});

const databaseNodeConfigSchema = z.object({
  operation: z.enum(['insert', 'update', 'delete', 'query']),
  table: z.string().min(1),
  data: z.record(z.any()).optional(),
  where: z.record(z.any()).optional(),
});

const notificationNodeConfigSchema = z.object({
  userId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(['info', 'success', 'warning', 'error']),
});

const conditionNodeConfigSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['equals', 'notEquals', 'greaterThan', 'lessThan', 'contains', 'exists']),
  value: z.any(),
});

const delayNodeConfigSchema = z.object({
  duration: z.number().int().positive(),
});

// =====================================================
// WORKFLOW NODE SCHEMA
// =====================================================

export const workflowNodeSchema = z.object({
  id: z.string().min(1),
  type: nodeTypeEnum,
  name: z.string().min(1),
  config: z.any(), // Specific config validated based on type
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  connections: z.object({
    onSuccess: z.array(z.string()).optional(),
    onError: z.array(z.string()).optional(),
  }).optional(),
});

// =====================================================
// TRIGGER CONFIG SCHEMAS
// =====================================================

const eventTriggerConfigSchema = z.object({
  eventName: z.string().min(1),
  filters: z.record(z.any()).optional(),
});

const scheduleTriggerConfigSchema = z.object({
  schedule: z.string().min(1), // Cron expression
  timezone: z.string().optional(),
});

const webhookTriggerConfigSchema = z.object({
  path: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
  authentication: z.object({
    type: z.enum(['none', 'basic', 'bearer', 'apiKey']),
    credentials: z.record(z.string()).optional(),
  }).optional(),
});

// =====================================================
// WORKFLOW SCHEMAS
// =====================================================

export const createWorkflowSchema = z.object({
  workflow_name: z.string().min(1).max(200),
  workflow_description: z.string().optional(),
  is_active: z.boolean().default(true),
  trigger_type: triggerTypeEnum,
  trigger_config: z.any(), // Specific config validated based on trigger type
  nodes: z.array(workflowNodeSchema).min(0),
});

export const updateWorkflowSchema = z.object({
  workflow_name: z.string().min(1).max(200).optional(),
  workflow_description: z.string().optional(),
  is_active: z.boolean().optional(),
  trigger_type: triggerTypeEnum.optional(),
  trigger_config: z.any().optional(),
  nodes: z.array(workflowNodeSchema).min(0).optional(),
});

// =====================================================
// VALIDATION HELPERS
// =====================================================

export function validateNodeConfig(nodeType: string, config: any): boolean {
  try {
    switch (nodeType) {
      case 'email':
        emailNodeConfigSchema.parse(config);
        break;
      case 'webhook':
        webhookNodeConfigSchema.parse(config);
        break;
      case 'database':
        databaseNodeConfigSchema.parse(config);
        break;
      case 'notification':
        notificationNodeConfigSchema.parse(config);
        break;
      case 'condition':
        conditionNodeConfigSchema.parse(config);
        break;
      case 'delay':
        delayNodeConfigSchema.parse(config);
        break;
      default:
        return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function validateTriggerConfig(triggerType: string, config: any): boolean {
  try {
    switch (triggerType) {
      case 'event':
        eventTriggerConfigSchema.parse(config);
        break;
      case 'schedule':
        scheduleTriggerConfigSchema.parse(config);
        break;
      case 'webhook':
        webhookTriggerConfigSchema.parse(config);
        break;
      case 'manual':
        // Manual triggers don't need specific config
        break;
      default:
        return false;
    }
    return true;
  } catch {
    return false;
  }
}
