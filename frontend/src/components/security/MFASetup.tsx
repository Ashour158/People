import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  Grid,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Security as SecurityIcon,
  QrCode as QrCodeIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import QRCode from 'qrcode.react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi } from '../../api/auth.api';

interface MFASetupProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

interface MFAMethod {
  id: string;
  name: string;
  type: 'totp' | 'sms' | 'email';
  enabled: boolean;
  verified: boolean;
}

export const MFASetup: React.FC<MFASetupProps> = ({ onComplete, onSkip }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Fetch MFA methods
  const { data: mfaMethods } = useQuery({
    queryKey: ['mfa-methods'],
    queryFn: authApi.getMFAMethods,
  });

  // Setup TOTP mutation
  const setupTOTPMutation = useMutation({
    mutationFn: authApi.setupTOTP,
    onSuccess: (data) => {
      setQrCodeData(data.qrCode);
      setBackupCodes(data.backupCodes);
    },
  });

  // Verify MFA mutation
  const verifyMFAMutation = useMutation({
    mutationFn: ({ methodId, code }: { methodId: string; code: string }) =>
      authApi.verifyMFA(methodId, code),
    onSuccess: () => {
      setActiveStep(prev => prev + 1);
      if (activeStep === 2) {
        onComplete?.();
      }
    },
  });

  const handleMethodSelect = (method: MFAMethod) => {
    setSelectedMethod(method);
    if (method.type === 'totp') {
      setupTOTPMutation.mutate();
    }
    setActiveStep(1);
  };

  const handleVerify = () => {
    if (selectedMethod && verificationCode) {
      verifyMFAMutation.mutate({
        methodId: selectedMethod.id,
        code: verificationCode,
      });
    }
  };

  const handleSkip = () => {
    onSkip?.();
  };

  const steps = [
    {
      label: 'Choose Method',
      description: 'Select your preferred MFA method',
    },
    {
      label: 'Setup',
      description: 'Configure your MFA method',
    },
    {
      label: 'Verify',
      description: 'Verify your MFA setup',
    },
    {
      label: 'Complete',
      description: 'MFA setup completed',
    },
  ];

  return (
    <Paper sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SecurityIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
        <Typography variant="h4">Multi-Factor Authentication</Typography>
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Secure your account with an additional layer of protection. Choose your preferred method below.
      </Typography>

      <Stepper activeStep={activeStep} orientation="vertical">
        <Step>
          <StepLabel>Choose Authentication Method</StepLabel>
          <StepContent>
            <Grid container spacing={2}>
              {mfaMethods?.map((method) => (
                <Grid item xs={12} md={6} key={method.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: selectedMethod?.id === method.id ? 2 : 1,
                      borderColor: selectedMethod?.id === method.id ? 'primary.main' : 'divider',
                      '&:hover': {
                        borderColor: 'primary.main',
                      },
                    }}
                    onClick={() => handleMethodSelect(method)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        {method.type === 'totp' && <QrCodeIcon sx={{ mr: 1 }} />}
                        {method.type === 'sms' && <PhoneIcon sx={{ mr: 1 }} />}
                        {method.type === 'email' && <EmailIcon sx={{ mr: 1 }} />}
                        <Typography variant="h6">{method.name}</Typography>
                        {method.enabled && (
                          <Chip
                            label="Enabled"
                            size="small"
                            color="success"
                            sx={{ ml: 'auto' }}
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {method.type === 'totp' && 'Use an authenticator app like Google Authenticator or Authy'}
                        {method.type === 'sms' && 'Receive verification codes via SMS'}
                        {method.type === 'email' && 'Receive verification codes via email'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </StepContent>
        </Step>

        <Step>
          <StepLabel>Setup Your Method</StepLabel>
          <StepContent>
            {selectedMethod?.type === 'totp' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Scan QR Code
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Use your authenticator app to scan this QR code:
                </Typography>
                
                {qrCodeData && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                    <QRCode value={qrCodeData} size={200} />
                    <Typography variant="caption" sx={{ mt: 1, textAlign: 'center' }}>
                      Or manually enter this key: {qrCodeData.split('secret=')[1]?.split('&')[0]}
                    </Typography>
                  </Box>
                )}

                <Button
                  variant="contained"
                  onClick={() => setActiveStep(2)}
                  disabled={!qrCodeData}
                >
                  Continue
                </Button>
              </Box>
            )}

            {selectedMethod?.type === 'sms' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  SMS Verification
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  We'll send a verification code to your registered phone number.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(2)}
                >
                  Send Code
                </Button>
              </Box>
            )}

            {selectedMethod?.type === 'email' && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Email Verification
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  We'll send a verification code to your registered email address.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(2)}
                >
                  Send Code
                </Button>
              </Box>
            )}
          </StepContent>
        </Step>

        <Step>
          <StepLabel>Verify Setup</StepLabel>
          <StepContent>
            <Typography variant="h6" gutterBottom>
              Enter Verification Code
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter the code from your {selectedMethod?.name}:
            </Typography>
            
            <TextField
              fullWidth
              label="Verification Code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              sx={{ mb: 2 }}
              placeholder="Enter 6-digit code"
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleVerify}
                disabled={!verificationCode || verifyMFAMutation.isPending}
              >
                {verifyMFAMutation.isPending ? 'Verifying...' : 'Verify'}
              </Button>
              <Button onClick={() => setActiveStep(1)}>
                Back
              </Button>
            </Box>

            {verifyMFAMutation.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Invalid verification code. Please try again.
              </Alert>
            )}
          </StepContent>
        </Step>

        <Step>
          <StepLabel>Setup Complete</StepLabel>
          <StepContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h6">
                MFA Setup Complete!
              </Typography>
            </Box>

            {backupCodes.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Backup Codes
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Save these backup codes in a safe place. You can use them to access your account if you lose your device.
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {backupCodes.map((code, index) => (
                    <Chip
                      key={index}
                      label={code}
                      variant="outlined"
                      sx={{ fontFamily: 'monospace' }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Button
              variant="contained"
              onClick={onComplete}
              fullWidth
            >
              Complete Setup
            </Button>
          </StepContent>
        </Step>
      </Stepper>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={handleSkip} color="inherit">
          Skip for Now
        </Button>
        <Typography variant="caption" color="text.secondary">
          You can enable MFA later in your security settings
        </Typography>
      </Box>
    </Paper>
  );
};
