import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler';

interface OffboardingProcess {
  offboarding_id: string;
  employee_id: string;
  organization_id: string;
  resignation_date: Date;
  last_working_day: Date;
  reason: 'resignation' | 'termination' | 'retirement' | 'contract_end' | 'other';
  reason_details?: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'cancelled';
  notice_period_days: number;
  exit_interview_date?: Date;
  exit_interview_conducted_by?: string;
  exit_interview_notes?: string;
  final_settlement_amount?: number;
  final_settlement_date?: Date;
  rehire_eligible: boolean;
  completion_percentage: number;
  created_by: string;
  created_at: Date;
  modified_at?: Date;
}

interface OffboardingChecklist {
  checklist_id: string;
  organization_id: string;
  checklist_name: string;
  applicable_for: 'all' | 'resignation' | 'termination' | 'retirement';
  is_active: boolean;
  created_at: Date;
}

interface OffboardingTask {
  task_id: string;
  checklist_id: string;
  task_name: string;
  task_description?: string;
  task_type: 'clearance' | 'documentation' | 'asset_return' | 'knowledge_transfer' | 'access_revoke' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  responsible_department?: string;
  due_days_before_last_day: number;
  is_mandatory: boolean;
  task_order: number;
  created_at: Date;
}

interface OffboardingTaskProgress {
  progress_id: string;
  offboarding_id: string;
  task_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'not_applicable';
  assigned_to?: string;
  due_date: Date;
  completed_date?: Date;
  completed_by?: string;
  notes?: string;
  created_at: Date;
}

export class OffboardingService {
  constructor(private db: Pool) {}

  // ==================== OFFBOARDING CHECKLISTS ====================

  async createOffboardingChecklist(data: {
    organization_id: string;
    checklist_name: string;
    applicable_for: string;
    is_active?: boolean;
  }): Promise<OffboardingChecklist> {
    const checklist_id = uuidv4();

    const result = await this.db.query(
      `INSERT INTO offboarding_checklists (
        checklist_id, organization_id, checklist_name, applicable_for, is_active
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [checklist_id, data.organization_id, data.checklist_name, data.applicable_for, data.is_active ?? true]
    );

    return result.rows[0];
  }

  async getOffboardingChecklists(organization_id: string): Promise<OffboardingChecklist[]> {
    const result = await this.db.query(
      `SELECT * FROM offboarding_checklists
       WHERE organization_id = $1 AND is_deleted = FALSE
       ORDER BY created_at DESC`,
      [organization_id]
    );

    return result.rows;
  }

  // ==================== OFFBOARDING TASKS ====================

  async createOffboardingTask(data: {
    checklist_id: string;
    task_name: string;
    task_description?: string;
    task_type: string;
    priority: string;
    responsible_department?: string;
    due_days_before_last_day: number;
    is_mandatory?: boolean;
    task_order: number;
  }): Promise<OffboardingTask> {
    const task_id = uuidv4();

    const result = await this.db.query(
      `INSERT INTO offboarding_tasks (
        task_id, checklist_id, task_name, task_description, task_type,
        priority, responsible_department, due_days_before_last_day, is_mandatory, task_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        task_id,
        data.checklist_id,
        data.task_name,
        data.task_description,
        data.task_type,
        data.priority,
        data.responsible_department,
        data.due_days_before_last_day,
        data.is_mandatory ?? true,
        data.task_order,
      ]
    );

    return result.rows[0];
  }

  async getTasksForChecklist(checklist_id: string): Promise<OffboardingTask[]> {
    const result = await this.db.query(
      `SELECT * FROM offboarding_tasks
       WHERE checklist_id = $1 AND is_deleted = FALSE
       ORDER BY task_order ASC, created_at ASC`,
      [checklist_id]
    );

    return result.rows;
  }

  // ==================== EMPLOYEE OFFBOARDING ====================

  async initiateOffboarding(data: {
    employee_id: string;
    organization_id: string;
    resignation_date: Date;
    last_working_day: Date;
    reason: string;
    reason_details?: string;
    notice_period_days: number;
    rehire_eligible?: boolean;
    created_by: string;
  }): Promise<OffboardingProcess> {
    const offboarding_id = uuidv4();

    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Create offboarding record
      const offboardingResult = await client.query(
        `INSERT INTO employee_offboarding (
          offboarding_id, employee_id, organization_id, resignation_date,
          last_working_day, reason, reason_details, status, notice_period_days,
          rehire_eligible, completion_percentage, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          offboarding_id,
          data.employee_id,
          data.organization_id,
          data.resignation_date,
          data.last_working_day,
          data.reason,
          data.reason_details,
          'in_progress',
          data.notice_period_days,
          data.rehire_eligible ?? true,
          0,
          data.created_by,
        ]
      );

      // Find applicable checklist
      const checklistResult = await client.query(
        `SELECT * FROM offboarding_checklists
         WHERE organization_id = $1 
           AND (applicable_for = $2 OR applicable_for = 'all')
           AND is_active = TRUE
           AND is_deleted = FALSE
         ORDER BY applicable_for DESC
         LIMIT 1`,
        [data.organization_id, data.reason]
      );

      if (checklistResult.rows.length > 0) {
        const checklist = checklistResult.rows[0];
        const tasks = await this.getTasksForChecklist(checklist.checklist_id);

        // Create task progress records
        for (const task of tasks) {
          const dueDate = new Date(data.last_working_day);
          dueDate.setDate(dueDate.getDate() - task.due_days_before_last_day);

          await client.query(
            `INSERT INTO offboarding_task_progress (
              progress_id, offboarding_id, task_id, status, due_date
            ) VALUES ($1, $2, $3, $4, $5)`,
            [uuidv4(), offboarding_id, task.task_id, 'pending', dueDate]
          );
        }
      }

      // Update employee status
      await client.query(
        `UPDATE employees
         SET employment_status = 'notice_period',
             modified_at = NOW()
         WHERE employee_id = $1 AND organization_id = $2`,
        [data.employee_id, data.organization_id]
      );

      await client.query('COMMIT');

      return offboardingResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getEmployeeOffboarding(
    employee_id: string,
    organization_id: string
  ): Promise<any> {
    const result = await this.db.query(
      `SELECT 
        eo.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_code,
        e.department_id,
        d.department_name
      FROM employee_offboarding eo
      INNER JOIN employees e ON eo.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE eo.employee_id = $1 
        AND eo.organization_id = $2
        AND eo.is_deleted = FALSE
      ORDER BY eo.resignation_date DESC
      LIMIT 1`,
      [employee_id, organization_id]
    );

    if (result.rows.length === 0) {
      throw new AppError('No offboarding record found for this employee', 404);
    }

    const offboarding = result.rows[0];

    // Get task progress
    const taskProgress = await this.db.query(
      `SELECT 
        otp.*,
        ot.task_name,
        ot.task_description,
        ot.task_type,
        ot.priority,
        ot.is_mandatory,
        ot.responsible_department
      FROM offboarding_task_progress otp
      INNER JOIN offboarding_tasks ot ON otp.task_id = ot.task_id
      WHERE otp.offboarding_id = $1
      ORDER BY ot.task_order ASC`,
      [offboarding.offboarding_id]
    );

    return {
      ...offboarding,
      tasks: taskProgress.rows,
    };
  }

  async completeOffboardingTask(
    progress_id: string,
    completed_by: string,
    notes?: string
  ): Promise<OffboardingTaskProgress> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Update task progress
      const taskResult = await client.query(
        `UPDATE offboarding_task_progress
         SET status = 'completed',
             completed_date = NOW(),
             completed_by = $1,
             notes = $2
         WHERE progress_id = $3
         RETURNING *`,
        [completed_by, notes, progress_id]
      );

      if (taskResult.rows.length === 0) {
        throw new AppError('Task not found', 404);
      }

      const taskProgress = taskResult.rows[0];

      // Update offboarding completion percentage
      const statsResult = await client.query(
        `SELECT 
          COUNT(*) as total_tasks,
          COUNT(*) FILTER (WHERE status IN ('completed', 'not_applicable')) as completed_tasks
        FROM offboarding_task_progress
        WHERE offboarding_id = $1`,
        [taskProgress.offboarding_id]
      );

      const stats = statsResult.rows[0];
      const completionPercentage = Math.round(
        (stats.completed_tasks / stats.total_tasks) * 100
      );

      await client.query(
        `UPDATE employee_offboarding
         SET completion_percentage = $1,
             status = CASE 
               WHEN $1 = 100 THEN 'completed'
               WHEN $1 > 0 THEN 'in_progress'
               ELSE 'initiated'
             END
         WHERE offboarding_id = $2`,
        [completionPercentage, taskProgress.offboarding_id]
      );

      await client.query('COMMIT');

      return taskProgress;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async conductExitInterview(
    offboarding_id: string,
    organization_id: string,
    data: {
      exit_interview_date: Date;
      exit_interview_conducted_by: string;
      exit_interview_notes: string;
      rehire_eligible?: boolean;
    }
  ): Promise<OffboardingProcess> {
    const result = await this.db.query(
      `UPDATE employee_offboarding
       SET exit_interview_date = $1,
           exit_interview_conducted_by = $2,
           exit_interview_notes = $3,
           rehire_eligible = COALESCE($4, rehire_eligible),
           modified_at = NOW()
       WHERE offboarding_id = $5 AND organization_id = $6
       RETURNING *`,
      [
        data.exit_interview_date,
        data.exit_interview_conducted_by,
        data.exit_interview_notes,
        data.rehire_eligible,
        offboarding_id,
        organization_id,
      ]
    );

    if (result.rows.length === 0) {
      throw new AppError('Offboarding record not found', 404);
    }

    return result.rows[0];
  }

  async processFinalSettlement(
    offboarding_id: string,
    organization_id: string,
    data: {
      final_settlement_amount: number;
      final_settlement_date: Date;
    }
  ): Promise<OffboardingProcess> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE employee_offboarding
         SET final_settlement_amount = $1,
             final_settlement_date = $2,
             status = 'completed',
             modified_at = NOW()
         WHERE offboarding_id = $3 AND organization_id = $4
         RETURNING *`,
        [data.final_settlement_amount, data.final_settlement_date, offboarding_id, organization_id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Offboarding record not found', 404);
      }

      const offboarding = result.rows[0];

      // Update employee status to terminated
      await client.query(
        `UPDATE employees
         SET employment_status = 'terminated',
             termination_date = $1,
             modified_at = NOW()
         WHERE employee_id = $2 AND organization_id = $3`,
        [data.final_settlement_date, offboarding.employee_id, organization_id]
      );

      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getOffboardingStatistics(organization_id: string): Promise<any> {
    const result = await this.db.query(
      `SELECT 
        COUNT(DISTINCT eo.offboarding_id) as total_offboardings,
        COUNT(DISTINCT eo.offboarding_id) FILTER (WHERE eo.status = 'in_progress') as in_progress,
        COUNT(DISTINCT eo.offboarding_id) FILTER (WHERE eo.status = 'completed') as completed,
        COUNT(DISTINCT eo.offboarding_id) FILTER (WHERE eo.reason = 'resignation') as resignations,
        COUNT(DISTINCT eo.offboarding_id) FILTER (WHERE eo.reason = 'termination') as terminations,
        AVG(eo.completion_percentage) as avg_completion,
        COUNT(DISTINCT otp.progress_id) FILTER (WHERE otp.status = 'pending' AND otp.due_date < NOW()) as overdue_tasks
      FROM employee_offboarding eo
      LEFT JOIN offboarding_task_progress otp ON eo.offboarding_id = otp.offboarding_id
      WHERE eo.organization_id = $1 AND eo.is_deleted = FALSE`,
      [organization_id]
    );

    return result.rows[0];
  }

  async getPendingClearances(organization_id: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT 
        eo.offboarding_id,
        eo.employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_code,
        eo.last_working_day,
        eo.completion_percentage,
        COUNT(otp.progress_id) as total_tasks,
        COUNT(otp.progress_id) FILTER (WHERE otp.status = 'pending') as pending_tasks,
        COUNT(otp.progress_id) FILTER (WHERE otp.status = 'pending' AND otp.due_date < NOW()) as overdue_tasks
      FROM employee_offboarding eo
      INNER JOIN employees e ON eo.employee_id = e.employee_id
      LEFT JOIN offboarding_task_progress otp ON eo.offboarding_id = otp.offboarding_id
      WHERE eo.organization_id = $1 
        AND eo.status IN ('initiated', 'in_progress')
        AND eo.is_deleted = FALSE
      GROUP BY eo.offboarding_id, eo.employee_id, e.first_name, e.last_name, 
               e.employee_code, eo.last_working_day, eo.completion_percentage
      ORDER BY eo.last_working_day ASC`,
      [organization_id]
    );

    return result.rows;
  }
}
