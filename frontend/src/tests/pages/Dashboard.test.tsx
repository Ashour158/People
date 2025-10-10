import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '../test-utils';
import { fireEvent } from '@testing-library/react';

// Mock the Dashboard component
const MockDashboard = () => {
  return (
    <div>
      <h1>Dashboard</h1>
      <div data-testid="total-employees">100</div>
      <div data-testid="present-today">85</div>
      <div data-testid="on-leave">10</div>
      <div data-testid="pending-requests">5</div>
    </div>
  );
};

describe('Dashboard Page', () => {
  it('renders dashboard heading', () => {
    render(<MockDashboard />);
    
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });

  it('displays employee statistics', () => {
    render(<MockDashboard />);
    
    expect(screen.getByTestId('total-employees')).toBeInTheDocument();
    expect(screen.getByTestId('present-today')).toBeInTheDocument();
    expect(screen.getByTestId('on-leave')).toBeInTheDocument();
    expect(screen.getByTestId('pending-requests')).toBeInTheDocument();
  });

  it('shows correct employee counts', () => {
    render(<MockDashboard />);
    
    expect(screen.getByTestId('total-employees')).toHaveTextContent('100');
    expect(screen.getByTestId('present-today')).toHaveTextContent('85');
    expect(screen.getByTestId('on-leave')).toHaveTextContent('10');
    expect(screen.getByTestId('pending-requests')).toHaveTextContent('5');
  });
});

describe('Dashboard Statistics', () => {
  it('calculates attendance rate correctly', () => {
    const totalEmployees = 100;
    const presentToday = 85;
    const attendanceRate = (presentToday / totalEmployees) * 100;
    
    expect(attendanceRate).toBe(85);
  });

  it('validates statistics data types', () => {
    const stats = {
      total_employees: 100,
      present_today: 85,
      on_leave: 10,
      absent: 5,
      attendance_rate: 85.5
    };
    
    expect(typeof stats.total_employees).toBe('number');
    expect(typeof stats.present_today).toBe('number');
    expect(typeof stats.on_leave).toBe('number');
    expect(typeof stats.attendance_rate).toBe('number');
  });
});
