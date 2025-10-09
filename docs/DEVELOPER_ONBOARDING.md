# Developer Onboarding Guide - HR Management System

Welcome to the HR Management System development team! This guide will help you get started with contributing to our codebase.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Development Environment Setup](#development-environment-setup)
4. [Architecture Overview](#architecture-overview)
5. [Code Structure](#code-structure)
6. [Development Workflow](#development-workflow)
7. [Testing](#testing)
8. [Best Practices](#best-practices)
9. [Common Tasks](#common-tasks)
10. [Troubleshooting](#troubleshooting)

## Project Overview

The HR Management System is an enterprise-grade, multi-tenant platform for comprehensive human resource management. It provides:

- **Employee Management**: Complete employee lifecycle management
- **Attendance & Leave**: Time tracking and leave management
- **Payroll**: Comprehensive payroll processing with tax calculations
- **Performance**: Goals, KPIs, reviews, and 360-degree feedback
- **Workflows**: Custom approval workflows with SLA management
- **AI Analytics**: ML-powered insights and predictive analytics
- **OAuth 2.0**: Multi-provider authentication
- **GraphQL**: Flexible query layer alongside REST API

## Technology Stack

### Backend (Python)
- **Framework**: FastAPI 0.109+
- **Language**: Python 3.11+
- **Database**: PostgreSQL 15+
- **ORM**: SQLAlchemy 2.0 (async)
- **Cache**: Redis 7+
- **Task Queue**: Celery
- **Authentication**: JWT + OAuth 2.0
- **GraphQL**: Strawberry GraphQL
- **Testing**: pytest, pytest-asyncio
- **Linting**: Black, Ruff, MyPy

### Frontend (React)
- **Framework**: React 18+
- **Language**: TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI
- **State Management**: Zustand + React Query
- **Forms**: React Hook Form

### DevOps
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana

## Development Environment Setup

### Prerequisites

1. **Install Python 3.11+**
   ```bash
   python --version  # Should be 3.11 or higher
   ```

2. **Install PostgreSQL 15+**
   ```bash
   # macOS
   brew install postgresql@15
   
   # Ubuntu
   sudo apt install postgresql-15
   
   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

3. **Install Redis 7+**
   ```bash
   # macOS
   brew install redis
   
   # Ubuntu
   sudo apt install redis
   
   # Windows
   # Download from https://redis.io/download
   ```

4. **Install Docker** (optional, for containerized development)
   ```bash
   # Download from https://www.docker.com/products/docker-desktop
   ```

### Clone Repository

```bash
git clone https://github.com/Ashour158/People.git
cd People/python_backend
```

### Setup Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate
```

### Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install development dependencies
pip install black ruff mypy pytest pytest-asyncio pytest-cov
```

### Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your preferred editor
```

**Required Environment Variables:**
```env
# Database
DATABASE_URL=postgresql://hr_user:hr_password@localhost:5432/hr_system

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this
SECRET_KEY=your-super-secret-key-change-this

# API Configuration
API_VERSION=v1
ENVIRONMENT=development
DEBUG=true
PORT=5000

# CORS
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]

# OAuth (optional for development)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Setup Database

```bash
# Create database
createdb hr_system

# Or using psql
psql -U postgres
CREATE DATABASE hr_system;
CREATE USER hr_user WITH PASSWORD 'hr_password';
GRANT ALL PRIVILEGES ON DATABASE hr_system TO hr_user;
\q

# Run migrations (if using Alembic)
alembic upgrade head
```

### Start Development Servers

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start PostgreSQL (if not running as service)
postgres -D /usr/local/var/postgres

# Terminal 3: Start FastAPI server
cd python_backend
uvicorn app.main:app --reload --port 5000
```

### Verify Installation

1. Open browser to `http://localhost:5000/docs`
2. You should see the Swagger UI documentation
3. Try the `/health` endpoint to verify system is running

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Applications                  │
│  (Web Browser, Mobile App, External Systems)            │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ HTTPS/REST/GraphQL
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    API Gateway / Load Balancer           │
│              (Nginx, Kong, or Kubernetes Ingress)        │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI Application Layer               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  API Routes (v1)                                  │   │
│  │  - /auth, /employees, /attendance, /leave        │   │
│  │  - /payroll, /performance, /workflows            │   │
│  │  - /analytics, /oauth, /graphql                  │   │
│  └──────────────┬────────────────────────────────────┘   │
│                 │                                         │
│  ┌──────────────▼────────────────────────────────────┐   │
│  │  Middleware                                        │   │
│  │  - Authentication (JWT)                           │   │
│  │  - Authorization (RBAC)                           │   │
│  │  - Rate Limiting                                  │   │
│  │  - Error Handling                                 │   │
│  │  - Logging & Correlation IDs                      │   │
│  └──────────────┬────────────────────────────────────┘   │
│                 │                                         │
│  ┌──────────────▼────────────────────────────────────┐   │
│  │  Business Logic Services                          │   │
│  │  - Employee Service, Payroll Service              │   │
│  │  - Performance Service, Workflow Engine           │   │
│  │  - AI Analytics Service                           │   │
│  └──────────────┬────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────┘
                  │
     ┌────────────┼────────────┐
     │            │            │
     ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│PostgreSQL│  │  Redis  │  │RabbitMQ │
│   (DB)   │  │ (Cache) │  │ (Queue) │
└─────────┘  └─────────┘  └─────────┘
```

### Request Flow

1. **Client Request** → API Gateway
2. **Authentication** → JWT validation
3. **Authorization** → RBAC permission check
4. **Rate Limiting** → Check request limits
5. **Business Logic** → Execute service method
6. **Data Access** → Query/update database
7. **Cache** → Redis for frequently accessed data
8. **Events** → Dispatch events to message queue
9. **Response** → Return standardized JSON

## Code Structure

```
python_backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py              # Authentication endpoints
│   │   │   │   ├── employees.py         # Employee management
│   │   │   │   ├── attendance.py        # Attendance tracking
│   │   │   │   ├── leave.py             # Leave management
│   │   │   │   ├── payroll.py          # Payroll processing ⭐
│   │   │   │   ├── performance.py      # Performance management ⭐
│   │   │   │   ├── workflows.py        # Workflow engine ⭐
│   │   │   │   ├── oauth.py            # OAuth 2.0 ⭐
│   │   │   │   ├── graphql_api.py      # GraphQL API ⭐
│   │   │   │   └── ai_analytics.py     # AI & Analytics ⭐
│   │   │   └── router.py               # API router
│   │   └── __init__.py
│   ├── core/
│   │   ├── config.py                   # Configuration
│   │   ├── security.py                 # Security utilities
│   │   ├── logger.py                   # Logging setup
│   │   └── redis_client.py             # Redis client
│   ├── db/
│   │   ├── database.py                 # Database connection
│   │   └── __init__.py
│   ├── models/
│   │   ├── models.py                   # SQLAlchemy models
│   │   └── __init__.py
│   ├── schemas/
│   │   ├── schemas.py                  # Pydantic schemas
│   │   └── __init__.py
│   ├── middleware/
│   │   ├── auth.py                     # Auth middleware
│   │   ├── rate_limiter.py             # Rate limiting
│   │   └── error_handler.py            # Error handling
│   ├── services/
│   │   ├── email_service.py            # Email service
│   │   ├── notification_service.py     # Notifications
│   │   └── upload_service.py           # File uploads
│   ├── events/
│   │   └── event_dispatcher.py         # Event dispatcher
│   ├── utils/
│   │   ├── datetime_utils.py           # Date/time utilities
│   │   ├── pagination.py               # Pagination helpers
│   │   └── response.py                 # Response helpers
│   ├── main.py                         # Application entry point
│   └── celery_app.py                   # Celery configuration
├── tests/
│   ├── test_auth.py
│   ├── test_employees.py
│   └── conftest.py                     # Test fixtures
├── .env.example
├── requirements.txt
├── pytest.ini
├── Dockerfile
└── README.md
```

## Development Workflow

### 1. Pick a Task

- Check GitHub Issues
- Look for issues labeled "good first issue"
- Assign yourself to the issue

### 2. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b bugfix/bug-description
```

### 3. Write Code

Follow the coding standards outlined in [Best Practices](#best-practices).

### 4. Write Tests

```python
# tests/test_your_feature.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_your_feature():
    response = client.get("/api/v1/your-endpoint")
    assert response.status_code == 200
    assert response.json()["success"] == True
```

### 5. Run Tests Locally

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py

# Run with coverage
pytest --cov=app --cov-report=html
```

### 6. Format and Lint Code

```bash
# Format code with Black
black app/ tests/

# Lint with Ruff
ruff check app/ tests/

# Type check with MyPy
mypy app/ --ignore-missing-imports
```

### 7. Commit Changes

```bash
git add .
git commit -m "feat: add your feature description"
```

**Commit Message Convention:**
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `test:` tests
- `refactor:` code refactoring
- `chore:` maintenance

### 8. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

### 9. Code Review

- Address reviewer feedback
- Update PR with additional commits
- Once approved, PR will be merged

## Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test
pytest tests/test_auth.py::test_login

# Run tests in parallel
pytest -n auto

# Run with coverage
pytest --cov=app --cov-report=html

# Open coverage report
open htmlcov/index.html
```

### Writing Tests

#### Unit Test Example

```python
# tests/test_services.py
import pytest
from app.services.payroll import TaxCalculator
from decimal import Decimal

def test_tax_calculation():
    """Test tax calculation for US federal tax"""
    gross = Decimal('100000')
    tax = TaxCalculator.calculate_us_federal_tax(gross)
    
    assert tax > 0
    assert tax < gross
    assert isinstance(tax, Decimal)
```

#### API Test Example

```python
# tests/test_api.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_employees(auth_headers):
    """Test getting list of employees"""
    response = client.get(
        "/api/v1/employees",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert "employees" in data["data"]
```

## Best Practices

### Python Code Style

1. **Follow PEP 8**
   - Use 4 spaces for indentation
   - Maximum line length: 88 characters (Black default)
   - Use snake_case for variables and functions
   - Use PascalCase for classes

2. **Type Hints**
   ```python
   def calculate_tax(income: Decimal, rate: float) -> Decimal:
       """Calculate tax amount"""
       return income * Decimal(str(rate))
   ```

3. **Docstrings**
   ```python
   def process_payroll(employee_id: str) -> dict:
       """
       Process payroll for an employee.
       
       Args:
           employee_id: UUID of the employee
           
       Returns:
           dict: Payroll calculation results
           
       Raises:
           HTTPException: If employee not found
       """
       pass
   ```

4. **Error Handling**
   ```python
   from fastapi import HTTPException, status
   
   if not employee:
       raise HTTPException(
           status_code=status.HTTP_404_NOT_FOUND,
           detail="Employee not found"
       )
   ```

5. **Async/Await**
   ```python
   async def get_employee(db: AsyncSession, employee_id: str):
       result = await db.execute(
           select(Employee).where(Employee.employee_id == employee_id)
       )
       return result.scalar_one_or_none()
   ```

### Database Best Practices

1. **Always use parameterized queries** (SQLAlchemy handles this)
2. **Filter by organization_id** for multi-tenancy
3. **Use soft deletes** (is_deleted flag)
4. **Add indexes** on foreign keys and frequently queried columns
5. **Use transactions** for multiple operations

```python
async with db.begin():
    # Multiple operations in transaction
    employee = Employee(...)
    db.add(employee)
    
    salary = Salary(...)
    db.add(salary)
    
    # Automatically commits or rolls back
```

### API Design Best Practices

1. **Use appropriate HTTP methods**
   - GET: Retrieve data
   - POST: Create new resource
   - PUT: Update entire resource
   - PATCH: Partial update
   - DELETE: Remove resource

2. **Consistent response format**
   ```python
   return BaseResponse(
       success=True,
       message="Operation successful",
       data={...}
   )
   ```

3. **Input validation with Pydantic**
   ```python
   class EmployeeCreate(BaseModel):
       first_name: str = Field(..., min_length=2, max_length=50)
       email: EmailStr
       hire_date: date
   ```

4. **Pagination for list endpoints**
5. **Use query parameters for filtering**
6. **Return appropriate status codes**

## Common Tasks

### Adding a New Endpoint

1. **Create Pydantic models** in the endpoint file
2. **Define the endpoint function**
   ```python
   @router.post("/your-endpoint", response_model=BaseResponse)
   async def your_endpoint(
       data: YourRequestModel,
       db: AsyncSession = Depends(get_db),
       current_user: dict = Depends(AuthMiddleware.get_current_user)
   ):
       # Implementation
       pass
   ```
3. **Add business logic**
4. **Write tests**
5. **Update API documentation**

### Adding a New Database Model

1. **Define model** in `app/models/models.py`
   ```python
   class YourModel(Base):
       __tablename__ = "your_table"
       
       id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
       organization_id = Column(UUID(as_uuid=True), nullable=False)
       name = Column(String(100), nullable=False)
       created_at = Column(DateTime, default=datetime.utcnow)
   ```

2. **Create Alembic migration**
   ```bash
   alembic revision --autogenerate -m "Add your_table"
   alembic upgrade head
   ```

3. **Add to imports** in `app/models/__init__.py`

### Debugging

#### Using Python Debugger

```python
import pdb; pdb.set_trace()  # Add breakpoint
```

#### Logging

```python
import structlog

logger = structlog.get_logger()
logger.info("Debug message", extra_data="value")
logger.error("Error occurred", exc_info=True)
```

#### View Logs

```bash
# In development
tail -f logs/app.log

# In Docker
docker logs -f container_name
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Check connection
psql -U hr_user -d hr_system

# Reset database
dropdb hr_system
createdb hr_system
alembic upgrade head
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping
# Should return PONG

# Clear Redis cache
redis-cli FLUSHALL
```

### Import Errors

```bash
# Reinstall dependencies
pip install -r requirements.txt

# Clear Python cache
find . -type d -name __pycache__ -exec rm -r {} +
find . -type f -name '*.pyc' -delete
```

### Test Failures

```bash
# Run single test with verbose output
pytest tests/test_file.py::test_function -v -s

# Check test database
psql -U hr_user -d hr_system_test
```

## Next Steps

1. **Explore the codebase**: Start with `app/main.py` and trace through the request flow
2. **Read existing tests**: Understand how different components are tested
3. **Pick a good first issue**: Look for issues labeled "good first issue"
4. **Ask questions**: Don't hesitate to ask in team chat or GitHub discussions
5. **Pair program**: Pair with another developer on your first task

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [pytest Documentation](https://docs.pytest.org/)
- [API Documentation](./API_DOCUMENTATION_COMPLETE.md)

Welcome aboard! 🚀
