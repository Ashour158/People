import React from 'react';
import { Container, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';

export const ActiveWorkflows: React.FC = () => {
  const workflows = [
    { id: 1, name: 'Leave Approval', status: 'active', instances: 12 },
    { id: 2, name: 'Expense Approval', status: 'active', instances: 8 },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Active Workflows</Typography>
      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Workflow Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Running Instances</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workflows.map((wf) => (
              <TableRow key={wf.id}>
                <TableCell>{wf.name}</TableCell>
                <TableCell><Chip label={wf.status} color="success" size="small" /></TableCell>
                <TableCell>{wf.instances}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
};
