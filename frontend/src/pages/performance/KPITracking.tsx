import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface KPI {
  kpi_id: string;
  name: string;
  current_value: number;
  target_value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  category: string;
  owner: string;
  last_updated: string;
}

export const KPITracking: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');

  const { data: kpis } = useQuery<KPI[]>({
    queryKey: ['kpis'],
    queryFn: async () => {
      return [
        {
          kpi_id: '1',
          name: 'Customer Satisfaction Score',
          current_value: 8.5,
          target_value: 9.0,
          unit: '/10',
          trend: 'up',
          category: 'Customer Success',
          owner: 'Jane Smith',
          last_updated: '2025-10-09',
        },
        {
          kpi_id: '2',
          name: 'Monthly Active Users',
          current_value: 12500,
          target_value: 15000,
          unit: 'users',
          trend: 'up',
          category: 'Product',
          owner: 'John Doe',
          last_updated: '2025-10-09',
        },
        {
          kpi_id: '3',
          name: 'Employee Turnover Rate',
          current_value: 12,
          target_value: 10,
          unit: '%',
          trend: 'down',
          category: 'HR',
          owner: 'HR Manager',
          last_updated: '2025-10-08',
        },
        {
          kpi_id: '4',
          name: 'Sales Conversion Rate',
          current_value: 22,
          target_value: 25,
          unit: '%',
          trend: 'stable',
          category: 'Sales',
          owner: 'Sales Director',
          last_updated: '2025-10-09',
        },
      ];
    },
  });

  const chartData = [
    { month: 'Jun', value: 75 },
    { month: 'Jul', value: 80 },
    { month: 'Aug', value: 78 },
    { month: 'Sep', value: 85 },
    { month: 'Oct', value: 88 },
  ];

  const getTrendIcon = (trend: KPI['trend']) => {
    if (trend === 'up') return <TrendingUp color="success" />;
    if (trend === 'down') return <TrendingDown color="error" />;
    return null;
  };

  const getProgress = (kpi: KPI) => {
    return Math.min((kpi.current_value / kpi.target_value) * 100, 100);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">KPI Tracking</Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Period</InputLabel>
          <Select
            value={selectedPeriod}
            label="Period"
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <MenuItem value="weekly">Weekly</MenuItem>
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="quarterly">Quarterly</MenuItem>
            <MenuItem value="yearly">Yearly</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total KPIs
              </Typography>
              <Typography variant="h4">{kpis?.length || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                On Track
              </Typography>
              <Typography variant="h4">
                {kpis?.filter((k) => getProgress(k) >= 80).length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                At Risk
              </Typography>
              <Typography variant="h4">
                {kpis?.filter((k) => getProgress(k) < 80).length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Achievement
              </Typography>
              <Typography variant="h4">
                {kpis?.length
                  ? Math.round(
                      kpis.reduce((acc, k) => acc + getProgress(k), 0) / kpis.length
                    )
                  : 0}
                %
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              KPI Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#1976d2" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Categories
            </Typography>
            {['Customer Success', 'Product', 'Sales', 'HR'].map((category) => (
              <Box key={category} sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  {category}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={75}
                    sx={{ flex: 1, height: 8, borderRadius: 1 }}
                  />
                  <Typography variant="body2">75%</Typography>
                </Box>
              </Box>
            ))}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              All KPIs
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>KPI Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Current</TableCell>
                    <TableCell>Target</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Trend</TableCell>
                    <TableCell>Owner</TableCell>
                    <TableCell>Last Updated</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {kpis?.map((kpi) => (
                    <TableRow key={kpi.kpi_id}>
                      <TableCell>{kpi.name}</TableCell>
                      <TableCell>
                        <Chip label={kpi.category} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {kpi.current_value} {kpi.unit}
                      </TableCell>
                      <TableCell>
                        {kpi.target_value} {kpi.unit}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={getProgress(kpi)}
                            sx={{ width: 100 }}
                          />
                          <Typography variant="body2">{Math.round(getProgress(kpi))}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{getTrendIcon(kpi.trend)}</TableCell>
                      <TableCell>{kpi.owner}</TableCell>
                      <TableCell>{new Date(kpi.last_updated).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};
