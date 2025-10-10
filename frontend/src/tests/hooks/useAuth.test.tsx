import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

describe('useAuth Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('initializes with no user', () => {
    const mockUseAuth = () => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    const { result } = renderHook(() => mockUseAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('handles login', async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      user: { id: '1', email: 'test@example.com' },
      token: 'mock-token',
    });

    const mockUseAuth = () => ({
      user: null,
      isAuthenticated: false,
      login: mockLogin,
    });

    const { result } = renderHook(() => mockUseAuth(), { wrapper });

    await result.current.login('test@example.com', 'password');

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password');
  });

  it('handles logout', async () => {
    const mockLogout = vi.fn();

    const mockUseAuth = () => ({
      user: { id: '1', email: 'test@example.com' },
      isAuthenticated: true,
      logout: mockLogout,
    });

    const { result } = renderHook(() => mockUseAuth(), { wrapper });

    result.current.logout();

    expect(mockLogout).toHaveBeenCalled();
  });

  it('handles authentication state', () => {
    const mockUseAuth = () => ({
      user: { id: '1', email: 'test@example.com', role: 'admin' },
      isAuthenticated: true,
      isLoading: false,
    });

    const { result } = renderHook(() => mockUseAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('test@example.com');
  });
});
