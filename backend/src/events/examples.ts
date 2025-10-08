// =====================================================
// Event System Usage Examples
// Demonstrates how to use the event handling system
// =====================================================

import { initializeEventSystem, shutdownEventSystem } from './setup';
import { EventDispatcher, EventHandler } from './EventDispatcher';
import { EventPublisher } from './EventPublisher';
import { EventOutboxRepository } from '../repositories/implementations';
import { pool } from '../config/database';

// =====================================================
// EXAMPLE 1: Quick Setup (Recommended)
// =====================================================

/**
 * The simplest way to get started with the event system.
 * This automatically registers all built-in handlers and starts polling.
 */
export function example1_QuickSetup() {
  // One line to initialize everything!
  const dispatcher = initializeEventSystem(
    new EventOutboxRepository(pool)
  );
  
  console.log('Event system initialized with', dispatcher.getHandlerCount(), 'handlers');
  console.log('Processing events for:', dispatcher.getRegisteredEvents().join(', '));
  
  // Later, during shutdown:
  // shutdownEventSystem(dispatcher);
  
  return dispatcher;
}

// =====================================================
// EXAMPLE 2: Custom Handler
// =====================================================

/**
 * Add custom business logic for specific events.
 * Use this when you need application-specific behavior.
 */
export function example2_CustomHandler() {
  const dispatcher = initializeEventSystem(
    new EventOutboxRepository(pool)
  );
  
  // Add a custom handler for employee creation
  const sendSlackNotification: EventHandler = async (event) => {
    const { firstName, lastName, email } = event.payload;
    
    console.log(`📢 Slack: New employee ${firstName} ${lastName} joined!`);
    
    // In production, you would call Slack API here:
    // await slackClient.postMessage({
    //   channel: '#new-hires',
    //   text: `Welcome ${firstName} ${lastName} (${email}) to the team! 🎉`
    // });
  };
  
  dispatcher.registerHandler('employee.created', sendSlackNotification);
  
  return dispatcher;
}

// =====================================================
// EXAMPLE 3: Multiple Handlers per Event
// =====================================================

/**
 * Register multiple handlers for the same event.
 * All handlers will be executed when the event occurs.
 */
export function example3_MultipleHandlers() {
  const dispatcher = initializeEventSystem(
    new EventOutboxRepository(pool),
    false // Don't auto-start yet
  );
  
  // Handler 1: Send email
  const emailHandler: EventHandler = async (event) => {
    const { email, firstName } = event.payload;
    console.log(`📧 Sending welcome email to ${email}`);
    // await emailService.sendWelcomeEmail(email, firstName);
  };
  
  // Handler 2: Create Slack account
  const slackHandler: EventHandler = async (event) => {
    const { email, firstName, lastName } = event.payload;
    console.log(`💬 Creating Slack account for ${email}`);
    // await slackService.createUser(email, firstName, lastName);
  };
  
  // Handler 3: Assign equipment
  const equipmentHandler: EventHandler = async (event) => {
    const { employeeId } = event.payload;
    console.log(`💻 Assigning equipment to employee ${employeeId}`);
    // await equipmentService.assignLaptop(employeeId);
  };
  
  // Register all handlers for the same event
  dispatcher.registerHandler('employee.created', emailHandler);
  dispatcher.registerHandler('employee.created', slackHandler);
  dispatcher.registerHandler('employee.created', equipmentHandler);
  
  // Now start processing
  dispatcher.start();
  
  return dispatcher;
}

// =====================================================
// EXAMPLE 4: Error Handling
// =====================================================

/**
 * Demonstrates proper error handling in event handlers.
 * Errors cause the event to be retried automatically.
 */
export function example4_ErrorHandling() {
  const dispatcher = initializeEventSystem(
    new EventOutboxRepository(pool),
    false
  );
  
  // Handler that might fail
  const unreliableHandler: EventHandler = async (event) => {
    const { employeeId } = event.payload;
    
    try {
      // Simulate external API call that might fail
      const result = await callExternalAPI(employeeId);
      
      if (!result.success) {
        // Throw error to trigger retry
        throw new Error(`External API failed: ${result.error}`);
      }
      
      console.log('✅ Successfully processed:', employeeId);
    } catch (error) {
      console.error('❌ Handler failed:', error);
      // Re-throw to mark event as failed (will be retried)
      throw error;
    }
  };
  
  dispatcher.registerHandler('employee.created', unreliableHandler);
  dispatcher.start();
  
  return dispatcher;
}

// Mock external API call
async function callExternalAPI(employeeId: string): Promise<{ success: boolean; error?: string }> {
  // Simulate API call
  return { success: Math.random() > 0.3 };
}

// =====================================================
// EXAMPLE 5: Conditional Logic
// =====================================================

/**
 * Execute different logic based on event payload.
 * Useful for complex business rules.
 */
export function example5_ConditionalLogic() {
  const dispatcher = initializeEventSystem(
    new EventOutboxRepository(pool),
    false
  );
  
  const smartHandler: EventHandler = async (event) => {
    const { changes } = event.payload;
    
    // Check what changed and react accordingly
    if (changes.employment_status === 'inactive') {
      console.log('🔒 Employee deactivated - revoking access');
      // await accessService.revokeAllAccess(event.payload.employeeId);
    }
    
    if (changes.department_id) {
      console.log('🔄 Employee changed department - updating permissions');
      // await permissionService.updateDepartmentPermissions(event.payload.employeeId);
    }
    
    if (changes.email) {
      console.log('📧 Email changed - sending verification');
      // await emailService.sendVerificationEmail(changes.email);
    }
  };
  
  dispatcher.registerHandler('employee.updated', smartHandler);
  dispatcher.start();
  
  return dispatcher;
}

// =====================================================
// EXAMPLE 6: Publishing Events from Services
// =====================================================

/**
 * Shows how services publish events that trigger handlers.
 * This is already done in EmployeeService, LeaveService, etc.
 */
export async function example6_PublishingEvents() {
  const eventPublisher = new EventPublisher(
    new EventOutboxRepository(pool)
  );
  
  // Example: Publishing an employee created event
  await eventPublisher.publish({
    eventType: 'employee',
    eventName: 'employee.created',
    organizationId: 'org-123',
    aggregateType: 'employee',
    aggregateId: 'emp-456',
    payload: {
      employeeId: 'emp-456',
      employeeCode: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      hireDate: new Date(),
    },
    metadata: {
      createdBy: 'user-789',
      source: 'api',
    },
  });
  
  console.log('Event published to outbox - will be processed by dispatcher');
}

// =====================================================
// EXAMPLE 7: Integration with Express App
// =====================================================

/**
 * Complete example of integrating with an Express application.
 */
export function example7_ExpressIntegration() {
  // Note: In a real application, import express at the top of the file
  // import express from 'express';
  
  // Pseudo-code for demonstration:
  /*
  const express = require('express');
  const app = express();
  let dispatcher: EventDispatcher;
  
  // Initialize event system on server start
  app.listen(3000, () => {
    console.log('Server starting on port 3000');
    
    dispatcher = initializeEventSystem(
      new EventOutboxRepository(pool)
    );
    
    console.log('Event system started');
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    
    shutdownEventSystem(dispatcher);
    
    app.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    shutdownEventSystem(dispatcher);
    process.exit(0);
  });
  
  return app;
  */
  
  console.log('See code comments for Express integration example');
}

// =====================================================
// EXAMPLE 8: Monitoring and Debugging
// =====================================================

/**
 * Check dispatcher status and get metrics.
 */
export function example8_Monitoring(dispatcher: EventDispatcher) {
  // Get basic stats
  console.log('Dispatcher Status:', {
    handlerCount: dispatcher.getHandlerCount(),
    registeredEvents: dispatcher.getRegisteredEvents(),
  });
  
  // Query database for processing stats (run periodically)
  async function getProcessingStats() {
    const result = await pool.query(`
      SELECT 
        event_name,
        COUNT(*) as total,
        COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) as processed,
        COUNT(CASE WHEN retry_count >= 5 THEN 1 END) as failed,
        AVG(retry_count) as avg_retries
      FROM events_outbox
      WHERE created_at >= NOW() - INTERVAL '1 hour'
      GROUP BY event_name
      ORDER BY total DESC
    `);
    
    console.log('Processing Stats (last hour):', result.rows);
  }
  
  // Check for failed events
  async function checkFailedEvents() {
    const result = await pool.query(`
      SELECT event_id, event_name, retry_count, last_error, created_at
      FROM events_outbox
      WHERE processed_at IS NULL AND retry_count >= 5
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (result.rows.length > 0) {
      console.warn('⚠️ Failed events detected:', result.rows.length);
      result.rows.forEach(event => {
        console.warn(`  - ${event.event_name} (${event.event_id}): ${event.last_error}`);
      });
    }
  }
  
  // Run monitoring every 5 minutes
  setInterval(() => {
    getProcessingStats();
    checkFailedEvents();
  }, 5 * 60 * 1000);
}

// =====================================================
// EXAMPLE 9: Testing Event Handlers
// =====================================================

/**
 * Example of testing custom event handlers.
 */
export async function example9_Testing() {
  // Create a test event
  const testEvent = {
    event_id: 'test-1',
    event_name: 'employee.created',
    organization_id: 'org-test',
    payload: {
      employeeId: 'emp-test',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
    },
  };
  
  // Create a custom handler
  let handlerCalled = false;
  const testHandler: EventHandler = async (event) => {
    handlerCalled = true;
    console.log('Handler called with:', event.payload);
  };
  
  // Test the handler directly
  await testHandler(testEvent);
  
  console.assert(handlerCalled, 'Handler should have been called');
  console.log('✅ Test passed');
}

// =====================================================
// RUNNING THE EXAMPLES
// =====================================================

/**
 * Uncomment the example you want to run
 */
if (require.main === module) {
  console.log('Event System Examples\n');
  
  // Run an example (uncomment one):
  // example1_QuickSetup();
  // example2_CustomHandler();
  // example3_MultipleHandlers();
  // example4_ErrorHandling();
  // example5_ConditionalLogic();
  // example6_PublishingEvents();
  // example7_ExpressIntegration();
  // example9_Testing();
}
