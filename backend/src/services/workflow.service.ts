import { query, transaction } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { getPagination, getPaginationMeta } from '../utils/pagination';
import { addHours, isBefore, format } from 'date-fns';

interface WorkflowDefinitionInput {
  workflow_name: string;
  workflow_code: string;
  module_type: string;
  description?: string;
  requires_sequential_approval?: boolean;
  auto_approve_on_all_levels?: boolean;
  allow_delegate_approval?: boolean;
  allow_cancellation_by_requester?: boolean;
  enable_escalation?: boolean;
  escalation_hours?: number;
}

interface ApprovalLevelInput {
  level_number: number;
  level_name?: string;
  approver_type: string;
  custom_role_id?: string;
  specific_user_id?: string;
  conditions?: any;
  is_mandatory?: boolean;
  can_be_skipped?: boolean;
  send_notification?: boolean;
  notification_template?: string;
}

interface WorkflowInstanceInput {
  workflow_definition_id: string;
  entity_type: string;
  entity_id: string;
  initiated_by: string;
  metadata?: any;
}

interface ApprovalActionInput {
  action: 'approve' | 'reject' | 'delegate';
  comments?: string;
  rejection_reason?: string;
  delegate_to_id?: string;
  delegation_reason?: string;
}

export class WorkflowService {
  /**
   * Create a workflow definition
   */
  async createWorkflowDefinition(
    organizationId: string,
    data: WorkflowDefinitionInput,
    createdBy: string
  ) {
    return transaction(async (client) => {
      // Check if workflow code already exists
      const existing = await client.query(
        'SELECT workflow_definition_id FROM workflow_definitions WHERE organization_id = $1 AND workflow_code = $2',
        [organizationId, data.workflow_code]
      );

      if (existing.rows.length > 0) {
        throw new AppError(400, 'Workflow code already exists');
      }

      const result = await client.query(
        `INSERT INTO workflow_definitions (
          organization_id, workflow_name, workflow_code, module_type,
          description, requires_sequential_approval, auto_approve_on_all_levels,
          allow_delegate_approval, allow_cancellation_by_requester,
          enable_escalation, escalation_hours, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          organizationId,
          data.workflow_name,
          data.workflow_code,
          data.module_type,
          data.description,
          data.requires_sequential_approval ?? true,
          data.auto_approve_on_all_levels ?? true,
          data.allow_delegate_approval ?? false,
          data.allow_cancellation_by_requester ?? true,
          data.enable_escalation ?? false,
          data.escalation_hours ?? 24,
          createdBy
        ]
      );

      return result.rows[0];
    });
  }

  /**
   * Add approval levels to workflow definition
   */
  async addApprovalLevel(
    workflowDefinitionId: string,
    organizationId: string,
    data: ApprovalLevelInput
  ) {
    return transaction(async (client) => {
      // Verify workflow exists and belongs to organization
      const workflowCheck = await client.query(
        'SELECT workflow_definition_id FROM workflow_definitions WHERE workflow_definition_id = $1 AND organization_id = $2',
        [workflowDefinitionId, organizationId]
      );

      if (workflowCheck.rows.length === 0) {
        throw new AppError(404, 'Workflow definition not found');
      }

      const result = await client.query(
        `INSERT INTO workflow_approval_levels (
          workflow_definition_id, level_number, level_name,
          approver_type, custom_role_id, specific_user_id,
          conditions, is_mandatory, can_be_skipped,
          send_notification, notification_template
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          workflowDefinitionId,
          data.level_number,
          data.level_name,
          data.approver_type,
          data.custom_role_id,
          data.specific_user_id,
          data.conditions ? JSON.stringify(data.conditions) : null,
          data.is_mandatory ?? true,
          data.can_be_skipped ?? false,
          data.send_notification ?? true,
          data.notification_template
        ]
      );

      return result.rows[0];
    });
  }

  /**
   * Initiate a workflow instance
   */
  async initiateWorkflow(
    organizationId: string,
    data: WorkflowInstanceInput
  ) {
    return transaction(async (client) => {
      // Get workflow definition
      const workflowDef = await client.query(
        `SELECT * FROM workflow_definitions 
         WHERE workflow_definition_id = $1 AND organization_id = $2 AND is_active = TRUE`,
        [data.workflow_definition_id, organizationId]
      );

      if (workflowDef.rows.length === 0) {
        throw new AppError(404, 'Workflow definition not found or inactive');
      }

      const definition = workflowDef.rows[0];

      // Get approval levels
      const levels = await client.query(
        `SELECT * FROM workflow_approval_levels 
         WHERE workflow_definition_id = $1 
         ORDER BY level_number ASC`,
        [data.workflow_definition_id]
      );

      if (levels.rows.length === 0) {
        throw new AppError(400, 'Workflow has no approval levels configured');
      }

      // Create workflow instance
      const instance = await client.query(
        `INSERT INTO workflow_instances (
          organization_id, workflow_definition_id, entity_type, entity_id,
          initiated_by, total_levels, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          organizationId,
          data.workflow_definition_id,
          data.entity_type,
          data.entity_id,
          data.initiated_by,
          levels.rows.length,
          data.metadata ? JSON.stringify(data.metadata) : null
        ]
      );

      const workflowInstance = instance.rows[0];

      // Get employee details for determining approvers
      const employee = await client.query(
        'SELECT * FROM employees WHERE employee_id = $1',
        [data.initiated_by]
      );

      if (employee.rows.length === 0) {
        throw new AppError(404, 'Employee not found');
      }

      const emp = employee.rows[0];

      // Create approval steps for first level (or all levels if parallel)
      const levelsToCreate = definition.requires_sequential_approval 
        ? levels.rows.filter(l => l.level_number === 1)
        : levels.rows;

      for (const level of levelsToCreate) {
        const approverId = await this.determineApprover(
          client,
          level.approver_type,
          emp,
          level.custom_role_id,
          level.specific_user_id
        );

        if (!approverId) {
          throw new AppError(400, `Unable to determine approver for level ${level.level_number}`);
        }

        // Calculate due date
        const dueDate = definition.enable_escalation
          ? addHours(new Date(), definition.escalation_hours)
          : null;

        await client.query(
          `INSERT INTO workflow_approval_steps (
            workflow_instance_id, step_level, approver_id, approver_type,
            due_date
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            workflowInstance.workflow_instance_id,
            level.level_number,
            approverId,
            level.approver_type,
            dueDate
          ]
        );

        // Send notification
        if (level.send_notification) {
          await this.createApprovalNotification(
            client,
            workflowInstance.workflow_instance_id,
            approverId,
            organizationId,
            'approval_required',
            `Approval Required: ${definition.workflow_name}`,
            level.notification_template || `You have a pending approval request for ${definition.workflow_name}`
          );
        }
      }

      // Update instance to in_progress
      await client.query(
        `UPDATE workflow_instances 
         SET current_status = 'in_progress'
         WHERE workflow_instance_id = $1`,
        [workflowInstance.workflow_instance_id]
      );

      // Log in history
      await client.query(
        `INSERT INTO workflow_history (
          workflow_instance_id, action_type, action_by, to_status
        ) VALUES ($1, 'initiated', $2, 'in_progress')`,
        [workflowInstance.workflow_instance_id, data.initiated_by]
      );

      return workflowInstance;
    });
  }

  /**
   * Determine approver based on approver type
   */
  private async determineApprover(
    client: any,
    approverType: string,
    employee: any,
    customRoleId?: string,
    specificUserId?: string
  ): Promise<string | null> {
    switch (approverType) {
      case 'reporting_manager':
        return employee.reporting_manager_id || employee.manager_id;

      case 'department_head':
        if (employee.department_id) {
          const dept = await client.query(
            'SELECT head_employee_id FROM departments WHERE department_id = $1',
            [employee.department_id]
          );
          return dept.rows[0]?.head_employee_id;
        }
        return null;

      case 'hr_manager':
        const hrManager = await client.query(
          `SELECT employee_id FROM employees e
           JOIN users u ON e.employee_id = u.employee_id
           JOIN user_roles ur ON u.user_id = ur.user_id
           JOIN roles r ON ur.role_id = r.role_id
           WHERE e.organization_id = $1 
             AND r.role_code = 'hr_manager'
           LIMIT 1`,
          [employee.organization_id]
        );
        return hrManager.rows[0]?.employee_id;

      case 'specific_user':
        if (specificUserId) {
          const user = await client.query(
            'SELECT employee_id FROM users WHERE user_id = $1',
            [specificUserId]
          );
          return user.rows[0]?.employee_id;
        }
        return null;

      case 'custom_role':
        if (customRoleId) {
          const roleUser = await client.query(
            `SELECT e.employee_id FROM employees e
             JOIN users u ON e.employee_id = u.employee_id
             JOIN user_roles ur ON u.user_id = ur.user_id
             WHERE ur.role_id = $1 AND e.organization_id = $2
             LIMIT 1`,
            [customRoleId, employee.organization_id]
          );
          return roleUser.rows[0]?.employee_id;
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * Process approval action (approve/reject/delegate)
   */
  async processApprovalAction(
    stepId: string,
    approverId: string,
    organizationId: string,
    actionData: ApprovalActionInput
  ) {
    return transaction(async (client) => {
      // Get approval step details
      const stepResult = await client.query(
        `SELECT was.*, wi.workflow_instance_id, wi.organization_id, 
                wi.initiated_by, wi.entity_type, wi.entity_id,
                wd.workflow_name, wd.requires_sequential_approval
         FROM workflow_approval_steps was
         JOIN workflow_instances wi ON was.workflow_instance_id = wi.workflow_instance_id
         JOIN workflow_definitions wd ON wi.workflow_definition_id = wd.workflow_definition_id
         WHERE was.step_id = $1 AND wi.organization_id = $2`,
        [stepId, organizationId]
      );

      if (stepResult.rows.length === 0) {
        throw new AppError(404, 'Approval step not found');
      }

      const step = stepResult.rows[0];

      // Verify approver
      if (step.approver_id !== approverId) {
        throw new AppError(403, 'You are not authorized to approve this request');
      }

      if (step.status !== 'pending') {
        throw new AppError(400, `This approval has already been ${step.status}`);
      }

      const { action, comments, rejection_reason, delegate_to_id, delegation_reason } = actionData;

      if (action === 'delegate') {
        // Handle delegation
        if (!delegate_to_id) {
          throw new AppError(400, 'Delegate recipient is required');
        }

        await client.query(
          `UPDATE workflow_approval_steps
           SET status = 'delegated',
               action_taken = 'delegate',
               action_date = NOW(),
               comments = $1,
               delegated_from = $2,
               delegation_reason = $3,
               approver_id = $4,
               modified_at = NOW()
           WHERE step_id = $5`,
          [comments, approverId, delegation_reason, delegate_to_id, stepId]
        );

        // Log delegation
        await client.query(
          `INSERT INTO workflow_history (
            workflow_instance_id, action_type, action_by,
            step_level, comments
          ) VALUES ($1, 'delegated', $2, $3, $4)`,
          [step.workflow_instance_id, approverId, step.step_level, `Delegated to another approver: ${delegation_reason}`]
        );

        // Notify new approver
        await this.createApprovalNotification(
          client,
          step.workflow_instance_id,
          delegate_to_id,
          organizationId,
          'approval_required',
          `Approval Delegated: ${step.workflow_name}`,
          `An approval has been delegated to you`
        );

        return { message: 'Approval delegated successfully', step_id: stepId };
      }

      // Handle approve/reject
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      await client.query(
        `UPDATE workflow_approval_steps
         SET status = $1,
             action_taken = $2,
             action_date = NOW(),
             comments = $3,
             rejection_reason = $4,
             modified_at = NOW()
         WHERE step_id = $5`,
        [newStatus, action, comments, rejection_reason, stepId]
      );

      // Log in history
      await client.query(
        `INSERT INTO workflow_history (
          workflow_instance_id, action_type, action_by,
          step_level, comments
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          step.workflow_instance_id,
          action === 'approve' ? 'approved' : 'rejected',
          approverId,
          step.step_level,
          comments || rejection_reason
        ]
      );

      // Check if we need to create next level steps (for sequential approval)
      if (action === 'approve' && step.requires_sequential_approval) {
        const nextLevel = step.step_level + 1;
        
        // Check if there are more levels
        const nextLevelConfig = await client.query(
          `SELECT wal.* 
           FROM workflow_approval_levels wal
           JOIN workflow_instances wi ON wal.workflow_definition_id = wi.workflow_definition_id
           WHERE wi.workflow_instance_id = $1 AND wal.level_number = $2`,
          [step.workflow_instance_id, nextLevel]
        );

        if (nextLevelConfig.rows.length > 0) {
          const levelConfig = nextLevelConfig.rows[0];
          
          // Get employee details
          const employee = await client.query(
            'SELECT * FROM employees WHERE employee_id = $1',
            [step.initiated_by]
          );

          if (employee.rows.length > 0) {
            const emp = employee.rows[0];
            const nextApproverId = await this.determineApprover(
              client,
              levelConfig.approver_type,
              emp,
              levelConfig.custom_role_id,
              levelConfig.specific_user_id
            );

            if (nextApproverId) {
              // Get workflow definition for due date calculation
              const workflowDef = await client.query(
                `SELECT enable_escalation, escalation_hours
                 FROM workflow_definitions wd
                 JOIN workflow_instances wi ON wd.workflow_definition_id = wi.workflow_definition_id
                 WHERE wi.workflow_instance_id = $1`,
                [step.workflow_instance_id]
              );

              const def = workflowDef.rows[0];
              const dueDate = def.enable_escalation
                ? addHours(new Date(), def.escalation_hours)
                : null;

              await client.query(
                `INSERT INTO workflow_approval_steps (
                  workflow_instance_id, step_level, approver_id, approver_type, due_date
                ) VALUES ($1, $2, $3, $4, $5)`,
                [step.workflow_instance_id, nextLevel, nextApproverId, levelConfig.approver_type, dueDate]
              );

              // Notify next approver
              if (levelConfig.send_notification) {
                await this.createApprovalNotification(
                  client,
                  step.workflow_instance_id,
                  nextApproverId,
                  organizationId,
                  'approval_required',
                  `Approval Required: ${step.workflow_name}`,
                  levelConfig.notification_template || 'You have a pending approval request'
                );
              }
            }
          }
        }
      }

      // Notify requester
      await this.createApprovalNotification(
        client,
        step.workflow_instance_id,
        step.initiated_by,
        organizationId,
        action === 'approve' ? 'approval_approved' : 'approval_rejected',
        `Your request has been ${action === 'approve' ? 'approved' : 'rejected'}`,
        `Your ${step.entity_type} request has been ${action === 'approve' ? 'approved' : 'rejected'}.${rejection_reason ? ' Reason: ' + rejection_reason : ''}`
      );

      return {
        message: `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
        step_id: stepId,
        workflow_instance_id: step.workflow_instance_id
      };
    });
  }

  /**
   * Get pending approvals for an approver
   */
  async getPendingApprovals(approverId: string, organizationId: string, filters: any = {}) {
    const { page, perPage, offset } = getPagination(filters);

    let whereConditions = ['approver_id = $1', 'organization_id = $2'];
    const params: any[] = [approverId, organizationId];
    let paramCount = 2;

    if (filters.entity_type) {
      paramCount++;
      whereConditions.push(`entity_type = $${paramCount}`);
      params.push(filters.entity_type);
    }

    if (filters.overdue_only === 'true') {
      whereConditions.push('is_overdue = TRUE');
    }

    const whereClause = whereConditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) as total FROM vw_pending_approvals WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const result = await query(
      `SELECT * FROM vw_pending_approvals
       WHERE ${whereClause}
       ORDER BY is_overdue DESC, initiated_at ASC
       LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, perPage, offset]
    );

    return {
      approvals: result.rows,
      meta: getPaginationMeta(page, perPage, total)
    };
  }

  /**
   * Get workflow instance details with history
   */
  async getWorkflowInstance(workflowInstanceId: string, organizationId: string) {
    const instanceResult = await query(
      `SELECT wi.*, wd.workflow_name, wd.workflow_code, wd.module_type,
              e.full_name as initiated_by_name, e.employee_code
       FROM workflow_instances wi
       JOIN workflow_definitions wd ON wi.workflow_definition_id = wd.workflow_definition_id
       JOIN employees e ON wi.initiated_by = e.employee_id
       WHERE wi.workflow_instance_id = $1 AND wi.organization_id = $2`,
      [workflowInstanceId, organizationId]
    );

    if (instanceResult.rows.length === 0) {
      throw new AppError(404, 'Workflow instance not found');
    }

    const instance = instanceResult.rows[0];

    // Get approval steps
    const stepsResult = await query(
      `SELECT was.*, e.full_name as approver_name, e.employee_code as approver_code,
              e.email as approver_email
       FROM workflow_approval_steps was
       JOIN employees e ON was.approver_id = e.employee_id
       WHERE was.workflow_instance_id = $1
       ORDER BY was.step_level, was.step_sequence`,
      [workflowInstanceId]
    );

    // Get history
    const historyResult = await query(
      `SELECT wh.*, e.full_name as action_by_name
       FROM workflow_history wh
       LEFT JOIN employees e ON wh.action_by = e.employee_id
       WHERE wh.workflow_instance_id = $1
       ORDER BY wh.action_date DESC`,
      [workflowInstanceId]
    );

    return {
      instance,
      steps: stepsResult.rows,
      history: historyResult.rows
    };
  }

  /**
   * Cancel workflow instance
   */
  async cancelWorkflow(
    workflowInstanceId: string,
    organizationId: string,
    cancelledBy: string,
    cancellationReason: string
  ) {
    return transaction(async (client) => {
      const instanceResult = await client.query(
        `SELECT * FROM workflow_instances 
         WHERE workflow_instance_id = $1 AND organization_id = $2`,
        [workflowInstanceId, organizationId]
      );

      if (instanceResult.rows.length === 0) {
        throw new AppError(404, 'Workflow instance not found');
      }

      const instance = instanceResult.rows[0];

      if (instance.current_status === 'cancelled') {
        throw new AppError(400, 'Workflow already cancelled');
      }

      if (instance.current_status === 'approved' || instance.current_status === 'rejected') {
        throw new AppError(400, 'Cannot cancel a completed workflow');
      }

      // Update instance
      await client.query(
        `UPDATE workflow_instances
         SET current_status = 'cancelled',
             cancelled_at = NOW(),
             cancelled_by = $1,
             cancellation_reason = $2,
             modified_at = NOW()
         WHERE workflow_instance_id = $3`,
        [cancelledBy, cancellationReason, workflowInstanceId]
      );

      // Update all pending steps
      await client.query(
        `UPDATE workflow_approval_steps
         SET status = 'cancelled',
             modified_at = NOW()
         WHERE workflow_instance_id = $1 AND status = 'pending'`,
        [workflowInstanceId]
      );

      // Log in history
      await client.query(
        `INSERT INTO workflow_history (
          workflow_instance_id, action_type, action_by, comments
        ) VALUES ($1, 'cancelled', $2, $3)`,
        [workflowInstanceId, cancelledBy, cancellationReason]
      );

      return { message: 'Workflow cancelled successfully' };
    });
  }

  /**
   * Create approval notification
   */
  private async createApprovalNotification(
    client: any,
    workflowInstanceId: string,
    recipientId: string,
    organizationId: string,
    notificationType: string,
    subject: string,
    message: string
  ) {
    await client.query(
      `INSERT INTO approval_notifications (
        organization_id, workflow_instance_id, recipient_id,
        notification_type, subject, message
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [organizationId, workflowInstanceId, recipientId, notificationType, subject, message]
    );
  }

  /**
   * Get workflow statistics for dashboard
   */
  async getWorkflowStatistics(organizationId: string, filters: any = {}) {
    let whereConditions = ['organization_id = $1'];
    const params: any[] = [organizationId];
    let paramCount = 1;

    if (filters.module_type) {
      paramCount++;
      whereConditions.push(`entity_type = $${paramCount}`);
      params.push(filters.module_type);
    }

    if (filters.date_from) {
      paramCount++;
      whereConditions.push(`initiated_at >= $${paramCount}`);
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      paramCount++;
      whereConditions.push(`initiated_at <= $${paramCount}`);
      params.push(filters.date_to);
    }

    const whereClause = whereConditions.join(' AND ');

    const result = await query(
      `SELECT 
        COUNT(*) as total_workflows,
        COUNT(CASE WHEN current_status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN current_status = 'in_progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN current_status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN current_status = 'rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN current_status = 'cancelled' THEN 1 END) as cancelled_count,
        AVG(EXTRACT(EPOCH FROM (completed_at - initiated_at))/3600) as avg_completion_hours
       FROM workflow_instances
       WHERE ${whereClause}`,
      params
    );

    return result.rows[0];
  }
}
