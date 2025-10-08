// =====================================================
// Event Handlers Tests
// Unit tests for event handlers
// =====================================================

import {
  handleEmployeeCreated,
  handleEmployeeUpdated,
  handleEmployeeTerminated,
  handleLeaveRequested,
  handleLeaveApproved,
  handleLeaveRejected,
  handlePayrollRunCreated,
  handlePayrollRunProcessed,
  handlePayrollRunApproved,
  handleAttendanceCheckedIn,
  handleAttendanceCheckedOut,
  getAllHandlers,
} from '../handlers';

describe('Event Handlers', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('Employee Event Handlers', () => {
    describe('handleEmployeeCreated', () => {
      it('should process employee created event', async () => {
        const event = {
          event_id: 'evt-1',
          event_name: 'employee.created',
          organization_id: 'org-1',
          payload: {
            employeeId: 'emp-1',
            email: 'john@example.com',
            firstName: 'John',
            lastName: 'Doe',
          },
        };

        await expect(handleEmployeeCreated(event)).resolves.not.toThrow();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Employee Created: John Doe')
        );
      });
    });

    describe('handleEmployeeUpdated', () => {
      it('should process employee updated event', async () => {
        const event = {
          event_id: 'evt-2',
          event_name: 'employee.updated',
          organization_id: 'org-1',
          payload: {
            employeeId: 'emp-1',
            changes: {
              email: 'newemail@example.com',
              department_id: 'dept-2',
            },
          },
        };

        await expect(handleEmployeeUpdated(event)).resolves.not.toThrow();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Employee Updated')
        );
      });

      it('should detect critical field changes', async () => {
        const event = {
          event_id: 'evt-3',
          event_name: 'employee.updated',
          organization_id: 'org-1',
          payload: {
            employeeId: 'emp-1',
            changes: {
              employment_status: 'inactive',
            },
          },
        };

        await expect(handleEmployeeUpdated(event)).resolves.not.toThrow();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Critical changes detected')
        );
      });
    });

    describe('handleEmployeeTerminated', () => {
      it('should process employee terminated event', async () => {
        const event = {
          event_id: 'evt-4',
          event_name: 'employee.terminated',
          organization_id: 'org-1',
          payload: {
            employeeId: 'emp-1',
            terminationDate: new Date('2024-12-31'),
            reason: 'Resignation',
          },
        };

        await expect(handleEmployeeTerminated(event)).resolves.not.toThrow();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Employee Terminated')
        );
      });
    });
  });

  describe('Leave Event Handlers', () => {
    describe('handleLeaveRequested', () => {
      it('should process leave requested event', async () => {
        const event = {
          event_id: 'evt-5',
          event_name: 'leave.requested',
          organization_id: 'org-1',
          payload: {
            leaveRequestId: 'leave-1',
            employeeId: 'emp-1',
            leaveTypeId: 'type-1',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2024-01-05'),
            totalDays: 5,
          },
        };

        await expect(handleLeaveRequested(event)).resolves.not.toThrow();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Leave Requested')
        );
      });
    });

    describe('handleLeaveApproved', () => {
      it('should process leave approved event', async () => {
        const event = {
          event_id: 'evt-6',
          event_name: 'leave.approved',
          organization_id: 'org-1',
          payload: {
            leaveRequestId: 'leave-1',
            employeeId: 'emp-1',
            approverId: 'mgr-1',
          },
        };

        await expect(handleLeaveApproved(event)).resolves.not.toThrow();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Leave Approved')
        );
      });
    });

    describe('handleLeaveRejected', () => {
      it('should process leave rejected event', async () => {
        const event = {
          event_id: 'evt-7',
          event_name: 'leave.rejected',
          organization_id: 'org-1',
          payload: {
            leaveRequestId: 'leave-1',
            employeeId: 'emp-1',
            rejectedBy: 'mgr-1',
            reason: 'Insufficient coverage',
          },
        };

        await expect(handleLeaveRejected(event)).resolves.not.toThrow();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Leave Rejected')
        );
      });
    });
  });

  describe('Payroll Event Handlers', () => {
    describe('handlePayrollRunCreated', () => {
      it('should process payroll run created event', async () => {
        const event = {
          event_id: 'evt-8',
          event_name: 'payroll.run_created',
          organization_id: 'org-1',
          payload: {
            payrollRunId: 'payroll-1',
            periodYear: 2024,
            periodMonth: 1,
          },
        };

        await expect(handlePayrollRunCreated(event)).resolves.not.toThrow();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Payroll Run Created')
        );
      });
    });

    describe('handlePayrollRunProcessed', () => {
      it('should process payroll run processed event', async () => {
        const event = {
          event_id: 'evt-9',
          event_name: 'payroll.run_processed',
          organization_id: 'org-1',
          payload: {
            payrollRunId: 'payroll-1',
            totalEmployees: 100,
            totalGross: 500000,
            totalNet: 450000,
          },
        };

        await expect(handlePayrollRunProcessed(event)).resolves.not.toThrow();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Payroll Run Processed')
        );
      });
    });

    describe('handlePayrollRunApproved', () => {
      it('should process payroll run approved event', async () => {
        const event = {
          event_id: 'evt-10',
          event_name: 'payroll.run_approved',
          organization_id: 'org-1',
          payload: {
            payrollRunId: 'payroll-1',
            approvedBy: 'admin-1',
          },
        };

        await expect(handlePayrollRunApproved(event)).resolves.not.toThrow();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Payroll Run Approved')
        );
      });
    });
  });

  describe('Attendance Event Handlers', () => {
    describe('handleAttendanceCheckedIn', () => {
      it('should process attendance checked in event', async () => {
        const event = {
          event_id: 'evt-11',
          event_name: 'attendance.checked_in',
          organization_id: 'org-1',
          payload: {
            attendanceId: 'att-1',
            employeeId: 'emp-1',
            checkInTime: new Date(),
            location: '25.2048,55.2708',
          },
        };

        await expect(handleAttendanceCheckedIn(event)).resolves.not.toThrow();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Attendance Check-In')
        );
      });
    });

    describe('handleAttendanceCheckedOut', () => {
      it('should process attendance checked out event', async () => {
        const event = {
          event_id: 'evt-12',
          event_name: 'attendance.checked_out',
          organization_id: 'org-1',
          payload: {
            attendanceId: 'att-1',
            employeeId: 'emp-1',
            checkOutTime: new Date(),
            workingHours: 8.5,
          },
        };

        await expect(handleAttendanceCheckedOut(event)).resolves.not.toThrow();
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Attendance Check-Out')
        );
      });
    });
  });

  describe('Handler Registry', () => {
    it('should return all handlers', () => {
      const handlers = getAllHandlers();

      expect(handlers).toHaveLength(11);
      expect(handlers.every(h => h.eventName && h.handler)).toBe(true);
    });

    it('should include all event types', () => {
      const handlers = getAllHandlers();
      const eventNames = handlers.map(h => h.eventName);

      // Employee events
      expect(eventNames).toContain('employee.created');
      expect(eventNames).toContain('employee.updated');
      expect(eventNames).toContain('employee.terminated');

      // Leave events
      expect(eventNames).toContain('leave.requested');
      expect(eventNames).toContain('leave.approved');
      expect(eventNames).toContain('leave.rejected');

      // Payroll events
      expect(eventNames).toContain('payroll.run_created');
      expect(eventNames).toContain('payroll.run_processed');
      expect(eventNames).toContain('payroll.run_approved');

      // Attendance events
      expect(eventNames).toContain('attendance.checked_in');
      expect(eventNames).toContain('attendance.checked_out');
    });
  });
});
