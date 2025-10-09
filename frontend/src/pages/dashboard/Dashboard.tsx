import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  EventNote as EventNoteIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { authApi } from '../../api/auth.api';
import { employeeApi, attendanceApi, leaveApi } from '../../api';
import type { LeaveBalance } from '../../types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
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

  const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend }) => (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        color: 'white',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              width: 56,
              height: 56,
              mr: 2,
            }}
          >
            {icon}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700 }}>
              {value}
            </Typography>
          </Box>
        </Box>
        {trend && (
          <Chip
            label={trend}
            size="small"
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              fontWeight: 500,
            }}
          />
        )}
      </CardContent>
    </Card>
  );

  const calculateLeaveBalance = (balances: LeaveBalance[] | undefined): number => {
    if (!balances) return 0;
    return balances.reduce((acc, lb) => acc + lb.balance, 0);
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Welcome back, {userData?.data?.user?.username || 'User'}! 👋
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here&apos;s what&apos;s happening with your workspace today.
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Employees"
              value={employeesData?.meta?.total || 0}
              icon={<PeopleIcon sx={{ fontSize: 32 }} />}
              color="#2563eb"
              trend="+12% from last month"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Today's Attendance"
              value={attendanceData?.meta?.total || 0}
              icon={<CheckCircleIcon sx={{ fontSize: 32 }} />}
              color="#10b981"
              trend="95% attendance rate"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Leave Balance"
              value={calculateLeaveBalance(leaveBalance?.data)}
              icon={<EventNoteIcon sx={{ fontSize: 32 }} />}
              color="#f59e0b"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Pending Approvals"
              value="0"
              icon={<TrendingUpIcon sx={{ fontSize: 32 }} />}
              color="#8b5cf6"
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Recent Activity
              </Typography>
              <Box>
                {[1, 2, 3].map((item) => (
                  <Box
                    key={item}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      py: 2,
                      borderBottom: item !== 3 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Avatar sx={{ bgcolor: 'primary.light', mr: 2 }}>
                      <CheckCircleIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        Activity {item}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        2 hours ago
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {['Check In/Out', 'Apply Leave', 'View Team', 'Reports'].map((action) => (
                  <Box
                    key={action}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'primary.50',
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {action}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>

            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Your Progress
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Tasks Completed
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    75%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={75}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'grey.200',
                  }}
                />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Goals Achieved
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    60%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={60}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'grey.200',
                  }}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
