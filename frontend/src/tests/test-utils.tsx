import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../theme';

// Create a new QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  const testQueryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>{children}</ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Mock data generators
export const mockEmployee = {
  employee_id: 'EMP-001',
  employee_code: 'E001',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  department: 'Engineering',
  position: 'Senior Developer',
  status: 'ACTIVE',
  hire_date: '2023-01-15',
  employment_type: 'FULL_TIME',
};

export const mockAttendance = {
  attendance_id: 'ATT-001',
  employee_id: 'EMP-001',
  check_in: '2024-01-10T09:00:00Z',
  check_out: '2024-01-10T18:00:00Z',
  status: 'PRESENT',
  work_hours: 8,
};

export const mockLeaveRequest = {
  leave_id: 'LV-001',
  employee_id: 'EMP-001',
  leave_type: 'ANNUAL',
  start_date: '2024-02-01',
  end_date: '2024-02-05',
  days_requested: 5,
  status: 'PENDING',
  reason: 'Family vacation',
};

export const mockUser = {
  user_id: 'USER-001',
  email: 'admin@example.com',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin',
  organization_id: 'ORG-001',
};
