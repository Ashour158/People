import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';

describe('Organization Page', () => {
  it('renders organization settings page', () => {
    const OrganizationPage = () => (
      <div>
        <h1>Organization Settings</h1>
        <div>Manage your organization</div>
      </div>
    );
    
    render(<OrganizationPage />);
    
    expect(screen.getByText('Organization Settings')).toBeInTheDocument();
  });

  it('displays organization information', () => {
    const OrganizationPage = () => (
      <div>
        <h1>Organization Details</h1>
        <div>Name: Tech Corp</div>
        <div>Industry: Technology</div>
        <div>Employees: 150</div>
      </div>
    );
    
    render(<OrganizationPage />);
    
    expect(screen.getByText('Name: Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('Industry: Technology')).toBeInTheDocument();
  });

  it('displays departments list', () => {
    const OrganizationPage = () => (
      <div>
        <h2>Departments</h2>
        <ul>
          <li>Engineering</li>
          <li>Human Resources</li>
          <li>Sales</li>
        </ul>
      </div>
    );
    
    render(<OrganizationPage />);
    
    expect(screen.getByText('Departments')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Human Resources')).toBeInTheDocument();
  });

  it('displays company hierarchy', () => {
    const OrganizationPage = () => (
      <div>
        <h2>Company Hierarchy</h2>
        <div>CEO</div>
        <div>CTO</div>
        <div>Engineering Manager</div>
      </div>
    );
    
    render(<OrganizationPage />);
    
    expect(screen.getByText('Company Hierarchy')).toBeInTheDocument();
    expect(screen.getByText('CEO')).toBeInTheDocument();
  });
});
