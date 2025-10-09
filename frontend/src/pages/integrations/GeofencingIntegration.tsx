import React from 'react';
import { DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface GeofencingIntegrationProps {
  onClose: () => void;
  type?: string;
}

const GeofencingIntegration: React.FC<GeofencingIntegrationProps> = ({ onClose, type }) => {
  return (
    <>
      <DialogTitle>GeofencingIntegration</DialogTitle>
      <DialogContent>
        <Typography>GeofencingIntegration configuration (implementation in progress)</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </>
  );
};

export default GeofencingIntegration;
