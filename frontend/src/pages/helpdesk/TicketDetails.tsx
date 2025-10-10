import React from 'react';
import { Container, Typography, Paper, Box, Chip, Divider, TextField, Button } from '@mui/material';

export const TicketDetails: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h4">Ticket #T-001</Typography>
          <Chip label="Open" color="primary" />
        </Box>
        <Typography variant="h6" gutterBottom>Password Reset</Typography>
        <Typography color="textSecondary" sx={{ mb: 3 }}>
          Created on Oct 10, 2025 by John Doe
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body1" sx={{ mb: 3 }}>
          I need to reset my password as I cannot log in to my account.
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="h6" sx={{ mb: 2 }}>Comments</Typography>
        <TextField fullWidth label="Add a comment" multiline rows={3} sx={{ mb: 2 }} />
        <Button variant="contained">Add Comment</Button>
      </Paper>
    </Container>
  );
};
