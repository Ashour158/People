import React from 'react';
import { Container, Typography, Paper, Box, Button, List, ListItem, ListItemText, Chip } from '@mui/material';
import { Add } from '@mui/icons-material';

export const RoleManagement: React.FC = () => {
  const roles = [
    { id: 1, name: 'Admin', users: 5, permissions: 50 },
    { id: 2, name: 'Manager', users: 15, permissions: 30 },
    { id: 3, name: 'Employee', users: 200, permissions: 15 },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Role Management</Typography>
        <Button variant="contained" startIcon={<Add />}>Create Role</Button>
      </Box>
      <Paper sx={{ p: 2 }}>
        <List>
          {roles.map((role) => (
            <ListItem key={role.id} secondaryAction={<Button>Edit</Button>}>
              <ListItemText 
                primary={role.name} 
                secondary={`${role.users} users • ${role.permissions} permissions`} 
              />
              <Chip label={`${role.users} users`} size="small" sx={{ mr: 1 }} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
};
