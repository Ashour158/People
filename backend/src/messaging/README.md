# Message Queue Implementation

This directory contains the message queue implementation for enabling microservices architecture in the HR Management System.

## Overview

The messaging infrastructure provides:
- **Event-driven communication** between services
- **Asynchronous processing** of domain events
- **Reliable message delivery** with acknowledgments
- **Dead letter queues** for failed messages
- **Retry logic** with exponential backoff

## Architecture

```
┌─────────────────┐
│  Service A      │
│  (Employee)     │
└────────┬────────┘
         │
         │ Publish Event
         │
         ▼
┌─────────────────────────────┐
│   Message Queue             │
│   (RabbitMQ/Kafka)          │
│                             │
│   Exchange: hr.events       │
│   Topic: employee.created   │
└────────┬────────────────────┘
         │
         │ Subscribe
         │
         ▼
┌─────────────────┐
│  Service B      │
│  (Notification) │
└─────────────────┘
```

## Components

### 1. MessageQueueAdapter
Abstract interface for message queue operations. Provides a consistent API regardless of the underlying message broker (RabbitMQ, Kafka, etc.).

**Key Methods**:
- `connect()` - Establish connection to message broker
- `disconnect()` - Close connection
- `publish()` - Send event to exchange
- `subscribe()` - Listen for events on queue
- `assertExchange()` - Create/verify exchange
- `assertQueue()` - Create/verify queue
- `bindQueue()` - Bind queue to exchange with routing key

### 2. RabbitMQAdapter
Concrete implementation for RabbitMQ message broker.

**Features**:
- Automatic reconnection with exponential backoff
- Message persistence (survives broker restart)
- Manual acknowledgments for reliability
- Automatic retry on failure (requeue once)
- Dead letter queue for failed messages
- Prefetch limit to prevent overwhelming consumers

### 3. EventDispatcher (Enhanced)
Polls the event outbox table and publishes events to the message queue.

**Flow**:
1. Poll outbox table for pending events (every 5 seconds)
2. For each pending event:
   - Convert to domain event format
   - Publish to message queue
   - Mark as processed in outbox
3. On failure:
   - Mark as failed in outbox
   - Continue with next event

## Usage Examples

### Publishing Events

```typescript
import { RabbitMQAdapter, EXCHANGES, ROUTING_KEYS } from './messaging/RabbitMQAdapter';
import { EventPublisher } from './events/EventPublisher';
import { EventDispatcher } from './events/EventDispatcher';

// Setup
const messageQueue = new RabbitMQAdapter(process.env.RABBITMQ_URL);
await messageQueue.connect();

const eventPublisher = new EventPublisher(eventOutboxRepo);
const eventDispatcher = new EventDispatcher(eventOutboxRepo, messageQueue);
await eventDispatcher.start();

// Publish event (through outbox pattern)
await eventPublisher.publish({
  eventType: 'employee',
  eventName: 'employee.created',
  organizationId: 'org-123',
  aggregateType: 'employee',
  aggregateId: employeeId,
  payload: {
    employeeId,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
});

// Event automatically dispatched to message queue by EventDispatcher
```

### Subscribing to Events

```typescript
import { RabbitMQAdapter, EXCHANGES, QUEUES, ROUTING_KEYS } from './messaging/RabbitMQAdapter';

// Setup
const messageQueue = new RabbitMQAdapter();
await messageQueue.connect();

// Create and bind queue
await messageQueue.assertQueue(QUEUES.NOTIFICATION_ALL, { durable: true });
await messageQueue.bindQueue(
  QUEUES.NOTIFICATION_ALL,
  EXCHANGES.HR_EVENTS,
  ROUTING_KEYS.ALL_EVENTS // Subscribe to all events
);

// Subscribe with handler
await messageQueue.subscribe(
  QUEUES.NOTIFICATION_ALL,
  ROUTING_KEYS.ALL_EVENTS,
  async (event) => {
    console.log('Received event:', event.eventName);
    
    // Process event based on type
    switch (event.eventName) {
      case 'employee.created':
        await sendWelcomeEmail(event.payload);
        break;
      case 'leave.approved':
        await notifyEmployee(event.payload);
        break;
      // ... other cases
    }
  }
);
```

### Service-Specific Subscriptions

```typescript
// Notification Service - Subscribe to all events
await messageQueue.bindQueue(
  'notification.all',
  EXCHANGES.HR_EVENTS,
  ROUTING_KEYS.ALL_EVENTS
);

// Payroll Service - Subscribe only to relevant events
await messageQueue.bindQueue(
  'payroll.employee.created',
  EXCHANGES.HR_EVENTS,
  ROUTING_KEYS.EMPLOYEE_CREATED
);

await messageQueue.bindQueue(
  'payroll.attendance.checked_out',
  EXCHANGES.HR_EVENTS,
  ROUTING_KEYS.ATTENDANCE_CHECKED_OUT
);

await messageQueue.bindQueue(
  'payroll.leave.approved',
  EXCHANGES.HR_EVENTS,
  ROUTING_KEYS.LEAVE_APPROVED
);
```

## Exchanges and Routing Keys

### Exchanges

| Exchange | Type | Purpose |
|----------|------|---------|
| `hr.events` | topic | Main exchange for all domain events |
| `hr.commands` | topic | Command exchange (future use) |
| `hr.dlx` | topic | Dead letter exchange for failed messages |

### Routing Keys

| Pattern | Example | Subscribes To |
|---------|---------|---------------|
| `employee.*` | `employee.created` | All employee events |
| `leave.*` | `leave.approved` | All leave events |
| `attendance.*` | `attendance.checked_in` | All attendance events |
| `payroll.*` | `payroll.run_created` | All payroll events |
| `#` | (all) | All events |
| Exact match | `employee.created` | Only employee created events |

## Error Handling

### Retry Strategy

1. **First Failure**: Message is requeued for retry
2. **Second Failure**: Message is sent to dead letter queue
3. **Dead Letter Queue**: Manual intervention required

### Dead Letter Queue

Failed messages are automatically routed to the DLQ with:
- Original event data
- Error information
- Number of attempts
- Timestamp of failures

Monitor and manually process DLQ messages:

```typescript
await messageQueue.subscribe(
  QUEUES.DLQ,
  '#',
  async (event) => {
    console.error('DLQ Message:', event);
    // Log to monitoring system
    // Alert on-call engineer
    // Store for manual processing
  }
);
```

## Configuration

### Environment Variables

```bash
# RabbitMQ Connection
RABBITMQ_URL=amqp://user:password@localhost:5672

# Event Dispatcher
EVENT_DISPATCHER_ENABLED=true
EVENT_DISPATCHER_POLL_INTERVAL=5000  # milliseconds
EVENT_DISPATCHER_BATCH_SIZE=10

# Message Queue Settings
MQ_PREFETCH_COUNT=10
MQ_MAX_RECONNECT_ATTEMPTS=10
MQ_RECONNECT_DELAY=5000  # milliseconds
```

### RabbitMQ Setup

Install and run RabbitMQ:

```bash
# Using Docker
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=password \
  rabbitmq:3-management

# Access management UI
# http://localhost:15672 (admin/password)
```

### Docker Compose

```yaml
version: '3.8'

services:
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: password
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

  app:
    build: .
    environment:
      RABBITMQ_URL: amqp://admin:password@rabbitmq:5672
    depends_on:
      - rabbitmq

volumes:
  rabbitmq_data:
```

## Monitoring

### RabbitMQ Management UI

Access at `http://localhost:15672` to monitor:
- Queue depths
- Message rates
- Consumer counts
- Failed messages
- Exchange bindings

### Application Metrics

Key metrics to track:
- **Events Published**: Count of events sent to queue
- **Events Consumed**: Count of events processed
- **Processing Time**: Time to process each event type
- **Error Rate**: Failed event processing attempts
- **Queue Depth**: Number of pending messages
- **DLQ Depth**: Number of messages in dead letter queue

### Health Checks

```typescript
// Health check endpoint
app.get('/health/messaging', async (req, res) => {
  const isHealthy = await messageQueue.isHealthy();
  res.json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date(),
  });
});
```

## Testing

### Unit Tests

```typescript
import { RabbitMQAdapter } from './RabbitMQAdapter';

describe('RabbitMQAdapter', () => {
  let adapter: RabbitMQAdapter;

  beforeEach(() => {
    adapter = new RabbitMQAdapter('amqp://localhost:5672');
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  it('should connect to RabbitMQ', async () => {
    await adapter.connect();
    const isHealthy = await adapter.isHealthy();
    expect(isHealthy).toBe(true);
  });

  it('should publish and receive events', async () => {
    await adapter.connect();
    await adapter.assertExchange('test.exchange', 'topic');
    await adapter.assertQueue('test.queue');
    await adapter.bindQueue('test.queue', 'test.exchange', 'test.key');

    const receivedEvents: any[] = [];
    await adapter.subscribe('test.queue', 'test.key', async (event) => {
      receivedEvents.push(event);
    });

    const testEvent = {
      eventId: 'test-123',
      eventType: 'test',
      eventName: 'test.event',
      organizationId: 'org-123',
      aggregateType: 'test',
      aggregateId: 'test-id',
      timestamp: new Date(),
      payload: { data: 'test' },
    };

    await adapter.publish('test.exchange', 'test.key', testEvent);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].eventId).toBe('test-123');
  });
});
```

### Integration Tests

Test with actual RabbitMQ instance or use test containers:

```typescript
import { GenericContainer } from 'testcontainers';

describe('Messaging Integration', () => {
  let rabbitmqContainer: any;
  let adapter: RabbitMQAdapter;

  beforeAll(async () => {
    rabbitmqContainer = await new GenericContainer('rabbitmq:3-management')
      .withExposedPorts(5672)
      .start();

    const port = rabbitmqContainer.getMappedPort(5672);
    adapter = new RabbitMQAdapter(`amqp://localhost:${port}`);
    await adapter.connect();
  });

  afterAll(async () => {
    await adapter.disconnect();
    await rabbitmqContainer.stop();
  });

  // Tests...
});
```

## Migration Guide

### From Monolith to Microservices

1. **Phase 1**: Add message queue infrastructure
   - Install RabbitMQ
   - Deploy RabbitMQAdapter
   - Activate EventDispatcher with message queue

2. **Phase 2**: Keep monolith, add event consumption
   - Monolith publishes events to queue
   - Monolith also consumes its own events
   - Test dual-write consistency

3. **Phase 3**: Extract first service (Notification)
   - Create separate Notification Service
   - Subscribe to all events
   - Remove notification code from monolith

4. **Phase 4**: Extract remaining services gradually
   - One service at a time
   - Maintain backward compatibility
   - Use feature flags for gradual rollout

## Best Practices

1. **Idempotency**: Design event handlers to be idempotent (can process same event multiple times)
2. **Event Versioning**: Include version in event payload for backward compatibility
3. **Small Events**: Keep event payload small, include only essential data
4. **Monitor Queue Depth**: Alert if queues grow too large
5. **Dead Letter Queue**: Always monitor and process DLQ messages
6. **Testing**: Test event handlers independently with mock events
7. **Documentation**: Document event contracts (schemas)
8. **Correlation IDs**: Include correlation ID for distributed tracing

## Troubleshooting

### Common Issues

**Connection Refused**
- Verify RabbitMQ is running
- Check RABBITMQ_URL environment variable
- Ensure network connectivity

**Messages Not Being Consumed**
- Check queue bindings (routing keys)
- Verify consumer is running
- Check for errors in consumer handler

**Messages Going to DLQ**
- Check consumer logs for errors
- Verify event payload schema
- Test handler logic independently

**High Queue Depth**
- Scale consumers (add more instances)
- Optimize consumer processing time
- Check for consumer failures

## References

- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [Idempotent Consumers](https://www.enterpriseintegrationpatterns.com/patterns/messaging/IdempotentReceiver.html)
