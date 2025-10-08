import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import aiApi from '../../api/ai.api';

interface AttritionRisk {
  employeeId: string;
  employeeName: string;
  department: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  predictedExitDate: string;
  confidence: number;
}

interface AttritionDetail {
  employeeId: string;
  riskScore: number;
  riskLevel: string;
  confidence: number;
  predictedExitDate: string;
  timeframe: string;
  contributingFactors: Array<{
    factor: string;
    weight: number;
    score: number;
    description: string;
  }>;
  retentionActions: Array<{
    action: string;
    priority: string;
    expectedImpact: string;
    estimatedCost: number;
  }>;
  talkingPoints: string[];
  urgency: string;
}

export const AttritionDashboard: React.FC = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Fetch high-risk employees
  const { data: risksData, isLoading: risksLoading } = useQuery({
    queryKey: ['attrition-risks'],
    queryFn: () => aiApi.getAttritionRisks({ riskLevel: 'high' }),
  });

  // Fetch detailed prediction for selected employee
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['attrition-detail', selectedEmployee],
    queryFn: () =>
      selectedEmployee ? aiApi.predictAttrition(selectedEmployee) : null,
    enabled: !!selectedEmployee,
  });

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'success';
    }
  };

  const handleViewDetails = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    setDetailDialogOpen(true);
  };

  if (risksLoading) {
    return <LinearProgress />;
  }

  const risks = risksData?.data?.highRiskEmployees || [];
  const summary = risksData?.data?.summary || {};
  const detail = detailData?.data as AttritionDetail;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Employee Attrition Risk Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        AI-powered predictions to identify employees at risk of leaving
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mt: 2, mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
            <CardContent>
              <Typography variant="h3">{summary.critical || 0}</Typography>
              <Typography variant="body2">Critical Risk</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
            <CardContent>
              <Typography variant="h3">{summary.high || 0}</Typography>
              <Typography variant="body2">High Risk</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
            <CardContent>
              <Typography variant="h3">{summary.medium || 0}</Typography>
              <Typography variant="body2">Medium Risk</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Typography variant="h3">{summary.low || 0}</Typography>
              <Typography variant="body2">Low Risk</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* High Risk Employees List */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            High-Risk Employees
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            These employees have been identified as having high attrition risk.
            Click on an employee to view detailed analysis and retention recommendations.
          </Alert>

          <List>
            {risks.length === 0 ? (
              <Alert severity="success">
                No high-risk employees identified at this time.
              </Alert>
            ) : (
              risks.map((risk: AttritionRisk) => (
                <React.Fragment key={risk.employeeId}>
                  <ListItem
                    button
                    onClick={() => handleViewDetails(risk.employeeId)}
                  >
                    <ListItemIcon>
                      <WarningIcon
                        color={getRiskColor(risk.riskLevel) as any}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={risk.employeeName}
                      secondary={`${risk.department} • Predicted Exit: ${new Date(
                        risk.predictedExitDate
                      ).toLocaleDateString()}`}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ minWidth: 100 }}>
                        <LinearProgress
                          variant="determinate"
                          value={risk.riskScore}
                          color={getRiskColor(risk.riskLevel) as any}
                        />
                        <Typography variant="caption">
                          Risk Score: {risk.riskScore}%
                        </Typography>
                      </Box>
                      <Chip
                        label={risk.riskLevel.toUpperCase()}
                        color={getRiskColor(risk.riskLevel) as any}
                        size="small"
                      />
                    </Box>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))
            )}
          </List>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            Attrition Risk Analysis
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <LinearProgress />
          ) : detail ? (
            <Box>
              {/* Risk Overview */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Risk Assessment
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Risk Score
                    </Typography>
                    <Typography variant="h4" color="error">
                      {detail.riskScore}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Confidence Level
                    </Typography>
                    <Typography variant="h4">
                      {detail.confidence}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Predicted Exit
                    </Typography>
                    <Typography variant="body1">
                      {new Date(detail.predictedExitDate).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Urgency
                    </Typography>
                    <Chip
                      label={detail.urgency}
                      color={
                        detail.urgency === 'immediate' ? 'error' : 'warning'
                      }
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Contributing Factors */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Contributing Factors
                </Typography>
                <List dense>
                  {detail.contributingFactors.map((factor, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <TrendingDownIcon color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={factor.factor}
                        secondary={factor.description}
                      />
                      <Chip
                        label={`${factor.score}%`}
                        size="small"
                        color="error"
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Retention Actions */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Recommended Retention Actions
                </Typography>
                <List dense>
                  {detail.retentionActions.map((action, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <TrendingUpIcon color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary={action.action}
                        secondary={`${action.expectedImpact} • Est. Cost: $${action.estimatedCost.toLocaleString()}`}
                      />
                      <Chip
                        label={action.priority}
                        size="small"
                        color={
                          action.priority === 'high' ? 'error' : 'warning'
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Manager Talking Points */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Manager Talking Points
                </Typography>
                <List dense>
                  {detail.talkingPoints.map((point, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <InfoIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={point} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Box>
          ) : (
            <Alert severity="error">Failed to load detailed analysis</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          <Button variant="contained" color="primary">
            Create Action Plan
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttritionDashboard;
