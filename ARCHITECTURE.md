# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            React Frontend (Port 3000)                   │ │
│  │                                                          │ │
│  │  • Material-UI Components                               │ │
│  │  • React Router (Navigation)                            │ │
│  │  • Zustand (State Management)                           │ │
│  │  • React Query (Data Fetching)                          │ │
│  │  • Axios (HTTP Client)                                  │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/HTTPS
                       │ REST API
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Django Backend API (Port 8000)                  │ │
│  │                                                          │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │              Middleware Stack                     │  │ │
│  │  │  • SecurityMiddleware                             │  │ │
│  │  │  • CORS (django-cors-headers)                     │  │ │
│  │  │  • Rate Limiting                                  │  │ │
│  │  │  • Authentication (JWT)                           │  │ │
│  │  │  • Authorization (RBAC)                           │  │ │
│  │  │  • Input Validation (DRF Serializers)             │  │ │
│  │  │  • Error Handler                                  │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                          │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │              API Routes (Django REST Framework)   │  │ │
│  │  │  • /auth      - Authentication                    │  │ │
│  │  │  • /employees - Employee Management               │  │ │
│  │  │  • /attendance - Attendance Tracking              │  │ │
│  │  │  • /leave     - Leave Management                  │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                          │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │             Business Logic (Django Apps)          │  │ │
│  │  │  • AuthService                                    │  │ │
│  │  │  • EmployeeService                                │  │ │
│  │  │  • AttendanceService                              │  │ │
│  │  │  • LeaveService                                   │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────┬────────────────────────┬─────────────────────┘
               │                        │
               │                        │
               ▼                        ▼
┌──────────────────────────┐  ┌────────────────────────┐
│     DATA LAYER           │  │    CACHE LAYER         │
│                          │  │                        │
│  PostgreSQL (Port 5432)  │  │  Redis (Port 6379)     │
│                          │  │                        │
│  • Organizations         │  │  • Session Cache       │
│  • Users & Roles         │  │  • Query Cache         │
│  • Employees             │  │  • Rate Limit Data     │
│  • Departments           │  │                        │
│  • Attendance Records    │  │                        │
│  • Leave Applications    │  │                        │
│  • 100+ Tables           │  │                        │
└──────────────────────────┘  └────────────────────────┘
```

## Component Architecture

### Frontend Architecture
```
frontend/
├── Pages (Views)
│   ├── Auth (Login, Register)
│   ├── Dashboard (Overview)
│   ├── Employees (List, Details)
│   ├── Attendance (Check-in/out)
│   └── Leave (Apply, List)
│
├── Components
│   ├── Layout (Header, Sidebar)
│   └── Common (Protected Routes)
│
├── State Management (Zustand)
│   └── Auth Store
│
├── API Layer (Axios)
│   ├── Auth API
│   ├── Employee API
│   ├── Attendance API
│   └── Leave API
│
└── Routing (React Router)
    ├── Public Routes
    └── Protected Routes
```

### Backend Architecture
```
backend/
├── API Layer (Django REST Framework)
│   └── Views (ViewSets)
│       ├── auth.views
│       ├── employee.views
│       ├── attendance.views
│       └── leave.views
│
├── Middleware
│   ├── authenticate (JWT)
│   ├── authorize (Permissions)
│   ├── SecurityMiddleware
│   ├── errorHandler
│   └── rateLimiter
│
├── Serializers (Validation & Serialization)
│   ├── AuthSerializer
│   ├── EmployeeSerializer
│   ├── AttendanceSerializer
│   └── LeaveSerializer
│
├── Services (Business Logic)
│   ├── AuthService
│   ├── EmployeeService
│   ├── AttendanceService
│   └── LeaveService
│
├── Models (Django ORM)
│   ├── User
│   ├── Employee
│   ├── Attendance
│   └── Leave
│
├── Utils
│   ├── email
│   ├── pagination
│   └── response
│
└── Config
    ├── settings.py
    ├── urls.py
    └── wsgi.py
```

## Data Flow

### Authentication Flow
```
1. User enters credentials → Frontend
2. Frontend sends POST /auth/login → Backend
3. Backend validates credentials → Database
4. Database returns user data → Backend
5. Backend generates JWT token
6. Backend sends token + user data → Frontend
7. Frontend stores token in localStorage
8. Frontend redirects to Dashboard
```

### API Request Flow
```
1. User action triggers API call → Frontend
2. Axios adds JWT token to headers
3. Request sent to Backend API
4. Rate Limiter checks request count
5. Authenticate middleware verifies JWT
6. Authorize middleware checks permissions
7. Validator checks input data
8. Controller receives request
9. Service performs business logic
10. Database query executed
11. Response formatted
12. Response sent to Frontend
13. Frontend updates UI
```

## Security Layers

```
┌─────────────────────────────────────┐
│   Security Layer 1: Network         │
│   • CORS policies                   │
│   • Rate limiting                   │
│   • Django SecurityMiddleware       │
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│   Security Layer 2: Authentication  │
│   • JWT token verification          │
│   • Token expiration                │
│   • Django password hashing         │
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│   Security Layer 3: Authorization   │
│   • Role-based access control       │
│   • Permission checking             │
│   • Multi-tenant isolation          │
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│   Security Layer 4: Input           │
│   • Serializer validation (DRF)    │
│   • Type checking (Python typing)   │
│   • SQL injection prevention (ORM)  │
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│   Security Layer 5: Data            │
│   • Encrypted passwords             │
│   • Audit logging                   │
│   • Soft deletes                    │
└─────────────────────────────────────┘
```

## Deployment Architecture

### Docker Compose Setup
```
┌─────────────────────────────────────────────────────────┐
│                    Docker Host                          │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Frontend Container (nginx:alpine)                  │ │
│  │  Port: 3000 → 80                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Backend Container (python:3.9-slim)                │ │
│  │  Port: 8000                                         │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  PostgreSQL Container (postgres:13-alpine)          │ │
│  │  Port: 5432                                         │ │
│  │  Volume: postgres_data                              │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Redis Container (redis:7-alpine)                   │ │
│  │  Port: 6379                                         │ │
│  │  Volume: redis_data                                 │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Network: hr_network (bridge)                           │
└─────────────────────────────────────────────────────────┘
```

## Database Schema Overview

### Core Tables
```
Organizations
    ├── Companies
    ├── Users
    │   ├── UserRoles
    │   └── PasswordResetTokens
    └── Employees
        ├── Departments
        ├── Designations
        ├── Locations
        ├── Attendance
        │   └── AttendanceRegularizations
        ├── LeaveApplications
        │   └── LeaveTypes
        └── LeaveBalances
```

### Multi-tenant Structure
```
Every table has:
- organization_id (tenant isolation)
- is_deleted (soft delete)
- created_at, updated_at (audit)
```

## Technology Stack

### Frontend Stack
```
React 18 (UI Library)
    ├── TypeScript (Type Safety)
    ├── Vite (Build Tool)
    ├── Material-UI (Components)
    ├── React Router (Navigation)
    ├── Zustand (State)
    ├── React Query (Data Fetching)
    ├── Axios (HTTP Client)
    └── React Hot Toast (Notifications)
```

### Backend Stack
```
Django 4.2+ (Web Framework)
    ├── Python 3.9+ (Language)
    ├── Django REST Framework (API)
    ├── PostgreSQL 13+ (Database)
    ├── Redis 7+ (Cache)
    ├── Django ORM (Database Access)
    ├── JWT (djangorestframework-simplejwt)
    ├── DRF Serializers (Validation)
    ├── Python logging (Logging)
    ├── Celery (Task Queue)
    └── Daphne/ASGI (WebSockets)
```

## Scalability Considerations

### Horizontal Scaling
```
Load Balancer
    ├── Backend Instance 1
    ├── Backend Instance 2
    └── Backend Instance N
         │
         ├── Shared PostgreSQL (Master/Replica)
         └── Shared Redis (Cluster)
```

### Caching Strategy
```
Request → Check Redis Cache
    ├── Cache Hit → Return cached data
    └── Cache Miss
        ├── Query Database
        ├── Store in Cache
        └── Return data
```

## Monitoring & Logging

### Logging Flow
```
Application Events
    ├── Winston Logger
    ├── File Transport (logs/combined.log)
    ├── File Transport (logs/error.log)
    └── Console Transport (dev only)
```

### Health Checks
```
GET /health
    ├── Check Database Connection
    ├── Check Redis Connection
    └── Return Status
```

## CI/CD Pipeline

```
GitHub Push
    ├── Trigger GitHub Actions
    ├── Install Dependencies
    ├── Run Linter
    ├── Build TypeScript
    ├── Run Tests
    ├── Build Docker Images
    └── Deploy (Production only)
```

---

This architecture supports:
✅ Scalability (horizontal scaling ready)
✅ Security (multiple layers)
✅ Maintainability (clean architecture)
✅ Testability (service layer separation)
✅ Performance (caching, indexing)
✅ Monitoring (logging, health checks)
