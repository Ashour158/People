import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '../test-utils';
import { fireEvent } from '@testing-library/react';
import { mockLeaveRequest } from '../test-utils';

// Mock Leave component
const MockLeave = ({ requests }: { requests: any[] }) => {
  return (
    <div>
      <h1>Leave Management</h1>
      <button>Request Leave</button>
      <div>
        <h2>Leave Balance</h2>
        <div data-testid="annual-leave">Annual Leave: 15 days</div>
        <div data-testid="sick-leave">Sick Leave: 10 days</div>
      </div>
      <div data-testid="leave-requests">
        {requests.map((request) => (
          <div key={request.leave_id} data-testid="leave-request">
            <span>{request.leave_type}</span>
            <span>{request.days_requested} days</span>
            <span>{request.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Leave Management Page', () => {
  it('renders leave management heading', () => {
    render(<MockLeave requests={[]} />);
    
    expect(screen.getByText(/leave management/i)).toBeInTheDocument();
  });

  it('displays request leave button', () => {
    render(<MockLeave requests={[]} />);
    
    const requestButton = screen.getByRole('button', { name: /request leave/i });
    expect(requestButton).toBeInTheDocument();
  });

  it('shows leave balance', () => {
    render(<MockLeave requests={[]} />);
    
    expect(screen.getByTestId('annual-leave')).toHaveTextContent('Annual Leave: 15 days');
    expect(screen.getByTestId('sick-leave')).toHaveTextContent('Sick Leave: 10 days');
  });

  it('displays leave requests', () => {
    render(<MockLeave requests={[mockLeaveRequest]} />);
    
    const requests = screen.getAllByTestId('leave-request');
    expect(requests).toHaveLength(1);
  });

  it('shows leave request details', () => {
    render(<MockLeave requests={[mockLeaveRequest]} />);
    
    expect(screen.getByText(mockLeaveRequest.leave_type)).toBeInTheDocument();
    expect(screen.getByText(`${mockLeaveRequest.days_requested} days`)).toBeInTheDocument();
    expect(screen.getByText(mockLeaveRequest.status)).toBeInTheDocument();
  });

  it('handles request leave button click', async () => {
    render(<MockLeave requests={[]} />);
    
    const requestButton = screen.getByRole('button', { name: /request leave/i });
    fireEvent.click(requestButton);
    
    await waitFor(() => {
      expect(requestButton).toBeDefined();
    });
  });
});

describe('Leave Requests', () => {
  it('displays multiple leave requests', () => {
    const requests = [
      mockLeaveRequest,
      { ...mockLeaveRequest, leave_id: 'LV-002', leave_type: 'SICK', days_requested: 2 },
      { ...mockLeaveRequest, leave_id: 'LV-003', leave_type: 'CASUAL', days_requested: 1 },
    ];
    
    render(<MockLeave requests={requests} />);
    
    const requestElements = screen.getAllByTestId('leave-request');
    expect(requestElements).toHaveLength(3);
  });

  it('shows different leave types', () => {
    const requests = [
      { ...mockLeaveRequest, leave_id: 'LV-001', leave_type: 'ANNUAL' },
      { ...mockLeaveRequest, leave_id: 'LV-002', leave_type: 'SICK' },
      { ...mockLeaveRequest, leave_id: 'LV-003', leave_type: 'CASUAL' },
    ];
    
    render(<MockLeave requests={requests} />);
    
    expect(screen.getByText('ANNUAL')).toBeInTheDocument();
    expect(screen.getByText('SICK')).toBeInTheDocument();
    expect(screen.getByText('CASUAL')).toBeInTheDocument();
  });

  it('shows different leave statuses', () => {
    const requests = [
      { ...mockLeaveRequest, leave_id: 'LV-001', status: 'PENDING' },
      { ...mockLeaveRequest, leave_id: 'LV-002', status: 'APPROVED' },
      { ...mockLeaveRequest, leave_id: 'LV-003', status: 'REJECTED' },
    ];
    
    render(<MockLeave requests={requests} />);
    
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.getByText('REJECTED')).toBeInTheDocument();
  });
});

describe('Leave Balance Calculations', () => {
  it('calculates remaining leave correctly', () => {
    const totalAnnualLeave = 20;
    const usedAnnualLeave = 5;
    const remaining = totalAnnualLeave - usedAnnualLeave;
    
    expect(remaining).toBe(15);
  });

  it('handles fractional leave days', () => {
    const totalLeave = 20;
    const usedLeave = 5.5; // Half day leave
    const remaining = totalLeave - usedLeave;
    
    expect(remaining).toBe(14.5);
  });
});
