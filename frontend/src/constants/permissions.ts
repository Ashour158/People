/**
 * Permission constants for role-based access control
 * These match the backend permission system
 */

// ==================== ROLES ====================
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  HR_MANAGER: 'hr_manager',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  FINANCE: 'finance',
  RECRUITER: 'recruiter',
} as const;

// ==================== EMPLOYEE PERMISSIONS ====================
export const EMPLOYEE_PERMISSIONS = {
  VIEW_ALL: 'employees:view_all',
  VIEW_OWN: 'employees:view_own',
  CREATE: 'employees:create',
  UPDATE: 'employees:update',
  UPDATE_OWN: 'employees:update_own',
  DELETE: 'employees:delete',
  VIEW_SALARY: 'employees:view_salary',
} as const;

// ==================== ATTENDANCE PERMISSIONS ====================
export const ATTENDANCE_PERMISSIONS = {
  VIEW_ALL: 'attendance:view_all',
  VIEW_OWN: 'attendance:view_own',
  CHECK_IN: 'attendance:check_in',
  CHECK_OUT: 'attendance:check_out',
  REGULARIZE: 'attendance:regularize',
  APPROVE: 'attendance:approve',
  MANAGE: 'attendance:manage',
} as const;

// ==================== LEAVE PERMISSIONS ====================
export const LEAVE_PERMISSIONS = {
  VIEW_ALL: 'leave:view_all',
  VIEW_OWN: 'leave:view_own',
  APPLY: 'leave:apply',
  APPROVE: 'leave:approve',
  REJECT: 'leave:reject',
  CANCEL: 'leave:cancel',
  MANAGE_TYPES: 'leave:manage_types',
  VIEW_BALANCE: 'leave:view_balance',
} as const;

// ==================== PERFORMANCE PERMISSIONS ====================
export const PERFORMANCE_PERMISSIONS = {
  VIEW_ALL: 'performance:view_all',
  VIEW_OWN: 'performance:view_own',
  CREATE_GOAL: 'performance:create_goal',
  UPDATE_GOAL: 'performance:update_goal',
  CREATE_REVIEW: 'performance:create_review',
  SUBMIT_REVIEW: 'performance:submit_review',
  PROVIDE_FEEDBACK: 'performance:provide_feedback',
  VIEW_ANALYTICS: 'performance:view_analytics',
  MANAGE_CYCLES: 'performance:manage_cycles',
} as const;

// ==================== RECRUITMENT PERMISSIONS ====================
export const RECRUITMENT_PERMISSIONS = {
  VIEW_JOBS: 'recruitment:view_jobs',
  CREATE_JOB: 'recruitment:create_job',
  UPDATE_JOB: 'recruitment:update_job',
  PUBLISH_JOB: 'recruitment:publish_job',
  VIEW_CANDIDATES: 'recruitment:view_candidates',
  CREATE_CANDIDATE: 'recruitment:create_candidate',
  VIEW_APPLICATIONS: 'recruitment:view_applications',
  SHORTLIST: 'recruitment:shortlist',
  SCHEDULE_INTERVIEW: 'recruitment:schedule_interview',
  SUBMIT_FEEDBACK: 'recruitment:submit_feedback',
  CREATE_OFFER: 'recruitment:create_offer',
  VIEW_PIPELINE: 'recruitment:view_pipeline',
} as const;

// ==================== PAYROLL PERMISSIONS ====================
export const PAYROLL_PERMISSIONS = {
  VIEW_ALL: 'payroll:view_all',
  VIEW_OWN: 'payroll:view_own',
  CREATE_STRUCTURE: 'payroll:create_structure',
  PROCESS: 'payroll:process',
  APPROVE: 'payroll:approve',
  VIEW_REPORTS: 'payroll:view_reports',
  MANAGE_BONUS: 'payroll:manage_bonus',
  MANAGE_LOAN: 'payroll:manage_loan',
  MANAGE_REIMBURSEMENT: 'payroll:manage_reimbursement',
} as const;

// ==================== EXPENSE PERMISSIONS ====================
export const EXPENSE_PERMISSIONS = {
  VIEW_ALL: 'expenses:view_all',
  VIEW_OWN: 'expenses:view_own',
  CREATE: 'expenses:create',
  UPDATE: 'expenses:update',
  DELETE: 'expenses:delete',
  SUBMIT: 'expenses:submit',
  APPROVE: 'expenses:approve',
  REJECT: 'expenses:reject',
  REIMBURSE: 'expenses:reimburse',
  MANAGE_POLICIES: 'expenses:manage_policies',
  VIEW_STATS: 'expenses:view_stats',
} as const;

// ==================== TIMESHEET PERMISSIONS ====================
export const TIMESHEET_PERMISSIONS = {
  VIEW_ALL: 'timesheet:view_all',
  VIEW_OWN: 'timesheet:view_own',
  CREATE_ENTRY: 'timesheet:create_entry',
  UPDATE_ENTRY: 'timesheet:update_entry',
  SUBMIT: 'timesheet:submit',
  APPROVE: 'timesheet:approve',
  REJECT: 'timesheet:reject',
  MANAGE_PROJECTS: 'timesheet:manage_projects',
  VIEW_ANALYTICS: 'timesheet:view_analytics',
} as const;

// ==================== DOCUMENT PERMISSIONS ====================
export const DOCUMENT_PERMISSIONS = {
  VIEW_ALL: 'documents:view_all',
  VIEW_OWN: 'documents:view_own',
  UPLOAD: 'documents:upload',
  DOWNLOAD: 'documents:download',
  DELETE: 'documents:delete',
  VERIFY: 'documents:verify',
  MANAGE: 'documents:manage',
} as const;

// ==================== REPORT PERMISSIONS ====================
export const REPORT_PERMISSIONS = {
  VIEW_ALL: 'reports:view_all',
  VIEW_OWN_TEAM: 'reports:view_own_team',
  GENERATE: 'reports:generate',
  EXPORT: 'reports:export',
  SCHEDULE: 'reports:schedule',
} as const;

// ==================== SETTINGS PERMISSIONS ====================
export const SETTINGS_PERMISSIONS = {
  VIEW: 'settings:view',
  UPDATE: 'settings:update',
  MANAGE_USERS: 'settings:manage_users',
  MANAGE_ROLES: 'settings:manage_roles',
  MANAGE_ORGANIZATION: 'settings:manage_organization',
} as const;

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if user has a specific permission
 */
export const hasPermission = (
  userPermissions: string[] | undefined,
  requiredPermission: string
): boolean => {
  if (!userPermissions) return false;
  return userPermissions.includes(requiredPermission);
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = (
  userPermissions: string[] | undefined,
  requiredPermissions: string[]
): boolean => {
  if (!userPermissions || requiredPermissions.length === 0) return false;
  return requiredPermissions.some(permission => 
    userPermissions.includes(permission)
  );
};

/**
 * Check if user has all of the specified permissions
 */
export const hasAllPermissions = (
  userPermissions: string[] | undefined,
  requiredPermissions: string[]
): boolean => {
  if (!userPermissions || requiredPermissions.length === 0) return false;
  return requiredPermissions.every(permission => 
    userPermissions.includes(permission)
  );
};

/**
 * Check if user has a specific role
 */
export const hasRole = (
  userRole: string | undefined,
  requiredRole: string
): boolean => {
  if (!userRole) return false;
  return userRole === requiredRole;
};

/**
 * Check if user has any of the specified roles
 */
export const hasAnyRole = (
  userRole: string | undefined,
  requiredRoles: string[]
): boolean => {
  if (!userRole || requiredRoles.length === 0) return false;
  return requiredRoles.includes(userRole);
};

// ==================== ROLE PERMISSION MAPPINGS ====================

/**
 * Default permissions for each role
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLES.SUPER_ADMIN]: ['*'], // All permissions
  
  [ROLES.ADMIN]: [
    // Employee
    EMPLOYEE_PERMISSIONS.VIEW_ALL,
    EMPLOYEE_PERMISSIONS.CREATE,
    EMPLOYEE_PERMISSIONS.UPDATE,
    EMPLOYEE_PERMISSIONS.DELETE,
    EMPLOYEE_PERMISSIONS.VIEW_SALARY,
    // Attendance
    ATTENDANCE_PERMISSIONS.VIEW_ALL,
    ATTENDANCE_PERMISSIONS.APPROVE,
    ATTENDANCE_PERMISSIONS.MANAGE,
    // Leave
    LEAVE_PERMISSIONS.VIEW_ALL,
    LEAVE_PERMISSIONS.APPROVE,
    LEAVE_PERMISSIONS.REJECT,
    LEAVE_PERMISSIONS.MANAGE_TYPES,
    // Settings
    SETTINGS_PERMISSIONS.VIEW,
    SETTINGS_PERMISSIONS.UPDATE,
    SETTINGS_PERMISSIONS.MANAGE_USERS,
    SETTINGS_PERMISSIONS.MANAGE_ROLES,
    SETTINGS_PERMISSIONS.MANAGE_ORGANIZATION,
  ],
  
  [ROLES.HR_MANAGER]: [
    // Employee
    EMPLOYEE_PERMISSIONS.VIEW_ALL,
    EMPLOYEE_PERMISSIONS.CREATE,
    EMPLOYEE_PERMISSIONS.UPDATE,
    // Attendance
    ATTENDANCE_PERMISSIONS.VIEW_ALL,
    ATTENDANCE_PERMISSIONS.APPROVE,
    // Leave
    LEAVE_PERMISSIONS.VIEW_ALL,
    LEAVE_PERMISSIONS.APPROVE,
    LEAVE_PERMISSIONS.REJECT,
    LEAVE_PERMISSIONS.MANAGE_TYPES,
    // Performance
    PERFORMANCE_PERMISSIONS.VIEW_ALL,
    PERFORMANCE_PERMISSIONS.MANAGE_CYCLES,
    // Recruitment
    ...Object.values(RECRUITMENT_PERMISSIONS),
    // Reports
    REPORT_PERMISSIONS.VIEW_ALL,
    REPORT_PERMISSIONS.GENERATE,
    REPORT_PERMISSIONS.EXPORT,
  ],
  
  [ROLES.MANAGER]: [
    // Employee
    EMPLOYEE_PERMISSIONS.VIEW_ALL,
    EMPLOYEE_PERMISSIONS.UPDATE,
    // Attendance
    ATTENDANCE_PERMISSIONS.VIEW_ALL,
    ATTENDANCE_PERMISSIONS.APPROVE,
    // Leave
    LEAVE_PERMISSIONS.VIEW_ALL,
    LEAVE_PERMISSIONS.APPROVE,
    LEAVE_PERMISSIONS.REJECT,
    // Performance
    PERFORMANCE_PERMISSIONS.VIEW_ALL,
    PERFORMANCE_PERMISSIONS.CREATE_REVIEW,
    PERFORMANCE_PERMISSIONS.SUBMIT_REVIEW,
    PERFORMANCE_PERMISSIONS.PROVIDE_FEEDBACK,
    // Timesheet
    TIMESHEET_PERMISSIONS.VIEW_ALL,
    TIMESHEET_PERMISSIONS.APPROVE,
    TIMESHEET_PERMISSIONS.REJECT,
    // Expenses
    EXPENSE_PERMISSIONS.VIEW_ALL,
    EXPENSE_PERMISSIONS.APPROVE,
    EXPENSE_PERMISSIONS.REJECT,
    // Reports
    REPORT_PERMISSIONS.VIEW_OWN_TEAM,
    REPORT_PERMISSIONS.GENERATE,
  ],
  
  [ROLES.EMPLOYEE]: [
    // Employee
    EMPLOYEE_PERMISSIONS.VIEW_OWN,
    EMPLOYEE_PERMISSIONS.UPDATE_OWN,
    // Attendance
    ATTENDANCE_PERMISSIONS.VIEW_OWN,
    ATTENDANCE_PERMISSIONS.CHECK_IN,
    ATTENDANCE_PERMISSIONS.CHECK_OUT,
    ATTENDANCE_PERMISSIONS.REGULARIZE,
    // Leave
    LEAVE_PERMISSIONS.VIEW_OWN,
    LEAVE_PERMISSIONS.APPLY,
    LEAVE_PERMISSIONS.CANCEL,
    LEAVE_PERMISSIONS.VIEW_BALANCE,
    // Performance
    PERFORMANCE_PERMISSIONS.VIEW_OWN,
    PERFORMANCE_PERMISSIONS.CREATE_GOAL,
    PERFORMANCE_PERMISSIONS.UPDATE_GOAL,
    PERFORMANCE_PERMISSIONS.PROVIDE_FEEDBACK,
    // Timesheet
    TIMESHEET_PERMISSIONS.VIEW_OWN,
    TIMESHEET_PERMISSIONS.CREATE_ENTRY,
    TIMESHEET_PERMISSIONS.UPDATE_ENTRY,
    TIMESHEET_PERMISSIONS.SUBMIT,
    // Expenses
    EXPENSE_PERMISSIONS.VIEW_OWN,
    EXPENSE_PERMISSIONS.CREATE,
    EXPENSE_PERMISSIONS.UPDATE,
    EXPENSE_PERMISSIONS.SUBMIT,
    // Payroll
    PAYROLL_PERMISSIONS.VIEW_OWN,
    // Documents
    DOCUMENT_PERMISSIONS.VIEW_OWN,
    DOCUMENT_PERMISSIONS.UPLOAD,
    DOCUMENT_PERMISSIONS.DOWNLOAD,
  ],
  
  [ROLES.FINANCE]: [
    // Payroll
    ...Object.values(PAYROLL_PERMISSIONS),
    // Expenses
    EXPENSE_PERMISSIONS.VIEW_ALL,
    EXPENSE_PERMISSIONS.APPROVE,
    EXPENSE_PERMISSIONS.REJECT,
    EXPENSE_PERMISSIONS.REIMBURSE,
    EXPENSE_PERMISSIONS.MANAGE_POLICIES,
    EXPENSE_PERMISSIONS.VIEW_STATS,
    // Reports
    REPORT_PERMISSIONS.VIEW_ALL,
    REPORT_PERMISSIONS.GENERATE,
    REPORT_PERMISSIONS.EXPORT,
  ],
  
  [ROLES.RECRUITER]: [
    // Recruitment
    ...Object.values(RECRUITMENT_PERMISSIONS),
    // Reports
    REPORT_PERMISSIONS.VIEW_OWN_TEAM,
    REPORT_PERMISSIONS.GENERATE,
  ],
};

export default {
  ROLES,
  EMPLOYEE_PERMISSIONS,
  ATTENDANCE_PERMISSIONS,
  LEAVE_PERMISSIONS,
  PERFORMANCE_PERMISSIONS,
  RECRUITMENT_PERMISSIONS,
  PAYROLL_PERMISSIONS,
  EXPENSE_PERMISSIONS,
  TIMESHEET_PERMISSIONS,
  DOCUMENT_PERMISSIONS,
  REPORT_PERMISSIONS,
  SETTINGS_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  ROLE_PERMISSIONS,
};
