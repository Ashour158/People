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
    
    let whereConditions = ['e.organization_id = $1', 'e.is_deleted = FALSE'];
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
}
