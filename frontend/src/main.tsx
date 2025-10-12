import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Dashboard } from './pages/dashboard/Dashboard';
import { EmployeeList } from './pages/employees/EmployeeList';
import { AttendanceCheckIn } from './pages/attendance/AttendanceCheckIn';
import { LeaveApply } from './pages/leave/LeaveApply';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { modernTheme } from './theme/modernTheme';
// Performance
import { GoalsDashboard } from './pages/performance/GoalsDashboard';
import { PerformanceReviews } from './pages/performance/PerformanceReviews';
import { Feedback360 } from './pages/performance/Feedback360';
import { KPITracking } from './pages/performance/KPITracking';
// Recruitment
import { JobPostings } from './pages/recruitment/JobPostings';
import { CandidatePipeline } from './pages/recruitment/CandidatePipeline';
import { InterviewScheduling } from './pages/recruitment/InterviewScheduling';
import { OfferManagement } from './pages/recruitment/OfferManagement';
// Payroll
import { PayrollDashboard } from './pages/payroll/PayrollDashboard';
import { SalarySlips } from './pages/payroll/SalarySlips';
import { PayrollProcessing } from './pages/payroll/PayrollProcessing';
// Surveys
import { SurveyBuilder } from './pages/surveys/SurveyBuilder';
import { SurveyList } from './pages/surveys/SurveyList';
import { SurveyResults } from './pages/surveys/SurveyResults';
// Workflows
import { WorkflowDesigner } from './pages/workflows/WorkflowDesigner';
import { ActiveWorkflows } from './pages/workflows/ActiveWorkflows';
import { WorkflowTemplates } from './pages/workflows/WorkflowTemplates';
// Analytics
import { AnalyticsDashboard } from './pages/analytics/AnalyticsDashboard';
// Integrations
import { IntegrationsPage } from './pages/integrations/IntegrationsPage';
// Profile
import { EmployeeProfile } from './pages/employees/EmployeeProfile';
// Expenses
import { ExpenseClaims } from './pages/expenses/ExpenseClaims';
import { ExpenseApproval } from './pages/expenses/ExpenseApproval';
import { ExpenseReports } from './pages/expenses/ExpenseReports';
import { ExpenseCategories } from './pages/expenses/ExpenseCategories';
// Helpdesk
import { TicketList } from './pages/helpdesk/TicketList';
import { CreateTicket } from './pages/helpdesk/CreateTicket';
import { TicketDetails } from './pages/helpdesk/TicketDetails';
import { KnowledgeBase } from './pages/helpdesk/KnowledgeBase';
// Documents
import { DocumentLibrary } from './pages/documents/DocumentLibrary';
import { DocumentUpload } from './pages/documents/DocumentUpload';
// Settings
import { CompanySettings } from './pages/settings/CompanySettings';
import { UserManagement } from './pages/settings/UserManagement';
import { RoleManagement } from './pages/settings/RoleManagement';
import { SystemConfiguration } from './pages/settings/SystemConfiguration';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={modernTheme}>
          <CssBaseline />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="employees" element={<EmployeeList />} />
              <Route path="attendance" element={<AttendanceCheckIn />} />
              <Route path="leave" element={<LeaveApply />} />
              
              {/* Performance */}
              <Route path="performance/goals" element={<GoalsDashboard />} />
              <Route path="performance/reviews" element={<PerformanceReviews />} />
              <Route path="performance/feedback" element={<Feedback360 />} />
              <Route path="performance/kpi" element={<KPITracking />} />
              
              {/* Recruitment */}
              <Route path="recruitment/jobs" element={<JobPostings />} />
              <Route path="recruitment/pipeline" element={<CandidatePipeline />} />
              <Route path="recruitment/interviews" element={<InterviewScheduling />} />
              <Route path="recruitment/offers" element={<OfferManagement />} />
              
              {/* Payroll */}
              <Route path="payroll/dashboard" element={<PayrollDashboard />} />
              <Route path="payroll/slips" element={<SalarySlips />} />
              <Route path="payroll/processing" element={<PayrollProcessing />} />
              
              {/* Surveys */}
              <Route path="surveys/builder" element={<SurveyBuilder />} />
              <Route path="surveys/list" element={<SurveyList />} />
              <Route path="surveys/results" element={<SurveyResults />} />
              
              {/* Workflows */}
              <Route path="workflows/designer" element={<WorkflowDesigner />} />
              <Route path="workflows/active" element={<ActiveWorkflows />} />
              <Route path="workflows/templates" element={<WorkflowTemplates />} />
              
              {/* Expenses */}
              <Route path="expenses/claims" element={<ExpenseClaims />} />
              <Route path="expenses/approval" element={<ExpenseApproval />} />
              <Route path="expenses/reports" element={<ExpenseReports />} />
              <Route path="expenses/categories" element={<ExpenseCategories />} />
              
              {/* Helpdesk */}
              <Route path="helpdesk/tickets" element={<TicketList />} />
              <Route path="helpdesk/create" element={<CreateTicket />} />
              <Route path="helpdesk/ticket/:id" element={<TicketDetails />} />
              <Route path="helpdesk/kb" element={<KnowledgeBase />} />
              
              {/* Documents */}
              <Route path="documents/library" element={<DocumentLibrary />} />
              <Route path="documents/upload" element={<DocumentUpload />} />
              
              {/* Analytics */}
              <Route path="analytics" element={<AnalyticsDashboard />} />
              
              {/* Integrations */}
              <Route path="integrations" element={<IntegrationsPage />} />
              
              {/* Profile */}
              <Route path="profile" element={<EmployeeProfile />} />
              
              {/* Settings */}
              <Route path="settings/company" element={<CompanySettings />} />
              <Route path="settings/users" element={<UserManagement />} />
              <Route path="settings/roles" element={<RoleManagement />} />
              <Route path="settings/system" element={<SystemConfiguration />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </ThemeProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
