import { Pool } from 'pg';
import { AppError } from '../middleware/errorHandler';

interface AnalyticsData {
  metric: string;
  value: number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
}

interface DashboardMetrics {
  headcount: AnalyticsData;
  new_joiners: AnalyticsData;
  attrition_rate: AnalyticsData;
  attendance_rate: AnalyticsData;
  leave_utilization: AnalyticsData;
  performance_avg: AnalyticsData;
  timesheet_utilization: AnalyticsData;
  pending_approvals: {
    leave: number;
    timesheet: number;
    onboarding_tasks: number;
    offboarding_tasks: number;
  };
}

export class AnalyticsService {
  constructor(private db: Pool) {}

  // ==================== DASHBOARD ANALYTICS ====================

  async getDashboardMetrics(organization_id: string): Promise<DashboardMetrics> {
    // Current headcount
    const headcountResult = await this.db.query(
      `SELECT 
        COUNT(*) FILTER (WHERE employment_status = 'active') as current,
        COUNT(*) FILTER (WHERE employment_status = 'active' AND 
          hire_date >= NOW() - INTERVAL '1 month') as last_month_hires,
        COUNT(*) FILTER (WHERE employment_status = 'terminated' AND 
          termination_date >= NOW() - INTERVAL '1 month') as last_month_exits
      FROM employees
      WHERE organization_id = $1 AND is_deleted = FALSE`,
      [organization_id]
    );

    const headcount = headcountResult.rows[0];

    // Attendance rate (last 30 days)
    const attendanceResult = await this.db.query(
      `SELECT 
        COUNT(*) as total_days,
        COUNT(*) FILTER (WHERE check_in_time IS NOT NULL) as present_days
      FROM attendance
      WHERE organization_id = $1 
        AND attendance_date >= NOW() - INTERVAL '30 days'
        AND is_deleted = FALSE`,
      [organization_id]
    );

    const attendance = attendanceResult.rows[0];
    const attendanceRate = attendance.total_days > 0
      ? (attendance.present_days / attendance.total_days) * 100
      : 0;

    // Leave utilization
    const leaveResult = await this.db.query(
      `SELECT 
        SUM(leave_balance) as total_balance,
        SUM(leave_used) as total_used
      FROM leave_balances
      WHERE organization_id = $1 AND is_deleted = FALSE`,
      [organization_id]
    );

    const leave = leaveResult.rows[0];
    const leaveUtilization = leave.total_balance > 0
      ? (leave.total_used / (leave.total_balance + leave.total_used)) * 100
      : 0;

    // Performance average
    const performanceResult = await this.db.query(
      `SELECT AVG(overall_rating) as avg_rating
      FROM performance_reviews pr
      INNER JOIN employees e ON pr.employee_id = e.employee_id
      WHERE e.organization_id = $1 
        AND pr.review_status = 'completed'
        AND pr.is_deleted = FALSE`,
      [organization_id]
    );

    const performanceAvg = performanceResult.rows[0].avg_rating || 0;

    // Timesheet utilization (billable hours %)
    const timesheetResult = await this.db.query(
      `SELECT 
        SUM(hours_worked) as total_hours,
        SUM(hours_worked) FILTER (WHERE is_billable = TRUE) as billable_hours
      FROM timesheet_entries te
      INNER JOIN employees e ON te.employee_id = e.employee_id
      WHERE e.organization_id = $1 
        AND te.status = 'approved'
        AND te.work_date >= NOW() - INTERVAL '30 days'
        AND te.is_deleted = FALSE`,
      [organization_id]
    );

    const timesheet = timesheetResult.rows[0];
    const timesheetUtilization = timesheet.total_hours > 0
      ? (timesheet.billable_hours / timesheet.total_hours) * 100
      : 0;

    // Pending approvals
    const approvalsResult = await this.db.query(
      `SELECT 
        COUNT(*) FILTER (WHERE lr.status = 'pending') as pending_leave,
        COUNT(*) FILTER (WHERE te.status = 'submitted') as pending_timesheet,
        COUNT(*) FILTER (WHERE otp.status = 'pending') as pending_onboarding,
        COUNT(*) FILTER (WHERE oftp.status = 'pending') as pending_offboarding
      FROM employees e
      LEFT JOIN leave_requests lr ON e.employee_id = lr.employee_id AND lr.is_deleted = FALSE
      LEFT JOIN timesheet_entries te ON e.employee_id = te.employee_id AND te.is_deleted = FALSE
      LEFT JOIN onboarding_task_progress otp ON e.employee_id = otp.employee_id AND otp.is_deleted = FALSE
      LEFT JOIN offboarding_task_progress oftp ON e.employee_id = oftp.employee_id AND oftp.is_deleted = FALSE
      WHERE e.organization_id = $1 AND e.is_deleted = FALSE`,
      [organization_id]
    );

    const approvals = approvalsResult.rows[0];

    // Calculate attrition rate
    const attritionRate = headcount.current > 0
      ? (headcount.last_month_exits / headcount.current) * 100 * 12 // Annualized
      : 0;

    return {
      headcount: {
        metric: 'headcount',
        value: headcount.current,
        change: headcount.last_month_hires - headcount.last_month_exits,
        trend: headcount.last_month_hires > headcount.last_month_exits ? 'up' : 'down',
      },
      new_joiners: {
        metric: 'new_joiners',
        value: headcount.last_month_hires,
      },
      attrition_rate: {
        metric: 'attrition_rate',
        value: attritionRate,
        trend: attritionRate < 10 ? 'down' : attritionRate > 15 ? 'up' : 'stable',
      },
      attendance_rate: {
        metric: 'attendance_rate',
        value: attendanceRate,
        trend: attendanceRate > 90 ? 'up' : attendanceRate < 80 ? 'down' : 'stable',
      },
      leave_utilization: {
        metric: 'leave_utilization',
        value: leaveUtilization,
      },
      performance_avg: {
        metric: 'performance_avg',
        value: performanceAvg,
      },
      timesheet_utilization: {
        metric: 'timesheet_utilization',
        value: timesheetUtilization,
        trend: timesheetUtilization > 70 ? 'up' : timesheetUtilization < 50 ? 'down' : 'stable',
      },
      pending_approvals: {
        leave: approvals.pending_leave || 0,
        timesheet: approvals.pending_timesheet || 0,
        onboarding_tasks: approvals.pending_onboarding || 0,
        offboarding_tasks: approvals.pending_offboarding || 0,
      },
    };
  }

  // ==================== ATTRITION ANALYSIS ====================

  async getAttritionAnalysis(
    organization_id: string,
    period_months: number = 12
  ): Promise<any> {
    const result = await this.db.query(
      `SELECT 
        DATE_TRUNC('month', termination_date) as month,
        COUNT(*) as terminations,
        AVG(EXTRACT(YEAR FROM AGE(termination_date, hire_date))) as avg_tenure_years,
        jsonb_object_agg(
          COALESCE(termination_reason, 'not_specified'), 
          count_per_reason
        ) as reasons
      FROM (
        SELECT 
          termination_date,
          hire_date,
          termination_reason,
          COUNT(*) as count_per_reason
        FROM employees
        WHERE organization_id = $1
          AND employment_status = 'terminated'
          AND termination_date >= NOW() - INTERVAL '1 month' * $2
          AND is_deleted = FALSE
        GROUP BY termination_date, hire_date, termination_reason
      ) sub
      GROUP BY DATE_TRUNC('month', termination_date)
      ORDER BY month DESC`,
      [organization_id, period_months]
    );

    return result.rows;
  }

  // ==================== ATTENDANCE TRENDS ====================

  async getAttendanceTrends(
    organization_id: string,
    period_days: number = 30
  ): Promise<any[]> {
    const result = await this.db.query(
      `SELECT 
        attendance_date::date as date,
        COUNT(DISTINCT employee_id) as total_employees,
        COUNT(*) FILTER (WHERE check_in_time IS NOT NULL) as present,
        COUNT(*) FILTER (WHERE check_in_time IS NULL) as absent,
        AVG(EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600)::numeric(10,2) as avg_hours
      FROM attendance
      WHERE organization_id = $1
        AND attendance_date >= NOW() - INTERVAL '1 day' * $2
        AND is_deleted = FALSE
      GROUP BY attendance_date::date
      ORDER BY date ASC`,
      [organization_id, period_days]
    );

    return result.rows;
  }

  // ==================== DEPARTMENT ANALYTICS ====================

  async getDepartmentAnalytics(organization_id: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT 
        d.department_name,
        COUNT(DISTINCT e.employee_id) as headcount,
        AVG(EXTRACT(YEAR FROM AGE(NOW(), e.hire_date)))::numeric(10,2) as avg_tenure_years,
        AVG(pr.overall_rating)::numeric(3,2) as avg_performance_rating,
        COUNT(DISTINCT lr.leave_request_id) FILTER (WHERE lr.status = 'pending') as pending_leaves,
        COUNT(DISTINCT te.entry_id) FILTER (WHERE te.status = 'submitted') as pending_timesheets
      FROM departments d
      LEFT JOIN employees e ON d.department_id = e.department_id AND e.employment_status = 'active' AND e.is_deleted = FALSE
      LEFT JOIN performance_reviews pr ON e.employee_id = pr.employee_id AND pr.review_status = 'completed' AND pr.is_deleted = FALSE
      LEFT JOIN leave_requests lr ON e.employee_id = lr.employee_id AND lr.is_deleted = FALSE
      LEFT JOIN timesheet_entries te ON e.employee_id = te.employee_id AND te.is_deleted = FALSE
      WHERE d.organization_id = $1 AND d.is_deleted = FALSE
      GROUP BY d.department_id, d.department_name
      ORDER BY headcount DESC`,
      [organization_id]
    );

    return result.rows;
  }

  // ==================== PREDICTIVE ANALYTICS ====================

  async predictAttritionRisk(organization_id: string): Promise<any[]> {
    // Simple attrition risk model based on various factors
    const result = await this.db.query(
      `SELECT 
        e.employee_id,
        e.employee_code,
        e.first_name || ' ' || e.last_name as employee_name,
        d.department_name,
        EXTRACT(YEAR FROM AGE(NOW(), e.hire_date))::numeric(10,2) as tenure_years,
        AVG(pr.overall_rating)::numeric(3,2) as avg_performance,
        COUNT(lr.leave_request_id) as leave_requests_count,
        (
          CASE 
            WHEN AVG(pr.overall_rating) < 3 THEN 30
            ELSE 0
          END +
          CASE 
            WHEN EXTRACT(YEAR FROM AGE(NOW(), e.hire_date)) < 1 THEN 20
            WHEN EXTRACT(YEAR FROM AGE(NOW(), e.hire_date)) > 5 THEN 10
            ELSE 5
          END +
          CASE 
            WHEN COUNT(lr.leave_request_id) > 15 THEN 15
            ELSE 0
          END
        ) as attrition_risk_score
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN performance_reviews pr ON e.employee_id = pr.employee_id 
        AND pr.review_status = 'completed'
        AND pr.created_at >= NOW() - INTERVAL '1 year'
      LEFT JOIN leave_requests lr ON e.employee_id = lr.employee_id 
        AND lr.created_at >= NOW() - INTERVAL '1 year'
      WHERE e.organization_id = $1 
        AND e.employment_status = 'active'
        AND e.is_deleted = FALSE
      GROUP BY e.employee_id, e.employee_code, e.first_name, e.last_name, 
               d.department_name, e.hire_date
      HAVING (
        CASE 
          WHEN AVG(pr.overall_rating) < 3 THEN 30
          ELSE 0
        END +
        CASE 
          WHEN EXTRACT(YEAR FROM AGE(NOW(), e.hire_date)) < 1 THEN 20
          WHEN EXTRACT(YEAR FROM AGE(NOW(), e.hire_date)) > 5 THEN 10
          ELSE 5
        END +
        CASE 
          WHEN COUNT(lr.leave_request_id) > 15 THEN 15
          ELSE 0
        END
      ) >= 30
      ORDER BY attrition_risk_score DESC
      LIMIT 50`,
      [organization_id]
    );

    return result.rows;
  }

  // ==================== COST ANALYTICS ====================

  async getLabourCostAnalysis(organization_id: string): Promise<any> {
    const result = await this.db.query(
      `SELECT 
        d.department_name,
        COUNT(DISTINCT e.employee_id) as headcount,
        SUM(c.annual_salary) as total_salary_cost,
        AVG(c.annual_salary)::numeric(15,2) as avg_salary,
        SUM(te.hours_worked) as total_hours_worked,
        SUM(te.hours_worked * pm.hourly_rate)::numeric(15,2) as total_labour_cost,
        AVG(te.hours_worked * pm.hourly_rate)::numeric(15,2) as avg_cost_per_employee
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN compensation c ON e.employee_id = c.employee_id AND c.is_active = TRUE
      LEFT JOIN timesheet_entries te ON e.employee_id = te.employee_id 
        AND te.status = 'approved'
        AND te.work_date >= NOW() - INTERVAL '1 month'
      LEFT JOIN project_members pm ON e.employee_id = pm.employee_id AND pm.is_active = TRUE
      WHERE e.organization_id = $1 
        AND e.employment_status = 'active'
        AND e.is_deleted = FALSE
      GROUP BY d.department_id, d.department_name
      ORDER BY total_salary_cost DESC NULLS LAST`,
      [organization_id]
    );

    return result.rows;
  }

  // ==================== CUSTOM REPORTS ====================

  async generateCustomReport(
    organization_id: string,
    reportConfig: {
      entity_type: string;
      filters?: any;
      groupBy?: string[];
      aggregations?: any[];
      orderBy?: string;
    }
  ): Promise<any[]> {
    // This would need to be more dynamic in production
    // For now, providing a basic implementation
    throw new AppError('Custom report generation not yet implemented', 501);
  }

  // ==================== EXPORT FUNCTIONALITY ====================

  async exportReportData(
    organization_id: string,
    report_type: string,
    format: 'csv' | 'xlsx' | 'pdf' = 'csv'
  ): Promise<{ data: any[]; format: string }> {
    let data: any[] = [];

    switch (report_type) {
      case 'headcount':
        data = await this.db.query(
          `SELECT 
            e.employee_code,
            e.first_name,
            e.last_name,
            e.email,
            d.department_name,
            e.employment_status,
            e.hire_date,
            e.termination_date
          FROM employees e
          LEFT JOIN departments d ON e.department_id = d.department_id
          WHERE e.organization_id = $1 AND e.is_deleted = FALSE
          ORDER BY e.hire_date DESC`,
          [organization_id]
        ).then(result => result.rows);
        break;

      case 'attendance':
        data = await this.db.query(
          `SELECT 
            e.employee_code,
            e.first_name || ' ' || e.last_name as employee_name,
            a.attendance_date,
            a.check_in_time,
            a.check_out_time,
            EXTRACT(EPOCH FROM (a.check_out_time - a.check_in_time)) / 3600 as hours_worked
          FROM attendance a
          INNER JOIN employees e ON a.employee_id = e.employee_id
          WHERE e.organization_id = $1 
            AND a.attendance_date >= NOW() - INTERVAL '30 days'
            AND a.is_deleted = FALSE
          ORDER BY a.attendance_date DESC, e.employee_code ASC`,
          [organization_id]
        ).then(result => result.rows);
        break;

      case 'performance':
        data = await this.db.query(
          `SELECT 
            e.employee_code,
            e.first_name || ' ' || e.last_name as employee_name,
            pr.review_type,
            pr.overall_rating,
            pr.competency_rating,
            pr.goal_achievement_rating,
            pc.cycle_name
          FROM performance_reviews pr
          INNER JOIN employees e ON pr.employee_id = e.employee_id
          INNER JOIN performance_cycles pc ON pr.cycle_id = pc.cycle_id
          WHERE e.organization_id = $1 AND pr.is_deleted = FALSE
          ORDER BY pr.created_at DESC`,
          [organization_id]
        ).then(result => result.rows);
        break;

      default:
        throw new AppError('Invalid report type', 400);
    }

    return { data, format };
  }
}
