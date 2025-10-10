import React from 'react';
import { Container, Typography, Paper, Box, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import { Add } from '@mui/icons-material';

export const TicketList: React.FC = () => {
  const tickets = [
    { id: 'T-001', title: 'Password Reset', status: 'open', priority: 'high', created: '2025-10-10' },
    { id: 'T-002', title: 'Laptop Issue', status: 'in_progress', priority: 'medium', created: '2025-10-09' },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Support Tickets</Typography>
        <Button variant="contained" startIcon={<Add />}>New Ticket</Button>
      </Box>
      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>{ticket.id}</TableCell>
                <TableCell>{ticket.title}</TableCell>
                <TableCell><Chip label={ticket.status} size="small" /></TableCell>
                <TableCell><Chip label={ticket.priority} color={ticket.priority === 'high' ? 'error' : 'default'} size="small" /></TableCell>
                <TableCell>{ticket.created}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
};
