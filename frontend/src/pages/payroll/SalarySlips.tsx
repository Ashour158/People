import React from 'react';
import { Container, Typography, Paper, Box, Table, TableHead, TableRow, TableCell, TableBody, Button, Grid, Card, CardContent } from '@mui/material';
import { Download } from '@mui/icons-material';

export const SalarySlips: React.FC = () => {
  const slips = [
    { month: 'September 2025', gross: 5000, net: 4200, status: 'Paid' },
    { month: 'August 2025', gross: 5000, net: 4200, status: 'Paid' },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Salary Slips</Typography>
      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Month</TableCell>
              <TableCell>Gross Pay</TableCell>
              <TableCell>Net Pay</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {slips.map((slip) => (
              <TableRow key={slip.month}>
                <TableCell>{slip.month}</TableCell>
                <TableCell>${slip.gross}</TableCell>
                <TableCell>${slip.net}</TableCell>
                <TableCell>{slip.status}</TableCell>
                <TableCell>
                  <Button size="small" startIcon={<Download />}>Download</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
};
