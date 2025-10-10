import React from 'react';
import { Container, Typography, Paper, Grid, Card, CardContent } from '@mui/material';

export const ExpenseReports: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Expense Reports</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Total This Month</Typography>
              <Typography variant="h4">$12,450</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Pending Approval</Typography>
              <Typography variant="h4">$2,300</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Approved</Typography>
              <Typography variant="h4">$10,150</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Total Claims</Typography>
              <Typography variant="h4">45</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};
