import React from 'react';
import { Container, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button } from '@mui/material';
import { Check, Close } from '@mui/icons-material';

export const ExpenseApproval: React.FC = () => {
  const pending = [
    { id: 1, employee: 'John Doe', title: 'Travel', amount: 500, date: '2025-10-08' },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Expense Approvals</Typography>
      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pending.map((exp) => (
              <TableRow key={exp.id}>
                <TableCell>{exp.employee}</TableCell>
                <TableCell>{exp.title}</TableCell>
                <TableCell>${exp.amount}</TableCell>
                <TableCell>{exp.date}</TableCell>
                <TableCell>
                  <Button size="small" startIcon={<Check />} color="success">Approve</Button>
                  <Button size="small" startIcon={<Close />} color="error">Reject</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
};
