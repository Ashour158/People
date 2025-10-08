# Microservices Architecture Guide

## Overview

This document outlines the microservices architecture for the People HR Management System. The system is designed to support both monolithic and microservices deployment patterns, allowing for gradual migration as the system scales.

## Architecture Philosophy

### Design Principles

1. **Domain-Driven Design (DDD)**: Services are organized around business domains
2. **Bounded Contexts**: Each service has clear boundaries and responsibilities
3. **Event-Driven Communication**: Services communicate primarily through domain events
4. **API-First**: All services expose well-defined REST APIs
5. **Autonomous Services**: Each service can be developed, deployed, and scaled independently
6. **Data Isolation**: Each service owns its data (no shared databases)
7. **Resilience**: Services are designed to handle partial failures gracefully

## Service Decomposition

### Core Services

#### 1. Employee Service
**Domain**: Employee lifecycle management

**Responsibilities**:
- Employee CRUD operations
- Employee profiles and documents
- Organizational hierarchy
- Department and designation management
- Employee onboarding and offboarding

**Data Ownership**:
- `employees` table
- `departments` table
- `designations` table
- `employee_documents` table
- `employment_history` table

**Events Published**:
- `employee.created`
- `employee.updated`
- `employee.terminated`
- `employee.activated`
- `employee.onboarded`

**Events Consumed**:
- `leave.approved` (to update employee leave balance)
- `attendance.checked_in` (to track active employees)

**API Endpoints**:
```
GET    /api/v1/employees
POST   /api/v1/employees
GET    /api/v1/employees/:id
PUT    /api/v1/employees/:id
DELETE /api/v1/employees/:id
GET    /api/v1/employees/:id/documents
POST   /api/v1/employees/:id/documents
GET    /api/v1/departments
POST   /api/v1/departments
```

---

#### 2. Authentication & Authorization Service
**Domain**: Identity and access management

**Responsibilities**:
- User authentication (login/logout)
- JWT token generation and validation
- Password reset and recovery
- Session management
- Role-based access control (RBAC)
- Permission management
- Multi-factor authentication

**Data Ownership**:
- `users` table
- `roles` table
- `permissions` table
- `role_permissions` table
- `user_roles` table
- `refresh_tokens` table
- `password_resets` table
- `login_history` table

**Events Published**:
- `auth.user_logged_in`
- `auth.user_logged_out`
- `auth.password_changed`
- `auth.password_reset_requested`
- `auth.account_locked`
- `auth.mfa_enabled`

**Events Consumed**:
- `employee.created` (to create user account)
- `employee.terminated` (to disable user account)

**API Endpoints**:
```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh-token
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/change-password
GET    /api/v1/auth/me
POST   /api/v1/auth/verify-token
```

---

#### 3. Attendance Service
**Domain**: Time and attendance tracking

**Responsibilities**:
- Check-in/check-out management
- Attendance tracking and reporting
- Shift management
- Overtime calculation
- Attendance regularization
- Work-from-home tracking
- Geolocation verification

**Data Ownership**:
- `attendance` table
- `shifts` table
- `shift_assignments` table
- `attendance_regularizations` table
- `overtime_records` table

**Events Published**:
- `attendance.checked_in`
- `attendance.checked_out`
- `attendance.regularization_requested`
- `attendance.regularization_approved`
- `overtime.recorded`

**Events Consumed**:
- `employee.created` (to assign default shift)
- `leave.approved` (to mark as leave day)
- `employee.terminated` (to close attendance records)

**API Endpoints**:
```
POST   /api/v1/attendance/check-in
POST   /api/v1/attendance/check-out
GET    /api/v1/attendance
GET    /api/v1/attendance/:id
POST   /api/v1/attendance/regularization
GET    /api/v1/attendance/regularizations
PUT    /api/v1/attendance/regularizations/:id
GET    /api/v1/attendance/reports
GET    /api/v1/shifts
POST   /api/v1/shifts
```

---

#### 4. Leave Management Service
**Domain**: Leave and time-off management

**Responsibilities**:
- Leave application and approval workflow
- Leave balance calculation
- Leave type configuration
- Leave policy management
- Holiday calendar management
- Leave encashment
- Carry-forward calculations

**Data Ownership**:
- `leave_requests` table
- `leave_types` table
- `leave_balances` table
- `leave_policies` table
- `holidays` table
- `leave_approvals` table

**Events Published**:
- `leave.requested`
- `leave.approved`
- `leave.rejected`
- `leave.cancelled`
- `leave_balance.updated`
- `leave_balance.credited`

**Events Consumed**:
- `employee.created` (to initialize leave balances)
- `employee.terminated` (to process leave settlement)
- `payroll.processed` (for leave encashment)

**API Endpoints**:
```
POST   /api/v1/leaves
GET    /api/v1/leaves
GET    /api/v1/leaves/:id
PUT    /api/v1/leaves/:id
DELETE /api/v1/leaves/:id
POST   /api/v1/leaves/:id/approve
POST   /api/v1/leaves/:id/reject
GET    /api/v1/leave-balances
GET    /api/v1/leave-types
POST   /api/v1/leave-types
```

---

#### 5. Payroll Service
**Domain**: Payroll processing and compensation

**Responsibilities**:
- Payroll run processing
- Salary calculations
- Tax calculations
- Statutory compliance
- Payslip generation
- Reimbursement processing
- Loan management
- Bank file generation

**Data Ownership**:
- `payroll_runs` table
- `payroll_items` table
- `salary_structures` table
- `pay_components` table
- `employee_salary_structures` table
- `reimbursements` table
- `loans` table
- `tax_slabs` table

**Events Published**:
- `payroll.run_created`
- `payroll.run_processed`
- `payroll.run_approved`
- `payroll.payslip_generated`
- `reimbursement.approved`
- `loan.approved`

**Events Consumed**:
- `employee.created` (to set up salary structure)
- `attendance.checked_in` (for attendance-based pay)
- `leave.approved` (for leave deductions)
- `employee.terminated` (for final settlement)

**API Endpoints**:
```
POST   /api/v1/payroll/runs
GET    /api/v1/payroll/runs
GET    /api/v1/payroll/runs/:id
POST   /api/v1/payroll/runs/:id/process
POST   /api/v1/payroll/runs/:id/approve
GET    /api/v1/payroll/payslips
POST   /api/v1/reimbursements
GET    /api/v1/reimbursements
POST   /api/v1/loans
GET    /api/v1/loans
```

---

#### 6. Performance Management Service
**Domain**: Performance evaluation and goals

**Responsibilities**:
- Goal setting and tracking (OKR/KPI)
- Performance review cycles
- 360-degree feedback
- Self-assessment and manager evaluation
- Performance improvement plans
- Competency mapping
- Succession planning

**Data Ownership**:
- `performance_goals` table
- `performance_reviews` table
- `feedback_requests` table
- `feedback_responses` table
- `competencies` table
- `employee_competencies` table
- `performance_improvement_plans` table

**Events Published**:
- `goal.created`
- `goal.completed`
- `review.submitted`
- `review.approved`
- `feedback.requested`
- `feedback.submitted`

**Events Consumed**:
- `employee.created` (to initialize performance tracking)
- `employee.terminated` (to close review cycles)

**API Endpoints**:
```
POST   /api/v1/performance/goals
GET    /api/v1/performance/goals
PUT    /api/v1/performance/goals/:id
POST   /api/v1/performance/reviews
GET    /api/v1/performance/reviews
POST   /api/v1/performance/feedback
GET    /api/v1/performance/feedback
```

---

#### 7. Recruitment Service
**Domain**: Talent acquisition

**Responsibilities**:
- Job posting management
- Candidate database
- Application tracking system (ATS)
- Interview scheduling
- Candidate evaluation
- Offer letter generation
- Onboarding initiation

**Data Ownership**:
- `job_openings` table
- `candidates` table
- `applications` table
- `interviews` table
- `interview_feedback` table
- `offers` table

**Events Published**:
- `job.posted`
- `application.received`
- `interview.scheduled`
- `offer.sent`
- `offer.accepted`
- `candidate.hired`

**Events Consumed**:
- `offer.accepted` (to trigger employee creation)

**API Endpoints**:
```
POST   /api/v1/recruitment/jobs
GET    /api/v1/recruitment/jobs
POST   /api/v1/recruitment/applications
GET    /api/v1/recruitment/applications
POST   /api/v1/recruitment/interviews
GET    /api/v1/recruitment/interviews
POST   /api/v1/recruitment/offers
```

---

#### 8. Notification Service
**Domain**: Communication and notifications

**Responsibilities**:
- Email notifications
- SMS notifications
- In-app notifications
- Push notifications
- WebSocket real-time updates
- Notification templates
- Notification preferences
- Delivery tracking

**Data Ownership**:
- `notifications` table
- `notification_templates` table
- `notification_preferences` table
- `email_queue` table
- `sms_queue` table

**Events Published**:
- `notification.sent`
- `notification.delivered`
- `notification.read`

**Events Consumed**:
- All domain events (to send notifications)

**API Endpoints**:
```
GET    /api/v1/notifications
PUT    /api/v1/notifications/:id/read
PUT    /api/v1/notifications/read-all
GET    /api/v1/notifications/preferences
PUT    /api/v1/notifications/preferences
```

---

## Inter-Service Communication

### Synchronous Communication (REST API)

Used for:
- Query operations that need immediate response
- Service-to-service direct calls
- Client-facing APIs

**Pattern**: Request-Response via HTTP/REST

**Example**:
```typescript
// Employee Service calling Auth Service
const authResponse = await axios.post(
  'http://auth-service:3001/api/v1/auth/verify-token',
  { token: req.headers.authorization }
);
```

**Best Practices**:
- Use circuit breakers (e.g., Opossum, Resilience4j)
- Implement timeouts and retries
- Add service discovery (Consul, etcd)
- Use API Gateway for routing

---

### Asynchronous Communication (Message Queue)

Used for:
- Event notifications
- Long-running operations
- Eventual consistency scenarios
- Decoupling services

**Pattern**: Publish-Subscribe via Message Queue

**Technologies**:
- **RabbitMQ**: Feature-rich, reliable, AMQP protocol
- **Apache Kafka**: High throughput, event streaming, log aggregation
- **Redis Pub/Sub**: Lightweight, fast, for simple pub/sub

**Example with RabbitMQ**:
```typescript
// Publisher (Employee Service)
import amqp from 'amqplib';

const connection = await amqp.connect('amqp://localhost');
const channel = await connection.createChannel();
const exchange = 'hr.events';

await channel.assertExchange(exchange, 'topic', { durable: true });

const event = {
  eventId: uuid(),
  eventType: 'employee',
  eventName: 'employee.created',
  organizationId: 'org-123',
  aggregateId: employeeId,
  payload: { ...employeeData },
  timestamp: new Date()
};

channel.publish(
  exchange,
  'employee.created',
  Buffer.from(JSON.stringify(event))
);
```

```typescript
// Consumer (Notification Service)
await channel.assertQueue('notification.employee.created', { durable: true });
await channel.bindQueue(
  'notification.employee.created',
  'hr.events',
  'employee.created'
);

channel.consume('notification.employee.created', async (msg) => {
  if (msg) {
    const event = JSON.parse(msg.content.toString());
    await sendWelcomeEmail(event.payload);
    channel.ack(msg);
  }
});
```

---

### Event Outbox Pattern

Ensures atomic database writes and event publishing.

**Implementation**:
1. Save entity changes and events in same transaction
2. Background worker polls outbox table
3. Publishes events to message queue
4. Marks events as processed

**Benefits**:
- Guarantees event delivery
- Maintains data consistency
- No lost events on failures

---

## API Gateway

### Purpose

- Single entry point for all client requests
- Request routing to appropriate services
- Authentication and authorization
- Rate limiting and throttling
- Request/response transformation
- Load balancing
- Caching
- Logging and monitoring

### Technologies

- **Kong**: Open-source, plugin-based, scalable
- **NGINX**: High-performance, reverse proxy
- **AWS API Gateway**: Managed service
- **Traefik**: Cloud-native, automatic service discovery

### Example Configuration (Kong)

```yaml
# kong.yml
_format_version: "3.0"

services:
  - name: employee-service
    url: http://employee-service:3000
    routes:
      - name: employee-routes
        paths:
          - /api/v1/employees
        methods:
          - GET
          - POST
          - PUT
          - DELETE
    plugins:
      - name: jwt
      - name: rate-limiting
        config:
          minute: 100
      - name: cors

  - name: auth-service
    url: http://auth-service:3001
    routes:
      - name: auth-routes
        paths:
          - /api/v1/auth
        methods:
          - POST

  - name: attendance-service
    url: http://attendance-service:3002
    routes:
      - name: attendance-routes
        paths:
          - /api/v1/attendance
```

---

## Service Discovery

### Purpose

- Dynamic service registration
- Health checking
- Load balancing
- Service location abstraction

### Technologies

- **Consul**: Full-featured, multi-datacenter
- **etcd**: Distributed key-value store
- **Eureka**: Netflix OSS, Spring Cloud integration
- **Kubernetes DNS**: Built-in service discovery

### Example with Consul

```typescript
// Service Registration
import Consul from 'consul';

const consul = new Consul({ host: 'consul-server', port: 8500 });

await consul.agent.service.register({
  name: 'employee-service',
  id: `employee-service-${process.env.INSTANCE_ID}`,
  address: process.env.SERVICE_HOST,
  port: parseInt(process.env.SERVICE_PORT),
  check: {
    http: `http://${process.env.SERVICE_HOST}:${process.env.SERVICE_PORT}/health`,
    interval: '10s',
    timeout: '5s'
  }
});

// Service Discovery
const services = await consul.health.service({
  service: 'employee-service',
  passing: true
});

const serviceUrl = `http://${services[0].Service.Address}:${services[0].Service.Port}`;
```

---

## Configuration Management

### Centralized Configuration

Store configuration in a central location accessible to all services.

**Technologies**:
- **Consul KV Store**: Key-value configuration
- **Spring Cloud Config**: Git-backed configuration
- **etcd**: Distributed configuration
- **AWS Parameter Store**: Managed secrets

**Best Practices**:
- Environment-specific configurations
- Secret management (HashiCorp Vault, AWS Secrets Manager)
- Configuration versioning
- Hot-reload capabilities

---

## Database Strategy

### Database Per Service

Each service has its own database to ensure loose coupling and independent scaling.

**Challenges**:
- Data duplication (acceptable for read models)
- Distributed transactions (use Saga pattern)
- Data consistency (eventual consistency)

**Solutions**:
- **Event Sourcing**: Store all changes as events
- **CQRS**: Separate read and write models
- **Saga Pattern**: Coordinate transactions across services
- **API Composition**: Aggregate data from multiple services

### Shared Database (Transition Phase)

During migration from monolith to microservices:
- Keep existing database
- Use database views or separate schemas per service
- Gradually extract data as services mature

---

## Deployment Architecture

### Docker Containerization

Each service runs in its own Docker container.

**Example Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### Docker Compose (Development)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"

  consul:
    image: consul:latest
    ports:
      - "8500:8500"

  employee-service:
    build: ./services/employee
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/hr_employee
      RABBITMQ_URL: amqp://rabbitmq:5672
      CONSUL_HOST: consul
    depends_on:
      - postgres
      - rabbitmq
      - consul

  auth-service:
    build: ./services/auth
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/hr_auth
      RABBITMQ_URL: amqp://rabbitmq:5672
      CONSUL_HOST: consul
    depends_on:
      - postgres
      - rabbitmq
      - consul

  api-gateway:
    image: kong:latest
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: postgres
    ports:
      - "8000:8000"
      - "8001:8001"

volumes:
  postgres_data:
```

### Kubernetes Deployment (Production)

```yaml
# employee-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: employee-service
  labels:
    app: employee-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: employee-service
  template:
    metadata:
      labels:
        app: employee-service
    spec:
      containers:
      - name: employee-service
        image: hr-system/employee-service:v1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secrets
              key: employee-db-url
        - name: RABBITMQ_URL
          valueFrom:
            secretKeyRef:
              name: messaging-secrets
              key: rabbitmq-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: employee-service
spec:
  selector:
    app: employee-service
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: employee-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: employee-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Monitoring and Observability

### Distributed Tracing

Track requests across multiple services.

**Technologies**:
- **Jaeger**: Open-source, CNCF project
- **Zipkin**: Twitter's distributed tracing system
- **AWS X-Ray**: Managed service

**Implementation**:
```typescript
import { initTracer } from 'jaeger-client';

const tracer = initTracer({
  serviceName: 'employee-service',
  sampler: {
    type: 'const',
    param: 1,
  },
  reporter: {
    agentHost: 'jaeger-agent',
    agentPort: 6831,
  },
});

// In request handler
const span = tracer.startSpan('create_employee');
span.setTag('employee_id', employeeId);
span.log({ event: 'employee_created' });
span.finish();
```

### Metrics

**Technologies**:
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **StatsD**: Metrics aggregation

**Key Metrics**:
- Request rate
- Error rate
- Response time (p50, p95, p99)
- Service availability
- Message queue depth
- Database connection pool usage

### Logging

**Technologies**:
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Fluentd**: Log aggregation
- **Loki**: Grafana's log aggregation

**Structured Logging**:
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  format: winston.format.json(),
  defaultMeta: {
    service: 'employee-service',
    environment: process.env.NODE_ENV
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

logger.info('Employee created', {
  employeeId,
  organizationId,
  traceId: span.context().toTraceId()
});
```

---

## Security Considerations

### Service-to-Service Authentication

**Mutual TLS (mTLS)**:
- Each service has its own certificate
- Services verify each other's identity
- Encrypted communication

**API Keys**:
- Services use API keys for authentication
- Stored securely in secrets management

**JWT Tokens**:
- Services validate JWT tokens
- Shared secret or public key verification

### API Gateway Security

- Rate limiting per client
- IP whitelisting/blacklisting
- DDoS protection
- WAF (Web Application Firewall)

### Data Security

- Encryption at rest (database encryption)
- Encryption in transit (TLS)
- Secrets management (Vault, AWS Secrets Manager)
- PII data masking in logs

---

## Migration Strategy

### Phase 1: Preparation (Weeks 1-2)
- [ ] Set up message queue infrastructure (RabbitMQ/Kafka)
- [ ] Implement event outbox pattern
- [ ] Activate event dispatcher
- [ ] Add distributed tracing
- [ ] Set up service discovery

### Phase 2: Extract First Service (Weeks 3-4)
- [ ] Start with Notification Service (least dependencies)
- [ ] Move notification logic to separate service
- [ ] Consume events from message queue
- [ ] Test in staging environment
- [ ] Deploy to production (canary deployment)

### Phase 3: Extract Core Services (Weeks 5-8)
- [ ] Extract Authentication Service
- [ ] Extract Employee Service
- [ ] Extract Attendance Service
- [ ] Extract Leave Service

### Phase 4: Advanced Services (Weeks 9-12)
- [ ] Extract Payroll Service
- [ ] Extract Performance Service
- [ ] Extract Recruitment Service

### Phase 5: API Gateway & Optimization (Weeks 13-16)
- [ ] Deploy API Gateway
- [ ] Implement circuit breakers
- [ ] Add caching layer
- [ ] Performance optimization
- [ ] Load testing

---

## Best Practices

1. **Start Small**: Don't extract all services at once
2. **Monitor Everything**: Visibility is crucial in distributed systems
3. **Automate Testing**: Integration and end-to-end tests
4. **Circuit Breakers**: Prevent cascading failures
5. **Idempotent Operations**: Handle duplicate messages
6. **Backward Compatibility**: API versioning and deprecation
7. **Documentation**: Keep service contracts documented
8. **Security First**: Authentication, authorization, encryption
9. **Performance**: Optimize database queries, use caching
10. **Disaster Recovery**: Backup strategy, failover plan

---

## References

- [Microservices.io](https://microservices.io/) - Microservices patterns
- [12 Factor App](https://12factor.net/) - Methodology for building SaaS apps
- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Building Microservices by Sam Newman](https://www.oreilly.com/library/view/building-microservices/9781491950340/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
