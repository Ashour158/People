import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Box,
  Alert,
} from '@mui/material';
import { leaveApi } from '../../api';
import toast from 'react-hot-toast';
import type { LeaveFormData, LeaveType } from '../../types';
import { getErrorMessage } from '../../utils';

interface FormData extends LeaveFormData {
  contact_details?: string;
  is_half_day?: boolean;
  from_date?: string;
  to_date?: string;
}

export const LeaveApply: React.FC = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<FormData>({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    leave_reason: '',
    is_half_day: false,
    from_date: '',
    to_date: '',
    contact_details: '',
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: () => leaveApi.getTypes(),
  });

  const applyMutation = useMutation({
    mutationFn: leaveApi.apply,
    onSuccess: () => {
      toast.success('Leave application submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      setFormData({
        leave_type_id: '',
        start_date: '',
        end_date: '',
        leave_reason: '',
        is_half_day: false,
        from_date: '',
        to_date: '',
        contact_details: '',
      });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Failed to apply leave');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: LeaveFormData = {
      leave_type_id: formData.leave_type_id,
      start_date: formData.from_date || formData.start_date,
      end_date: formData.to_date || formData.end_date,
      leave_reason: formData.leave_reason,
    };
    applyMutation.mutate(submitData);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Apply for Leave
        </Typography>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Leave Type"
                value={formData.leave_type_id}
                onChange={(e) =>
                  setFormData({ ...formData, leave_type_id: e.target.value })
                }
                required
              >
                {(leaveTypes?.data || []).map((type: LeaveType) => (
                  <MenuItem key={type.leave_type_id} value={type.leave_type_id}>
                    {type.leave_type_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="From Date"
                value={formData.from_date}
                onChange={(e) =>
                  setFormData({ ...formData, from_date: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="To Date"
                value={formData.to_date}
                onChange={(e) =>
                  setFormData({ ...formData, to_date: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Reason"
                value={formData.leave_reason}
                onChange={(e) =>
                  setFormData({ ...formData, leave_reason: e.target.value })
                }
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Contact Details"
                value={formData.contact_details}
                onChange={(e) =>
                  setFormData({ ...formData, contact_details: e.target.value })
                }
              />
            </Grid>
          </Grid>

          {applyMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {getErrorMessage(applyMutation.error) || 'Failed to apply leave'}
            </Alert>
          )}

          <Box sx={{ mt: 3 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={applyMutation.isPending}
            >
              {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};
