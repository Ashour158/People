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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  LinearProgress,
} from '@mui/material';
import { Add as AddIcon, Event as EventIcon } from '@mui/icons-material';

interface Interview {
  interview_id: string;
  candidate_name: string;
  job_title: string;
  interviewer_name: string;
  interview_type: 'phone' | 'technical' | 'behavioral' | 'final';
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  location: string;
}

export const InterviewScheduling: React.FC = () => {
  const [openDialog, setOpenDialog] = useState(false);

  const { data: interviews, isLoading } = useQuery<Interview[]>({
    queryKey: ['interviews'],
    queryFn: async () => {
      return [
        {
          interview_id: '1',
          candidate_name: 'Alice Johnson',
          job_title: 'Senior Software Engineer',
          interviewer_name: 'John Manager',
          interview_type: 'technical',
          scheduled_date: '2025-10-15',
          scheduled_time: '10:00',
          duration: 60,
          status: 'scheduled',
          location: 'Video Call',
        },
        {
          interview_id: '2',
          candidate_name: 'Bob Smith',
          job_title: 'Product Manager',
          interviewer_name: 'Jane Director',
          interview_type: 'behavioral',
          scheduled_date: '2025-10-16',
          scheduled_time: '14:00',
          duration: 45,
          status: 'scheduled',
          location: 'Office - Room A',
        },
        {
          interview_id: '3',
          candidate_name: 'Carol White',
          job_title: 'Senior Software Engineer',
          interviewer_name: 'Bob CTO',
          interview_type: 'final',
          scheduled_date: '2025-10-14',
          scheduled_time: '15:00',
          duration: 30,
          status: 'completed',
          location: 'Video Call',
        },
      ];
    },
  });

  const getStatusColor = (status: Interview['status']) => {
    switch (status) {
      case 'scheduled':
        return 'primary';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type: Interview['interview_type']) => {
    switch (type) {
      case 'phone':
        return 'default';
      case 'technical':
        return 'primary';
      case 'behavioral':
        return 'secondary';
      case 'final':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Interview Scheduling</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
          Schedule Interview
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Interviews
              </Typography>
              <Typography variant="h4">{interviews?.length || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Scheduled
              </Typography>
              <Typography variant="h4">
                {interviews?.filter((i) => i.status === 'scheduled').length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4">
                {interviews?.filter((i) => i.status === 'completed').length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                This Week
              </Typography>
              <Typography variant="h4">
                {interviews?.filter((i) => {
                  const date = new Date(i.scheduled_date);
                  const now = new Date();
                  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                  return date >= now && date <= weekFromNow;
                }).length || 0}
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
                <TableCell>Interviewer</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Date & Time</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <LinearProgress />
                  </TableCell>
                </TableRow>
              ) : (
                interviews?.map((interview) => (
                  <TableRow key={interview.interview_id}>
                    <TableCell>{interview.candidate_name}</TableCell>
                    <TableCell>{interview.job_title}</TableCell>
                    <TableCell>{interview.interviewer_name}</TableCell>
                    <TableCell>
                      <Chip
                        label={interview.interview_type}
                        color={getTypeColor(interview.interview_type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <EventIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {new Date(interview.scheduled_date).toLocaleDateString()} at{' '}
                          {interview.scheduled_time}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{interview.duration} min</TableCell>
                    <TableCell>{interview.location}</TableCell>
                    <TableCell>
                      <Chip
                        label={interview.status}
                        color={getStatusColor(interview.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="small">View</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Schedule Interview</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Candidate" select required>
                <MenuItem value="1">Alice Johnson</MenuItem>
                <MenuItem value="2">Bob Smith</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Interviewer" select required>
                <MenuItem value="1">John Manager</MenuItem>
                <MenuItem value="2">Jane Director</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Interview Type" select required>
                <MenuItem value="phone">Phone Screen</MenuItem>
                <MenuItem value="technical">Technical</MenuItem>
                <MenuItem value="behavioral">Behavioral</MenuItem>
                <MenuItem value="final">Final Round</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Date" type="date" InputLabelProps={{ shrink: true }} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Time" type="time" InputLabelProps={{ shrink: true }} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Duration (minutes)" type="number" defaultValue={60} required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Location" required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Notes" multiline rows={3} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>
            Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
