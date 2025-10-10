import React from 'react';
import { Container, Typography, Grid, Card, CardContent, Button, Box } from '@mui/material';

export const WorkflowTemplates: React.FC = () => {
  const templates = [
    { id: 1, name: 'Leave Approval', description: 'Multi-level leave approval workflow' },
    { id: 2, name: 'Expense Approval', description: 'Expense claim approval process' },
    { id: 3, name: 'Recruitment', description: 'Candidate hiring workflow' },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Workflow Templates</Typography>
      <Grid container spacing={2}>
        {templates.map((template) => (
          <Grid item xs={12} md={4} key={template.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{template.name}</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ my: 2 }}>
                  {template.description}
                </Typography>
                <Button variant="outlined">Use Template</Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};
