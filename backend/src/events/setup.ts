// =====================================================
// Event System Setup
// Initialize the event dispatcher with all handlers
// =====================================================

import { EventDispatcher } from './EventDispatcher';
import { IEventOutboxRepository } from '../repositories/interfaces';
import { getAllHandlers } from './handlers';

/**
 * Initialize and configure the event dispatcher
 * Registers all event handlers and starts the polling loop
 * 
 * @param eventOutboxRepository - Repository for accessing event outbox
 * @param autoStart - Whether to automatically start the dispatcher (default: true)
 * @returns Configured EventDispatcher instance
 * 
 * @example
 * ```typescript
 * import { initializeEventSystem } from './events/setup';
 * import { EventOutboxRepository } from './repositories/implementations';
 * import { pool } from './config/database';
 * 
 * // Initialize the event system
 * const dispatcher = initializeEventSystem(
 *   new EventOutboxRepository(pool)
 * );
 * 
 * // Dispatcher is now running and processing events
 * ```
 */
export function initializeEventSystem(
  eventOutboxRepository: IEventOutboxRepository,
  autoStart: boolean = true
): EventDispatcher {
  // Create dispatcher instance
  const dispatcher = new EventDispatcher(eventOutboxRepository);
  
  // Register all event handlers
  const handlers = getAllHandlers();
  dispatcher.registerHandlers(handlers);
  
  console.log(`Event system initialized with ${handlers.length} handlers`);
  console.log(`Registered events: ${dispatcher.getRegisteredEvents().join(', ')}`);
  
  // Start the dispatcher if autoStart is true
  if (autoStart) {
    dispatcher.start();
  }
  
  return dispatcher;
}

/**
 * Gracefully shutdown the event dispatcher
 * Call this during application shutdown to ensure clean exit
 * 
 * @param dispatcher - The EventDispatcher instance to shutdown
 * 
 * @example
 * ```typescript
 * process.on('SIGTERM', () => {
 *   shutdownEventSystem(dispatcher);
 *   process.exit(0);
 * });
 * ```
 */
export function shutdownEventSystem(dispatcher: EventDispatcher): void {
  console.log('Shutting down event system...');
  dispatcher.stop();
  console.log('Event system shutdown complete');
}
