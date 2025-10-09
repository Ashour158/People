# Python Backend Setup Instructions

This document provides step-by-step instructions for setting up the Python HR Management System backend.

## Prerequisites

- Python 3.11+ (Python 3.12.3 recommended)
- PostgreSQL 15+
- Redis 7+ (optional, for caching)
- pip and virtualenv

## Quick Start

### 1. Create Virtual Environment

```bash
cd python_backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
- Set `DATABASE_URL` to your PostgreSQL connection string
- Update `SECRET_KEY` and `JWT_SECRET_KEY` with secure random strings
- Configure Redis URL if using caching
- Set CORS origins for your frontend

Example `.env`:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/hr_system
SECRET_KEY=your-secret-key-min-32-chars
JWT_SECRET_KEY=your-jwt-secret-key-min-32-chars
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

### 4. Setup Database

#### Create Database

```bash
# Using psql
psql -U postgres
CREATE DATABASE hr_system;
\q

# Or using createdb command
createdb -U postgres hr_system
```

#### Run Migrations

```bash
# Run all migrations
alembic upgrade head

# Check migration history
alembic history

# Rollback one migration
alembic downgrade -1
```

### 5. Run the Application

#### Development Mode

```bash
uvicorn app.main:app --reload --port 5000
```

#### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 5000 --workers 4
```

### 6. Access API Documentation

Once the server is running:

- **Swagger UI**: http://localhost:5000/api/v1/docs
- **ReDoc**: http://localhost:5000/api/v1/redoc
- **OpenAPI JSON**: http://localhost:5000/api/v1/openapi.json

## Database Migrations

### Creating New Migrations

When you add or modify models:

```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "Description of changes"

# Or create empty migration
alembic revision -m "Description of changes"
```

### Applying Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Apply specific migration
alembic upgrade <revision>

# Rollback to specific revision
alembic downgrade <revision>

# Rollback one migration
alembic downgrade -1
```

### Migration History

```bash
# Show migration history
alembic history

# Show current revision
alembic current

# Show pending migrations
alembic show <revision>
```

## Testing

### Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py

# Run with verbose output
pytest -v
```

### Test Coverage Report

After running tests with coverage, open `htmlcov/index.html` in a browser to view the detailed coverage report.

## Docker Deployment

### Build and Run with Docker

```bash
# Build image
docker build -t hr-management-python .

# Run container
docker run -p 5000:5000 --env-file .env hr-management-python
```

### Docker Compose

```bash
# Start all services (backend, database, redis)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and start
docker-compose up -d --build
```

## Development Workflow

### Code Quality

```bash
# Format code with black
black app/

# Lint with ruff
ruff check app/

# Type checking with mypy
mypy app/

# Run all checks
black app/ && ruff check app/ && mypy app/
```

### Database Operations

```bash
# Drop all tables (development only!)
alembic downgrade base

# Reset database
alembic downgrade base && alembic upgrade head

# Seed test data (if seed script exists)
python scripts/seed_database.py
```

## Troubleshooting

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   pg_isready -h localhost -p 5432
   ```

2. Check database exists:
   ```bash
   psql -U postgres -l | grep hr_system
   ```

3. Test connection:
   ```bash
   psql -U postgres -d hr_system -c "SELECT 1;"
   ```

### Migration Issues

1. Check current revision:
   ```bash
   alembic current
   ```

2. Show all revisions:
   ```bash
   alembic history
   ```

3. If migrations are out of sync:
   ```bash
   # Stamp current version (use with caution)
   alembic stamp head
   ```

### Redis Connection Issues

If Redis is not available, set in `.env`:
```env
REDIS_ENABLED=false
```

### Import Errors

Ensure you're in the virtual environment and have installed all dependencies:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

## Environment Variables Reference

### Required Variables

- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - Application secret key (min 32 characters)
- `JWT_SECRET_KEY` - JWT signing key (min 32 characters)

### Optional Variables

- `PORT` - Server port (default: 5000)
- `DEBUG` - Debug mode (default: true)
- `REDIS_URL` - Redis connection string
- `REDIS_ENABLED` - Enable Redis caching (default: true)
- `CORS_ORIGINS` - Allowed CORS origins (JSON array)
- `SMTP_HOST` - Email server host
- `SMTP_PORT` - Email server port
- `SMTP_USERNAME` - Email username
- `SMTP_PASSWORD` - Email password

See `.env.example` for complete list with defaults.

## Next Steps

1. **Configure Frontend**: Update frontend API base URL to `http://localhost:5000/api/v1`
2. **Seed Initial Data**: Create admin user and test data
3. **Configure Redis**: Set up Redis for caching and session management
4. **Setup Email**: Configure SMTP for notifications
5. **Production Deployment**: Use Kubernetes or Docker Compose for production

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [Project Documentation](./README.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [API Documentation](./PROJECT_SUMMARY.md)
