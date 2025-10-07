// =====================================================
// PAYROLL MANAGEMENT MODULE - BACKEND IMPLEMENTATION
// =====================================================

import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { Pool } from 'pg';

const router = Router();

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const compensationComponentSchema = Joi.object({
  component_name: Joi.string().required().max(100),
  component_code: Joi.string().required().max(50),
  component_type: Joi.string().required().valid('earning', 'deduction', 'reimbursement'),
  calculation_type: Joi.string().valid('fixed', 'percentage', 'formula'),
  calculation_value: Joi.number().precision(2),
  calculation_formula: Joi.string().allow(''),
  is_taxable: Joi.boolean(),
  is_provident_fund_applicable: Joi.boolean(),
  is_esi_applicable: Joi.boolean(),
  display_order: Joi.number().integer(),
  is_visible_on_payslip: Joi.boolean()
});

const employeeCompensationSchema = Joi.object({
  employee_id: Joi.string().uuid().required(),
  effective_from_date: Joi.date().required(),
  annual_ctc: Joi.number().required().precision(2).positive(),
  monthly_gross: Joi.number().required().precision(2).positive(),
  monthly_net: Joi.number().precision(2).positive(),
  salary_type: Joi.string().valid('monthly', 'hourly', 'daily'),
  payment_frequency: Joi.string().valid('monthly', 'bi-weekly', 'weekly'),
  payment_mode: Joi.string().valid('bank_transfer', 'cash', 'cheque'),
  revision_type: Joi.string().valid('new_hire', 'promotion', 'annual_increment', 'special'),
  revision_reason: Joi.string().allow(''),
  components: Joi.array().items(Joi.object({
    component_id: Joi.string().uuid().required(),
    amount: Joi.number().required().precision(2)
  }))
});

const payrollRunSchema = Joi.object({
  run_name: Joi.string().required().max(100),
  run_code: Joi.string().required().max(50),
  period_month: Joi.number().integer().min(1).max(12).required(),
  period_year: Joi.number().integer().min(2020).max(2100).required(),
  pay_period_start_date: Joi.date().required(),
  pay_period_end_date: Joi.date().required(),
  payment_date: Joi.date(),
  notes: Joi.string().allow('')
});

const bonusSchema = Joi.object({
  employee_id: Joi.string().uuid().required(),
  bonus_type: Joi.string().required().valid('performance', 'festive', 'retention', 'referral', 'spot'),
  bonus_name: Joi.string().required().max(100),
  amount: Joi.number().required().precision(2).positive(),
  applicable_month: Joi.number().integer().min(1).max(12),
  applicable_year: Joi.number().integer().min(2020).max(2100),
  reason: Joi.string().allow('')
});

const loanSchema = Joi.object({
  employee_id: Joi.string().uuid().required(),
  loan_type: Joi.string().required().valid('salary_advance', 'personal', 'emergency'),
  loan_amount: Joi.number().required().precision(2).positive(),
  interest_rate: Joi.number().precision(2).min(0).max(100),
  installment_amount: Joi.number().required().precision(2).positive(),
  number_of_installments: Joi.number().integer().required().positive(),
  start_date: Joi.date().required(),
  reason: Joi.string().allow('')
});

const reimbursementSchema = Joi.object({
  employee_id: Joi.string().uuid().required(),
  reimbursement_type: Joi.string().required().valid('travel', 'medical', 'telephone', 'internet', 'food', 'other'),
  amount: Joi.number().required().precision(2).positive(),
  currency: Joi.string().length(3).default('USD'),
  expense_date: Joi.date().required(),
  description: Joi.string().required(),
  receipt_file_path: Joi.string().allow('')
});

// =====================================================
// COMPENSATION COMPONENTS ROUTES
// =====================================================

// Get all compensation components
router.get('/compensation/components', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id, company_id } = req.user;
    const { component_type } = req.query;

    let query = `
      SELECT * FROM compensation_components
      WHERE organization_id = $1 AND is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (company_id) {
      query += ` AND (company_id = $${params.length + 1} OR company_id IS NULL)`;
      params.push(company_id);
    }

    if (component_type) {
      query += ` AND component_type = $${params.length + 1}`;
      params.push(component_type);
    }

    query += ` ORDER BY component_type, display_order, component_name`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create compensation component
router.post('/compensation/components', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = compensationComponentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, company_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO compensation_components (
        organization_id, company_id, component_name, component_code, component_type,
        calculation_type, calculation_value, calculation_formula,
        is_taxable, is_provident_fund_applicable, is_esi_applicable,
        display_order, is_visible_on_payslip, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      organization_id, company_id, value.component_name, value.component_code, value.component_type,
      value.calculation_type, value.calculation_value, value.calculation_formula,
      value.is_taxable, value.is_provident_fund_applicable, value.is_esi_applicable,
      value.display_order || 0, value.is_visible_on_payslip !== false, user_id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// EMPLOYEE COMPENSATION ROUTES
// =====================================================

// Get employee compensation
router.get('/compensation/employees/:employee_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employee_id } = req.params;
    const { organization_id } = req.user;
    const { include_history } = req.query;

    let query = `
      SELECT ec.*, 
        COALESCE(json_agg(
          json_build_object(
            'component_id', ecd.component_id,
            'component_name', cc.component_name,
            'component_type', cc.component_type,
            'amount', ecd.amount
          ) ORDER BY cc.display_order
        ) FILTER (WHERE ecd.detail_id IS NOT NULL), '[]') as components
      FROM employee_compensation ec
      LEFT JOIN employee_compensation_details ecd ON ec.compensation_id = ecd.compensation_id
      LEFT JOIN compensation_components cc ON ecd.component_id = cc.component_id
      WHERE ec.organization_id = $1 AND ec.employee_id = $2 AND ec.is_deleted = FALSE
    `;

    if (!include_history) {
      query += ` AND ec.is_current = TRUE`;
    }

    query += ` GROUP BY ec.compensation_id ORDER BY ec.effective_from_date DESC`;

    const result = await req.db.query(query, [organization_id, employee_id]);

    res.json({
      success: true,
      data: include_history ? result.rows : result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Create/Update employee compensation (Revision)
router.post('/compensation/revisions', async (req: Request, res: Response, next: NextFunction) => {
  const client = await req.db.connect();
  
  try {
    const { error, value } = employeeCompensationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, user_id } = req.user;

    await client.query('BEGIN');

    // Mark previous compensation as not current
    await client.query(`
      UPDATE employee_compensation
      SET is_current = FALSE, modified_by = $1, modified_at = CURRENT_TIMESTAMP
      WHERE employee_id = $2 AND is_current = TRUE AND is_deleted = FALSE
    `, [user_id, value.employee_id]);

    // Insert new compensation
    const compensationResult = await client.query(`
      INSERT INTO employee_compensation (
        organization_id, employee_id, effective_from_date, annual_ctc, monthly_gross,
        monthly_net, salary_type, payment_frequency, payment_mode,
        revision_type, revision_reason, is_current, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, $12)
      RETURNING *
    `, [
      organization_id, value.employee_id, value.effective_from_date,
      value.annual_ctc, value.monthly_gross, value.monthly_net,
      value.salary_type || 'monthly', value.payment_frequency || 'monthly',
      value.payment_mode || 'bank_transfer', value.revision_type, value.revision_reason,
      user_id
    ]);

    const compensationId = compensationResult.rows[0].compensation_id;

    // Insert component details
    if (value.components && value.components.length > 0) {
      for (const component of value.components) {
        await client.query(`
          INSERT INTO employee_compensation_details (
            compensation_id, component_id, amount
          ) VALUES ($1, $2, $3)
        `, [compensationId, component.component_id, component.amount]);
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: compensationResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// =====================================================
// PAYROLL RUNS ROUTES
// =====================================================

// Get all payroll runs
router.get('/payroll/runs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id, company_id } = req.user;
    const { status, period_year, period_month, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT pr.*, 
        COUNT(pi.payroll_item_id) as employee_count,
        SUM(pi.gross_salary) as total_gross,
        SUM(pi.total_deductions) as total_deductions,
        SUM(pi.net_salary) as total_net
      FROM payroll_runs pr
      LEFT JOIN payroll_items pi ON pr.payroll_run_id = pi.payroll_run_id
      WHERE pr.organization_id = $1 AND pr.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (company_id) {
      query += ` AND (pr.company_id = $${params.length + 1} OR pr.company_id IS NULL)`;
      params.push(company_id);
    }

    if (status) {
      query += ` AND pr.status = $${params.length + 1}`;
      params.push(status);
    }

    if (period_year) {
      query += ` AND pr.period_year = $${params.length + 1}`;
      params.push(period_year);
    }

    if (period_month) {
      query += ` AND pr.period_month = $${params.length + 1}`;
      params.push(period_month);
    }

    query += ` GROUP BY pr.payroll_run_id ORDER BY pr.period_year DESC, pr.period_month DESC`;

    const offset = (Number(page) - 1) * Number(limit);
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await req.db.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(DISTINCT pr.payroll_run_id) FROM payroll_runs pr WHERE pr.organization_id = $1 AND pr.is_deleted = FALSE`;
    const countParams: any[] = [organization_id];

    if (company_id) {
      countQuery += ` AND (pr.company_id = $2 OR pr.company_id IS NULL)`;
      countParams.push(company_id);
    }

    const countResult = await req.db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create payroll run
router.post('/payroll/runs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = payrollRunSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, company_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO payroll_runs (
        organization_id, company_id, run_name, run_code,
        period_month, period_year, pay_period_start_date, pay_period_end_date,
        payment_date, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      organization_id, company_id, value.run_name, value.run_code,
      value.period_month, value.period_year, value.pay_period_start_date,
      value.pay_period_end_date, value.payment_date, value.notes, user_id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Process payroll (Calculate for all employees)
router.post('/payroll/runs/:run_id/process', async (req: Request, res: Response, next: NextFunction) => {
  const client = await req.db.connect();
  
  try {
    const { run_id } = req.params;
    const { organization_id, user_id } = req.user;

    await client.query('BEGIN');

    // Get payroll run details
    const runResult = await client.query(`
      SELECT * FROM payroll_runs 
      WHERE payroll_run_id = $1 AND organization_id = $2 AND is_deleted = FALSE
    `, [run_id, organization_id]);

    if (runResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payroll run not found' });
    }

    const payrollRun = runResult.rows[0];

    if (payrollRun.status !== 'draft') {
      return res.status(400).json({ success: false, error: 'Payroll run must be in draft status' });
    }

    // Get all active employees with current compensation
    const employeesResult = await client.query(`
      SELECT e.employee_id, ec.compensation_id, ec.monthly_gross, ec.monthly_net
      FROM employees e
      JOIN employee_compensation ec ON e.employee_id = ec.employee_id
      WHERE e.organization_id = $1 
        AND e.employment_status = 'active'
        AND e.is_deleted = FALSE
        AND ec.is_current = TRUE
        AND ec.is_deleted = FALSE
    `, [organization_id]);

    let processedCount = 0;

    // Process each employee
    for (const employee of employeesResult.rows) {
      // Calculate attendance data (simplified - should integrate with attendance module)
      const working_days = 22; // This should come from attendance
      const present_days = 22; // This should come from attendance
      
      // Create payroll item
      await client.query(`
        INSERT INTO payroll_items (
          payroll_run_id, employee_id, working_days, present_days,
          gross_salary, total_earnings, total_deductions, net_salary, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'processed')
      `, [
        run_id, employee.employee_id, working_days, present_days,
        employee.monthly_gross, employee.monthly_gross, 0, employee.monthly_net
      ]);

      processedCount++;
    }

    // Update payroll run status
    await client.query(`
      UPDATE payroll_runs
      SET status = 'processing', 
          total_employees = $1,
          processed_by = $2,
          processed_at = CURRENT_TIMESTAMP
      WHERE payroll_run_id = $3
    `, [processedCount, user_id, run_id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Payroll processed for ${processedCount} employees`,
      data: { employees_processed: processedCount }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Get payroll items for a run
router.get('/payroll/runs/:run_id/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { run_id } = req.params;
    const { organization_id } = req.user;

    const result = await req.db.query(`
      SELECT pi.*, 
        e.employee_code, e.first_name, e.last_name, e.email,
        d.department_name, des.designation_name
      FROM payroll_items pi
      JOIN payroll_runs pr ON pi.payroll_run_id = pr.payroll_run_id
      JOIN employees e ON pi.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN designations des ON e.designation_id = des.designation_id
      WHERE pr.payroll_run_id = $1 AND pr.organization_id = $2
      ORDER BY e.employee_code
    `, [run_id, organization_id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Generate salary slip
router.post('/payroll/items/:item_id/generate-slip', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { item_id } = req.params;
    const { organization_id, user_id } = req.user;

    // Check if slip already exists
    const existingSlip = await req.db.query(`
      SELECT ss.* FROM salary_slips ss
      JOIN payroll_items pi ON ss.payroll_item_id = pi.payroll_item_id
      JOIN payroll_runs pr ON pi.payroll_run_id = pr.payroll_run_id
      WHERE ss.payroll_item_id = $1 AND pr.organization_id = $2 AND ss.is_deleted = FALSE
    `, [item_id, organization_id]);

    if (existingSlip.rows.length > 0) {
      return res.json({
        success: true,
        data: existingSlip.rows[0],
        message: 'Salary slip already exists'
      });
    }

    // Generate slip number
    const slip_number = `SLIP-${Date.now()}-${item_id.substring(0, 8)}`;

    const result = await req.db.query(`
      INSERT INTO salary_slips (payroll_item_id, slip_number, generated_by)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [item_id, slip_number, user_id]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// BONUSES ROUTES
// =====================================================

// Get bonuses
router.get('/payroll/bonuses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;
    const { employee_id, status } = req.query;

    let query = `
      SELECT b.*, e.employee_code, e.first_name, e.last_name
      FROM bonuses b
      JOIN employees e ON b.employee_id = e.employee_id
      WHERE b.organization_id = $1 AND b.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (employee_id) {
      query += ` AND b.employee_id = $${params.length + 1}`;
      params.push(employee_id);
    }

    if (status) {
      query += ` AND b.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY b.requested_at DESC`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create bonus
router.post('/payroll/bonuses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = bonusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO bonuses (
        organization_id, employee_id, bonus_type, bonus_name, amount,
        applicable_month, applicable_year, reason, requested_by, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      organization_id, value.employee_id, value.bonus_type, value.bonus_name,
      value.amount, value.applicable_month, value.applicable_year,
      value.reason, user_id, user_id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Approve/Reject bonus
router.post('/payroll/bonuses/:bonus_id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bonus_id } = req.params;
    const { action, rejection_reason } = req.body; // action: 'approve' or 'reject'
    const { organization_id, user_id } = req.user;

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const result = await req.db.query(`
      UPDATE bonuses
      SET status = $1, 
          approved_by = $2, 
          approved_at = CURRENT_TIMESTAMP,
          rejection_reason = $3
      WHERE bonus_id = $4 AND organization_id = $5 AND is_deleted = FALSE
      RETURNING *
    `, [newStatus, user_id, rejection_reason, bonus_id, organization_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Bonus not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// LOANS ROUTES
// =====================================================

// Get loans
router.get('/payroll/loans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;
    const { employee_id, status } = req.query;

    let query = `
      SELECT l.*, e.employee_code, e.first_name, e.last_name
      FROM employee_loans l
      JOIN employees e ON l.employee_id = e.employee_id
      WHERE l.organization_id = $1 AND l.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (employee_id) {
      query += ` AND l.employee_id = $${params.length + 1}`;
      params.push(employee_id);
    }

    if (status) {
      query += ` AND l.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY l.requested_at DESC`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create loan
router.post('/payroll/loans', async (req: Request, res: Response, next: NextFunction) => {
  const client = await req.db.connect();
  
  try {
    const { error, value } = loanSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, user_id } = req.user;

    await client.query('BEGIN');

    // Create loan
    const loanResult = await client.query(`
      INSERT INTO employee_loans (
        organization_id, employee_id, loan_type, loan_amount, interest_rate,
        installment_amount, number_of_installments, start_date, reason, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      organization_id, value.employee_id, value.loan_type, value.loan_amount,
      value.interest_rate || 0, value.installment_amount, value.number_of_installments,
      value.start_date, value.reason, user_id
    ]);

    const loanId = loanResult.rows[0].loan_id;

    // Create installments
    const startDate = new Date(value.start_date);
    for (let i = 1; i <= value.number_of_installments; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      await client.query(`
        INSERT INTO loan_installments (
          loan_id, installment_number, installment_amount, due_date
        ) VALUES ($1, $2, $3, $4)
      `, [loanId, i, value.installment_amount, dueDate]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: loanResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// =====================================================
// REIMBURSEMENTS ROUTES
// =====================================================

// Get reimbursements
router.get('/payroll/reimbursements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;
    const { employee_id, status } = req.query;

    let query = `
      SELECT r.*, e.employee_code, e.first_name, e.last_name
      FROM reimbursements r
      JOIN employees e ON r.employee_id = e.employee_id
      WHERE r.organization_id = $1 AND r.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (employee_id) {
      query += ` AND r.employee_id = $${params.length + 1}`;
      params.push(employee_id);
    }

    if (status) {
      query += ` AND r.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY r.submitted_at DESC`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create reimbursement
router.post('/payroll/reimbursements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = reimbursementSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { organization_id, user_id } = req.user;

    const result = await req.db.query(`
      INSERT INTO reimbursements (
        organization_id, employee_id, reimbursement_type, amount, currency,
        expense_date, description, receipt_file_path, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      organization_id, value.employee_id, value.reimbursement_type, value.amount,
      value.currency, value.expense_date, value.description,
      value.receipt_file_path, user_id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Approve/Reject reimbursement
router.post('/payroll/reimbursements/:reimbursement_id/review', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reimbursement_id } = req.params;
    const { action, rejection_reason } = req.body;
    const { organization_id, user_id } = req.user;

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const result = await req.db.query(`
      UPDATE reimbursements
      SET status = $1, 
          reviewed_by = $2, 
          reviewed_at = CURRENT_TIMESTAMP,
          rejection_reason = $3
      WHERE reimbursement_id = $4 AND organization_id = $5 AND is_deleted = FALSE
      RETURNING *
    `, [newStatus, user_id, rejection_reason, reimbursement_id, organization_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Reimbursement not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

export default router;
