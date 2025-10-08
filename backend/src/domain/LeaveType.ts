// =====================================================
// Domain Entity: LeaveType
// Leave type configuration with business rules
// =====================================================

import { LeaveAccrualFrequency } from './enums';

export interface LeaveTypeData {
  leave_type_id?: string;
  organization_id: string;
  leave_type_name: string;
  leave_type_code: string;
  description?: string;
  max_days_per_year?: number;
  carry_forward_allowed?: boolean;
  max_carry_forward_days?: number;
  requires_approval?: boolean;
  approval_levels?: number;
  is_accrual_based?: boolean;
  accrual_rate?: number;
  accrual_frequency?: LeaveAccrualFrequency;
  applicable_for_gender?: string;
  is_active?: boolean;
}

export class LeaveType {
  private data: Required<LeaveTypeData>;

  constructor(data: LeaveTypeData) {
    this.validate(data);
    this.data = {
      leave_type_id: data.leave_type_id || this.generateId(),
      organization_id: data.organization_id,
      leave_type_name: data.leave_type_name,
      leave_type_code: data.leave_type_code,
      description: data.description || '',
      max_days_per_year: data.max_days_per_year || 0,
      carry_forward_allowed: data.carry_forward_allowed || false,
      max_carry_forward_days: data.max_carry_forward_days || 0,
      requires_approval: data.requires_approval !== undefined ? data.requires_approval : true,
      approval_levels: data.approval_levels || 1,
      is_accrual_based: data.is_accrual_based || false,
      accrual_rate: data.accrual_rate || 0,
      accrual_frequency: data.accrual_frequency || LeaveAccrualFrequency.MONTHLY,
      applicable_for_gender: data.applicable_for_gender || 'all',
      is_active: data.is_active !== undefined ? data.is_active : true,
    };
  }

  private validate(data: LeaveTypeData): void {
    if (!data.organization_id) {
      throw new Error('Organization ID is required');
    }

    if (!data.leave_type_name || data.leave_type_name.trim().length === 0) {
      throw new Error('Leave type name is required');
    }

    if (!data.leave_type_code || data.leave_type_code.trim().length === 0) {
      throw new Error('Leave type code is required');
    }

    if (data.max_days_per_year !== undefined && data.max_days_per_year < 0) {
      throw new Error('Max days per year cannot be negative');
    }

    if (data.approval_levels !== undefined && data.approval_levels < 1) {
      throw new Error('Approval levels must be at least 1');
    }

    if (data.is_accrual_based && (!data.accrual_rate || data.accrual_rate <= 0)) {
      throw new Error('Accrual rate is required for accrual-based leave types');
    }
  }

  private generateId(): string {
    return `leave_type_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  get id(): string {
    return this.data.leave_type_id;
  }

  get organizationId(): string {
    return this.data.organization_id;
  }

  get name(): string {
    return this.data.leave_type_name;
  }

  get code(): string {
    return this.data.leave_type_code;
  }

  get maxDaysPerYear(): number {
    return this.data.max_days_per_year;
  }

  get requiresApproval(): boolean {
    return this.data.requires_approval;
  }

  get isActive(): boolean {
    return this.data.is_active;
  }

  calculateAccrual(months: number): number {
    if (!this.data.is_accrual_based) {
      return 0;
    }

    const rate = this.data.accrual_rate;
    switch (this.data.accrual_frequency) {
      case LeaveAccrualFrequency.MONTHLY:
        return rate * months;
      case LeaveAccrualFrequency.QUARTERLY:
        return rate * Math.floor(months / 3);
      case LeaveAccrualFrequency.ANNUALLY:
        return rate * Math.floor(months / 12);
      default:
        return 0;
    }
  }

  toJSON(): Required<LeaveTypeData> {
    return { ...this.data };
  }
}
