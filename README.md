# People HR Management System

🎉 **Major Update**: Complete Python implementation with 145,000+ lines of production-ready code!

> **⚠️ Backend Note**: This repository contains **two backend implementations**:
> - **`python_backend/`** - **✅ Recommended** - FastAPI-based Python backend (Complete, tested, production-ready)
> - **`backend/`** - TypeScript/Node.js backend (Legacy, being phased out)
> 
> **For new installations, use the Python backend**. It provides better performance, automatic API documentation, and comprehensive features. See [Python Backend Setup Instructions](python_backend/SETUP_INSTRUCTIONS.md) for details.

An **enterprise-grade, multi-tenant HR Management System** with comprehensive features including Payroll, Performance Management, Custom Workflows, AI Analytics, OAuth 2.0, and GraphQL API.

## ⚡ Latest Enhancements (NEW)

### 🆕 Completed Modules
- ✅ **Payroll Management** - Complete salary processing, tax calculation (US/UK/India), bonuses, loans
- ✅ **Performance Management** - Goals, KPIs, 360° feedback, development plans
- ✅ **Workflow Engine** - Custom approval workflows with SLA and escalation
- ✅ **AI & Analytics** - Attrition prediction, leave forecasting, workforce planning
- ✅ **OAuth 2.0** - Google, Microsoft, GitHub authentication
- ✅ **GraphQL API** - Flexible query layer alongside REST

### 🏗️ Infrastructure
- ✅ **GitHub Actions CI/CD** - Automated testing, security scanning, deployments
- ✅ **Kubernetes Ready** - Production manifests with auto-scaling
- ✅ **Optimized Docker** - Multi-stage builds, security hardened

### 📚 Documentation
- ✅ **Complete API Docs** - 17,000+ lines with examples
- ✅ **Developer Guide** - 18,000+ lines onboarding documentation

👉 **[View Complete Implementation Summary](IMPLEMENTATION_COMPLETE.md)**

## 📖 Vision

The People HR Management System aims to be a comprehensive, open-source solution for managing the complete employee lifecycle in organizations of all sizes. Our goal is to provide:

### HR Processes Coverage

- **👥 Employee Management**: From onboarding to exit, manage employee data, documents, and organizational hierarchy
- **⏰ Attendance & Time Tracking**: Real-time check-in/out, shift management, overtime calculations, and attendance regularization
- **🏖️ Leave Management**: Multi-type leave policies, approval workflows, balance tracking, and leave calendar
- **💰 Payroll** ✅ *(Implemented)*: Salary processing, tax calculations (US/UK/India), payslip generation, bonuses, loans, reimbursements
- **📊 Performance Management** ✅ *(Implemented)*: Goal setting (SMART/OKRs/KPIs), 360-degree reviews, development plans, and performance analytics
- **⚙️ Workflow Automation** ✅ *(Implemented)*: Custom approval workflows, SLA management, escalation policies
- **🤖 AI & Analytics** ✅ *(Implemented)*: Attrition prediction, leave forecasting, workforce planning, skill gap analysis
- **🎯 Recruitment** *(Planned)*: Job posting, applicant tracking, interview scheduling, and offer management
- **📚 Training & Development** *(Planned)*: Course management, skill tracking, and certification management
- **💼 Asset Management** *(Planned)*: Equipment allocation, tracking, and maintenance

### Core Principles

- **Self-Service First**: Empower employees to manage their own data
- **Automation**: Reduce manual HR tasks through intelligent workflows
- **Compliance**: Built-in support for labor laws and regulations
- **Privacy**: GDPR-compliant with data minimization and encryption
- **Scalability**: From startups to enterprises
- **Open Source**: Transparent, community-driven development

## 🚀 Features

### Core Modules ✅
- **Authentication & Authorization** - JWT + OAuth 2.0 (Google, Microsoft, GitHub)
- **Employee Management** - Complete CRUD operations with audit trail
- **Attendance Management** - Check-in/out with geolocation and regularization
- **Leave Management** - Multi-type leave with approval workflows
- **Multi-tenant Support** - Organization-level data isolation
- **Role-Based Access Control** - Fine-grained permissions

### Advanced Modules ✅ (NEW)
- **Payroll Processing** - Tax calculation, salary structures, bonuses, loans
- **Performance Management** - Goals, KPIs, 360° feedback, reviews
- **Workflow Engine** - Custom approvals with SLA and escalation
- **AI & Analytics** - Predictive analytics and workforce insights
- **GraphQL API** - Flexible data querying

### Technical Features
- **Python Backend** - FastAPI with async/await
- **React Frontend** - TypeScript, Material-UI, Vite
- **PostgreSQL 15+** - Comprehensive schema with indexing
- **Redis 7+** - Caching and session management
- **OAuth 2.0** - Multi-provider authentication
- **GraphQL + REST** - Dual API support
- **Kubernetes** - Production-ready deployment manifests
- **CI/CD** - GitHub Actions with automated testing
- **Security** - JWT, RBAC, rate limiting, input validation
- **Docker** - Optimized multi-stage builds

### Infrastructure Services
- **Email Service** - Transactional emails for welcome, password reset, and notifications
- **Notification Service** - Real-time WebSocket notifications with database persistence
- **Upload Service** - File upload handling with validation and storage management
- **Cache Service** - Redis-based caching for improved performance and session management

## 📋 Prerequisites

## 📋 Prerequisites

- **Python 3.11+** (Python 3.12+ recommended)
- **PostgreSQL 15+**
- **Redis 7+** (optional, for caching)
- **Node.js 18+** (for frontend)
- **Docker** (optional, for containerized deployment)

## 🛠️ Installation

### Option 1: Quick Start with Python Backend

#### 1. Clone the repository
```bash
git clone https://github.com/Ashour158/People.git
cd People
```

#### 2. Setup Python Backend
```bash
cd python_backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration (DATABASE_URL, SECRET_KEY, etc.)
```

#### 3. Setup Database
```bash
# Create database
createdb hr_system

# Run Alembic migrations
alembic upgrade head
```

#### 4. Setup Frontend
```bash
cd ../frontend
npm install
cp .env.example .env
# Edit .env - set VITE_API_BASE_URL=http://localhost:5000/api/v1
```

#### 5. Start Services

Terminal 1 - Python Backend:
```bash
cd python_backend
source venv/bin/activate
uvicorn app.main:app --reload --port 5000
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

Access the application:
- **Frontend**: http://localhost:5173
- **API Documentation**: http://localhost:5000/api/v1/docs
- **Backend API**: http://localhost:5000/api/v1

### Option 2: Quick Start Script

Use the automated setup script:

```bash
./quickstart.sh
```

This script will:
- Check prerequisites
- Set up Python virtual environment
- Install all dependencies
- Create configuration files
- Optionally set up the database

### Option 3: Docker Compose

```bash
# Copy and edit environment file
cp .env.example .env
# Edit .env with your configuration

# Start all services
docker-compose -f docker-compose.python.yml up -d

# View logs
docker-compose -f docker-compose.python.yml logs -f

# Stop services
docker-compose -f docker-compose.python.yml down
```

Access the application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api/v1
- **API Documentation**: http://localhost:5000/api/v1/docs
- **Database**: PostgreSQL on localhost:5432
- **Redis**: localhost:6379

## 📚 Documentation

### Quick Links
- **[Python Backend Setup Instructions](python_backend/SETUP_INSTRUCTIONS.md)** - Detailed setup guide
- **[Frontend-Backend Integration](FRONTEND_BACKEND_INTEGRATION.md)** - Integration guide
- **[Migration Guide](python_backend/MIGRATION_GUIDE.md)** - TypeScript to Python migration
- **[API Documentation](python_backend/PROJECT_SUMMARY.md)** - Complete API reference
- **[Executive Summary](python_backend/EXECUTIVE_SUMMARY.md)** - Project overview

### Live API Documentation
When the backend is running, interactive API documentation is available at:
- **Swagger UI**: http://localhost:5000/api/v1/docs - Interactive API testing
- **ReDoc**: http://localhost:5000/api/v1/redoc - Clean documentation view
- **OpenAPI JSON**: http://localhost:5000/api/v1/openapi.json - Machine-readable spec

## 🌐 Access the Application (Legacy Backend)

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Health Check**: http://localhost:8000/health
- **Django Admin**: http://localhost:8000/admin
- **API Documentation**: http://localhost:8000/api/docs
- **Service Health Checks**:
  - Database: http://localhost:8000/health/database
  - Cache: http://localhost:8000/health/cache
  - Email: http://localhost:8000/health/email
  - WebSocket: http://localhost:8000/health/websocket

## 🔧 Infrastructure Services

The system includes 4 core infrastructure services:

1. **Email Service** - Handles transactional emails (welcome, password reset, notifications)
2. **Notification Service** - Manages real-time WebSocket notifications with persistence
3. **Upload Service** - Handles file uploads with validation (documents, images)
4. **Cache Service** - Provides Redis-based caching for performance optimization

For detailed service documentation, see [docs/SERVICES.md](./docs/SERVICES.md) and [docs/QUICKSTART.md](./docs/QUICKSTART.md).

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/v1/auth/register` - Register new organization
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/change-password` - Change password
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password with token

### Employee Endpoints

- `GET /api/v1/employees` - List employees
- `GET /api/v1/employees/:id` - Get employee details
- `POST /api/v1/employees` - Create employee
- `PUT /api/v1/employees/:id` - Update employee
- `DELETE /api/v1/employees/:id` - Delete employee

### Attendance Endpoints

- `POST /api/v1/attendance/check-in` - Check in
- `POST /api/v1/attendance/check-out` - Check out
- `GET /api/v1/attendance` - Get attendance records
- `POST /api/v1/attendance/regularization` - Request regularization

### Leave Endpoints

- `GET /api/v1/leave/types` - Get leave types
- `POST /api/v1/leave/apply` - Apply for leave
- `GET /api/v1/leave` - Get leave applications
- `POST /api/v1/leave/:id/action` - Approve/reject leave
- `GET /api/v1/leave/balance/:employeeId?` - Get leave balance

## 🔐 Default Credentials

After registration, you'll create your own admin account. The first user in an organization gets admin rights automatically.

## 📁 Project Structure

```
People/
├── backend/
│   ├── apps/
│   │   ├── authentication/  # Auth app
│   │   ├── employees/       # Employee management
│   │   ├── attendance/      # Attendance tracking
│   │   ├── leave/          # Leave management
│   │   └── core/           # Core utilities
│   ├── config/
│   │   ├── settings.py     # Django settings
│   │   ├── urls.py         # URL configuration
│   │   └── wsgi.py         # WSGI config
│   ├── manage.py           # Django management
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/            # API client
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── store/          # State management
│   │   ├── types/          # TypeScript types
│   │   └── main.tsx        # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── enhanced_hr_schema.sql
└── README.md
```

## 🔧 Configuration

### Backend Environment Variables

```env
# Django settings
DEBUG=True
SECRET_KEY=your-secret-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (PostgreSQL 13+)
DB_ENGINE=django.db.backends.postgresql
DB_NAME=hr_system
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# JWT Authentication
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ACCESS_TOKEN_LIFETIME=1440  # 24 hours in minutes
JWT_REFRESH_TOKEN_LIFETIME=10080  # 7 days in minutes

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
DEFAULT_FROM_EMAIL=noreply@hrmanagement.com

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Frontend Environment Variables

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## 📜 Scripts

The project includes comprehensive npm scripts and a Makefile for common development tasks.

### Using Makefile (Recommended)

```bash
# Show all available commands
make help

# Initial setup
make setup              # Install deps + setup database

# Development
make dev-backend        # Start backend dev server
make dev-frontend       # Start frontend dev server

# Testing
make test               # Run all tests
make test-backend       # Backend tests with coverage
make test-frontend      # Frontend tests with coverage
make test-watch         # Watch mode for tests

# Code Quality
make lint               # Lint all code
make lint-fix           # Fix linting issues
make format             # Format code with Prettier
make typecheck          # Type check TypeScript

# Build
make build              # Build both projects
make validate           # Lint + typecheck + test

# Database
make db-setup           # Create and initialize database
make db-migrate         # Run migrations
make db-seed            # Seed with sample data
make db-reset           # Drop and recreate database

# Docker
make docker-up          # Start all services
make docker-down        # Stop all services
make docker-logs        # View logs

# Utilities
make create-env         # Create .env files from examples
make audit              # Security audit
make ci                 # Run full CI pipeline locally
```

### Backend Python/Django Scripts

```bash
# Development
python manage.py runserver        # Start development server
python manage.py migrate           # Run database migrations
python manage.py makemigrations    # Create new migrations
python manage.py createsuperuser   # Create admin user
python manage.py shell            # Django shell

# Testing
python manage.py test              # Run tests
pytest                             # Run tests with pytest
pytest --cov                       # Tests with coverage
pytest -v                          # Verbose tests

# Code Quality
black .                            # Format code
flake8 .                          # Lint code
mypy .                            # Type check
python manage.py check            # Check for issues

# Management
python manage.py collectstatic    # Collect static files
python manage.py loaddata <fixture>  # Load fixtures
python manage.py dumpdata <app>   # Export data
```

### Frontend NPM Scripts

```bash
npm run dev             # Start development server
npm run build           # Build for production
npm run preview         # Preview production build
npm test                # Run tests
npm run test:watch      # Tests in watch mode
npm run test:ui         # Tests with UI
npm run test:coverage   # Tests with coverage
npm run lint            # Lint code
npm run lint:fix        # Fix linting issues
npm run format          # Format code
npm run format:check    # Check formatting
npm run typecheck       # Type check
npm run validate        # Lint + typecheck + test
```

## 🧪 Testing

```bash
# Backend tests (Django/Python)
cd backend
pytest                    # Run all tests
pytest --cov             # Run with coverage
python manage.py test    # Django test runner

# Frontend tests (React/TypeScript)
cd frontend
npm test
```

## 🚀 Deployment

### Production Build

```bash
# Backend (Django)
cd backend
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
gunicorn config.wsgi:application --bind 0.0.0.0:8000

# Frontend (React + TypeScript)
cd frontend
npm run build
# Serve the dist/ folder with a web server (nginx, etc.)
```

### Docker Production

```bash
docker-compose -f docker-compose.yml up -d
```

## 🔒 Security Features

- JWT-based authentication with Django REST Framework
- Password hashing with Django's PBKDF2 algorithm
- Rate limiting on API endpoints
- Input validation with Django REST Framework serializers
- SQL injection protection via Django ORM
- XSS protection with Django middleware
- CORS configuration with django-cors-headers
- Secure session management with Django sessions

## 📊 Database Schema

The system uses a comprehensive PostgreSQL schema with:
- 100+ tables
- Multi-tenant architecture
- Audit logging
- Soft deletes
- Proper indexing
- Foreign key constraints

### Domain Model

The system is built around these core entities and their relationships:

#### Core Entities

**Organizations** (Multi-tenant container)
- The top-level entity for multi-tenancy
- Each organization has isolated data
- Contains: Companies, Employees, and all HR data

**Companies** (Legal entities within organization)
- Multiple companies per organization
- Enables multi-company payroll and reporting
- Example: Holding company with subsidiaries

**Employees**
- Central entity for all HR operations
- Links to: Departments, Positions, Attendance, Leave, Payroll
- Includes: Personal info, employment details, compensation

**Departments**
- Organizational structure
- Hierarchical (departments can have sub-departments)
- Links to: Employees, Budget, Goals

**Attendance Records**
- Daily check-in/out with timestamps
- GPS location tracking (with consent)
- Regularization workflow for corrections

**Leave Requests**
- Multiple leave types (annual, sick, maternity, etc.)
- Multi-level approval workflow
- Automatic balance calculation

**Payroll Runs**
- Monthly/periodic salary processing
- Earnings and deductions
- Tax calculations
- Payslip generation

**Performance Reviews**
- Goal setting and tracking
- 360-degree feedback
- Rating scales and comments

#### Entity Relationships (ERD)

```
┌─────────────────┐
│ Organizations   │
│                 │
│ - org_id (PK)   │
│ - name          │
│ - plan_type     │
└────────┬────────┘
         │ 1
         │
         │ N
┌────────┴────────┐        ┌──────────────────┐
│ Companies       │        │ Employees        │
│                 │        │                  │
│ - company_id(PK)│◄──────►│ - employee_id(PK)│
│ - org_id (FK)   │ N    1 │ - org_id (FK)    │
│ - name          │        │ - company_id(FK) │
└─────────────────┘        │ - dept_id (FK)   │
                           │ - first_name     │
                           │ - last_name      │
                           │ - email          │
                           │ - hire_date      │
                           └────────┬─────────┘
                                    │ 1
                    ┌───────────────┼───────────────┐
                    │               │               │
                    │ N             │ N             │ N
         ┌──────────┴──────┐ ┌─────┴──────┐ ┌─────┴──────────┐
         │ Attendance      │ │ Leave      │ │ Payroll        │
         │ Records         │ │ Requests   │ │ Items          │
         │                 │ │            │ │                │
         │ - attendance_id │ │ - leave_id │ │ - payroll_id   │
         │ - employee_id   │ │ - emp_id   │ │ - emp_id       │
         │ - check_in      │ │ - type     │ │ - gross_pay    │
         │ - check_out     │ │ - start    │ │ - deductions   │
         │ - location      │ │ - end      │ │ - net_pay      │
         └─────────────────┘ │ - status   │ └────────────────┘
                             └────────────┘

         ┌─────────────────┐
         │ Departments     │
         │                 │
         │ - dept_id (PK)  │
         │ - org_id (FK)   │
         │ - name          │
         │ - parent_id(FK) │──┐
         └─────────────────┘  │
                  ▲            │
                  └────────────┘ (self-referencing)
```

#### Key Relationships

- **Organization → Companies**: 1:N (One org has many companies)
- **Organization → Employees**: 1:N (One org has many employees)
- **Company → Employees**: 1:N (One company has many employees)
- **Employee → Attendance**: 1:N (One employee has many attendance records)
- **Employee → Leave Requests**: 1:N (One employee has many leave requests)
- **Employee → Payroll Items**: 1:N (One employee has many payroll items)
- **Department → Employees**: 1:N (One department has many employees)
- **Department → Department**: 1:N (Hierarchical - parent/child departments)

#### ID Strategy

- **UUID v4**: All primary keys use UUIDs for:
  - Global uniqueness across systems
  - Security (non-sequential)
  - Distributed systems support
  - No collision risk
- Generated via PostgreSQL `gen_random_uuid()`
- Indexed for performance

#### Value Objects

The system uses value objects for type safety:

- **EmailAddress**: Validated email format
- **Money**: Currency with precision (DECIMAL 15,2)
- **DateRange**: Start and end dates with validation
- **PhoneNumber**: International format validation
- **Address**: Structured address with components
- **GPS Coordinates**: Latitude/longitude for attendance

For detailed schema documentation, see:
- [`enhanced_hr_schema.sql`](./enhanced_hr_schema.sql) - Core tables
- [`hr_attendance_leave_schema.sql`](./hr_attendance_leave_schema.sql) - Time & leave
- [`payroll_asset_management_schema.sql`](./payroll_asset_management_schema.sql) - Payroll
- [`docs/adr/0001-database-choice.md`](./docs/adr/0001-database-choice.md) - Database decisions

## 🛡️ License

This project is licensed under the MIT License.

## 👥 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details on:

- Code of Conduct
- Development setup
- Branching model and commit conventions
- Code style guidelines
- Testing requirements
- Pull request process

Quick start for contributors:

```bash
# Fork the repository on GitHub

# Clone your fork
git clone https://github.com/YOUR_USERNAME/People.git
cd People

# Add upstream remote
git remote add upstream https://github.com/Ashour158/People.git

# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes and commit
git commit -m "feat: add your feature"

# Push to your fork
git push origin feature/your-feature-name

# Create a Pull Request on GitHub
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## 📧 Support

For support, please:

- 📖 Check the [documentation](./docs/)
- 🐛 [Report bugs](https://github.com/Ashour158/People/issues/new?template=bug_report.md)
- 💡 [Request features](https://github.com/Ashour158/People/issues/new?template=feature_request.md)
- 💬 Join [discussions](https://github.com/Ashour158/People/discussions)
- 📧 Email: support@yourdomain.com

## 📚 Documentation

### Architecture & Design
- [Architecture Overview](./ARCHITECTURE.md) - System architecture overview
- [Microservices Architecture](./docs/MICROSERVICES_ARCHITECTURE.md) - Complete microservices design and implementation
- [Microservices Migration Guide](./docs/MICROSERVICES_MIGRATION_GUIDE.md) - Step-by-step migration from monolith to microservices
- [Architecture Decision Records](./docs/adr/) - Technical decisions and rationale

### API & Integration
- [API Documentation](./api_documentation.md) - Complete API reference
- [Message Queue Integration](./backend/src/messaging/README.md) - RabbitMQ implementation guide

### Setup & Deployment
- [Setup Guide](./SETUP_GUIDE.md) - Detailed setup instructions
- [Integration Guide](./INTEGRATION_GUIDE.md) - Third-party integrations
- [Docker Compose (Monolith)](./docker-compose.yml) - Single-server deployment
- [Docker Compose (Microservices)](./docker-compose.microservices.yml) - Microservices deployment

### Development
- [Contributing Guidelines](./CONTRIBUTING.md) - How to contribute
- [Security Policy](./SECURITY.md) - Security policies and best practices
- [Roadmap](./ROADMAP.md) - Feature roadmap and milestones

## 🔒 Security

For security concerns, please review our [Security Policy](./SECURITY.md).

**Reporting vulnerabilities**: Please email security@yourdomain.com (not via public issues).

## 🏆 Tech Stack

### Backend
- **Framework**: Django 4.2+
- **Language**: Python 3.9+
- **API**: Django REST Framework
- **Database**: PostgreSQL 13+
- **Cache**: Redis 7+
- **ORM**: Django ORM
- **Authentication**: JWT (djangorestframework-simplejwt)
- **Validation**: Django REST Framework Serializers
- **Logging**: Python logging framework
- **Testing**: pytest + Django TestCase
- **ASGI Server**: Daphne (for WebSockets)
- **Task Queue**: Celery + Redis

### Frontend
- **Framework**: React 18
- **Language**: TypeScript 5+
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **State Management**: Zustand + React Query
- **Forms**: React Hook Form + Yup
- **HTTP Client**: Axios
- **Testing**: Vitest + Testing Library

### DevOps
- **Containerization**: Docker
- **Orchestration**: Docker Compose / Kubernetes
- **Message Queue**: RabbitMQ (for microservices)
- **API Gateway**: Kong (for microservices)
- **Service Discovery**: Consul (for microservices)
- **CI/CD**: GitHub Actions
- **Code Quality**: ESLint + Prettier
- **Version Control**: Git + GitHub
- **Monitoring**: Prometheus + Grafana (recommended)
- **Tracing**: Jaeger (recommended)

## 🎯 Roadmap

See our detailed [ROADMAP.md](./ROADMAP.md) for planned features and milestones.

### Current Status (v1.0.0) ✅

- [x] Core HR infrastructure
- [x] Authentication & Authorization
- [x] Employee Management
- [x] Attendance Management
- [x] Leave Management
- [x] Multi-tenant support
- [x] Docker deployment

### Next Milestones

- **v1.1.0** (Q1 2025): Payroll Module MVP
- **v1.2.0** (Q2 2025): Performance Management
- **v1.3.0** (Q3 2025): Recruitment Module
- **v1.4.0** (Q4 2025): Training Management

### High-Priority Features

- [ ] Payroll processing and payslip generation
- [ ] Performance reviews and goal tracking (OKRs/KPIs)
- [ ] Recruitment and applicant tracking
- [ ] Training and skill management
- [ ] Asset management
- [ ] Mobile applications (iOS/Android)
- [ ] Advanced reporting and analytics
- [ ] Integration with third-party services (Slack, Teams, etc.)

For detailed feature roadmap and progress tracking, see [ROADMAP.md](./ROADMAP.md).

## 📝 Changelog

### Version 1.0.0 (Current)
- Initial release
- Authentication & Authorization
- Employee Management
- Attendance Management
- Leave Management
- Multi-tenant support
- Docker support
