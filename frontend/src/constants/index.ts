// ============================================
// API CONSTANTS
// ============================================

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://143.110.227.18:8000/api/v1',
  WS_URL: import.meta.env.VITE_WS_URL || 'http://143.110.227.18:8000',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

// ============================================
// PAGINATION CONSTANTS
// ============================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100],
} as const;

// ============================================
// EMPLOYEE STATUS
// ============================================

export const EMPLOYEE_STATUS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  ON_LEAVE: 'On Leave',
  TERMINATED: 'Terminated',
} as const;

export const EMPLOYEE_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'On Leave', label: 'On Leave' },
  { value: 'Terminated', label: 'Terminated' },
] as const;

// ============================================
// EMPLOYMENT TYPE
// ============================================

export const EMPLOYMENT_TYPE = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
} as const;

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'Full-time', label: 'Full-time' },
  { value: 'Part-time', label: 'Part-time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Intern', label: 'Intern' },
] as const;

// ============================================
// GENDER OPTIONS
// ============================================

export const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
] as const;

// ============================================
// ATTENDANCE STATUS
// ============================================

export const ATTENDANCE_STATUS = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  HALF_DAY: 'Half Day',
  LEAVE: 'Leave',
  HOLIDAY: 'Holiday',
} as const;

export const ATTENDANCE_STATUS_OPTIONS = [
  { value: 'Present', label: 'Present' },
  { value: 'Absent', label: 'Absent' },
  { value: 'Half Day', label: 'Half Day' },
  { value: 'Leave', label: 'Leave' },
  { value: 'Holiday', label: 'Holiday' },
] as const;

// ============================================
// LEAVE STATUS
// ============================================

export const LEAVE_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
} as const;

export const LEAVE_STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Cancelled', label: 'Cancelled' },
] as const;

// ============================================
// DATE FORMATS
// ============================================

export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  INPUT: 'yyyy-MM-dd',
  DATETIME: 'MMM dd, yyyy HH:mm',
  TIME: 'HH:mm',
} as const;

// ============================================
// VALIDATION RULES
// ============================================

export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  EMAIL_REGEX: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  PHONE_REGEX: /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/,
} as const;

// ============================================
// LOCAL STORAGE KEYS
// ============================================

export const STORAGE_KEYS = {
  TOKEN: 'token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  AUTH_STORAGE: 'auth-storage',
} as const;

// ============================================
// QUERY KEYS
// ============================================

export const QUERY_KEYS = {
  EMPLOYEES: 'employees',
  EMPLOYEE: 'employee',
  ATTENDANCE: 'attendance',
  LEAVE: 'leave',
  LEAVE_TYPES: 'leaveTypes',
  LEAVE_BALANCE: 'leaveBalance',
  DEPARTMENTS: 'departments',
  DESIGNATIONS: 'designations',
  DASHBOARD_STATS: 'dashboardStats',
  USER_PROFILE: 'userProfile',
} as const;

// ============================================
// ROUTES
// ============================================

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  EMPLOYEES: '/employees',
  EMPLOYEE_NEW: '/employees/new',
  EMPLOYEE_DETAIL: (id: string) => `/employees/${id}`,
  ATTENDANCE: '/attendance',
  LEAVE: '/leave',
  PROFILE: '/profile',
  SETTINGS: '/settings',
} as const;
