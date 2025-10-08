// =====================================================
// Workflow Service
// Business logic for workflow engine
// =====================================================

import { Pool } from 'pg';

export interface WorkflowDefinition {
  workflow_id?: string;
  organization_id: string;
  workflow_name: string;
  workflow_code: string;
  description?: string;
  workflow_type: string;
  workflow_graph?: Record<string, any>;
  trigger_event?: string;
  trigger_conditions?: Record<string, any>;
  allow_parallel_approvals?: boolean;
  require_all_approvals?: boolean;
  auto_escalation_enabled?: boolean;
  escalation_hours?: number;
  is_active?: boolean;
  version?: number;
}

export interface WorkflowNode {
  node_id?: string;
  workflow_id: string;
  node_name: string;
  node_type: 'start' | 'approval' | 'condition' | 'notification' | 'action' | 'end';
  node_order: number;
  node_config?: Record<string, any>;
  approver_type?: string;
  approver_role_id?: string;
  approver_user_id?: string;
  approver_expression?: string;
  approval_required?: boolean;
  approval_timeout_hours?: number;
  condition_expression?: string;
  action_type?: string;
  action_config?: Record<string, any>;
}

export interface WorkflowEdge {
  edge_id?: string;
  workflow_id: string;
  from_node_id: string;
  to_node_id: string;
  edge_name?: string;
  edge_type?: string;
  condition_expression?: string;
  priority?: number;
}

export interface WorkflowInstance {
  instance_id?: string;
  organization_id: string;
  workflow_id: string;
  entity_type: string;
  entity_id: string;
  current_node_id?: string;
  instance_status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'cancelled' | 'error';
  instance_data?: Record<string, any>;
  execution_log?: Record<string, any>[];
  error_message?: string;
}

export interface WorkflowTask {
  task_id?: string;
  organization_id: string;
  instance_id: string;
  node_id: string;
  assigned_to_user_id?: string;
  assigned_to_role_id?: string;
  task_status: 'pending' | 'approved' | 'rejected' | 'delegated' | 'escalated';
  comments?: string;
  task_data?: Record<string, any>;
  due_at?: Date;
}

export class WorkflowService {
  constructor(private pool: Pool) {}

  // =====================================================
  // WORKFLOW DEFINITION MANAGEMENT
  // =====================================================

  async createWorkflowDefinition(workflow: WorkflowDefinition): Promise<string> {
    const query = `
      INSERT INTO workflow_definitions (
        organization_id, workflow_name, workflow_code, description,
        workflow_type, workflow_graph, trigger_event, trigger_conditions,
        allow_parallel_approvals, require_all_approvals,
        auto_escalation_enabled, escalation_hours, is_active, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING workflow_id
    `;

    const values = [
      workflow.organization_id,
      workflow.workflow_name,
      workflow.workflow_code,
      workflow.description,
      workflow.workflow_type,
      JSON.stringify(workflow.workflow_graph || {}),
      workflow.trigger_event,
      JSON.stringify(workflow.trigger_conditions || {}),
      workflow.allow_parallel_approvals || false,
      workflow.require_all_approvals || true,
      workflow.auto_escalation_enabled || false,
      workflow.escalation_hours,
      workflow.is_active !== false,
      workflow.version || 1,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].workflow_id;
  }

  async getWorkflowDefinition(workflowId: string, organizationId: string): Promise<WorkflowDefinition | null> {
    const query = `
      SELECT * FROM workflow_definitions
      WHERE workflow_id = $1 AND organization_id = $2 AND is_deleted = FALSE
    `;

    const result = await this.pool.query(query, [workflowId, organizationId]);
    return result.rows[0] || null;
  }

  async getWorkflowByType(workflowType: string, organizationId: string): Promise<WorkflowDefinition | null> {
    const query = `
      SELECT * FROM workflow_definitions
      WHERE workflow_type = $1 AND organization_id = $2 
        AND is_active = TRUE AND is_deleted = FALSE
      ORDER BY version DESC
      LIMIT 1
    `;

    const result = await this.pool.query(query, [workflowType, organizationId]);
    return result.rows[0] || null;
  }

  // =====================================================
  // WORKFLOW NODES AND EDGES
  // =====================================================

  async createWorkflowNode(node: WorkflowNode): Promise<string> {
    const query = `
      INSERT INTO workflow_nodes (
        workflow_id, node_name, node_type, node_order, node_config,
        approver_type, approver_role_id, approver_user_id, approver_expression,
        approval_required, approval_timeout_hours,
        condition_expression, action_type, action_config
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING node_id
    `;

    const values = [
      node.workflow_id,
      node.node_name,
      node.node_type,
      node.node_order,
      JSON.stringify(node.node_config || {}),
      node.approver_type,
      node.approver_role_id,
      node.approver_user_id,
      node.approver_expression,
      node.approval_required !== false,
      node.approval_timeout_hours,
      node.condition_expression,
      node.action_type,
      JSON.stringify(node.action_config || {}),
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].node_id;
  }

  async createWorkflowEdge(edge: WorkflowEdge): Promise<string> {
    const query = `
      INSERT INTO workflow_edges (
        workflow_id, from_node_id, to_node_id, edge_name, edge_type,
        condition_expression, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING edge_id
    `;

    const values = [
      edge.workflow_id,
      edge.from_node_id,
      edge.to_node_id,
      edge.edge_name,
      edge.edge_type || 'default',
      edge.condition_expression,
      edge.priority || 0,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].edge_id;
  }

  async getWorkflowNodes(workflowId: string): Promise<WorkflowNode[]> {
    const query = `
      SELECT * FROM workflow_nodes
      WHERE workflow_id = $1
      ORDER BY node_order ASC
    `;

    const result = await this.pool.query(query, [workflowId]);
    return result.rows;
  }

  async getWorkflowEdges(workflowId: string): Promise<WorkflowEdge[]> {
    const query = `
      SELECT * FROM workflow_edges
      WHERE workflow_id = $1
      ORDER BY priority DESC
    `;

    const result = await this.pool.query(query, [workflowId]);
    return result.rows;
  }

  // =====================================================
  // WORKFLOW INSTANCE MANAGEMENT
  // =====================================================

  async startWorkflowInstance(instance: WorkflowInstance): Promise<string> {
    const query = `
      INSERT INTO workflow_instances (
        organization_id, workflow_id, entity_type, entity_id,
        instance_status, instance_data, execution_log
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING instance_id
    `;

    const values = [
      instance.organization_id,
      instance.workflow_id,
      instance.entity_type,
      instance.entity_id,
      'pending',
      JSON.stringify(instance.instance_data || {}),
      JSON.stringify([{ timestamp: new Date(), action: 'workflow_started' }]),
    ];

    const result = await this.pool.query(query, values);
    const instanceId = result.rows[0].instance_id;

    // Create initial tasks
    await this.createInitialTasks(instanceId, instance.workflow_id, instance.organization_id);

    return instanceId;
  }

  private async createInitialTasks(instanceId: string, workflowId: string, organizationId: string): Promise<void> {
    // Get start node
    const nodesQuery = `
      SELECT * FROM workflow_nodes
      WHERE workflow_id = $1 AND node_type = 'start'
      ORDER BY node_order ASC
      LIMIT 1
    `;

    const nodesResult = await this.pool.query(nodesQuery, [workflowId]);
    if (nodesResult.rows.length === 0) {
      throw new Error('No start node found for workflow');
    }

    const startNode = nodesResult.rows[0];

    // Get next nodes (approval nodes) via edges
    const edgesQuery = `
      SELECT * FROM workflow_edges
      WHERE workflow_id = $1 AND from_node_id = $2
      ORDER BY priority DESC
    `;

    const edgesResult = await this.pool.query(edgesQuery, [workflowId, startNode.node_id]);

    // Create tasks for all approval nodes connected to start
    for (const edge of edgesResult.rows) {
      const nodeQuery = `SELECT * FROM workflow_nodes WHERE node_id = $1`;
      const nodeResult = await this.pool.query(nodeQuery, [edge.to_node_id]);
      
      if (nodeResult.rows[0]?.node_type === 'approval') {
        await this.createWorkflowTask({
          organization_id: organizationId,
          instance_id: instanceId,
          node_id: edge.to_node_id,
          assigned_to_user_id: nodeResult.rows[0].approver_user_id,
          assigned_to_role_id: nodeResult.rows[0].approver_role_id,
          task_status: 'pending',
        });
      }
    }

    // Update instance status
    await this.updateInstanceStatus(instanceId, 'in_progress', startNode.node_id);
  }

  async createWorkflowTask(task: WorkflowTask): Promise<string> {
    const query = `
      INSERT INTO workflow_tasks (
        organization_id, instance_id, node_id,
        assigned_to_user_id, assigned_to_role_id,
        task_status, comments, task_data, due_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING task_id
    `;

    const values = [
      task.organization_id,
      task.instance_id,
      task.node_id,
      task.assigned_to_user_id,
      task.assigned_to_role_id,
      task.task_status,
      task.comments,
      JSON.stringify(task.task_data || {}),
      task.due_at,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].task_id;
  }

  async completeTask(
    taskId: string,
    userId: string,
    action: 'approved' | 'rejected',
    comments?: string
  ): Promise<void> {
    // Update task
    const updateQuery = `
      UPDATE workflow_tasks
      SET task_status = $1, action_taken_at = NOW(), action_taken_by = $2, comments = $3
      WHERE task_id = $4
      RETURNING instance_id, node_id
    `;

    const result = await this.pool.query(updateQuery, [action, userId, comments, taskId]);
    
    if (result.rows.length === 0) {
      throw new Error('Task not found');
    }

    const { instance_id, node_id } = result.rows[0];

    // Progress workflow
    await this.progressWorkflow(instance_id, node_id, action);
  }

  private async progressWorkflow(
    instanceId: string,
    currentNodeId: string,
    action: 'approved' | 'rejected'
  ): Promise<void> {
    // Get workflow instance
    const instanceQuery = `SELECT * FROM workflow_instances WHERE instance_id = $1`;
    const instanceResult = await this.pool.query(instanceQuery, [instanceId]);
    const instance = instanceResult.rows[0];

    if (action === 'rejected') {
      // Mark workflow as rejected
      await this.updateInstanceStatus(instanceId, 'rejected', currentNodeId);
      return;
    }

    // Check if all pending tasks for current node are completed
    const pendingTasksQuery = `
      SELECT COUNT(*) as count FROM workflow_tasks
      WHERE instance_id = $1 AND node_id = $2 AND task_status = 'pending'
    `;

    const pendingResult = await this.pool.query(pendingTasksQuery, [instanceId, currentNodeId]);
    
    if (parseInt(pendingResult.rows[0].count) > 0) {
      // Still have pending tasks, don't progress yet
      return;
    }

    // Get next nodes via edges
    const edgesQuery = `
      SELECT * FROM workflow_edges
      WHERE workflow_id = $1 AND from_node_id = $2
      ORDER BY priority DESC
    `;

    const edgesResult = await this.pool.query(edgesQuery, [instance.workflow_id, currentNodeId]);

    if (edgesResult.rows.length === 0) {
      // No more nodes, workflow complete
      await this.updateInstanceStatus(instanceId, 'completed', currentNodeId);
      return;
    }

    // Create tasks for next nodes
    for (const edge of edgesResult.rows) {
      const nodeQuery = `SELECT * FROM workflow_nodes WHERE node_id = $1`;
      const nodeResult = await this.pool.query(nodeQuery, [edge.to_node_id]);
      const nextNode = nodeResult.rows[0];

      if (nextNode.node_type === 'approval') {
        await this.createWorkflowTask({
          organization_id: instance.organization_id,
          instance_id: instanceId,
          node_id: nextNode.node_id,
          assigned_to_user_id: nextNode.approver_user_id,
          assigned_to_role_id: nextNode.approver_role_id,
          task_status: 'pending',
        });
      } else if (nextNode.node_type === 'end') {
        await this.updateInstanceStatus(instanceId, 'completed', nextNode.node_id);
      }
    }
  }

  private async updateInstanceStatus(
    instanceId: string,
    status: WorkflowInstance['instance_status'],
    currentNodeId?: string
  ): Promise<void> {
    const query = `
      UPDATE workflow_instances
      SET instance_status = $1, current_node_id = $2,
          completed_at = CASE WHEN $1 IN ('completed', 'rejected', 'cancelled') THEN NOW() ELSE completed_at END,
          modified_at = NOW()
      WHERE instance_id = $3
    `;

    await this.pool.query(query, [status, currentNodeId, instanceId]);
  }

  async getPendingTasks(userId: string, organizationId: string): Promise<WorkflowTask[]> {
    const query = `
      SELECT wt.*, wi.entity_type, wi.entity_id, wd.workflow_name, wd.workflow_type
      FROM workflow_tasks wt
      JOIN workflow_instances wi ON wt.instance_id = wi.instance_id
      JOIN workflow_definitions wd ON wi.workflow_id = wd.workflow_id
      WHERE wt.organization_id = $1 
        AND (wt.assigned_to_user_id = $2 OR wt.assigned_to_role_id IN (
          SELECT role_id FROM user_roles WHERE user_id = $2
        ))
        AND wt.task_status = 'pending'
      ORDER BY wt.created_at DESC
    `;

    const result = await this.pool.query(query, [organizationId, userId]);
    return result.rows;
  }
}
