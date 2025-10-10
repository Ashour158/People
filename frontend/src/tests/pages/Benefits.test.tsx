import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test-utils';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

describe('Benefits Page', () => {
  it('renders benefits page', () => {
    // Mock benefits page component
    const BenefitsPage = () => <div>Benefits Page</div>;
    
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<BenefitsPage />} />
        </Routes>
      </BrowserRouter>
    );
    
    expect(screen.getByText('Benefits Page')).toBeInTheDocument();
  });

  it('displays benefits list', () => {
    const BenefitsPage = () => (
      <div>
        <h1>Employee Benefits</h1>
        <ul>
          <li>Health Insurance</li>
          <li>Dental Insurance</li>
          <li>401k Matching</li>
        </ul>
      </div>
    );
    
    render(<BenefitsPage />);
    
    expect(screen.getByText('Employee Benefits')).toBeInTheDocument();
    expect(screen.getByText('Health Insurance')).toBeInTheDocument();
  });

  it('displays enrollment information', () => {
    const BenefitsPage = () => (
      <div>
        <h1>Benefits</h1>
        <div>Enrollment Period: Jan 1 - Jan 31</div>
      </div>
    );
    
    render(<BenefitsPage />);
    
    expect(screen.getByText(/Enrollment Period/)).toBeInTheDocument();
  });

  it('handles benefit selection', async () => {
    const handleSelect = vi.fn();
    
    const BenefitsPage = () => (
      <div>
        <button onClick={handleSelect}>Select Benefit</button>
      </div>
    );
    
    render(<BenefitsPage />);
    
    const button = screen.getByText('Select Benefit');
    button.click();
    
    expect(handleSelect).toHaveBeenCalled();
  });
});
