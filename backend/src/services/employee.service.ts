import { query, transaction } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { getPagination, getPaginationMeta } from '../utils/pagination';

export class EmployeeService {
  /**
   * Create new employee
   */
  async createEmployee(organizationId: string, data: any) {
    return transaction(async (client) => {
      // Check if employee code already exists
      const codeCheck = await client.query(
        'SELECT employee_id FROM employees WHERE organization_id = $1 AND employee_code = $2 AND is_deleted = FALSE',
        [organizationId, data.employee_code]
      );

      if (codeCheck.rows.length > 0) {
        throw new AppError(400, 'Employee code already exists');
      }

      // Check if email already exists
      const emailCheck = await client.query(
        'SELECT employee_id FROM employees WHERE organization_id = $1 AND email = $2 AND is_deleted = FALSE',
        [organizationId, data.email]
      );

      if (emailCheck.rows.length > 0) {
        throw new AppError(400, 'Email already registered');
      }

      const result = await client.query(
        `INSERT INTO employees (
          organization_id, company_id, employee_code, first_name, middle_name, last_name,
          email, phone_number, date_of_birth, gender, department_id, designation_id,
          location_id, manager_id, date_of_joining, employment_type, employee_status,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
        RETURNING *`,
        [
          organizationId,
          data.company_id,
          data.employee_code,
          data.first_name,
          data.middle_name,
          data.last_name,
          data.email,
          data.phone_number,
          data.date_of_birth,
          data.gender,
          data.department_id,
          data.designation_id,
          data.location_id,
          data.manager_id,
          data.date_of_joining,
          data.employment_type,
          data.employee_status || 'active'
        ]
      );

      return result.rows[0];
    });
  }

  /**
   * Get employees with filters and pagination
   */
  async getEmployees(organizationId: string, filters: any = {}) {
    const { page, perPage, offset } = getPagination(filters);
    
    const whereConditions = ['e.organization_id = $1', 'e.is_deleted = FALSE'];
    const params: any[] = [organizationId];
    let paramCount = 1;

    if (filters.company_id) {
      paramCount++;
      whereConditions.push(`e.company_id = $${paramCount}`);
      params.push(filters.company_id);
    }

    if (filters.department_id) {
      paramCount++;
      whereConditions.push(`e.department_id = $${paramCount}`);
      params.push(filters.department_id);
    }

    if (filters.employee_status) {
      paramCount++;
      whereConditions.push(`e.employee_status = $${paramCount}`);
      params.push(filters.employee_status);
    }

    if (filters.search) {
      paramCount++;
      whereConditions.push(`(
        e.first_name ILIKE $${paramCount} OR 
        e.last_name ILIKE $${paramCount} OR 
        e.email ILIKE $${paramCount} OR 
        e.employee_code ILIKE $${paramCount}
      )`);
      params.push(`%${filters.search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM employees e WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get employees
    const result = await query(
      `SELECT 
        e.employee_id, e.employee_code, e.first_name, e.middle_name, e.last_name,
        e.email, e.phone_number, e.date_of_birth, e.gender,
        e.date_of_joining, e.employment_type, e.employee_status,
        e.profile_picture_url,
        d.department_id, d.department_name,
        des.designation_id, des.designation_name,
        l.location_id, l.location_name,
        m.employee_id as manager_id, 
        CONCAT(m.first_name, ' ', m.last_name) as manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN designations des ON e.designation_id = des.designation_id
      LEFT JOIN locations l ON e.location_id = l.location_id
      LEFT JOIN employees m ON e.manager_id = m.employee_id
      WHERE ${whereClause}
      ORDER BY e.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      [...params, perPage, offset]
    );

    return {
      employees: result.rows,
      meta: getPaginationMeta(total, page, perPage)
    };
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(organizationId: string, employeeId: string) {
    const result = await query(
      `SELECT 
        e.*,
        d.department_name,
        des.designation_name,
        l.location_name,
        c.company_name,
        CONCAT(m.first_name, ' ', m.last_name) as manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN designations des ON e.designation_id = des.designation_id
      LEFT JOIN locations l ON e.location_id = l.location_id
      LEFT JOIN companies c ON e.company_id = c.company_id
      LEFT JOIN employees m ON e.manager_id = m.employee_id
      WHERE e.employee_id = $1 AND e.organization_id = $2 AND e.is_deleted = FALSE`,
      [employeeId, organizationId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Employee not found');
    }

    return result.rows[0];
  }

  /**
   * Update employee
   */
  async updateEmployee(organizationId: string, employeeId: string, data: any) {
    const employee = await this.getEmployeeById(organizationId, employeeId);

    if (!employee) {
      throw new AppError(404, 'Employee not found');
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return employee;
    }

    paramCount++;
    values.push(employeeId);
    paramCount++;
    values.push(organizationId);

    const result = await query(
      `UPDATE employees 
       SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE employee_id = $${paramCount - 1} AND organization_id = $${paramCount}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete employee (soft delete)
   */
  async deleteEmployee(organizationId: string, employeeId: string) {
    const result = await query(
      `UPDATE employees 
       SET is_deleted = TRUE, deleted_at = NOW(), updated_at = NOW()
       WHERE employee_id = $1 AND organization_id = $2 AND is_deleted = FALSE
       RETURNING employee_id`,
      [employeeId, organizationId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Employee not found');
    }

    return { message: 'Employee deleted successfully' };
  }

  /**
   * Terminate employee
   */
  async terminateEmployee(
    organizationId: string,
    employeeId: string,
    data: {
      termination_date: Date;
      last_working_date: Date;
      termination_reason: string;
      termination_type: 'voluntary' | 'involuntary' | 'retirement' | 'contract_end';
      is_rehire_eligible?: boolean;
      exit_notes?: string;
    }
  ) {
    return transaction(async (client) => {
      // Check if employee exists
      const employeeCheck = await client.query(
        'SELECT employee_id, first_name, last_name FROM employees WHERE employee_id = $1 AND organization_id = $2 AND is_deleted = FALSE',
        [employeeId, organizationId]
      );

      if (employeeCheck.rows.length === 0) {
        throw new AppError(404, 'Employee not found');
      }

      const employee = employeeCheck.rows[0];

      // Update employee status to terminated
      const result = await client.query(
        `UPDATE employees 
        SET 
          employee_status = 'terminated',
          termination_date = $1,
          termination_reason = $2,
          termination_type = $3,
          updated_at = NOW()
        WHERE employee_id = $4 AND organization_id = $5
        RETURNING *`,
        [
          data.termination_date,
          data.termination_reason,
          data.termination_type,
          employeeId,
          organizationId
        ]
      );

      // Deactivate user account if exists
      await client.query(
        'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE email = (SELECT email FROM employees WHERE employee_id = $1)',
        [employeeId]
      );

      return result.rows[0];
    });
  }

  /**
   * Get employee's team (direct reports)
   */
  async getEmployeeTeam(organizationId: string, employeeId: string) {
    const result = await query(
      `SELECT 
        e.employee_id, e.employee_code, e.first_name, e.middle_name, e.last_name,
        e.email, e.phone_number, e.employee_status, e.employment_type,
        e.date_of_joining, e.profile_picture_url,
        d.department_name,
        des.designation_name,
        l.location_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN designations des ON e.designation_id = des.designation_id
      LEFT JOIN locations l ON e.location_id = l.location_id
      WHERE e.manager_id = $1 
        AND e.organization_id = $2 
        AND e.is_deleted = FALSE
        AND e.employee_status IN ('active', 'on_probation', 'on_leave')
      ORDER BY e.date_of_joining DESC`,
      [employeeId, organizationId]
    );

    return result.rows;
  }

  /**
   * Get employee statistics
   */
  async getEmployeeStats(organizationId: string, companyId?: string) {
    let whereClause = 'organization_id = $1 AND is_deleted = FALSE';
    const params: any[] = [organizationId];

    if (companyId) {
      whereClause += ' AND company_id = $2';
      params.push(companyId);
    }

    const result = await query(
      `SELECT 
        COUNT(*) as total_employees,
        COUNT(*) FILTER (WHERE employee_status = 'active') as active_employees,
        COUNT(*) FILTER (WHERE employee_status = 'on_probation') as on_probation,
        COUNT(*) FILTER (WHERE employee_status = 'on_leave') as on_leave,
        COUNT(*) FILTER (WHERE employee_status = 'terminated') as terminated,
        COUNT(*) FILTER (WHERE employment_type = 'full_time') as full_time,
        COUNT(*) FILTER (WHERE employment_type = 'part_time') as part_time,
        COUNT(*) FILTER (WHERE employment_type = 'contract') as contract,
        COUNT(*) FILTER (WHERE employment_type = 'intern') as interns,
        COUNT(*) FILTER (WHERE gender = 'male') as male_count,
        COUNT(*) FILTER (WHERE gender = 'female') as female_count,
        COUNT(*) FILTER (WHERE date_of_joining >= CURRENT_DATE - INTERVAL '30 days') as new_hires_last_month,
        COUNT(*) FILTER (WHERE termination_date >= CURRENT_DATE - INTERVAL '30 days' AND employee_status = 'terminated') as exits_last_month
      FROM employees
      WHERE ${whereClause}`,
      params
    );

    return result.rows[0];
  }

  /**
   * Activate employee
   */
  async activateEmployee(organizationId: string, employeeId: string) {
    const result = await query(
      `UPDATE employees 
       SET employee_status = 'active', updated_at = NOW()
       WHERE employee_id = $1 AND organization_id = $2 AND is_deleted = FALSE
       RETURNING *`,
      [employeeId, organizationId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Employee not found');
    }

    return result.rows[0];
  }

  /**
   * Get employee count by department
   */
  async getEmployeesByDepartment(organizationId: string, companyId?: string) {
    let whereClause = 'e.organization_id = $1 AND e.is_deleted = FALSE';
    const params: any[] = [organizationId];

    if (companyId) {
      whereClause += ' AND e.company_id = $2';
      params.push(companyId);
    }

    const result = await query(
      `SELECT 
        d.department_id,
        d.department_name,
        COUNT(e.employee_id) as employee_count,
        COUNT(*) FILTER (WHERE e.employee_status = 'active') as active_count,
        COUNT(*) FILTER (WHERE e.employment_type = 'full_time') as full_time_count
      FROM departments d
      LEFT JOIN employees e ON d.department_id = e.department_id AND ${whereClause}
      WHERE d.organization_id = $1 AND d.is_active = TRUE
      GROUP BY d.department_id, d.department_name
      ORDER BY employee_count DESC`,
      params
    );

    return result.rows;
  }

  /**
   * Get employees joining this month
   */
  async getNewJoiners(organizationId: string, companyId?: string) {
    let whereClause = 'organization_id = $1 AND is_deleted = FALSE';
    const params: any[] = [organizationId];

    if (companyId) {
      whereClause += ' AND company_id = $2';
      params.push(companyId);
    }

    whereClause += ' AND date_of_joining >= DATE_TRUNC(\'month\', CURRENT_DATE)';

    const result = await query(
      `SELECT 
        e.employee_id, e.employee_code, e.first_name, e.last_name,
        e.email, e.phone_number, e.date_of_joining, e.profile_picture_url,
        d.department_name,
        des.designation_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN designations des ON e.designation_id = des.designation_id
      WHERE ${whereClause}
      ORDER BY e.date_of_joining DESC`,
      params
    );

    return result.rows;
  }

  /**
   * Get employees on probation
   */
  async getEmployeesOnProbation(organizationId: string, companyId?: string) {
    let whereClause = 'organization_id = $1 AND is_deleted = FALSE AND employee_status = \'on_probation\'';
    const params: any[] = [organizationId];

    if (companyId) {
      whereClause += ' AND company_id = $2';
      params.push(companyId);
    }

    const result = await query(
      `SELECT 
        e.employee_id, e.employee_code, e.first_name, e.last_name,
        e.email, e.date_of_joining, e.profile_picture_url,
        d.department_name,
        des.designation_name,
        EXTRACT(DAY FROM (date_of_joining + INTERVAL '3 months' - CURRENT_DATE)) as days_remaining
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN designations des ON e.designation_id = des.designation_id
      WHERE ${whereClause}
      ORDER BY days_remaining ASC`,
      params
    );

    return result.rows;
  }

  /**
   * Search employees
   */
  async searchEmployees(organizationId: string, searchTerm: string, limit: number = 10) {
    const result = await query(
      `SELECT 
        e.employee_id, e.employee_code, e.first_name, e.last_name,
        e.email, e.phone_number, e.profile_picture_url,
        d.department_name,
        des.designation_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN designations des ON e.designation_id = des.designation_id
      WHERE e.organization_id = $1 
        AND e.is_deleted = FALSE
        AND (
          e.first_name ILIKE $2 OR 
          e.last_name ILIKE $2 OR 
          e.email ILIKE $2 OR 
          e.employee_code ILIKE $2
        )
      ORDER BY e.first_name, e.last_name
      LIMIT $3`,
      [organizationId, `%${searchTerm}%`, limit]
    );

    return result.rows;
  }
}
