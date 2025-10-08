import { Pool } from 'pg';
import { WebhookService } from '../services/webhook.service';
import { logger } from '../config/logger';

/**
 * Global webhook event emitter
 * Use this to trigger webhook events from anywhere in the application
 */
export class WebhookEventEmitter {
  private static instance: WebhookEventEmitter;
  private webhookService: WebhookService;

  private constructor(db: Pool) {
    this.webhookService = new WebhookService(db);
  }

  static initialize(db: Pool): WebhookEventEmitter {
    if (!WebhookEventEmitter.instance) {
      WebhookEventEmitter.instance = new WebhookEventEmitter(db);
    }
    return WebhookEventEmitter.instance;
  }

  static getInstance(): WebhookEventEmitter {
    if (!WebhookEventEmitter.instance) {
      throw new Error('WebhookEventEmitter not initialized. Call initialize() first.');
    }
    return WebhookEventEmitter.instance;
  }

  /**
   * Emit webhook event
   */
  async emit(
    eventType: string,
    organizationId: string,
    data: any
  ): Promise<void> {
    try {
      await this.webhookService.triggerEvent({
        event_type: eventType,
        organization_id: organizationId,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error emitting webhook event:', { error, eventType, organizationId });
    }
  }

  // Employee events
  async emitEmployeeCreated(organizationId: string, employee: any): Promise<void> {
    return this.emit('employee.created', organizationId, { employee });
  }

  async emitEmployeeUpdated(organizationId: string, employee: any): Promise<void> {
    return this.emit('employee.updated', organizationId, { employee });
  }

  async emitEmployeeDeleted(organizationId: string, employeeId: string): Promise<void> {
    return this.emit('employee.deleted', organizationId, { employee_id: employeeId });
  }

  // Leave events
  async emitLeaveRequested(organizationId: string, leaveRequest: any): Promise<void> {
    return this.emit('leave.requested', organizationId, { leave_request: leaveRequest });
  }

  async emitLeaveApproved(organizationId: string, leaveRequest: any): Promise<void> {
    return this.emit('leave.approved', organizationId, { leave_request: leaveRequest });
  }

  async emitLeaveRejected(organizationId: string, leaveRequest: any): Promise<void> {
    return this.emit('leave.rejected', organizationId, { leave_request: leaveRequest });
  }

  // Attendance events
  async emitAttendanceCheckIn(organizationId: string, attendance: any): Promise<void> {
    return this.emit('attendance.checkin', organizationId, { attendance });
  }

  async emitAttendanceCheckOut(organizationId: string, attendance: any): Promise<void> {
    return this.emit('attendance.checkout', organizationId, { attendance });
  }

  // Payroll events
  async emitPayrollProcessed(organizationId: string, payrollRun: any): Promise<void> {
    return this.emit('payroll.processed', organizationId, { payroll_run: payrollRun });
  }

  // Performance events
  async emitPerformanceReviewCompleted(organizationId: string, review: any): Promise<void> {
    return this.emit('performance.review_completed', organizationId, { review });
  }
}

/**
 * Helper function to get webhook emitter instance
 */
export function getWebhookEmitter(): WebhookEventEmitter {
  return WebhookEventEmitter.getInstance();
}
