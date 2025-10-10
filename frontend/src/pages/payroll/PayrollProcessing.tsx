import React from 'react';
import { Container, Typography, Paper, Box, Stepper, Step, StepLabel, Button } from '@mui/material';

export const PayrollProcessing: React.FC = () => {
  const steps = ['Review Attendance', 'Calculate Salaries', 'Review & Approve', 'Process Payment'];
  const [activeStep, setActiveStep] = React.useState(0);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Payroll Processing</Typography>
      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Box sx={{ mt: 4 }}>
          <Typography>Step {activeStep + 1}: {steps[activeStep]}</Typography>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Button disabled={activeStep === 0} onClick={() => setActiveStep(activeStep - 1)}>
              Back
            </Button>
            <Button variant="contained" onClick={() => setActiveStep(activeStep + 1)} disabled={activeStep === steps.length - 1}>
              Next
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};
