# Frontend Organization & Development Guide
## HR Management System - Complete Reference

**Last Updated**: October 10, 2025  
**Version**: 2.0  
**Status**: ✅ Production-Ready Structure

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [Routing Structure](#routing-structure)
7. [API Integration](#api-integration)
8. [Type System](#type-system)
9. [Styling Guidelines](#styling-guidelines)
10. [Testing Strategy](#testing-strategy)
11. [Development Workflow](#development-workflow)
12. [Best Practices](#best-practices)

---

## Overview

The frontend application is built with **React 18**, **TypeScript**, and **Material-UI**, following modern best practices for enterprise applications. It provides a comprehensive HR management interface with 17 implemented pages and a clear path for expansion.

### Key Features
- ✅ Type-safe development with TypeScript
- ✅ Component-based architecture
- ✅ Responsive design (mobile-first)
- ✅ Real-time data with React Query
- ✅ Global state with Zustand
- ✅ Comprehensive testing setup
- ✅ Hot module replacement (HMR)
- ✅ Production-optimized builds

---

## Technology Stack

### Core Technologies
```json
{
  "framework": "React 18.2.0",
  "language": "TypeScript 5.3.3",
  "bundler": "Vite 5.0.8",
  "ui-library": "Material-UI 5.15.0",
  "state-management": "Zustand 4.4.7",
  "data-fetching": "React Query 5.14.2",
  "routing": "React Router 6.20.1",
  "forms": "React Hook Form 7.49.2",
  "validation": "Yup 1.3.3",
  "charts": "Recharts 2.10.3",
  "visualization": "D3.js 7.9.0"
}
```

### Development Tools
```json
{
  "testing": "Vitest 1.1.0",
  "e2e-testing": "Playwright 1.40.1",
  "linting": "ESLint 8.56.0",
  "formatting": "Prettier 3.1.1",
  "type-checking": "TypeScript 5.3.3"
}
```

---

## Project Structure

### Directory Layout
```
frontend/
├── public/                 # Static assets
│   └── vite.svg
│
├── src/
│   ├── api/               # API Layer
│   │   ├── axios.ts       # Axios configuration & interceptors
│   │   ├── auth.api.ts    # Authentication APIs
│   │   ├── employee.api.ts # Employee APIs
│   │   └── modules.api.ts # Other module APIs
│   │
│   ├── components/        # React Components
│   │   ├── common/        # Shared components
│   │   │   └── ProtectedRoute.tsx
│   │   └── layout/        # Layout components
│   │       └── Layout.tsx
│   │
│   ├── pages/            # Page Components
│   │   ├── auth/         # Authentication pages
│   │   ├── dashboard/    # Dashboard pages
│   │   ├── employees/    # Employee pages
│   │   ├── attendance/   # Attendance pages
│   │   ├── leave/        # Leave pages
│   │   ├── organization/ # Org structure pages
│   │   ├── analytics/    # Analytics pages
│   │   ├── benefits/     # Benefits pages
│   │   └── integrations/ # Integration pages
│   │
│   ├── store/            # State Management
│   │   └── authStore.ts  # Authentication store
│   │
│   ├── hooks/            # Custom React Hooks
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   ├── useDebounce.ts
│   │   └── useWindowSize.ts
│   │
│   ├── types/            # TypeScript Types
│   │   └── index.ts      # Central type definitions
│   │
│   ├── constants/        # Application Constants
│   │   └── index.ts      # Config, enums, keys
│   │
│   ├── utils/            # Utility Functions
│   │   ├── date.ts       # Date utilities
│   │   ├── error.ts      # Error handling
│   │   ├── helpers.ts    # General helpers
│   │   └── formatters.ts # Data formatters
│   │
│   ├── validations/      # Form Validation
│   │   └── schemas.ts    # Yup validation schemas
│   │
│   ├── theme/            # MUI Theme
│   │   └── modernTheme.ts
│   │
│   ├── tests/            # Test Files
│   │   ├── components/   # Component tests
│   │   ├── pages/        # Page tests
│   │   ├── hooks/        # Hook tests
│   │   ├── utils/        # Utility tests
│   │   ├── store/        # Store tests
│   │   ├── mocks/        # Mock data
│   │   ├── setup.ts      # Test setup
│   │   └── test-utils.tsx # Test utilities
│   │
│   ├── main.tsx          # Application entry point
│   └── vite-env.d.ts     # Vite environment types
│
├── .env.example          # Environment template
├── .eslintrc.json        # ESLint configuration
├── .gitignore            # Git ignore rules
├── index.html            # HTML template
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── vite.config.ts        # Vite configuration
└── README.md             # Documentation
```

---

## Component Architecture

### Component Types

#### 1. Page Components
Located in `src/pages/`, these are top-level route components.

**Example Structure:**
```typescript
// src/pages/employees/EmployeeList.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Container, Typography } from '@mui/material';
import { employeeApi } from '../../api/employee.api';

export const EmployeeList: React.FC = () => {
  // Component logic
  const { data, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: employeeApi.getEmployees,
  });

  return (
    <Container>
      {/* Component JSX */}
    </Container>
  );
};
```

#### 2. Layout Components
Provide consistent structure across pages.

**Main Layout:**
```typescript
// src/components/layout/Layout.tsx
export const Layout: React.FC = () => {
  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar>{/* Header */}</AppBar>
      <Drawer>{/* Sidebar */}</Drawer>
      <Box component="main">
        <Outlet /> {/* Page content */}
      </Box>
    </Box>
  );
};
```

#### 3. Common Components
Reusable across multiple pages.

**Protected Route:**
```typescript
// src/components/common/ProtectedRoute.tsx
export const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};
```

---

## State Management

### Zustand Store Pattern

**Authentication Store Example:**
```typescript
// src/store/authStore.ts
import create from 'zustand';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginData) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  
  login: async (credentials) => {
    const response = await authApi.login(credentials);
    set({
      user: response.user,
      token: response.token,
      isAuthenticated: true,
    });
  },
  
  logout: () => {
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
```

### React Query for Server State

**Data Fetching Pattern:**
```typescript
// Fetch data with caching
const { data, isLoading, error } = useQuery({
  queryKey: ['employees', filters],
  queryFn: () => employeeApi.getEmployees(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Mutations with optimistic updates
const mutation = useMutation({
  mutationFn: employeeApi.createEmployee,
  onSuccess: () => {
    queryClient.invalidateQueries(['employees']);
  },
});
```

---

## Routing Structure

### Route Configuration

```typescript
// src/main.tsx
const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'employees', element: <EmployeeList /> },
      { path: 'attendance', element: <AttendanceCheckIn /> },
      { path: 'leave', element: <LeaveApply /> },
      // ... more routes
    ],
  },
]);
```

### Route Organization
```
/login              → Login page
/register           → Registration
/dashboard          → Main dashboard
/employees          → Employee list
/employees/:id      → Employee details (TBD)
/attendance         → Attendance check-in
/leave              → Leave application
/organization       → Org chart
/analytics          → Analytics dashboard
/benefits           → Benefits enrollment
/integrations       → Integration hub
```

---

## API Integration

### API Layer Structure

**Axios Configuration:**
```typescript
// src/api/axios.ts
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
});

// Request interceptor (add auth token)
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor (handle errors)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
    }
    return Promise.reject(error);
  }
);
```

**API Module Pattern:**
```typescript
// src/api/employee.api.ts
import axios from './axios';

export const employeeApi = {
  getEmployees: (params?: QueryParams) =>
    axios.get('/employees', { params }),
    
  getEmployeeById: (id: string) =>
    axios.get(`/employees/${id}`),
    
  createEmployee: (data: CreateEmployeeData) =>
    axios.post('/employees', data),
    
  updateEmployee: (id: string, data: UpdateEmployeeData) =>
    axios.put(`/employees/${id}`, data),
    
  deleteEmployee: (id: string) =>
    axios.delete(`/employees/${id}`),
};
```

---

## Type System

### Central Type Definitions

```typescript
// src/types/index.ts

// User types
export interface User {
  user_id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  organization_id: string;
}

export type UserRole = 'admin' | 'manager' | 'employee';

// Employee types
export interface Employee {
  employee_id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  status: EmployeeStatus;
  hire_date: string;
  employment_type: EmploymentType;
}

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Form data types
export interface LoginData {
  email: string;
  password: string;
}

export interface CreateEmployeeData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  hire_date: string;
  employment_type: EmploymentType;
}
```

---

## Styling Guidelines

### Material-UI Theme

```typescript
// src/theme/modernTheme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});
```

### Styling Approaches

1. **MUI sx Prop** (Preferred for simple styles)
```typescript
<Box sx={{ p: 2, bgcolor: 'background.paper' }}>
  Content
</Box>
```

2. **Styled Components** (For complex/reusable styles)
```typescript
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2),
  '&:hover': {
    boxShadow: theme.shadows[4],
  },
}));
```

3. **Theme Breakpoints**
```typescript
<Box
  sx={{
    width: { xs: '100%', sm: '50%', md: '33%' },
    display: { xs: 'block', md: 'flex' },
  }}
/>
```

---

## Testing Strategy

### Test File Organization

```
src/tests/
├── components/          # Component tests
│   ├── Layout.test.tsx
│   └── ProtectedRoute.test.tsx
├── pages/              # Page tests
│   ├── Login.test.tsx
│   ├── Register.test.tsx
│   └── Dashboard.test.tsx
├── hooks/              # Hook tests
│   ├── useAuth.test.tsx
│   └── customHooks.test.ts
├── utils/              # Utility tests
│   ├── formatters.test.ts
│   └── api.test.ts
├── store/              # Store tests
│   └── store.test.ts
├── mocks/              # Mock data
│   ├── handlers.ts
│   └── server.ts
├── setup.ts            # Test setup
└── test-utils.tsx      # Test utilities
```

### Testing Patterns

**Component Test Example:**
```typescript
// src/tests/pages/Login.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import { Login } from '../../pages/auth/Login';

describe('Login Page', () => {
  it('renders login form', () => {
    render(<Login />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });
  
  it('validates required fields', async () => {
    render(<Login />);
    const submitButton = screen.getByRole('button', { name: /login/i });
    
    await userEvent.click(submitButton);
    
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });
});
```

**Hook Test Example:**
```typescript
// src/tests/hooks/useAuth.test.tsx
import { renderHook } from '@testing-library/react';
import { useAuthStore } from '../../store/authStore';

describe('useAuth Hook', () => {
  it('initializes with no user', () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

---

## Development Workflow

### Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run type checking
npm run typecheck

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Commands

```bash
# Full validation (lint + typecheck + test)
npm run validate

# Format code
npm run format

# Check code formatting
npm run format:check

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Generate test coverage
npm run test:coverage
```

### Git Workflow

```bash
# Before committing
npm run validate     # Ensure all checks pass

# Commit with conventional commits
git commit -m "feat: add employee details page"
git commit -m "fix: resolve authentication issue"
git commit -m "refactor: improve api error handling"

# Push changes
git push origin feature/your-feature-name
```

---

## Best Practices

### 1. Component Design

✅ **DO:**
- Keep components small and focused (< 200 lines)
- Use TypeScript for all components
- Export as named exports
- Use functional components with hooks
- Implement proper error boundaries

❌ **DON'T:**
- Use `any` type
- Create deeply nested components
- Mix business logic with presentation
- Use inline styles extensively

### 2. State Management

✅ **DO:**
- Use React Query for server state
- Use Zustand for global client state
- Use local state for component-specific data
- Implement proper loading and error states

❌ **DON'T:**
- Store server data in global state
- Create unnecessary global state
- Mutate state directly
- Forget to handle loading states

### 3. API Integration

✅ **DO:**
- Use TypeScript interfaces for API responses
- Implement proper error handling
- Use React Query for data fetching
- Add request/response interceptors
- Handle authentication tokens properly

❌ **DON'T:**
- Make API calls directly in components
- Ignore error responses
- Store sensitive data in localStorage
- Make unnecessary API calls

### 4. Type Safety

✅ **DO:**
- Define explicit types for all functions
- Use interfaces for object shapes
- Leverage TypeScript strict mode
- Create reusable type definitions
- Document complex types with JSDoc

❌ **DON'T:**
- Use `any` type (use `unknown` if needed)
- Skip type definitions
- Use type assertions unnecessarily
- Create duplicate type definitions

### 5. Testing

✅ **DO:**
- Write tests for critical paths
- Test user interactions
- Use meaningful test descriptions
- Mock external dependencies
- Aim for high coverage on core features

❌ **DON'T:**
- Test implementation details
- Write tests that depend on each other
- Skip error case testing
- Ignore failing tests

### 6. Performance

✅ **DO:**
- Use React.memo for expensive components
- Implement lazy loading for routes
- Optimize bundle size
- Use proper list virtualization for large lists
- Implement debounce for search

❌ **DON'T:**
- Create unnecessary re-renders
- Load all data at once
- Ignore bundle size
- Skip performance monitoring

---

## Code Examples

### Complete Page Component

```typescript
// src/pages/employees/EmployeeDetails.tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { employeeApi } from '../../api/employee.api';
import type { Employee } from '../../types';

export const EmployeeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Fetch employee data
  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeApi.getEmployeeById(id!),
    enabled: !!id,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (employeeId: string) =>
      employeeApi.deleteEmployee(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      navigate('/employees');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to delete employee');
    },
  });

  const handleDelete = () => {
    if (id && window.confirm('Are you sure?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!employee) {
    return (
      <Container>
        <Alert severity="error">Employee not found</Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h4" gutterBottom>
          {employee.first_name} {employee.last_name}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ mt: 2 }}>
          <Typography><strong>Email:</strong> {employee.email}</Typography>
          <Typography><strong>Department:</strong> {employee.department}</Typography>
          <Typography><strong>Position:</strong> {employee.position}</Typography>
          <Typography><strong>Status:</strong> {employee.status}</Typography>
        </Box>
        
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={() => navigate(`/employees/${id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={handleDelete}
            disabled={deleteMutation.isLoading}
          >
            {deleteMutation.isLoading ? 'Deleting...' : 'Delete'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/employees')}
          >
            Back
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};
```

---

## Resources

### Documentation
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Material-UI Documentation](https://mui.com)
- [React Query Documentation](https://tanstack.com/query)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Vite Documentation](https://vitejs.dev)

### Internal Documentation
- See `PROJECT_SUMMARY.md` for project overview
- See `FRONTEND_IMPLEMENTATION_SUMMARY.md` for improvements
- See `TESTING_GUIDE.md` for testing practices
- See `API_REFERENCE.md` for backend APIs

---

## Support

For questions or issues:
1. Check this documentation
2. Review existing code examples
3. Check TypeScript/ESLint errors
4. Create a GitHub issue with details

---

**Document Version**: 2.0  
**Last Updated**: October 10, 2025  
**Maintainer**: Development Team  
**Status**: ACTIVE 🟢
