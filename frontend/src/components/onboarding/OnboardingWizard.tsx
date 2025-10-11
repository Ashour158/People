import React, { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  Card,
  CardContent,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Checkbox,
  FormGroup,
  Alert,
  CircularProgress,
  Chip,
  Avatar,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  isCompleted: boolean;
  isOptional: boolean;
}

interface OnboardingWizardProps {
  onComplete: (data: any) => void;
  onSkip: () => void;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onSkip }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to HRMS',
      description: 'Let\'s get you started with a quick setup',
      icon: <PersonIcon />,
      component: <WelcomeStep />,
      isCompleted: false,
      isOptional: false
    },
    {
      id: 'company-setup',
      title: 'Company Information',
      description: 'Tell us about your organization',
      icon: <BusinessIcon />,
      component: <CompanySetupStep formData={formData} setFormData={setFormData} errors={errors} />,
      isCompleted: false,
      isOptional: false
    },
    {
      id: 'user-preferences',
      title: 'User Preferences',
      description: 'Customize your experience',
      icon: <SettingsIcon />,
      component: <UserPreferencesStep formData={formData} setFormData={setFormData} errors={errors} />,
      isCompleted: false,
      isOptional: true
    },
    {
      id: 'completion',
      title: 'Setup Complete',
      description: 'You\'re all set to start using HRMS',
      icon: <CheckCircleIcon />,
      component: <CompletionStep formData={formData} />,
      isCompleted: false,
      isOptional: false
    }
  ];

  const handleNext = () => {
    if (validateCurrentStep()) {
      const newCompletedSteps = new Set(completedSteps);
      newCompletedSteps.add(activeStep);
      setCompletedSteps(newCompletedSteps);
      
      if (activeStep === steps.length - 1) {
        handleComplete();
      } else {
        setActiveStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSkip = () => {
    if (steps[activeStep].isOptional) {
      setActiveStep(prev => prev + 1);
    } else {
      onSkip();
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Save onboarding data
      await saveOnboardingData(formData);
      onComplete(formData);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateCurrentStep = (): boolean => {
    const currentStep = steps[activeStep];
    const newErrors: Record<string, string> = {};

    if (currentStep.id === 'company-setup') {
      if (!formData.companyName) {
        newErrors.companyName = 'Company name is required';
      }
      if (!formData.industry) {
        newErrors.industry = 'Industry is required';
      }
      if (!formData.employeeCount) {
        newErrors.employeeCount = 'Employee count is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveOnboardingData = async (data: any) => {
    // API call to save onboarding data
    const response = await fetch('/api/v1/onboarding/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error('Failed to save onboarding data');
    }
  };

  const getStepStatus = (stepIndex: number) => {
    if (completedSteps.has(stepIndex)) {
      return 'completed';
    } else if (stepIndex === activeStep) {
      return 'active';
    } else {
      return 'pending';
    }
  };

  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto', p: 3 }}>
      <Typography variant="h4" gutterBottom align="center">
        Welcome to HRMS
      </Typography>
      <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
        Let&apos;s set up your HR management system in just a few steps
      </Typography>

      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.id} completed={completedSteps.has(index)}>
            <StepLabel
              icon={step.icon}
              optional={step.isOptional ? <Chip label="Optional" size="small" /> : null}
            >
              <Typography variant="h6">{step.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {step.description}
              </Typography>
            </StepLabel>
            <StepContent>
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  {step.component}
                  
                  {Object.keys(errors).length > 0 && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      Please fix the errors above to continue
                    </Alert>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                    <Button
                      disabled={activeStep === 0}
                      onClick={handleBack}
                      startIcon={<ArrowBackIcon />}
                    >
                      Back
                    </Button>
                    
                    <Box>
                      {step.isOptional && (
                        <Button
                          onClick={handleSkip}
                          sx={{ mr: 2 }}
                        >
                          Skip
                        </Button>
                      )}
                      
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        endIcon={activeStep === steps.length - 1 ? <CheckCircleIcon /> : <ArrowForwardIcon />}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <CircularProgress size={20} />
                        ) : activeStep === steps.length - 1 ? (
                          'Complete Setup'
                        ) : (
                          'Next'
                        )}
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

// Step Components
const WelcomeStep: React.FC = () => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Welcome to HRMS!
    </Typography>
    <Typography variant="body1" paragraph>
      We&apos;re excited to help you streamline your HR processes. This quick setup will 
      configure your system for optimal performance.
    </Typography>
    
    <Box sx={{ display: 'flex', alignItems: 'center', mt: 3 }}>
      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
        <PersonIcon />
      </Avatar>
      <Box>
        <Typography variant="subtitle1">Personalized Experience</Typography>
        <Typography variant="body2" color="text.secondary">
          We&apos;ll customize the system based on your organization&apos;s needs
        </Typography>
      </Box>
    </Box>
    
    <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
      <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
        <BusinessIcon />
      </Avatar>
      <Box>
        <Typography variant="subtitle1">Easy Setup</Typography>
        <Typography variant="body2" color="text.secondary">
          Get started in minutes with our guided setup process
        </Typography>
      </Box>
    </Box>
  </Box>
);

interface CompanySetupStepProps {
  formData: any;
  setFormData: (data: any) => void;
  errors: Record<string, string>;
}

const CompanySetupStep: React.FC<CompanySetupStepProps> = ({ formData, setFormData, errors }) => {
  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Manufacturing',
    'Retail',
    'Education',
    'Government',
    'Non-profit',
    'Other'
  ];

  const employeeCounts = [
    '1-10',
    '11-50',
    '51-200',
    '201-500',
    '501-1000',
    '1000+'
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Company Information
      </Typography>
      
      <TextField
        fullWidth
        label="Company Name"
        value={formData.companyName || ''}
        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
        error={!!errors.companyName}
        helperText={errors.companyName}
        sx={{ mb: 3 }}
      />
      
      <FormControl fullWidth error={!!errors.industry} sx={{ mb: 3 }}>
        <FormLabel>Industry</FormLabel>
        <RadioGroup
          value={formData.industry || ''}
          onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
        >
          {industries.map((industry) => (
            <FormControlLabel
              key={industry}
              value={industry}
              control={<Radio />}
              label={industry}
            />
          ))}
        </RadioGroup>
        {errors.industry && (
          <Typography variant="caption" color="error">
            {errors.industry}
          </Typography>
        )}
      </FormControl>
      
      <FormControl fullWidth error={!!errors.employeeCount} sx={{ mb: 3 }}>
        <FormLabel>Number of Employees</FormLabel>
        <RadioGroup
          value={formData.employeeCount || ''}
          onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
        >
          {employeeCounts.map((count) => (
            <FormControlLabel
              key={count}
              value={count}
              control={<Radio />}
              label={count}
            />
          ))}
        </RadioGroup>
        {errors.employeeCount && (
          <Typography variant="caption" color="error">
            {errors.employeeCount}
          </Typography>
        )}
      </FormControl>
    </Box>
  );
};

interface UserPreferencesStepProps {
  formData: any;
  setFormData: (data: any) => void;
  errors: Record<string, string>;
}

const UserPreferencesStep: React.FC<UserPreferencesStepProps> = ({ formData, setFormData, errors }) => {
  const [preferences, setPreferences] = useState({
    notifications: true,
    emailUpdates: true,
    mobileApp: false,
    darkMode: false,
    language: 'en',
    timezone: 'UTC'
  });

  useEffect(() => {
    setFormData({ ...formData, preferences });
  }, [preferences]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        User Preferences
      </Typography>
      
      <FormGroup>
        <FormControlLabel
          control={
            <Checkbox
              checked={preferences.notifications}
              onChange={(e) => setPreferences({ ...preferences, notifications: e.target.checked })}
            />
          }
          label="Enable push notifications"
        />
        
        <FormControlLabel
          control={
            <Checkbox
              checked={preferences.emailUpdates}
              onChange={(e) => setPreferences({ ...preferences, emailUpdates: e.target.checked })}
            />
          }
          label="Receive email updates"
        />
        
        <FormControlLabel
          control={
            <Checkbox
              checked={preferences.mobileApp}
              onChange={(e) => setPreferences({ ...preferences, mobileApp: e.target.checked })}
            />
          }
          label="Use mobile app"
        />
        
        <FormControlLabel
          control={
            <Checkbox
              checked={preferences.darkMode}
              onChange={(e) => setPreferences({ ...preferences, darkMode: e.target.checked })}
            />
          }
          label="Dark mode"
        />
      </FormGroup>
      
      <Divider sx={{ my: 3 }} />
      
      <TextField
        fullWidth
        select
        label="Language"
        value={preferences.language}
        onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
        sx={{ mb: 3 }}
      >
        <option value="en">English</option>
        <option value="es">Spanish</option>
        <option value="fr">French</option>
        <option value="de">German</option>
      </TextField>
      
      <TextField
        fullWidth
        select
        label="Timezone"
        value={preferences.timezone}
        onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
      >
        <option value="UTC">UTC</option>
        <option value="EST">Eastern Time</option>
        <option value="PST">Pacific Time</option>
        <option value="GMT">Greenwich Mean Time</option>
      </TextField>
    </Box>
  );
};

interface CompletionStepProps {
  formData: any;
}

const CompletionStep: React.FC<CompletionStepProps> = ({ formData }) => (
  <Box textAlign="center">
    <Avatar sx={{ bgcolor: 'success.main', width: 64, height: 64, mx: 'auto', mb: 2 }}>
      <CheckCircleIcon fontSize="large" />
    </Avatar>
    
    <Typography variant="h5" gutterBottom>
      Setup Complete!
    </Typography>
    
    <Typography variant="body1" color="text.secondary" paragraph>
      Your HRMS system is now configured and ready to use. You can start managing 
      your employees, tracking attendance, and processing payroll.
    </Typography>
    
    <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        What&apos;s Next?
      </Typography>
      <Typography variant="body2" color="text.secondary">
        • Add your first employee
        • Set up attendance policies
        • Configure leave types
        • Import existing data
      </Typography>
    </Box>
  </Box>
);

export default OnboardingWizard;
