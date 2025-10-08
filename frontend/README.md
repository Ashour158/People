# Frontend - HR Management System

## Overview

This is the frontend application for the HR Management System, built with React 18, TypeScript, Vite, and Material-UI.

## Tech Stack

- **Framework**: React 18.2+
- **Language**: TypeScript 5.3+
- **Build Tool**: Vite 5+
- **UI Library**: Material-UI (MUI) 5+
- **State Management**: Zustand + React Query
- **Forms**: React Hook Form + Yup
- **HTTP Client**: Axios
- **Testing**: Vitest + Testing Library
- **Code Quality**: ESLint + Prettier

## Project Structure

```
src/
├── api/                    # API client and endpoints
│   ├── axios.ts           # Axios instance with interceptors
│   ├── auth.api.ts        # Authentication API
│   └── index.ts           # Other API endpoints (employees, attendance, leave)
│
├── components/            # React components
│   ├── common/           # Shared/reusable components
│   │   └── ProtectedRoute.tsx
│   └── layout/           # Layout components
│       └── Layout.tsx
│
├── pages/                # Page components (routes)
│   ├── auth/            # Authentication pages
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   ├── dashboard/       # Dashboard
│   │   └── Dashboard.tsx
│   ├── employees/       # Employee management
│   │   └── EmployeeList.tsx
│   ├── attendance/      # Attendance tracking
│   │   └── AttendanceCheckIn.tsx
│   └── leave/           # Leave management
│       └── LeaveApply.tsx
│
├── hooks/                # Custom React hooks
│   ├── useAuth.ts       # Authentication hook
│   ├── useWindowSize.ts # Window size tracking
│   └── useUpdateEffect.ts # Update-only effect
│
├── store/                # State management (Zustand)
│   └── authStore.ts     # Authentication state
│
├── types/                # TypeScript type definitions
│   └── index.ts         # All type definitions
│
├── utils/                # Utility functions
│   ├── date.ts          # Date formatting utilities
│   ├── error.ts         # Error handling utilities
│   ├── helpers.ts       # General helper functions
│   └── index.ts         # Export all utilities
│
├── validations/          # Form validation schemas
│   └── index.ts         # Yup validation schemas
│
├── constants/            # Constants and configuration
│   └── index.ts         # App constants
│
├── tests/                # Test setup
│   └── setup.ts
│
├── main.tsx             # Application entry point
└── vite-env.d.ts        # Vite environment types
```

## Key Features

### Type Safety
- Comprehensive TypeScript types for all entities
- Proper API response types with generics
- No `any` types (enforced by ESLint)
- Strict TypeScript configuration

### API Client
- Axios instance with request/response interceptors
- Automatic token injection
- Centralized error handling
- Automatic redirect on 401 (unauthorized)

### State Management
- **Zustand** for global state (auth)
- **React Query** for server state
- Automatic cache invalidation
- Optimistic updates

### Error Handling
- Centralized error utilities
- Type-safe error messages
- User-friendly error display
- Toast notifications

### Validation
- Yup schemas for all forms
- Type-safe validation rules
- Reusable validation patterns
- Consistent error messages

### Code Quality
- ESLint configuration with strict rules
- Prettier for consistent formatting
- No console.log in production
- Enforced code conventions

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_WS_URL=http://localhost:5000
```

### Development Server

```bash
npm run dev
```

Runs on `http://localhost:3000`

### Build

```bash
npm run build
```

Outputs to `dist/` directory

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint        # Check for errors
npm run lint:fix    # Auto-fix errors
```

### Formatting

```bash
npm run format       # Format all files
npm run format:check # Check formatting
```

### Testing

```bash
npm test              # Run tests once
npm run test:watch    # Watch mode
npm run test:ui       # UI mode
npm run test:coverage # Coverage report
```

### Full Validation

```bash
npm run validate
```

Runs lint + typecheck + tests

## Coding Standards

### TypeScript
- Use explicit types for function parameters and return values
- Use interfaces for object shapes
- Avoid `any` type - use `unknown` if needed
- Enable strict mode
- Use proper null checking with `?.` and `??`

### React Components
- Use functional components with hooks only
- Keep components under 200 lines
- Extract complex logic to custom hooks
- Use proper prop types with TypeScript interfaces
- Implement proper error boundaries

### File Naming
- Components: PascalCase (e.g., `EmployeeList.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useAuth.ts`)
- Utils: camelCase (e.g., `helpers.ts`)
- Types: camelCase (e.g., `index.ts`)

### Import Order
1. React and external libraries
2. Internal components
3. Hooks
4. Utils and helpers
5. Types
6. Styles

Example:
```typescript
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@mui/material';

import { EmployeeCard } from '../../components/employees/EmployeeCard';
import { useAuth } from '../../hooks';
import { formatDate, getErrorMessage } from '../../utils';
import type { Employee } from '../../types';
```

### Component Structure

```typescript
import React from 'react';
import type { FC } from 'react';

// Types
interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
}

// Component
export const MyComponent: FC<Props> = ({ title, onSubmit }) => {
  // State
  const [value, setValue] = React.useState('');
  
  // Hooks
  const { user } = useAuth();
  
  // Queries/Mutations
  const { data, isLoading } = useQuery({
    queryKey: ['key'],
    queryFn: fetchData,
  });
  
  // Handlers
  const handleSubmit = () => {
    onSubmit({ value });
  };
  
  // Early returns
  if (isLoading) return <Loading />;
  
  // Render
  return (
    <div>
      <h1>{title}</h1>
      {/* ... */}
    </div>
  );
};
```

## API Integration

### Making API Calls

```typescript
import { employeeApi } from '../api';
import { useQuery, useMutation } from '@tanstack/react-query';

// Query (GET)
const { data, isLoading, error } = useQuery({
  queryKey: ['employees'],
  queryFn: () => employeeApi.getAll(),
});

// Mutation (POST/PUT/DELETE)
const createMutation = useMutation({
  mutationFn: employeeApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  },
});
```

### Error Handling

```typescript
import { getErrorMessage } from '../utils';

const mutation = useMutation({
  mutationFn: someApi.action,
  onError: (error: unknown) => {
    const message = getErrorMessage(error);
    toast.error(message);
  },
});
```

## State Management

### Zustand Store

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MyState {
  value: string;
  setValue: (value: string) => void;
}

export const useMyStore = create<MyState>()(
  persist(
    (set) => ({
      value: '',
      setValue: (value) => set({ value }),
    }),
    {
      name: 'my-storage',
    }
  )
);
```

### React Query

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// In component
const queryClient = useQueryClient();

// Invalidate cache after mutation
const mutation = useMutation({
  mutationFn: api.update,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['data'] });
  },
});
```

## Form Validation

```typescript
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { loginSchema } from '../validations';

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: yupResolver(loginSchema),
});
```

## Constants Usage

```typescript
import { API_CONFIG, ROUTES, QUERY_KEYS } from '../constants';

// Use constants instead of magic strings
const url = API_CONFIG.BASE_URL;
navigate(ROUTES.DASHBOARD);
useQuery({ queryKey: [QUERY_KEYS.EMPLOYEES] });
```

## Performance Optimization

1. **Code Splitting**: Use dynamic imports for routes
2. **Memoization**: Use `React.memo`, `useMemo`, `useCallback`
3. **Lazy Loading**: Lazy load heavy components
4. **Image Optimization**: Optimize and lazy load images
5. **Bundle Analysis**: Check bundle size regularly

## Troubleshooting

### Type Errors
- Run `npm run typecheck` to see all type errors
- Check `vite-env.d.ts` for environment variable types

### Build Errors
- Clear `node_modules` and `dist`: `rm -rf node_modules dist`
- Reinstall: `npm install`
- Clear cache: `npm cache clean --force`

### ESLint Errors
- Run `npm run lint` to see errors
- Run `npm run lint:fix` to auto-fix
- Check `.eslintrc.json` for rules

## Contributing

1. Follow the existing code structure
2. Write TypeScript, not JavaScript
3. Add types for all functions and components
4. Write tests for new features
5. Run `npm run validate` before committing
6. Follow the coding standards

## Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Material-UI Documentation](https://mui.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Vite Documentation](https://vitejs.dev/)
