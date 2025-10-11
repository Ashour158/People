import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '../layout/Layout';
import { useAuthStore } from '../../store/authStore';

// Mock the auth store
jest.mock('../../store/authStore');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock child components
jest.mock('../../components/common/GlobalSearch', () => ({
  GlobalSearch: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    <div data-testid="global-search" style={{ display: open ? 'block' : 'none' }}>
      <button onClick={onClose}>Close Search</button>
    </div>
  ),
}));

jest.mock('../../components/onboarding/OnboardingTour', () => ({
  OnboardingTour: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    <div data-testid="onboarding-tour" style={{ display: open ? 'block' : 'none' }}>
      <button onClick={onClose}>Close Tour</button>
    </div>
  ),
}));

jest.mock('../../components/help/HelpSystem', () => ({
  HelpSystem: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    <div data-testid="help-system" style={{ display: open ? 'block' : 'none' }}>
      <button onClick={onClose}>Close Help</button>
    </div>
  ),
}));

jest.mock('../../components/help/ContextualHelp', () => ({
  ContextualHelp: ({ context }: { context: string }) => (
    <div data-testid="contextual-help" data-context={context}>
      Contextual Help
    </div>
  ),
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

describe('Layout Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  it('renders layout with navigation for employee role', () => {
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

    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    // Check if main navigation items are present for employee
    expect(screen.getByText('My Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Time & Leave')).toBeInTheDocument();
    expect(screen.getByText('My Profile')).toBeInTheDocument();
  });

  it('renders layout with navigation for hr_manager role', () => {
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
        <Layout />
      </TestWrapper>
    );

    // Check if main navigation items are present for HR manager
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Team Management')).toBeInTheDocument();
    expect(screen.getByText('HR Operations')).toBeInTheDocument();
  });

  it('renders layout with navigation for admin role', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        user_id: '1',
        username: 'admin',
        email: 'admin@example.com',
        organization_id: 'org1',
        role: 'admin',
      },
      token: 'mock-token',
      isAuthenticated: true,
      logout: jest.fn(),
    });

    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    // Check if main navigation items are present for admin
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('People')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
  });

  it('handles logout when logout button is clicked', () => {
    const mockLogout = jest.fn();
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
      logout: mockLogout,
    });

    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
  });

  it('shows user information in header', () => {
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

    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    expect(screen.getByText('john.doe')).toBeInTheDocument();
  });

  it('renders contextual help component', () => {
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

    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    expect(screen.getByTestId('contextual-help')).toBeInTheDocument();
    expect(screen.getByTestId('contextual-help')).toHaveAttribute('data-context', 'dashboard');
  });

  it('handles mobile drawer toggle', () => {
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

    render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    // Check if menu button is present (for mobile)
    const menuButton = screen.getByLabelText('open drawer');
    expect(menuButton).toBeInTheDocument();
  });
});
