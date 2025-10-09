import React from 'react';
import { DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface BiometricIntegrationProps {
  onClose: () => void;
  type?: string;
}

const BiometricIntegration: React.FC<BiometricIntegrationProps> = ({ onClose, type }) => {
  return (
    <>
      <DialogTitle>BiometricIntegration</DialogTitle>
      <DialogContent>
        <Typography>BiometricIntegration configuration (implementation in progress)</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </>
  );
};

export default BiometricIntegration;
