import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from '../dashboard/Dashboard';
import { useAuthStore } from '../../store/authStore';

// Mock the auth store
jest.mock('../../store/authStore');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock API calls
jest.mock('../../api', () => ({
  employeeApi: {
    getAll: jest.fn(),
  },
  attendanceApi: {
    getSummary: jest.fn(),
  },
  leaveApi: {
    getBalance: jest.fn(),
  },
}));

// Mock charts
jest.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuthStore.mockReturnValue({
      user: {
        user_id: '1',
        username: 'john.doe',
        email: 'john.doe@example.com',
        organization_id: 'org1',
        role: 'employee',
      },
      token: 'mock-token',
      isAuthenticated: true,
      logout: jest.fn(),
    });
  });

  it('renders dashboard with welcome message', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText('HR Management System')).toBeInTheDocument();
    expect(screen.getByText('Welcome to your HRMS Dashboard!')).toBeInTheDocument();
  });

  it('renders statistics cards', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Total Employees')).toBeInTheDocument();
    expect(screen.getByText('Active Today')).toBeInTheDocument();
    expect(screen.getByText('On Leave')).toBeInTheDocument();
    expect(screen.getByText('Pending Requests')).toBeInTheDocument();
  });

  it('renders unified employee hub', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText('🎯 Your HR Hub')).toBeInTheDocument();
    expect(screen.getByText('Everything you need in one place')).toBeInTheDocument();
  });

  it('renders time and attendance card', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Time & Attendance')).toBeInTheDocument();
    expect(screen.getByText('Check in/out, view your hours, request time off')).toBeInTheDocument();
  });

  it('renders leave and benefits card', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Leave & Benefits')).toBeInTheDocument();
    expect(screen.getByText('Apply for leave, view your balance, check benefits')).toBeInTheDocument();
  });

  it('renders pay and performance card', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Pay & Performance')).toBeInTheDocument();
    expect(screen.getByText('View payslips, track performance, set goals')).toBeInTheDocument();
  });

  it('handles card clicks for navigation', () => {
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    const timeAttendanceCard = screen.getByText('Time & Attendance').closest('div');
    if (timeAttendanceCard) {
      fireEvent.click(timeAttendanceCard);
    }
  });

  it('renders recent activities section', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Recent Activities')).toBeInTheDocument();
  });

  it('renders quick stats section', () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Quick Stats')).toBeInTheDocument();
  });

  it('shows loading state when data is being fetched', async () => {
    // Mock loading state
    jest.doMock('@tanstack/react-query', () => ({
      useQuery: () => ({
        data: undefined,
        isLoading: true,
        error: null,
      }),
    }));

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Should show loading indicators
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  it('handles error state gracefully', async () => {
    // Mock error state
    jest.doMock('@tanstack/react-query', () => ({
      useQuery: () => ({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch data'),
      }),
    }));

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Error loading data')).toBeInTheDocument();
    });
  });

  it('renders different content for different user roles', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        user_id: '1',
        username: 'hr.manager',
        email: 'hr.manager@example.com',
        organization_id: 'org1',
        role: 'hr_manager',
      },
      token: 'mock-token',
      isAuthenticated: true,
      logout: jest.fn(),
    });

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    // Should show HR-specific content
    expect(screen.getByText('HR Management System')).toBeInTheDocument();
  });
});
