# Complete Testing Infrastructure Guide

## 📋 Overview

This document provides a comprehensive guide to the testing infrastructure for the HR Management System, including unit tests, integration tests, E2E tests, performance tests, and security testing.

## 🎯 Testing Coverage Goals

### Current Status
- **Backend (Python)**: 20-25% coverage
- **Frontend (React)**: 15-20% coverage
- **E2E Tests**: ✅ Implemented (Playwright)
- **Performance Tests**: ✅ Implemented (Locust)
- **Security Tests**: ✅ Implemented (Multiple tools)

### Target Coverage
- **Backend**: 80% coverage
- **Frontend**: 70% coverage
- **E2E**: All critical user flows
- **Performance**: All major endpoints
- **Security**: Continuous scanning

## 🧪 Test Types

### 1. Unit Tests
Test individual functions and components in isolation.

#### Backend (Python/FastAPI)
```bash
cd python_backend

# Run all unit tests
pytest tests/unit/

# Run with coverage
pytest tests/unit/ --cov=app --cov-report=html

# Run specific test file
pytest tests/unit/test_auth.py

# Run with markers
pytest -m unit
```

#### Frontend (React/TypeScript)
```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run with UI
npm run test:ui
```

### 2. Integration Tests
Test how different parts of the system work together.

```bash
cd python_backend

# Run integration tests
pytest tests/integration/

# Run specific integration test
pytest tests/integration/test_employees_integration.py

# Run with markers
pytest -m integration
```

### 3. End-to-End (E2E) Tests
Test complete user flows through the application.

```bash
cd frontend

# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

**E2E Test Files:**
- `e2e/auth.spec.ts` - Authentication flows
- `e2e/employees.spec.ts` - Employee management
- `e2e/leave.spec.ts` - Leave requests and approvals

### 4. Performance Tests
Test system performance under load.

```bash
cd python_backend/tests/performance

# Interactive mode (opens web UI)
locust -f locustfile.py --host=http://localhost:8000

# Headless mode (CI/CD)
locust -f locustfile.py \
  --host=http://localhost:8000 \
  --users 100 \
  --spawn-rate 10 \
  --run-time 5m \
  --headless \
  --html=performance-report.html
```

**Performance Targets:**
- Response Time (p95): < 500ms
- Response Time (p99): < 1000ms
- Throughput: > 100 RPS
- Error Rate: < 1%

### 5. Security Tests
Automated security scanning and vulnerability detection.

Security tests run automatically in CI/CD. To run locally:

```bash
# Python security scans
cd python_backend

# Dependency vulnerabilities
pip install safety
safety check

# Security issues in code
pip install bandit
bandit -r app/

# Static analysis
pip install semgrep
semgrep --config=auto app/

# Frontend security
cd frontend

# Dependency vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## 🚀 Running All Tests

### Quick Test (Development)
```bash
# From project root
make test
```

### Full Test Suite
```bash
# From project root
./scripts/run-all-tests.sh
```

### CI/CD Pipeline
Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request
- Scheduled daily security scans

## 📊 Coverage Reports

### Backend Coverage
```bash
cd python_backend
pytest --cov=app --cov-report=html
# Open htmlcov/index.html in browser
```

### Frontend Coverage
```bash
cd frontend
npm run test:coverage
# Open coverage/index.html in browser
```

### View Coverage in CI/CD
- Coverage reports are uploaded to Codecov
- View at: https://codecov.io/gh/Ashour158/People

## 🎭 E2E Testing Details

### Test Structure
```
frontend/
├── e2e/
│   ├── auth.spec.ts         # Login, logout, session
│   ├── employees.spec.ts    # Employee CRUD operations
│   └── leave.spec.ts        # Leave requests & approvals
└── playwright.config.ts     # Playwright configuration
```

### Running Specific Scenarios
```bash
# Run only authentication tests
npx playwright test e2e/auth.spec.ts

# Run with specific browser
npx playwright test --project=chromium

# Run with multiple workers (parallel)
npx playwright test --workers=4

# Generate report
npx playwright show-report
```

### E2E Test Best Practices
1. Use data-testid attributes for reliable selectors
2. Wait for elements explicitly (avoid hardcoded waits)
3. Clean up test data after tests
4. Use fixtures for common setup
5. Keep tests independent and isolated

## 🔥 Performance Testing Details

### Load Test Scenarios

**1. Normal Load**
- 50 concurrent users
- Steady state for 10 minutes
- Verify system stability

```bash
locust -f locustfile.py --users 50 --spawn-rate 5 --run-time 10m --headless
```

**2. Spike Test**
- Sudden increase from 10 to 200 users
- Test system resilience

```bash
locust -f locustfile.py --users 200 --spawn-rate 50 --run-time 5m --headless
```

**3. Stress Test**
- Gradually increase load until failure
- Find system breaking point

```bash
locust -f locustfile.py --users 500 --spawn-rate 10 --run-time 15m --headless
```

### Performance Monitoring
- Monitor CPU usage
- Monitor memory usage
- Monitor database connections
- Monitor response times
- Monitor error rates

## 🔒 Security Testing Details

### Automated Scans

**1. Dependency Vulnerabilities**
- Python: Safety check
- Frontend: npm audit
- OWASP Dependency Check

**2. Code Security**
- Python: Bandit (security linter)
- Python: Semgrep (SAST)
- Frontend: ESLint security rules

**3. Secret Detection**
- TruffleHog (git history scanning)
- Pattern matching for common secrets

### Manual Security Testing
1. **Authentication Testing**
   - Test password policies
   - Test session management
   - Test token expiration

2. **Authorization Testing**
   - Test role-based access
   - Test data isolation
   - Test API permissions

3. **Input Validation**
   - Test SQL injection
   - Test XSS attacks
   - Test CSRF protection

4. **API Security**
   - Test rate limiting
   - Test CORS configuration
   - Test error handling

## 📈 Coverage Improvement Strategy

### Week 1-2: Foundation (Current)
- ✅ Set up test infrastructure
- ✅ Add basic tests
- ✅ Target: 30% coverage

### Week 3-4: Integration
- [ ] Add integration tests
- [ ] Add E2E tests for critical flows
- [ ] Target: 50% coverage

### Week 5-6: Expansion
- [ ] Add comprehensive unit tests
- [ ] Add performance benchmarks
- [ ] Target: 70% coverage

### Week 7-8: Refinement
- [ ] Fill coverage gaps
- [ ] Optimize test suite
- [ ] Target: 80% backend, 70% frontend

## 🛠️ Test Infrastructure

### Backend Testing Stack
- **pytest**: Test framework
- **pytest-asyncio**: Async test support
- **pytest-cov**: Coverage reporting
- **httpx**: HTTP client for API tests
- **faker**: Test data generation
- **locust**: Load testing

### Frontend Testing Stack
- **Vitest**: Unit test framework
- **React Testing Library**: Component testing
- **Playwright**: E2E testing
- **MSW**: API mocking
- **@vitest/coverage-v8**: Coverage reporting

### CI/CD Integration
- **GitHub Actions**: Automated test execution
- **Codecov**: Coverage tracking
- **Security scanners**: Automated security testing

## 📝 Writing Tests

### Backend Test Example
```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_employee(client: AsyncClient, auth_headers):
    """Test employee creation"""
    employee_data = {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@test.com",
        "department_id": 1
    }
    
    response = await client.post(
        "/api/v1/employees",
        json=employee_data,
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["first_name"] == "John"
    assert data["email"] == "john.doe@test.com"
```

### Frontend Test Example
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';

test('should login successfully', async () => {
  const user = userEvent.setup();
  render(<Login />);
  
  await user.type(screen.getByLabelText(/email/i), 'test@example.com');
  await user.type(screen.getByLabelText(/password/i), 'password123');
  await user.click(screen.getByRole('button', { name: /login/i }));
  
  await waitFor(() => {
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });
});
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test';

test('employee creation flow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@test.com');
  await page.fill('[name="password"]', 'Admin@123');
  await page.click('button[type="submit"]');
  
  // Navigate to employees
  await page.click('text=Employees');
  await expect(page).toHaveURL(/employees/);
  
  // Add employee
  await page.click('text=Add Employee');
  await page.fill('[name="firstName"]', 'Jane');
  await page.fill('[name="lastName"]', 'Smith');
  await page.fill('[name="email"]', 'jane@test.com');
  await page.click('button:has-text("Save")');
  
  // Verify
  await expect(page.locator('text=Jane Smith')).toBeVisible();
});
```

## 🐛 Debugging Tests

### Backend Tests
```bash
# Run with verbose output
pytest -vv

# Run with print statements
pytest -s

# Run with debugger
pytest --pdb

# Run single test with debugging
pytest tests/test_auth.py::test_login -vv -s
```

### Frontend Tests
```bash
# Run with UI (interactive debugging)
npm run test:ui

# Run with debugging in watch mode
npm run test:watch

# Debug specific test
npm test -- Login.test.tsx --reporter=verbose
```

### E2E Tests
```bash
# Debug mode (step through)
npm run test:e2e:debug

# Headed mode (see browser)
npm run test:e2e:headed

# Trace viewer (after failure)
npx playwright show-trace trace.zip
```

## 📚 Resources

### Documentation
- [pytest Documentation](https://docs.pytest.org/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Locust Documentation](https://docs.locust.io/)
- [React Testing Library](https://testing-library.com/react)

### Best Practices
- Write tests first (TDD)
- Keep tests simple and focused
- Use descriptive test names
- Mock external dependencies
- Clean up after tests
- Run tests before committing
- Maintain test coverage

## 🔄 Continuous Improvement

### Weekly Reviews
- Review test coverage metrics
- Identify untested code paths
- Update test documentation
- Refactor flaky tests
- Optimize test performance

### Monthly Goals
- Increase coverage by 10%
- Add tests for new features
- Improve test reliability
- Reduce test execution time
- Update testing dependencies

---

**Last Updated**: October 2025
**Maintainer**: Development Team
**Questions**: Create a GitHub issue or contact the team
