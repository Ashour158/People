# GitHub Copilot Instructions for HR Management System

## Project Overview

This is an **enterprise-grade, multi-tenant HR Management System** built to compete with platforms like Zoho People. The system handles the complete employee lifecycle from recruitment to exit, with emphasis on self-service capabilities, automation, and real-time reporting.

### Architecture

- **Backend**: Django 4.2 + Python 3.9 + Django REST Framework + PostgreSQL 13+ + Redis
- **Frontend**: React 18 + TypeScript + Vite + Material-UI + React Query + Zustand
- **Database**: PostgreSQL 13+ with multi-tenant architecture
- **Caching**: Redis 7+
- **Deployment**: Docker, Kubernetes, GitHub Actions CI/CD

### Key Features

- Multi-tenant architecture with organization isolation
- Multi-company support within organizations
- Role-based access control (RBAC)
- JWT authentication with refresh tokens
- Real-time attendance tracking with geolocation
- Leave management with multi-level approval workflow
- Performance management with goal tracking
- Recruitment and onboarding
- Document management
- Payroll integration
- RESTful API-first design

## Project Structure

```
/
├── backend/                  # Django + Python backend
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
│   └── .env.example
├── frontend/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── main.tsx         # Application entry point
│   │   ├── App.tsx          # Root component
│   │   ├── api/             # API client and axios setup
│   │   ├── components/      # Reusable React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── store/           # Zustand state management
│   │   ├── utils/           # Utility functions
│   │   └── types/           # TypeScript type definitions
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── database/                 # Database schema and migrations (to be created)
│   ├── schema.sql           # Complete database schema
│   ├── migrations/          # Database migration scripts
│   └── seeds/               # Seed data for development
└── docs/                     # Additional documentation
```

## Coding Standards

### TypeScript

- **Always use TypeScript** for frontend development
- Enable strict mode in `tsconfig.json`
- Define explicit types for function parameters and return values
- Use interfaces for object shapes, types for unions/intersections
- Avoid using `any` - use `unknown` if type is truly unknown
- Use proper null checking with optional chaining (`?.`) and nullish coalescing (`??`)

### Backend Code Style (Django/Python)

- **Framework**: Django 4.2+ with Django REST Framework
- **Database**: Use Django ORM to prevent SQL injection
- **Error Handling**: Use DRF exception handling for consistent error responses
- **Validation**: Use DRF Serializers for input validation on all API endpoints
- **Authentication**: JWT tokens via djangorestframework-simplejwt
- **Logging**: Use Python's logging framework with structured logging
- **Async/Await**: Use async views where appropriate for performance
- **Environment Variables**: All configuration via environment variables using python-decouple or django-environ

Example backend view pattern:
```python
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class EmployeeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = EmployeeSerializer
    
    def get_queryset(self):
        # Filter by organization for multi-tenancy
        return Employee.objects.filter(
            organization_id=self.request.user.organization_id
        )
    
    def list(self, request):
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 10))
        search = request.query_params.get('search', '')
        
        queryset = self.get_queryset()
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) | 
                Q(last_name__icontains=search)
            )
        
        # Paginate and return
        paginator = PageNumberPagination()
        paginator.page_size = limit
        result_page = paginator.paginate_queryset(queryset, request)
        serializer = self.get_serializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)
```

### Frontend Code Style

- **Framework**: React 18 with functional components and hooks only
- **State Management**: Zustand for global state, React Query for server state
- **Styling**: Material-UI (MUI) components with consistent theme
- **Forms**: React Hook Form with Yup validation
- **API Calls**: Axios with interceptors for auth and error handling
- **Component Structure**: Keep components small and focused (< 200 lines)
- **Props**: Always define prop types with TypeScript interfaces

Example React component pattern:
```typescript
interface EmployeeListProps {
  departmentId?: string;
}

export const EmployeeList: React.FC<EmployeeListProps> = ({ departmentId }) => {
  const { data, isLoading, error } = useQuery(
    ['employees', departmentId],
    () => employeeApi.getEmployees({ departmentId })
  );

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">Failed to load employees</Alert>;

  return (
    <Box>
      {data?.employees.map(employee => (
        <EmployeeCard key={employee.employee_id} employee={employee} />
      ))}
    </Box>
  );
};
```

### Database Standards

- **Use UUIDs** for all primary keys (not auto-incrementing integers)
- **Multi-tenant isolation**: Always filter by `organization_id` in queries
- **Soft deletes**: Use `is_deleted` flag instead of hard deletes
- **Timestamps**: Include `created_at`, `modified_at` on all tables
- **Audit trails**: Track `created_by`, `modified_by` user IDs
- **Indexes**: Add indexes on foreign keys and frequently queried columns
- **Constraints**: Use database constraints for data integrity

### API Design

- **RESTful conventions**: Use proper HTTP methods (GET, POST, PUT, DELETE)
- **Versioning**: All APIs under `/api/v1/` prefix
- **Response format**: Consistent JSON structure:
  ```json
  {
    "success": true,
    "data": {...},
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100
    }
  }
  ```
- **Error format**: Consistent error responses:
  ```json
  {
    "success": false,
    "error": "Error message",
    "code": "ERROR_CODE",
    "details": {}
  }
  ```
- **Pagination**: Support `page` and `limit` query parameters
- **Filtering**: Support query parameters for filtering
- **Sorting**: Support `sort` and `order` parameters

### Security Best Practices

- **Authentication**: JWT with short expiration (24h), refresh tokens for longer sessions
- **Authorization**: Role-based access control (RBAC) middleware
- **Input Validation**: Validate all inputs with Joi schemas
- **SQL Injection**: Always use parameterized queries
- **XSS Protection**: Use Helmet.js middleware
- **CORS**: Configure CORS properly for production
- **Rate Limiting**: Implement rate limiting on authentication endpoints
- **Password Hashing**: Use bcrypt with minimum 12 rounds
- **Sensitive Data**: Never log passwords, tokens, or PII data
- **Environment Variables**: Store secrets in `.env` files (never commit to git)

### Testing Guidelines

- **Unit Tests**: pytest for backend, Vitest for frontend
- **Integration Tests**: Test API endpoints with Django TestCase or pytest-django
- **Test Coverage**: Aim for >80% coverage on critical paths
- **Test Structure**: Arrange-Act-Assert pattern
- **Mocking**: Mock external dependencies (database, Redis, email service)

### Git Workflow

- **Branch Naming**: `feature/description`, `bugfix/description`, `hotfix/description`
- **Commits**: Clear, descriptive commit messages
- **Pull Requests**: Small, focused PRs with clear descriptions
- **Code Review**: All code must be reviewed before merging

## Module-Specific Guidelines

### Authentication Module

- Implement account lockout after 5 failed login attempts
- Track login history with device and IP information
- Support password reset via email with time-limited tokens
- Implement refresh token rotation for security

### Employee Module

- Support bulk import/export of employee data
- Maintain complete audit trail of changes
- Support hierarchical reporting structure
- Include profile picture upload with image optimization

### Attendance Module

- Capture GPS coordinates for check-in/out (with user permission)
- Support multiple shift patterns
- Allow attendance regularization with approval workflow
- Calculate overtime automatically based on shift rules

### Leave Module

- Support multiple leave types with different policies
- Implement multi-level approval workflow
- Calculate leave balance with carry-forward logic
- Send email notifications for leave requests and approvals

### Performance Module

- Support SMART goal framework
- Implement 360-degree feedback
- Generate performance reports with charts
- Track KRA/KPI metrics over time

## Development Workflow

### Backend Development (Django/Python)

1. **Install Dependencies**:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Setup Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run Database Migrations**:
   ```bash
   python manage.py migrate
   ```

4. **Create Superuser**:
   ```bash
   python manage.py createsuperuser
   ```

5. **Start Development Server**:
   ```bash
   python manage.py runserver
   ```

6. **Run Tests**:
   ```bash
   pytest
   # Or use Django's test runner
   python manage.py test
   ```

7. **Lint Code**:
   ```bash
   flake8 .
   black .
   mypy .
   ```

### Frontend Development

1. **Install Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Setup Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with API URL
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```

4. **Build for Production**:
   ```bash
   npm run build
   ```

### Database Setup

1. **Create Database**:
   ```bash
   createdb hr_system
   ```

2. **Run Django Migrations**:
   ```bash
   cd backend
   source venv/bin/activate
   python manage.py migrate
   ```

## Deployment

### Docker

- Use multi-stage builds for optimized images
- Separate containers for backend, frontend, database, Redis
- Use docker-compose for local development
- Use Kubernetes manifests for production

### CI/CD

- GitHub Actions workflow on push to main branch
- Run tests, linting, and build checks
- Automated deployment to staging/production
- Database migrations run automatically

## Important Notes for Copilot

1. **Multi-tenancy**: Always filter queries by `organization_id` to ensure data isolation
2. **Security First**: Never skip input validation or authentication checks
3. **Performance**: Use pagination for list endpoints, add database indexes
4. **Error Handling**: Always use try-except blocks in Python and proper error responses
5. **Type Safety**: Leverage Python type hints and TypeScript's type system - avoid `any` types
6. **Documentation**: Add JSDoc comments for complex functions
7. **Consistency**: Follow existing patterns in the codebase
8. **Testing**: Write tests for new features and bug fixes
9. **Code Reference Files**: The repository contains reference implementation files (`.ts`, `.md`, `.sql`, `.txt`) that show complete code examples for various modules. When implementing features, refer to these files for patterns and structure:
   - `backend_setup.ts` - Backend architecture and setup
   - `auth_routes_complete.ts` - Authentication implementation
   - `employee_module_complete.ts` - Employee management
   - `attendance_module_complete.ts` - Attendance tracking
   - `frontend_components.ts` - React components
   - `enhanced_hr_schema.sql` - Complete database schema
   - `deployment_configs.txt` - Docker and K8s configs

## Common Commands

```bash
# Backend (Django/Python)
python manage.py runserver    # Start dev server
python manage.py migrate       # Run database migrations
python manage.py makemigrations # Create new migrations
pytest                         # Run tests
flake8 .                      # Lint code
black .                       # Format code

# Frontend (React/TypeScript)
npm run dev         # Start dev server
npm run build       # Build for production
npm run preview     # Preview production build
npm test           # Run tests

# Docker
docker-compose up              # Start all services
docker-compose up -d           # Start in background
docker-compose down            # Stop all services
docker-compose logs -f backend # View backend logs

# Database (Django manages migrations)
python manage.py migrate        # Run migrations
python manage.py loaddata <fixture>  # Load fixtures
psql hr_system                  # Connect to database
```

## Additional Resources

- **API Documentation**: See `api_documentation.md` for complete API reference
- **Database Schema**: See `enhanced_hr_schema.sql` for complete database design
- **Architecture**: See `hr_system_architecture.txt` for system architecture details
- **Deployment**: See `github_digitalocean_setup.md` for deployment instructions
- **Complete Guide**: See `complete_project_guide.md` for end-to-end setup

## Support and Questions

For any questions or issues, please:
1. Check existing documentation in the `docs/` directory
2. Review reference implementation files (`.ts`, `.sql`, `.md` files)
3. Create a GitHub issue with detailed description
4. Follow the project's code review process for contributions
