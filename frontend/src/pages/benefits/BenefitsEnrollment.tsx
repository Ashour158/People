import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const steps = ['Select Plan', 'Add Dependents', 'Review', 'Confirm'];

interface BenefitPlan {
  id: string;
  plan_name: string;
  plan_type: string;
  coverage_type: string;
  employee_cost: number;
  employer_contribution: number;
  description: string;
  features: string[];
}

interface Dependent {
  id?: string;
  name: string;
  relationship: string;
  date_of_birth: string;
}

export const BenefitsEnrollment: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<BenefitPlan | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [openDependentDialog, setOpenDependentDialog] = useState(false);
  const [currentDependent, setCurrentDependent] = useState<Dependent>({
    name: '',
    relationship: '',
    date_of_birth: '',
  });

  const queryClient = useQueryClient();

  // Fetch available benefit plans
  const { data: plans, isLoading } = useQuery({
    queryKey: ['benefits-plans'],
    queryFn: async () => {
      const response = await fetch('/api/v1/benefits/plans');
      if (!response.ok) throw new Error('Failed to fetch plans');
      return response.json();
    },
  });

  // Enrollment mutation
  const enrollMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/v1/benefits/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Enrollment failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefits-enrollments'] });
      setActiveStep(3);
    },
  });

  const handleNext = () => {
    if (activeStep === 0 && !selectedPlan) {
      alert('Please select a plan');
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleAddDependent = () => {
    if (currentDependent.name && currentDependent.relationship && currentDependent.date_of_birth) {
      setDependents([...dependents, { ...currentDependent, id: Date.now().toString() }]);
      setCurrentDependent({ name: '', relationship: '', date_of_birth: '' });
      setOpenDependentDialog(false);
    }
  };

  const handleRemoveDependent = (id: string) => {
    setDependents(dependents.filter((d) => d.id !== id));
  };

  const handleEnroll = () => {
    enrollMutation.mutate({
      plan_id: selectedPlan?.id,
      dependents: dependents.map((d) => ({
        name: d.name,
        relationship: d.relationship,
        date_of_birth: d.date_of_birth,
      })),
      enrollment_date: new Date().toISOString(),
    });
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Your Benefit Plan
            </Typography>
            {isLoading ? (
              <Typography>Loading plans...</Typography>
            ) : (
              <Grid container spacing={2}>
                {plans?.map((plan: BenefitPlan) => (
                  <Grid item xs={12} md={6} key={plan.id}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        border: selectedPlan?.id === plan.id ? '2px solid primary.main' : '1px solid grey.300',
                      }}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      <CardContent>
                        <Typography variant="h6">{plan.plan_name}</Typography>
                        <Chip label={plan.plan_type} size="small" sx={{ mt: 1 }} />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {plan.description}
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 2 }}>
                          ${plan.employee_cost}/month
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Employer contributes: ${plan.employer_contribution}/month
                        </Typography>
                        <List dense sx={{ mt: 1 }}>
                          {plan.features?.map((feature: string, idx: number) => (
                            <ListItem key={idx} disablePadding>
                              <ListItemText primary={`• ${feature}`} />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Add Dependents
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Add family members you want to include in your benefits coverage.
            </Typography>

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setOpenDependentDialog(true)}
              sx={{ mt: 2, mb: 2 }}
            >
              Add Dependent
            </Button>

            <List>
              {dependents.map((dependent) => (
                <ListItem
                  key={dependent.id}
                  secondaryAction={
                    <IconButton edge="end" onClick={() => handleRemoveDependent(dependent.id!)}>
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={dependent.name}
                    secondary={`${dependent.relationship} - DOB: ${dependent.date_of_birth}`}
                  />
                </ListItem>
              ))}
            </List>

            {dependents.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No dependents added. You can skip this step if you don't want to add dependents.
              </Alert>
            )}

            <Dialog open={openDependentDialog} onClose={() => setOpenDependentDialog(false)}>
              <DialogTitle>Add Dependent</DialogTitle>
              <DialogContent>
                <TextField
                  fullWidth
                  label="Name"
                  value={currentDependent.name}
                  onChange={(e) => setCurrentDependent({ ...currentDependent, name: e.target.value })}
                  sx={{ mt: 2 }}
                />
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Relationship</InputLabel>
                  <Select
                    value={currentDependent.relationship}
                    onChange={(e) => setCurrentDependent({ ...currentDependent, relationship: e.target.value })}
                  >
                    <MenuItem value="SPOUSE">Spouse</MenuItem>
                    <MenuItem value="CHILD">Child</MenuItem>
                    <MenuItem value="PARENT">Parent</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  type="date"
                  label="Date of Birth"
                  value={currentDependent.date_of_birth}
                  onChange={(e) => setCurrentDependent({ ...currentDependent, date_of_birth: e.target.value })}
                  sx={{ mt: 2 }}
                  InputLabelProps={{ shrink: true }}
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenDependentDialog(false)}>Cancel</Button>
                <Button onClick={handleAddDependent} variant="contained">
                  Add
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Your Enrollment
            </Typography>
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Selected Plan:</strong> {selectedPlan?.plan_name}
                </Typography>
                <Typography variant="body2">
                  <strong>Coverage:</strong> {selectedPlan?.coverage_type}
                </Typography>
                <Typography variant="body2">
                  <strong>Monthly Cost:</strong> ${selectedPlan?.employee_cost}
                </Typography>
                <Typography variant="body2">
                  <strong>Dependents:</strong> {dependents.length}
                </Typography>
                {dependents.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Dependents:</Typography>
                    <List dense>
                      {dependents.map((dep) => (
                        <ListItem key={dep.id}>
                          <ListItemText primary={`${dep.name} (${dep.relationship})`} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
                <Typography variant="h6" sx={{ mt: 2 }}>
                  <strong>Total Monthly Cost:</strong> $
                  {selectedPlan ? selectedPlan.employee_cost * (1 + dependents.length * 0.3) : 0}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        );

      case 3:
        return (
          <Alert severity="success">
            <Typography variant="h6">Enrollment Confirmed!</Typography>
            <Typography>
              Your benefits enrollment has been processed successfully. You will receive a confirmation email shortly.
            </Typography>
          </Alert>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Benefits Enrollment
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mt: 3, mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {renderStepContent(activeStep)}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button disabled={activeStep === 0} onClick={handleBack}>
          Back
        </Button>
        <Box>
          {activeStep < 2 && (
            <Button variant="contained" onClick={handleNext}>
              Next
            </Button>
          )}
          {activeStep === 2 && (
            <Button variant="contained" onClick={handleEnroll} disabled={enrollMutation.isPending}>
              {enrollMutation.isPending ? 'Processing...' : 'Confirm Enrollment'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default BenefitsEnrollment;
