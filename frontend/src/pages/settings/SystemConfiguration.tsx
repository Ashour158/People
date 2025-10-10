import React from 'react';
import { Container, Typography, Paper, Grid, Card, CardContent, Switch, FormControlLabel, Box } from '@mui/material';

export const SystemConfiguration: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>System Configuration</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>General Settings</Typography>
              <FormControlLabel control={<Switch defaultChecked />} label="Enable Email Notifications" />
              <FormControlLabel control={<Switch />} label="Enable SMS Notifications" />
              <FormControlLabel control={<Switch defaultChecked />} label="Two-Factor Authentication" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Feature Flags</Typography>
              <FormControlLabel control={<Switch defaultChecked />} label="Enable Performance Module" />
              <FormControlLabel control={<Switch defaultChecked />} label="Enable Recruitment Module" />
              <FormControlLabel control={<Switch />} label="Enable Payroll Module" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Attendance Settings</Typography>
              <FormControlLabel control={<Switch defaultChecked />} label="GPS Location Tracking" />
              <FormControlLabel control={<Switch defaultChecked />} label="Geofencing" />
              <FormControlLabel control={<Switch />} label="Biometric Check-in" />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Leave Settings</Typography>
              <FormControlLabel control={<Switch defaultChecked />} label="Auto-approve Leave" />
              <FormControlLabel control={<Switch />} label="Carry Forward" />
              <FormControlLabel control={<Switch defaultChecked />} label="Negative Balance" />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};
