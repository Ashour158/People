// =====================================================
// Event Dispatcher Tests
// Unit tests for event dispatcher functionality
// =====================================================

import { EventDispatcher } from '../EventDispatcher';
import { IEventOutboxRepository } from '../../repositories/interfaces';

// Mock repository
class MockEventOutboxRepository implements IEventOutboxRepository {
  private events: any[] = [];
  private processedEvents: Set<string> = new Set();
  private failedEvents: Map<string, string> = new Map();

  async create(event: any): Promise<string> {
    const eventId = `evt-${Date.now()}-${Math.random()}`;
    this.events.push({ ...event, event_id: eventId, retry_count: 0 });
    return eventId;
  }

  async findPendingEvents(limit: number = 100): Promise<any[]> {
    return this.events
      .filter(e => !this.processedEvents.has(e.event_id) && (e.retry_count || 0) < 5)
      .slice(0, limit);
  }

  async markProcessed(eventId: string): Promise<void> {
    this.processedEvents.add(eventId);
  }

  async markFailed(eventId: string, errorMessage: string): Promise<void> {
    this.failedEvents.set(eventId, errorMessage);
    const event = this.events.find(e => e.event_id === eventId);
    if (event) {
      event.retry_count = (event.retry_count || 0) + 1;
    }
  }

  // Helper methods for testing
  getProcessedCount(): number {
    return this.processedEvents.size;
  }

  getFailedCount(): number {
    return this.failedEvents.size;
  }

  reset(): void {
    this.events = [];
    this.processedEvents.clear();
    this.failedEvents.clear();
  }
}

describe('EventDispatcher', () => {
  let repository: MockEventOutboxRepository;
  let dispatcher: EventDispatcher;

  beforeEach(() => {
    repository = new MockEventOutboxRepository();
    dispatcher = new EventDispatcher(repository);
  });

  afterEach(() => {
    dispatcher.stop();
    repository.reset();
  });

  describe('Handler Registration', () => {
    it('should register a single handler', () => {
      const handler = jest.fn();
      dispatcher.registerHandler('test.event', handler);

      expect(dispatcher.getHandlerCount()).toBe(1);
      expect(dispatcher.getRegisteredEvents()).toContain('test.event');
    });

    it('should register multiple handlers for the same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      dispatcher.registerHandler('test.event', handler1);
      dispatcher.registerHandler('test.event', handler2);

      expect(dispatcher.getHandlerCount()).toBe(2);
    });

    it('should register multiple events', () => {
      dispatcher.registerHandler('event1', jest.fn());
      dispatcher.registerHandler('event2', jest.fn());
      dispatcher.registerHandler('event3', jest.fn());

      expect(dispatcher.getRegisteredEvents()).toHaveLength(3);
      expect(dispatcher.getRegisteredEvents()).toEqual(
        expect.arrayContaining(['event1', 'event2', 'event3'])
      );
    });

    it('should register handlers in batch', () => {
      const handlers = [
        { eventName: 'event1', handler: jest.fn() },
        { eventName: 'event2', handler: jest.fn() },
        { eventName: 'event3', handler: jest.fn() },
      ];

      dispatcher.registerHandlers(handlers);

      expect(dispatcher.getHandlerCount()).toBe(3);
    });
  });

  describe('Event Dispatching', () => {
    it('should dispatch event to registered handler', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      dispatcher.registerHandler('test.event', handler);

      // Create a test event
      await repository.create({
        organization_id: 'org-1',
        event_type: 'test',
        event_name: 'test.event',
        aggregate_type: 'test',
        aggregate_id: 'test-1',
        payload: { data: 'test' },
      });

      // Start and wait for processing
      dispatcher.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      dispatcher.stop();

      expect(handler).toHaveBeenCalled();
      expect(repository.getProcessedCount()).toBe(1);
    });

    it('should dispatch event to multiple handlers', async () => {
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);

      dispatcher.registerHandler('test.event', handler1);
      dispatcher.registerHandler('test.event', handler2);

      await repository.create({
        organization_id: 'org-1',
        event_type: 'test',
        event_name: 'test.event',
        aggregate_type: 'test',
        aggregate_id: 'test-1',
        payload: { data: 'test' },
      });

      dispatcher.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      dispatcher.stop();

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should not fail if no handlers registered for event', async () => {
      await repository.create({
        organization_id: 'org-1',
        event_type: 'test',
        event_name: 'unhandled.event',
        aggregate_type: 'test',
        aggregate_id: 'test-1',
        payload: { data: 'test' },
      });

      dispatcher.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      dispatcher.stop();

      // Should still mark as processed even with no handlers
      expect(repository.getProcessedCount()).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should mark event as failed if handler throws error', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Handler failed'));
      dispatcher.registerHandler('test.event', handler);

      await repository.create({
        organization_id: 'org-1',
        event_type: 'test',
        event_name: 'test.event',
        aggregate_type: 'test',
        aggregate_id: 'test-1',
        payload: { data: 'test' },
      });

      dispatcher.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      dispatcher.stop();

      expect(handler).toHaveBeenCalled();
      expect(repository.getFailedCount()).toBe(1);
      expect(repository.getProcessedCount()).toBe(0);
    });

    it('should continue processing other events if one fails', async () => {
      const failingHandler = jest.fn().mockRejectedValue(new Error('Failed'));
      const successHandler = jest.fn().mockResolvedValue(undefined);

      dispatcher.registerHandler('failing.event', failingHandler);
      dispatcher.registerHandler('success.event', successHandler);

      // Create two events
      await repository.create({
        organization_id: 'org-1',
        event_type: 'test',
        event_name: 'failing.event',
        aggregate_type: 'test',
        aggregate_id: 'test-1',
        payload: {},
      });

      await repository.create({
        organization_id: 'org-1',
        event_type: 'test',
        event_name: 'success.event',
        aggregate_type: 'test',
        aggregate_id: 'test-2',
        payload: {},
      });

      dispatcher.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      dispatcher.stop();

      expect(failingHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
      expect(repository.getProcessedCount()).toBe(1);
      expect(repository.getFailedCount()).toBe(1);
    });
  });

  describe('Start and Stop', () => {
    it('should start dispatcher successfully', () => {
      expect(() => dispatcher.start()).not.toThrow();
    });

    it('should not start if already running', () => {
      dispatcher.start();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      dispatcher.start();
      
      expect(consoleSpy).toHaveBeenCalledWith('Event dispatcher is already running');
      consoleSpy.mockRestore();
    });

    it('should stop dispatcher successfully', () => {
      dispatcher.start();
      expect(() => dispatcher.stop()).not.toThrow();
    });

    it('should stop polling when stopped', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      dispatcher.registerHandler('test.event', handler);

      await repository.create({
        organization_id: 'org-1',
        event_type: 'test',
        event_name: 'test.event',
        aggregate_type: 'test',
        aggregate_id: 'test-1',
        payload: {},
      });

      dispatcher.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const callCountAfterStart = handler.mock.calls.length;
      
      dispatcher.stop();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const callCountAfterStop = handler.mock.calls.length;

      // Should not have processed more events after stop
      expect(callCountAfterStop).toBe(callCountAfterStart);
    });
  });

  describe('Handler Information', () => {
    it('should return correct handler count', () => {
      dispatcher.registerHandler('event1', jest.fn());
      dispatcher.registerHandler('event2', jest.fn());
      dispatcher.registerHandler('event2', jest.fn()); // Second handler for event2

      expect(dispatcher.getHandlerCount()).toBe(3);
    });

    it('should return registered event names', () => {
      dispatcher.registerHandler('employee.created', jest.fn());
      dispatcher.registerHandler('leave.requested', jest.fn());

      const events = dispatcher.getRegisteredEvents();
      expect(events).toContain('employee.created');
      expect(events).toContain('leave.requested');
      expect(events).toHaveLength(2);
    });

    it('should return empty array when no handlers registered', () => {
      expect(dispatcher.getRegisteredEvents()).toEqual([]);
      expect(dispatcher.getHandlerCount()).toBe(0);
    });
  });
});
