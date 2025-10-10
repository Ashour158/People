import React from 'react';
import { Container, Typography, Paper, Box, TextField, Button, Grid } from '@mui/material';

export const CompanySettings: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Company Settings</Typography>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Company Name" defaultValue="Acme Corporation" />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Industry" defaultValue="Technology" />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Company Size" defaultValue="250 employees" />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Founded Year" type="number" defaultValue={2010} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Address" multiline rows={2} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Phone" />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Email" type="email" />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button>Cancel</Button>
              <Button variant="contained">Save Changes</Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};
