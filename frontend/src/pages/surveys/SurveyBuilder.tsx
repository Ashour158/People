import React from 'react';
import { Container, Typography, Paper, Box, Button, TextField } from '@mui/material';
import { Add } from '@mui/icons-material';

export const SurveyBuilder: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Survey Builder</Typography>
        <Button variant="contained" startIcon={<Add />}>Add Question</Button>
      </Box>
      <Paper sx={{ p: 3 }}>
        <TextField fullWidth label="Survey Title" sx={{ mb: 2 }} />
        <TextField fullWidth label="Survey Description" multiline rows={3} />
      </Paper>
    </Container>
  );
};
