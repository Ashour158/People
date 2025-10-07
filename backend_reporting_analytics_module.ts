// =====================================================
// ADVANCED REPORTING & ANALYTICS - BACKEND IMPLEMENTATION
// =====================================================

import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const router = Router();

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const customReportSchema = Joi.object({
  report_name: Joi.string().required().max(200),
  report_type: Joi.string().required().valid('attendance', 'leave', 'payroll', 'performance', 'assets', 'custom'),
  filters: Joi.object().allow(null),
  columns: Joi.array().items(Joi.string()),
  date_range: Joi.object({
    start_date: Joi.date(),
    end_date: Joi.date()
  }).allow(null)
});

// =====================================================
// DASHBOARD ANALYTICS
// =====================================================

// Get HR Dashboard Overview
router.get('/reports/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id, company_id } = req.user;

    // Employee Statistics
    const empStats = await req.db.query(`
      SELECT 
        COUNT(*) as total_employees,
        COUNT(*) FILTER (WHERE employment_status = 'active') as active_employees,
        COUNT(*) FILTER (WHERE employment_status = 'inactive') as inactive_employees,
        COUNT(*) FILTER (WHERE employment_status = 'terminated') as terminated_employees,
        COUNT(*) FILTER (WHERE DATE_PART('month', joining_date) = DATE_PART('month', CURRENT_DATE)) as new_hires_this_month
      FROM employees
      WHERE organization_id = $1 AND is_deleted = FALSE
        ${company_id ? 'AND company_id = $2' : ''}
    `, company_id ? [organization_id, company_id] : [organization_id]);

    // Department-wise headcount
    const deptHeadcount = await req.db.query(`
      SELECT d.department_name, COUNT(e.employee_id) as employee_count
      FROM departments d
      LEFT JOIN employees e ON d.department_id = e.department_id AND e.employment_status = 'active' AND e.is_deleted = FALSE
      WHERE d.organization_id = $1 AND d.is_deleted = FALSE
        ${company_id ? 'AND d.company_id = $2' : ''}
      GROUP BY d.department_id, d.department_name
      ORDER BY employee_count DESC
    `, company_id ? [organization_id, company_id] : [organization_id]);

    // Attendance Summary (Last 7 days)
    const attendanceSummary = await req.db.query(`
      SELECT 
        DATE(check_in_time) as date,
        COUNT(DISTINCT employee_id) as present_count,
        AVG(EXTRACT(EPOCH FROM (check_out_time - check_in_time))/3600) as avg_hours
      FROM attendance
      WHERE organization_id = $1 
        AND check_in_time >= CURRENT_DATE - INTERVAL '7 days'
        AND is_deleted = FALSE
        ${company_id ? 'AND company_id = $2' : ''}
      GROUP BY DATE(check_in_time)
      ORDER BY date DESC
    `, company_id ? [organization_id, company_id] : [organization_id]);

    // Leave Statistics
    const leaveStats = await req.db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_leaves,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_leaves,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_leaves
      FROM leave_requests
      WHERE organization_id = $1 AND is_deleted = FALSE
        ${company_id ? 'AND company_id = $2' : ''}
    `, company_id ? [organization_id, company_id] : [organization_id]);

    // Upcoming Performance Reviews
    const upcomingReviews = await req.db.query(`
      SELECT COUNT(*) as count
      FROM performance_reviews pr
      JOIN performance_cycles pc ON pr.cycle_id = pc.cycle_id
      WHERE pr.organization_id = $1 
        AND pr.status IN ('draft', 'in_progress')
        AND pc.end_date <= CURRENT_DATE + INTERVAL '30 days'
        AND pr.is_deleted = FALSE
    `, [organization_id]);

    res.json({
      success: true,
      data: {
        employee_stats: empStats.rows[0],
        department_headcount: deptHeadcount.rows,
        attendance_summary: attendanceSummary.rows,
        leave_stats: leaveStats.rows[0],
        upcoming_reviews: upcomingReviews.rows[0].count
      }
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// ATTENDANCE REPORTS
// =====================================================

// Get Attendance Report
router.get('/reports/attendance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id, company_id } = req.user;
    const { start_date, end_date, employee_id, department_id } = req.query;

    let query = `
      SELECT 
        e.employee_code,
        e.first_name || ' ' || e.last_name as employee_name,
        d.department_name,
        DATE(a.check_in_time) as date,
        a.check_in_time,
        a.check_out_time,
        EXTRACT(EPOCH FROM (a.check_out_time - a.check_in_time))/3600 as hours_worked,
        a.status
      FROM attendance a
      JOIN employees e ON a.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE a.organization_id = $1 AND a.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (company_id) {
      query += ` AND a.company_id = $${params.length + 1}`;
      params.push(company_id);
    }

    if (start_date) {
      query += ` AND DATE(a.check_in_time) >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(a.check_in_time) <= $${params.length + 1}`;
      params.push(end_date);
    }

    if (employee_id) {
      query += ` AND a.employee_id = $${params.length + 1}`;
      params.push(employee_id);
    }

    if (department_id) {
      query += ` AND e.department_id = $${params.length + 1}`;
      params.push(department_id);
    }

    query += ` ORDER BY date DESC, e.employee_code`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get Monthly Attendance Summary
router.get('/reports/attendance/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;
    const { month, year, department_id } = req.query;

    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    let query = `
      SELECT 
        e.employee_code,
        e.first_name || ' ' || e.last_name as employee_name,
        d.department_name,
        COUNT(DISTINCT DATE(a.check_in_time)) as present_days,
        SUM(EXTRACT(EPOCH FROM (a.check_out_time - a.check_in_time))/3600) as total_hours,
        AVG(EXTRACT(EPOCH FROM (a.check_out_time - a.check_in_time))/3600) as avg_hours_per_day
      FROM employees e
      LEFT JOIN attendance a ON e.employee_id = a.employee_id 
        AND EXTRACT(MONTH FROM a.check_in_time) = $2
        AND EXTRACT(YEAR FROM a.check_in_time) = $3
        AND a.is_deleted = FALSE
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE e.organization_id = $1 AND e.employment_status = 'active' AND e.is_deleted = FALSE
    `;
    const params: any[] = [organization_id, targetMonth, targetYear];

    if (department_id) {
      query += ` AND e.department_id = $${params.length + 1}`;
      params.push(department_id);
    }

    query += ` GROUP BY e.employee_id, e.employee_code, e.first_name, e.last_name, d.department_name
               ORDER BY e.employee_code`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// LEAVE REPORTS
// =====================================================

// Get Leave Report
router.get('/reports/leave', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;
    const { start_date, end_date, employee_id, status, leave_type_id } = req.query;

    let query = `
      SELECT 
        lr.request_id,
        e.employee_code,
        e.first_name || ' ' || e.last_name as employee_name,
        d.department_name,
        lt.leave_type_name,
        lr.start_date,
        lr.end_date,
        lr.number_of_days,
        lr.status,
        lr.reason,
        approver.first_name || ' ' || approver.last_name as approved_by_name,
        lr.approved_at
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.leave_type_id
      LEFT JOIN employees approver ON lr.approved_by = approver.employee_id
      WHERE lr.organization_id = $1 AND lr.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (start_date) {
      query += ` AND lr.start_date >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND lr.end_date <= $${params.length + 1}`;
      params.push(end_date);
    }

    if (employee_id) {
      query += ` AND lr.employee_id = $${params.length + 1}`;
      params.push(employee_id);
    }

    if (status) {
      query += ` AND lr.status = $${params.length + 1}`;
      params.push(status);
    }

    if (leave_type_id) {
      query += ` AND lr.leave_type_id = $${params.length + 1}`;
      params.push(leave_type_id);
    }

    query += ` ORDER BY lr.start_date DESC`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get Leave Balance Report
router.get('/reports/leave/balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;
    const { year, department_id } = req.query;

    const targetYear = year || new Date().getFullYear();

    let query = `
      SELECT 
        e.employee_code,
        e.first_name || ' ' || e.last_name as employee_name,
        d.department_name,
        lt.leave_type_name,
        lb.opening_balance,
        lb.accrued_balance,
        lb.used_balance,
        lb.carried_forward_balance,
        lb.available_balance
      FROM leave_balances lb
      JOIN employees e ON lb.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      JOIN leave_types lt ON lb.leave_type_id = lt.leave_type_id
      WHERE lb.organization_id = $1 AND lb.year = $2 AND e.is_deleted = FALSE
    `;
    const params: any[] = [organization_id, targetYear];

    if (department_id) {
      query += ` AND e.department_id = $${params.length + 1}`;
      params.push(department_id);
    }

    query += ` ORDER BY e.employee_code, lt.leave_type_name`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// HEADCOUNT & DEMOGRAPHICS REPORTS
// =====================================================

// Get Headcount Report
router.get('/reports/headcount', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;
    const { group_by = 'department' } = req.query;

    let query = '';
    
    if (group_by === 'department') {
      query = `
        SELECT 
          d.department_name as category,
          COUNT(e.employee_id) as count
        FROM departments d
        LEFT JOIN employees e ON d.department_id = e.department_id 
          AND e.employment_status = 'active' AND e.is_deleted = FALSE
        WHERE d.organization_id = $1 AND d.is_deleted = FALSE
        GROUP BY d.department_id, d.department_name
        ORDER BY count DESC
      `;
    } else if (group_by === 'designation') {
      query = `
        SELECT 
          des.designation_name as category,
          COUNT(e.employee_id) as count
        FROM designations des
        LEFT JOIN employees e ON des.designation_id = e.designation_id 
          AND e.employment_status = 'active' AND e.is_deleted = FALSE
        WHERE des.organization_id = $1 AND des.is_deleted = FALSE
        GROUP BY des.designation_id, des.designation_name
        ORDER BY count DESC
      `;
    } else if (group_by === 'location') {
      query = `
        SELECT 
          l.location_name as category,
          COUNT(e.employee_id) as count
        FROM locations l
        LEFT JOIN employees e ON l.location_id = e.location_id 
          AND e.employment_status = 'active' AND e.is_deleted = FALSE
        WHERE l.organization_id = $1 AND l.is_deleted = FALSE
        GROUP BY l.location_id, l.location_name
        ORDER BY count DESC
      `;
    } else if (group_by === 'employment_type') {
      query = `
        SELECT 
          employment_type as category,
          COUNT(*) as count
        FROM employees
        WHERE organization_id = $1 AND employment_status = 'active' AND is_deleted = FALSE
        GROUP BY employment_type
        ORDER BY count DESC
      `;
    }

    const result = await req.db.query(query, [organization_id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get Turnover Report
router.get('/reports/turnover', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;
    const { start_date, end_date } = req.query;

    const startDate = start_date || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    // Get terminations
    const terminationsResult = await req.db.query(`
      SELECT 
        COUNT(*) as termination_count,
        EXTRACT(MONTH FROM termination_date) as month
      FROM employees
      WHERE organization_id = $1 
        AND employment_status = 'terminated'
        AND termination_date BETWEEN $2 AND $3
      GROUP BY EXTRACT(MONTH FROM termination_date)
      ORDER BY month
    `, [organization_id, startDate, endDate]);

    // Get new hires
    const hiresResult = await req.db.query(`
      SELECT 
        COUNT(*) as hire_count,
        EXTRACT(MONTH FROM joining_date) as month
      FROM employees
      WHERE organization_id = $1 
        AND joining_date BETWEEN $2 AND $3
        AND is_deleted = FALSE
      GROUP BY EXTRACT(MONTH FROM joining_date)
      ORDER BY month
    `, [organization_id, startDate, endDate]);

    // Average headcount
    const avgHeadcountResult = await req.db.query(`
      SELECT COUNT(*) as avg_headcount
      FROM employees
      WHERE organization_id = $1 
        AND employment_status = 'active'
        AND is_deleted = FALSE
    `, [organization_id]);

    const avgHeadcount = parseInt(avgHeadcountResult.rows[0].avg_headcount);
    const totalTerminations = terminationsResult.rows.reduce((sum, row) => sum + parseInt(row.termination_count), 0);
    const turnoverRate = avgHeadcount > 0 ? ((totalTerminations / avgHeadcount) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        terminations_by_month: terminationsResult.rows,
        hires_by_month: hiresResult.rows,
        turnover_rate: turnoverRate,
        total_terminations: totalTerminations,
        avg_headcount: avgHeadcount
      }
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// PAYROLL REPORTS
// =====================================================

// Get Payroll Summary Report
router.get('/reports/payroll', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;
    const { period_month, period_year } = req.query;

    const month = period_month || new Date().getMonth() + 1;
    const year = period_year || new Date().getFullYear();

    const result = await req.db.query(`
      SELECT 
        e.employee_code,
        e.first_name || ' ' || e.last_name as employee_name,
        d.department_name,
        pi.working_days,
        pi.present_days,
        pi.leave_days,
        pi.gross_salary,
        pi.total_earnings,
        pi.total_deductions,
        pi.net_salary,
        pi.status
      FROM payroll_items pi
      JOIN payroll_runs pr ON pi.payroll_run_id = pr.payroll_run_id
      JOIN employees e ON pi.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE pr.organization_id = $1 
        AND pr.period_month = $2 
        AND pr.period_year = $3
        AND pr.is_deleted = FALSE
      ORDER BY e.employee_code
    `, [organization_id, month, year]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// PERFORMANCE ANALYTICS
// =====================================================

// Get Performance Analytics
router.get('/reports/performance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization_id } = req.user;
    const { cycle_id, department_id } = req.query;

    let query = `
      SELECT 
        e.employee_code,
        e.first_name || ' ' || e.last_name as employee_name,
        d.department_name,
        pr.review_type,
        pr.overall_rating,
        pr.kra_rating,
        pr.competency_rating,
        pr.status,
        pc.cycle_name
      FROM performance_reviews pr
      JOIN employees e ON pr.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      JOIN performance_cycles pc ON pr.cycle_id = pc.cycle_id
      WHERE pr.organization_id = $1 AND pr.is_deleted = FALSE
    `;
    const params: any[] = [organization_id];

    if (cycle_id) {
      query += ` AND pr.cycle_id = $${params.length + 1}`;
      params.push(cycle_id);
    }

    if (department_id) {
      query += ` AND e.department_id = $${params.length + 1}`;
      params.push(department_id);
    }

    query += ` ORDER BY e.employee_code`;

    const result = await req.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// CUSTOM REPORTS
// =====================================================

// Create custom report
router.post('/reports/custom', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = customReportSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    // This is a simplified implementation
    // In production, you'd want to validate and sanitize the query more thoroughly
    
    res.json({
      success: true,
      message: 'Custom report generation not fully implemented in this demo',
      data: value
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// EXPORT FUNCTIONALITY
// =====================================================

// Export report to CSV/Excel
router.get('/reports/export/:report_type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { report_type } = req.params;
    const { format = 'csv' } = req.query;

    // This would integrate with a library like xlsx or csv-writer
    // For now, return a success message
    
    res.json({
      success: true,
      message: `Export functionality for ${report_type} report in ${format} format`,
      note: 'Full export implementation requires additional libraries'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
