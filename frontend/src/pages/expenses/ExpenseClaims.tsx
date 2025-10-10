import React from 'react';
import { Container, Typography, Paper, Box, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import { Add } from '@mui/icons-material';

export const ExpenseClaims: React.FC = () => {
  const claims = [
    { id: 1, title: 'Client Dinner', amount: 150, status: 'pending', date: '2025-10-08' },
    { id: 2, title: 'Travel Expense', amount: 450, status: 'approved', date: '2025-10-05' },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Expense Claims</Typography>
        <Button variant="contained" startIcon={<Add />}>New Claim</Button>
      </Box>
      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {claims.map((claim) => (
              <TableRow key={claim.id}>
                <TableCell>{claim.title}</TableCell>
                <TableCell>${claim.amount}</TableCell>
                <TableCell>{claim.date}</TableCell>
                <TableCell>
                  <Chip label={claim.status} color={claim.status === 'approved' ? 'success' : 'warning'} size="small" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
};
