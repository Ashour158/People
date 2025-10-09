import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler';

interface OnboardingProgram {
  program_id: string;
  organization_id: string;
  program_name: string;
  program_code: string;
  description?: string;
  duration_days: number;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  modified_at?: Date;
}

interface OnboardingTask {
  task_id: string;
  program_id: string;
  task_name: string;
  task_description?: string;
  task_type: 'document' | 'training' | 'meeting' | 'system_access' | 'equipment' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to_role?: string;
  due_days_after_joining: number;
  is_mandatory: boolean;
  task_order: number;
  created_at: Date;
}

interface EmployeeOnboarding {
  onboarding_id: string;
  employee_id: string;
  program_id: string;
  start_date: Date;
  expected_completion_date: Date;
  actual_completion_date?: Date;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  buddy_id?: string;
  completion_percentage: number;
  feedback?: string;
  created_at: Date;
}

interface OnboardingTaskProgress {
  progress_id: string;
  onboarding_id: string;
  task_id: string;
  employee_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'overdue';
  assigned_to?: string;
  due_date: Date;
  completed_date?: Date;
  completed_by?: string;
  notes?: string;
  created_at: Date;
}

export class OnboardingService {
  constructor(private db: Pool) {}

  // ==================== ONBOARDING PROGRAMS ====================

  async createOnboardingProgram(data: {
    organization_id: string;
    program_name: string;
    program_code: string;
    description?: string;
    duration_days: number;
    is_active?: boolean;
    created_by: string;
  }): Promise<OnboardingProgram> {
    const program_id = uuidv4();

    const result = await this.db.query(
      `INSERT INTO onboarding_programs (
        program_id, organization_id, program_name, program_code,
        description, duration_days, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        program_id,
        data.organization_id,
        data.program_name,
        data.program_code,
        data.description,
        data.duration_days,
        data.is_active ?? true,
        data.created_by,
      ]
    );

    return result.rows[0];
  }

  async getOnboardingPrograms(
    organization_id: string,
    filters?: { is_active?: boolean }
  ): Promise<OnboardingProgram[]> {
    let query = `
      SELECT * FROM onboarding_programs
      WHERE organization_id = $1 AND is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (filters?.is_active !== undefined) {
      query += ` AND is_active = $2`;
      params.push(filters.is_active);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async getOnboardingProgramById(
    program_id: string,
    organization_id: string
  ): Promise<OnboardingProgram> {
    const result = await this.db.query(
      `SELECT * FROM onboarding_programs
       WHERE program_id = $1 AND organization_id = $2 AND is_deleted = FALSE`,
      [program_id, organization_id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Onboarding program not found', 404);
    }

    return result.rows[0];
  }

  async updateOnboardingProgram(
    program_id: string,
    organization_id: string,
    data: Partial<OnboardingProgram>
  ): Promise<OnboardingProgram> {
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCounter = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'program_id' && key !== 'organization_id') {
        updateFields.push(`${key} = $${paramCounter}`);
        params.push(value);
        paramCounter++;
      }
    });

    if (updateFields.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    updateFields.push(`modified_at = NOW()`);
    params.push(program_id, organization_id);

    const result = await this.db.query(
      `UPDATE onboarding_programs
       SET ${updateFields.join(', ')}
       WHERE program_id = $${paramCounter} AND organization_id = $${paramCounter + 1}
       AND is_deleted = FALSE
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new AppError('Onboarding program not found', 404);
    }

    return result.rows[0];
  }

  // ==================== ONBOARDING TASKS ====================

  async createOnboardingTask(data: {
    program_id: string;
    organization_id: string;
    task_name: string;
    task_description?: string;
    task_type: string;
    priority: string;
    assigned_to_role?: string;
    due_days_after_joining: number;
    is_mandatory?: boolean;
    task_order: number;
  }): Promise<OnboardingTask> {
    const task_id = uuidv4();

    // Verify program exists
    await this.getOnboardingProgramById(data.program_id, data.organization_id);

    const result = await this.db.query(
      `INSERT INTO onboarding_tasks (
        task_id, program_id, task_name, task_description, task_type,
        priority, assigned_to_role, due_days_after_joining, is_mandatory, task_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        task_id,
        data.program_id,
        data.task_name,
        data.task_description,
        data.task_type,
        data.priority,
        data.assigned_to_role,
        data.due_days_after_joining,
        data.is_mandatory ?? true,
        data.task_order,
      ]
    );

    return result.rows[0];
  }

  async getTasksForProgram(program_id: string): Promise<OnboardingTask[]> {
    const result = await this.db.query(
      `SELECT * FROM onboarding_tasks
       WHERE program_id = $1 AND is_deleted = FALSE
       ORDER BY task_order ASC, created_at ASC`,
      [program_id]
    );

    return result.rows;
  }

  // ==================== EMPLOYEE ONBOARDING ====================

  async startEmployeeOnboarding(data: {
    employee_id: string;
    program_id: string;
    organization_id: string;
    start_date: Date;
    buddy_id?: string;
  }): Promise<EmployeeOnboarding> {
    const onboarding_id = uuidv4();

    // Get program details
    const program = await this.getOnboardingProgramById(data.program_id, data.organization_id);

    // Calculate expected completion date
    const startDate = new Date(data.start_date);
    const expectedCompletionDate = new Date(startDate);
    expectedCompletionDate.setDate(expectedCompletionDate.getDate() + program.duration_days);

    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Create employee onboarding record
      const onboardingResult = await client.query(
        `INSERT INTO employee_onboarding (
          onboarding_id, employee_id, program_id, start_date,
          expected_completion_date, status, buddy_id, completion_percentage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          onboarding_id,
          data.employee_id,
          data.program_id,
          data.start_date,
          expectedCompletionDate,
          'in_progress',
          data.buddy_id,
          0,
        ]
      );

      // Get all tasks for this program
      const tasks = await this.getTasksForProgram(data.program_id);

      // Create task progress records for each task
      for (const task of tasks) {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + task.due_days_after_joining);

        await client.query(
          `INSERT INTO onboarding_task_progress (
            progress_id, onboarding_id, task_id, employee_id,
            status, due_date
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuidv4(), onboarding_id, task.task_id, data.employee_id, 'pending', dueDate]
        );
      }

      await client.query('COMMIT');

      return onboardingResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getEmployeeOnboarding(
    employee_id: string,
    organization_id: string
  ): Promise<any> {
    const result = await this.db.query(
      `SELECT 
        eo.*,
        op.program_name,
        op.duration_days,
        e.first_name || ' ' || e.last_name as employee_name,
        CASE WHEN eo.buddy_id IS NOT NULL 
          THEN (SELECT first_name || ' ' || last_name FROM employees WHERE employee_id = eo.buddy_id)
          ELSE NULL
        END as buddy_name
      FROM employee_onboarding eo
      INNER JOIN onboarding_programs op ON eo.program_id = op.program_id
      INNER JOIN employees e ON eo.employee_id = e.employee_id
      WHERE eo.employee_id = $1 
        AND op.organization_id = $2
        AND eo.is_deleted = FALSE
      ORDER BY eo.start_date DESC
      LIMIT 1`,
      [employee_id, organization_id]
    );

    if (result.rows.length === 0) {
      throw new AppError('No onboarding record found for this employee', 404);
    }

    const onboarding = result.rows[0];

    // Get task progress
    const taskProgress = await this.db.query(
      `SELECT 
        otp.*,
        ot.task_name,
        ot.task_description,
        ot.task_type,
        ot.priority,
        ot.is_mandatory
      FROM onboarding_task_progress otp
      INNER JOIN onboarding_tasks ot ON otp.task_id = ot.task_id
      WHERE otp.onboarding_id = $1
      ORDER BY ot.task_order ASC`,
      [onboarding.onboarding_id]
    );

    return {
      ...onboarding,
      tasks: taskProgress.rows,
    };
  }

  async completeOnboardingTask(
    progress_id: string,
    employee_id: string,
    completed_by: string,
    notes?: string
  ): Promise<OnboardingTaskProgress> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Update task progress
      const taskResult = await client.query(
        `UPDATE onboarding_task_progress
         SET status = 'completed',
             completed_date = NOW(),
             completed_by = $1,
             notes = $2
         WHERE progress_id = $3 AND employee_id = $4
         RETURNING *`,
        [completed_by, notes, progress_id, employee_id]
      );

      if (taskResult.rows.length === 0) {
        throw new AppError('Task not found', 404);
      }

      const taskProgress = taskResult.rows[0];

      // Update onboarding completion percentage
      const statsResult = await client.query(
        `SELECT 
          COUNT(*) as total_tasks,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks
        FROM onboarding_task_progress
        WHERE onboarding_id = $1`,
        [taskProgress.onboarding_id]
      );

      const stats = statsResult.rows[0];
      const completionPercentage = Math.round(
        (stats.completed_tasks / stats.total_tasks) * 100
      );

      await client.query(
        `UPDATE employee_onboarding
         SET completion_percentage = $1,
             status = CASE 
               WHEN $1 = 100 THEN 'completed'
               WHEN $1 > 0 THEN 'in_progress'
               ELSE 'not_started'
             END,
             actual_completion_date = CASE 
               WHEN $1 = 100 THEN NOW()
               ELSE actual_completion_date
             END
         WHERE onboarding_id = $2`,
        [completionPercentage, taskProgress.onboarding_id]
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

  async getPendingTasks(employee_id: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT 
        otp.*,
        ot.task_name,
        ot.task_description,
        ot.task_type,
        ot.priority,
        ot.is_mandatory,
        eo.start_date,
        op.program_name
      FROM onboarding_task_progress otp
      INNER JOIN onboarding_tasks ot ON otp.task_id = ot.task_id
      INNER JOIN employee_onboarding eo ON otp.onboarding_id = eo.onboarding_id
      INNER JOIN onboarding_programs op ON eo.program_id = op.program_id
      WHERE otp.employee_id = $1 
        AND otp.status IN ('pending', 'in_progress')
        AND eo.status != 'completed'
      ORDER BY otp.due_date ASC, ot.priority DESC`,
      [employee_id]
    );

    return result.rows;
  }

  async getOnboardingStatistics(organization_id: string): Promise<any> {
    const result = await this.db.query(
      `SELECT 
        COUNT(DISTINCT eo.onboarding_id) as total_onboardings,
        COUNT(DISTINCT eo.onboarding_id) FILTER (WHERE eo.status = 'in_progress') as in_progress,
        COUNT(DISTINCT eo.onboarding_id) FILTER (WHERE eo.status = 'completed') as completed,
        COUNT(DISTINCT eo.onboarding_id) FILTER (WHERE eo.status = 'on_hold') as on_hold,
        AVG(eo.completion_percentage) as avg_completion,
        COUNT(DISTINCT otp.progress_id) FILTER (WHERE otp.status = 'overdue') as overdue_tasks
      FROM employee_onboarding eo
      INNER JOIN onboarding_programs op ON eo.program_id = op.program_id
      LEFT JOIN onboarding_task_progress otp ON eo.onboarding_id = otp.onboarding_id
      WHERE op.organization_id = $1 AND eo.is_deleted = FALSE`,
      [organization_id]
    );

    return result.rows[0];
  }
}
