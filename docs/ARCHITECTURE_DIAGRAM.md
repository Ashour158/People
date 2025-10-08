# HR Management System - Service Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Applications                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   Web Browser   │  │  Mobile App     │  │   API Clients   │            │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘            │
└───────────┼────────────────────┼────────────────────┼──────────────────────┘
            │                    │                    │
            │ HTTP/HTTPS         │ HTTP/HTTPS         │ HTTP/HTTPS
            │ WebSocket          │ WebSocket          │
            │                    │                    │
┌───────────▼────────────────────▼────────────────────▼──────────────────────┐
│                           Load Balancer / Nginx                             │
│                         (Port 80/443 → 5000)                                │
└───────────┬─────────────────────────────────────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────────────────────────────────────┐
│                         Backend API Server (Node.js)                         │
│                              Express.js + TypeScript                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Application Layer                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │   │
│  │  │    Routes    │  │ Controllers  │  │  Middleware  │             │   │
│  │  │              │  │              │  │  - Auth      │             │   │
│  │  │ - Auth       │  │ - Business   │  │  - Validate  │             │   │
│  │  │ - Employees  │  │   Logic      │  │  - Error     │             │   │
│  │  │ - Leave      │  │              │  │  - Rate Limit│             │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────┘             │   │
│  └─────────┼─────────────────┼──────────────────────────────────────────┘   │
│            │                 │                                               │
│  ┌─────────▼─────────────────▼──────────────────────────────────────────┐   │
│  │                    Infrastructure Services Layer                     │   │
│  │                                                                       │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │   │
│  │  │ Email Service │  │Notification   │  │ Upload Service│           │   │
│  │  │               │  │   Service     │  │               │           │   │
│  │  │ • Welcome     │  │ • WebSocket   │  │ • Profiles    │           │   │
│  │  │ • Password    │  │ • Real-time   │  │ • Documents   │           │   │
│  │  │   Reset       │  │ • Persistent  │  │ • Validation  │           │   │
│  │  │ • Notif.      │  │ • Channels    │  │ • Cleanup     │           │   │
│  │  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘           │   │
│  │          │                  │                  │                     │   │
│  │          │  ┌───────────────┴────────────┐     │                    │   │
│  │          │  │     Cache Service          │     │                    │   │
│  │          │  │                            │     │                    │   │
│  │          │  │ • Sessions                 │     │                    │   │
│  │          │  │ • Employee Data            │     │                    │   │
│  │          │  │ • Rate Limiting            │     │                    │   │
│  │          │  │ • Performance              │     │                    │   │
│  │          │  └───────────┬────────────────┘     │                    │   │
│  └──────────┼──────────────┼──────────────────────┼────────────────────┘   │
└─────────────┼──────────────┼──────────────────────┼────────────────────────┘
              │              │                      │
              │              │                      │
┌─────────────▼──────────────▼──────────────────────▼────────────────────────┐
│                         External Dependencies                               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐               │
│  │   PostgreSQL   │  │     Redis      │  │   SMTP Server  │               │
│  │    Database    │  │     Cache      │  │  (Email Send)  │               │
│  │                │  │                │  │                │               │
│  │ • Multi-tenant │  │ • Session Store│  │ • Gmail/SES    │               │
│  │ • Employees    │  │ • Cache Layer  │  │ • SendGrid     │               │
│  │ • Leave Mgmt   │  │ • Rate Limit   │  │ • Mailgun      │               │
│  │ • Attendance   │  │ • Pub/Sub      │  │                │               │
│  │ • Notifications│  │                │  │                │               │
│  └────────────────┘  └────────────────┘  └────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Service Interaction Flow

### 1. User Registration Flow
```
User → Backend API
         ↓
     Auth Controller
         ↓
     Auth Service (create user)
         ↓
     Database (save user)
         ↓
     Email Service → SMTP Server → User Email
```

### 2. Real-time Notification Flow
```
Event (Leave Approved)
         ↓
     Notification Service
         ↓
     Database (save notification)
         ↓
     WebSocket → Connected Clients
```

### 3. File Upload Flow
```
User → Upload Request
         ↓
     Upload Service (validate)
         ↓
     File System (save file)
         ↓
     Database (save metadata)
         ↓
     Response with file URL
```

### 4. Data Retrieval with Cache Flow
```
Request → Controller
            ↓
         Check Cache
            ↓
    ┌───────┴────────┐
    │                │
  Hit                Miss
    │                │
    │                ↓
    │          Query Database
    │                │
    │                ↓
    │           Save to Cache
    │                │
    └────────┬───────┘
             ↓
         Response
```

## Service Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Services                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Email Service          Notification Service                │
│      │                        │                              │
│      │ requires               │ requires                     │
│      ↓                        ↓                              │
│  SMTP Config           Database + WebSocket                 │
│  (optional)                                                  │
│                                                              │
│  Upload Service         Cache Service                       │
│      │                        │                              │
│      │ requires               │ requires                     │
│      ↓                        ↓                              │
│  File System            Redis Connection                    │
│  Permissions            (optional)                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Health Check System

```
                    ┌─────────────────┐
                    │  /health        │  ← Overall Health
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
  ┌──────────┐         ┌──────────┐        ┌──────────┐
  │ Database │         │  Cache   │        │  Email   │
  │  Health  │         │  Health  │        │  Health  │
  └──────────┘         └──────────┘        └──────────┘
        │                    │                    │
        │                    │                    │
  PostgreSQL              Redis               SMTP Server
   Connection          Connection            Connection
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Network Security                                    │
│ • CORS Configuration                                         │
│ • Helmet.js (Security Headers)                               │
│ • Rate Limiting                                              │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Authentication                                      │
│ • JWT Token Validation                                       │
│ • Session Management (Cache Service)                         │
│ • Password Hashing (bcrypt)                                  │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Authorization                                       │
│ • Role-Based Access Control (RBAC)                           │
│ • Organization Isolation                                     │
│ • Permission Checks                                          │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Input Validation                                    │
│ • Joi Schema Validation                                      │
│ • File Type Validation (Upload Service)                      │
│ • SQL Injection Prevention (Parameterized Queries)           │
└─────────────────────────────────────────────────────────────┘
```

## Scalability Architecture

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Backend  │   │ Backend  │   │ Backend  │
        │ Server 1 │   │ Server 2 │   │ Server 3 │
        └────┬─────┘   └────┬─────┘   └────┬─────┘
             │              │              │
             └──────────────┼──────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │PostgreSQL│ │  Redis   │ │  SMTP    │
        │  Primary │ │  Cluster │ │  Server  │
        └────┬─────┘ └──────────┘ └──────────┘
             │
             ▼
        ┌──────────┐
        │PostgreSQL│
        │ Replica  │
        └──────────┘
```

## Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Metrics                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  • Request Rate & Latency                                   │
│  • Error Rates                                              │
│  • Service Health Status                                    │
│  • WebSocket Connections                                    │
│  • Cache Hit/Miss Ratios                                    │
│  • Email Delivery Status                                    │
│  • File Upload Success Rate                                 │
│                                                              │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ Winston  │ │Prometheus│ │  Alerts  │
  │  Logs    │ │ Metrics  │ │  (Email) │
  └──────────┘ └────┬─────┘ └──────────┘
                    │
                    ▼
              ┌──────────┐
              │ Grafana  │
              │Dashboard │
              └──────────┘
```

## Development to Production Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Development │───▶│   Testing   │───▶│   Staging   │
└─────────────┘    └─────────────┘    └─────────────┘
      │                  │                    │
      │                  │                    │
   Local Dev        CI/CD Tests          Pre-Production
   Docker            (Jest)                Testing
      │                  │                    │
      └──────────────────┴────────────────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │ Production  │
                  └─────────────┘
                         │
                    Kubernetes
                    Deployment
```

## Key Design Principles

1. **Separation of Concerns**
   - Each service has a single, well-defined responsibility
   - Clear boundaries between infrastructure and domain logic

2. **Resilience**
   - Services fail gracefully (email/cache optional)
   - Health checks for proactive monitoring
   - Retry logic for transient failures

3. **Performance**
   - Caching strategy reduces database load
   - Connection pooling for database
   - Async operations for I/O-bound tasks

4. **Security**
   - Multi-layer security approach
   - Principle of least privilege
   - Input validation at every boundary

5. **Scalability**
   - Stateless application servers
   - Horizontal scaling capability
   - Database read replicas for scaling reads

6. **Observability**
   - Comprehensive logging
   - Health check endpoints
   - Performance metrics collection
