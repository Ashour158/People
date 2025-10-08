# Microservices Migration Guide

This guide provides a step-by-step approach to migrate the HR Management System from a monolithic architecture to microservices.

## Prerequisites

Before starting the migration:

- [ ] Current monolith is stable and well-tested
- [ ] Team is familiar with distributed systems concepts
- [ ] Infrastructure for message queue (RabbitMQ) is available
- [ ] Monitoring and observability tools are in place
- [ ] CI/CD pipeline supports multiple deployments

## Migration Strategy: Strangler Fig Pattern

We'll use the **Strangler Fig Pattern** to gradually replace monolith functionality with microservices while keeping the system running.

```
Phase 1: Add Message Queue
Phase 2: Extract First Service (Notification)
Phase 3: Extract Core Services (Employee, Auth, Attendance, Leave)
Phase 4: Extract Complex Services (Payroll, Performance)
Phase 5: Decompose Remaining Services
Phase 6: Decommission Monolith
```

---

## Phase 1: Add Message Queue Infrastructure (Week 1-2)

### Objectives
- Set up RabbitMQ infrastructure
- Implement event outbox pattern
- Activate event dispatcher
- Monolith publishes events but still processes internally

### Tasks

#### 1.1 Install RabbitMQ

**Development (Docker)**:
```bash
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=password \
  rabbitmq:3-management
```

**Production (Kubernetes)**:
```bash
kubectl apply -f kubernetes/rabbitmq.yaml
```

#### 1.2 Update Backend Dependencies

```bash
cd backend
npm install amqplib @types/amqplib
```

#### 1.3 Configure Event Dispatcher

Update `backend/src/server.ts`:

```typescript
import { RabbitMQAdapter } from './messaging/RabbitMQAdapter';
import { EventDispatcher } from './events/EventDispatcher';
import { PostgresEventOutboxRepository } from './repositories/implementations';

// Initialize message queue
const messageQueue = new RabbitMQAdapter(process.env.RABBITMQ_URL);
await messageQueue.connect();

// Start event dispatcher
const eventOutboxRepo = new PostgresEventOutboxRepository(pool);
const eventDispatcher = new EventDispatcher(eventOutboxRepo, messageQueue);
await eventDispatcher.start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  eventDispatcher.stop();
  await messageQueue.disconnect();
  await pool.end();
  process.exit(0);
});
```

#### 1.4 Environment Variables

Add to `.env`:
```bash
RABBITMQ_URL=amqp://admin:password@localhost:5672
EVENT_DISPATCHER_ENABLED=true
```

#### 1.5 Verification

- [ ] Events are published to RabbitMQ
- [ ] Check RabbitMQ Management UI (http://localhost:15672)
- [ ] Monitor exchange `hr.events` for messages
- [ ] Verify event outbox table is being processed

---

## Phase 2: Extract Notification Service (Week 3-4)

### Why Start with Notification Service?
- Low coupling with other services
- Consumes events from all services
- No complex business logic
- Easy to rollback if issues arise

### Tasks

#### 2.1 Create Notification Service Project

```bash
mkdir -p services/notification
cd services/notification
npm init -y
npm install express amqplib nodemailer
```

#### 2.2 Implement Event Consumer

`services/notification/src/consumer.ts`:

```typescript
import { RabbitMQAdapter, EXCHANGES, QUEUES } from '../../backend/src/messaging/RabbitMQAdapter';
import { NotificationHandler } from './handlers/NotificationHandler';

const messageQueue = new RabbitMQAdapter();
await messageQueue.connect();

// Setup queue for all events
await messageQueue.assertQueue(QUEUES.NOTIFICATION_ALL, { durable: true });
await messageQueue.bindQueue(QUEUES.NOTIFICATION_ALL, EXCHANGES.HR_EVENTS, '#');

// Subscribe to all events
const handler = new NotificationHandler();
await messageQueue.subscribe(QUEUES.NOTIFICATION_ALL, '#', async (event) => {
  await handler.handle(event);
});
```

#### 2.3 Implement Notification Handlers

`services/notification/src/handlers/NotificationHandler.ts`:

```typescript
import { DomainEvent } from '../../../backend/src/events/events';
import { EmailService } from '../services/EmailService';

export class NotificationHandler {
  constructor(private emailService: EmailService) {}

  async handle(event: DomainEvent): Promise<void> {
    switch (event.eventName) {
      case 'employee.created':
        await this.handleEmployeeCreated(event);
        break;
      case 'leave.requested':
        await this.handleLeaveRequested(event);
        break;
      // ... other cases
    }
  }

  private async handleEmployeeCreated(event: any): Promise<void> {
    await this.emailService.sendWelcomeEmail(
      event.payload.email,
      event.payload.firstName
    );
  }

  private async handleLeaveRequested(event: any): Promise<void> {
    // Fetch manager email from Employee Service
    // Send notification email
  }
}
```

#### 2.4 Deploy Notification Service

**Docker Compose**:
```yaml
notification-service:
  build: ./services/notification
  environment:
    RABBITMQ_URL: amqp://admin:password@rabbitmq:5672
    SMTP_HOST: smtp.gmail.com
    SMTP_PORT: 587
  depends_on:
    - rabbitmq
```

**Deploy**:
```bash
docker-compose up -d notification-service
```

#### 2.5 Remove Notification Code from Monolith

Once notification service is stable:
1. Feature flag: Disable email sending in monolith
2. Monitor notification service logs
3. After 1 week of stable operation, remove notification code

#### 2.6 Verification

- [ ] Notification service receives all events
- [ ] Emails are sent successfully
- [ ] No duplicate notifications (idempotency working)
- [ ] Monolith still functions normally
- [ ] Dead letter queue is monitored

---

## Phase 3: Extract Core Services (Week 5-8)

### Order of Extraction

1. **Auth Service** (Week 5)
2. **Employee Service** (Week 6)
3. **Attendance Service** (Week 7)
4. **Leave Service** (Week 8)

### 3.1 Extract Auth Service

#### Create Database
```sql
CREATE DATABASE hr_auth;
-- Run migrations for users, roles, permissions tables
```

#### Extract Code
- Move `auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`
- Copy user-related tables schema
- Update database connections

#### API Gateway Configuration
```yaml
# kong/kong.yml
services:
  - name: auth-service
    url: http://auth-service:3001
    routes:
      - name: auth-routes
        paths:
          - /api/v1/auth
```

#### Update Monolith
- Replace auth service with HTTP calls to auth-service
- Keep auth middleware for backward compatibility
- Add circuit breaker for resilience

### 3.2 Extract Employee Service

Follow similar pattern as Auth Service:

1. Create `hr_employee` database
2. Migrate employee, department, designation tables
3. Extract employee service code
4. Configure API Gateway routes
5. Update monolith to call employee-service API

### 3.3 Extract Attendance Service

Attendance service depends on Employee service:

1. Create `hr_attendance` database
2. Configure service-to-service communication
3. Subscribe to `employee.created` event to sync data
4. Extract attendance logic

### 3.4 Extract Leave Service

Leave service depends on Employee and Attendance:

1. Create `hr_leave` database
2. Subscribe to relevant events
3. Implement approval workflow
4. Extract leave logic

---

## Phase 4: Extract Complex Services (Week 9-12)

### 4.1 Payroll Service

**Challenges**:
- Complex calculations
- Depends on multiple services (Employee, Attendance, Leave)
- Transactional consistency requirements

**Approach**:
- Use **Saga Pattern** for distributed transactions
- Implement compensation logic for failures
- Extensive testing with staging data

### 4.2 Performance Service

**Challenges**:
- Long-running review cycles
- Complex workflows

**Approach**:
- Process-driven design
- State machine implementation
- Event sourcing for audit trail

---

## Phase 5: API Gateway Deployment (Week 13-14)

### 5.1 Deploy Kong Gateway

```bash
docker-compose up -d api-gateway
```

### 5.2 Configure Routes

Update `kong/kong.yml` with all service routes.

### 5.3 Update Frontend

Change API base URL to point to API Gateway:

```typescript
// frontend/.env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 5.4 Migration Strategy

**Option A: Big Bang (Risky)**
- Switch all traffic to API Gateway at once
- Requires thorough testing

**Option B: Gradual (Recommended)**
- Route 10% traffic to API Gateway
- Gradually increase to 50%, 75%, 100%
- Use feature flags or routing rules

---

## Phase 6: Monitoring & Observability (Week 15-16)

### 6.1 Distributed Tracing

**Jaeger Setup**:
```bash
docker-compose up -d jaeger
```

**Instrument Services**:
```typescript
import { initTracer } from 'jaeger-client';

const tracer = initTracer({
  serviceName: 'employee-service',
  sampler: { type: 'const', param: 1 },
  reporter: { agentHost: 'jaeger', agentPort: 6831 }
});
```

### 6.2 Metrics Collection

**Prometheus Setup**:
```bash
docker-compose up -d prometheus grafana
```

**Expose Metrics**:
```typescript
import promClient from 'prom-client';

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 6.3 Centralized Logging

**ELK Stack**:
- Elasticsearch for storage
- Logstash for aggregation
- Kibana for visualization

**Structured Logging**:
```typescript
logger.info('Employee created', {
  employeeId,
  organizationId,
  traceId: span.context().toTraceId()
});
```

---

## Phase 7: Decommission Monolith (Week 17+)

### Prerequisites

- [ ] All functionality migrated to microservices
- [ ] API Gateway handles 100% of traffic
- [ ] Monitoring confirms system stability
- [ ] Team trained on microservices operations
- [ ] Rollback plan documented

### Steps

1. **Redirect All Traffic**: Ensure all clients use API Gateway
2. **Deprecate Monolith Endpoints**: Return 410 Gone for old endpoints
3. **Data Migration**: Ensure all data is in service-specific databases
4. **Archive Monolith Code**: Keep for historical reference
5. **Shut Down Monolith**: Stop monolith services
6. **Clean Up**: Remove unused infrastructure

---

## Handling Cross-Cutting Concerns

### Data Consistency

**Problem**: Distributed transactions across services

**Solutions**:
1. **Saga Pattern**: Coordinate transactions with compensating actions
2. **Event Sourcing**: Store all changes as events
3. **Two-Phase Commit**: For critical transactions (use sparingly)
4. **Eventual Consistency**: Accept temporary inconsistency

### Data Synchronization

**Problem**: Services need data from other services

**Solutions**:
1. **Event-Driven Replication**: Subscribe to events and maintain local copy
2. **API Calls**: Query other services when needed (use caching)
3. **Data Duplication**: Acceptable for read models (CQRS)

### Authentication & Authorization

**Problem**: Services need to verify user identity

**Solutions**:
1. **JWT Tokens**: Services validate tokens independently
2. **API Gateway Authentication**: Gateway authenticates, adds headers
3. **Service Mesh**: Istio handles mTLS between services

---

## Testing Strategy

### Unit Tests
- Test service logic independently
- Mock external dependencies
- Fast feedback loop

### Integration Tests
- Test service with real database
- Mock other services
- Test event publishing/consuming

### Contract Tests
- Verify service contracts (API schemas)
- Pact or Spring Cloud Contract
- Prevent breaking changes

### End-to-End Tests
- Test complete user flows
- Across all services
- Run in staging environment

### Performance Tests
- Load testing with k6 or JMeter
- Identify bottlenecks
- Verify autoscaling

---

## Rollback Plan

### Immediate Rollback

If critical issue is discovered:

1. **Revert Traffic**: Route traffic back to monolith via API Gateway
2. **Feature Flags**: Disable new service features
3. **Incident Response**: Follow incident management process

### Data Rollback

For data issues:

1. **Database Backups**: Restore from last known good backup
2. **Event Replay**: Replay events to rebuild state
3. **Manual Fixes**: Correct data inconsistencies

---

## Success Metrics

Track these metrics to measure migration success:

### Performance
- [ ] Response time < monolith baseline
- [ ] 99th percentile latency < 500ms
- [ ] Error rate < 0.1%

### Reliability
- [ ] Uptime > 99.9%
- [ ] MTTR (Mean Time To Recovery) < 30 minutes
- [ ] Successful deployments > 95%

### Operational
- [ ] Deployment frequency increases
- [ ] Lead time for changes decreases
- [ ] Change failure rate decreases
- [ ] Team satisfaction improves

---

## Common Pitfalls & Solutions

### Pitfall 1: Too Many Services Too Fast

**Problem**: Extracting too many services simultaneously

**Solution**: Follow the phased approach, one service at a time

### Pitfall 2: Distributed Monolith

**Problem**: Services are tightly coupled, defeating the purpose

**Solution**: Ensure proper service boundaries based on domains

### Pitfall 3: Network Latency

**Problem**: Multiple service calls slow down requests

**Solution**: Use caching, async communication, API composition

### Pitfall 4: Data Inconsistency

**Problem**: Temporary inconsistency confuses users

**Solution**: Design UX for eventual consistency, show pending states

### Pitfall 5: Debugging Difficulty

**Problem**: Hard to trace issues across services

**Solution**: Implement distributed tracing, correlation IDs, centralized logging

---

## Resources

### Books
- "Building Microservices" by Sam Newman
- "Microservices Patterns" by Chris Richardson
- "Domain-Driven Design" by Eric Evans

### Online Courses
- Microservices Architecture (Udemy)
- Building Scalable Microservices (Pluralsight)

### Tools
- [Jaeger](https://www.jaegertracing.io/) - Distributed Tracing
- [Kong](https://konghq.com/) - API Gateway
- [RabbitMQ](https://www.rabbitmq.com/) - Message Broker
- [Consul](https://www.consul.io/) - Service Discovery

### Patterns
- [Microservices.io](https://microservices.io/patterns/index.html)
- [Cloud Design Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/)

---

## Conclusion

Microservices migration is a journey, not a destination. Take it one step at a time, validate each phase, and always prioritize system stability over speed.

Remember:
- **Start small**: Extract the simplest service first
- **Measure everything**: You can't improve what you don't measure
- **Plan for failure**: Distributed systems will fail, design for it
- **Team alignment**: Ensure everyone understands the goals and approach
- **Continuous improvement**: Learn and adapt based on experience
