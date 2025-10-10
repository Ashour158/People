import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler';

interface Project {
  project_id: string;
  organization_id: string;
  project_code: string;
  project_name: string;
  project_type: 'internal' | 'client' | 'billable' | 'non_billable';
  client_name?: string;
  description?: string;
  start_date: Date;
  end_date?: Date;
  budget?: number;
  currency?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  project_manager_id?: string;
  created_by: string;
  created_at: Date;
}

interface ProjectMember {
  member_id: string;
  project_id: string;
  employee_id: string;
  role: string;
  hourly_rate?: number;
  allocation_percentage?: number;
  start_date: Date;
  end_date?: Date;
  is_active: boolean;
  created_at: Date;
}

interface TimesheetEntry {
  entry_id: string;
  employee_id: string;
  project_id?: string;
  task_id?: string;
  work_date: Date;
  hours_worked: number;
  is_billable: boolean;
  description?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: Date;
  approved_by?: string;
  approved_at?: Date;
  rejection_reason?: string;
  created_at: Date;
}

interface ProjectTask {
  task_id: string;
  project_id: string;
  task_name: string;
  task_description?: string;
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours?: number;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_date?: Date;
  due_date?: Date;
  completed_date?: Date;
  created_at: Date;
}

interface TimesheetPeriod {
  period_id: string;
  organization_id: string;
  period_name: string;
  start_date: Date;
  end_date: Date;
  status: 'open' | 'locked' | 'closed';
  created_at: Date;
}

export class TimesheetService {
  constructor(private db: Pool) {}

  // ==================== PROJECTS ====================

  async createProject(data: {
    organization_id: string;
    project_code: string;
    project_name: string;
    project_type: string;
    client_name?: string;
    description?: string;
    start_date: Date;
    end_date?: Date;
    budget?: number;
    currency?: string;
    project_manager_id?: string;
    created_by: string;
  }): Promise<Project> {
    const project_id = uuidv4();

    const result = await this.db.query(
      `INSERT INTO projects (
        project_id, organization_id, project_code, project_name, project_type,
        client_name, description, start_date, end_date, budget, currency,
        status, project_manager_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        project_id,
        data.organization_id,
        data.project_code,
        data.project_name,
        data.project_type,
        data.client_name,
        data.description,
        data.start_date,
        data.end_date,
        data.budget,
        data.currency || 'USD',
        'active',
        data.project_manager_id,
        data.created_by,
      ]
    );

    return result.rows[0];
  }

  async getProjects(
    organization_id: string,
    filters?: { status?: string; project_type?: string }
  ): Promise<Project[]> {
    let query = `
      SELECT 
        p.*,
        pm.first_name || ' ' || pm.last_name as project_manager_name,
        COUNT(DISTINCT pmem.member_id) as member_count,
        COUNT(DISTINCT pt.task_id) as task_count,
        COUNT(DISTINCT pt.task_id) FILTER (WHERE pt.status = 'completed') as completed_tasks
      FROM projects p
      LEFT JOIN employees pm ON p.project_manager_id = pm.employee_id
      LEFT JOIN project_members pmem ON p.project_id = pmem.project_id AND pmem.is_active = TRUE
      LEFT JOIN project_tasks pt ON p.project_id = pt.project_id
      WHERE p.organization_id = $1 AND p.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];
    let paramCounter = 2;

    if (filters?.status) {
      query += ` AND p.status = $${paramCounter}`;
      params.push(filters.status);
      paramCounter++;
    }

    if (filters?.project_type) {
      query += ` AND p.project_type = $${paramCounter}`;
      params.push(filters.project_type);
      paramCounter++;
    }

    query += `
      GROUP BY p.project_id, pm.first_name, pm.last_name
      ORDER BY p.start_date DESC
    `;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async getProjectById(
    project_id: string,
    organization_id: string
  ): Promise<any> {
    const result = await this.db.query(
      `SELECT 
        p.*,
        pm.first_name || ' ' || pm.last_name as project_manager_name,
        COUNT(DISTINCT pmem.member_id) as member_count,
        SUM(te.hours_worked) as total_hours_logged,
        SUM(te.hours_worked) FILTER (WHERE te.is_billable = TRUE) as billable_hours
      FROM projects p
      LEFT JOIN employees pm ON p.project_manager_id = pm.employee_id
      LEFT JOIN project_members pmem ON p.project_id = pmem.project_id AND pmem.is_active = TRUE
      LEFT JOIN timesheet_entries te ON p.project_id = te.project_id AND te.status = 'approved'
      WHERE p.project_id = $1 AND p.organization_id = $2 AND p.is_deleted = FALSE
      GROUP BY p.project_id, pm.first_name, pm.last_name`,
      [project_id, organization_id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Project not found', 404);
    }

    return result.rows[0];
  }

  // ==================== PROJECT MEMBERS ====================

  async addProjectMember(data: {
    project_id: string;
    employee_id: string;
    role: string;
    hourly_rate?: number;
    allocation_percentage?: number;
    start_date: Date;
    end_date?: Date;
    organization_id: string;
  }): Promise<ProjectMember> {
    const member_id = uuidv4();

    // Verify project exists
    await this.getProjectById(data.project_id, data.organization_id);

    const result = await this.db.query(
      `INSERT INTO project_members (
        member_id, project_id, employee_id, role, hourly_rate,
        allocation_percentage, start_date, end_date, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        member_id,
        data.project_id,
        data.employee_id,
        data.role,
        data.hourly_rate,
        data.allocation_percentage,
        data.start_date,
        data.end_date,
        true,
      ]
    );

    return result.rows[0];
  }

  async getProjectMembers(project_id: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT 
        pm.*,
        e.employee_code,
        e.first_name || ' ' || e.last_name as employee_name,
        e.email,
        d.department_name,
        SUM(te.hours_worked) as total_hours_logged
      FROM project_members pm
      INNER JOIN employees e ON pm.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN timesheet_entries te ON pm.employee_id = te.employee_id 
        AND pm.project_id = te.project_id 
        AND te.status = 'approved'
      WHERE pm.project_id = $1 AND pm.is_deleted = FALSE
      GROUP BY pm.member_id, pm.project_id, pm.employee_id, pm.role, pm.hourly_rate,
               pm.allocation_percentage, pm.start_date, pm.end_date, pm.is_active, pm.created_at,
               e.employee_code, e.first_name, e.last_name, e.email, d.department_name
      ORDER BY pm.is_active DESC, pm.start_date DESC`,
      [project_id]
    );

    return result.rows;
  }

  // ==================== PROJECT TASKS ====================

  async createProjectTask(data: {
    project_id: string;
    task_name: string;
    task_description?: string;
    assigned_to?: string;
    estimated_hours?: number;
    priority: string;
    start_date?: Date;
    due_date?: Date;
    organization_id: string;
  }): Promise<ProjectTask> {
    const task_id = uuidv4();

    // Verify project exists
    await this.getProjectById(data.project_id, data.organization_id);

    const result = await this.db.query(
      `INSERT INTO project_tasks (
        task_id, project_id, task_name, task_description, assigned_to,
        estimated_hours, actual_hours, status, priority, start_date, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        task_id,
        data.project_id,
        data.task_name,
        data.task_description,
        data.assigned_to,
        data.estimated_hours,
        0,
        'todo',
        data.priority,
        data.start_date,
        data.due_date,
      ]
    );

    return result.rows[0];
  }

  async getProjectTasks(
    project_id: string,
    filters?: { status?: string; assigned_to?: string }
  ): Promise<any[]> {
    let query = `
      SELECT 
        pt.*,
        e.first_name || ' ' || e.last_name as assigned_to_name,
        SUM(te.hours_worked) as logged_hours
      FROM project_tasks pt
      LEFT JOIN employees e ON pt.assigned_to = e.employee_id
      LEFT JOIN timesheet_entries te ON pt.task_id = te.task_id AND te.status = 'approved'
      WHERE pt.project_id = $1 AND pt.is_deleted = FALSE
    `;
    const params: any[] = [project_id];
    let paramCounter = 2;

    if (filters?.status) {
      query += ` AND pt.status = $${paramCounter}`;
      params.push(filters.status);
      paramCounter++;
    }

    if (filters?.assigned_to) {
      query += ` AND pt.assigned_to = $${paramCounter}`;
      params.push(filters.assigned_to);
      paramCounter++;
    }

    query += `
      GROUP BY pt.task_id, e.first_name, e.last_name
      ORDER BY pt.priority DESC, pt.due_date ASC NULLS LAST
    `;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async updateTaskStatus(
    task_id: string,
    status: string,
    completed_date?: Date
  ): Promise<ProjectTask> {
    const result = await this.db.query(
      `UPDATE project_tasks
       SET status = $1,
           completed_date = CASE WHEN $1 = 'completed' THEN COALESCE($2, NOW()) ELSE NULL END,
           modified_at = NOW()
       WHERE task_id = $3 AND is_deleted = FALSE
       RETURNING *`,
      [status, completed_date, task_id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Task not found', 404);
    }

    return result.rows[0];
  }

  // ==================== TIMESHEET ENTRIES ====================

  async createTimesheetEntry(data: {
    employee_id: string;
    project_id?: string;
    task_id?: string;
    work_date: Date;
    hours_worked: number;
    is_billable?: boolean;
    description?: string;
    organization_id: string;
  }): Promise<TimesheetEntry> {
    const entry_id = uuidv4();

    // Validate hours
    if (data.hours_worked <= 0 || data.hours_worked > 24) {
      throw new AppError('Hours worked must be between 0 and 24', 400);
    }

    // Verify employee exists
    const employeeCheck = await this.db.query(
      `SELECT employee_id FROM employees WHERE employee_id = $1 AND organization_id = $2`,
      [data.employee_id, data.organization_id]
    );

    if (employeeCheck.rows.length === 0) {
      throw new AppError('Employee not found', 404);
    }

    const result = await this.db.query(
      `INSERT INTO timesheet_entries (
        entry_id, employee_id, project_id, task_id, work_date,
        hours_worked, is_billable, description, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        entry_id,
        data.employee_id,
        data.project_id,
        data.task_id,
        data.work_date,
        data.hours_worked,
        data.is_billable ?? false,
        data.description,
        'draft',
      ]
    );

    return result.rows[0];
  }

  async getTimesheetEntries(
    employee_id: string,
    organization_id: string,
    filters?: {
      start_date?: Date;
      end_date?: Date;
      project_id?: string;
      status?: string;
    }
  ): Promise<any[]> {
    let query = `
      SELECT 
        te.*,
        p.project_name,
        p.project_code,
        pt.task_name,
        e.first_name || ' ' || e.last_name as employee_name
      FROM timesheet_entries te
      INNER JOIN employees e ON te.employee_id = e.employee_id
      LEFT JOIN projects p ON te.project_id = p.project_id
      LEFT JOIN project_tasks pt ON te.task_id = pt.task_id
      WHERE te.employee_id = $1 
        AND e.organization_id = $2
        AND te.is_deleted = FALSE
    `;
    const params: any[] = [employee_id, organization_id];
    let paramCounter = 3;

    if (filters?.start_date) {
      query += ` AND te.work_date >= $${paramCounter}`;
      params.push(filters.start_date);
      paramCounter++;
    }

    if (filters?.end_date) {
      query += ` AND te.work_date <= $${paramCounter}`;
      params.push(filters.end_date);
      paramCounter++;
    }

    if (filters?.project_id) {
      query += ` AND te.project_id = $${paramCounter}`;
      params.push(filters.project_id);
      paramCounter++;
    }

    if (filters?.status) {
      query += ` AND te.status = $${paramCounter}`;
      params.push(filters.status);
      paramCounter++;
    }

    query += ` ORDER BY te.work_date DESC, te.created_at DESC`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async submitTimesheet(
    employee_id: string,
    entry_ids: string[]
  ): Promise<void> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE timesheet_entries
         SET status = 'submitted',
             submitted_at = NOW()
         WHERE entry_id = ANY($1) 
           AND employee_id = $2 
           AND status = 'draft'`,
        [entry_ids, employee_id]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async approveTimesheetEntry(
    entry_id: string,
    approved_by: string,
    organization_id: string
  ): Promise<TimesheetEntry> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE timesheet_entries te
         SET status = 'approved',
             approved_by = $1,
             approved_at = NOW()
         FROM employees e
         WHERE te.entry_id = $2 
           AND te.employee_id = e.employee_id
           AND e.organization_id = $3
           AND te.status = 'submitted'
         RETURNING te.*`,
        [approved_by, entry_id, organization_id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Timesheet entry not found or cannot be approved', 404);
      }

      const entry = result.rows[0];

      // Update task actual hours if task_id is present
      if (entry.task_id) {
        await client.query(
          `UPDATE project_tasks
           SET actual_hours = COALESCE(actual_hours, 0) + $1
           WHERE task_id = $2`,
          [entry.hours_worked, entry.task_id]
        );
      }

      await client.query('COMMIT');

      return entry;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async rejectTimesheetEntry(
    entry_id: string,
    rejected_by: string,
    rejection_reason: string,
    organization_id: string
  ): Promise<TimesheetEntry> {
    const result = await this.db.query(
      `UPDATE timesheet_entries te
       SET status = 'rejected',
           approved_by = $1,
           approved_at = NOW(),
           rejection_reason = $2
       FROM employees e
       WHERE te.entry_id = $3 
         AND te.employee_id = e.employee_id
         AND e.organization_id = $4
         AND te.status = 'submitted'
       RETURNING te.*`,
      [rejected_by, rejection_reason, entry_id, organization_id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Timesheet entry not found or cannot be rejected', 404);
    }

    return result.rows[0];
  }

  // ==================== ANALYTICS ====================

  async getEmployeeTimeSummary(
    employee_id: string,
    organization_id: string,
    start_date: Date,
    end_date: Date
  ): Promise<any> {
    const result = await this.db.query(
      `SELECT 
        SUM(te.hours_worked) as total_hours,
        SUM(te.hours_worked) FILTER (WHERE te.is_billable = TRUE) as billable_hours,
        SUM(te.hours_worked) FILTER (WHERE te.is_billable = FALSE) as non_billable_hours,
        COUNT(DISTINCT te.project_id) as projects_worked,
        COUNT(DISTINCT te.work_date) as days_logged
      FROM timesheet_entries te
      INNER JOIN employees e ON te.employee_id = e.employee_id
      WHERE te.employee_id = $1 
        AND e.organization_id = $2
        AND te.work_date >= $3 
        AND te.work_date <= $4
        AND te.status = 'approved'
        AND te.is_deleted = FALSE`,
      [employee_id, organization_id, start_date, end_date]
    );

    return result.rows[0];
  }

  async getProjectTimeSummary(
    project_id: string,
    organization_id: string
  ): Promise<any> {
    const result = await this.db.query(
      `SELECT 
        p.project_id,
        p.project_name,
        p.budget,
        SUM(te.hours_worked) as total_hours_logged,
        SUM(te.hours_worked) FILTER (WHERE te.is_billable = TRUE) as billable_hours,
        SUM(te.hours_worked * COALESCE(pm.hourly_rate, 0)) as total_cost,
        COUNT(DISTINCT te.employee_id) as contributors,
        SUM(pt.estimated_hours) as estimated_hours
      FROM projects p
      LEFT JOIN timesheet_entries te ON p.project_id = te.project_id AND te.status = 'approved'
      LEFT JOIN project_members pm ON te.employee_id = pm.employee_id AND te.project_id = pm.project_id
      LEFT JOIN project_tasks pt ON p.project_id = pt.project_id
      WHERE p.project_id = $1 
        AND p.organization_id = $2
        AND p.is_deleted = FALSE
      GROUP BY p.project_id, p.project_name, p.budget`,
      [project_id, organization_id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Project not found', 404);
    }

    return result.rows[0];
  }

  async getPendingApprovals(
    manager_id: string,
    organization_id: string
  ): Promise<any[]> {
    const result = await this.db.query(
      `SELECT 
        te.*,
        e.employee_code,
        e.first_name || ' ' || e.last_name as employee_name,
        p.project_name,
        pt.task_name
      FROM timesheet_entries te
      INNER JOIN employees e ON te.employee_id = e.employee_id
      LEFT JOIN projects p ON te.project_id = p.project_id
      LEFT JOIN project_tasks pt ON te.task_id = pt.task_id
      WHERE e.organization_id = $1
        AND te.status = 'submitted'
        AND (e.manager_id = $2 OR p.project_manager_id = $2)
        AND te.is_deleted = FALSE
      ORDER BY te.submitted_at ASC`,
      [organization_id, manager_id]
    );

    return result.rows;
  }
}
