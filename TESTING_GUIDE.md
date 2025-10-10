# Testing Strategy & Implementation Guide

## Overview

This document outlines the comprehensive testing strategy for the HR Management System, including test coverage goals, testing frameworks, and implementation guidelines.

## Current Test Coverage

**Latest Update: October 2025**

- **Python Backend**: ~35-40% coverage (Target: 80%)
  - Unit Tests: 19 files with 180+ test cases
  - Integration Tests: 17 files with 160+ test cases
  - Service Tests: 3 files with 15+ test cases
  
- **Frontend (React)**: ~15-20% coverage (Target: 70%)
  - Component Tests: 2 files with 8 test cases
  - Page Tests: 10 files with 52 test cases
  - Hook Tests: 2 files with 8 test cases
  - Utility Tests: 2 files with 18 test cases
  - Store Tests: 1 file with 8 test cases
  
- **Integration Tests**: Good coverage for core modules
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
├── conftest.py                          # Shared fixtures and configuration
├── __init__.py
├── unit/                                # Unit tests (60% of tests)
│   ├── __init__.py
│   ├── test_utils.py                    # Utility function tests (66 cases)
│   ├── test_validators.py               # Input validation tests (70 cases)
│   ├── test_security.py                 # Security utilities tests (35 cases)
│   └── test_middleware.py               # Middleware tests (40 cases)
├── integration/                         # Integration tests (30% of tests)
│   ├── __init__.py
│   ├── test_auth_api.py
│   ├── test_auth_advanced.py
│   ├── test_employee_api.py
│   ├── test_employees_integration.py
│   ├── test_attendance_api.py
│   ├── test_attendance_integration.py
│   ├── test_leave_api.py
│   ├── test_leave_integration.py
│   ├── test_payroll.py
│   ├── test_performance.py
│   ├── test_recruitment.py
│   ├── test_workflows.py
│   ├── test_esignature.py
│   ├── test_expenses_integration.py     # NEW: Expenses tests (8 cases)
│   ├── test_helpdesk_integration.py     # NEW: Helpdesk tests (10 cases)
│   ├── test_survey_integration.py       # NEW: Survey tests (8 cases)
│   ├── test_integrations_integration.py # NEW: Integrations tests (7 cases)
│   ├── test_database.py                 # NEW: Database tests (15 cases)
│   └── test_api_validation.py           # NEW: API validation tests (20 cases)
├── services/                            # Service layer tests (NEW)
│   ├── __init__.py
│   ├── test_email_service.py            # Email service tests (6 cases)
│   ├── test_notification_service.py     # Notification tests (4 cases)
│   └── test_export_service.py           # Export service tests (5 cases)
└── performance/                         # Performance tests (10% of tests)
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
│   ├── Layout.test.tsx         # NEW: Layout component tests (4 cases)
│   └── ProtectedRoute.test.tsx # Route protection tests
├── pages/                      # Page tests
│   ├── Login.test.tsx          # Login page tests
│   ├── Register.test.tsx       # Registration tests
│   ├── Dashboard.test.tsx      # Dashboard tests
│   ├── Employees.test.tsx      # Employee page tests
│   ├── Attendance.test.tsx     # Attendance tests
│   ├── Leave.test.tsx          # Leave management tests
│   ├── Benefits.test.tsx       # NEW: Benefits page tests (4 cases)
│   ├── Analytics.test.tsx      # NEW: Analytics tests (5 cases)
│   ├── Organization.test.tsx   # NEW: Organization tests (4 cases)
│   └── Integrations.test.tsx   # NEW: Integrations tests (5 cases)
├── hooks/                      # Custom hook tests (NEW)
│   ├── useAuth.test.ts         # Auth hook tests (4 cases)
│   └── customHooks.test.ts     # Other custom hooks (4 cases)
├── store/                      # State management tests (NEW)
│   └── store.test.ts           # Zustand store tests (8 cases)
└── utils/                      # Utility tests
    ├── api.test.ts             # API client tests
    └── formatters.test.ts      # NEW: Formatter utilities (10 cases)
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

## Recent Test Additions (October 2025)

### Backend Tests Added
1. **Unit Tests (211 test cases)**:
   - `test_utils.py`: Utility function tests including pagination, date handling, response formatting (66 cases)
   - `test_validators.py`: Input validation for emails, phones, dates, passwords (70 cases)
   - `test_security.py`: Password hashing, JWT token generation/validation (35 cases)
   - `test_middleware.py`: Auth, rate limiting, error handling, CORS middleware (40 cases)

2. **Integration Tests (68 test cases)**:
   - `test_expenses_integration.py`: Expense management API (8 cases)
   - `test_helpdesk_integration.py`: Helpdesk ticket system API (10 cases)
   - `test_survey_integration.py`: Employee survey system API (8 cases)
   - `test_integrations_integration.py`: Third-party integrations (7 cases)
   - `test_database.py`: Database operations, constraints, transactions (15 cases)
   - `test_api_validation.py`: API response validation, headers, status codes (20 cases)

3. **Service Tests (15 test cases)**:
   - `test_email_service.py`: Email sending functionality (6 cases)
   - `test_notification_service.py`: Notification system (4 cases)
   - `test_export_service.py`: Data export functionality (5 cases)

### Frontend Tests Added (48 test cases)
1. **Component Tests**:
   - `Layout.test.tsx`: Layout component functionality (4 cases)

2. **Page Tests**:
   - `Benefits.test.tsx`: Benefits enrollment page (4 cases)
   - `Analytics.test.tsx`: Analytics dashboard (5 cases)
   - `Organization.test.tsx`: Organization settings (4 cases)
   - `Integrations.test.tsx`: Third-party integrations (5 cases)

3. **Hook Tests**:
   - `useAuth.test.ts`: Authentication hook (4 cases)
   - `customHooks.test.ts`: Window size and update effect hooks (4 cases)

4. **Utility Tests**:
   - `formatters.test.ts`: Date, currency, string formatting (10 cases)

5. **Store Tests**:
   - `store.test.ts`: Zustand state management (8 cases)

### CI/CD Enhancements
- Added Python backend test execution to CI/CD pipeline
- Configured coverage reporting with Codecov
- Added test result summaries in GitHub Actions
- Enabled parallel testing for faster CI builds

### Coverage Improvements
- **Before**: Backend ~15%, Frontend ~2%
- **After**: Backend ~35-40%, Frontend ~15-20%
- **New Test Files**: 19 (12 backend + 9 frontend)
- **New Test Cases**: 342+
- **Code Coverage Increase**: +150%

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
