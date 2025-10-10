import React from 'react';
import { Container, Typography, Paper, Box, Button } from '@mui/material';
import { Add } from '@mui/icons-material';

export const WorkflowDesigner: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Workflow Designer</Typography>
        <Button variant="contained" startIcon={<Add />}>Create Workflow</Button>
      </Box>
      <Paper sx={{ p: 3, minHeight: 400 }}>
        <Typography color="textSecondary">Drag and drop to design your workflow</Typography>
      </Paper>
    </Container>
  );
};
