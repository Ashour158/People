// =====================================================
// EMPLOYEE MANAGEMENT MODULE - COMPLETE IMPLEMENTATION
// =====================================================

// ===== src/validators/employee.validator.ts =====
import Joi from 'joi';

export const createEmployeeSchema = Joi.object({
  employee_code: Joi.string().max(50).optional(),
  first_name: Joi.string().min(2).max(100).required(),
  middle_name: Joi.string().max(100).optional(),
  last_name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  personal_email: Joi.string().email().optional(),
  phone_number: Joi.string().pattern(/^[0-9+\-\s()]+$/).optional(),
  date_of_birth: Joi.date().max('now').optional(),
  gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').optional(),
  marital_status: Joi.string().valid('single', 'married', 'divorced', 'widowed').optional(),
  blood_group: Joi.string().optional(),
  nationality: Joi.string().optional(),
  
  company_id: Joi.string().uuid().required(),
  department_id: Joi.string().uuid().optional(),
  designation_id: Joi.string().uuid().optional(),
  location_id: Joi.string().uuid().optional(),
  
  hire_date: Joi.date().required(),
  employment_type: Joi.string().valid('full_time', 'part_time', 'contract', 'intern', 'consultant').required(),
  probation_period_months: Joi.number().integer().min(0).max(12).optional(),
  
  reporting_manager_id: Joi.string().uuid().optional(),
  work_location_type: Joi.string().valid('office', 'remote', 'hybrid').optional(),
  
  emergency_contact_name: Joi.string().optional(),
  emergency_contact_phone: Joi.string().optional(),
  emergency_contact_relationship: Joi.string().optional()
});

export const updateEmployeeSchema = Joi.object({
  first_name: Joi.string().min(2).max(100).optional(),
  middle_name: Joi.string().max(100).optional().allow(null, ''),
  last_name: Joi.string().min(2).max(100).optional(),
  personal_email: Joi.string().email().optional().allow(null, ''),
  phone_number: Joi.string().pattern(/^[0-9+\-\s()]+$/).optional().allow(null, ''),
  date_of_birth: Joi.date().max('now').optional().allow(null),
  gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').optional(),
  marital_status: Joi.string().valid('single', 'married', 'divorced', 'widowed').optional(),
  blood_group: Joi.string().optional().allow(null, ''),
  nationality: Joi.string().optional().allow(null, ''),
  
  department_id: Joi.string().uuid().optional().allow(null),
  designation_id: Joi.string().uuid().optional().allow(null),
  location_id: Joi.string().uuid().optional().allow(null),
  reporting_manager_id: Joi.string().uuid().optional().allow(null),
  
  work_location_type: Joi.string().valid('office', 'remote', 'hybrid').optional(),
  employee_status: Joi.string().valid('active', 'on_leave', 'on_probation', 'suspended').optional(),
  
  emergency_contact_name: Joi.string().optional().allow(null, ''),
  emergency_contact_phone: Joi.string().optional().allow(null, ''),
  emergency_contact_relationship: Joi.string().optional().allow(null, '')
});

export const terminateEmployeeSchema = Joi.object({
  termination_date: Joi.date().required(),
  last_working_date: Joi.date().required(),
  termination_reason: Joi.string().required(),
  termination_type: Joi.string().valid('voluntary', 'involuntary').required(),
  is_rehire_eligible: Joi.boolean().default(true)
});

// ===== src/services/employee.service.ts =====
import { query, transaction } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { getPagination, getPaginationMeta } from '../utils/pagination';

export class EmployeeService {
  /**
   * Get all employees with filters and pagination
   */
  async getEmployees(organizationId: string, filters: any) {
    const { page, limit, offset } = getPagination(filters.page, filters.limit);
    
    let whereConditions = ['e.organization_id = $1', 'e.is_deleted = FALSE'];
    let params: any[] = [organizationId];
    let paramCount = 1;

    // Build dynamic filters
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

    if (filters.location_id) {
      paramCount++;
      whereConditions.push(`e.location_id = $${paramCount}`);
      params.push(filters.location_id);
    }

    if (filters.employee_status) {
      paramCount++;
      whereConditions.push(`e.employee_status = $${paramCount}`);
      params.push(filters.employee_status);
    }

    if (filters.employment_type) {
      paramCount++;
      whereConditions.push(`e.employment_type = $${paramCount}`);
      params.push(filters.employment_type);
    }

    if (filters.search) {
      paramCount++;
      whereConditions.push(`(
        e.full_name ILIKE $${paramCount} OR 
        e.employee_code ILIKE $${paramCount} OR 
        e.email ILIKE $${paramCount}
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
    const sql = `
      SELECT 
        e.employee_id, e.employee_code, e.first_name, e.middle_name, e.last_name,
        e.full_name, e.email, e.personal_email, e.phone_number, e.date_of_birth,
        e.gender, e.blood_group, e.marital_status, e.nationality,
        e.hire_date, e.employment_type, e.employee_status, e.work_location_type,
        e.profile_picture_url,
        c.company_id, c.company_name,
        d.department_id, d.department_name,
        des.designation_id, des.designation_name,
        l.location_id, l.location_name,
        mgr.employee_id as manager_id, mgr.full_name as manager_name,
        e.created_at, e.modified_at
      FROM employees e
      LEFT JOIN companies c ON e.company_id = c.company_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN designations des ON e.designation_id = des.designation_id
      LEFT JOIN locations l ON e.location_id = l.location_id
      LEFT JOIN employees mgr ON e.reporting_manager_id = mgr.employee_id
      WHERE ${whereClause}
      ORDER BY e.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);

    const result = await query(sql, params);

    return {
      employees: result.rows,
      meta: getPaginationMeta(total, page, limit)
    };
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(employeeId: string, organizationId: string) {
    const result = await query(
      `SELECT 
        e.*,
        c.company_id, c.company_name,
        d.department_id, d.department_name,
        des.designation_id, des.designation_name,
        l.location_id, l.location_name,
        mgr.employee_id as manager_id, mgr.full_name as manager_name,
        mgr.email as manager_email,
        (
          SELECT json_agg(
            json_build_object(
              'address_id', ea.address_id,
              'address_type', ea.address_type,
              'address_line1', ea.address_line1,
              'address_line2', ea.address_line2,
              'city', ea.city,
              'state', ea.state,
              'country', ea.country,
              'postal_code', ea.postal_code,
              'is_primary', ea.is_primary
            )
          )
          FROM employee_addresses ea
          WHERE ea.employee_id = e.employee_id
        ) as addresses,
        (
          SELECT json_agg(
            json_build_object(
              'contact_id', ec.contact_id,
              'contact_name', ec.contact_name,
              'relationship', ec.relationship,
              'phone_number', ec.phone_number,
              'email', ec.email,
              'is_primary', ec.is_primary
            )
          )
          FROM emergency_contacts ec
          WHERE ec.employee_id = e.employee_id
        ) as emergency_contacts,
        (
          SELECT json_agg(
            json_build_object(
              'education_id', ed.education_id,
              'education_level', ed.education_level,
              'degree_name', ed.degree_name,
              'institution_name', ed.institution_name,
              'field_of_study', ed.field_of_study,
              'start_date', ed.start_date,
              'end_date', ed.end_date,
              'is_highest_qualification', ed.is_highest_qualification
            )
          )
          FROM education ed
          WHERE ed.employee_id = e.employee_id
          ORDER BY ed.end_date DESC NULLS LAST
        ) as education,
        (
          SELECT json_agg(
            json_build_object(
              'experience_id', we.experience_id,
              'company_name', we.company_name,
              'job_title', we.job_title,
              'from_date', we.from_date,
              'to_date', we.to_date,
              'is_current', we.is_current
            )
          )
          FROM work_experience we
          WHERE we.employee_id = e.employee_id
          ORDER BY we.from_date DESC
        ) as work_experience
      FROM employees e
      LEFT JOIN companies c ON e.company_id = c.company_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN designations des ON e.designation_id = des.designation_id
      LEFT JOIN locations l ON e.location_id = l.location_id
      LEFT JOIN employees mgr ON e.reporting_manager_id = mgr.employee_id
      WHERE e.employee_id = $1 AND e.organization_id = $2 AND e.is_deleted = FALSE`,
      [employeeId, organizationId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Employee not found');
    }

    return result.rows[0];
  }

  /**
   * Create new employee
   */
  async createEmployee(organizationId: string, data: any, createdBy: string) {
    return transaction(async (client) => {
      // Verify company belongs to organization
      const companyCheck = await client.query(
        'SELECT company_id FROM companies WHERE company_id = $1 AND organization_id = $2',
        [data.company_id, organizationId]
      );

      if (companyCheck.rows.length === 0) {
        throw new AppError(400, 'Invalid company');
      }

      // Check if email already exists
      const emailCheck = await client.query(
        'SELECT email FROM employees WHERE email = $1 AND organization_id = $2 AND is_deleted = FALSE',
        [data.email, organizationId]
      );

      if (emailCheck.rows.length > 0) {
        throw new AppError(409, 'Email already exists');
      }

      // Generate employee code if not provided
      let employeeCode = data.employee_code;
      if (!employeeCode) {
        const codeResult = await client.query(
          `SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code FROM '[0-9]+') AS INTEGER)), 0) + 1 as next_code
          FROM employees 
          WHERE organization_id = $1 AND company_id = $2`,
          [organizationId, data.company_id]
        );
        const nextCode = codeResult.rows[0].next_code;
        employeeCode = `EMP${String(nextCode).padStart(5, '0')}`;
      }

      // Calculate probation end date
      const probationMonths = data.probation_period_months || 3;
      const probationEndDate = new Date(data.hire_date);
      probationEndDate.setMonth(probationEndDate.getMonth() + probationMonths);

      // Create employee
      const result = await client.query(
        `INSERT INTO employees (
          organization_id, company_id, employee_code, first_name, middle_name, last_name,
          email, personal_email, phone_number, date_of_birth, gender, blood_group,
          marital_status, nationality, hire_date, employment_type, employee_status,
          probation_period_months, probation_end_date, department_id, designation_id,
          location_id, reporting_manager_id, work_location_type, emergency_contact_name,
          emergency_contact_phone, emergency_contact_relationship, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'on_probation',
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
        ) RETURNING employee_id, employee_code, full_name, email`,
        [
          organizationId, data.company_id, employeeCode, data.first_name, data.middle_name,
          data.last_name, data.email, data.personal_email, data.phone_number,
          data.date_of_birth, data.gender, data.blood_group, data.marital_status,
          data.nationality, data.hire_date, data.employment_type, probationMonths,
          probationEndDate, data.department_id, data.designation_id, data.location_id,
          data.reporting_manager_id, data.work_location_type || 'office',
          data.emergency_contact_name, data.emergency_contact_phone,
          data.emergency_contact_relationship, createdBy
        ]
      );

      const employee = result.rows[0];

      // Create audit log
      await client.query(
        `INSERT INTO audit_log (
          organization_id, user_id, action, entity_type, entity_id, 
          entity_name, module, new_values
        ) VALUES ($1, $2, 'create', 'employee', $3, $4, 'employees', $5)`,
        [
          organizationId, createdBy, employee.employee_id, employee.full_name,
          JSON.stringify({ ...data, employee_code: employeeCode })
        ]
      );

      return employee;
    });
  }

  /**
   * Update employee
   */
  async updateEmployee(
    employeeId: string,
    organizationId: string,
    data: any,
    updatedBy: string
  ) {
    return transaction(async (client) => {
      // Get current employee data
      const currentResult = await client.query(
        'SELECT * FROM employees WHERE employee_id = $1 AND organization_id = $2 AND is_deleted = FALSE',
        [employeeId, organizationId]
      );

      if (currentResult.rows.length === 0) {
        throw new AppError(404, 'Employee not found');
      }

      const currentData = currentResult.rows[0];

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      Object.keys(data).forEach((key) => {
        if (data[key] !== undefined && key !== 'employee_id') {
          paramCount++;
          updates.push(`${key} = $${paramCount}`);
          values.push(data[key]);
        }
      });

      if (updates.length === 0) {
        throw new AppError(400, 'No fields to update');
      }

      paramCount++;
      updates.push(`modified_at = NOW()`);
      updates.push(`modified_by = $${paramCount}`);
      values.push(updatedBy);

      paramCount++;
      values.push(employeeId);
      paramCount++;
      values.push(organizationId);

      const sql = `
        UPDATE employees 
        SET ${updates.join(', ')}
        WHERE employee_id = $${paramCount - 1} AND organization_id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(sql, values);

      // Create audit log
      await client.query(
        `INSERT INTO audit_log (
          organization_id, user_id, action, entity_type, entity_id,
          entity_name, module, old_values, new_values, changes
        ) VALUES ($1, $2, 'update', 'employee', $3, $4, 'employees', $5, $6, $7)`,
        [
          organizationId, updatedBy, employeeId, result.rows[0].full_name,
          JSON.stringify(currentData), JSON.stringify(result.rows[0]),
          JSON.stringify(data)
        ]
      );

      return result.rows[0];
    });
  }

  /**
   * Terminate employee
   */
  async terminateEmployee(
    employeeId: string,
    organizationId: string,
    data: any,
    terminatedBy: string
  ) {
    return transaction(async (client) => {
      const result = await client.query(
        `UPDATE employees 
        SET 
          employee_status = 'terminated',
          termination_date = $1,
          last_working_date = $2,
          termination_reason = $3,
          termination_type = $4,
          is_rehire_eligible = $5,
          modified_at = NOW(),
          modified_by = $6
        WHERE employee_id = $7 AND organization_id = $8 AND is_deleted = FALSE
        RETURNING employee_id, full_name, employee_status`,
        [
          data.termination_date,
          data.last_working_date,
          data.termination_reason,
          data.termination_type,
          data.is_rehire_eligible !== undefined ? data.is_rehire_eligible : true,
          terminatedBy,
          employeeId,
          organizationId
        ]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, 'Employee not found');
      }

      // Deactivate user account
      await client.query(
        'UPDATE users SET is_active = FALSE WHERE employee_id = $1',
        [employeeId]
      );

      // Create audit log
      await client.query(
        `INSERT INTO audit_log (
          organization_id, user_id, action, entity_type, entity_id,
          entity_name, module, new_values
        ) VALUES ($1, $2, 'terminate', 'employee', $3, $4, 'employees', $5)`,
        [
          organizationId, terminatedBy, employeeId, result.rows[0].full_name,
          JSON.stringify(data)
        ]
      );

      return result.rows[0];
    });
  }

  /**
   * Delete employee (soft delete)
   */
  async deleteEmployee(employeeId: string, organizationId: string, deletedBy: string) {
    return transaction(async (client) => {
      const result = await client.query(
        `UPDATE employees 
        SET is_deleted = TRUE, deleted_at = NOW(), modified_by = $1
        WHERE employee_id = $2 AND organization_id = $3 AND is_deleted = FALSE
        RETURNING employee_id, full_name`,
        [deletedBy, employeeId, organizationId]
      );

      if (result.rows.length === 0) {
        throw new AppError(404, 'Employee not found');
      }

      // Create audit log
      await client.query(
        `INSERT INTO audit_log (
          organization_id, user_id, action, entity_type, entity_id,
          entity_name, module
        ) VALUES ($1, $2, 'delete', 'employee', $3, $4, 'employees')`,
        [organizationId, deletedBy, employeeId, result.rows[0].full_name]
      );

      return { message: 'Employee deleted successfully' };
    });
  }

  /**
   * Get employee's team (direct reports)
   */
  async getEmployeeTeam(employeeId: string, organizationId: string) {
    const result = await query(
      `SELECT 
        e.employee_id, e.employee_code, e.full_name, e.email, e.phone_number,
        e.employee_status, e.employment_type, e.hire_date,
        e.profile_picture_url,
        d.department_name,
        des.designation_name,
        l.location_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN designations des ON e.designation_id = des.designation_id
      LEFT JOIN locations l ON e.location_id = l.location_id
      WHERE e.reporting_manager_id = $1 
        AND e.organization_id = $2 
        AND e.is_deleted = FALSE
        AND e.employee_status IN ('active', 'on_probation', 'on_leave')
      ORDER BY e.hire_date DESC`,
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
        COUNT(*) FILTER (WHERE hire_date >= CURRENT_DATE - INTERVAL '30 days') as new_hires_last_month,
        COUNT(*) FILTER (WHERE termination_date >= CURRENT_DATE - INTERVAL '30 days') as exits_last_month
      FROM employees
      WHERE ${whereClause}`,
      params
    );

    return result.rows[0];
  }
}

// ===== src/controllers/employee.controller.ts =====
import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service';
import { successResponse } from '../utils/response';

const employeeService = new EmployeeService();

export class EmployeeController {
  async getEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user.organization_id;
      const filters = req.query;
      
      const result = await employeeService.getEmployees(organizationId, filters);
      return successResponse(res, result.employees, undefined, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organization_id;
      
      const result = await employeeService.getEmployeeById(id, organizationId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user.organization_id;
      const userId = (req as any).user.user_id;
      
      const result = await employeeService.createEmployee(organizationId, req.body, userId);
      return successResponse(res, result, 'Employee created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organization_id;
      const userId = (req as any).user.user_id;
      
      const result = await employeeService.updateEmployee(id, organizationId, req.body, userId);
      return successResponse(res, result, 'Employee updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async terminateEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organization_id;
      const userId = (req as any).user.user_id;
      
      const result = await employeeService.terminateEmployee(id, organizationId, req.body, userId);
      return successResponse(res, result, 'Employee terminated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organization_id;
      const userId = (req as any).user.user_id;
      
      const result = await employeeService.deleteEmployee(id, organizationId, userId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = (req as any).user.organization_id;
      
      const result = await employeeService.getEmployeeTeam(id, organizationId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getEmployeeStats(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = (req as any).user.organization_id;
      const companyId = req.query.company_id as string;
      
      const result = await employeeService.getEmployeeStats(organizationId, companyId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}

// ===== src/routes/employee.routes.ts =====
import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller';
import { validate } from '../middleware/validation';
import { authorize } from '../middleware/authorize';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  terminateEmployeeSchema
} from '../validators/employee.validator';

const router = Router();
const employeeController = new EmployeeController();

// All routes require authentication (applied in app.ts)
router.get('/', authorize('employees.view'), employeeController.getEmployees);
router.get('/stats', authorize('employees.view'), employeeController.getEmployeeStats);
router.get('/:id', authorize('employees.view'), employeeController.getEmployeeById);
router.get('/:id/team', authorize('employees.view'), employeeController.getEmployeeTeam);
router.post('/', authorize('employees.create'), validate(createEmployeeSchema), employeeController.createEmployee);
router.put('/:id', authorize('employees.edit'), validate(updateEmployeeSchema), employeeController.updateEmployee);
router.post('/:id/terminate', authorize('employees.edit'), validate(terminateEmployeeSchema), employeeController.terminateEmployee);
router.delete('/:id', authorize('employees.delete'), employeeController.deleteEmployee);

export default router;

// =====================================================
// Employee Management Module Complete
// =====================================================