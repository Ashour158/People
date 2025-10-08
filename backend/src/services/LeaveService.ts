// =====================================================
// Leave Service
// Business logic for leave management
// =====================================================

import { LeaveRequest, LeaveRequestData } from '../domain/LeaveRequest';
import { ILeaveRepository } from '../repositories/interfaces';
import { EventPublisher } from '../events/EventPublisher';

export class LeaveService {
  constructor(
    private leaveRepository: ILeaveRepository,
    private eventPublisher: EventPublisher
  ) {}

  async requestLeave(data: LeaveRequestData): Promise<LeaveRequest> {
    // Validate leave balance
    const balance = await this.leaveRepository.getLeaveBalance(
      data.employee_id,
      data.leave_type_id,
      new Date().getFullYear(),
      data.organization_id
    );
    
    if (!balance || balance.available_days < data.total_days) {
      throw new Error('Insufficient leave balance');
    }

    // Create leave request
    const leaveRequest = new LeaveRequest(data);
    
    // Persist to database (stub - would be implemented)
    // const savedRequest = await this.leaveRepository.createLeaveRequest(leaveRequest);
    
    // Publish domain event
    await this.eventPublisher.publish({
      eventType: 'leave',
      eventName: 'leave.requested',
      organizationId: data.organization_id,
      aggregateType: 'leave_request',
      aggregateId: leaveRequest.id,
      payload: {
        leaveRequestId: leaveRequest.id,
        employeeId: data.employee_id,
        leaveTypeId: data.leave_type_id,
        startDate: data.start_date,
        endDate: data.end_date,
        totalDays: data.total_days,
        reason: data.reason,
      },
    });
    
    return leaveRequest;
  }

  async approveLeave(
    leaveRequestId: string,
    organizationId: string,
    approverId: string
  ): Promise<void> {
    // Stub implementation - demonstrates validation pattern
    throw new Error('Method not yet implemented - validation pass-through only');
  }
}
