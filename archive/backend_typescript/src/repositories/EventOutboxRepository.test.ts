// =====================================================
// EventOutboxRepository Tests
// Comprehensive tests for Event Outbox repository methods
// =====================================================

import { Pool } from 'pg';
import { EventOutboxRepository } from './implementations';

// Mock pg Pool
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('EventOutboxRepository', () => {
  let repository: EventOutboxRepository;
  let mockPool: any;

  beforeEach(() => {
    mockPool = new Pool() as any;
    repository = new EventOutboxRepository(mockPool);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an event in the outbox', async () => {
      const eventData = {
        organization_id: 'org-123',
        event_type: 'leave',
        event_name: 'leave.requested',
        aggregate_type: 'leave_request',
        aggregate_id: 'req-123',
        payload: {
          leaveRequestId: 'req-123',
          employeeId: 'emp-123',
          startDate: '2024-01-01',
        },
        metadata: {
          correlationId: 'corr-123',
          userId: 'user-123',
        },
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ event_id: 'event-123' }],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const result = await repository.create(eventData);

      expect(result).toBe('event-123');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO events_outbox'),
        expect.arrayContaining([
          'org-123',
          'leave',
          'leave.requested',
          'leave_request',
          'req-123',
          expect.stringContaining('leaveRequestId'),
          expect.stringContaining('correlationId'),
        ])
      );
    });

    it('should handle events without metadata', async () => {
      const eventData = {
        organization_id: 'org-123',
        event_type: 'employee',
        event_name: 'employee.created',
        aggregate_type: 'employee',
        aggregate_id: 'emp-123',
        payload: { employeeId: 'emp-123' },
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ event_id: 'event-456' }],
        command: 'INSERT',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const result = await repository.create(eventData);

      expect(result).toBe('event-456');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO events_outbox'),
        expect.arrayContaining([
          'org-123',
          'employee',
          'employee.created',
          'employee',
          'emp-123',
          expect.any(String),
          '{}',
        ])
      );
    });
  });

  describe('findPendingEvents', () => {
    it('should return pending events', async () => {
      const mockRows = [
        {
          event_id: 'event-1',
          organization_id: 'org-123',
          event_type: 'leave',
          event_name: 'leave.requested',
          aggregate_type: 'leave_request',
          aggregate_id: 'req-123',
          payload: JSON.stringify({ leaveRequestId: 'req-123' }),
          metadata: JSON.stringify({ userId: 'user-123' }),
          retry_count: 0,
        },
        {
          event_id: 'event-2',
          organization_id: 'org-123',
          event_type: 'employee',
          event_name: 'employee.updated',
          aggregate_type: 'employee',
          aggregate_id: 'emp-123',
          payload: JSON.stringify({ employeeId: 'emp-123' }),
          metadata: JSON.stringify({}),
          retry_count: 1,
        },
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockRows,
        command: '',
        oid: 0,
        rowCount: 2,
        fields: [],
      });

      const result = await repository.findPendingEvents();

      expect(result).toHaveLength(2);
      expect(result[0].event_id).toBe('event-1');
      expect(result[0].payload).toEqual({ leaveRequestId: 'req-123' });
      expect(result[0].retry_count).toBe(0);
      expect(result[1].event_id).toBe('event-2');
      expect(result[1].retry_count).toBe(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'pending'"),
        [100]
      );
    });

    it('should handle already parsed JSON payload', async () => {
      const mockRows = [
        {
          event_id: 'event-1',
          organization_id: 'org-123',
          event_type: 'leave',
          event_name: 'leave.requested',
          aggregate_type: 'leave_request',
          aggregate_id: 'req-123',
          payload: { leaveRequestId: 'req-123' }, // Already parsed
          metadata: { userId: 'user-123' }, // Already parsed
          retry_count: 0,
        },
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockRows,
        command: '',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      const result = await repository.findPendingEvents();

      expect(result).toHaveLength(1);
      expect(result[0].payload).toEqual({ leaveRequestId: 'req-123' });
      expect(result[0].metadata).toEqual({ userId: 'user-123' });
    });

    it('should respect limit parameter', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await repository.findPendingEvents(50);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [50]
      );
    });

    it('should exclude events with retry count >= 5', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      await repository.findPendingEvents();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('retry_count < 5'),
        [100]
      );
    });

    it('should return empty array when no pending events', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: '',
        oid: 0,
        rowCount: 0,
        fields: [],
      });

      const result = await repository.findPendingEvents();

      expect(result).toEqual([]);
    });
  });

  describe('markProcessed', () => {
    it('should mark an event as processed', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await repository.markProcessed('event-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'processed'"),
        ['event-123']
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('processed_at = NOW()'),
        ['event-123']
      );
    });
  });

  describe('markFailed', () => {
    it('should mark an event as failed and increment retry count', async () => {
      const errorMessage = 'Network timeout error';

      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        oid: 0,
        rowCount: 1,
        fields: [],
      });

      await repository.markFailed('event-123', errorMessage);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'failed'"),
        ['event-123', errorMessage]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('retry_count = retry_count + 1'),
        ['event-123', errorMessage]
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('error_message = $2'),
        ['event-123', errorMessage]
      );
    });
  });
});
