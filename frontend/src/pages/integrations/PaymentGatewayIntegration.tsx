import React from 'react';
import { DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

interface PaymentGatewayIntegrationProps {
  onClose: () => void;
  type?: string;
}

const PaymentGatewayIntegration: React.FC<PaymentGatewayIntegrationProps> = ({ onClose, type: _type }) => {
  return (
    <>
      <DialogTitle>PaymentGatewayIntegration</DialogTitle>
      <DialogContent>
        <Typography>PaymentGatewayIntegration configuration (implementation in progress)</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </>
  );
};

export default PaymentGatewayIntegration;
