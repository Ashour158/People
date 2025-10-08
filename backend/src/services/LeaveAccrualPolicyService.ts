// =====================================================
// Leave Accrual Policy Service
// Business logic for leave accrual policies and calculations
// =====================================================

import { Pool } from 'pg';

export interface LeaveAccrualPolicy {
  policy_id?: string;
  organization_id: string;
  policy_name: string;
  policy_code: string;
  description?: string;
  leave_type_id?: string;
  accrual_type: 'monthly' | 'quarterly' | 'yearly' | 'per_payroll' | 'anniversary_based';
  accrual_frequency?: string;
  calculation_method: 'fixed' | 'prorated' | 'tiered' | 'rule_based';
  days_per_period?: number;
  max_accrual_days?: number;
  tier_rules?: Array<{
    min_service_years: number;
    max_service_years?: number;
    days_per_year: number;
  }>;
  accrual_rule_expression?: string;
  eligibility_criteria?: Record<string, any>;
  minimum_service_days?: number;
  allows_carry_forward?: boolean;
  max_carry_forward_days?: number;
  carry_forward_expiry_months?: number;
  max_balance_cap?: number;
  prorate_on_joining?: boolean;
  prorate_on_leaving?: boolean;
  effective_from: Date;
  effective_to?: Date;
  is_active?: boolean;
}

export interface AccrualTransaction {
  transaction_id?: string;
  organization_id: string;
  employee_id: string;
  leave_type_id: string;
  policy_id?: string;
  transaction_type: 'accrual' | 'adjustment' | 'carry_forward' | 'expiry';
  transaction_date: Date;
  days_accrued: number;
  previous_balance?: number;
  new_balance?: number;
  accrual_period_start?: Date;
  accrual_period_end?: Date;
  calculation_basis?: Record<string, any>;
  rule_expression_used?: string;
  description?: string;
  notes?: string;
}

export class LeaveAccrualPolicyService {
  constructor(private pool: Pool) {}

  // =====================================================
  // POLICY MANAGEMENT
  // =====================================================

  async createAccrualPolicy(policy: LeaveAccrualPolicy): Promise<string> {
    const query = `
      INSERT INTO leave_accrual_policies (
        organization_id, policy_name, policy_code, description, leave_type_id,
        accrual_type, accrual_frequency, calculation_method,
        days_per_period, max_accrual_days, tier_rules, accrual_rule_expression,
        eligibility_criteria, minimum_service_days,
        allows_carry_forward, max_carry_forward_days, carry_forward_expiry_months,
        max_balance_cap, prorate_on_joining, prorate_on_leaving,
        effective_from, effective_to, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING policy_id
    `;

    const values = [
      policy.organization_id,
      policy.policy_name,
      policy.policy_code,
      policy.description,
      policy.leave_type_id,
      policy.accrual_type,
      policy.accrual_frequency,
      policy.calculation_method,
      policy.days_per_period,
      policy.max_accrual_days,
      JSON.stringify(policy.tier_rules || []),
      policy.accrual_rule_expression,
      JSON.stringify(policy.eligibility_criteria || {}),
      policy.minimum_service_days || 0,
      policy.allows_carry_forward !== false,
      policy.max_carry_forward_days,
      policy.carry_forward_expiry_months,
      policy.max_balance_cap,
      policy.prorate_on_joining !== false,
      policy.prorate_on_leaving !== false,
      policy.effective_from,
      policy.effective_to,
      policy.is_active !== false,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].policy_id;
  }

  async getAccrualPolicy(policyId: string, organizationId: string): Promise<LeaveAccrualPolicy | null> {
    const query = `
      SELECT * FROM leave_accrual_policies
      WHERE policy_id = $1 AND organization_id = $2 AND is_deleted = FALSE
    `;

    const result = await this.pool.query(query, [policyId, organizationId]);
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return this.mapRowToPolicy(row);
  }

  async getAccrualPolicyByLeaveType(leaveTypeId: string, organizationId: string): Promise<LeaveAccrualPolicy | null> {
    const query = `
      SELECT * FROM leave_accrual_policies
      WHERE leave_type_id = $1 AND organization_id = $2 
        AND is_active = TRUE AND is_deleted = FALSE
      ORDER BY effective_from DESC
      LIMIT 1
    `;

    const result = await this.pool.query(query, [leaveTypeId, organizationId]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToPolicy(result.rows[0]);
  }

  async getAllAccrualPolicies(organizationId: string): Promise<LeaveAccrualPolicy[]> {
    const query = `
      SELECT * FROM leave_accrual_policies
      WHERE organization_id = $1 AND is_deleted = FALSE
      ORDER BY policy_name ASC
    `;

    const result = await this.pool.query(query, [organizationId]);
    return result.rows.map(row => this.mapRowToPolicy(row));
  }

  // =====================================================
  // ACCRUAL CALCULATION
  // =====================================================

  async calculateAccrual(
    employeeId: string,
    leaveTypeId: string,
    organizationId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<number> {
    // Get policy for this leave type
    const policy = await this.getAccrualPolicyByLeaveType(leaveTypeId, organizationId);
    
    if (!policy) {
      console.log(`No accrual policy found for leave type ${leaveTypeId}`);
      return 0;
    }

    // Get employee details
    const employeeQuery = `
      SELECT hire_date, employee_status FROM employees
      WHERE employee_id = $1 AND organization_id = $2
    `;
    const employeeResult = await this.pool.query(employeeQuery, [employeeId, organizationId]);
    
    if (employeeResult.rows.length === 0) {
      throw new Error('Employee not found');
    }

    const employee = employeeResult.rows[0];
    const hireDate = new Date(employee.hire_date);
    const serviceYears = this.calculateServiceYears(hireDate, periodEnd);

    // Check eligibility
    if (policy.minimum_service_days) {
      const serviceDays = Math.floor((periodEnd.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24));
      if (serviceDays < policy.minimum_service_days) {
        console.log(`Employee ${employeeId} not eligible yet (service days: ${serviceDays})`);
        return 0;
      }
    }

    // Calculate based on method
    let accrualDays = 0;

    switch (policy.calculation_method) {
      case 'fixed':
        accrualDays = this.calculateFixedAccrual(policy, periodStart, periodEnd);
        break;
      case 'prorated':
        accrualDays = this.calculateProratedAccrual(policy, periodStart, periodEnd, hireDate);
        break;
      case 'tiered':
        accrualDays = this.calculateTieredAccrual(policy, serviceYears, periodStart, periodEnd);
        break;
      case 'rule_based':
        accrualDays = this.calculateRuleBasedAccrual(policy, serviceYears, periodStart, periodEnd);
        break;
      default:
        console.warn(`Unknown calculation method: ${policy.calculation_method}`);
    }

    // Apply max cap if configured
    if (policy.max_accrual_days && accrualDays > policy.max_accrual_days) {
      accrualDays = policy.max_accrual_days;
    }

    return Math.round(accrualDays * 100) / 100; // Round to 2 decimal places
  }

  private calculateFixedAccrual(policy: LeaveAccrualPolicy, periodStart: Date, periodEnd: Date): number {
    if (!policy.days_per_period) {
      return 0;
    }

    // For monthly accrual, calculate number of months in period
    const months = this.calculateMonthsBetween(periodStart, periodEnd);
    return policy.days_per_period * months;
  }

  private calculateProratedAccrual(
    policy: LeaveAccrualPolicy,
    periodStart: Date,
    periodEnd: Date,
    hireDate: Date
  ): number {
    if (!policy.days_per_period) {
      return 0;
    }

    const totalDaysInPeriod = Math.floor((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // If employee joined during this period, prorate
    if (policy.prorate_on_joining && hireDate > periodStart) {
      const daysWorked = Math.floor((periodEnd.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24));
      const prorationFactor = daysWorked / totalDaysInPeriod;
      return policy.days_per_period * prorationFactor;
    }

    return policy.days_per_period;
  }

  private calculateTieredAccrual(
    policy: LeaveAccrualPolicy,
    serviceYears: number,
    periodStart: Date,
    periodEnd: Date
  ): number {
    if (!policy.tier_rules || policy.tier_rules.length === 0) {
      return 0;
    }

    // Find applicable tier
    const tier = policy.tier_rules.find(t => {
      return serviceYears >= t.min_service_years &&
             (!t.max_service_years || serviceYears < t.max_service_years);
    });

    if (!tier) {
      console.warn(`No tier found for service years: ${serviceYears}`);
      return 0;
    }

    // Calculate accrual for the period based on annual allocation
    const months = this.calculateMonthsBetween(periodStart, periodEnd);
    return (tier.days_per_year / 12) * months;
  }

  private calculateRuleBasedAccrual(
    policy: LeaveAccrualPolicy,
    serviceYears: number,
    periodStart: Date,
    periodEnd: Date
  ): number {
    if (!policy.accrual_rule_expression) {
      return 0;
    }

    // Simple rule expression parser
    // Example: "IF service_years < 2 THEN 1.25 ELSE IF service_years < 5 THEN 1.5 ELSE 2.0"
    
    try {
      const daysPerMonth = this.evaluateRuleExpression(policy.accrual_rule_expression, serviceYears);
      const months = this.calculateMonthsBetween(periodStart, periodEnd);
      return daysPerMonth * months;
    } catch (error) {
      console.error('Error evaluating rule expression:', error);
      return 0;
    }
  }

  private evaluateRuleExpression(expression: string, serviceYears: number): number {
    // Simple IF-THEN-ELSE parser
    // This is a simplified implementation. In production, use a proper expression evaluator
    
    const cleanExpression = expression.toUpperCase().replace(/\s+/g, ' ').trim();
    
    // Example: "IF SERVICE_YEARS < 2 THEN 1.25 ELSE IF SERVICE_YEARS < 5 THEN 1.5 ELSE 2.0"
    const ifMatch = cleanExpression.match(/IF\s+SERVICE_YEARS\s*<\s*(\d+)\s+THEN\s+([\d.]+)/);
    
    if (ifMatch) {
      const threshold = parseFloat(ifMatch[1]);
      const value = parseFloat(ifMatch[2]);
      
      if (serviceYears < threshold) {
        return value;
      }
      
      // Check for ELSE IF or ELSE
      const remainingExpression = cleanExpression.substring(cleanExpression.indexOf('THEN') + 4 + ifMatch[2].length);
      const elseMatch = remainingExpression.match(/ELSE\s+([\d.]+)/);
      
      if (elseMatch) {
        return parseFloat(elseMatch[1]);
      }
      
      // Recursively parse nested IF
      if (remainingExpression.includes('IF')) {
        return this.evaluateRuleExpression(remainingExpression.substring(remainingExpression.indexOf('IF')), serviceYears);
      }
    }
    
    // Default fallback
    return 0;
  }

  // =====================================================
  // ACCRUAL TRANSACTION LOGGING
  // =====================================================

  async recordAccrualTransaction(transaction: AccrualTransaction): Promise<string> {
    const query = `
      INSERT INTO leave_accrual_transactions (
        organization_id, employee_id, leave_type_id, policy_id,
        transaction_type, transaction_date, days_accrued,
        previous_balance, new_balance, accrual_period_start, accrual_period_end,
        calculation_basis, rule_expression_used, description, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING transaction_id
    `;

    const values = [
      transaction.organization_id,
      transaction.employee_id,
      transaction.leave_type_id,
      transaction.policy_id,
      transaction.transaction_type,
      transaction.transaction_date,
      transaction.days_accrued,
      transaction.previous_balance,
      transaction.new_balance,
      transaction.accrual_period_start,
      transaction.accrual_period_end,
      JSON.stringify(transaction.calculation_basis || {}),
      transaction.rule_expression_used,
      transaction.description,
      transaction.notes,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].transaction_id;
  }

  async getAccrualTransactions(
    employeeId: string,
    leaveTypeId: string,
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AccrualTransaction[]> {
    let query = `
      SELECT * FROM leave_accrual_transactions
      WHERE organization_id = $1 AND employee_id = $2 AND leave_type_id = $3
    `;
    const values: any[] = [organizationId, employeeId, leaveTypeId];

    if (startDate) {
      values.push(startDate);
      query += ` AND transaction_date >= $${values.length}`;
    }

    if (endDate) {
      values.push(endDate);
      query += ` AND transaction_date <= $${values.length}`;
    }

    query += ' ORDER BY transaction_date DESC';

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private calculateServiceYears(hireDate: Date, currentDate: Date): number {
    const years = currentDate.getFullYear() - hireDate.getFullYear();
    const monthDiff = currentDate.getMonth() - hireDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < hireDate.getDate())) {
      return years - 1 + (12 + monthDiff) / 12;
    }
    
    return years + monthDiff / 12;
  }

  private calculateMonthsBetween(startDate: Date, endDate: Date): number {
    const yearDiff = endDate.getFullYear() - startDate.getFullYear();
    const monthDiff = endDate.getMonth() - startDate.getMonth();
    return yearDiff * 12 + monthDiff;
  }

  private mapRowToPolicy(row: any): LeaveAccrualPolicy {
    return {
      policy_id: row.policy_id,
      organization_id: row.organization_id,
      policy_name: row.policy_name,
      policy_code: row.policy_code,
      description: row.description,
      leave_type_id: row.leave_type_id,
      accrual_type: row.accrual_type,
      accrual_frequency: row.accrual_frequency,
      calculation_method: row.calculation_method,
      days_per_period: parseFloat(row.days_per_period),
      max_accrual_days: row.max_accrual_days ? parseFloat(row.max_accrual_days) : undefined,
      tier_rules: row.tier_rules,
      accrual_rule_expression: row.accrual_rule_expression,
      eligibility_criteria: row.eligibility_criteria,
      minimum_service_days: row.minimum_service_days,
      allows_carry_forward: row.allows_carry_forward,
      max_carry_forward_days: row.max_carry_forward_days ? parseFloat(row.max_carry_forward_days) : undefined,
      carry_forward_expiry_months: row.carry_forward_expiry_months,
      max_balance_cap: row.max_balance_cap ? parseFloat(row.max_balance_cap) : undefined,
      prorate_on_joining: row.prorate_on_joining,
      prorate_on_leaving: row.prorate_on_leaving,
      effective_from: row.effective_from,
      effective_to: row.effective_to,
      is_active: row.is_active,
    };
  }
}
