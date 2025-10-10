import React from 'react';
import { Container, Typography, Paper, Box, Button, TextField, Grid, MenuItem } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

export const DocumentUpload: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Upload Document</Typography>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{ border: '2px dashed #ccc', borderRadius: 2, p: 4, textAlign: 'center' }}>
              <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>Drag and drop files here</Typography>
              <Typography color="textSecondary" sx={{ mb: 2 }}>or</Typography>
              <Button variant="contained">Browse Files</Button>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Document Name" />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Category" select>
              <MenuItem value="policies">Policies</MenuItem>
              <MenuItem value="forms">Forms</MenuItem>
              <MenuItem value="manuals">Manuals</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Access Level" select>
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="employees">Employees Only</MenuItem>
              <MenuItem value="managers">Managers Only</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Description" multiline rows={3} />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button>Cancel</Button>
              <Button variant="contained">Upload</Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};
