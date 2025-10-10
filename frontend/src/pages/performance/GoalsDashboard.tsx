import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Tab,
  Tabs,
} from '@mui/material';
import { Add as AddIcon, TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import { performanceApi } from '../../api/modules.api';
import { useAuthStore } from '../../store/authStore';

interface Goal {
  goal_id: string;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  due_date: string;
  owner: string;
  category: string;
}

export const GoalsDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const user = useAuthStore((state) => state.user);

  const { data: goalsResponse, isLoading } = useQuery({
    queryKey: ['performance-goals', user?.employee_id],
    queryFn: async () => {
      if (!user?.employee_id) return { data: { goals: [] } };
      return performanceApi.getEmployeeGoals(user.employee_id);
    },
    enabled: !!user?.employee_id,
  });

  const goals: Goal[] = goalsResponse?.data?.goals || [];

  const getStatusColor = (status: Goal['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'primary';
      case 'overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Goals & OKRs</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          Create Goal
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Goals
              </Typography>
              <Typography variant="h4">{goals?.length || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                In Progress
              </Typography>
              <Typography variant="h4">
                {goals?.filter((g) => g.status === 'in_progress').length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4">
                {goals?.filter((g) => g.status === 'completed').length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Progress
              </Typography>
              <Typography variant="h4">
                {goals?.length
                  ? Math.round(goals.reduce((acc, g) => acc + g.progress, 0) / goals.length)
                  : 0}
                %
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
          <Tab label="All Goals" />
          <Tab label="My Goals" />
          <Tab label="Team Goals" />
          <Tab label="Company Goals" />
        </Tabs>

        {isLoading ? (
          <LinearProgress />
        ) : (
          <Grid container spacing={2}>
            {goals?.map((goal) => (
              <Grid item xs={12} md={6} key={goal.goal_id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">{goal.title}</Typography>
                      <Chip label={goal.status} color={getStatusColor(goal.status)} size="small" />
                    </Box>
                    <Typography color="textSecondary" sx={{ mb: 2 }}>
                      {goal.description}
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">Progress</Typography>
                        <Typography variant="body2">{goal.progress}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={goal.progress} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                      <Chip label={goal.category} size="small" variant="outlined" />
                      <Typography variant="caption" color="textSecondary">
                        Due: {new Date(goal.due_date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </Container>
  );
};
