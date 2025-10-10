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
  Rating,
  LinearProgress,
} from '@mui/material';
import { Add as AddIcon, Visibility as ViewIcon } from '@mui/icons-material';

interface PerformanceReview {
  review_id: string;
  employee_name: string;
  reviewer_name: string;
  period: string;
  overall_rating: number;
  status: 'draft' | 'submitted' | 'completed' | 'pending_approval';
  review_date: string;
  categories: {
    name: string;
    rating: number;
  }[];
}

export const PerformanceReviews: React.FC = () => {
  const { data: reviews, isLoading } = useQuery<PerformanceReview[]>({
    queryKey: ['performance-reviews'],
    queryFn: async () => {
      // Mock data
      return [
        {
          review_id: '1',
          employee_name: 'John Doe',
          reviewer_name: 'Jane Manager',
          period: 'Q3 2025',
          overall_rating: 4.5,
          status: 'completed',
          review_date: '2025-09-30',
          categories: [
            { name: 'Technical Skills', rating: 5 },
            { name: 'Communication', rating: 4 },
            { name: 'Leadership', rating: 4.5 },
          ],
        },
        {
          review_id: '2',
          employee_name: 'Jane Smith',
          reviewer_name: 'Bob Director',
          period: 'Q3 2025',
          overall_rating: 4.0,
          status: 'pending_approval',
          review_date: '2025-09-28',
          categories: [
            { name: 'Technical Skills', rating: 4 },
            { name: 'Communication', rating: 4.5 },
            { name: 'Leadership', rating: 3.5 },
          ],
        },
      ];
    },
  });

  const getStatusColor = (status: PerformanceReview['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'submitted':
        return 'info';
      case 'pending_approval':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Performance Reviews</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          New Review
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Reviews
              </Typography>
              <Typography variant="h4">{reviews?.length || 0}</Typography>
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
                {reviews?.filter((r) => r.status === 'completed').length || 0}
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
                {reviews?.filter((r) => r.status === 'pending_approval').length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Rating
              </Typography>
              <Typography variant="h4">
                {reviews?.length
                  ? (
                      reviews.reduce((acc, r) => acc + r.overall_rating, 0) / reviews.length
                    ).toFixed(1)
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
                <TableCell>Employee</TableCell>
                <TableCell>Reviewer</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Rating</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Review Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <LinearProgress />
                  </TableCell>
                </TableRow>
              ) : (
                reviews?.map((review) => (
                  <TableRow key={review.review_id}>
                    <TableCell>{review.employee_name}</TableCell>
                    <TableCell>{review.reviewer_name}</TableCell>
                    <TableCell>{review.period}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Rating value={review.overall_rating} precision={0.5} readOnly size="small" />
                        <Typography variant="body2">{review.overall_rating}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={review.status} color={getStatusColor(review.status)} size="small" />
                    </TableCell>
                    <TableCell>{new Date(review.review_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<ViewIcon />}>
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
    </Container>
  );
};
