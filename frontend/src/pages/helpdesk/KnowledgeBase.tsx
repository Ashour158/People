import React from 'react';
import { Container, Typography, Paper, Box, TextField, Grid, Card, CardContent, Button, Chip } from '@mui/material';
import { Search, Article } from '@mui/icons-material';

export const KnowledgeBase: React.FC = () => {
  const articles = [
    { id: 1, title: 'How to Reset Password', category: 'Account', views: 1250 },
    { id: 2, title: 'VPN Setup Guide', category: 'IT', views: 850 },
    { id: 3, title: 'Leave Request Process', category: 'HR', views: 2100 },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Knowledge Base</Typography>
      <Box sx={{ mb: 3 }}>
        <TextField fullWidth label="Search articles..." InputProps={{ startAdornment: <Search /> }} />
      </Box>
      <Grid container spacing={2}>
        {articles.map((article) => (
          <Grid item xs={12} md={4} key={article.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Article color="action" sx={{ mr: 1 }} />
                  <Typography variant="h6">{article.title}</Typography>
                </Box>
                <Chip label={article.category} size="small" variant="outlined" sx={{ mr: 1 }} />
                <Typography variant="caption" color="textSecondary">{article.views} views</Typography>
                <Box sx={{ mt: 2 }}>
                  <Button size="small">Read More</Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};
