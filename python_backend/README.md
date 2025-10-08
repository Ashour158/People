# Python HR Management System

A complete, enterprise-grade HR Management System built with Python, FastAPI, and PostgreSQL.

## Features

- **Multi-tenant Architecture**: Complete organization and company isolation
- **RESTful API**: FastAPI with automatic OpenAPI documentation
- **Authentication & Authorization**: JWT-based auth with RBAC
- **Employee Management**: Complete CRUD operations with audit trail
- **Attendance Tracking**: Check-in/out with geolocation support
- **Leave Management**: Multi-type leave with approval workflows
- **Real-time Events**: Event-driven architecture with async processing
- **Caching**: Redis-based caching for improved performance
- **Security**: Password hashing, rate limiting, input validation
- **Logging**: Structured logging with detailed error tracking

## Tech Stack

- **Framework**: FastAPI (async Python web framework)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Caching**: Redis
- **Task Queue**: Celery (for background jobs)
- **Validation**: Pydantic v2
- **Authentication**: JWT (python-jose)
- **Password Hashing**: bcrypt (passlib)
- **Logging**: structlog

## Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- pip and virtualenv

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Ashour158/People.git
cd People/python_backend
```

### 2. Create virtual environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Setup environment variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 5. Setup database

```bash
# Create database
createdb hr_system

# Run migrations (if using Alembic)
alembic upgrade head
```

### 6. Run the application

```bash
# Development
uvicorn app.main:app --reload --port 5000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 5000 --workers 4
```

## API Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:5000/api/v1/docs
- **ReDoc**: http://localhost:5000/api/v1/redoc
- **OpenAPI JSON**: http://localhost:5000/api/v1/openapi.json

## Project Structure

```
python_backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Application entry point
│   ├── core/
│   │   ├── config.py           # Configuration management
│   │   ├── logger.py           # Logging setup
│   │   ├── security.py         # Security utilities
│   │   └── redis_client.py     # Redis client
│   ├── api/
│   │   └── v1/
│   │       ├── router.py       # API router
│   │       └── endpoints/      # API endpoints
│   │           ├── auth.py     # Authentication
│   │           ├── employees.py # Employee management
│   │           ├── attendance.py # Attendance tracking
│   │           └── leave.py    # Leave management
│   ├── db/
│   │   └── database.py         # Database configuration
│   ├── models/
│   │   └── models.py           # SQLAlchemy models
│   ├── schemas/
│   │   └── schemas.py          # Pydantic schemas
│   ├── services/
│   │   └── ...                 # Business logic services
│   ├── middleware/
│   │   ├── auth.py             # Authentication middleware
│   │   ├── error_handler.py   # Error handling
│   │   └── rate_limiter.py    # Rate limiting
│   ├── events/
│   │   └── event_dispatcher.py # Event system
│   └── utils/
│       └── ...                 # Utility functions
├── tests/
│   └── ...                     # Test files
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Docker configuration
├── .env.example                # Environment variables template
└── README.md                   # This file
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register new user and organization
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/password-reset/request` - Request password reset
- `POST /api/v1/auth/password-reset/confirm` - Confirm password reset

### Employees

- `POST /api/v1/employees` - Create employee
- `GET /api/v1/employees` - List employees (with pagination and filters)
- `GET /api/v1/employees/{id}` - Get employee by ID
- `PUT /api/v1/employees/{id}` - Update employee
- `DELETE /api/v1/employees/{id}` - Delete employee (soft delete)

### More endpoints for attendance, leave, payroll, etc. to be implemented

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py
```

## Docker Deployment

```bash
# Build image
docker build -t hr-management-python .

# Run container
docker run -p 5000:5000 --env-file .env hr-management-python
```

## Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Development

### Code Formatting

```bash
# Format code
black app/

# Lint code
ruff check app/

# Type checking
mypy app/
```

### Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "Description"

# Run migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Security

- JWT tokens for authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation with Pydantic
- SQL injection prevention (parameterized queries)
- XSS protection
- CORS configuration
- Multi-tenant data isolation

## License

MIT License

## Support

For issues and questions, please create a GitHub issue.
