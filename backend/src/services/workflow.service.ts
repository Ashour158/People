// =====================================================
// WORKFLOW SERVICE
// Business logic for workflow management and execution
// =====================================================

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  Workflow,
  WorkflowExecution,
  WorkflowNodeExecution,
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowNode,
  WorkflowExecutionContext,
  EmailNodeConfig,
  WebhookNodeConfig,
  DatabaseNodeConfig,
  NotificationNodeConfig,
  ConditionNodeConfig,
  DelayNodeConfig,
} from '../types/workflow.types';
import { sendEmail } from '../utils/email';
import axios from 'axios';

export class WorkflowService {
  constructor(private db: Pool) {}

  // =====================================================
  // WORKFLOW CRUD OPERATIONS
  // =====================================================

  async createWorkflow(
    organizationId: string,
    userId: string,
    data: CreateWorkflowDto
  ): Promise<Workflow> {
    const workflowId = uuidv4();

    const query = `
      INSERT INTO workflows (
        workflow_id, organization_id, workflow_name, workflow_description,
        is_active, trigger_type, trigger_config, nodes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      workflowId,
      organizationId,
      data.workflow_name,
      data.workflow_description || null,
      data.is_active ?? true,
      data.trigger_type,
      JSON.stringify(data.trigger_config),
      JSON.stringify(data.nodes),
      userId,
    ];

    const result = await this.db.query(query, values);
    return this.mapWorkflow(result.rows[0]);
  }

  async getWorkflows(
    organizationId: string,
    options?: {
      isActive?: boolean;
      triggerType?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ workflows: Workflow[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE organization_id = $1 AND is_deleted = false';
    const params: any[] = [organizationId];
    let paramCount = 1;

    if (options?.isActive !== undefined) {
      paramCount++;
      whereClause += ` AND is_active = $${paramCount}`;
      params.push(options.isActive);
    }

    if (options?.triggerType) {
      paramCount++;
      whereClause += ` AND trigger_type = $${paramCount}`;
      params.push(options.triggerType);
    }

    const countQuery = `SELECT COUNT(*) FROM workflows ${whereClause}`;
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT * FROM workflows
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);
    const result = await this.db.query(query, params);

    return {
      workflows: result.rows.map(this.mapWorkflow),
      total,
    };
  }

  async getWorkflowById(workflowId: string, organizationId: string): Promise<Workflow | null> {
    const query = `
      SELECT * FROM workflows
      WHERE workflow_id = $1 AND organization_id = $2 AND is_deleted = false
    `;

    const result = await this.db.query(query, [workflowId, organizationId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapWorkflow(result.rows[0]);
  }

  async updateWorkflow(
    workflowId: string,
    organizationId: string,
    userId: string,
    data: UpdateWorkflowDto
  ): Promise<Workflow | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (data.workflow_name !== undefined) {
      paramCount++;
      updates.push(`workflow_name = $${paramCount}`);
      values.push(data.workflow_name);
    }

    if (data.workflow_description !== undefined) {
      paramCount++;
      updates.push(`workflow_description = $${paramCount}`);
      values.push(data.workflow_description);
    }

    if (data.is_active !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      values.push(data.is_active);
    }

    if (data.trigger_type !== undefined) {
      paramCount++;
      updates.push(`trigger_type = $${paramCount}`);
      values.push(data.trigger_type);
    }

    if (data.trigger_config !== undefined) {
      paramCount++;
      updates.push(`trigger_config = $${paramCount}`);
      values.push(JSON.stringify(data.trigger_config));
    }

    if (data.nodes !== undefined) {
      paramCount++;
      updates.push(`nodes = $${paramCount}`);
      values.push(JSON.stringify(data.nodes));
    }

    if (updates.length === 0) {
      return this.getWorkflowById(workflowId, organizationId);
    }

    paramCount++;
    updates.push(`modified_by = $${paramCount}`);
    values.push(userId);

    paramCount++;
    updates.push(`modified_at = $${paramCount}`);
    values.push(new Date());

    const query = `
      UPDATE workflows
      SET ${updates.join(', ')}
      WHERE workflow_id = $${paramCount + 1} AND organization_id = $${paramCount + 2} AND is_deleted = false
      RETURNING *
    `;

    values.push(workflowId, organizationId);
    const result = await this.db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapWorkflow(result.rows[0]);
  }

  async deleteWorkflow(workflowId: string, organizationId: string): Promise<boolean> {
    const query = `
      UPDATE workflows
      SET is_deleted = true
      WHERE workflow_id = $1 AND organization_id = $2 AND is_deleted = false
    `;

    const result = await this.db.query(query, [workflowId, organizationId]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // =====================================================
  // WORKFLOW EXECUTION
  // =====================================================

  async executeWorkflow(
    workflowId: string,
    organizationId: string,
    triggerData: any
  ): Promise<WorkflowExecution> {
    const workflow = await this.getWorkflowById(workflowId, organizationId);

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (!workflow.is_active) {
      throw new Error(`Workflow ${workflowId} is not active`);
    }

    // Create execution record
    const executionId = uuidv4();
    const startTime = Date.now();

    const insertQuery = `
      INSERT INTO workflow_executions (
        execution_id, workflow_id, organization_id, status, trigger_data, started_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const insertResult = await this.db.query(insertQuery, [
      executionId,
      workflowId,
      organizationId,
      'running',
      JSON.stringify(triggerData),
      new Date(),
    ]);

    const execution: WorkflowExecution = this.mapExecution(insertResult.rows[0]);

    try {
      // Execute workflow nodes
      const context: WorkflowExecutionContext = {
        workflow,
        execution,
        triggerData,
        variables: { ...triggerData },
      };

      await this.executeNodes(context);

      // Update execution as success
      const endTime = Date.now();
      const updateQuery = `
        UPDATE workflow_executions
        SET status = $1, completed_at = $2, execution_time_ms = $3
        WHERE execution_id = $4
        RETURNING *
      `;

      const updateResult = await this.db.query(updateQuery, [
        'success',
        new Date(),
        endTime - startTime,
        executionId,
      ]);

      return this.mapExecution(updateResult.rows[0]);
    } catch (error) {
      const endTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const updateQuery = `
        UPDATE workflow_executions
        SET status = $1, completed_at = $2, execution_time_ms = $3, error_message = $4
        WHERE execution_id = $5
        RETURNING *
      `;

      const updateResult = await this.db.query(updateQuery, [
        'failed',
        new Date(),
        endTime - startTime,
        errorMessage,
        executionId,
      ]);

      return this.mapExecution(updateResult.rows[0]);
    }
  }

  private async executeNodes(context: WorkflowExecutionContext): Promise<void> {
    const { workflow, execution, variables } = context;
    const nodes = workflow.nodes;

    // Find starting nodes (nodes with no incoming connections)
    const startNodes = nodes.filter((node) => {
      return !nodes.some((n) =>
        n.connections?.onSuccess?.includes(node.id) || n.connections?.onError?.includes(node.id)
      );
    });

    // Execute nodes in sequence (simple sequential execution for now)
    for (const node of startNodes) {
      await this.executeNode(node, execution.execution_id, variables);

      // Execute connected nodes
      if (node.connections?.onSuccess) {
        for (const nextNodeId of node.connections.onSuccess) {
          const nextNode = nodes.find((n) => n.id === nextNodeId);
          if (nextNode) {
            await this.executeNode(nextNode, execution.execution_id, variables);
          }
        }
      }
    }
  }

  private async executeNode(
    node: WorkflowNode,
    executionId: string,
    variables: Record<string, any>
  ): Promise<void> {
    const nodeExecutionId = uuidv4();
    const startTime = Date.now();

    // Create node execution record
    const insertQuery = `
      INSERT INTO workflow_node_executions (
        node_execution_id, execution_id, node_id, node_type, status, input_data, started_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await this.db.query(insertQuery, [
      nodeExecutionId,
      executionId,
      node.id,
      node.type,
      'running',
      JSON.stringify(variables),
      new Date(),
    ]);

    try {
      let outputData: any = null;

      // Execute node based on type
      switch (node.type) {
        case 'email':
          outputData = await this.executeEmailNode(node, variables);
          break;
        case 'webhook':
          outputData = await this.executeWebhookNode(node, variables);
          break;
        case 'database':
          outputData = await this.executeDatabaseNode(node, variables);
          break;
        case 'notification':
          outputData = await this.executeNotificationNode(node, variables);
          break;
        case 'condition':
          outputData = await this.executeConditionNode(node, variables);
          break;
        case 'delay':
          outputData = await this.executeDelayNode(node, variables);
          break;
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      // Update variables with output
      if (outputData) {
        variables[node.id] = outputData;
      }

      // Update node execution as success
      const endTime = Date.now();
      const updateQuery = `
        UPDATE workflow_node_executions
        SET status = $1, output_data = $2, completed_at = $3, execution_time_ms = $4
        WHERE node_execution_id = $5
      `;

      await this.db.query(updateQuery, [
        'success',
        JSON.stringify(outputData),
        new Date(),
        endTime - startTime,
        nodeExecutionId,
      ]);
    } catch (error) {
      const endTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const updateQuery = `
        UPDATE workflow_node_executions
        SET status = $1, error_message = $2, completed_at = $3, execution_time_ms = $4
        WHERE node_execution_id = $5
      `;

      await this.db.query(updateQuery, [
        'failed',
        errorMessage,
        new Date(),
        endTime - startTime,
        nodeExecutionId,
      ]);

      throw error;
    }
  }

  // =====================================================
  // NODE EXECUTION HANDLERS
  // =====================================================

  private async executeEmailNode(
    node: WorkflowNode,
    variables: Record<string, any>
  ): Promise<any> {
    const config = node.config as EmailNodeConfig;

    // Replace template variables
    const to = this.replaceVariables(config.to, variables);
    const subject = this.replaceVariables(config.subject, variables);
    const body = this.replaceVariables(config.body, variables);

    await sendEmail({
      to,
      subject,
      html: body,
    });

    return { sent: true, to, subject };
  }

  private async executeWebhookNode(
    node: WorkflowNode,
    variables: Record<string, any>
  ): Promise<any> {
    const config = node.config as WebhookNodeConfig;

    const url = this.replaceVariables(config.url, variables);
    const response = await axios({
      method: config.method,
      url,
      headers: config.headers,
      data: config.body ? this.replaceVariablesInObject(config.body, variables) : undefined,
    });

    return {
      status: response.status,
      data: response.data,
    };
  }

  private async executeDatabaseNode(
    node: WorkflowNode,
    variables: Record<string, any>
  ): Promise<any> {
    const config = node.config as DatabaseNodeConfig;

    // Build query based on operation
    let query = '';
    const values: any[] = [];

    switch (config.operation) {
      case 'insert':
        // Simple insert implementation
        const columns = Object.keys(config.data || {});
        const placeholders = columns.map((_, i) => `$${i + 1}`);
        query = `INSERT INTO ${config.table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
        values.push(...Object.values(this.replaceVariablesInObject(config.data || {}, variables)));
        break;

      case 'update':
        // Simple update implementation
        const updateColumns = Object.keys(config.data || {});
        const updateSets = updateColumns.map((col, i) => `${col} = $${i + 1}`);
        query = `UPDATE ${config.table} SET ${updateSets.join(', ')} WHERE ${Object.keys(config.where || {}).map((col, i) => `${col} = $${updateColumns.length + i + 1}`).join(' AND ')} RETURNING *`;
        values.push(
          ...Object.values(this.replaceVariablesInObject(config.data || {}, variables)),
          ...Object.values(this.replaceVariablesInObject(config.where || {}, variables))
        );
        break;

      default:
        throw new Error(`Database operation ${config.operation} not implemented`);
    }

    const result = await this.db.query(query, values);
    return result.rows;
  }

  private async executeNotificationNode(
    node: WorkflowNode,
    variables: Record<string, any>
  ): Promise<any> {
    const config = node.config as NotificationNodeConfig;

    // Placeholder for notification implementation
    // This would integrate with a notification service
    const title = this.replaceVariables(config.title, variables);
    const message = this.replaceVariables(config.message, variables);

    console.log(`[Notification] ${title}: ${message}`);

    return { sent: true, title, message };
  }

  private async executeConditionNode(
    node: WorkflowNode,
    variables: Record<string, any>
  ): Promise<any> {
    const config = node.config as ConditionNodeConfig;

    const fieldValue = this.getNestedValue(variables, config.field);
    let result = false;

    switch (config.operator) {
      case 'equals':
        result = fieldValue === config.value;
        break;
      case 'notEquals':
        result = fieldValue !== config.value;
        break;
      case 'greaterThan':
        result = fieldValue > config.value;
        break;
      case 'lessThan':
        result = fieldValue < config.value;
        break;
      case 'contains':
        result = String(fieldValue).includes(String(config.value));
        break;
      case 'exists':
        result = fieldValue !== undefined && fieldValue !== null;
        break;
    }

    return { condition: result, field: config.field, value: fieldValue };
  }

  private async executeDelayNode(
    node: WorkflowNode,
    variables: Record<string, any>
  ): Promise<any> {
    const config = node.config as DelayNodeConfig;

    await new Promise((resolve) => setTimeout(resolve, config.duration * 1000));

    return { delayed: config.duration };
  }

  // =====================================================
  // EXECUTION HISTORY
  // =====================================================

  async getWorkflowExecutions(
    workflowId: string,
    organizationId: string,
    options?: { page?: number; limit?: number; status?: string }
  ): Promise<{ executions: WorkflowExecution[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE w.workflow_id = $1 AND w.organization_id = $2';
    const params: any[] = [workflowId, organizationId];
    let paramCount = 2;

    if (options?.status) {
      paramCount++;
      whereClause += ` AND we.status = $${paramCount}`;
      params.push(options.status);
    }

    const countQuery = `
      SELECT COUNT(*) FROM workflow_executions we
      JOIN workflows w ON we.workflow_id = w.workflow_id
      ${whereClause}
    `;
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const query = `
      SELECT we.* FROM workflow_executions we
      JOIN workflows w ON we.workflow_id = w.workflow_id
      ${whereClause}
      ORDER BY we.started_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);
    const result = await this.db.query(query, params);

    return {
      executions: result.rows.map(this.mapExecution),
      total,
    };
  }

  async getExecutionDetails(
    executionId: string,
    organizationId: string
  ): Promise<{ execution: WorkflowExecution; nodeExecutions: WorkflowNodeExecution[] } | null> {
    const executionQuery = `
      SELECT we.* FROM workflow_executions we
      JOIN workflows w ON we.workflow_id = w.workflow_id
      WHERE we.execution_id = $1 AND w.organization_id = $2
    `;

    const executionResult = await this.db.query(executionQuery, [executionId, organizationId]);

    if (executionResult.rows.length === 0) {
      return null;
    }

    const nodeExecutionsQuery = `
      SELECT * FROM workflow_node_executions
      WHERE execution_id = $1
      ORDER BY started_at ASC
    `;

    const nodeExecutionsResult = await this.db.query(nodeExecutionsQuery, [executionId]);

    return {
      execution: this.mapExecution(executionResult.rows[0]),
      nodeExecutions: nodeExecutionsResult.rows.map(this.mapNodeExecution),
    };
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private replaceVariables(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      return this.getNestedValue(variables, path.trim()) || match;
    });
  }

  private replaceVariablesInObject(obj: any, variables: Record<string, any>): any {
    if (typeof obj === 'string') {
      return this.replaceVariables(obj, variables);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.replaceVariablesInObject(item, variables));
    }

    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.replaceVariablesInObject(obj[key], variables);
      }
      return result;
    }

    return obj;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private mapWorkflow(row: any): Workflow {
    return {
      workflow_id: row.workflow_id,
      organization_id: row.organization_id,
      workflow_name: row.workflow_name,
      workflow_description: row.workflow_description,
      is_active: row.is_active,
      trigger_type: row.trigger_type,
      trigger_config: row.trigger_config,
      nodes: row.nodes,
      created_by: row.created_by,
      modified_by: row.modified_by,
      created_at: row.created_at,
      modified_at: row.modified_at,
      is_deleted: row.is_deleted,
    };
  }

  private mapExecution(row: any): WorkflowExecution {
    return {
      execution_id: row.execution_id,
      workflow_id: row.workflow_id,
      organization_id: row.organization_id,
      status: row.status,
      trigger_data: row.trigger_data,
      started_at: row.started_at,
      completed_at: row.completed_at,
      error_message: row.error_message,
      execution_time_ms: row.execution_time_ms,
    };
  }

  private mapNodeExecution(row: any): WorkflowNodeExecution {
    return {
      node_execution_id: row.node_execution_id,
      execution_id: row.execution_id,
      node_id: row.node_id,
      node_type: row.node_type,
      status: row.status,
      input_data: row.input_data,
      output_data: row.output_data,
      error_message: row.error_message,
      started_at: row.started_at,
      completed_at: row.completed_at,
      execution_time_ms: row.execution_time_ms,
    };
  }
}
