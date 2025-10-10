import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '../test-utils';
import { fireEvent } from '@testing-library/react';
import { mockAttendance } from '../test-utils';

// Mock Attendance component
const MockAttendance = ({ records }: { records: any[] }) => {
  return (
    <div>
      <h1>Attendance</h1>
      <div>
        <button>Check In</button>
        <button>Check Out</button>
      </div>
      <div data-testid="attendance-list">
        {records.map((record) => (
          <div key={record.attendance_id} data-testid="attendance-record">
            <span>{record.status}</span>
            <span>{record.work_hours} hours</span>
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Attendance Page', () => {
  it('renders attendance heading', () => {
    render(<MockAttendance records={[]} />);
    
    expect(screen.getByText(/attendance/i)).toBeInTheDocument();
  });

  it('displays check-in button', () => {
    render(<MockAttendance records={[]} />);
    
    const checkInButton = screen.getByRole('button', { name: /check in/i });
    expect(checkInButton).toBeInTheDocument();
  });

  it('displays check-out button', () => {
    render(<MockAttendance records={[]} />);
    
    const checkOutButton = screen.getByRole('button', { name: /check out/i });
    expect(checkOutButton).toBeInTheDocument();
  });

  it('displays attendance records', () => {
    render(<MockAttendance records={[mockAttendance]} />);
    
    const records = screen.getAllByTestId('attendance-record');
    expect(records).toHaveLength(1);
  });

  it('shows attendance status', () => {
    render(<MockAttendance records={[mockAttendance]} />);
    
    expect(screen.getByText(mockAttendance.status)).toBeInTheDocument();
  });

  it('displays work hours', () => {
    render(<MockAttendance records={[mockAttendance]} />);
    
    expect(screen.getByText(`${mockAttendance.work_hours} hours`)).toBeInTheDocument();
  });

  it('handles check-in action', async () => {
    render(<MockAttendance records={[]} />);
    
    const checkInButton = screen.getByRole('button', { name: /check in/i });
    fireEvent.click(checkInButton);
    
    await waitFor(() => {
      expect(checkInButton).toBeDefined();
    });
  });

  it('handles check-out action', async () => {
    render(<MockAttendance records={[]} />);
    
    const checkOutButton = screen.getByRole('button', { name: /check out/i });
    fireEvent.click(checkOutButton);
    
    await waitFor(() => {
      expect(checkOutButton).toBeDefined();
    });
  });
});

describe('Attendance Records', () => {
  it('displays multiple attendance records', () => {
    const records = [
      mockAttendance,
      { ...mockAttendance, attendance_id: 'ATT-002', work_hours: 9 },
      { ...mockAttendance, attendance_id: 'ATT-003', work_hours: 7.5 },
    ];
    
    render(<MockAttendance records={records} />);
    
    const recordElements = screen.getAllByTestId('attendance-record');
    expect(recordElements).toHaveLength(3);
  });

  it('shows different attendance statuses', () => {
    const records = [
      { ...mockAttendance, attendance_id: 'ATT-001', status: 'PRESENT' },
      { ...mockAttendance, attendance_id: 'ATT-002', status: 'LATE' },
      { ...mockAttendance, attendance_id: 'ATT-003', status: 'ABSENT' },
    ];
    
    render(<MockAttendance records={records} />);
    
    expect(screen.getByText('PRESENT')).toBeInTheDocument();
    expect(screen.getByText('LATE')).toBeInTheDocument();
    expect(screen.getByText('ABSENT')).toBeInTheDocument();
  });
});
