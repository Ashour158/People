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
import { Add as AddIcon, Work as WorkIcon } from '@mui/icons-material';

interface JobPosting {
  job_id: string;
  title: string;
  department: string;
  location: string;
  employment_type: 'full-time' | 'part-time' | 'contract';
  status: 'draft' | 'active' | 'closed';
  applications_count: number;
  posted_date: string;
  closing_date: string;
}

export const JobPostings: React.FC = () => {
  const [openDialog, setOpenDialog] = useState(false);

  const { data: jobs, isLoading } = useQuery<JobPosting[]>({
    queryKey: ['job-postings'],
    queryFn: async () => {
      return [
        {
          job_id: '1',
          title: 'Senior Software Engineer',
          department: 'Engineering',
          location: 'Remote',
          employment_type: 'full-time',
          status: 'active',
          applications_count: 45,
          posted_date: '2025-09-15',
          closing_date: '2025-11-15',
        },
        {
          job_id: '2',
          title: 'Product Manager',
          department: 'Product',
          location: 'New York',
          employment_type: 'full-time',
          status: 'active',
          applications_count: 28,
          posted_date: '2025-09-20',
          closing_date: '2025-11-20',
        },
        {
          job_id: '3',
          title: 'Marketing Specialist',
          department: 'Marketing',
          location: 'San Francisco',
          employment_type: 'full-time',
          status: 'draft',
          applications_count: 0,
          posted_date: '2025-10-01',
          closing_date: '2025-12-01',
        },
      ];
    },
  });

  const getStatusColor = (status: JobPosting['status']) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'draft':
        return 'default';
      case 'closed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Job Postings</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
          Create Job
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Jobs
              </Typography>
              <Typography variant="h4">{jobs?.length || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Jobs
              </Typography>
              <Typography variant="h4">
                {jobs?.filter((j) => j.status === 'active').length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Applications
              </Typography>
              <Typography variant="h4">
                {jobs?.reduce((acc, j) => acc + j.applications_count, 0) || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Applications
              </Typography>
              <Typography variant="h4">
                {jobs?.length
                  ? Math.round(
                      jobs.reduce((acc, j) => acc + j.applications_count, 0) / jobs.length
                    )
                  : 0}
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
                <TableCell>Job Title</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Applications</TableCell>
                <TableCell>Posted Date</TableCell>
                <TableCell>Closing Date</TableCell>
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
                jobs?.map((job) => (
                  <TableRow key={job.job_id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WorkIcon color="action" />
                        <Typography>{job.title}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{job.department}</TableCell>
                    <TableCell>{job.location}</TableCell>
                    <TableCell>
                      <Chip label={job.employment_type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip label={job.status} color={getStatusColor(job.status)} size="small" />
                    </TableCell>
                    <TableCell>{job.applications_count}</TableCell>
                    <TableCell>{new Date(job.posted_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(job.closing_date).toLocaleDateString()}</TableCell>
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
        <DialogTitle>Create New Job Posting</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Job Title" required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Department" select required>
                <MenuItem value="engineering">Engineering</MenuItem>
                <MenuItem value="product">Product</MenuItem>
                <MenuItem value="marketing">Marketing</MenuItem>
                <MenuItem value="sales">Sales</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Location" required />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Employment Type" select required>
                <MenuItem value="full-time">Full-time</MenuItem>
                <MenuItem value="part-time">Part-time</MenuItem>
                <MenuItem value="contract">Contract</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Experience Level" select>
                <MenuItem value="entry">Entry Level</MenuItem>
                <MenuItem value="mid">Mid Level</MenuItem>
                <MenuItem value="senior">Senior</MenuItem>
                <MenuItem value="lead">Lead</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Job Description" multiline rows={4} required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Requirements" multiline rows={3} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>
            Create Job
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
