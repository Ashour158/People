/**
 * Integration Management Dashboard
 * Central hub for managing all third-party integrations
 */
import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Dialog,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Add as AddIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// Import individual integration components
import SlackIntegration from './SlackIntegration';
import ZoomIntegration from './ZoomIntegration';
import JobBoardIntegration from './JobBoardIntegration';
import PaymentGatewayIntegration from './PaymentGatewayIntegration';
import BiometricIntegration from './BiometricIntegration';
import GeofencingIntegration from './GeofencingIntegration';
import HolidayCalendarIntegration from './HolidayCalendarIntegration';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface Integration {
  integration_id: string;
  integration_type: string;
  integration_name: string;
  description?: string;
  status: string;
  is_enabled: boolean;
  last_sync_at?: string;
  created_at: string;
}

const IntegrationsPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIntegrationType, setSelectedIntegrationType] = useState<string | null>(null);
  
  const organizationId = localStorage.getItem('organization_id');

  // Fetch all integrations
  const { data: integrations, isLoading, error } = useQuery<Integration[]>({
    queryKey: ['integrations', organizationId],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/integrations`, {
        params: { organization_id: organizationId },
      });
      return response.data;
    },
    enabled: !!organizationId,
  });

  const integrationTypes = [
    {
      type: 'slack',
      name: 'Slack',
      icon: '💬',
      description: 'Send notifications to Slack channels',
      category: 'communication',
    },
    {
      type: 'zoom',
      name: 'Zoom',
      icon: '📹',
      description: 'Schedule interviews and meetings',
      category: 'communication',
    },
    {
      type: 'linkedin',
      name: 'LinkedIn',
      icon: '💼',
      description: 'Post jobs and track applicants',
      category: 'recruitment',
    },
    {
      type: 'indeed',
      name: 'Indeed',
      icon: '🔍',
      description: 'Publish job postings',
      category: 'recruitment',
    },
    {
      type: 'glassdoor',
      name: 'Glassdoor',
      icon: '🏢',
      description: 'Manage company reviews and jobs',
      category: 'recruitment',
    },
    {
      type: 'stripe',
      name: 'Stripe',
      icon: '💳',
      description: 'Process salary payments',
      category: 'payroll',
    },
    {
      type: 'paypal',
      name: 'PayPal',
      icon: '💰',
      description: 'Send salary via PayPal',
      category: 'payroll',
    },
    {
      type: 'biometric',
      name: 'Biometric Devices',
      icon: '👆',
      description: 'Fingerprint and face recognition',
      category: 'attendance',
    },
    {
      type: 'geofencing',
      name: 'Geofencing',
      icon: '📍',
      description: 'Location-based attendance',
      category: 'attendance',
    },
    {
      type: 'calendar',
      name: 'Holiday Calendar',
      icon: '📅',
      description: 'Manage holidays and leave',
      category: 'leave',
    },
  ];

  const getIntegrationStatus = (type: string) => {
    const integration = integrations?.find(i => i.integration_type === type);
    return integration;
  };

  const handleConfigureIntegration = (type: string) => {
    setSelectedIntegrationType(type);
    setConfigDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setConfigDialogOpen(false);
    setSelectedIntegrationType(null);
  };

  const renderIntegrationCard = (integrationType: typeof integrationTypes[0]) => {
    const status = getIntegrationStatus(integrationType.type);
    const isConfigured = !!status;
    const isActive = status?.is_enabled && status?.status === 'active';

    return (
      <Grid item xs={12} sm={6} md={4} key={integrationType.type}>
        <Card
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            '&:hover': {
              boxShadow: 6,
              transform: 'translateY(-4px)',
              transition: 'all 0.3s ease',
            },
          }}
        >
          {isConfigured && (
            <Chip
              icon={isActive ? <CheckCircleIcon /> : <ErrorIcon />}
              label={isActive ? 'Active' : 'Inactive'}
              color={isActive ? 'success' : 'default'}
              size="small"
              sx={{ position: 'absolute', top: 16, right: 16 }}
            />
          )}
          
          <CardContent sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h2" sx={{ mr: 1 }}>
                {integrationType.icon}
              </Typography>
              <Typography variant="h6">{integrationType.name}</Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {integrationType.description}
            </Typography>
            
            {status?.last_sync_at && (
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Last synced: {new Date(status.last_sync_at).toLocaleString()}
              </Typography>
            )}
          </CardContent>
          
          <CardActions>
            <Button
              size="small"
              startIcon={isConfigured ? <SettingsIcon /> : <AddIcon />}
              onClick={() => handleConfigureIntegration(integrationType.type)}
              variant={isConfigured ? 'outlined' : 'contained'}
            >
              {isConfigured ? 'Configure' : 'Setup'}
            </Button>
            
            {isConfigured && isActive && (
              <IconButton size="small" color="primary">
                <SyncIcon />
              </IconButton>
            )}
          </CardActions>
        </Card>
      </Grid>
    );
  };

  const renderConfigurationDialog = () => {
    if (!selectedIntegrationType) return null;

    let content;
    switch (selectedIntegrationType) {
      case 'slack':
        content = <SlackIntegration onClose={handleCloseDialog} />;
        break;
      case 'zoom':
        content = <ZoomIntegration onClose={handleCloseDialog} />;
        break;
      case 'linkedin':
      case 'indeed':
      case 'glassdoor':
        content = <JobBoardIntegration type={selectedIntegrationType} onClose={handleCloseDialog} />;
        break;
      case 'stripe':
      case 'paypal':
        content = <PaymentGatewayIntegration type={selectedIntegrationType} onClose={handleCloseDialog} />;
        break;
      case 'biometric':
        content = <BiometricIntegration onClose={handleCloseDialog} />;
        break;
      case 'geofencing':
        content = <GeofencingIntegration onClose={handleCloseDialog} />;
        break;
      case 'calendar':
        content = <HolidayCalendarIntegration onClose={handleCloseDialog} />;
        break;
      default:
        content = <Typography>Configuration not available</Typography>;
    }

    return (
      <Dialog
        open={configDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {content}
      </Dialog>
    );
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error">
          Failed to load integrations. Please try again later.
        </Alert>
      </Container>
    );
  }

  const categorizedIntegrations = {
    communication: integrationTypes.filter(i => i.category === 'communication'),
    recruitment: integrationTypes.filter(i => i.category === 'recruitment'),
    payroll: integrationTypes.filter(i => i.category === 'payroll'),
    attendance: integrationTypes.filter(i => i.category === 'attendance'),
    leave: integrationTypes.filter(i => i.category === 'leave'),
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Integrations
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Connect your HR system with popular tools and services
        </Typography>
      </Box>

      <Tabs
        value={selectedTab}
        onChange={(_, newValue) => setSelectedTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="All Integrations" />
        <Tab label="Communication" />
        <Tab label="Recruitment" />
        <Tab label="Payroll" />
        <Tab label="Attendance & Leave" />
      </Tabs>

      {selectedTab === 0 && (
        <Grid container spacing={3}>
          {integrationTypes.map(renderIntegrationCard)}
        </Grid>
      )}

      {selectedTab === 1 && (
        <Grid container spacing={3}>
          {categorizedIntegrations.communication.map(renderIntegrationCard)}
        </Grid>
      )}

      {selectedTab === 2 && (
        <Grid container spacing={3}>
          {categorizedIntegrations.recruitment.map(renderIntegrationCard)}
        </Grid>
      )}

      {selectedTab === 3 && (
        <Grid container spacing={3}>
          {categorizedIntegrations.payroll.map(renderIntegrationCard)}
        </Grid>
      )}

      {selectedTab === 4 && (
        <Grid container spacing={3}>
          {[...categorizedIntegrations.attendance, ...categorizedIntegrations.leave].map(renderIntegrationCard)}
        </Grid>
      )}

      {renderConfigurationDialog()}
    </Container>
  );
};

export default IntegrationsPage;
