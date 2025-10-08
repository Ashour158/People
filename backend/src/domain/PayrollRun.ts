// =====================================================
// Domain Entity: PayrollRun
// Payroll run with status management
// =====================================================

import { PayrollRunStatus, PayrollRunType } from './enums';

export interface PayrollRunData {
  payroll_run_id?: string;
  organization_id: string;
  company_id?: string;
  period_year: number;
  period_month: number;
  pay_period_start: Date;
  pay_period_end: Date;
  payment_date?: Date;
  run_name?: string;
  run_type?: PayrollRunType;
  status?: PayrollRunStatus;
  total_employees?: number;
  total_gross?: number;
  total_deductions?: number;
  total_net?: number;
  processed_by?: string;
  processed_at?: Date;
  approved_by?: string;
  approved_at?: Date;
}

export class PayrollRun {
  private data: Required<PayrollRunData>;

  constructor(data: PayrollRunData) {
    this.validate(data);
    
    this.data = {
      payroll_run_id: data.payroll_run_id || this.generateId(),
      organization_id: data.organization_id,
      company_id: data.company_id || '',
      period_year: data.period_year,
      period_month: data.period_month,
      pay_period_start: data.pay_period_start,
      pay_period_end: data.pay_period_end,
      payment_date: data.payment_date || null as any,
      run_name: data.run_name || this.generateRunName(data.period_year, data.period_month),
      run_type: data.run_type || PayrollRunType.REGULAR,
      status: data.status || PayrollRunStatus.DRAFT,
      total_employees: data.total_employees || 0,
      total_gross: data.total_gross || 0,
      total_deductions: data.total_deductions || 0,
      total_net: data.total_net || 0,
      processed_by: data.processed_by || '',
      processed_at: data.processed_at || null as any,
      approved_by: data.approved_by || '',
      approved_at: data.approved_at || null as any,
    };
  }

  private validate(data: PayrollRunData): void {
    if (!data.organization_id) {
      throw new Error('Organization ID is required');
    }

    if (!data.period_year || data.period_year < 2000 || data.period_year > 2100) {
      throw new Error('Invalid period year');
    }

    if (!data.period_month || data.period_month < 1 || data.period_month > 12) {
      throw new Error('Period month must be between 1 and 12');
    }

    if (!data.pay_period_start || !data.pay_period_end) {
      throw new Error('Pay period start and end dates are required');
    }

    if (data.pay_period_start > data.pay_period_end) {
      throw new Error('Pay period start must be before or equal to end date');
    }
  }

  private generateId(): string {
    return `payroll_run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRunName(year: number, month: number): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[month - 1]} ${year} Payroll`;
  }

  get id(): string {
    return this.data.payroll_run_id;
  }

  get organizationId(): string {
    return this.data.organization_id;
  }

  get periodYear(): number {
    return this.data.period_year;
  }

  get periodMonth(): number {
    return this.data.period_month;
  }

  get status(): PayrollRunStatus {
    return this.data.status;
  }

  get runType(): PayrollRunType {
    return this.data.run_type;
  }

  get totalNet(): number {
    return this.data.total_net;
  }

  isDraft(): boolean {
    return this.data.status === PayrollRunStatus.DRAFT;
  }

  isApproved(): boolean {
    return this.data.status === PayrollRunStatus.APPROVED;
  }

  isPaid(): boolean {
    return this.data.status === PayrollRunStatus.PAID;
  }

  startProcessing(userId: string): void {
    if (this.data.status !== PayrollRunStatus.DRAFT) {
      throw new Error('Only draft payroll runs can be processed');
    }

    this.data.status = PayrollRunStatus.IN_PROGRESS;
    this.data.processed_by = userId;
    this.data.processed_at = new Date();
  }

  markCalculated(): void {
    if (this.data.status !== PayrollRunStatus.IN_PROGRESS) {
      throw new Error('Payroll run must be in progress to mark as calculated');
    }

    this.data.status = PayrollRunStatus.CALCULATED;
  }

  approve(userId: string): void {
    if (this.data.status !== PayrollRunStatus.CALCULATED) {
      throw new Error('Only calculated payroll runs can be approved');
    }

    this.data.status = PayrollRunStatus.APPROVED;
    this.data.approved_by = userId;
    this.data.approved_at = new Date();
  }

  markPaid(): void {
    if (this.data.status !== PayrollRunStatus.APPROVED) {
      throw new Error('Only approved payroll runs can be marked as paid');
    }

    this.data.status = PayrollRunStatus.PAID;
  }

  cancel(): void {
    if (this.data.status === PayrollRunStatus.PAID) {
      throw new Error('Cannot cancel paid payroll run');
    }

    this.data.status = PayrollRunStatus.CANCELLED;
  }

  updateTotals(employees: number, gross: number, deductions: number, net: number): void {
    if (employees < 0 || gross < 0 || deductions < 0 || net < 0) {
      throw new Error('Totals cannot be negative');
    }

    this.data.total_employees = employees;
    this.data.total_gross = gross;
    this.data.total_deductions = deductions;
    this.data.total_net = net;
  }

  toJSON(): Required<PayrollRunData> {
    return { ...this.data };
  }
}
