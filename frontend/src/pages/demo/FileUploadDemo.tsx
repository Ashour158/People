import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Button,
  Divider,
  Alert,
} from '@mui/material';
import { FileUpload } from '../../components/common/FileUpload';
import toast from 'react-hot-toast';

export const FileUploadDemo: React.FC = () => {
  const [profilePicture, setProfilePicture] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [images, setImages] = useState<File[]>([]);

  const handleProfilePictureChange = (files: File[]) => {
    setProfilePicture(files);
    if (files.length > 0) {
      toast.success('Profile picture selected');
    }
  };

  const handleDocumentsChange = (files: File[]) => {
    setDocuments(files);
    if (files.length > 0) {
      toast.success(`${files.length} document(s) selected`);
    }
  };

  const handleImagesChange = (files: File[]) => {
    setImages(files);
    if (files.length > 0) {
      toast.success(`${files.length} image(s) selected`);
    }
  };

  const handleUploadProfilePicture = () => {
    if (profilePicture.length === 0) {
      toast.error('Please select a profile picture');
      return;
    }
    // Here you would implement the actual upload logic
    toast.success('Profile picture uploaded successfully!');
  };

  const handleUploadDocuments = () => {
    if (documents.length === 0) {
      toast.error('Please select documents to upload');
      return;
    }
    // Here you would implement the actual upload logic
    toast.success(`${documents.length} document(s) uploaded successfully!`);
  };

  const handleUploadImages = () => {
    if (images.length === 0) {
      toast.error('Please select images to upload');
      return;
    }
    // Here you would implement the actual upload logic
    toast.success(`${images.length} image(s) uploaded successfully!`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        File Upload with Drag & Drop
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Drag and drop files or click to browse. Supports file validation, preview, and multiple file uploads.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Features:</strong> Drag & drop zone, file validation, size limits, 
          preview with thumbnails, multiple file support, and file removal.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Single Image Upload - Profile Picture */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Profile Picture Upload
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Single image upload with 5MB limit
            </Typography>
            <FileUpload
              accept="image/*"
              maxSize={5 * 1024 * 1024} // 5MB
              multiple={false}
              onChange={handleProfilePictureChange}
              label="Drop your profile picture here"
              showPreview={true}
            />
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleUploadProfilePicture}
                disabled={profilePicture.length === 0}
              >
                Upload Profile Picture
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Multiple Document Upload */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Document Upload
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Multiple documents (up to 5 files, 10MB each)
            </Typography>
            <FileUpload
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              maxSize={10 * 1024 * 1024} // 10MB
              multiple={true}
              maxFiles={5}
              onChange={handleDocumentsChange}
              label="Drop documents here or click to browse"
              showPreview={true}
            />
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleUploadDocuments}
                disabled={documents.length === 0}
              >
                Upload Documents ({documents.length})
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Multiple Image Upload */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Multiple Image Upload
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Upload multiple images (up to 10 files, 5MB each)
            </Typography>
            <FileUpload
              accept="image/jpeg,image/png,image/gif,image/webp"
              maxSize={5 * 1024 * 1024} // 5MB
              multiple={true}
              maxFiles={10}
              onChange={handleImagesChange}
              label="Drop images here or click to browse"
              showPreview={true}
            />
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleUploadImages}
                disabled={images.length === 0}
              >
                Upload Images ({images.length})
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Usage Example */}
      <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          Usage Example
        </Typography>
        <Box
          component="pre"
          sx={{
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
            overflow: 'auto',
            fontSize: '0.875rem',
          }}
        >
          {`import { FileUpload } from '../../components/common/FileUpload';

// Single file upload
<FileUpload
  accept="image/*"
  maxSize={5 * 1024 * 1024}
  multiple={false}
  onChange={(files) => console.log(files)}
/>

// Multiple file upload
<FileUpload
  accept=".pdf,.doc,.docx"
  maxSize={10 * 1024 * 1024}
  multiple={true}
  maxFiles={5}
  onChange={(files) => console.log(files)}
  label="Drop documents here"
/>`}
        </Box>
      </Paper>
    </Container>
  );
};
