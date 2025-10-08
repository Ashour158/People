# Event Handling System Guide

## Overview

The Event Handling System implements an event-driven architecture that enables reactive behavior throughout the HR Management System. When domain events occur (e.g., employee created, leave approved), the system automatically triggers appropriate business logic through registered event handlers.

## Architecture

The system uses the **Outbox Pattern** for reliable event processing:

1. **Event Publisher** - Publishes events to the `events_outbox` table in the same transaction as the business operation
2. **Event Dispatcher** - Polls the outbox table for pending events and dispatches them to handlers
3. **Event Handlers** - Execute business logic in response to events (send emails, notifications, etc.)
4. **Retry Logic** - Automatically retries failed events with exponential backoff

```
┌─────────────────┐
│  Service Layer  │
│ (e.g., Employee │
│    Service)     │
└────────┬────────┘
         │ publishes event
         ▼
┌─────────────────┐
│ Event Publisher │
│   (Outbox)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ events_outbox   │◄───┐
│     Table       │    │ polls
└────────┬────────┘    │
         │             │
         │       ┌─────┴────────┐
         │       │   Event      │
         │       │  Dispatcher  │
         │       └─────┬────────┘
         │             │
         │             │ dispatches
         ▼             ▼
┌─────────────────────────────┐
│     Event Handlers          │
│ - Send emails               │
│ - Create notifications      │
│ - Update dependent systems  │
│ - Calculate balances        │
└─────────────────────────────┘
```

## Quick Start

### Basic Setup

```typescript
import { initializeEventSystem } from './events/setup';
import { EventOutboxRepository } from './repositories/implementations';
import { pool } from './config/database';

// Initialize the event system (registers all handlers and starts polling)
const dispatcher = initializeEventSystem(
  new EventOutboxRepository(pool)
);

// The dispatcher is now running and processing events automatically!
```

### Graceful Shutdown

```typescript
import { shutdownEventSystem } from './events/setup';

// During application shutdown
process.on('SIGTERM', () => {
  shutdownEventSystem(dispatcher);
  process.exit(0);
});
```

## Available Event Handlers

The system includes pre-built handlers for all domain events:

### Employee Events

| Event | Handler | Actions |
|-------|---------|---------|
| `employee.created` | `handleEmployeeCreated` | Send welcome email, create default permissions, notify HR |
| `employee.updated` | `handleEmployeeUpdated` | Audit changes, notify on critical field updates |
| `employee.terminated` | `handleEmployeeTerminated` | Deactivate access, calculate final settlement, initiate exit process |

### Leave Events

| Event | Handler | Actions |
|-------|---------|---------|
| `leave.requested` | `handleLeaveRequested` | Notify manager, update team calendar |
| `leave.approved` | `handleLeaveApproved` | Notify employee, deduct leave balance, update calendar |
| `leave.rejected` | `handleLeaveRejected` | Notify employee with reason, remove from calendar |

### Payroll Events

| Event | Handler | Actions |
|-------|---------|---------|
| `payroll.run_created` | `handlePayrollRunCreated` | Fetch attendance data, initialize calculations |
| `payroll.run_processed` | `handlePayrollRunProcessed` | Generate payslips, notify finance team |
| `payroll.run_approved` | `handlePayrollRunApproved` | Lock payroll, generate bank file, send payslips |

### Attendance Events

| Event | Handler | Actions |
|-------|---------|---------|
| `attendance.checked_in` | `handleAttendanceCheckedIn` | Validate time, detect late arrival, check geofence |
| `attendance.checked_out` | `handleAttendanceCheckedOut` | Calculate hours, detect early departure, record overtime |

## Custom Event Handlers

### Creating a Custom Handler

```typescript
import { EventHandler } from './events/EventDispatcher';

// Define your custom handler
const handleCustomEvent: EventHandler = async (event) => {
  const { payload } = event;
  
  // Your business logic here
  console.log('Processing custom event:', payload);
  
  // Can throw errors - they will be caught and retried
  if (someCondition) {
    throw new Error('Handler failed - will retry');
  }
};

// Register the handler
dispatcher.registerHandler('custom.event', handleCustomEvent);
```

### Manual Setup with Custom Handlers

```typescript
import { EventDispatcher } from './events/EventDispatcher';
import { getAllHandlers } from './events/handlers';

// Create dispatcher without auto-start
const dispatcher = new EventDispatcher(eventOutboxRepo);

// Register built-in handlers
const builtInHandlers = getAllHandlers();
dispatcher.registerHandlers(builtInHandlers);

// Register custom handlers
dispatcher.registerHandler('custom.event1', customHandler1);
dispatcher.registerHandler('custom.event2', customHandler2);

// Manually start when ready
dispatcher.start();
```

## Publishing Events

Events are automatically published by services. Example:

```typescript
// In EmployeeService.createEmployee()
await this.eventPublisher.publish({
  eventType: 'employee',
  eventName: 'employee.created',
  organizationId: data.organization_id,
  aggregateType: 'employee',
  aggregateId: savedEmployee.id,
  payload: {
    employeeId: savedEmployee.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    hireDate: data.hire_date,
  },
  metadata: { createdBy },
});
```

## Error Handling & Retry Logic

### Automatic Retries

The system automatically retries failed events with exponential backoff:

- **Max Retries**: 5 attempts
- **Backoff**: 2^retry_count minutes
  - 1st retry: after 1 minute
  - 2nd retry: after 2 minutes
  - 3rd retry: after 4 minutes
  - 4th retry: after 8 minutes
  - 5th retry: after 16 minutes

### Dead Letter Queue

Events that exceed 5 retries remain in the outbox table with:
- `retry_count >= 5`
- `processed_at IS NULL`
- `last_error` field contains error message

Query failed events:

```sql
SELECT * FROM events_outbox
WHERE processed_at IS NULL
AND retry_count >= 5
ORDER BY created_at DESC;
```

### Manual Retry

To manually retry a failed event, reset its retry count:

```sql
UPDATE events_outbox
SET retry_count = 0,
    last_error = NULL,
    next_retry_at = NULL
WHERE event_id = 'evt-xxx';
```

## Monitoring

### Check Dispatcher Status

```typescript
// Check if running
console.log('Dispatcher running:', dispatcher.isRunning);

// Check registered handlers
console.log('Handler count:', dispatcher.getHandlerCount());
console.log('Registered events:', dispatcher.getRegisteredEvents());
```

### Database Queries

**Pending Events:**
```sql
SELECT COUNT(*) as pending_count
FROM events_outbox
WHERE processed_at IS NULL
AND retry_count < 5;
```

**Failed Events:**
```sql
SELECT COUNT(*) as failed_count
FROM events_outbox
WHERE processed_at IS NULL
AND retry_count >= 5;
```

**Processing Stats:**
```sql
SELECT 
  event_name,
  COUNT(*) as total,
  COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) as processed,
  COUNT(CASE WHEN retry_count >= 5 THEN 1 END) as failed
FROM events_outbox
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY event_name;
```

## Configuration

### Polling Interval

The default polling interval is 5 seconds. To change it:

```typescript
// Modify EventDispatcher.ts
private pollInterval = 10000; // 10 seconds
```

### Batch Size

The default batch size is 10 events per poll. To change it:

```typescript
// In EventDispatcher.poll()
const events = await this.eventOutboxRepository.findPendingEvents(20);
```

## Testing

### Running Tests

```bash
# Run event system tests
npm test -- src/events/__tests__

# Run all tests
npm test
```

### Writing Tests

```typescript
import { EventDispatcher } from './EventDispatcher';
import { MockEventOutboxRepository } from './__tests__/mocks';

describe('Custom Handler', () => {
  it('should process custom event', async () => {
    const repository = new MockEventOutboxRepository();
    const dispatcher = new EventDispatcher(repository);
    
    const handler = jest.fn().mockResolvedValue(undefined);
    dispatcher.registerHandler('custom.event', handler);
    
    await repository.create({
      event_name: 'custom.event',
      payload: { data: 'test' },
    });
    
    dispatcher.start();
    await new Promise(resolve => setTimeout(resolve, 100));
    dispatcher.stop();
    
    expect(handler).toHaveBeenCalled();
  });
});
```

## Best Practices

### 1. Idempotent Handlers

Make handlers idempotent to handle duplicate event processing:

```typescript
const handleEmployeeCreated: EventHandler = async (event) => {
  const { employeeId } = event.payload;
  
  // Check if already processed
  const existing = await checkIfWelcomeEmailSent(employeeId);
  if (existing) {
    console.log('Welcome email already sent, skipping');
    return;
  }
  
  // Send email
  await sendWelcomeEmail(employeeId);
};
```

### 2. Fast Handlers

Keep handlers fast to avoid blocking the event loop:

```typescript
// ❌ Bad - slow synchronous operation
const badHandler: EventHandler = async (event) => {
  await longRunningOperation(); // Blocks other events
};

// ✅ Good - queue for background processing
const goodHandler: EventHandler = async (event) => {
  await queueJob('long-operation', event.payload);
};
```

### 3. Proper Error Messages

Throw descriptive errors for better debugging:

```typescript
const handler: EventHandler = async (event) => {
  try {
    await processEvent(event);
  } catch (error) {
    throw new Error(`Failed to process employee.created for ${event.payload.employeeId}: ${error.message}`);
  }
};
```

### 4. Logging

Add comprehensive logging for monitoring:

```typescript
const handler: EventHandler = async (event) => {
  console.log(`[Handler] Processing ${event.event_name} (${event.event_id})`);
  
  try {
    await doWork(event);
    console.log(`[Handler] Success: ${event.event_id}`);
  } catch (error) {
    console.error(`[Handler] Failed: ${event.event_id}`, error);
    throw error;
  }
};
```

## Troubleshooting

### Events Not Processing

1. Check if dispatcher is running:
   ```typescript
   console.log('Running:', dispatcher.isRunning);
   ```

2. Check for errors in logs:
   ```bash
   grep "Error polling events" logs/app.log
   ```

3. Query pending events:
   ```sql
   SELECT * FROM events_outbox WHERE processed_at IS NULL LIMIT 10;
   ```

### High Retry Counts

1. Identify problematic events:
   ```sql
   SELECT event_name, AVG(retry_count) as avg_retries
   FROM events_outbox
   GROUP BY event_name
   ORDER BY avg_retries DESC;
   ```

2. Check handler implementation for the event
3. Review error messages in `last_error` field

### Performance Issues

1. **Too many events**: Increase polling interval or batch size
2. **Slow handlers**: Move heavy operations to background jobs
3. **Database locks**: Ensure handlers are fast and don't hold transactions

## Migration from Stub

If upgrading from the stub implementation:

1. **No code changes needed** - The new implementation is backward compatible
2. **Register handlers**: Add `initializeEventSystem()` to your startup
3. **Test thoroughly**: Verify handlers work with your services
4. **Monitor**: Watch event processing metrics for first few days

## Future Enhancements

Potential improvements for production:

1. **Message Queue**: Integrate RabbitMQ or Kafka for scalability
2. **Dead Letter Queue**: Separate table for permanently failed events
3. **Event Replay**: API to replay historical events
4. **Metrics Dashboard**: Real-time event processing statistics
5. **Handler Priorities**: Process critical events first
6. **Circuit Breaker**: Stop processing if error rate is too high

## Support

For issues or questions:

1. Check the [FOUNDATION_README.md](../FOUNDATION_README.md)
2. Review test files for usage examples
3. Open a GitHub issue with:
   - Event name and payload
   - Error message from `last_error` field
   - Handler implementation
   - Database query results

---

**Last Updated**: December 2024
**Version**: 1.0.0
