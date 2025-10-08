// =====================================================
// Event Dispatcher
// Polls outbox and dispatches events to handlers
// =====================================================

import { IEventOutboxRepository } from '../repositories/interfaces';

export type EventHandler = (event: any) => Promise<void>;

export interface EventHandlerRegistration {
  eventName: string;
  handler: EventHandler;
  maxRetries?: number;
}

export class EventDispatcher {
  private isRunning = false;
  private pollInterval = 5000; // 5 seconds
  private handlers: Map<string, EventHandler[]> = new Map();
  private pollTimeout?: NodeJS.Timeout;

  constructor(private eventOutboxRepository: IEventOutboxRepository) {}

  /**
   * Register an event handler for a specific event type
   * @param eventName - The event name to handle (e.g., 'employee.created')
   * @param handler - Async function to handle the event
   */
  registerHandler(eventName: string, handler: EventHandler): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler);
    console.log(`Event handler registered for: ${eventName}`);
  }

  /**
   * Register multiple handlers at once
   */
  registerHandlers(registrations: EventHandlerRegistration[]): void {
    for (const { eventName, handler } of registrations) {
      this.registerHandler(eventName, handler);
    }
  }

  /**
   * Start the event dispatcher polling loop
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Event dispatcher is already running');
      return;
    }

    this.isRunning = true;
    console.log('Event dispatcher started');
    
    // Start polling for events
    this.poll();
  }

  /**
   * Stop the event dispatcher
   */
  stop(): void {
    this.isRunning = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = undefined;
    }
    console.log('Event dispatcher stopped');
  }

  /**
   * Poll the outbox for pending events and dispatch them
   */
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
          console.log(`Event processed: ${event.event_name} (${event.event_id})`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error processing event ${event.event_id}:`, errorMessage);
          await this.eventOutboxRepository.markFailed(event.event_id, errorMessage);
        }
      }
    } catch (error) {
      console.error('Error polling events:', error);
    } finally {
      // Schedule next poll
      this.pollTimeout = setTimeout(() => this.poll(), this.pollInterval);
    }
  }

  /**
   * Dispatch an event to all registered handlers
   */
  private async dispatchEvent(event: any): Promise<void> {
    const handlers = this.handlers.get(event.event_name) || [];
    
    if (handlers.length === 0) {
      console.warn(`No handlers registered for event: ${event.event_name}`);
      return;
    }

    // Execute all handlers for this event type
    const handlerPromises = handlers.map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        // Log handler errors but don't fail the entire dispatch
        console.error(`Handler failed for ${event.event_name}:`, error);
        throw error; // Re-throw to trigger retry
      }
    });

    // Wait for all handlers to complete
    await Promise.all(handlerPromises);
  }

  /**
   * Get count of registered handlers
   */
  getHandlerCount(): number {
    let count = 0;
    this.handlers.forEach(handlers => {
      count += handlers.length;
    });
    return count;
  }

  /**
   * Get list of event names with registered handlers
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.handlers.keys());
  }
}

