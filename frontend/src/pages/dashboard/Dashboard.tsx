import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        {t('dashboard.title')}
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        {t('dashboard.welcome')}, {userData?.data?.user?.username || 'User'}!
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={3}>
          <StatCard
            title={t('dashboard.totalEmployees')}
            value={employeesData?.meta?.total || 0}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title={t('dashboard.todayAttendance')}
            value={attendanceData?.meta?.total || 0}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title={t('leave.leaveBalance')}
            value={calculateLeaveBalance(leaveBalance?.data)}
            color="#ed6c02"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title={t('dashboard.pendingLeaveRequests')}
            value="0"
            color="#9c27b0"
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('common.actions')}
        </Typography>
        <Grid container spacing={2}>
          <Grid item>
            <Paper sx={{ p: 2 }}>
              <Typography>{t('attendance.checkIn')}/{t('attendance.checkOut')}</Typography>
            </Paper>
          </Grid>
          <Grid item>
            <Paper sx={{ p: 2 }}>
              <Typography>{t('leave.applyLeave')}</Typography>
            </Paper>
          </Grid>
          <Grid item>
            <Paper sx={{ p: 2 }}>
              <Typography>{t('employees.employeeList')}</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};
