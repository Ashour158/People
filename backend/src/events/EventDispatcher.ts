// =====================================================
// Event Dispatcher (Stub)
// Polls outbox and dispatches events to handlers
// =====================================================

import { IEventOutboxRepository } from '../repositories/interfaces';

export class EventDispatcher {
  private isRunning = false;
  private pollInterval = 5000; // 5 seconds

  // Note: eventOutboxRepository is currently unused but will be needed for full implementation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(private eventOutboxRepository: IEventOutboxRepository) {}

  start(): void {
    if (this.isRunning) {
      console.warn('Event dispatcher is already running');
      return;
    }

    this.isRunning = true;
    // eslint-disable-next-line no-console
    console.log('Event dispatcher started (stub mode)');
    
    // NOTE: Actual implementation would poll the outbox and dispatch events
    // For now, this is a placeholder that demonstrates the pattern
    // 
    // Example implementation:
    // this.poll();
  }

  stop(): void {
    this.isRunning = false;
    console.log('Event dispatcher stopped');
  }

  private async poll(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // const events = await this.eventOutboxRepository.findPendingEvents(10);
      // 
      // for (const event of events) {
      //   try {
      //     await this.dispatchEvent(event);
      //     await this.eventOutboxRepository.markProcessed(event.event_id);
      //   } catch (error) {
      //     await this.eventOutboxRepository.markFailed(
      //       event.event_id, 
      //       error instanceof Error ? error.message : 'Unknown error'
      //     );
      //   }
      // }
    } catch (error) {
      console.error('Error polling events:', error);
    } finally {
      setTimeout(() => this.poll(), this.pollInterval);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async dispatchEvent(event: unknown): Promise<void> {
    // Stub: Would dispatch to appropriate handlers based on event type
    // In the full implementation, this will process events from the outbox
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
