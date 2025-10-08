// =====================================================
// LeaveRepository Tests
// Comprehensive tests for Leave repository methods
// =====================================================

import { Pool } from 'pg';
import { LeaveRepository } from './implementations';
import { LeaveRequest } from '../domain/LeaveRequest';
import { LeaveType } from '../domain/LeaveType';
import { LeaveStatus, LeaveAccrualFrequency } from '../domain/enums';

// Mock pg Pool
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('LeaveRepository', () => {
  let repository: LeaveRepository;
  let mockPool: any;

  beforeEach(() => {
    mockPool = new Pool() as any;
    repository = new LeaveRepository(mockPool);
    jest.clearAllMocks();
  });

  describe('getLeaveBalance', () => {
    it('should return leave balance when found', async () => {
      const mockBalance = {
        allocated_days: 20,
        used_days: 5,
        pending_days: 2,
        available_days: 13,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockBalance],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const result = await repository.getLeaveBalance(
        'emp-123',
        'leave-type-123',
        2024,
        'org-123'
      );

      expect(result).toEqual(mockBalance);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT allocated_days'),
        ['emp-123', 'leave-type-123', 2024, 'org-123']
      );
    });

    it('should return null when balance not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      const result = await repository.getLeaveBalance(
        'emp-123',
        'leave-type-123',
        2024,
        'org-123'
      );

      expect(result).toBeNull();
    });
  });

  describe('updateLeaveBalance', () => {
    it('should update all balance fields', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await repository.updateLeaveBalance(
        'emp-123',
        'leave-type-123',
        2024,
        'org-123',
        {
          allocated_days: 25,
          used_days: 3,
          pending_days: 1,
          available_days: 21,
        }
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_balances'),
        expect.arrayContaining([25, 3, 1, 21, 'emp-123', 'leave-type-123', 2024, 'org-123'])
      );
    });

    it('should update only specified fields', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await repository.updateLeaveBalance(
        'emp-123',
        'leave-type-123',
        2024,
        'org-123',
        { used_days: 7 }
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('used_days = $1'),
        expect.arrayContaining([7, 'emp-123', 'leave-type-123', 2024, 'org-123'])
      );
    });

    it('should not update when no fields provided', async () => {
      await repository.updateLeaveBalance(
        'emp-123',
        'leave-type-123',
        2024,
        'org-123',
        {}
      );

      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });

  describe('createLeaveRequest', () => {
    it('should create a leave request', async () => {
      const leaveRequest = new LeaveRequest({
        organization_id: 'org-123',
        employee_id: 'emp-123',
        leave_type_id: 'leave-type-123',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-05'),
        total_days: 5,
        reason: 'Family vacation',
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{}],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const result = await repository.createLeaveRequest(leaveRequest);

      expect(result).toBe(leaveRequest);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_requests'),
        expect.arrayContaining([
          leaveRequest.id,
          'org-123',
          'emp-123',
          'leave-type-123',
        ])
      );
    });
  });

  describe('findLeaveRequestById', () => {
    it('should return leave request when found', async () => {
      const mockRow = {
        leave_request_id: 'req-123',
        organization_id: 'org-123',
        employee_id: 'emp-123',
        leave_type_id: 'leave-type-123',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-05'),
        total_days: 5,
        reason: 'Vacation',
        emergency_contact: null,
        status: LeaveStatus.PENDING,
        current_approver_id: 'approver-123',
        approved_by: null,
        approved_at: null,
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockRow],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const result = await repository.findLeaveRequestById('req-123', 'org-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('req-123');
      expect(result?.employeeId).toBe('emp-123');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT *'),
        ['req-123', 'org-123']
      );
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      const result = await repository.findLeaveRequestById('req-123', 'org-123');

      expect(result).toBeNull();
    });
  });

  describe('findLeaveRequestsByEmployee', () => {
    it('should return paginated leave requests', async () => {
      const mockRows = [
        {
          leave_request_id: 'req-1',
          organization_id: 'org-123',
          employee_id: 'emp-123',
          leave_type_id: 'leave-type-123',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-05'),
          total_days: 5,
          reason: 'Vacation',
          emergency_contact: null,
          status: LeaveStatus.APPROVED,
          current_approver_id: null,
          approved_by: 'approver-123',
          approved_at: new Date(),
          rejected_by: null,
          rejected_at: null,
          rejection_reason: null,
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: '10' }],
          command: '',
          oid: 0,
          rowCount: 1,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: mockRows,
          command: '',
          oid: 0,
          rowCount: 1,
          fields: [],
        });

      const result = await repository.findLeaveRequestsByEmployee(
        'emp-123',
        'org-123',
        { page: 1, limit: 10 }
      );

      expect(result.total).toBe(10);
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0].id).toBe('req-1');
    });

    it('should filter by status', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: '5' }],
          command: '',
          oid: 0,
          rowCount: 1,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          command: '',
          oid: 0,
          rowCount: 0,
          fields: [],
        });

      await repository.findLeaveRequestsByEmployee(
        'emp-123',
        'org-123',
        { status: LeaveStatus.APPROVED }
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $3'),
        expect.arrayContaining(['emp-123', 'org-123', LeaveStatus.APPROVED])
      );
    });

    it('should filter by year', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: '3' }],
          command: '',
          oid: 0,
          rowCount: 1,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          command: '',
          oid: 0,
          rowCount: 0,
          fields: [],
        });

      await repository.findLeaveRequestsByEmployee(
        'emp-123',
        'org-123',
        { year: 2024 }
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('EXTRACT(YEAR FROM start_date)'),
        expect.arrayContaining(['emp-123', 'org-123', 2024])
      );
    });
  });

  describe('findPendingLeaveRequests', () => {
    it('should return pending requests for approver', async () => {
      const mockRows = [
        {
          leave_request_id: 'req-1',
          organization_id: 'org-123',
          employee_id: 'emp-123',
          leave_type_id: 'leave-type-123',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-05'),
          total_days: 5,
          reason: 'Vacation',
          emergency_contact: null,
          status: LeaveStatus.PENDING,
          current_approver_id: 'approver-123',
          approved_by: null,
          approved_at: null,
          rejected_by: null,
          rejected_at: null,
          rejection_reason: null,
        },
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockRows,
        command: '',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const result = await repository.findPendingLeaveRequests('approver-123', 'org-123');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(LeaveStatus.PENDING);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'pending'"),
        ['approver-123', 'org-123']
      );
    });
  });

  describe('updateLeaveRequest', () => {
    it('should update leave request status', async () => {
      const mockRow = {
        leave_request_id: 'req-123',
        organization_id: 'org-123',
        employee_id: 'emp-123',
        leave_type_id: 'leave-type-123',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-05'),
        total_days: 5,
        reason: 'Vacation',
        emergency_contact: null,
        status: LeaveStatus.APPROVED,
        current_approver_id: null,
        approved_by: 'approver-123',
        approved_at: new Date(),
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockRow],
        command: 'UPDATE',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const result = await repository.updateLeaveRequest(
        'req-123',
        'org-123',
        { status: LeaveStatus.APPROVED } as any
      );

      expect(result.status).toBe(LeaveStatus.APPROVED);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_requests'),
        expect.arrayContaining([LeaveStatus.APPROVED, 'req-123', 'org-123'])
      );
    });

    it('should throw error when no fields to update', async () => {
      await expect(
        repository.updateLeaveRequest('req-123', 'org-123', {})
      ).rejects.toThrow('No fields to update');
    });

    it('should throw error when request not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await expect(
        repository.updateLeaveRequest('req-123', 'org-123', { status: LeaveStatus.APPROVED } as any)
      ).rejects.toThrow('Leave request not found');
    });
  });

  describe('findLeaveTypeById', () => {
    it('should return leave type when found', async () => {
      const mockRow = {
        leave_type_id: 'type-123',
        organization_id: 'org-123',
        leave_type_name: 'Annual Leave',
        leave_type_code: 'AL',
        description: 'Annual paid leave',
        max_days_per_year: 20,
        carry_forward_allowed: true,
        max_carry_forward_days: 5,
        requires_approval: true,
        approval_levels: 1,
        is_accrual_based: false,
        accrual_rate: 0,
        accrual_frequency: LeaveAccrualFrequency.MONTHLY,
        applicable_for_gender: 'all',
        is_active: true,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockRow],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const result = await repository.findLeaveTypeById('type-123', 'org-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('type-123');
      expect(result?.name).toBe('Annual Leave');
    });

    it('should return null when not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      const result = await repository.findLeaveTypeById('type-123', 'org-123');

      expect(result).toBeNull();
    });
  });

  describe('findAllLeaveTypes', () => {
    it('should return all leave types for organization', async () => {
      const mockRows = [
        {
          leave_type_id: 'type-1',
          organization_id: 'org-123',
          leave_type_name: 'Annual Leave',
          leave_type_code: 'AL',
          description: null,
          max_days_per_year: 20,
          carry_forward_allowed: true,
          max_carry_forward_days: 5,
          requires_approval: true,
          approval_levels: 1,
          is_accrual_based: false,
          accrual_rate: 0,
          accrual_frequency: LeaveAccrualFrequency.MONTHLY,
          applicable_for_gender: 'all',
          is_active: true,
        },
        {
          leave_type_id: 'type-2',
          organization_id: 'org-123',
          leave_type_name: 'Sick Leave',
          leave_type_code: 'SL',
          description: null,
          max_days_per_year: 10,
          carry_forward_allowed: false,
          max_carry_forward_days: 0,
          requires_approval: true,
          approval_levels: 1,
          is_accrual_based: false,
          accrual_rate: 0,
          accrual_frequency: LeaveAccrualFrequency.MONTHLY,
          applicable_for_gender: 'all',
          is_active: true,
        },
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockRows,
        command: '',
        oid: 0,
        rowCount: 2,
        fields: [],
      });

      const result = await repository.findAllLeaveTypes('org-123');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Annual Leave');
      expect(result[1].name).toBe('Sick Leave');
    });
  });

  describe('createLeaveType', () => {
    it('should create a leave type', async () => {
      const leaveType = new LeaveType({
        organization_id: 'org-123',
        leave_type_name: 'Annual Leave',
        leave_type_code: 'AL',
        max_days_per_year: 20,
        requires_approval: true,
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{}],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const result = await repository.createLeaveType(leaveType);

      expect(result).toBe(leaveType);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO leave_types'),
        expect.arrayContaining([
          leaveType.id,
          'org-123',
          'Annual Leave',
          'AL',
        ])
      );
    });
  });
});
