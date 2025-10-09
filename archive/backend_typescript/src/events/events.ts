// =====================================================
// Event Definitions
// Typed events for event-driven architecture
// =====================================================

export interface BaseEvent {
  eventId: string;
  eventType: string;
  eventName: string;
  organizationId: string;
  aggregateType: string;
  aggregateId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// =====================================================
// EMPLOYEE EVENTS
// =====================================================

export interface EmployeeCreatedEvent extends BaseEvent {
  eventType: 'employee';
  eventName: 'employee.created';
  aggregateType: 'employee';
  payload: {
    employeeId: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentId?: string;
    designationId?: string;
    hireDate: Date;
  };
}

export interface EmployeeUpdatedEvent extends BaseEvent {
  eventType: 'employee';
  eventName: 'employee.updated';
  aggregateType: 'employee';
  payload: {
    employeeId: string;
    changes: Record<string, any>;
  };
}

export interface EmployeeTerminatedEvent extends BaseEvent {
  eventType: 'employee';
  eventName: 'employee.terminated';
  aggregateType: 'employee';
  payload: {
    employeeId: string;
    terminationDate: Date;
    reason?: string;
  };
}

// =====================================================
// LEAVE EVENTS
// =====================================================

export interface LeaveRequestedEvent extends BaseEvent {
  eventType: 'leave';
  eventName: 'leave.requested';
  aggregateType: 'leave_request';
  payload: {
    leaveRequestId: string;
    employeeId: string;
    leaveTypeId: string;
    startDate: Date;
    endDate: Date;
    totalDays: number;
    reason: string;
  };
}

export interface LeaveApprovedEvent extends BaseEvent {
  eventType: 'leave';
  eventName: 'leave.approved';
  aggregateType: 'leave_request';
  payload: {
    leaveRequestId: string;
    employeeId: string;
    approverId: string;
    approvedAt: Date;
  };
}

export interface LeaveRejectedEvent extends BaseEvent {
  eventType: 'leave';
  eventName: 'leave.rejected';
  aggregateType: 'leave_request';
  payload: {
    leaveRequestId: string;
    employeeId: string;
    rejectedBy: string;
    rejectedAt: Date;
    reason: string;
  };
}

// =====================================================
// PAYROLL EVENTS
// =====================================================

export interface PayrollRunCreatedEvent extends BaseEvent {
  eventType: 'payroll';
  eventName: 'payroll.run_created';
  aggregateType: 'payroll_run';
  payload: {
    payrollRunId: string;
    periodYear: number;
    periodMonth: number;
    runType: string;
  };
}

export interface PayrollRunProcessedEvent extends BaseEvent {
  eventType: 'payroll';
  eventName: 'payroll.run_processed';
  aggregateType: 'payroll_run';
  payload: {
    payrollRunId: string;
    totalEmployees: number;
    totalGross: number;
    totalNet: number;
    processedBy: string;
    processedAt: Date;
  };
}

export interface PayrollRunApprovedEvent extends BaseEvent {
  eventType: 'payroll';
  eventName: 'payroll.run_approved';
  aggregateType: 'payroll_run';
  payload: {
    payrollRunId: string;
    approvedBy: string;
    approvedAt: Date;
  };
}

// =====================================================
// ATTENDANCE EVENTS
// =====================================================

export interface AttendanceCheckedInEvent extends BaseEvent {
  eventType: 'attendance';
  eventName: 'attendance.checked_in';
  aggregateType: 'attendance';
  payload: {
    attendanceId: string;
    employeeId: string;
    checkInTime: Date;
    location?: string;
  };
}

export interface AttendanceCheckedOutEvent extends BaseEvent {
  eventType: 'attendance';
  eventName: 'attendance.checked_out';
  aggregateType: 'attendance';
  payload: {
    attendanceId: string;
    employeeId: string;
    checkOutTime: Date;
    workingHours: number;
  };
}

// =====================================================
// TIMESHEET EVENTS
// =====================================================

export interface TimesheetSubmittedEvent extends BaseEvent {
  eventType: 'timesheet';
  eventName: 'timesheet.submitted';
  aggregateType: 'timesheet';
  payload: {
    timesheetId: string;
    employeeId: string;
    periodStart: Date;
    periodEnd: Date;
    totalHours: number;
    status: string;
  };
}

export interface TimesheetApprovedEvent extends BaseEvent {
  eventType: 'timesheet';
  eventName: 'timesheet.approved';
  aggregateType: 'timesheet';
  payload: {
    timesheetId: string;
    employeeId: string;
    approverId: string;
    approvedAt: Date;
  };
}

export interface TimesheetRejectedEvent extends BaseEvent {
  eventType: 'timesheet';
  eventName: 'timesheet.rejected';
  aggregateType: 'timesheet';
  payload: {
    timesheetId: string;
    employeeId: string;
    rejectedBy: string;
    rejectedAt: Date;
    reason: string;
  };
}

// =====================================================
// TYPE UNIONS
// =====================================================

export type DomainEvent =
  | EmployeeCreatedEvent
  | EmployeeUpdatedEvent
  | EmployeeTerminatedEvent
  | LeaveRequestedEvent
  | LeaveApprovedEvent
  | LeaveRejectedEvent
  | PayrollRunCreatedEvent
  | PayrollRunProcessedEvent
  | PayrollRunApprovedEvent
  | AttendanceCheckedInEvent
  | AttendanceCheckedOutEvent
  | TimesheetSubmittedEvent
  | TimesheetApprovedEvent
  | TimesheetRejectedEvent;
