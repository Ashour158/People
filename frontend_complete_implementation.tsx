// =====================================================
// FRONTEND IMPLEMENTATION - ALL MODULES
// =====================================================

// ===== Package.json dependencies =====
/*
{
  "name": "hr-management-frontend",
  "version": "2.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    "@tanstack/react-query": "^5.17.0",
    "axios": "^1.6.2",
    "zustand": "^4.4.7",
    "@mui/material": "^5.15.0",
    "@mui/x-data-grid": "^6.18.6",
    "@mui/x-date-pickers": "^6.18.6",
    "@mui/icons-material": "^5.15.0",
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0",
    "react-hook-form": "^7.49.2",
    "yup": "^1.3.3",
    "date-fns": "^3.0.6",
    "recharts": "^2.10.3",
    "react-hot-toast": "^2.4.1",
    "socket.io-client": "^4.6.0"
  }
}
*/

// ===== src/api/websocket.ts =====
import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('notification', (data) => {
      this.emit('notification', data);
    });

    this.socket.on('connected', (data) => {
      console.log('WebSocket server message:', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribe(channels: string[]) {
    this.socket?.emit('subscribe', channels);
  }

  unsubscribe(channels: string[]) {
    this.socket?.emit('unsubscribe', channels);
  }

  markAsRead(notificationId: string) {
    this.socket?.emit('notification:read', notificationId);
  }

  getUnreadCount() {
    this.socket?.emit('notification:count');
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

export const wsService = new WebSocketService();

// ===== src/api/payroll.api.ts =====
import axios from './axios';

export const payrollApi = {
  // Compensation Components
  getComponents: () => axios.get('/compensation/components'),
  createComponent: (data: any) => axios.post('/compensation/components', data),
  
  // Employee Compensation
  getEmployeeCompensation: (employeeId: string) => 
    axios.get(`/compensation/employees/${employeeId}`),
  createRevision: (data: any) => axios.post('/compensation/revisions', data),
  
  // Payroll Runs
  getPayrollRuns: (params?: any) => axios.get('/payroll/runs', { params }),
  createPayrollRun: (data: any) => axios.post('/payroll/runs', data),
  processPayroll: (runId: string) => axios.post(`/payroll/runs/${runId}/process`),
  getPayrollItems: (runId: string) => axios.get(`/payroll/runs/${runId}/items`),
  
  // Salary Slips
  generateSlip: (itemId: string) => axios.post(`/payroll/items/${itemId}/generate-slip`),
  
  // Bonuses
  getBonuses: (params?: any) => axios.get('/payroll/bonuses', { params }),
  createBonus: (data: any) => axios.post('/payroll/bonuses', data),
  approveBonus: (bonusId: string, data: any) => 
    axios.post(`/payroll/bonuses/${bonusId}/approve`, data),
  
  // Loans
  getLoans: (params?: any) => axios.get('/payroll/loans', { params }),
  createLoan: (data: any) => axios.post('/payroll/loans', data),
  
  // Reimbursements
  getReimbursements: (params?: any) => axios.get('/payroll/reimbursements', { params }),
  createReimbursement: (data: any) => axios.post('/payroll/reimbursements', data),
  reviewReimbursement: (reimbursementId: string, data: any) =>
    axios.post(`/payroll/reimbursements/${reimbursementId}/review`, data),
};

// ===== src/api/performance.api.ts =====
export const performanceApi = {
  // Cycles
  getCycles: (params?: any) => axios.get('/performance/cycles', { params }),
  createCycle: (data: any) => axios.post('/performance/cycles', data),
  updateCycleStatus: (cycleId: string, status: string) =>
    axios.patch(`/performance/cycles/${cycleId}/status`, { status }),
  
  // Goals
  getGoals: (params?: any) => axios.get('/performance/goals', { params }),
  createGoal: (data: any) => axios.post('/performance/goals', data),
  updateGoalStatus: (goalId: string, data: any) =>
    axios.patch(`/performance/goals/${goalId}/status`, data),
  addCheckIn: (goalId: string, data: any) =>
    axios.post(`/performance/goals/${goalId}/check-ins`, data),
  
  // Reviews
  getReviews: (params?: any) => axios.get('/performance/reviews', { params }),
  createReview: (data: any) => axios.post('/performance/reviews', data),
  submitReview: (reviewId: string) => axios.post(`/performance/reviews/${reviewId}/submit`),
  acknowledgeReview: (reviewId: string) =>
    axios.post(`/performance/reviews/${reviewId}/acknowledge`),
  
  // Feedback
  getFeedback: (params?: any) => axios.get('/performance/feedback', { params }),
  giveFeedback: (data: any) => axios.post('/performance/feedback', data),
  
  // Dashboard
  getDashboard: (employeeId: string) => axios.get(`/performance/dashboard/${employeeId}`),
};

// ===== src/api/recruitment.api.ts =====
export const recruitmentApi = {
  // Job Requisitions
  getRequisitions: (params?: any) => axios.get('/recruitment/requisitions', { params }),
  createRequisition: (data: any) => axios.post('/recruitment/requisitions', data),
  reviewRequisition: (requisitionId: string, data: any) =>
    axios.post(`/recruitment/requisitions/${requisitionId}/review`, data),
  
  // Job Postings
  getJobs: (params?: any) => axios.get('/recruitment/jobs', { params }),
  createJob: (data: any) => axios.post('/recruitment/jobs', data),
  
  // Candidates
  getCandidates: (params?: any) => axios.get('/recruitment/candidates', { params }),
  createCandidate: (data: any) => axios.post('/recruitment/candidates', data),
  
  // Applications
  getApplications: (params?: any) => axios.get('/recruitment/applications', { params }),
  createApplication: (data: any) => axios.post('/recruitment/applications', data),
  updateApplicationStatus: (applicationId: string, data: any) =>
    axios.patch(`/recruitment/applications/${applicationId}/status`, data),
  
  // Interviews
  getInterviews: (params?: any) => axios.get('/recruitment/interviews', { params }),
  scheduleInterview: (data: any) => axios.post('/recruitment/interviews', data),
  submitFeedback: (interviewId: string, data: any) =>
    axios.post(`/recruitment/interviews/${interviewId}/feedback`, data),
};

// ===== src/api/onboarding.api.ts =====
export const onboardingApi = {
  // Programs
  getPrograms: () => axios.get('/onboarding/programs'),
  createProgram: (data: any) => axios.post('/onboarding/programs', data),
  getProgramTasks: (programId: string) => 
    axios.get(`/onboarding/programs/${programId}/tasks`),
  addTaskToProgram: (programId: string, data: any) =>
    axios.post(`/onboarding/programs/${programId}/tasks`, data),
  
  // Employee Onboarding
  getEmployeeOnboarding: (employeeId: string) =>
    axios.get(`/onboarding/employees/${employeeId}`),
  completeTask: (taskProgressId: string, data: any) =>
    axios.put(`/onboarding/tasks/${taskProgressId}/complete`, data),
};

// ===== src/api/assets.api.ts =====
export const assetsApi = {
  // Categories
  getCategories: () => axios.get('/assets/categories'),
  createCategory: (data: any) => axios.post('/assets/categories', data),
  
  // Assets
  getAssets: (params?: any) => axios.get('/assets', { params }),
  getAssetById: (assetId: string) => axios.get(`/assets/${assetId}`),
  createAsset: (data: any) => axios.post('/assets', data),
  updateAsset: (assetId: string, data: any) => axios.put(`/assets/${assetId}`, data),
  
  // Assignments
  assignAsset: (data: any) => axios.post('/assets/assignments', data),
  returnAsset: (assignmentId: string, data: any) =>
    axios.post(`/assets/assignments/${assignmentId}/return`, data),
  
  // Maintenance
  getMaintenance: (params?: any) => axios.get('/assets/maintenance', { params }),
  scheduleMaintenance: (data: any) => axios.post('/assets/maintenance', data),
  updateMaintenanceStatus: (maintenanceId: string, data: any) =>
    axios.patch(`/assets/maintenance/${maintenanceId}/status`, data),
  
  // Requests
  getRequests: (params?: any) => axios.get('/assets/requests', { params }),
  createRequest: (data: any) => axios.post('/assets/requests', data),
  reviewRequest: (requestId: string, data: any) =>
    axios.post(`/assets/requests/${requestId}/review`, data),
  
  // Analytics
  getAnalytics: () => axios.get('/assets/analytics'),
};

// ===== src/api/reports.api.ts =====
export const reportsApi = {
  getDashboard: () => axios.get('/reports/dashboard'),
  
  // Attendance Reports
  getAttendanceReport: (params?: any) => axios.get('/reports/attendance', { params }),
  getAttendanceSummary: (params?: any) => 
    axios.get('/reports/attendance/summary', { params }),
  
  // Leave Reports
  getLeaveReport: (params?: any) => axios.get('/reports/leave', { params }),
  getLeaveBalance: (params?: any) => axios.get('/reports/leave/balance', { params }),
  
  // Headcount & Demographics
  getHeadcount: (params?: any) => axios.get('/reports/headcount', { params }),
  getTurnover: (params?: any) => axios.get('/reports/turnover', { params }),
  
  // Payroll Reports
  getPayrollReport: (params?: any) => axios.get('/reports/payroll', { params }),
  
  // Performance Analytics
  getPerformanceAnalytics: (params?: any) => 
    axios.get('/reports/performance', { params }),
  
  // Custom Reports
  createCustomReport: (data: any) => axios.post('/reports/custom', data),
  
  // Export
  exportReport: (reportType: string, format: string) =>
    axios.get(`/reports/export/${reportType}`, { params: { format } }),
};

// ===== src/hooks/useNotifications.ts =====
import { useEffect, useState } from 'react';
import { wsService } from '../api/websocket';
import toast from 'react-hot-toast';

interface Notification {
  notification_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  priority: string;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification
      toast.custom((t) => (
        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          maxWidth: '400px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {notification.title}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {notification.message}
          </div>
        </div>
      ), {
        duration: 4000,
        position: 'top-right',
      });
    };

    wsService.on('notification', handleNotification);
    wsService.getUnreadCount();

    return () => {
      wsService.off('notification', handleNotification);
    };
  }, []);

  const markAsRead = (notificationId: string) => {
    wsService.markAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return {
    notifications,
    unreadCount,
    markAsRead
  };
}

// ===== src/pages/payroll/PayrollDashboard.tsx =====
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Box, Grid, Card, CardContent, Typography, Button, 
  Table, TableBody, TableCell, TableHead, TableRow
} from '@mui/material';
import { payrollApi } from '../../api/payroll.api';

export function PayrollDashboard() {
  const { data: payrollRuns } = useQuery({
    queryKey: ['payrollRuns'],
    queryFn: () => payrollApi.getPayrollRuns({ page: 1, limit: 10 })
  });

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Payroll Management
      </Typography>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Employees
              </Typography>
              <Typography variant="h4">
                {payrollRuns?.data?.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Add more stat cards */}
      </Grid>

      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Recent Payroll Runs</Typography>
            <Button variant="contained" color="primary">
              Process Payroll
            </Button>
          </Box>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Run Name</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Employees</TableCell>
                <TableCell>Total Amount</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payrollRuns?.data?.map((run: any) => (
                <TableRow key={run.payroll_run_id}>
                  <TableCell>{run.run_name}</TableCell>
                  <TableCell>{run.period_month}/{run.period_year}</TableCell>
                  <TableCell>{run.status}</TableCell>
                  <TableCell>{run.employee_count}</TableCell>
                  <TableCell>${run.total_net?.toFixed(2)}</TableCell>
                  <TableCell>
                    <Button size="small">View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}

// ===== src/pages/performance/PerformanceDashboard.tsx =====
export function PerformanceDashboard() {
  const { data: cycles } = useQuery({
    queryKey: ['performanceCycles'],
    queryFn: () => performanceApi.getCycles()
  });

  const { data: myGoals } = useQuery({
    queryKey: ['myGoals'],
    queryFn: () => performanceApi.getGoals({ status: 'in_progress' })
  });

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Performance Management
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                My Goals
              </Typography>
              {myGoals?.data?.map((goal: any) => (
                <Box key={goal.goal_id} mb={2}>
                  <Typography variant="subtitle1">{goal.goal_title}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Progress: {goal.completion_percentage || 0}%
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Cycles
              </Typography>
              {cycles?.data?.map((cycle: any) => (
                <Box key={cycle.cycle_id} mb={2}>
                  <Typography variant="subtitle1">{cycle.cycle_name}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Status: {cycle.status}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// ===== src/pages/recruitment/RecruitmentPipeline.tsx =====
export function RecruitmentPipeline() {
  const { data: applications } = useQuery({
    queryKey: ['applications'],
    queryFn: () => recruitmentApi.getApplications()
  });

  const stages = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'];

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Recruitment Pipeline
      </Typography>

      <Grid container spacing={2}>
        {stages.map(stage => (
          <Grid item xs={12} md={2.4} key={stage}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {stage}
                </Typography>
                {applications?.data
                  ?.filter((app: any) => app.status === stage.toLowerCase())
                  ?.map((app: any) => (
                    <Box key={app.application_id} mb={1}>
                      <Typography variant="body2">
                        {app.first_name} {app.last_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {app.job_title}
                      </Typography>
                    </Box>
                  ))}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// ===== src/pages/assets/AssetManagement.tsx =====
export function AssetManagement() {
  const { data: assets } = useQuery({
    queryKey: ['assets'],
    queryFn: () => assetsApi.getAssets()
  });

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Asset Management
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Asset Code</TableCell>
                    <TableCell>Asset Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Assigned To</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assets?.data?.map((asset: any) => (
                    <TableRow key={asset.asset_id}>
                      <TableCell>{asset.asset_code}</TableCell>
                      <TableCell>{asset.asset_name}</TableCell>
                      <TableCell>{asset.asset_type}</TableCell>
                      <TableCell>{asset.status}</TableCell>
                      <TableCell>
                        {asset.current_assignment?.employee_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Button size="small">View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// ===== src/pages/reports/AnalyticsDashboard.tsx =====
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export function AnalyticsDashboard() {
  const { data: dashboard } = useQuery({
    queryKey: ['reportsDashboard'],
    queryFn: () => reportsApi.getDashboard()
  });

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Analytics & Reports
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Department Headcount
              </Typography>
              <BarChart width={500} height={300} data={dashboard?.data?.department_headcount}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department_name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="employee_count" fill="#8884d8" />
              </BarChart>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Attendance Trend
              </Typography>
              <BarChart width={500} height={300} data={dashboard?.data?.attendance_summary}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present_count" fill="#82ca9d" />
              </BarChart>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// ===== src/App.tsx - Updated Routes =====
import { BrowserRouter, Routes, Route } from 'react-router-dom';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ... existing routes ... */}
        
        {/* Payroll Routes */}
        <Route path="/payroll" element={<PayrollDashboard />} />
        
        {/* Performance Routes */}
        <Route path="/performance" element={<PerformanceDashboard />} />
        
        {/* Recruitment Routes */}
        <Route path="/recruitment" element={<RecruitmentPipeline />} />
        
        {/* Assets Routes */}
        <Route path="/assets" element={<AssetManagement />} />
        
        {/* Reports Routes */}
        <Route path="/reports" element={<AnalyticsDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
