import React from 'react';
import { Container, Typography, Paper, Box, Button, List, ListItem, ListItemText, Chip } from '@mui/material';
import { Add } from '@mui/icons-material';

export const ExpenseCategories: React.FC = () => {
  const categories = [
    { id: 1, name: 'Travel', limit: 5000, used: 3200 },
    { id: 2, name: 'Meals', limit: 1000, used: 450 },
    { id: 3, name: 'Office Supplies', limit: 500, used: 320 },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Expense Categories</Typography>
        <Button variant="contained" startIcon={<Add />}>Add Category</Button>
      </Box>
      <Paper sx={{ p: 2 }}>
        <List>
          {categories.map((cat) => (
            <ListItem key={cat.id}>
              <ListItemText primary={cat.name} secondary={`$${cat.used} / $${cat.limit}`} />
              <Chip label={`${Math.round((cat.used / cat.limit) * 100)}%`} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
};
