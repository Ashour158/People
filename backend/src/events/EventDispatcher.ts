// =====================================================
// Event Dispatcher
// Polls outbox and dispatches events to message queue
// =====================================================

import { IEventOutboxRepository } from '../repositories/interfaces';
import { MessageQueueAdapter } from '../messaging/MessageQueueAdapter';
import { EXCHANGES, ROUTING_KEYS } from '../messaging/RabbitMQAdapter';
import { DomainEvent } from './events';
import { EventHandlerRegistry, createDefaultEventHandlerRegistry } from './EventHandlers';

export class EventDispatcher {
  private isRunning = false;
  private pollInterval = 5000; // 5 seconds
  private pollingTimer: NodeJS.Timeout | null = null;
  private handlerRegistry: EventHandlerRegistry;

  constructor(
    private eventOutboxRepository: IEventOutboxRepository,
    private messageQueue?: MessageQueueAdapter,
    handlerRegistry?: EventHandlerRegistry
  ) {
    this.handlerRegistry = handlerRegistry || createDefaultEventHandlerRegistry();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Event dispatcher is already running');
      return;
    }

    this.isRunning = true;

    if (this.messageQueue) {
      console.log('[EventDispatcher] Starting with message queue enabled');
      await this.messageQueue.connect();
      await this.initializeMessageQueue();
    } else {
      console.log('[EventDispatcher] Starting without message queue (stub mode)');
    }

    this.poll();
  }

  stop(): void {
    this.isRunning = false;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    console.log('[EventDispatcher] Stopped');
  }

  private async initializeMessageQueue(): Promise<void> {
    if (!this.messageQueue) return;

    try {
      // Setup main events exchange
      await this.messageQueue.assertExchange(EXCHANGES.HR_EVENTS, 'topic');
      
      // Setup dead letter exchange
      await this.messageQueue.assertExchange(EXCHANGES.HR_DLX, 'topic');

      console.log('[EventDispatcher] Message queue initialized');
    } catch (error) {
      console.error('[EventDispatcher] Failed to initialize message queue:', error);
      throw error;
    }
  }

  private async poll(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      const events = await this.eventOutboxRepository.findPendingEvents(10);

      for (const event of events) {
        try {
          await this.dispatchEvent(event);
          await this.eventOutboxRepository.markProcessed(event.event_id);
          console.log(`[EventDispatcher] Dispatched event: ${event.event_name} (${event.event_id})`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await this.eventOutboxRepository.markFailed(event.event_id, errorMessage);
          console.error(`[EventDispatcher] Failed to dispatch event ${event.event_id}:`, error);
        }
      }
    } catch (error) {
      console.error('[EventDispatcher] Error polling events:', error);
    } finally {
      this.pollingTimer = setTimeout(() => this.poll(), this.pollInterval);
    }
  }

  private async dispatchEvent(event: any): Promise<void> {
    // Convert database event to domain event format
    const domainEvent: DomainEvent = {
      eventId: event.event_id,
      eventType: event.event_type,
      eventName: event.event_name,
      organizationId: event.organization_id,
      aggregateType: event.aggregate_type,
      aggregateId: event.aggregate_id,
      timestamp: event.created_at,
      payload: event.payload,
      metadata: event.metadata,
    };

    if (this.messageQueue) {
      // Publish to message queue (microservices architecture)
      const routingKey = this.getRoutingKey(event.event_name);
      await this.messageQueue.publish(EXCHANGES.HR_EVENTS, routingKey, domainEvent);
    } else {
      // In-memory dispatch (monolithic architecture)
      await this.dispatchToLocalHandlers(domainEvent);
    }
  }

  private async dispatchToLocalHandlers(event: DomainEvent): Promise<void> {
    // Dispatch to registered event handlers
    console.log(`[EventDispatcher] Local dispatch: ${event.eventName} (${event.eventId})`);
    
    try {
      await this.handlerRegistry.dispatch(event);
      console.log(`[EventDispatcher] Successfully dispatched ${event.eventName} to handlers`);
    } catch (error) {
      console.error(`[EventDispatcher] Failed to dispatch ${event.eventName} to handlers:`, error);
      throw error;
    }
  }

  private getRoutingKey(eventName: string): string {
    // Map event names to routing keys
    const routingKeyMap: Record<string, string> = {
      'employee.created': ROUTING_KEYS.EMPLOYEE_CREATED,
      'employee.updated': ROUTING_KEYS.EMPLOYEE_UPDATED,
      'employee.terminated': ROUTING_KEYS.EMPLOYEE_TERMINATED,
      'leave.requested': ROUTING_KEYS.LEAVE_REQUESTED,
      'leave.approved': ROUTING_KEYS.LEAVE_APPROVED,
      'leave.rejected': ROUTING_KEYS.LEAVE_REJECTED,
      'attendance.checked_in': ROUTING_KEYS.ATTENDANCE_CHECKED_IN,
      'attendance.checked_out': ROUTING_KEYS.ATTENDANCE_CHECKED_OUT,
      'payroll.run_created': ROUTING_KEYS.PAYROLL_RUN_CREATED,
      'payroll.run_processed': ROUTING_KEYS.PAYROLL_RUN_PROCESSED,
      'payroll.run_approved': ROUTING_KEYS.PAYROLL_RUN_APPROVED,
      'timesheet.submitted': ROUTING_KEYS.TIMESHEET_SUBMITTED || 'timesheet.submitted',
      'timesheet.approved': ROUTING_KEYS.TIMESHEET_APPROVED || 'timesheet.approved',
      'timesheet.rejected': ROUTING_KEYS.TIMESHEET_REJECTED || 'timesheet.rejected',
    };

    return routingKeyMap[eventName] || eventName;
  }
}

// =====================================================
// README NOTE
// =====================================================

/*
 * Event Dispatcher Implementation Notes:
 * 
 * This is a stub implementation. To fully implement event dispatching:
 * 
 * 1. Uncomment the poll loop logic
 * 2. Implement event handlers for each event type
 * 3. Add retry logic with exponential backoff
 * 4. Consider using a message queue (RabbitMQ, Kafka, etc.) for production
 * 5. Add monitoring and alerting for failed events
 * 6. Implement dead letter queue for events that exceed max retries
 * 
 * Example event handler registration:
 * 
 * dispatcher.registerHandler('employee.created', async (event) => {
 *   // Send welcome email
 *   // Create default permissions
 *   // etc.
 * });
 */
