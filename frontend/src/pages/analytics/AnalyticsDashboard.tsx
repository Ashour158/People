import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  PersonAdd,
  ExitToApp,
  Assessment,
  Schedule,
} from '@mui/icons-material';
import { analyticsApi } from '../../api/modules.api';

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ReactElement;
  color?: string;
  suffix?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  trend,
  icon,
  color = 'primary',
  suffix = '',
}) => {
  const getTrendIcon = () => {
    if (!trend || trend === 'stable') return null;
    return trend === 'up' ? (
      <TrendingUp color="success" sx={{ fontSize: 16 }} />
    ) : (
      <TrendingDown color="error" sx={{ fontSize: 16 }} />
    );
  };

  return (
    <Card elevation={2}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}{suffix}
            </Typography>
            {change !== undefined && (
              <Box display="flex" alignItems="center" mt={1}>
                {getTrendIcon()}
                <Typography
                  variant="body2"
                  color={trend === 'up' ? 'success.main' : trend === 'down' ? 'error.main' : 'text.secondary'}
                  ml={0.5}
                >
                  {change > 0 ? '+' : ''}{change}
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              bgcolor: `${color}.lighter`,
              color: `${color}.main`,
              p: 1,
              borderRadius: 2,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

interface DashboardMetrics {
  total_employees: number;
  new_hires_month: number;
  attrition_rate: number;
  avg_attendance: number;
  pending_leaves: number;
  performance_reviews_due: number;
  headcount: {
    current: number;
    previous: number;
    trend: string;
  };
  new_joiners: number;
  attendance_rate: number | { value: number; trend: string };
  leave_utilization: number | { value: number };
  performance_avg: number;
  timesheet_utilization: number | { value: number; trend: string };
  pending_approvals: {
    leaves: number;
    timesheets: number;
    expenses: number;
    onboarding_tasks: number;
  };
}

interface DepartmentStat {
  department_name?: string;
  department?: string;
  employee_count: number;
  avg_performance?: number;
  headcount: number;
  avg_tenure_years: number;
  pending_leaves?: number;
  pending_timesheets?: number;
}

interface AttritionRiskEmployee {
  employee_id: string;
  employee_name: string;
  department: string;
  risk_score: number;
  factors: string[];
  attrition_risk_score: number;
}

const AnalyticsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStat[]>([]);
  const [attritionRisk, setAttritionRisk] = useState<AttritionRiskEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsRes, deptRes, riskRes] = await Promise.all([
        analyticsApi.getDashboardMetrics(),
        analyticsApi.getDepartmentAnalytics(),
        analyticsApi.predictAttritionRisk(),
      ]);

      setMetrics(metricsRes.data.data);
      setDepartmentStats(deptRes.data.data);
      setAttritionRisk(riskRes.data.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        HR Analytics Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Real-time insights into your organization&apos;s HR metrics
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Headcount"
            value={metrics.headcount.value}
            change={metrics.headcount.change}
            trend={metrics.headcount.trend}
            icon={<People />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="New Joiners (MTD)"
            value={metrics.new_joiners.value}
            icon={<PersonAdd />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Attrition Rate"
            value={metrics.attrition_rate.value.toFixed(1)}
            trend={metrics.attrition_rate.trend}
            icon={<ExitToApp />}
            color="warning"
            suffix="%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Attendance Rate"
            value={metrics.attendance_rate.value.toFixed(1)}
            trend={metrics.attendance_rate.trend}
            icon={<Schedule />}
            color="info"
            suffix="%"
          />
        </Grid>
      </Grid>

      {/* Secondary Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Leave Utilization"
            value={metrics.leave_utilization.value.toFixed(1)}
            icon={<Assessment />}
            color="secondary"
            suffix="%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Avg Performance Rating"
            value={metrics.performance_avg.value.toFixed(2)}
            icon={<Assessment />}
            color="success"
            suffix="/5"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Timesheet Utilization"
            value={metrics.timesheet_utilization.value.toFixed(1)}
            trend={metrics.timesheet_utilization.trend}
            icon={<Schedule />}
            color="primary"
            suffix="%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Pending Approvals
              </Typography>
              <Box mt={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Leave Requests</Typography>
                  <Chip
                    label={metrics.pending_approvals.leaves}
                    size="small"
                    color={metrics.pending_approvals.leaves > 0 ? 'warning' : 'default'}
                  />
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Timesheets</Typography>
                  <Chip
                    label={metrics.pending_approvals.timesheets}
                    size="small"
                    color={metrics.pending_approvals.timesheets > 0 ? 'warning' : 'default'}
                  />
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Onboarding Tasks</Typography>
                  <Chip
                    label={metrics.pending_approvals.onboarding_tasks}
                    size="small"
                    color={metrics.pending_approvals.onboarding_tasks > 0 ? 'info' : 'default'}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Department Analytics */}
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Department Analytics
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Department</TableCell>
                      <TableCell align="right">Headcount</TableCell>
                      <TableCell align="right">Avg Tenure (Years)</TableCell>
                      <TableCell align="right">Avg Performance</TableCell>
                      <TableCell align="right">Pending</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {departmentStats.slice(0, 5).map((dept) => (
                      <TableRow key={dept.department}>
                        <TableCell component="th" scope="row">
                          {dept.department || 'Unassigned'}
                        </TableCell>
                        <TableCell align="right">{dept.headcount}</TableCell>
                        <TableCell align="right">
                          {dept.avg_tenure_years ? parseFloat(dept.avg_tenure_years).toFixed(1) : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {dept.avg_performance ? (
                            <Chip
                              label={parseFloat(dept.avg_performance).toFixed(1)}
                              size="small"
                              color={
                                parseFloat(dept.avg_performance) >= 4
                                  ? 'success'
                                  : parseFloat(dept.avg_performance) >= 3
                                  ? 'primary'
                                  : 'warning'
                              }
                            />
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {(dept.pending_leaves || 0) + (dept.pending_timesheets || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Attrition Risk */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                High Attrition Risk
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Employees at risk of leaving
              </Typography>
              {attritionRisk.length === 0 ? (
                <Alert severity="success">No high-risk employees identified</Alert>
              ) : (
                <Box>
                  {attritionRisk.slice(0, 5).map((emp) => (
                    <Box
                      key={emp.employee_id}
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={2}
                      p={1}
                      bgcolor="grey.50"
                      borderRadius={1}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {emp.employee_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {emp.department}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${emp.attrition_risk_score}%`}
                        size="small"
                        color={
                          emp.attrition_risk_score >= 70
                            ? 'error'
                            : emp.attrition_risk_score >= 50
                            ? 'warning'
                            : 'info'
                        }
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;
