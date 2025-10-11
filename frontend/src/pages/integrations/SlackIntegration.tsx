/**
 * Slack Integration Component
 * Configure and manage Slack workspace integration
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface SlackIntegrationProps {
  onClose: () => void;
}

interface SlackWorkspace {
  workspace_id?: string;
  slack_team_id: string;
  slack_team_name: string;
  slack_workspace_url?: string;
  bot_user_id?: string;
  bot_access_token: string;
  default_channel?: string;
  hr_channel?: string;
  leave_channel?: string;
  attendance_channel?: string;
  notify_leave_requests: boolean;
  notify_approvals: boolean;
  notify_attendance: boolean;
  notify_birthdays: boolean;
  notify_anniversaries: boolean;
  is_active: boolean;
}

const SlackIntegration: React.FC<SlackIntegrationProps> = ({ onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<Partial<SlackWorkspace>>({
    notify_leave_requests: true,
    notify_approvals: true,
    notify_attendance: true,
    notify_birthdays: true,
    notify_anniversaries: true,
    is_active: true,
    default_channel: '#general',
  });
  const [testMessage, setTestMessage] = useState('');
  
  const queryClient = useQueryClient();
  const organizationId = localStorage.getItem('organization_id');

  // Fetch existing Slack configuration
  const { data: existingConfig, isLoading } = useQuery({
    queryKey: ['slack-workspace', organizationId],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/integrations/slack/workspace`, {
        params: { organization_id: organizationId },
      });
      return response.data;
    },
    enabled: !!organizationId,
    retry: false,
  });

  // Fetch available channels
  const { data: channels } = useQuery({
    queryKey: ['slack-channels', organizationId],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/integrations/slack/channels`, {
        params: { organization_id: organizationId },
      });
      return response.data.data || [];
    },
    enabled: !!organizationId && !!existingConfig,
  });

  useEffect(() => {
    if (existingConfig) {
      setFormData(existingConfig);
      setActiveStep(1); // Skip setup if already configured
    }
  }, [existingConfig]);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<SlackWorkspace>) => {
      if (existingConfig?.workspace_id) {
        return axios.patch(
          `${API_BASE_URL}/integrations/slack/workspace/${existingConfig.workspace_id}`,
          data
        );
      } else {
        return axios.post(`${API_BASE_URL}/integrations/slack/workspace`, {
          ...data,
          organization_id: organizationId,
          integration_id: organizationId, // Create integration first if needed
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-workspace'] });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  // Test message mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      return axios.post(`${API_BASE_URL}/integrations/slack/test`, null, {
        params: { organization_id: organizationId },
      });
    },
  });

  const handleInputChange = (field: keyof SlackWorkspace, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = async () => {
    if (activeStep === steps.length - 1) {
      try {
        await saveMutation.mutateAsync(formData);
        onClose();
      } catch (error) {
        console.error('Failed to save Slack configuration:', error);
      }
    } else {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleTestConnection = async () => {
    try {
      await testMutation.mutateAsync();
      alert('Test message sent successfully! Check your Slack workspace.');
    } catch (error) {
      alert('Failed to send test message. Please check your configuration.');
    }
  };

  const steps = ['Setup', 'Channels', 'Notifications', 'Review'];

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              To integrate Slack, you need to create a Slack App and install it in your workspace.
              Follow the instructions at <a href="https://api.slack.com/start" target="_blank" rel="noreferrer">Slack API</a>.
            </Alert>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Slack Team ID"
                  value={formData.slack_team_id || ''}
                  onChange={(e) => handleInputChange('slack_team_id', e.target.value)}
                  required
                  helperText="Find this in your Slack workspace settings"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Slack Team Name"
                  value={formData.slack_team_name || ''}
                  onChange={(e) => handleInputChange('slack_team_name', e.target.value)}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bot Access Token"
                  value={formData.bot_access_token || ''}
                  onChange={(e) => handleInputChange('bot_access_token', e.target.value)}
                  required
                  type="password"
                  helperText="Starts with xoxb-"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bot User ID (Optional)"
                  value={formData.bot_user_id || ''}
                  onChange={(e) => handleInputChange('bot_user_id', e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        );
      
      case 1:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Configure which Slack channels to use for different notification types
            </Typography>
            
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Default Channel</InputLabel>
                  <Select
                    value={formData.default_channel || '#general'}
                    onChange={(e) => handleInputChange('default_channel', e.target.value)}
                  >
                    <MenuItem value="#general">#general</MenuItem>
                    {channels?.map((channel: any) => (
                      <MenuItem key={channel.id} value={`#${channel.name}`}>
                        #{channel.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>HR Channel</InputLabel>
                  <Select
                    value={formData.hr_channel || ''}
                    onChange={(e) => handleInputChange('hr_channel', e.target.value)}
                  >
                    <MenuItem value="">None</MenuItem>
                    {channels?.map((channel: any) => (
                      <MenuItem key={channel.id} value={`#${channel.name}`}>
                        #{channel.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Leave Channel</InputLabel>
                  <Select
                    value={formData.leave_channel || ''}
                    onChange={(e) => handleInputChange('leave_channel', e.target.value)}
                  >
                    <MenuItem value="">None</MenuItem>
                    {channels?.map((channel: any) => (
                      <MenuItem key={channel.id} value={`#${channel.name}`}>
                        #{channel.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Attendance Channel</InputLabel>
                  <Select
                    value={formData.attendance_channel || ''}
                    onChange={(e) => handleInputChange('attendance_channel', e.target.value)}
                  >
                    <MenuItem value="">None</MenuItem>
                    {channels?.map((channel: any) => (
                      <MenuItem key={channel.id} value={`#${channel.name}`}>
                        #{channel.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );
      
      case 2:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Choose which events trigger Slack notifications
            </Typography>
            
            <List>
              <ListItem>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.notify_leave_requests || false}
                      onChange={(e) => handleInputChange('notify_leave_requests', e.target.checked)}
                    />
                  }
                  label="Leave Requests"
                />
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.notify_approvals || false}
                      onChange={(e) => handleInputChange('notify_approvals', e.target.checked)}
                    />
                  }
                  label="Leave Approvals"
                />
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.notify_attendance || false}
                      onChange={(e) => handleInputChange('notify_attendance', e.target.checked)}
                    />
                  }
                  label="Attendance Reminders"
                />
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.notify_birthdays || false}
                      onChange={(e) => handleInputChange('notify_birthdays', e.target.checked)}
                    />
                  }
                  label="Birthday Notifications"
                />
              </ListItem>
              
              <Divider />
              
              <ListItem>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.notify_anniversaries || false}
                      onChange={(e) => handleInputChange('notify_anniversaries', e.target.checked)}
                    />
                  }
                  label="Work Anniversary Notifications"
                />
              </ListItem>
            </List>
          </Box>
        );
      
      case 3:
        return (
          <Box>
            <Alert severity="success" sx={{ mb: 3 }}>
              Your Slack integration is ready! Review the configuration below.
            </Alert>
            
            <List>
              <ListItem>
                <ListItemText
                  primary="Workspace"
                  secondary={formData.slack_team_name}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Default Channel"
                  secondary={formData.default_channel}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Active Notifications"
                  secondary={[
                    formData.notify_leave_requests && 'Leave Requests',
                    formData.notify_approvals && 'Approvals',
                    formData.notify_attendance && 'Attendance',
                    formData.notify_birthdays && 'Birthdays',
                    formData.notify_anniversaries && 'Anniversaries',
                  ].filter(Boolean).join(', ')}
                />
              </ListItem>
            </List>
            
            <Box sx={{ mt: 3 }}>
              <Button
                variant="outlined"
                onClick={handleTestConnection}
                disabled={testMutation.isPending}
                fullWidth
              >
                {testMutation.isPending ? 'Sending...' : 'Send Test Message'}
              </Button>
            </Box>
          </Box>
        );
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <DialogTitle>
        💬 Slack Integration
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {saveMutation.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to save configuration. Please check your inputs.
          </Alert>
        )}
        
        {renderStepContent()}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
        >
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={saveMutation.isPending}
        >
          {activeStep === steps.length - 1 ? 'Save' : 'Next'}
        </Button>
      </DialogActions>
    </>
  );
};

export default SlackIntegration;
