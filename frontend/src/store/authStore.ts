import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { websocketService } from '../services/websocket.service';

interface User {
  user_id: string;
  username: string;
  email: string;
  organization_id: string;
  employee_id?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
        
        // Connect to WebSocket after authentication
        websocketService.connect(token);
        
        // Subscribe to user-specific channels
        const channels = [
          `user:${user.user_id}`,
          `organization:${user.organization_id}`,
        ];
        if (user.employee_id) {
          channels.push(`employee:${user.employee_id}`);
        }
        websocketService.subscribe(channels);
      },
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Disconnect WebSocket on logout
        websocketService.disconnect();
        
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
