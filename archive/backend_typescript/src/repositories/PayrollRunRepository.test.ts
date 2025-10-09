// =====================================================
// PayrollRunRepository Tests
// Comprehensive tests for Payroll repository methods
// =====================================================

import { Pool } from 'pg';
import { PayrollRunRepository } from './implementations';
import { PayrollRun } from '../domain/PayrollRun';
import { PayrollRunStatus, PayrollRunType } from '../domain/enums';

// Mock pg Pool
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('PayrollRunRepository', () => {
  let repository: PayrollRunRepository;
  let mockPool: any;

  beforeEach(() => {
    mockPool = new Pool() as any;
    repository = new PayrollRunRepository(mockPool);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return payroll run when found', async () => {
      const mockRow = {
        payroll_run_id: 'run-123',
        organization_id: 'org-123',
        company_id: 'company-123',
        period_year: 2024,
        period_month: 1,
        pay_period_start: new Date('2024-01-01'),
        pay_period_end: new Date('2024-01-31'),
        payment_date: new Date('2024-02-05'),
        run_name: 'January 2024 Payroll',
        run_type: PayrollRunType.REGULAR,
        status: PayrollRunStatus.DRAFT,
        total_employees: 50,
        total_gross: 150000,
        total_deductions: 30000,
        total_net: 120000,
        processed_by: null,
        processed_at: null,
        approved_by: null,
        approved_at: null,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockRow],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const result = await repository.findById('run-123', 'org-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('run-123');
      expect(result?.periodYear).toBe(2024);
      expect(result?.periodMonth).toBe(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT *'),
        ['run-123', 'org-123']
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

      const result = await repository.findById('run-123', 'org-123');

      expect(result).toBeNull();
    });
  });

  describe('findByPeriod', () => {
    it('should return payroll run for specific period', async () => {
      const mockRow = {
        payroll_run_id: 'run-123',
        organization_id: 'org-123',
        company_id: null,
        period_year: 2024,
        period_month: 1,
        pay_period_start: new Date('2024-01-01'),
        pay_period_end: new Date('2024-01-31'),
        payment_date: null,
        run_name: 'January 2024 Payroll',
        run_type: PayrollRunType.REGULAR,
        status: PayrollRunStatus.DRAFT,
        total_employees: 0,
        total_gross: 0,
        total_deductions: 0,
        total_net: 0,
        processed_by: null,
        processed_at: null,
        approved_by: null,
        approved_at: null,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockRow],
        command: '',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const result = await repository.findByPeriod(2024, 1, 'org-123');

      expect(result).not.toBeNull();
      expect(result?.periodYear).toBe(2024);
      expect(result?.periodMonth).toBe(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('period_year = $1'),
        [2024, 1, 'org-123']
      );
    });

    it('should filter by run type when provided', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await repository.findByPeriod(2024, 1, 'org-123', PayrollRunType.BONUS);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('run_type = $4'),
        [2024, 1, 'org-123', PayrollRunType.BONUS]
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

      const result = await repository.findByPeriod(2024, 1, 'org-123');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated payroll runs', async () => {
      const mockRows = [
        {
          payroll_run_id: 'run-1',
          organization_id: 'org-123',
          company_id: null,
          period_year: 2024,
          period_month: 1,
          pay_period_start: new Date('2024-01-01'),
          pay_period_end: new Date('2024-01-31'),
          payment_date: null,
          run_name: 'January 2024 Payroll',
          run_type: PayrollRunType.REGULAR,
          status: PayrollRunStatus.APPROVED,
          total_employees: 50,
          total_gross: 150000,
          total_deductions: 30000,
          total_net: 120000,
          processed_by: 'user-123',
          processed_at: new Date(),
          approved_by: 'user-456',
          approved_at: new Date(),
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: '15' }],
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

      const result = await repository.findAll('org-123', { page: 1, limit: 10 });

      expect(result.total).toBe(15);
      expect(result.runs).toHaveLength(1);
      expect(result.runs[0].id).toBe('run-1');
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

      await repository.findAll('org-123', { status: PayrollRunStatus.APPROVED });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $2'),
        expect.arrayContaining(['org-123', PayrollRunStatus.APPROVED])
      );
    });

    it('should filter by year and month', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: '1' }],
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

      await repository.findAll('org-123', { year: 2024, month: 1 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('period_year = $2'),
        expect.arrayContaining(['org-123', 2024, 1])
      );
    });
  });

  describe('create', () => {
    it('should create a payroll run', async () => {
      const payrollRun = new PayrollRun({
        organization_id: 'org-123',
        period_year: 2024,
        period_month: 1,
        pay_period_start: new Date('2024-01-01'),
        pay_period_end: new Date('2024-01-31'),
      });

      mockPool.query.mockResolvedValueOnce({
        rows: [{}],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const result = await repository.create(payrollRun);

      expect(result).toBe(payrollRun);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payroll_runs'),
        expect.arrayContaining([
          payrollRun.id,
          'org-123',
          2024,
          1,
        ])
      );
    });
  });

  describe('update', () => {
    it('should update payroll run status', async () => {
      const mockRow = {
        payroll_run_id: 'run-123',
        organization_id: 'org-123',
        company_id: null,
        period_year: 2024,
        period_month: 1,
        pay_period_start: new Date('2024-01-01'),
        pay_period_end: new Date('2024-01-31'),
        payment_date: null,
        run_name: 'January 2024 Payroll',
        run_type: PayrollRunType.REGULAR,
        status: PayrollRunStatus.CALCULATED,
        total_employees: 0,
        total_gross: 0,
        total_deductions: 0,
        total_net: 0,
        processed_by: null,
        processed_at: null,
        approved_by: null,
        approved_at: null,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockRow],
        command: 'UPDATE',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const result = await repository.update(
        'run-123',
        'org-123',
        { status: PayrollRunStatus.CALCULATED } as any
      );

      expect(result.status).toBe(PayrollRunStatus.CALCULATED);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll_runs'),
        expect.arrayContaining([PayrollRunStatus.CALCULATED, 'run-123', 'org-123'])
      );
    });

    it('should update totals', async () => {
      const mockRow = {
        payroll_run_id: 'run-123',
        organization_id: 'org-123',
        company_id: null,
        period_year: 2024,
        period_month: 1,
        pay_period_start: new Date('2024-01-01'),
        pay_period_end: new Date('2024-01-31'),
        payment_date: null,
        run_name: 'January 2024 Payroll',
        run_type: PayrollRunType.REGULAR,
        status: PayrollRunStatus.CALCULATED,
        total_employees: 50,
        total_gross: 150000,
        total_deductions: 30000,
        total_net: 120000,
        processed_by: null,
        processed_at: null,
        approved_by: null,
        approved_at: null,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockRow],
        command: 'UPDATE',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await repository.update('run-123', 'org-123', {
        total_employees: 50,
        total_gross: 150000,
        total_deductions: 30000,
        total_net: 120000,
      } as any);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('total_employees = $1'),
        expect.arrayContaining([50, 150000, 30000, 120000, 'run-123', 'org-123'])
      );
    });

    it('should throw error when no fields to update', async () => {
      await expect(
        repository.update('run-123', 'org-123', {})
      ).rejects.toThrow('No fields to update');
    });

    it('should throw error when run not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await expect(
        repository.update('run-123', 'org-123', { status: PayrollRunStatus.APPROVED } as any)
      ).rejects.toThrow('Payroll run not found');
    });
  });

  describe('delete', () => {
    it('should soft delete a payroll run', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const result = await repository.delete('run-123', 'org-123');

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payroll_runs'),
        ['run-123', 'org-123']
      );
    });

    it('should return false when run not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      const result = await repository.delete('run-123', 'org-123');

      expect(result).toBe(false);
    });
  });
});
