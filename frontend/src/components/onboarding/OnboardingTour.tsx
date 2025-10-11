import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

interface TourStep {
  title: string;
  description: string;
  content: React.ReactNode;
  action?: {
    text: string;
    onClick: () => void;
  };
}

interface OnboardingTourProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  open,
  onClose,
  onComplete,
}) => {
  const [activeStep, setActiveStep] = useState(0);

  const steps: TourStep[] = [
    {
      title: 'Welcome to HRMS!',
      description: 'Let\'s take a quick tour to get you started',
      content: (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h4" gutterBottom color="primary">
            🎉 Welcome to HR Management System
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            This tour will help you understand the key features and how to navigate the system.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Chip label="Employee Management" color="primary" />
            <Chip label="Attendance Tracking" color="secondary" />
            <Chip label="Leave Management" color="success" />
            <Chip label="Payroll Processing" color="info" />
          </Box>
        </Box>
      ),
    },
    {
      title: 'Dashboard Overview',
      description: 'Your central hub for all HR activities',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            📊 Dashboard Features
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 2 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" color="primary">
                  Quick Stats
                </Typography>
                <Typography variant="body2">
                  View total employees, attendance rates, and pending approvals at a glance
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" color="primary">
                  Recent Activity
                </Typography>
                <Typography variant="body2">
                  Stay updated with the latest employee activities and system events
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" color="primary">
                  Quick Actions
                </Typography>
                <Typography variant="body2">
                  Fast access to common tasks like adding employees or checking attendance
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" color="primary">
                  Progress Tracking
                </Typography>
                <Typography variant="body2">
                  Monitor your goals and performance metrics
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      ),
    },
    {
      title: 'Navigation Made Easy',
      description: 'Learn how to find what you need quickly',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            🧭 Navigation Tips
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              🔍 Global Search
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Use the search icon in the top bar to quickly find employees, features, or get help.
              You can also use Ctrl+K as a shortcut.
            </Typography>

            <Typography variant="subtitle1" gutterBottom>
              📱 Role-Based Menu
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              The menu adapts to your role. Employees see different options than managers.
            </Typography>

            <Typography variant="subtitle1" gutterBottom>
              🎯 Quick Access
            </Typography>
            <Typography variant="body2">
              Most common features are just one click away from the main navigation.
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      title: 'Employee Management',
      description: 'Managing your team effectively',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            👥 Employee Management
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Key Features:
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <li>
                <Typography variant="body2">
                  <strong>Add Employees:</strong> Create new employee profiles with all necessary information
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>View & Edit:</strong> Access detailed employee information and update as needed
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Search & Filter:</strong> Find employees quickly using various criteria
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  <strong>Bulk Actions:</strong> Select multiple employees for batch operations
                </Typography>
              </li>
            </Box>
          </Box>
        </Box>
      ),
    },
    {
      title: 'Attendance & Leave',
      description: 'Track time and manage leave requests',
      content: (
        <Box>
          <Typography variant="h6" gutterBottom>
            ⏰ Attendance & Leave Management
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  Attendance Tracking
                </Typography>
                <Typography variant="body2">
                  • Check in/out with location tracking
                  <br />
                  • View attendance history
                  <br />
                  • Regularize attendance
                  <br />
                  • Generate reports
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" color="secondary" gutterBottom>
                  Leave Management
                </Typography>
                <Typography variant="body2">
                  • Apply for leave
                  <br />
                  • View leave balance
                  <br />
                  • Approve/reject requests
                  <br />
                  • Leave calendar
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      ),
    },
    {
      title: 'You\'re All Set!',
      description: 'Ready to start using the HRMS system',
      content: (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            🎉 You&apos;re Ready to Go!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            You now know the basics of the HRMS system. Start exploring and don&apos;t hesitate to use the search feature or help system if you need assistance.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip label="Dashboard" color="primary" />
            <Chip label="Employees" color="secondary" />
            <Chip label="Attendance" color="success" />
            <Chip label="Leave" color="info" />
            <Chip label="Payroll" color="warning" />
          </Box>
        </Box>
      ),
    },
  ];

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      onComplete();
      onClose();
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
    onClose();
  };

  const currentStep = steps[activeStep];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {currentStep.title}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {currentStep.description}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((step, index) => (
            <Step key={index}>
              <StepLabel>{step.title}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: 300 }}>
          {currentStep.content}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleSkip} color="inherit">
          Skip Tour
        </Button>
        <Box sx={{ flex: 1 }} />
        {activeStep > 0 && (
          <Button
            onClick={handleBack}
            startIcon={<ArrowBackIcon />}
            sx={{ mr: 1 }}
          >
            Back
          </Button>
        )}
        <Button
          onClick={handleNext}
          variant="contained"
          endIcon={activeStep === steps.length - 1 ? <CheckCircleIcon /> : <ArrowForwardIcon />}
        >
          {activeStep === steps.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OnboardingTour;
