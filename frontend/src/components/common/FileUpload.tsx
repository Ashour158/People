import React, { useCallback, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Alert,
  Stack,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { formatFileSize } from '../../utils/helpers';

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

interface FileUploadProps {
  /**
   * Accepted file types (e.g., "image/*", ".pdf,.doc")
   */
  accept?: string;
  /**
   * Maximum file size in bytes
   */
  maxSize?: number;
  /**
   * Allow multiple files
   */
  multiple?: boolean;
  /**
   * Maximum number of files (only applies when multiple is true)
   */
  maxFiles?: number;
  /**
   * Callback when files are selected
   */
  onChange?: (files: File[]) => void;
  /**
   * Callback when files are removed
   */
  onRemove?: (fileId: string) => void;
  /**
   * Show file preview
   */
  showPreview?: boolean;
  /**
   * Custom label text
   */
  label?: string;
  /**
   * Disabled state
   */
  disabled?: boolean;
  /**
   * Error message
   */
  error?: string;
  /**
   * Initial files
   */
  initialFiles?: File[];
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept = '*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  maxFiles = 5,
  onChange,
  onRemove,
  showPreview = true,
  label = 'Drag and drop files here or click to browse',
  disabled = false,
  error,
  initialFiles = [],
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>(() => 
    initialFiles.map(file => ({
      ...file,
      id: Math.random().toString(36).substring(7),
    }))
  );
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Generate unique ID for each file
  const generateFileId = () => Math.random().toString(36).substring(7);

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File "${file.name}" is too large. Maximum size is ${formatFileSize(maxSize)}`;
    }

    // Check file type if accept is specified
    if (accept !== '*') {
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const fileMimeType = file.type;

      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExtension === type.toLowerCase();
        }
        if (type.endsWith('/*')) {
          const category = type.split('/')[0];
          return fileMimeType.startsWith(category);
        }
        return fileMimeType === type;
      });

      if (!isAccepted) {
        return `File type not accepted. Accepted types: ${accept}`;
      }
    }

    return null;
  };

  // Create file preview URL for images
  const createPreview = (file: File): string | undefined => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return undefined;
  };

  // Process and add files
  const processFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setValidationError(null);
      const fileArray = Array.from(newFiles);

      // Check max files limit
      if (multiple && files.length + fileArray.length > maxFiles) {
        setValidationError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Validate each file
      const validatedFiles: FileWithPreview[] = [];
      for (const file of fileArray) {
        const error = validateFile(file);
        if (error) {
          setValidationError(error);
          return;
        }
        validatedFiles.push({
          ...file,
          id: generateFileId(),
          preview: createPreview(file),
        } as FileWithPreview);
      }

      // Update files state
      const updatedFiles = multiple
        ? [...files, ...validatedFiles]
        : validatedFiles;
      
      setFiles(updatedFiles);
      
      // Call onChange callback
      if (onChange) {
        onChange(updatedFiles);
      }
    },
    [files, multiple, maxFiles, maxSize, accept, onChange]
  );

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  // Handle file removal
  const handleRemoveFile = (fileId: string) => {
    const fileToRemove = files.find(f => f.id === fileId);
    
    // Revoke preview URL to prevent memory leaks
    if (fileToRemove?.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }

    const updatedFiles = files.filter(f => f.id !== fileId);
    setFiles(updatedFiles);
    setValidationError(null);

    if (onChange) {
      onChange(updatedFiles);
    }

    if (onRemove) {
      onRemove(fileId);
    }
  };

  // Handle click to browse
  const handleBrowseClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Cleanup preview URLs on unmount
  React.useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, []);

  // Get file icon
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon />;
    }
    return <FileIcon />;
  };

  const displayError = error || validationError;

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      <Paper
        elevation={isDragging ? 8 : 1}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        sx={{
          p: 3,
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          border: '2px dashed',
          borderColor: displayError
            ? 'error.main'
            : isDragging
            ? 'primary.main'
            : 'grey.300',
          bgcolor: isDragging
            ? 'action.hover'
            : disabled
            ? 'action.disabledBackground'
            : 'background.paper',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: disabled ? 'grey.300' : 'primary.main',
            bgcolor: disabled ? 'action.disabledBackground' : 'action.hover',
          },
        }}
      >
        <CloudUploadIcon
          sx={{
            fontSize: 48,
            color: displayError
              ? 'error.main'
              : isDragging
              ? 'primary.main'
              : 'text.secondary',
            mb: 2,
          }}
        />
        <Typography variant="body1" gutterBottom>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {multiple
            ? `Maximum ${maxFiles} files, up to ${formatFileSize(maxSize)} each`
            : `Maximum ${formatFileSize(maxSize)}`}
        </Typography>
        {accept !== '*' && (
          <Typography variant="caption" color="text.secondary" display="block">
            Accepted: {accept}
          </Typography>
        )}
      </Paper>

      {displayError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {displayError}
        </Alert>
      )}

      {showPreview && files.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected Files ({files.length})
          </Typography>
          <Stack spacing={1}>
            {files.map((file) => (
              <Paper key={file.id} variant="outlined" sx={{ p: 2 }}>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box display="flex" alignItems="center" gap={2} flex={1}>
                    {file.preview ? (
                      <Box
                        component="img"
                        src={file.preview}
                        alt={file.name}
                        sx={{
                          width: 48,
                          height: 48,
                          objectFit: 'cover',
                          borderRadius: 1,
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'action.hover',
                          borderRadius: 1,
                        }}
                      >
                        {getFileIcon(file)}
                      </Box>
                    )}
                    <Box flex={1}>
                      <Typography variant="body2" noWrap>
                        {file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(file.size)}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(file.id);
                    }}
                    disabled={disabled}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};
