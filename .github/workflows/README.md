# GitHub Actions CI/CD Workflows

This directory contains automated workflows for continuous integration, testing, and deployment.

## 📋 Workflow Overview

### Main Workflows

#### 1. CI/CD Pipeline (`ci-cd.yml`)
**Trigger**: Push to `main`/`develop`, Pull Requests
**Purpose**: Main CI/CD pipeline for Node.js backend and React frontend

- ✅ Backend tests (Node.js/TypeScript)
- ✅ Frontend tests (React/TypeScript)
- ✅ Linting and type checking
- ✅ Build verification
- ✅ Docker image builds

#### 2. Python CI/CD (`ci-cd-python.yml`)
**Trigger**: Push to `main`/`develop`, Pull Requests (python_backend changes)
**Purpose**: Python backend testing and deployment

- ✅ Code quality checks (Black, Ruff, MyPy)
- ✅ Security scanning (Safety, Bandit)
- ✅ Unit and integration tests
- ✅ Coverage reporting (20% minimum, target 80%)
- ✅ Docker image builds
- ✅ Performance testing
- ✅ Deployment to staging/production

**Jobs:**
- `code-quality`: Linting and formatting checks
- `security-scan`: Vulnerability scanning
- `test`: Unit and integration tests with coverage
- `build`: Docker image building
- `deploy-staging`: Deploy to staging environment
- `deploy-production`: Deploy to production
- `performance-test`: Load testing with Locust

#### 3. E2E Tests (`e2e-tests.yml`)
**Trigger**: Push to `main`/`develop`, Pull Requests
**Purpose**: End-to-end testing with Playwright

- ✅ Authentication flows
- ✅ Employee management workflows
- ✅ Leave request workflows
- ✅ Full system integration tests
- ✅ Screenshots and traces on failure

**Test Files:**
- `frontend/e2e/auth.spec.ts`
- `frontend/e2e/employees.spec.ts`
- `frontend/e2e/leave.spec.ts`

#### 4. Security Testing (`security-testing.yml`)
**Trigger**: Push, Pull Requests, Daily at 2 AM UTC
**Purpose**: Comprehensive security scanning

**Python Security:**
- Safety: Dependency vulnerability scanning
- Bandit: Python security linter
- Semgrep: Static analysis security testing

**Frontend Security:**
- npm audit: Dependency vulnerabilities
- ESLint: Security linting

**Additional Scans:**
- TruffleHog: Secret detection in git history
- OWASP Dependency Check: Comprehensive vulnerability scanning
- Pattern matching for hardcoded secrets

#### 5. Coverage Analysis (`coverage-analysis.yml`)
**Trigger**: Push, Pull Requests, Weekly on Monday
**Purpose**: Track and report test coverage

- ✅ Backend coverage reporting
- ✅ Frontend coverage reporting
- ✅ Coverage badges (via Codecov)
- ✅ Progress tracking toward targets
- ✅ Detailed HTML reports

**Coverage Targets:**
- Backend: 80%
- Frontend: 70%

### Deployment Workflows

#### 6. Staging Deployment (`staging-deployment.yml`)
**Trigger**: Manual, or automatic on develop branch
**Purpose**: Deploy to staging environment

#### 7. Production Deployment (`production-deployment.yml`)
**Trigger**: Manual, or automatic on main branch
**Purpose**: Deploy to production environment

## 🚀 Running Workflows

### Automatic Triggers

Workflows run automatically on:
- **Every push** to `main` or `develop` branches
- **Every pull request** to `main` or `develop`
- **Scheduled times** (security scans daily, coverage weekly)

### Manual Triggers

Some workflows can be triggered manually:
1. Go to Actions tab in GitHub
2. Select the workflow
3. Click "Run workflow"
4. Choose branch and parameters

## 📊 Workflow Status

View workflow status:
- **Badges**: See README.md for status badges
- **Actions Tab**: https://github.com/Ashour158/People/actions
- **Pull Requests**: Status checks appear on PRs
- **Commits**: Status appears next to commits

## 🔒 Required Secrets

Configure these in GitHub Settings → Secrets:

### Required
- `JWT_SECRET_KEY`: JWT signing key for tests
- `SECRET_KEY`: Application secret key

### Optional (for deployment)
- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password/token
- `GIST_SECRET`: GitHub token for coverage badges
- `DEPLOY_TOKEN`: Deployment authentication token

## 📈 Coverage Enforcement

### Current Thresholds
- **Backend**: 20% minimum (increasing to 80%)
- **Frontend**: No minimum yet (target 70%)

### Progressive Increases
- Week 1-2: 20% → 30%
- Week 3-4: 30% → 50%
- Week 5-6: 50% → 70%
- Week 7-8: 70% → 80%

## 🧪 Test Execution Times

Typical execution times:
- **Python Backend Tests**: ~45 seconds
- **Frontend Tests**: ~30 seconds
- **E2E Tests**: ~5-10 minutes
- **Security Scans**: ~2-3 minutes
- **Performance Tests**: ~5-10 minutes
- **Total CI/CD Pipeline**: ~15-20 minutes

## 📝 Workflow Configuration

### Environment Variables

Common environment variables used in workflows:
```yaml
PYTHON_VERSION: '3.11'
NODE_VERSION: '20.x'
POSTGRES_VERSION: '15'
REDIS_VERSION: '7'
```

### Service Containers

Most workflows use service containers:
- **PostgreSQL 15**: Database for tests
- **Redis 7**: Cache and session storage

## 🐛 Debugging Failed Workflows

### View Logs
1. Go to Actions tab
2. Click on failed workflow run
3. Click on failed job
4. Expand failed step to see logs

### Common Issues

**Tests Failing:**
- Check test logs for specific failures
- Verify database/Redis connection
- Check environment variables

**Coverage Too Low:**
- Add more tests
- Check coverage report artifacts
- Review uncovered code

**Security Scan Failures:**
- Review security report artifacts
- Update vulnerable dependencies
- Fix security issues in code

**E2E Test Failures:**
- Check screenshots in artifacts
- Review Playwright traces
- Verify test environment setup

### Artifacts

Failed workflows upload artifacts:
- Test results
- Coverage reports
- Screenshots (E2E tests)
- Security scan reports
- Logs

Download from workflow run page.

## 🔄 Workflow Updates

### Modifying Workflows

1. Edit workflow file in `.github/workflows/`
2. Test changes on feature branch
3. Review workflow run results
4. Merge to main when validated

### Best Practices

- Keep workflows fast (< 30 minutes)
- Use caching for dependencies
- Fail fast on critical errors
- Upload artifacts for debugging
- Use matrix builds for multi-version testing
- Add continue-on-error for non-critical steps

## 📚 Resources

### Documentation
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [pytest Documentation](https://docs.pytest.org/)
- [Playwright Documentation](https://playwright.dev/)
- [Locust Documentation](https://docs.locust.io/)

### Related Files
- `COMPLETE_TESTING_GUIDE.md`: Comprehensive testing guide
- `TESTING_GUIDE.md`: Testing strategy documentation
- `scripts/run-all-tests.sh`: Local test execution script
- `scripts/analyze-coverage.sh`: Coverage analysis script

## 🆘 Support

For workflow issues:
1. Check workflow logs
2. Review this documentation
3. Check related test documentation
4. Create a GitHub issue with:
   - Workflow name
   - Run ID/link
   - Error messages
   - Expected behavior

---

**Last Updated**: October 2025
**Maintainer**: Development Team
