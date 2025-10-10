import React from 'react';
import { Container, Typography, Paper, Box, Button, Grid, Card, CardContent, Chip } from '@mui/material';
import { Add } from '@mui/icons-material';

export const SurveyList: React.FC = () => {
  const surveys = [
    { id: 1, title: 'Employee Satisfaction Q3', status: 'active', responses: 45 },
    { id: 2, title: 'Onboarding Feedback', status: 'closed', responses: 120 },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Surveys</Typography>
        <Button variant="contained" startIcon={<Add />}>Create Survey</Button>
      </Box>
      <Grid container spacing={2}>
        {surveys.map((survey) => (
          <Grid item xs={12} md={6} key={survey.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{survey.title}</Typography>
                <Box sx={{ mt: 2 }}>
                  <Chip label={survey.status} size="small" color={survey.status === 'active' ? 'success' : 'default'} />
                  <Typography variant="body2" sx={{ mt: 1 }}>Responses: {survey.responses}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};
