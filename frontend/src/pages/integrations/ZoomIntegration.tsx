/**
 * Zoom Integration Component - Placeholder
 */
import React from 'react';
import { DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface ZoomIntegrationProps {
  onClose: () => void;
}

const ZoomIntegration: React.FC<ZoomIntegrationProps> = ({ onClose }) => {
  return (
    <>
      <DialogTitle>📹 Zoom Integration</DialogTitle>
      <DialogContent>
        <Typography>Zoom integration configuration (implementation in progress)</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </>
  );
};

export default ZoomIntegration;
