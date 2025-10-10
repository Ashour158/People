# Testing Strategy & Implementation Guide

## Overview

This document outlines the comprehensive testing strategy for the HR Management System, including test coverage goals, testing frameworks, and implementation guidelines.

## Current Test Coverage

As of the latest analysis:
- **Python Backend**: ~10-15% coverage (Target: 80%)
- **Frontend (React)**: ~0-5% coverage (Target: 70%)
- **Integration Tests**: Minimal (Target: Full API coverage)
- **E2E Tests**: Not implemented (Target: Critical user flows)

## Testing Pyramid

```
           /\
          /E2E\         10% - End-to-end tests (Playwright/Cypress)
         /------\
        /Integration\   30% - Integration tests (API, DB, services)
       /------------\
      /    Unit      \  60% - Unit tests (pytest, Vitest)
     /--------------\
```

## Test Coverage Targets by Module

| Module | Unit Tests | Integration Tests | E2E Tests | Total Target |
|--------|-----------|-------------------|-----------|--------------|
| Authentication | 100% | 100% | 100% | 100% |
| Authorization/RBAC | 100% | 100% | 80% | 95% |
| Employee Management | 90% | 80% | 60% | 85% |
| Attendance | 85% | 80% | 60% | 80% |
| Leave Management | 85% | 80% | 60% | 80% |
| Payroll | 95% | 70% | 50% | 85% |
| Performance | 80% | 60% | 40% | 75% |
| Recruitment | 80% | 60% | 40% | 75% |
| Analytics/Reporting | 75% | 60% | 30% | 70% |
| Workflows | 85% | 70% | 40% | 80% |

## Python Backend Testing

### Framework: pytest + pytest-asyncio

#### Test Structure
```
python_backend/tests/
├── conftest.py                 # Shared fixtures and configuration
├── __init__.py
├── unit/                       # Unit tests (60% of tests)
│   ├── test_auth_utils.py
│   ├── test_validators.py
│   ├── test_models.py
│   └── test_services.py
├── integration/                # Integration tests (30% of tests)
│   ├── test_auth_api.py
│   ├── test_employee_api.py
│   ├── test_attendance_api.py
│   └── test_leave_api.py
└── performance/                # Performance tests (10% of tests)
    ├── test_load.py
    └── test_stress.py
```

### Running Tests

```bash
# Run all tests
cd python_backend
pytest

# Run with coverage
pytest --cov=app --cov-report=html --cov-report=term-missing

# Run specific test file
pytest tests/test_auth.py

# Run specific test
pytest tests/test_auth.py::TestAuthentication::test_login_success

# Run with markers
pytest -m "unit"           # Only unit tests
pytest -m "integration"    # Only integration tests
pytest -m "not slow"       # Exclude slow tests

# Run in parallel (faster)
pytest -n auto

# Run with verbose output
pytest -v -s
```

### Test Coverage Commands

```bash
# Generate HTML coverage report
pytest --cov=app --cov-report=html
# Open htmlcov/index.html in browser

# Generate XML for CI/CD
pytest --cov=app --cov-report=xml

# Fail if coverage below threshold
pytest --cov=app --cov-fail-under=80
```

## Frontend Testing

### Framework: Vitest + React Testing Library

#### Test Structure
```
frontend/src/tests/
├── setup.ts                    # Test configuration
├── test-utils.tsx              # Custom render helpers
├── mocks/                      # API mocks
│   ├── handlers.ts             # MSW request handlers
│   └── server.ts               # MSW server setup
├── components/                 # Component tests
│   ├── Layout.test.tsx
│   └── ProtectedRoute.test.tsx
├── pages/                      # Page tests
│   ├── Login.test.tsx
│   ├── Register.test.tsx
│   ├── Dashboard.test.tsx
│   └── Employees.test.tsx
├── hooks/                      # Custom hook tests
│   └── useAuth.test.ts
└── utils/                      # Utility tests
    └── validators.test.ts
```

### Running Tests

```bash
# Run all tests
cd frontend
npm test

# Run in watch mode
npm run test:watch

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Run specific test file
npm test Login.test.tsx

# Update snapshots
npm test -- -u
```

## Test Writing Guidelines

### Python Backend Tests

#### Example: Unit Test
```python
import pytest
from app.utils.validators import validate_email

@pytest.mark.unit
class TestValidators:
    def test_valid_email(self):
        assert validate_email("user@example.com") is True
    
    def test_invalid_email(self):
        assert validate_email("invalid-email") is False
```

#### Example: Integration Test
```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
@pytest.mark.integration
async def test_create_employee(authenticated_client: AsyncClient):
    response = await authenticated_client.post(
        "/api/v1/employees",
        json={
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "hire_date": "2024-01-15"
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "john.doe@example.com"
```

### Frontend Tests

#### Example: Component Test
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import Login from '../../pages/auth/Login';

describe('Login Page', () => {
  it('renders login form', () => {
    render(<Login />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});
```

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on:
- Every pull request
- Push to main/develop branches
- Manual workflow dispatch

### Test Gates

Pull requests are blocked if:
- ❌ Tests fail
- ❌ Coverage drops below threshold (currently 20%, targeting 80%)
- ❌ Linting errors exist
- ❌ Security vulnerabilities found

### Coverage Reporting

- Coverage reports uploaded to Codecov
- HTML reports generated in CI artifacts
- Coverage badge in README
- PR comments with coverage diff

## Performance Testing

### Load Testing with Locust

```python
# locustfile.py
from locust import HttpUser, task, between

class HRSystemUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login
        response = self.client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        self.token = response.json()["access_token"]
        self.client.headers["Authorization"] = f"Bearer {self.token}"
    
    @task(3)
    def list_employees(self):
        self.client.get("/api/v1/employees")
    
    @task(1)
    def create_leave_request(self):
        self.client.post("/api/v1/leave/requests", json={
            "leave_type": "ANNUAL",
            "start_date": "2024-02-01",
            "end_date": "2024-02-05"
        })
```

Run load tests:
```bash
locust -f locustfile.py --host=http://localhost:8000
```

## Test Data Management

### Fixtures (Python)

Shared test data defined in `conftest.py`:
- `test_organization`: Test organization entity
- `test_user`: Test user with admin role
- `test_employee`: Test employee entity
- `authenticated_client`: HTTP client with auth token

### Mock Data (Frontend)

Mock API responses with MSW (Mock Service Worker):
- Handlers defined in `src/tests/mocks/handlers.ts`
- Consistent mock data across all tests
- Easy to customize per test

## Best Practices

### Do's ✅
- Write tests before fixing bugs
- Test edge cases and error conditions
- Use descriptive test names
- Keep tests independent and isolated
- Mock external dependencies
- Test business logic thoroughly
- Use fixtures/factories for test data
- Run tests locally before committing

### Don'ts ❌
- Don't test implementation details
- Don't write flaky tests
- Don't skip test cleanup
- Don't hardcode test data
- Don't test framework code
- Don't ignore failing tests
- Don't commit without running tests

## Continuous Improvement

### Weekly Goals
- **Week 1**: Set up infrastructure, achieve 30% coverage
- **Week 2**: Add integration tests, achieve 50% coverage
- **Week 3**: Add E2E tests, achieve 70% coverage
- **Week 4**: Optimize tests, achieve 80% coverage

### Monthly Review
- Review test coverage metrics
- Identify untested code paths
- Update test documentation
- Refactor flaky tests
- Optimize test performance

## Resources

### Documentation
- [pytest Documentation](https://docs.pytest.org/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [MSW Documentation](https://mswjs.io/)

### Tools
- **Coverage**: pytest-cov, vitest coverage
- **Mocking**: pytest-mock, MSW
- **Load Testing**: Locust
- **E2E Testing**: Playwright/Cypress (to be implemented)

## Support

For questions or issues with testing:
1. Check this documentation
2. Review existing tests for examples
3. Ask in team chat/Slack
4. Create an issue in GitHub

---

Last Updated: January 2025
