import React from 'react';
import { DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface HolidayCalendarIntegrationProps {
  onClose: () => void;
  type?: string;
}

const HolidayCalendarIntegration: React.FC<HolidayCalendarIntegrationProps> = ({ onClose, type: _type }) => {
  return (
    <>
      <DialogTitle>HolidayCalendarIntegration</DialogTitle>
      <DialogContent>
        <Typography>HolidayCalendarIntegration configuration (implementation in progress)</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </>
  );
};

export default HolidayCalendarIntegration;
