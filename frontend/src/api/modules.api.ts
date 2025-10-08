import axios from './axios';

// ==================== PERFORMANCE ====================

export interface PerformanceGoal {
  goal_id: string;
  employee_id: string;
  goal_title: string;
  goal_description?: string;
  goal_type: 'okr' | 'kpi' | 'smart' | 'project' | 'learning';
  progress_percentage: number;
  status: string;
  target_date: string;
}

export interface PerformanceReview {
  review_id: string;
  employee_id: string;
  reviewer_id: string;
  review_type: 'self' | 'manager' | 'peer' | '360';
  overall_rating?: number;
  review_status: string;
}

export const performanceApi = {
  // Goals
  getEmployeeGoals: (employeeId: string, params?: any) =>
    axios.get(`/performance/employees/${employeeId}/goals`, { params }),
  
  createGoal: (data: Partial<PerformanceGoal>) =>
    axios.post('/performance/goals', data),
  
  updateGoalProgress: (goalId: string, data: any) =>
    axios.put(`/performance/goals/${goalId}/progress`, data),
  
  // Reviews
  getEmployeeReviews: (employeeId: string, params?: any) =>
    axios.get(`/performance/employees/${employeeId}/reviews`, { params }),
  
  createReview: (data: Partial<PerformanceReview>) =>
    axios.post('/performance/reviews', data),
  
  submitReview: (reviewId: string, data: any) =>
    axios.post(`/performance/reviews/${reviewId}/submit`, data),
  
  // Feedback
  provideFeedback: (data: any) =>
    axios.post('/performance/feedback', data),
  
  getEmployeeFeedback: (employeeId: string, params?: any) =>
    axios.get(`/performance/employees/${employeeId}/feedback`, { params }),
  
  // Analytics
  getAnalytics: (params?: any) =>
    axios.get('/performance/analytics', { params }),
};

// ==================== TIMESHEET ====================

export interface TimesheetEntry {
  entry_id: string;
  employee_id: string;
  project_id?: string;
  work_date: string;
  hours_worked: number;
  is_billable: boolean;
  description?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
}

export interface Project {
  project_id: string;
  project_name: string;
  project_code: string;
  project_type: string;
  status: string;
}

export const timesheetApi = {
  // Projects
  getProjects: (params?: any) =>
    axios.get('/timesheet/projects', { params }),
  
  getProjectById: (projectId: string) =>
    axios.get(`/timesheet/projects/${projectId}`),
  
  createProject: (data: Partial<Project>) =>
    axios.post('/timesheet/projects', data),
  
  // Timesheet Entries
  getEntries: (employeeId?: string, params?: any) =>
    axios.get(`/timesheet/entries/${employeeId || ''}`, { params }),
  
  createEntry: (data: Partial<TimesheetEntry>) =>
    axios.post('/timesheet/entries', data),
  
  submitTimesheet: (entryIds: string[]) =>
    axios.post('/timesheet/entries/submit', { entry_ids: entryIds }),
  
  approveEntry: (entryId: string) =>
    axios.post(`/timesheet/entries/${entryId}/approve`),
  
  rejectEntry: (entryId: string, reason: string) =>
    axios.post(`/timesheet/entries/${entryId}/reject`, { rejection_reason: reason }),
  
  // Analytics
  getEmployeeTimeSummary: (employeeId: string, startDate: string, endDate: string) =>
    axios.get(`/timesheet/analytics/employee/${employeeId}/summary`, {
      params: { start_date: startDate, end_date: endDate },
    }),
  
  getPendingApprovals: () =>
    axios.get('/timesheet/analytics/pending-approvals'),
};

// ==================== ONBOARDING ====================

export interface OnboardingProgram {
  program_id: string;
  program_name: string;
  duration_days: number;
  is_active: boolean;
}

export interface OnboardingTask {
  task_id: string;
  task_name: string;
  task_type: string;
  priority: string;
  is_mandatory: boolean;
  status: string;
}

export const onboardingApi = {
  getPrograms: (params?: any) =>
    axios.get('/onboarding/programs', { params }),
  
  getEmployeeOnboarding: (employeeId: string) =>
    axios.get(`/onboarding/employees/${employeeId}`),
  
  getPendingTasks: (employeeId: string) =>
    axios.get(`/onboarding/employees/${employeeId}/pending`),
  
  completeTask: (progressId: string, data: any) =>
    axios.post(`/onboarding/tasks/${progressId}/complete`, data),
  
  getStatistics: () =>
    axios.get('/onboarding/statistics'),
};

// ==================== OFFBOARDING ====================

export const offboardingApi = {
  getEmployeeOffboarding: (employeeId: string) =>
    axios.get(`/offboarding/employees/${employeeId}`),
  
  initiateOffboarding: (data: any) =>
    axios.post('/offboarding/initiate', data),
  
  completeTask: (progressId: string, notes?: string) =>
    axios.post(`/offboarding/tasks/${progressId}/complete`, { notes }),
  
  conductExitInterview: (offboardingId: string, data: any) =>
    axios.post(`/offboarding/${offboardingId}/exit-interview`, data),
  
  getPendingClearances: () =>
    axios.get('/offboarding/pending-clearances'),
  
  getStatistics: () =>
    axios.get('/offboarding/statistics'),
};

// ==================== COMPLIANCE ====================

export const complianceApi = {
  getAuditLogs: (params?: any) =>
    axios.get('/compliance/audit-logs', { params }),
  
  getEmployeeDocuments: (employeeId: string, params?: any) =>
    axios.get(`/compliance/documents/employee/${employeeId}`, { params }),
  
  verifyDocument: (documentId: string, data: any) =>
    axios.post(`/compliance/documents/${documentId}/verify`, data),
  
  getExpiringDocuments: (days?: number) =>
    axios.get('/compliance/documents/expiring', { params: { days } }),
  
  recordConsent: (data: any) =>
    axios.post('/compliance/gdpr/consent', data),
  
  exportEmployeeData: (employeeId: string) =>
    axios.get(`/compliance/gdpr/export/${employeeId}`),
  
  getComplianceReport: (reportType: string) =>
    axios.get(`/compliance/reports/${reportType}`),
};

// ==================== ANALYTICS ====================

export const analyticsApi = {
  getDashboardMetrics: () =>
    axios.get('/analytics/dashboard'),
  
  getAttritionAnalysis: (periodMonths?: number) =>
    axios.get('/analytics/attrition', { params: { period_months: periodMonths } }),
  
  getAttendanceTrends: (periodDays?: number) =>
    axios.get('/analytics/attendance-trends', { params: { period_days: periodDays } }),
  
  getDepartmentAnalytics: () =>
    axios.get('/analytics/departments'),
  
  predictAttritionRisk: () =>
    axios.get('/analytics/attrition-risk'),
  
  exportReport: (reportType: string, format: 'csv' | 'xlsx' | 'pdf' = 'csv') =>
    axios.get('/analytics/export', { params: { report_type: reportType, format } }),
};

export default {
  performanceApi,
  timesheetApi,
  onboardingApi,
  offboardingApi,
  complianceApi,
  analyticsApi,
};
