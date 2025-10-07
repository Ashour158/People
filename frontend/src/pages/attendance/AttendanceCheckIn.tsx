import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
} from '@mui/material';
import { attendanceApi } from '../../api';
import toast from 'react-hot-toast';

export const AttendanceCheckIn: React.FC = () => {
  const queryClient = useQueryClient();

  const checkInMutation = useMutation({
    mutationFn: attendanceApi.checkIn,
    onSuccess: () => {
      toast.success('Checked in successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Check-in failed');
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: attendanceApi.checkOut,
    onSuccess: () => {
      toast.success('Checked out successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Check-out failed');
    },
  });

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Attendance
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Mark your attendance for today
        </Typography>

        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={() => checkInMutation.mutate({})}
            disabled={checkInMutation.isPending}
          >
            {checkInMutation.isPending ? 'Checking In...' : 'Check In'}
          </Button>

          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={() => checkOutMutation.mutate({})}
            disabled={checkOutMutation.isPending}
          >
            {checkOutMutation.isPending ? 'Checking Out...' : 'Check Out'}
          </Button>
        </Box>

        {(checkInMutation.isSuccess || checkOutMutation.isSuccess) && (
          <Alert severity="success" sx={{ mt: 3 }}>
            Attendance recorded successfully at{' '}
            {new Date().toLocaleTimeString()}
          </Alert>
        )}
      </Paper>
    </Container>
  );
};
