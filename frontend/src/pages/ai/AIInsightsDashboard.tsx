import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  School,
  Psychology,
  Assessment,
  BarChart,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import aiApi from '../../api/ai.api';

export const AIInsightsDashboard: React.FC = () => {
  // Fetch AI usage statistics
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['ai-usage-stats'],
    queryFn: () => aiApi.getUsageStats(),
  });

  // Fetch sentiment trends
  const { data: sentimentData, isLoading: sentimentLoading } = useQuery({
    queryKey: ['sentiment-trends'],
    queryFn: () => aiApi.getSentimentTrends({ period: 'monthly' }),
  });

  // Fetch attrition risks summary
  const { data: attritionData } = useQuery({
    queryKey: ['attrition-summary'],
    queryFn: () => aiApi.getAttritionRisks(),
  });

  const usage = usageData?.data || [];
  const summary = usageData?.data?.summary || {};
  const trends = sentimentData?.data?.trends || [];
  const attritionSummary = attritionData?.data?.summary || {};

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        AI Insights Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        AI-powered analytics and predictions for smarter HR decisions
      </Typography>

      {/* AI Usage Statistics */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI Usage & Costs
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {summary.totalRequests || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Requests
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  ${(summary.totalCost || 0).toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Cost
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4">
                  {(summary.dailyAverage || 0).toFixed(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Daily Average
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {summary.budgetUsedPercent || 0}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Budget Used
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={summary.budgetUsedPercent || 0}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Attrition Risk Overview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Assessment sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">Attrition Risk Overview</Typography>
              </Box>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: 'error.main',
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary="Critical Risk"
                    secondary={`${attritionSummary.critical || 0} employees`}
                  />
                  <Chip
                    label={attritionSummary.critical || 0}
                    color="error"
                    size="small"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: 'warning.main',
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary="High Risk"
                    secondary={`${attritionSummary.high || 0} employees`}
                  />
                  <Chip
                    label={attritionSummary.high || 0}
                    color="warning"
                    size="small"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: 'info.main',
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary="Medium Risk"
                    secondary={`${attritionSummary.medium || 0} employees`}
                  />
                  <Chip
                    label={attritionSummary.medium || 0}
                    color="info"
                    size="small"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary="Low Risk"
                    secondary={`${attritionSummary.low || 0} employees`}
                  />
                  <Chip
                    label={attritionSummary.low || 0}
                    color="success"
                    size="small"
                  />
                </ListItem>
              </List>
              {(attritionSummary.critical || 0) + (attritionSummary.high || 0) > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  {(attritionSummary.critical || 0) + (attritionSummary.high || 0)}{' '}
                  employees require immediate attention
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sentiment Trends */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Psychology sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Employee Sentiment Trends</Typography>
              </Box>
              {sentimentLoading ? (
                <LinearProgress />
              ) : trends.length > 0 ? (
                <List>
                  {trends.slice(0, 5).map((trend: any, index: number) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {trend.trendDirection === 'improving' ? (
                          <TrendingUp color="success" />
                        ) : trend.trendDirection === 'declining' ? (
                          <TrendingDown color="error" />
                        ) : (
                          <BarChart color="info" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={trend.period}
                        secondary={`${trend.responseCount} responses • ${
                          trend.trendDirection
                        }`}
                      />
                      <Typography
                        variant="h6"
                        color={
                          trend.averageSentiment >= 70
                            ? 'success.main'
                            : trend.averageSentiment >= 50
                            ? 'warning.main'
                            : 'error.main'
                        }
                      >
                        {trend.averageSentiment}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="info">No sentiment data available yet</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* AI Feature Usage Breakdown */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                AI Feature Usage Breakdown
              </Typography>
              {usageLoading ? (
                <LinearProgress />
              ) : usage.length > 0 ? (
                <List>
                  {usage.map((item: any, index: number) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <School color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.featureType
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        secondary={`${item.requestCount} requests • ${
                          item.avgProcessingTime
                        }ms avg`}
                      />
                      <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                        ${(item.totalCost || 0).toFixed(2)}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min((item.requestCount / 100) * 100, 100)}
                        sx={{ width: 100 }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="info">No usage data available yet</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AIInsightsDashboard;
