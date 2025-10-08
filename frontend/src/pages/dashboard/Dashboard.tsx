import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
} from '@mui/material';
import { authApi } from '../../api/auth.api';
import { employeeApi, attendanceApi, leaveApi } from '../../api';
import type { LeaveBalance } from '../../types';

interface StatCardProps {
  title: string;
  value: string | number;
  color?: string;
}

export const Dashboard: React.FC = () => {
  const { data: userData } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authApi.getCurrentUser,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees', { perPage: 1 }],
    queryFn: () => employeeApi.getAll({ perPage: 1 }),
  });

  const { data: attendanceData } = useQuery({
    queryKey: ['attendance', { perPage: 1 }],
    queryFn: () => attendanceApi.getAll({ perPage: 1 }),
  });

  const { data: leaveBalance } = useQuery({
    queryKey: ['leaveBalance'],
    queryFn: () => leaveApi.getBalance(),
  });

  const StatCard: React.FC<StatCardProps> = ({ title, value, color }) => (
    <Paper
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        height: 140,
        bgcolor: color || 'primary.main',
        color: 'white',
      }}
    >
      <Typography component="h2" variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography component="p" variant="h3">
        {value}
      </Typography>
    </Paper>
  );

  const calculateLeaveBalance = (balances: LeaveBalance[] | undefined): number => {
    if (!balances) return 0;
    return balances.reduce((acc, lb) => acc + lb.balance, 0);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Welcome back, {userData?.data?.user?.username || 'User'}!
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Total Employees"
            value={employeesData?.meta?.total || 0}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Today's Attendance"
            value={attendanceData?.meta?.total || 0}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Leave Balance"
            value={calculateLeaveBalance(leaveBalance?.data)}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Pending Approvals"
            value="0"
            color="#9c27b0"
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item>
            <Paper sx={{ p: 2 }}>
              <Typography>Check In/Out</Typography>
            </Paper>
          </Grid>
          <Grid item>
            <Paper sx={{ p: 2 }}>
              <Typography>Apply Leave</Typography>
            </Paper>
          </Grid>
          <Grid item>
            <Paper sx={{ p: 2 }}>
              <Typography>View Team</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};
