// =====================================================
// Event Handlers
// Business logic executed when domain events occur
// =====================================================

import { EventHandler } from './EventDispatcher';

// =====================================================
// EMPLOYEE EVENT HANDLERS
// =====================================================

/**
 * Handle employee.created event
 * Actions:
 * - Send welcome email to new employee
 * - Create default permissions/roles
 * - Notify HR team
 * - Initialize employee profile
 */
export const handleEmployeeCreated: EventHandler = async (event) => {
  const { employeeId, email, firstName, lastName } = event.payload;
  
  console.log(`[Event Handler] Employee Created: ${firstName} ${lastName} (${employeeId})`);
  
  // TODO: Send welcome email
  // await emailService.sendWelcomeEmail({
  //   to: email,
  //   name: `${firstName} ${lastName}`,
  //   employeeId
  // });
  
  // TODO: Create default permissions
  // await permissionService.createDefaultPermissions(employeeId);
  
  // TODO: Notify HR team
  // await notificationService.notifyHR({
  //   type: 'employee_created',
  //   employeeId,
  //   message: `New employee ${firstName} ${lastName} has been added`
  // });
  
  console.log(`[Event Handler] Employee onboarding tasks initiated for ${employeeId}`);
};

/**
 * Handle employee.updated event
 * Actions:
 * - Audit significant changes
 * - Notify relevant parties if critical fields changed
 * - Update dependent systems
 */
export const handleEmployeeUpdated: EventHandler = async (event) => {
  const { employeeId, changes } = event.payload;
  
  console.log(`[Event Handler] Employee Updated: ${employeeId}`, changes);
  
  // Check for critical field changes
  const criticalFields = ['email', 'department_id', 'designation_id', 'employment_status'];
  const criticalChanges = Object.keys(changes).filter(key => criticalFields.includes(key));
  
  if (criticalChanges.length > 0) {
    console.log(`[Event Handler] Critical changes detected for ${employeeId}:`, criticalChanges);
    
    // TODO: Notify manager and HR
    // await notificationService.notifyCriticalChange({
    //   employeeId,
    //   changes: criticalChanges
    // });
  }
};

/**
 * Handle employee.terminated event
 * Actions:
 * - Deactivate system access
 * - Notify relevant teams
 * - Initiate exit process
 * - Calculate final settlement
 */
export const handleEmployeeTerminated: EventHandler = async (event) => {
  const { employeeId, terminationDate, reason } = event.payload;
  
  console.log(`[Event Handler] Employee Terminated: ${employeeId} on ${terminationDate}`);
  
  // TODO: Deactivate access
  // await accessService.deactivateEmployee(employeeId);
  
  // TODO: Calculate final settlement (gratuity, unused leaves, etc.)
  // await payrollService.calculateFinalSettlement(employeeId, terminationDate);
  
  // TODO: Initiate exit checklist
  // await onboardingService.createExitChecklist(employeeId);
  
  // TODO: Notify HR and manager
  // await notificationService.notifyTermination({
  //   employeeId,
  //   terminationDate,
  //   reason
  // });
  
  console.log(`[Event Handler] Exit process initiated for ${employeeId}`);
};

// =====================================================
// LEAVE EVENT HANDLERS
// =====================================================

/**
 * Handle leave.requested event
 * Actions:
 * - Notify manager for approval
 * - Check leave balance and policies
 * - Update team calendar
 * - Notify team members
 */
export const handleLeaveRequested: EventHandler = async (event) => {
  const { leaveRequestId, employeeId, leaveTypeId, startDate, endDate, totalDays } = event.payload;
  
  console.log(`[Event Handler] Leave Requested: ${employeeId} for ${totalDays} days (${startDate} to ${endDate})`);
  
  // TODO: Notify manager
  // const manager = await employeeService.getManager(employeeId);
  // await notificationService.notifyLeaveRequest({
  //   managerId: manager.id,
  //   employeeId,
  //   leaveRequestId,
  //   startDate,
  //   endDate,
  //   totalDays
  // });
  
  // TODO: Update team calendar
  // await calendarService.addLeaveToCalendar({
  //   employeeId,
  //   startDate,
  //   endDate,
  //   status: 'pending'
  // });
  
  console.log(`[Event Handler] Leave request notifications sent for ${leaveRequestId}`);
};

/**
 * Handle leave.approved event
 * Actions:
 * - Notify employee
 * - Deduct from leave balance
 * - Update calendar to confirmed
 * - Notify team
 */
export const handleLeaveApproved: EventHandler = async (event) => {
  const { leaveRequestId, employeeId, approverId } = event.payload;
  
  console.log(`[Event Handler] Leave Approved: ${leaveRequestId} by ${approverId}`);
  
  // TODO: Notify employee
  // await notificationService.notifyLeaveApproval({
  //   employeeId,
  //   leaveRequestId,
  //   approverId
  // });
  
  // TODO: Deduct leave balance
  // await leaveService.deductLeaveBalance(leaveRequestId);
  
  // TODO: Update calendar status
  // await calendarService.updateLeaveStatus(leaveRequestId, 'approved');
  
  // TODO: Notify team members
  // await notificationService.notifyTeamOfLeave({
  //   employeeId,
  //   leaveRequestId,
  //   status: 'approved'
  // });
  
  console.log(`[Event Handler] Leave approval processed for ${leaveRequestId}`);
};

/**
 * Handle leave.rejected event
 * Actions:
 * - Notify employee with reason
 * - Remove from calendar
 * - Log for audit
 */
export const handleLeaveRejected: EventHandler = async (event) => {
  const { leaveRequestId, employeeId, rejectedBy, reason } = event.payload;
  
  console.log(`[Event Handler] Leave Rejected: ${leaveRequestId} by ${rejectedBy}`);
  
  // TODO: Notify employee
  // await notificationService.notifyLeaveRejection({
  //   employeeId,
  //   leaveRequestId,
  //   rejectedBy,
  //   reason
  // });
  
  // TODO: Remove from calendar
  // await calendarService.removeLeave(leaveRequestId);
  
  console.log(`[Event Handler] Leave rejection processed for ${leaveRequestId}`);
};

// =====================================================
// PAYROLL EVENT HANDLERS
// =====================================================

/**
 * Handle payroll.run_created event
 * Actions:
 * - Initialize payroll calculations
 * - Fetch attendance data
 * - Calculate components
 */
export const handlePayrollRunCreated: EventHandler = async (event) => {
  const { payrollRunId, periodYear, periodMonth } = event.payload;
  
  console.log(`[Event Handler] Payroll Run Created: ${payrollRunId} for ${periodMonth}/${periodYear}`);
  
  // TODO: Fetch attendance data for the period
  // await payrollService.fetchAttendanceData(payrollRunId, periodYear, periodMonth);
  
  // TODO: Calculate basic components
  // await payrollService.calculateBasicComponents(payrollRunId);
  
  console.log(`[Event Handler] Payroll run initialization started for ${payrollRunId}`);
};

/**
 * Handle payroll.run_processed event
 * Actions:
 * - Generate payslips
 * - Notify finance team
 * - Prepare bank file
 */
export const handlePayrollRunProcessed: EventHandler = async (event) => {
  const { payrollRunId, totalEmployees, totalGross, totalNet } = event.payload;
  
  console.log(`[Event Handler] Payroll Run Processed: ${payrollRunId} (${totalEmployees} employees, Net: ${totalNet})`);
  
  // TODO: Generate payslips
  // await payrollService.generatePayslips(payrollRunId);
  
  // TODO: Notify finance team
  // await notificationService.notifyFinance({
  //   payrollRunId,
  //   totalEmployees,
  //   totalGross,
  //   totalNet
  // });
  
  console.log(`[Event Handler] Payroll processing completed for ${payrollRunId}`);
};

/**
 * Handle payroll.run_approved event
 * Actions:
 * - Lock payroll run
 * - Generate bank file
 * - Send payslips to employees
 */
export const handlePayrollRunApproved: EventHandler = async (event) => {
  const { payrollRunId, approvedBy } = event.payload;
  
  console.log(`[Event Handler] Payroll Run Approved: ${payrollRunId} by ${approvedBy}`);
  
  // TODO: Lock payroll run
  // await payrollService.lockPayrollRun(payrollRunId);
  
  // TODO: Generate bank file
  // await payrollService.generateBankFile(payrollRunId);
  
  // TODO: Send payslips to all employees
  // await payrollService.sendPayslips(payrollRunId);
  
  console.log(`[Event Handler] Payroll approval completed for ${payrollRunId}`);
};

// =====================================================
// ATTENDANCE EVENT HANDLERS
// =====================================================

/**
 * Handle attendance.checked_in event
 * Actions:
 * - Validate check-in time
 * - Detect late arrival
 * - Notify if outside geofence
 */
export const handleAttendanceCheckedIn: EventHandler = async (event) => {
  const { attendanceId, employeeId, checkInTime, location } = event.payload;
  
  console.log(`[Event Handler] Attendance Check-In: ${employeeId} at ${checkInTime}`);
  
  // TODO: Check if late
  // const shift = await shiftService.getEmployeeShift(employeeId);
  // if (isLateArrival(checkInTime, shift.startTime)) {
  //   await notificationService.notifyLateArrival({
  //     employeeId,
  //     checkInTime,
  //     expectedTime: shift.startTime
  //   });
  // }
  
  // TODO: Validate location if geofencing enabled
  // if (location && !isWithinGeofence(location, shift.location)) {
  //   await notificationService.notifyOutsideGeofence({
  //     employeeId,
  //     location
  //   });
  // }
  
  console.log(`[Event Handler] Check-in processed for ${employeeId}`);
};

/**
 * Handle attendance.checked_out event
 * Actions:
 * - Calculate working hours
 * - Detect early departure
 * - Calculate overtime if applicable
 */
export const handleAttendanceCheckedOut: EventHandler = async (event) => {
  const { attendanceId, employeeId, checkOutTime, workingHours } = event.payload;
  
  console.log(`[Event Handler] Attendance Check-Out: ${employeeId} at ${checkOutTime} (${workingHours} hours)`);
  
  // TODO: Calculate overtime
  // const shift = await shiftService.getEmployeeShift(employeeId);
  // if (workingHours > shift.standardHours) {
  //   const overtimeHours = workingHours - shift.standardHours;
  //   await attendanceService.recordOvertime({
  //     employeeId,
  //     attendanceId,
  //     overtimeHours
  //   });
  // }
  
  // TODO: Check for early departure
  // if (isEarlyDeparture(checkOutTime, shift.endTime)) {
  //   await notificationService.notifyEarlyDeparture({
  //     employeeId,
  //     checkOutTime,
  //     expectedTime: shift.endTime
  //   });
  // }
  
  console.log(`[Event Handler] Check-out processed for ${employeeId}`);
};

// =====================================================
// HANDLER REGISTRY
// =====================================================

/**
 * Get all event handlers mapped to their event names
 * Use this to register all handlers with the EventDispatcher
 */
export const getAllHandlers = (): Array<{ eventName: string; handler: EventHandler }> => {
  return [
    // Employee handlers
    { eventName: 'employee.created', handler: handleEmployeeCreated },
    { eventName: 'employee.updated', handler: handleEmployeeUpdated },
    { eventName: 'employee.terminated', handler: handleEmployeeTerminated },
    
    // Leave handlers
    { eventName: 'leave.requested', handler: handleLeaveRequested },
    { eventName: 'leave.approved', handler: handleLeaveApproved },
    { eventName: 'leave.rejected', handler: handleLeaveRejected },
    
    // Payroll handlers
    { eventName: 'payroll.run_created', handler: handlePayrollRunCreated },
    { eventName: 'payroll.run_processed', handler: handlePayrollRunProcessed },
    { eventName: 'payroll.run_approved', handler: handlePayrollRunApproved },
    
    // Attendance handlers
    { eventName: 'attendance.checked_in', handler: handleAttendanceCheckedIn },
    { eventName: 'attendance.checked_out', handler: handleAttendanceCheckedOut },
  ];
};
