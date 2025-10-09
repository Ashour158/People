// =====================================================
// AuditLogRepository Tests
// Comprehensive tests for Audit repository methods
// =====================================================

import { Pool } from 'pg';
import { AuditLogRepository } from './implementations';

// Mock pg Pool
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('AuditLogRepository', () => {
  let repository: AuditLogRepository;
  let mockPool: any;

  beforeEach(() => {
    mockPool = new Pool() as any;
    repository = new AuditLogRepository(mockPool);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an audit log entry', async () => {
      const auditData = {
        organization_id: 'org-123',
        user_id: 'user-123',
        username: 'john.doe',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        entity_type: 'employee',
        entity_id: 'emp-123',
        action: 'update',
        old_values: { status: 'active' },
        new_values: { status: 'inactive' },
        changes: { status: { from: 'active', to: 'inactive' } },
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ audit_id: 'audit-123' }],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const result = await repository.create(auditData);

      expect(result).toBe('audit-123');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_log'),
        expect.arrayContaining([
          'org-123',
          'user-123',
          'john.doe',
          '192.168.1.1',
          'Mozilla/5.0',
          'employee',
          'emp-123',
          'update',
        ])
      );
    });

    it('should handle null values', async () => {
      const auditData = {
        organization_id: 'org-123',
        entity_type: 'employee',
        entity_id: 'emp-123',
        action: 'view',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ audit_id: 'audit-456' }],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const result = await repository.create(auditData);

      expect(result).toBe('audit-456');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_log'),
        expect.arrayContaining([
          'org-123',
          null,
          null,
          null,
          null,
          'employee',
          'emp-123',
          'view',
          null,
          null,
          null,
        ])
      );
    });
  });

  describe('findByEntity', () => {
    it('should return audit logs for an entity', async () => {
      const mockRows = [
        {
          audit_id: 'audit-1',
          user_id: 'user-123',
          username: 'john.doe',
          action: 'create',
          old_values: null,
          new_values: { status: 'active' },
          changes: null,
          created_at: new Date('2024-01-01'),
        },
        {
          audit_id: 'audit-2',
          user_id: 'user-456',
          username: 'jane.smith',
          action: 'update',
          old_values: { status: 'active' },
          new_values: { status: 'inactive' },
          changes: { status: { from: 'active', to: 'inactive' } },
          created_at: new Date('2024-01-02'),
        },
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockRows,
        command: '',
        oid: 0,
        rowCount: 2,
        fields: [],
      });

      const result = await repository.findByEntity('employee', 'emp-123', 'org-123');

      expect(result).toHaveLength(2);
      expect(result[0].audit_id).toBe('audit-1');
      expect(result[0].action).toBe('create');
      expect(result[1].audit_id).toBe('audit-2');
      expect(result[1].action).toBe('update');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM audit_log'),
        ['employee', 'emp-123', 'org-123', 50]
      );
    });

    it('should respect limit parameter', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await repository.findByEntity('employee', 'emp-123', 'org-123', 25);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $4'),
        ['employee', 'emp-123', 'org-123', 25]
      );
    });

    it('should return empty array when no logs found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      const result = await repository.findByEntity('employee', 'emp-999', 'org-123');

      expect(result).toEqual([]);
    });
  });

  describe('findByUser', () => {
    it('should return audit logs for a user', async () => {
      const mockRows = [
        {
          audit_id: 'audit-1',
          user_id: 'user-123',
          username: 'john.doe',
          entity_type: 'employee',
          entity_id: 'emp-123',
          action: 'update',
          old_values: null,
          new_values: null,
          changes: null,
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          created_at: new Date('2024-01-01'),
        },
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockRows,
        command: '',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const result = await repository.findByUser('user-123', 'org-123');

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe('user-123');
      expect(result[0].entity_type).toBe('employee');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $1'),
        ['user-123', 'org-123', 100]
      );
    });

    it('should filter by entity type', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await repository.findByUser('user-123', 'org-123', {
        entityType: 'leave_request',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('entity_type = $3'),
        ['user-123', 'org-123', 'leave_request', 100]
      );
    });

    it('should filter by action', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await repository.findByUser('user-123', 'org-123', {
        action: 'delete',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('action = $3'),
        ['user-123', 'org-123', 'delete', 100]
      );
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await repository.findByUser('user-123', 'org-123', {
        startDate,
        endDate,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('created_at >='),
        ['user-123', 'org-123', startDate, endDate, 100]
      );
    });

    it('should apply all filters together', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await repository.findByUser('user-123', 'org-123', {
        entityType: 'employee',
        action: 'update',
        startDate,
        endDate,
        limit: 50,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('entity_type = $3'),
        ['user-123', 'org-123', 'employee', 'update', startDate, endDate, 50]
      );
    });

    it('should respect custom limit', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await repository.findByUser('user-123', 'org-123', { limit: 25 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $3'),
        ['user-123', 'org-123', 25]
      );
    });

    it('should return empty array when no logs found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      const result = await repository.findByUser('user-999', 'org-123');

      expect(result).toEqual([]);
    });
  });
});
