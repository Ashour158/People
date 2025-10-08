import { query, transaction } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { getPagination, getPaginationMeta } from '../utils/pagination';
import * as fastcsv from 'fast-csv';
import { Writable } from 'stream';

interface BulkImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; email: string; errors: string[] }>;
  employees: any[];
}

interface BulkImportEmployee {
  employee_code?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  personal_email?: string;
  phone_number?: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  blood_group?: string;
  nationality?: string;
  department_name?: string;
  designation_name?: string;
  location_name?: string;
  manager_email?: string;
  date_of_joining: string;
  employment_type: string;
  work_location_type?: string;
  probation_period_months?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  employee_status?: string;
}

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

  /**
   * Bulk import employees from CSV data
   */
  async bulkImportEmployees(
    organizationId: string, 
    companyId: string, 
    employees: BulkImportEmployee[]
  ): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      employees: []
    };

    return transaction(async (client) => {
      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        const rowNum = i + 2; // +2 because row 1 is header and we start from 0

        try {
          const errors: string[] = [];

          // Resolve department_id from department_name
          let departmentId = null;
          if (emp.department_name) {
            const deptResult = await client.query(
              'SELECT department_id FROM departments WHERE organization_id = $1 AND department_name ILIKE $2 AND is_active = TRUE',
              [organizationId, emp.department_name.trim()]
            );
            if (deptResult.rows.length > 0) {
              departmentId = deptResult.rows[0].department_id;
            } else {
              errors.push(`Department '${emp.department_name}' not found`);
            }
          }

          // Resolve designation_id from designation_name
          let designationId = null;
          if (emp.designation_name) {
            const desResult = await client.query(
              'SELECT designation_id FROM designations WHERE organization_id = $1 AND designation_name ILIKE $2 AND is_active = TRUE',
              [organizationId, emp.designation_name.trim()]
            );
            if (desResult.rows.length > 0) {
              designationId = desResult.rows[0].designation_id;
            } else {
              errors.push(`Designation '${emp.designation_name}' not found`);
            }
          }

          // Resolve location_id from location_name
          let locationId = null;
          if (emp.location_name) {
            const locResult = await client.query(
              'SELECT location_id FROM locations WHERE organization_id = $1 AND location_name ILIKE $2 AND is_active = TRUE',
              [organizationId, emp.location_name.trim()]
            );
            if (locResult.rows.length > 0) {
              locationId = locResult.rows[0].location_id;
            } else {
              errors.push(`Location '${emp.location_name}' not found`);
            }
          }

          // Resolve manager_id from manager_email
          let managerId = null;
          if (emp.manager_email) {
            const mgrResult = await client.query(
              'SELECT employee_id FROM employees WHERE organization_id = $1 AND email = $2 AND is_deleted = FALSE',
              [organizationId, emp.manager_email.trim()]
            );
            if (mgrResult.rows.length > 0) {
              managerId = mgrResult.rows[0].employee_id;
            } else {
              errors.push(`Manager with email '${emp.manager_email}' not found`);
            }
          }

          // Check for duplicate email
          const emailCheck = await client.query(
            'SELECT employee_id FROM employees WHERE organization_id = $1 AND email = $2 AND is_deleted = FALSE',
            [organizationId, emp.email.trim()]
          );
          if (emailCheck.rows.length > 0) {
            errors.push(`Email '${emp.email}' already exists`);
          }

          // Check for duplicate employee_code if provided
          if (emp.employee_code) {
            const codeCheck = await client.query(
              'SELECT employee_id FROM employees WHERE organization_id = $1 AND employee_code = $2 AND is_deleted = FALSE',
              [organizationId, emp.employee_code.trim()]
            );
            if (codeCheck.rows.length > 0) {
              errors.push(`Employee code '${emp.employee_code}' already exists`);
            }
          }

          // If there are any errors, add to errors array and continue
          if (errors.length > 0) {
            result.failed++;
            result.errors.push({
              row: rowNum,
              email: emp.email,
              errors
            });
            continue;
          }

          // Generate employee_code if not provided
          const employeeCode = emp.employee_code?.trim() || `EMP${Date.now()}${i}`;

          // Insert employee
          const insertResult = await client.query(
            `INSERT INTO employees (
              organization_id, company_id, employee_code, first_name, middle_name, last_name,
              email, personal_email, phone_number, date_of_birth, gender, marital_status,
              blood_group, nationality, department_id, designation_id, location_id, manager_id,
              date_of_joining, hire_date, employment_type, work_location_type, 
              probation_period_months, emergency_contact_name, emergency_contact_phone,
              emergency_contact_relationship, employee_status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $19, $20, $21, $22, $23, $24, $25, $26, NOW(), NOW())
            RETURNING employee_id, employee_code, first_name, last_name, email, employee_status`,
            [
              organizationId,
              companyId,
              employeeCode,
              emp.first_name.trim(),
              emp.middle_name?.trim() || null,
              emp.last_name.trim(),
              emp.email.trim(),
              emp.personal_email?.trim() || null,
              emp.phone_number?.trim() || null,
              emp.date_of_birth || null,
              emp.gender || null,
              emp.marital_status || null,
              emp.blood_group?.trim() || null,
              emp.nationality?.trim() || null,
              departmentId,
              designationId,
              locationId,
              managerId,
              emp.date_of_joining,
              emp.employment_type,
              emp.work_location_type || null,
              emp.probation_period_months || 3,
              emp.emergency_contact_name?.trim() || null,
              emp.emergency_contact_phone?.trim() || null,
              emp.emergency_contact_relationship?.trim() || null,
              emp.employee_status || 'active'
            ]
          );

          result.success++;
          result.employees.push(insertResult.rows[0]);

        } catch (error: any) {
          result.failed++;
          result.errors.push({
            row: rowNum,
            email: emp.email,
            errors: [error.message || 'Unknown error occurred']
          });
        }
      }

      return result;
    });
  }

  /**
   * Export employees to CSV format
   */
  async exportEmployees(organizationId: string, filters: any = {}): Promise<string> {
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

    const whereClause = whereConditions.join(' AND ');

    const result = await query(
      `SELECT 
        e.employee_code,
        e.first_name,
        e.middle_name,
        e.last_name,
        e.email,
        e.personal_email,
        e.phone_number,
        e.date_of_birth,
        e.gender,
        e.marital_status,
        e.blood_group,
        e.nationality,
        d.department_name,
        des.designation_name,
        l.location_name,
        m.email as manager_email,
        e.date_of_joining,
        e.employment_type,
        e.work_location_type,
        e.probation_period_months,
        e.emergency_contact_name,
        e.emergency_contact_phone,
        e.emergency_contact_relationship,
        e.employee_status
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN designations des ON e.designation_id = des.designation_id
      LEFT JOIN locations l ON e.location_id = l.location_id
      LEFT JOIN employees m ON e.manager_id = m.employee_id
      WHERE ${whereClause}
      ORDER BY e.created_at DESC`,
      params
    );

    // Convert to CSV
    return new Promise((resolve, reject) => {
      const csvRows: string[] = [];
      
      const csvStream = fastcsv.format({ headers: true });
      
      csvStream.on('data', (row: string) => {
        csvRows.push(row);
      });
      
      csvStream.on('end', () => {
        resolve(csvRows.join(''));
      });
      
      csvStream.on('error', (error: Error) => {
        reject(error);
      });

      // Write all rows
      result.rows.forEach(row => {
        csvStream.write({
          employee_code: row.employee_code || '',
          first_name: row.first_name || '',
          middle_name: row.middle_name || '',
          last_name: row.last_name || '',
          email: row.email || '',
          personal_email: row.personal_email || '',
          phone_number: row.phone_number || '',
          date_of_birth: row.date_of_birth || '',
          gender: row.gender || '',
          marital_status: row.marital_status || '',
          blood_group: row.blood_group || '',
          nationality: row.nationality || '',
          department_name: row.department_name || '',
          designation_name: row.designation_name || '',
          location_name: row.location_name || '',
          manager_email: row.manager_email || '',
          date_of_joining: row.date_of_joining || '',
          employment_type: row.employment_type || '',
          work_location_type: row.work_location_type || '',
          probation_period_months: row.probation_period_months || '',
          emergency_contact_name: row.emergency_contact_name || '',
          emergency_contact_phone: row.emergency_contact_phone || '',
          emergency_contact_relationship: row.emergency_contact_relationship || '',
          employee_status: row.employee_status || ''
        });
      });

      csvStream.end();
    });
  }

  /**
   * Get CSV template for bulk import
   */
  async getImportTemplate(): Promise<string> {
    const sampleData = {
      employee_code: 'EMP001',
      first_name: 'John',
      middle_name: 'M',
      last_name: 'Doe',
      email: 'john.doe@company.com',
      personal_email: 'john.doe@gmail.com',
      phone_number: '+1234567890',
      date_of_birth: '1990-01-15',
      gender: 'male',
      marital_status: 'single',
      blood_group: 'O+',
      nationality: 'USA',
      department_name: 'Engineering',
      designation_name: 'Software Engineer',
      location_name: 'New York Office',
      manager_email: 'manager@company.com',
      date_of_joining: '2024-01-01',
      employment_type: 'full_time',
      work_location_type: 'hybrid',
      probation_period_months: '3',
      emergency_contact_name: 'Jane Doe',
      emergency_contact_phone: '+1234567891',
      emergency_contact_relationship: 'Spouse',
      employee_status: 'active'
    };

    return new Promise((resolve, reject) => {
      const csvRows: string[] = [];
      
      const csvStream = fastcsv.format({ headers: true });
      
      csvStream.on('data', (row: string) => {
        csvRows.push(row);
      });
      
      csvStream.on('end', () => {
        resolve(csvRows.join(''));
      });
      
      csvStream.on('error', (error: Error) => {
        reject(error);
      });

      csvStream.write(sampleData);
      csvStream.end();
    });
  }
}
