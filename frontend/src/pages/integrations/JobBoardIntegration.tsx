import React from 'react';
import { DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface JobBoardIntegrationProps {
  onClose: () => void;
  type?: string;
}

const JobBoardIntegration: React.FC<JobBoardIntegrationProps> = ({ onClose, type: _type }) => {
  return (
    <>
      <DialogTitle>JobBoardIntegration</DialogTitle>
      <DialogContent>
        <Typography>JobBoardIntegration configuration (implementation in progress)</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </>
  );
};

export default JobBoardIntegration;
