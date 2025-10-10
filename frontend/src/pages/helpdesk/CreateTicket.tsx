import React from 'react';
import { Container, Typography, Paper, TextField, Button, Box, Grid, MenuItem } from '@mui/material';

export const CreateTicket: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Create Support Ticket</Typography>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth label="Subject" required />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Category" select required>
              <MenuItem value="technical">Technical</MenuItem>
              <MenuItem value="hr">HR</MenuItem>
              <MenuItem value="it">IT</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Priority" select required>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Description" multiline rows={6} required />
          </Grid>
          <Grid item xs={12}>
            <Button variant="outlined">Attach Files</Button>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button>Cancel</Button>
              <Button variant="contained">Submit Ticket</Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};
