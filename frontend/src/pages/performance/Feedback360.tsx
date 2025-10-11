import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Rating,
  Chip,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';

interface FeedbackRequest {
  request_id: string;
  employee_name: string;
  reviewer_name: string;
  relationship: string;
  status: 'pending' | 'completed';
  due_date: string;
}

export const Feedback360: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const steps = ['Select Reviewers', 'Provide Feedback', 'Review & Submit'];

  const { data: feedbackRequests } = useQuery<FeedbackRequest[]>({
    queryKey: ['feedback-360'],
    queryFn: async () => {
      return [
        {
          request_id: '1',
          employee_name: 'John Doe',
          reviewer_name: 'Jane Smith',
          relationship: 'Peer',
          status: 'completed',
          due_date: '2025-10-15',
        },
        {
          request_id: '2',
          employee_name: 'John Doe',
          reviewer_name: 'Bob Manager',
          relationship: 'Manager',
          status: 'pending',
          due_date: '2025-10-20',
        },
      ];
    },
  });

  const competencies = [
    { id: 'leadership', label: 'Leadership' },
    { id: 'communication', label: 'Communication' },
    { id: 'teamwork', label: 'Teamwork' },
    { id: 'problem_solving', label: 'Problem Solving' },
    { id: 'technical_skills', label: 'Technical Skills' },
  ];

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = () => {
    // Submit 360 feedback
    // Implementation will be added here
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Reviewers
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 3 }}>
              Choose colleagues to provide feedback (minimum 5 recommended)
            </Typography>
            <Grid container spacing={2}>
              {['Peer', 'Manager', 'Direct Report', 'Other'].map((type) => (
                <Grid item xs={12} md={6} key={type}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        {type}
                      </Typography>
                      <TextField
                        fullWidth
                        label="Select person"
                        placeholder="Search by name..."
                        size="small"
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Rate Competencies
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 3 }}>
              Please rate each competency from 1 to 5 stars
            </Typography>
            {competencies.map((competency) => (
              <Box key={competency.id} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {competency.label}
                </Typography>
                <Rating
                  value={ratings[competency.id] || 0}
                  onChange={(_, value) =>
                    setRatings({ ...ratings, [competency.id]: value || 0 })
                  }
                  size="large"
                />
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Add comments (optional)"
                  sx={{ mt: 1 }}
                  size="small"
                />
              </Box>
            ))}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Your Feedback
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 3 }}>
              Please review your ratings before submitting
            </Typography>
            {competencies.map((competency) => (
              <Box
                key={competency.id}
                sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}
              >
                <Typography>{competency.label}</Typography>
                <Rating value={ratings[competency.id] || 0} readOnly />
              </Box>
            ))}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        360° Feedback
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Requests
              </Typography>
              <Typography variant="h4">
                {feedbackRequests?.filter((r) => r.status === 'pending').length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4">
                {feedbackRequests?.filter((r) => r.status === 'completed').length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Response Rate
              </Typography>
              <Typography variant="h4">
                {feedbackRequests?.length
                  ? Math.round(
                      (feedbackRequests.filter((r) => r.status === 'completed').length /
                        feedbackRequests.length) *
                        100
                    )
                  : 0}
                %
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button disabled={activeStep === 0} onClick={handleBack}>
            Back
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button variant="contained" startIcon={<SendIcon />} onClick={handleSubmit}>
              Submit Feedback
            </Button>
          ) : (
            <Button variant="contained" onClick={handleNext}>
              Next
            </Button>
          )}
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Feedback Requests
        </Typography>
        {feedbackRequests?.map((request) => (
          <Card key={request.request_id} variant="outlined" sx={{ mb: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1">{request.employee_name}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Requested by: {request.reviewer_name} ({request.relationship})
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Chip
                    label={request.status}
                    color={request.status === 'completed' ? 'success' : 'warning'}
                    size="small"
                  />
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Due: {new Date(request.due_date).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Paper>
    </Container>
  );
};
