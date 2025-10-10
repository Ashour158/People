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
    axios.get(`/performance/goals/employee/${employeeId}`, { params }),
  
  getAllGoals: (params?: any) =>
    axios.get('/performance/goals', { params }),
  
  getGoalById: (goalId: string) =>
    axios.get(`/performance/goals/${goalId}`),
  
  createGoal: (data: any) =>
    axios.post('/performance/goals', data),
  
  updateGoalProgress: (goalId: string, data: any) =>
    axios.put(`/performance/goals/${goalId}/progress`, data),
  
  // Review Cycles
  createReviewCycle: (data: any) =>
    axios.post('/performance/review-cycles', data),
  
  // Reviews
  createReview: (data: any) =>
    axios.post('/performance/reviews', data),
  
  submitReview: (reviewId: string, data: any) =>
    axios.post(`/performance/reviews/${reviewId}/submit`, data),
  
  // Feedback
  provideFeedback: (data: any) =>
    axios.post('/performance/feedback', data),
  
  getEmployeeFeedback: (employeeId: string, params?: any) =>
    axios.get(`/performance/feedback/employee/${employeeId}`, { params }),
  
  // KPIs
  createKPI: (data: any) =>
    axios.post('/performance/kpis', data),
  
  recordKPIData: (data: any) =>
    axios.post('/performance/kpis/data', data),
  
  getEmployeeKPIs: (employeeId: string, params?: any) =>
    axios.get(`/performance/kpis/employee/${employeeId}`, { params }),
  
  // Development Plan
  createDevelopmentPlan: (data: any) =>
    axios.post('/performance/development-plan', data),
  
  // Analytics
  getPerformanceTrends: (params?: any) =>
    axios.get('/performance/analytics/performance-trends', { params }),
  
  getCalibrationReport: (params?: any) =>
    axios.get('/performance/reports/calibration', { params }),
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

// ==================== RECRUITMENT ====================

export interface JobPosting {
  job_id: string;
  job_title: string;
  department: string;
  location: string;
  job_type: string;
  status: string;
  openings: number;
}

export interface Candidate {
  candidate_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  current_stage: string;
  source: string;
}

export interface Application {
  application_id: string;
  job_id: string;
  candidate_id: string;
  status: string;
  applied_date: string;
  current_stage: string;
}

export const recruitmentApi = {
  // Job Postings
  getJobs: (params?: any) =>
    axios.get('/recruitment/jobs', { params }),
  
  getJobById: (jobId: string) =>
    axios.get(`/recruitment/jobs/${jobId}`),
  
  createJob: (data: any) =>
    axios.post('/recruitment/jobs', data),
  
  updateJob: (jobId: string, data: any) =>
    axios.put(`/recruitment/jobs/${jobId}`, data),
  
  publishJob: (jobId: string) =>
    axios.post(`/recruitment/jobs/${jobId}/publish`),
  
  // Candidates
  getCandidates: (params?: any) =>
    axios.get('/recruitment/candidates', { params }),
  
  createCandidate: (data: any) =>
    axios.post('/recruitment/candidates', data),
  
  // Applications
  getApplications: (params?: any) =>
    axios.get('/recruitment/applications', { params }),
  
  createApplication: (data: any) =>
    axios.post('/recruitment/applications', data),
  
  updateApplication: (applicationId: string, data: any) =>
    axios.put(`/recruitment/applications/${applicationId}`, data),
  
  shortlistApplication: (applicationId: string) =>
    axios.post(`/recruitment/applications/${applicationId}/shortlist`),
  
  // Interviews
  scheduleInterview: (data: any) =>
    axios.post('/recruitment/interviews', data),
  
  submitInterviewFeedback: (interviewId: string, data: any) =>
    axios.post(`/recruitment/interviews/${interviewId}/feedback`, data),
  
  // Offers
  createOffer: (data: any) =>
    axios.post('/recruitment/offers', data),
  
  // Pipeline
  getPipeline: (params?: any) =>
    axios.get('/recruitment/pipeline', { params }),
};

// ==================== PAYROLL ====================

export interface SalaryStructure {
  structure_id: string;
  employee_id: string;
  basic_salary: number;
  allowances: any;
  deductions: any;
}

export interface Payslip {
  payslip_id: string;
  employee_id: string;
  month: number;
  year: number;
  gross_salary: number;
  net_salary: number;
  status: string;
}

export const payrollApi = {
  // Salary Structure
  createSalaryStructure: (data: any) =>
    axios.post('/payroll/salary-structure', data),
  
  // Payroll Processing
  processPayroll: (data: any) =>
    axios.post('/payroll/process', data),
  
  getPayslip: (employeeId: string, params?: any) =>
    axios.get(`/payroll/payslip/${employeeId}`, { params }),
  
  // Tax Calculation
  calculateTax: (data: any) =>
    axios.post('/payroll/calculate-tax', data),
  
  // Bonus
  addBonus: (data: any) =>
    axios.post('/payroll/bonus', data),
  
  // Loan
  createLoan: (data: any) =>
    axios.post('/payroll/loan', data),
  
  // Reimbursement
  createReimbursement: (data: any) =>
    axios.post('/payroll/reimbursement', data),
  
  // Reports
  getMonthlySummary: (params?: any) =>
    axios.get('/payroll/reports/monthly-summary', { params }),
  
  getYTDSummary: (employeeId: string, params?: any) =>
    axios.get(`/payroll/reports/ytd-summary/${employeeId}`, { params }),
};

// ==================== EXPENSES ====================

export interface ExpensePolicy {
  policy_id: string;
  policy_name: string;
  category: string;
  max_amount: number;
  requires_receipt: boolean;
}

export interface Expense {
  expense_id: string;
  employee_id: string;
  category: string;
  amount: number;
  expense_date: string;
  status: string;
  description?: string;
}

export const expenseApi = {
  // Policies
  createPolicy: (data: any) =>
    axios.post('/expenses/policies', data),
  
  getPolicies: (params?: any) =>
    axios.get('/expenses/policies', { params }),
  
  // Expenses
  createExpense: (data: any) =>
    axios.post('/expenses', data),
  
  getExpenses: (params?: any) =>
    axios.get('/expenses', { params }),
  
  getExpenseById: (expenseId: string) =>
    axios.get(`/expenses/${expenseId}`),
  
  updateExpense: (expenseId: string, data: any) =>
    axios.patch(`/expenses/${expenseId}`, data),
  
  deleteExpense: (expenseId: string) =>
    axios.delete(`/expenses/${expenseId}`),
  
  // Workflow
  submitExpense: (data: any) =>
    axios.post('/expenses/submit', data),
  
  approveExpense: (data: any) =>
    axios.post('/expenses/approve', data),
  
  rejectExpense: (data: any) =>
    axios.post('/expenses/reject', data),
  
  reimburseExpense: (data: any) =>
    axios.post('/expenses/reimburse', data),
  
  // Comments
  addComment: (expenseId: string, data: any) =>
    axios.post(`/expenses/${expenseId}/comments`, data),
  
  getComments: (expenseId: string) =>
    axios.get(`/expenses/${expenseId}/comments`),
  
  // Statistics
  getExpenseStats: (params?: any) =>
    axios.get('/expenses/summary/stats', { params }),
};

export default {
  performanceApi,
  timesheetApi,
  onboardingApi,
  offboardingApi,
  complianceApi,
  analyticsApi,
  recruitmentApi,
  payrollApi,
  expenseApi,
};
