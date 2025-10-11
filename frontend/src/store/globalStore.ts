import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface GlobalState {
  // UI State
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  loading: boolean;
  notifications: Notification[];
  
  // User State
  currentUser: any | null;
  permissions: string[];
  
  // Data State
  employees: any[];
  departments: any[];
  attendance: any[];
  leaveRequests: any[];
  
  // Actions
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLoading: (loading: boolean) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  setCurrentUser: (user: any) => void;
  setPermissions: (permissions: string[]) => void;
  setEmployees: (employees: any[]) => void;
  setDepartments: (departments: any[]) => void;
  setAttendance: (attendance: any[]) => void;
  setLeaveRequests: (requests: any[]) => void;
  
  // Computed
  isAdmin: () => boolean;
  isHR: () => boolean;
  isEmployee: () => boolean;
  hasPermission: (permission: string) => boolean;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export const useGlobalStore = create<GlobalState>()(
  persist(
    immer((set, get) => ({
      // Initial State
      sidebarOpen: true,
      theme: 'light',
      loading: false,
      notifications: [],
      currentUser: null,
      permissions: [],
      employees: [],
      departments: [],
      attendance: [],
      leaveRequests: [],
      
      // Actions
      setSidebarOpen: (open) => set((state) => {
        state.sidebarOpen = open;
      }),
      
      setTheme: (theme) => set((state) => {
        state.theme = theme;
      }),
      
      setLoading: (loading) => set((state) => {
        state.loading = loading;
      }),
      
      addNotification: (notification) => set((state) => {
        state.notifications.push(notification);
      }),
      
      removeNotification: (id) => set((state) => {
        state.notifications = state.notifications.filter(n => n.id !== id);
      }),
      
      setCurrentUser: (user) => set((state) => {
        state.currentUser = user;
      }),
      
      setPermissions: (permissions) => set((state) => {
        state.permissions = permissions;
      }),
      
      setEmployees: (employees) => set((state) => {
        state.employees = employees;
      }),
      
      setDepartments: (departments) => set((state) => {
        state.departments = departments;
      }),
      
      setAttendance: (attendance) => set((state) => {
        state.attendance = attendance;
      }),
      
      setLeaveRequests: (requests) => set((state) => {
        state.leaveRequests = requests;
      }),
      
      // Computed
      isAdmin: () => {
        const { currentUser } = get();
        return currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
      },
      
      isHR: () => {
        const { currentUser } = get();
        return currentUser?.role === 'hr_manager' || currentUser?.role === 'hr_admin';
      },
      
      isEmployee: () => {
        const { currentUser } = get();
        return currentUser?.role === 'employee';
      },
      
      hasPermission: (permission) => {
        const { permissions } = get();
        return permissions.includes(permission) || permissions.includes('*');
      },
    })),
    {
      name: 'global-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        currentUser: state.currentUser,
        permissions: state.permissions,
      }),
    }
  )
);
