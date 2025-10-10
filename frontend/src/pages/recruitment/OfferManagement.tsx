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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stepper,
  Step,
  StepLabel,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import { Add as AddIcon, Description as DescriptionIcon } from '@mui/icons-material';

interface Offer {
  offer_id: string;
  candidate_name: string;
  job_title: string;
  salary: number;
  currency: string;
  start_date: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  sent_date?: string;
  response_date?: string;
}

export const OfferManagement: React.FC = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const steps = ['Offer Details', 'Compensation', 'Benefits', 'Review & Send'];

  const { data: offers, isLoading } = useQuery<Offer[]>({
    queryKey: ['offers'],
    queryFn: async () => {
      return [
        {
          offer_id: '1',
          candidate_name: 'Alice Johnson',
          job_title: 'Senior Software Engineer',
          salary: 120000,
          currency: 'USD',
          start_date: '2025-11-01',
          status: 'sent',
          sent_date: '2025-10-08',
        },
        {
          offer_id: '2',
          candidate_name: 'Carol White',
          job_title: 'Senior Software Engineer',
          salary: 125000,
          currency: 'USD',
          start_date: '2025-11-15',
          status: 'accepted',
          sent_date: '2025-10-05',
          response_date: '2025-10-07',
        },
        {
          offer_id: '3',
          candidate_name: 'David Brown',
          job_title: 'Product Manager',
          salary: 130000,
          currency: 'USD',
          start_date: '2025-12-01',
          status: 'draft',
        },
      ];
    },
  });

  const getStatusColor = (status: Offer['status']) => {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'sent':
        return 'primary';
      case 'draft':
        return 'default';
      case 'rejected':
        return 'error';
      case 'expired':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Candidate" select required>
                <MenuItem value="1">Alice Johnson</MenuItem>
                <MenuItem value="2">Bob Smith</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Job Title" required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Department" required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Employment Type" select required>
                <MenuItem value="full-time">Full-time</MenuItem>
                <MenuItem value="part-time">Part-time</MenuItem>
                <MenuItem value="contract">Contract</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Base Salary" type="number" required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Currency" select required defaultValue="USD">
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Bonus Target (%)" type="number" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Equity (shares)" type="number" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Sign-on Bonus" type="number" />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Health & Wellness
              </Typography>
              <TextField fullWidth label="Health Insurance" defaultValue="Premium Plan" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Vacation Days" type="number" defaultValue={20} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Sick Days" type="number" defaultValue={10} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Additional Benefits
              </Typography>
              <TextField fullWidth label="Remote Work Policy" multiline rows={2} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Other Benefits" multiline rows={3} />
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Offer Summary
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 2 }}>
              Please review the offer details before sending
            </Typography>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2">Position Details</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Senior Software Engineer - Engineering Department
                </Typography>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Compensation
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Base Salary: $120,000 USD
                  <br />
                  Bonus Target: 10%
                  <br />
                  Equity: 1,000 shares
                </Typography>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  Start Date
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  November 1, 2025
                </Typography>
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Offer Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
          Create Offer
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Offers
              </Typography>
              <Typography variant="h4">{offers?.length || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Accepted
              </Typography>
              <Typography variant="h4">
                {offers?.filter((o) => o.status === 'accepted').length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending
              </Typography>
              <Typography variant="h4">
                {offers?.filter((o) => o.status === 'sent').length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Acceptance Rate
              </Typography>
              <Typography variant="h4">
                {offers?.length
                  ? Math.round(
                      (offers.filter((o) => o.status === 'accepted').length / offers.length) * 100
                    )
                  : 0}
                %
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Candidate</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>Salary</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Sent Date</TableCell>
                <TableCell>Response Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <LinearProgress />
                  </TableCell>
                </TableRow>
              ) : (
                offers?.map((offer) => (
                  <TableRow key={offer.offer_id}>
                    <TableCell>{offer.candidate_name}</TableCell>
                    <TableCell>{offer.job_title}</TableCell>
                    <TableCell>
                      {offer.currency} {offer.salary.toLocaleString()}
                    </TableCell>
                    <TableCell>{new Date(offer.start_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip label={offer.status} color={getStatusColor(offer.status)} size="small" />
                    </TableCell>
                    <TableCell>
                      {offer.sent_date ? new Date(offer.sent_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      {offer.response_date ? new Date(offer.response_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<DescriptionIcon />}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Offer Letter</DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ mt: 2, mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {renderStepContent()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Box sx={{ flex: 1 }} />
          <Button disabled={activeStep === 0} onClick={handleBack}>
            Back
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button variant="contained" onClick={() => setOpenDialog(false)}>
              Send Offer
            </Button>
          ) : (
            <Button variant="contained" onClick={handleNext}>
              Next
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};
