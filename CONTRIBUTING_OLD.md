# Contributing to People HR Management System

Thank you for your interest in contributing to the People HR Management System! This document provides guidelines and instructions for contributing to the project.

## 🤝 Code of Conduct

By participating in this project, you agree to maintain a respectful and collaborative environment. We expect all contributors to:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- Python 3.9+
- Django 4.2+
- PostgreSQL 13+
- Redis 7+ (optional, for caching)
- Node.js 18+ (for frontend)
- Git

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/People.git
   cd People
   ```

3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/Ashour158/People.git
   ```

4. **Install dependencies**:
   ```bash
   # Backend (Django)
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Frontend (React + TypeScript)
   cd ../frontend
   npm install
   ```

5. **Set up environment variables**:
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your local configuration
   
   # Frontend
   cd ../frontend
   cp .env.example .env
   # Edit .env with your local configuration
   ```

6. **Set up the database**:
   ```bash
   createdb hr_system
   cd backend
   source venv/bin/activate
   python manage.py migrate
   python manage.py createsuperuser
   ```

7. **Start development servers**:
   ```bash
   # Terminal 1 - Backend (Django)
   cd backend
   source venv/bin/activate
   python manage.py runserver
   
   # Terminal 2 - Frontend (React)
   cd frontend
   npm run dev
   ```

## 🌿 Branching Model

We follow a simplified Git Flow model:

### Main Branches

- `main` - Production-ready code
- `develop` - Integration branch for features

### Supporting Branches

- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes
- `docs/*` - Documentation updates

### Branch Naming Convention

Use descriptive names with the following format:

```
<type>/<short-description>
```

Examples:
- `feature/employee-profile-photos`
- `bugfix/attendance-timezone-issue`
- `hotfix/security-vulnerability-fix`
- `docs/api-endpoint-documentation`

## 💻 Development Workflow

### 1. Create a Branch

```bash
git checkout develop
git pull upstream develop
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write clean, maintainable code
- Follow the project's coding standards
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Backend tests
cd backend
npm run lint
npm run typecheck
npm test
npm run build

# Frontend tests
cd frontend
npm run lint
npm test
npm run build
```

### 4. Commit Your Changes

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
git add .
git commit -m "feat: add employee profile photo upload"
```

#### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing functionality
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates

**Examples**:
```
feat(employee): add bulk import functionality

Implemented CSV/Excel bulk import for employee data with validation
and error reporting.

Closes #123
```

```
fix(attendance): correct timezone handling for check-in

Fixed issue where check-in times were incorrectly converted to UTC,
causing discrepancies in attendance reports.

Fixes #456
```

### 5. Keep Your Branch Updated

```bash
git fetch upstream
git rebase upstream/develop
```

### 6. Push Your Changes

```bash
git push origin feature/your-feature-name
```

### 7. Create a Pull Request

1. Go to the [repository on GitHub](https://github.com/Ashour158/People)
2. Click "New Pull Request"
3. Select your branch
4. Fill out the PR template with:
   - Clear description of changes
   - Related issue numbers
   - Screenshots (for UI changes)
   - Testing performed
5. Submit the PR

## 📝 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Define explicit types for function parameters and return values
- Use interfaces for object shapes
- Avoid `any` - use `unknown` if type is truly unknown

### Backend Code Style

```typescript
// Good
export class EmployeeService {
  async getEmployee(id: string): Promise<Employee> {
    const result = await this.db.query(
      'SELECT * FROM employees WHERE employee_id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Employee not found');
    }
    
    return result.rows[0];
  }
}

// Bad
export class EmployeeService {
  async getEmployee(id: any) {
    const result = await this.db.query(
      'SELECT * FROM employees WHERE employee_id = ' + id
    );
    return result.rows[0];
  }
}
```

### Frontend Code Style

```typescript
// Good
interface EmployeeListProps {
  departmentId?: string;
}

export const EmployeeList: React.FC<EmployeeListProps> = ({ departmentId }) => {
  const { data, isLoading, error } = useQuery(
    ['employees', departmentId],
    () => employeeApi.getEmployees({ departmentId })
  );

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">Failed to load</Alert>;

  return (
    <Box>
      {data?.employees.map(emp => (
        <EmployeeCard key={emp.employee_id} employee={emp} />
      ))}
    </Box>
  );
};
```

### Code Organization

- Keep files focused and under 300 lines
- Extract reusable logic into utility functions
- Use meaningful variable and function names
- Add comments for complex logic only
- Group related imports together

### Error Handling

```typescript
// Good
try {
  const employee = await employeeService.getEmployee(id);
  res.json({ success: true, data: employee });
} catch (error) {
  if (error instanceof NotFoundError) {
    res.status(404).json({ success: false, error: error.message });
  } else {
    next(error);
  }
}
```

## 🧪 Testing Guidelines

### Unit Tests

- Write tests for all business logic
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies

```typescript
describe('EmployeeService', () => {
  describe('getEmployee', () => {
    it('should return employee when found', async () => {
      // Arrange
      const mockDb = createMockDb();
      const service = new EmployeeService(mockDb);
      
      // Act
      const result = await service.getEmployee('123');
      
      // Assert
      expect(result).toMatchObject({ employee_id: '123' });
    });
    
    it('should throw NotFoundError when employee not found', async () => {
      // Arrange
      const mockDb = createMockDb({ empty: true });
      const service = new EmployeeService(mockDb);
      
      // Act & Assert
      await expect(service.getEmployee('999'))
        .rejects.toThrow(NotFoundError);
    });
  });
});
```

### Integration Tests

- Test API endpoints end-to-end
- Use test database
- Clean up test data after each test

## 📚 Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex algorithms
- Include examples for non-obvious usage

```typescript
/**
 * Calculates leave balance for an employee
 * 
 * @param employeeId - The employee's unique identifier
 * @param leaveTypeId - The type of leave to calculate
 * @param asOfDate - Calculate balance as of this date (defaults to today)
 * @returns Promise resolving to leave balance details
 * 
 * @example
 * ```typescript
 * const balance = await calculateLeaveBalance(
 *   'emp-123',
 *   'annual-leave',
 *   new Date('2024-12-31')
 * );
 * ```
 */
async function calculateLeaveBalance(
  employeeId: string,
  leaveTypeId: string,
  asOfDate?: Date
): Promise<LeaveBalance> {
  // Implementation
}
```

### API Documentation

Update `api_documentation.md` when adding or modifying endpoints.

## 🐛 Reporting Bugs

Use the Bug Report template when creating an issue:

1. Go to [Issues](https://github.com/Ashour158/People/issues)
2. Click "New Issue"
3. Select "Bug Report"
4. Fill out all required fields:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Screenshots/logs if applicable

## 💡 Requesting Features

Use the Feature Request template:

1. Go to [Issues](https://github.com/Ashour158/People/issues)
2. Click "New Issue"
3. Select "Feature Request"
4. Describe:
   - The problem it solves
   - Proposed solution
   - Alternative solutions considered
   - Additional context

## 🔍 Code Review Process

### For Contributors

- Respond to review comments promptly
- Make requested changes in new commits
- Don't force-push after review has started
- Request re-review after addressing comments

### For Reviewers

- Be respectful and constructive
- Explain the "why" behind suggestions
- Approve when code meets standards
- Focus on:
  - Correctness
  - Test coverage
  - Code clarity
  - Performance implications
  - Security concerns

## 🏷️ Issue Labels

We use the following labels:

- `type:feature` - New feature
- `type:bug` - Bug fix
- `type:docs` - Documentation
- `type:refactor` - Code refactoring
- `priority:high` - High priority
- `priority:medium` - Medium priority
- `priority:low` - Low priority
- `status:blocked` - Blocked by another issue
- `status:in-progress` - Work in progress
- `domain:employee` - Employee module
- `domain:attendance` - Attendance module
- `domain:leave` - Leave module
- `domain:payroll` - Payroll module
- `good-first-issue` - Good for newcomers
- `help-wanted` - Extra attention needed

## 📋 Pull Request Checklist

Before submitting your PR, ensure:

- [ ] Code follows project style guidelines
- [ ] All tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] PR description is clear and complete
- [ ] Screenshots added for UI changes
- [ ] No merge conflicts with target branch

## 🎯 Areas for Contribution

We welcome contributions in:

- **Features**: New HR modules (recruitment, performance, training)
- **Bug Fixes**: Fix reported issues
- **Tests**: Improve test coverage
- **Documentation**: Improve guides and API docs
- **Performance**: Optimize queries and operations
- **UI/UX**: Improve frontend experience
- **Accessibility**: Make the system more accessible
- **Internationalization**: Add multi-language support

## 💬 Communication

- **GitHub Issues**: Bug reports and feature requests
- **Pull Requests**: Code contributions and reviews
- **Discussions**: General questions and ideas

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You!

Your contributions make this project better. We appreciate your time and effort!

---

**Questions?** Feel free to open a discussion or reach out to the maintainers.
