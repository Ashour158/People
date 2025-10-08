// =====================================================
// Domain Entity: LeaveRequest
// Leave request with validation and business rules
// =====================================================

import { LeaveStatus } from './enums';
import { DateRange } from './DateRange';

export interface LeaveRequestData {
  leave_request_id?: string;
  organization_id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: Date;
  end_date: Date;
  total_days: number;
  reason: string;
  emergency_contact?: string;
  status?: LeaveStatus;
  current_approver_id?: string;
  approved_by?: string;
  approved_at?: Date;
  rejected_by?: string;
  rejected_at?: Date;
  rejection_reason?: string;
}

export class LeaveRequest {
  private data: Required<LeaveRequestData>;

  constructor(data: LeaveRequestData) {
    this.validate(data);
    // Validate date range
    new DateRange(data.start_date, data.end_date);
    
    this.data = {
      leave_request_id: data.leave_request_id || this.generateId(),
      organization_id: data.organization_id,
      employee_id: data.employee_id,
      leave_type_id: data.leave_type_id,
      start_date: data.start_date,
      end_date: data.end_date,
      total_days: data.total_days,
      reason: data.reason,
      emergency_contact: data.emergency_contact || '',
      status: data.status || LeaveStatus.PENDING,
      current_approver_id: data.current_approver_id || '',
      approved_by: data.approved_by || '',
      approved_at: data.approved_at || null as any,
      rejected_by: data.rejected_by || '',
      rejected_at: data.rejected_at || null as any,
      rejection_reason: data.rejection_reason || '',
    };
  }

  private validate(data: LeaveRequestData): void {
    if (!data.organization_id) {
      throw new Error('Organization ID is required');
    }

    if (!data.employee_id) {
      throw new Error('Employee ID is required');
    }

    if (!data.leave_type_id) {
      throw new Error('Leave type ID is required');
    }

    if (!data.reason || data.reason.trim().length === 0) {
      throw new Error('Reason is required');
    }

    if (data.reason.length > 1000) {
      throw new Error('Reason is too long (max 1000 characters)');
    }

    if (!data.total_days || data.total_days <= 0) {
      throw new Error('Total days must be greater than 0');
    }

    // Date range will be validated by DateRange constructor
  }

  private generateId(): string {
    return `leave_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  get id(): string {
    return this.data.leave_request_id;
  }

  get organizationId(): string {
    return this.data.organization_id;
  }

  get employeeId(): string {
    return this.data.employee_id;
  }

  get leaveTypeId(): string {
    return this.data.leave_type_id;
  }

  get status(): LeaveStatus {
    return this.data.status;
  }

  get totalDays(): number {
    return this.data.total_days;
  }

  get startDate(): Date {
    return this.data.start_date;
  }

  get endDate(): Date {
    return this.data.end_date;
  }

  isPending(): boolean {
    return this.data.status === LeaveStatus.PENDING;
  }

  isApproved(): boolean {
    return this.data.status === LeaveStatus.APPROVED;
  }

  isRejected(): boolean {
    return this.data.status === LeaveStatus.REJECTED;
  }

  approve(approverId: string): void {
    if (this.data.status !== LeaveStatus.PENDING) {
      throw new Error('Only pending leave requests can be approved');
    }

    this.data.status = LeaveStatus.APPROVED;
    this.data.approved_by = approverId;
    this.data.approved_at = new Date();
  }

  reject(rejecterId: string, reason: string): void {
    if (this.data.status !== LeaveStatus.PENDING) {
      throw new Error('Only pending leave requests can be rejected');
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('Rejection reason is required');
    }

    this.data.status = LeaveStatus.REJECTED;
    this.data.rejected_by = rejecterId;
    this.data.rejected_at = new Date();
    this.data.rejection_reason = reason;
  }

  cancel(): void {
    if (this.data.status === LeaveStatus.COMPLETED) {
      throw new Error('Cannot cancel completed leave request');
    }

    this.data.status = LeaveStatus.CANCELLED;
  }

  toJSON(): Required<LeaveRequestData> {
    return { ...this.data };
  }
}
