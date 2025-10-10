// =====================================================
// Repository Interfaces
// Contract definitions for data access layer
// =====================================================

import { Employee } from '../domain/Employee';
import { LeaveType } from '../domain/LeaveType';
import { LeaveRequest } from '../domain/LeaveRequest';
import { PayrollRun } from '../domain/PayrollRun';

// =====================================================
// BASE REPOSITORY INTERFACE
// =====================================================

export interface BaseRepository<T> {
  findById(id: string, organizationId: string): Promise<T | null>;
  findAll(organizationId: string, filters?: Record<string, any>): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string, organizationId: string): Promise<boolean>;
}

// =====================================================
// EMPLOYEE REPOSITORY
// =====================================================

export interface IEmployeeRepository {
  findById(employeeId: string, organizationId: string): Promise<Employee | null>;
  findByEmail(email: string, organizationId: string): Promise<Employee | null>;
  findByEmployeeCode(employeeCode: string, organizationId: string): Promise<Employee | null>;
  findAll(
    organizationId: string, 
    filters?: {
      departmentId?: string;
      status?: string;
      searchTerm?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ employees: Employee[]; total: number }>;
  create(employee: Employee): Promise<Employee>;
  update(employeeId: string, organizationId: string, data: Partial<Employee>): Promise<Employee>;
  softDelete(employeeId: string, organizationId: string): Promise<boolean>;
  countByOrganization(organizationId: string): Promise<number>;
}

// =====================================================
// LEAVE REPOSITORY
// =====================================================

export interface ILeaveRepository {
  // Leave Types
  findLeaveTypeById(leaveTypeId: string, organizationId: string): Promise<LeaveType | null>;
  findAllLeaveTypes(organizationId: string): Promise<LeaveType[]>;
  createLeaveType(leaveType: LeaveType): Promise<LeaveType>;
  
  // Leave Requests
  findLeaveRequestById(requestId: string, organizationId: string): Promise<LeaveRequest | null>;
  findLeaveRequestsByEmployee(
    employeeId: string, 
    organizationId: string,
    filters?: {
      status?: string;
      year?: number;
      page?: number;
      limit?: number;
    }
  ): Promise<{ requests: LeaveRequest[]; total: number }>;
  findPendingLeaveRequests(
    approverId: string,
    organizationId: string
  ): Promise<LeaveRequest[]>;
  createLeaveRequest(request: LeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(requestId: string, organizationId: string, data: Partial<LeaveRequest>): Promise<LeaveRequest>;
  
  // Leave Balances
  getLeaveBalance(
    employeeId: string,
    leaveTypeId: string,
    year: number,
    organizationId: string
  ): Promise<{
    allocated_days: number;
    used_days: number;
    pending_days: number;
    available_days: number;
  } | null>;
  
  updateLeaveBalance(
    employeeId: string,
    leaveTypeId: string,
    year: number,
    organizationId: string,
    balance: {
      allocated_days?: number;
      used_days?: number;
      pending_days?: number;
      available_days?: number;
    }
  ): Promise<void>;
}

// =====================================================
// PAYROLL RUN REPOSITORY
// =====================================================

export interface IPayrollRunRepository {
  findById(payrollRunId: string, organizationId: string): Promise<PayrollRun | null>;
  findByPeriod(
    year: number,
    month: number,
    organizationId: string,
    runType?: string
  ): Promise<PayrollRun | null>;
  findAll(
    organizationId: string,
    filters?: {
      status?: string;
      year?: number;
      month?: number;
      page?: number;
      limit?: number;
    }
  ): Promise<{ runs: PayrollRun[]; total: number }>;
  create(payrollRun: PayrollRun): Promise<PayrollRun>;
  update(payrollRunId: string, organizationId: string, data: Partial<PayrollRun>): Promise<PayrollRun>;
  delete(payrollRunId: string, organizationId: string): Promise<boolean>;
}

// =====================================================
// EVENT OUTBOX REPOSITORY
// =====================================================

export interface IEventOutboxRepository {
  create(event: {
    organization_id: string;
    event_type: string;
    event_name: string;
    aggregate_type: string;
    aggregate_id: string;
    payload: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<string>;
  
  findPendingEvents(limit?: number): Promise<Array<{
    event_id: string;
    organization_id: string;
    event_type: string;
    event_name: string;
    aggregate_type: string;
    aggregate_id: string;
    payload: Record<string, any>;
    metadata?: Record<string, any>;
    retry_count: number;
  }>>;
  
  markProcessed(eventId: string): Promise<void>;
  markFailed(eventId: string, errorMessage: string): Promise<void>;
}

// =====================================================
// AUDIT LOG REPOSITORY
// =====================================================

export interface IAuditLogRepository {
  create(audit: {
    organization_id: string;
    user_id?: string;
    username?: string;
    ip_address?: string;
    user_agent?: string;
    entity_type: string;
    entity_id: string;
    action: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    changes?: Record<string, any>;
  }): Promise<string>;
  
  findByEntity(
    entityType: string,
    entityId: string,
    organizationId: string,
    limit?: number
  ): Promise<Array<{
    audit_id: string;
    user_id?: string;
    username?: string;
    action: string;
    changes?: Record<string, any>;
    created_at: Date;
  }>>;
  
  findByUser(
    userId: string,
    organizationId: string,
    filters?: {
      entityType?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<Array<any>>;
}
