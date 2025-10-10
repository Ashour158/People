import React from 'react';
import { Container, Typography, Paper, Box, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import { Add, Folder, InsertDriveFile } from '@mui/icons-material';

export const DocumentLibrary: React.FC = () => {
  const documents = [
    { id: 1, name: 'Employee Handbook.pdf', type: 'file', size: '2.5 MB', modified: '2025-10-05' },
    { id: 2, name: 'HR Policies', type: 'folder', items: 12, modified: '2025-10-08' },
    { id: 3, name: 'Onboarding Checklist.docx', type: 'file', size: '156 KB', modified: '2025-10-07' },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Document Library</Typography>
        <Box>
          <Button variant="outlined" sx={{ mr: 1 }}>New Folder</Button>
          <Button variant="contained" startIcon={<Add />}>Upload</Button>
        </Box>
      </Box>
      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Size/Items</TableCell>
              <TableCell>Modified</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {doc.type === 'folder' ? <Folder sx={{ mr: 1 }} /> : <InsertDriveFile sx={{ mr: 1 }} />}
                    {doc.name}
                  </Box>
                </TableCell>
                <TableCell><Chip label={doc.type} size="small" /></TableCell>
                <TableCell>{doc.type === 'folder' ? `${doc.items} items` : doc.size}</TableCell>
                <TableCell>{doc.modified}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
};
