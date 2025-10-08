// =====================================================
// Event Handlers
// Handlers for domain events to decouple business logic
// =====================================================

import { 
  DomainEvent,
  EmployeeCreatedEvent,
  LeaveRequestedEvent,
  LeaveApprovedEvent,
  LeaveRejectedEvent,
  TimesheetSubmittedEvent,
  TimesheetApprovedEvent,
  AttendanceCheckedInEvent,
  AttendanceCheckedOutEvent
} from './events';

// =====================================================
// EVENT HANDLER INTERFACE
// =====================================================

export interface IEventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
  eventType: string;
  eventName: string;
}

// =====================================================
// EMPLOYEE EVENT HANDLERS
// =====================================================

export class EmployeeCreatedHandler implements IEventHandler<EmployeeCreatedEvent> {
  eventType = 'employee';
  eventName = 'employee.created';

  async handle(event: EmployeeCreatedEvent): Promise<void> {
    console.log(`[EmployeeCreatedHandler] Processing employee.created event: ${event.aggregateId}`);
    
    // TODO: Implement actual logic
    // 1. Send welcome email to employee
    // 2. Create default employee permissions/roles
    // 3. Setup employee in external systems (if any)
    // 4. Create onboarding checklist
    // 5. Notify HR team
    
    // Example: Send notification
    await this.sendWelcomeEmail(event.payload);
    await this.createDefaultPermissions(event.payload.employeeId, event.organizationId);
    await this.notifyHRTeam(event.payload);
  }

  private async sendWelcomeEmail(payload: EmployeeCreatedEvent['payload']): Promise<void> {
    console.log(`[EmployeeCreatedHandler] Sending welcome email to ${payload.email}`);
    // TODO: Integrate with email service
  }

  private async createDefaultPermissions(employeeId: string, organizationId: string): Promise<void> {
    console.log(`[EmployeeCreatedHandler] Creating default permissions for employee ${employeeId}`);
    // TODO: Create default employee role assignments
  }

  private async notifyHRTeam(payload: EmployeeCreatedEvent['payload']): Promise<void> {
    console.log(`[EmployeeCreatedHandler] Notifying HR team about new employee ${payload.firstName} ${payload.lastName}`);
    // TODO: Send notification to HR team
  }
}

// =====================================================
// LEAVE EVENT HANDLERS
// =====================================================

export class LeaveRequestedHandler implements IEventHandler<LeaveRequestedEvent> {
  eventType = 'leave';
  eventName = 'leave.requested';

  async handle(event: LeaveRequestedEvent): Promise<void> {
    console.log(`[LeaveRequestedHandler] Processing leave.requested event: ${event.aggregateId}`);
    
    // TODO: Implement actual logic
    // 1. Notify approvers (reporting manager, HR)
    // 2. Check for leave conflicts
    // 3. Update team calendar
    // 4. Send acknowledgment email to employee
    
    await this.notifyApprovers(event.payload, event.organizationId);
    await this.checkLeaveConflicts(event.payload);
    await this.sendAcknowledgmentEmail(event.payload);
  }

  private async notifyApprovers(payload: LeaveRequestedEvent['payload'], organizationId: string): Promise<void> {
    console.log(`[LeaveRequestedHandler] Notifying approvers for leave request ${payload.leaveRequestId}`);
    // TODO: Get approvers and send notifications
  }

  private async checkLeaveConflicts(payload: LeaveRequestedEvent['payload']): Promise<void> {
    console.log(`[LeaveRequestedHandler] Checking for conflicts for leave request ${payload.leaveRequestId}`);
    // TODO: Check if multiple team members are on leave during same period
  }

  private async sendAcknowledgmentEmail(payload: LeaveRequestedEvent['payload']): Promise<void> {
    console.log(`[LeaveRequestedHandler] Sending acknowledgment email for leave request ${payload.leaveRequestId}`);
    // TODO: Send email to employee confirming leave request receipt
  }
}

export class LeaveApprovedHandler implements IEventHandler<LeaveApprovedEvent> {
  eventType = 'leave';
  eventName = 'leave.approved';

  async handle(event: LeaveApprovedEvent): Promise<void> {
    console.log(`[LeaveApprovedHandler] Processing leave.approved event: ${event.aggregateId}`);
    
    // TODO: Implement actual logic
    // 1. Update leave balance
    // 2. Update team calendar
    // 3. Notify employee
    // 4. Notify team members about upcoming absence
    // 5. Sync with external calendar systems (Outlook, Google Calendar)
    
    await this.updateLeaveBalance(event.payload);
    await this.notifyEmployee(event.payload);
    await this.updateTeamCalendar(event.payload);
    await this.notifyTeam(event.payload, event.organizationId);
  }

  private async updateLeaveBalance(payload: LeaveApprovedEvent['payload']): Promise<void> {
    console.log(`[LeaveApprovedHandler] Updating leave balance for employee ${payload.employeeId}`);
    // TODO: Deduct approved days from leave balance
  }

  private async notifyEmployee(payload: LeaveApprovedEvent['payload']): Promise<void> {
    console.log(`[LeaveApprovedHandler] Notifying employee ${payload.employeeId} about leave approval`);
    // TODO: Send approval notification to employee
  }

  private async updateTeamCalendar(payload: LeaveApprovedEvent['payload']): Promise<void> {
    console.log(`[LeaveApprovedHandler] Updating team calendar for leave ${payload.leaveRequestId}`);
    // TODO: Add leave to team calendar
  }

  private async notifyTeam(payload: LeaveApprovedEvent['payload'], organizationId: string): Promise<void> {
    console.log(`[LeaveApprovedHandler] Notifying team about employee absence`);
    // TODO: Notify team members about upcoming absence
  }
}

export class LeaveRejectedHandler implements IEventHandler<LeaveRejectedEvent> {
  eventType = 'leave';
  eventName = 'leave.rejected';

  async handle(event: LeaveRejectedEvent): Promise<void> {
    console.log(`[LeaveRejectedHandler] Processing leave.rejected event: ${event.aggregateId}`);
    
    // TODO: Implement actual logic
    // 1. Notify employee with rejection reason
    // 2. Update leave balance (restore pending days)
    // 3. Log rejection in audit trail
    
    await this.notifyEmployee(event.payload);
    await this.restorePendingBalance(event.payload);
  }

  private async notifyEmployee(payload: LeaveRejectedEvent['payload']): Promise<void> {
    console.log(`[LeaveRejectedHandler] Notifying employee ${payload.employeeId} about leave rejection`);
    // TODO: Send rejection notification with reason
  }

  private async restorePendingBalance(payload: LeaveRejectedEvent['payload']): Promise<void> {
    console.log(`[LeaveRejectedHandler] Restoring pending balance for employee ${payload.employeeId}`);
    // TODO: Restore pending days back to available balance
  }
}

// =====================================================
// TIMESHEET EVENT HANDLERS
// =====================================================

export class TimesheetSubmittedHandler implements IEventHandler<TimesheetSubmittedEvent> {
  eventType = 'timesheet';
  eventName = 'timesheet.submitted';

  async handle(event: TimesheetSubmittedEvent): Promise<void> {
    console.log(`[TimesheetSubmittedHandler] Processing timesheet.submitted event: ${event.aggregateId}`);
    
    // TODO: Implement actual logic
    // 1. Notify approvers (manager, project leads)
    // 2. Validate timesheet data
    // 3. Check for overtime hours
    // 4. Send acknowledgment to employee
    // 5. Integrate with project management tools
    
    await this.notifyApprovers(event.payload, event.organizationId);
    await this.validateTimesheet(event.payload);
    await this.sendAcknowledgment(event.payload);
  }

  private async notifyApprovers(payload: TimesheetSubmittedEvent['payload'], organizationId: string): Promise<void> {
    console.log(`[TimesheetSubmittedHandler] Notifying approvers for timesheet ${payload.timesheetId}`);
    // TODO: Get approvers and send notifications
  }

  private async validateTimesheet(payload: TimesheetSubmittedEvent['payload']): Promise<void> {
    console.log(`[TimesheetSubmittedHandler] Validating timesheet ${payload.timesheetId}`);
    // TODO: Validate hours, check for conflicts, verify project codes
  }

  private async sendAcknowledgment(payload: TimesheetSubmittedEvent['payload']): Promise<void> {
    console.log(`[TimesheetSubmittedHandler] Sending acknowledgment for timesheet ${payload.timesheetId}`);
    // TODO: Send email/notification confirming submission
  }
}

export class TimesheetApprovedHandler implements IEventHandler<TimesheetApprovedEvent> {
  eventType = 'timesheet';
  eventName = 'timesheet.approved';

  async handle(event: TimesheetApprovedEvent): Promise<void> {
    console.log(`[TimesheetApprovedHandler] Processing timesheet.approved event: ${event.aggregateId}`);
    
    // TODO: Implement actual logic
    // 1. Update project cost allocation
    // 2. Trigger payroll calculation
    // 3. Notify employee of approval
    // 4. Sync with finance/accounting systems
    // 5. Update billable hours for clients
    
    await this.updateCostAllocation(event.payload);
    await this.triggerPayrollCalculation(event.payload);
    await this.notifyEmployee(event.payload);
    await this.syncWithFinance(event.payload, event.organizationId);
  }

  private async updateCostAllocation(payload: TimesheetApprovedEvent['payload']): Promise<void> {
    console.log(`[TimesheetApprovedHandler] Updating cost allocation for timesheet ${payload.timesheetId}`);
    // TODO: Allocate costs to projects/departments
  }

  private async triggerPayrollCalculation(payload: TimesheetApprovedEvent['payload']): Promise<void> {
    console.log(`[TimesheetApprovedHandler] Triggering payroll calculation for employee ${payload.employeeId}`);
    // TODO: Update payroll with approved hours
  }

  private async notifyEmployee(payload: TimesheetApprovedEvent['payload']): Promise<void> {
    console.log(`[TimesheetApprovedHandler] Notifying employee ${payload.employeeId} about timesheet approval`);
    // TODO: Send approval notification
  }

  private async syncWithFinance(payload: TimesheetApprovedEvent['payload'], organizationId: string): Promise<void> {
    console.log(`[TimesheetApprovedHandler] Syncing timesheet with finance system`);
    // TODO: Integrate with finance/accounting system
  }
}

// =====================================================
// ATTENDANCE EVENT HANDLERS
// =====================================================

export class AttendanceCheckedInHandler implements IEventHandler<AttendanceCheckedInEvent> {
  eventType = 'attendance';
  eventName = 'attendance.checked_in';

  async handle(event: AttendanceCheckedInEvent): Promise<void> {
    console.log(`[AttendanceCheckedInHandler] Processing attendance.checked_in event: ${event.aggregateId}`);
    
    // TODO: Implement actual logic
    // 1. Check for late arrival
    // 2. Update team presence dashboard
    // 3. Notify manager if employee is late
    // 4. Update access control systems
    
    await this.checkLateArrival(event.payload);
    await this.updatePresenceDashboard(event.payload);
  }

  private async checkLateArrival(payload: AttendanceCheckedInEvent['payload']): Promise<void> {
    console.log(`[AttendanceCheckedInHandler] Checking late arrival for employee ${payload.employeeId}`);
    // TODO: Check shift timings and determine if late
  }

  private async updatePresenceDashboard(payload: AttendanceCheckedInEvent['payload']): Promise<void> {
    console.log(`[AttendanceCheckedInHandler] Updating presence dashboard`);
    // TODO: Update real-time presence dashboard
  }
}

export class AttendanceCheckedOutHandler implements IEventHandler<AttendanceCheckedOutEvent> {
  eventType = 'attendance';
  eventName = 'attendance.checked_out';

  async handle(event: AttendanceCheckedOutEvent): Promise<void> {
    console.log(`[AttendanceCheckedOutHandler] Processing attendance.checked_out event: ${event.aggregateId}`);
    
    // TODO: Implement actual logic
    // 1. Calculate working hours
    // 2. Check for early departure
    // 3. Update team presence dashboard
    // 4. Calculate overtime if applicable
    // 5. Update access control systems
    
    await this.calculateWorkingHours(event.payload);
    await this.checkEarlyDeparture(event.payload);
    await this.calculateOvertime(event.payload);
  }

  private async calculateWorkingHours(payload: AttendanceCheckedOutEvent['payload']): Promise<void> {
    console.log(`[AttendanceCheckedOutHandler] Working hours calculated: ${payload.workingHours} for employee ${payload.employeeId}`);
    // TODO: Store working hours in timesheet/attendance record
  }

  private async checkEarlyDeparture(payload: AttendanceCheckedOutEvent['payload']): Promise<void> {
    console.log(`[AttendanceCheckedOutHandler] Checking early departure for employee ${payload.employeeId}`);
    // TODO: Check if employee left before shift end time
  }

  private async calculateOvertime(payload: AttendanceCheckedOutEvent['payload']): Promise<void> {
    console.log(`[AttendanceCheckedOutHandler] Calculating overtime for employee ${payload.employeeId}`);
    // TODO: Calculate and record overtime hours
  }
}

// =====================================================
// EVENT HANDLER REGISTRY
// =====================================================

export class EventHandlerRegistry {
  private handlers: Map<string, IEventHandler[]> = new Map();

  register(handler: IEventHandler): void {
    const key = `${handler.eventType}.${handler.eventName}`;
    
    if (!this.handlers.has(key)) {
      this.handlers.set(key, []);
    }
    
    this.handlers.get(key)!.push(handler);
    console.log(`[EventHandlerRegistry] Registered handler for ${key}`);
  }

  async dispatch(event: DomainEvent): Promise<void> {
    const key = `${event.eventType}.${event.eventName}`;
    const handlers = this.handlers.get(key) || [];

    if (handlers.length === 0) {
      console.warn(`[EventHandlerRegistry] No handlers registered for ${key}`);
      return;
    }

    console.log(`[EventHandlerRegistry] Dispatching ${key} to ${handlers.length} handler(s)`);

    // Execute all handlers in parallel
    await Promise.all(
      handlers.map(handler => 
        handler.handle(event).catch(error => {
          console.error(`[EventHandlerRegistry] Handler failed for ${key}:`, error);
          // Don't throw - allow other handlers to execute
        })
      )
    );
  }

  getHandlers(eventType: string, eventName: string): IEventHandler[] {
    const key = `${eventType}.${eventName}`;
    return this.handlers.get(key) || [];
  }

  clear(): void {
    this.handlers.clear();
  }
}

// =====================================================
// DEFAULT REGISTRY SETUP
// =====================================================

export function createDefaultEventHandlerRegistry(): EventHandlerRegistry {
  const registry = new EventHandlerRegistry();

  // Register employee handlers
  registry.register(new EmployeeCreatedHandler());

  // Register leave handlers
  registry.register(new LeaveRequestedHandler());
  registry.register(new LeaveApprovedHandler());
  registry.register(new LeaveRejectedHandler());

  // Register timesheet handlers
  registry.register(new TimesheetSubmittedHandler());
  registry.register(new TimesheetApprovedHandler());

  // Register attendance handlers
  registry.register(new AttendanceCheckedInHandler());
  registry.register(new AttendanceCheckedOutHandler());

  console.log('[EventHandlerRegistry] Default handlers registered');

  return registry;
}
