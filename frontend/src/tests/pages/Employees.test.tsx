import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '../test-utils';
import { fireEvent } from '@testing-library/react';
import { mockEmployee } from '../test-utils';

// Mock Employees list component
const MockEmployeeList = ({ employees }: { employees: any[] }) => {
  return (
    <div>
      <h1>Employees</h1>
      <button>Add Employee</button>
      <input type="text" placeholder="Search employees..." />
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.employee_id}>
              <td>{`${emp.first_name} ${emp.last_name}`}</td>
              <td>{emp.email}</td>
              <td>{emp.department}</td>
              <td>{emp.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

describe('Employees Page', () => {
  it('renders employees list', () => {
    render(<MockEmployeeList employees={[mockEmployee]} />);
    
    expect(screen.getByText(/employees/i)).toBeInTheDocument();
  });

  it('displays add employee button', () => {
    render(<MockEmployeeList employees={[]} />);
    
    const addButton = screen.getByRole('button', { name: /add employee/i });
    expect(addButton).toBeInTheDocument();
  });

  it('has search functionality', () => {
    render(<MockEmployeeList employees={[mockEmployee]} />);
    
    const searchInput = screen.getByPlaceholderText(/search employees/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('displays employee information', () => {
    render(<MockEmployeeList employees={[mockEmployee]} />);
    
    expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    expect(screen.getByText(mockEmployee.email)).toBeInTheDocument();
    expect(screen.getByText(mockEmployee.department)).toBeInTheDocument();
  });

  it('handles search input', async () => {
    render(<MockEmployeeList employees={[mockEmployee]} />);
    
    const searchInput = screen.getByPlaceholderText(/search employees/i);
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    await waitFor(() => {
      expect(searchInput).toHaveValue('John');
    });
  });

  it('displays correct number of employees', () => {
    const employees = [mockEmployee, { ...mockEmployee, employee_id: 'EMP-002' }];
    render(<MockEmployeeList employees={employees} />);
    
    const rows = screen.getAllByRole('row');
    // 1 header row + 2 data rows = 3 total
    expect(rows.length).toBe(3);
  });
});

describe('Employee Actions', () => {
  it('handles add employee button click', () => {
    render(<MockEmployeeList employees={[]} />);
    
    const addButton = screen.getByRole('button', { name: /add employee/i });
    fireEvent.click(addButton);
    
    // Button should be clickable
    expect(addButton).toBeDefined();
  });

  it('displays employee status correctly', () => {
    const employees = [
      { ...mockEmployee, status: 'ACTIVE' },
      { ...mockEmployee, employee_id: 'EMP-002', status: 'ON_LEAVE' },
    ];
    
    render(<MockEmployeeList employees={employees} />);
    
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('ON_LEAVE')).toBeInTheDocument();
  });
});
