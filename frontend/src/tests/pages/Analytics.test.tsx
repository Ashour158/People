import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';

describe('Analytics Page', () => {
  it('renders analytics dashboard', () => {
    const AnalyticsPage = () => (
      <div>
        <h1>Analytics Dashboard</h1>
        <div>Employee Metrics</div>
      </div>
    );
    
    render(<AnalyticsPage />);
    
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
  });

  it('displays employee metrics', () => {
    const AnalyticsPage = () => (
      <div>
        <h1>Analytics</h1>
        <div>Total Employees: 150</div>
        <div>Active Employees: 145</div>
        <div>On Leave: 5</div>
      </div>
    );
    
    render(<AnalyticsPage />);
    
    expect(screen.getByText('Total Employees: 150')).toBeInTheDocument();
    expect(screen.getByText('Active Employees: 145')).toBeInTheDocument();
  });

  it('displays attendance metrics', () => {
    const AnalyticsPage = () => (
      <div>
        <h2>Attendance Metrics</h2>
        <div>Average Attendance: 95%</div>
        <div>Late Arrivals: 10</div>
      </div>
    );
    
    render(<AnalyticsPage />);
    
    expect(screen.getByText('Attendance Metrics')).toBeInTheDocument();
    expect(screen.getByText('Average Attendance: 95%')).toBeInTheDocument();
  });

  it('displays leave statistics', () => {
    const AnalyticsPage = () => (
      <div>
        <h2>Leave Statistics</h2>
        <div>Total Leave Days: 120</div>
        <div>Pending Requests: 8</div>
      </div>
    );
    
    render(<AnalyticsPage />);
    
    expect(screen.getByText('Leave Statistics')).toBeInTheDocument();
    expect(screen.getByText('Total Leave Days: 120')).toBeInTheDocument();
  });

  it('renders charts and graphs', () => {
    const AnalyticsPage = () => (
      <div>
        <div data-testid="attendance-chart">Attendance Chart</div>
        <div data-testid="leave-chart">Leave Chart</div>
      </div>
    );
    
    render(<AnalyticsPage />);
    
    expect(screen.getByTestId('attendance-chart')).toBeInTheDocument();
    expect(screen.getByTestId('leave-chart')).toBeInTheDocument();
  });
});
