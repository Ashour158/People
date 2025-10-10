# Testing Quick Reference Card

## 🚀 Quick Start

### Run All Tests
```bash
# From project root
./scripts/run-all-tests.sh
```

### Backend Tests (Python)
```bash
cd python_backend

# Run all tests
pytest

# With coverage
pytest --cov=app --cov-report=html --cov-report=term-missing

# Run specific category
pytest -m unit              # Unit tests only
pytest -m integration       # Integration tests only
pytest -m services          # Service tests only

# Run specific file
pytest tests/unit/test_utils.py

# Run in parallel (4x faster)
pytest -n auto

# Watch mode (requires pytest-watch)
ptw
```

### Frontend Tests (React/TypeScript)
```bash
cd frontend

# Run all tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# UI mode (interactive)
npm run test:ui

# Specific test
npm test Login.test.tsx
```

## 📁 Test File Locations

### Backend
```
python_backend/tests/
├── unit/                    # Fast, isolated tests
│   ├── test_utils.py
│   ├── test_validators.py
│   ├── test_security.py
│   └── test_middleware.py
├── integration/             # API endpoint tests
│   ├── test_expenses_integration.py
│   ├── test_helpdesk_integration.py
│   ├── test_database.py
│   └── test_api_validation.py
└── services/                # Service layer tests
    ├── test_email_service.py
    ├── test_notification_service.py
    └── test_export_service.py
```

### Frontend
```
frontend/src/tests/
├── components/              # Component tests
│   └── Layout.test.tsx
├── pages/                   # Page tests
│   ├── Login.test.tsx
│   ├── Benefits.test.tsx
│   └── Analytics.test.tsx
├── hooks/                   # Custom hooks
│   ├── useAuth.test.ts
│   └── customHooks.test.ts
├── utils/                   # Utilities
│   └── formatters.test.ts
└── store/                   # State management
    └── store.test.ts
```

## 🎯 Writing Tests

### Backend Test Template
```python
"""Tests for [module name]"""
import pytest
from httpx import AsyncClient


@pytest.mark.unit  # or @pytest.mark.integration
@pytest.mark.asyncio
class Test[ModuleName]:
    """Test [functionality]"""
    
    async def test_[specific_behavior](self, authenticated_client: AsyncClient):
        """Test [what this does]"""
        # Arrange
        test_data = {"key": "value"}
        
        # Act
        response = await authenticated_client.post("/api/v1/endpoint", json=test_data)
        
        # Assert
        assert response.status_code == 200
        assert response.json()["success"] is True
```

### Frontend Test Template
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import MyComponent from '../../components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const { user } = render(<MyComponent />);
    const button = screen.getByRole('button', { name: 'Click Me' });
    
    await user.click(button);
    
    expect(screen.getByText('Clicked!')).toBeInTheDocument();
  });
});
```

## 📊 Coverage Reports

### View Coverage Reports
```bash
# Backend (after running tests with --cov)
open python_backend/htmlcov/index.html

# Frontend (after running npm run test:coverage)
open frontend/coverage/index.html
```

### Coverage Thresholds
- **Backend**: Target 80%
- **Frontend**: Target 70%
- **Critical Paths**: 100%

## 🔍 Debugging Tests

### Backend
```bash
# Verbose output
pytest -v

# Show print statements
pytest -s

# Stop on first failure
pytest -x

# Run last failed tests only
pytest --lf

# Debug with pdb
pytest --pdb
```

### Frontend
```bash
# Debug mode
npm test -- --reporter=verbose

# Single test file
npm test -- Login.test.tsx

# Update snapshots
npm test -- -u
```

## 🏷️ Test Markers

### Backend Markers
- `@pytest.mark.unit` - Unit tests (fast, isolated)
- `@pytest.mark.integration` - Integration tests (DB, API)
- `@pytest.mark.slow` - Slow running tests
- `@pytest.mark.auth` - Authentication tests
- `@pytest.mark.employee` - Employee tests
- `@pytest.mark.asyncio` - Async tests (always required for async)

### Usage
```bash
pytest -m unit                    # Run only unit tests
pytest -m "not slow"              # Skip slow tests
pytest -m "unit and not slow"     # Multiple markers
```

## ✅ Pre-Commit Checklist

Before committing code:
- [ ] Run relevant tests: `pytest tests/unit/test_mymodule.py`
- [ ] Check coverage: Coverage should not decrease
- [ ] Lint code: `black .` and `ruff check .` (backend) or `npm run lint` (frontend)
- [ ] Type check: `mypy app/` (backend) or `npm run typecheck` (frontend)
- [ ] All tests pass: No failing tests
- [ ] Add tests for new features: Every new feature needs tests

## 🆘 Common Issues

### Issue: Import errors in tests
**Solution**: Make sure you're running from the correct directory and venv is activated

### Issue: Database connection errors
**Solution**: Tests use in-memory SQLite, no real DB needed. Check conftest.py fixtures

### Issue: Async test warnings
**Solution**: Always use `@pytest.mark.asyncio` for async tests

### Issue: Frontend test timeout
**Solution**: Increase timeout in vite.config.ts or use `await waitFor()`

## 📚 More Information

- **Full Guide**: See `TESTING_GUIDE.md`
- **Test Summary**: See `TEST_SUMMARY.md`
- **Coverage Report**: See `TEST_COVERAGE_REPORT.md`
- **CI/CD**: See `.github/workflows/ci-cd.yml`

## 💡 Tips

1. **Run tests frequently** - Don't wait until the end
2. **Write tests first** - TDD approach
3. **Keep tests simple** - One concept per test
4. **Use descriptive names** - Test name should explain what's tested
5. **Test edge cases** - Don't just test happy paths
6. **Mock external services** - Keep tests fast and reliable
7. **Use fixtures** - Reuse test data setup
8. **Check coverage** - But don't obsess over 100%

---

**Quick Links**:
- 📖 [Full Testing Guide](./TESTING_GUIDE.md)
- 📊 [Test Summary](./TEST_SUMMARY.md)
- 🔧 [CI/CD Configuration](./.github/workflows/ci-cd.yml)
