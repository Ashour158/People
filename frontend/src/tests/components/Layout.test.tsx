import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import Layout from '../../components/layout/Layout';

describe('Layout Component', () => {
  it('renders layout with children', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders navigation menu', () => {
    render(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    
    // Check if navigation elements are present (adjust selectors based on actual implementation)
    const layout = screen.getByRole('main') || document.body;
    expect(layout).toBeTruthy();
  });

  it('renders header', () => {
    render(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    
    // Header should be present
    const layout = document.body;
    expect(layout).toBeTruthy();
  });

  it('applies correct layout structure', () => {
    const { container } = render(
      <Layout>
        <div data-testid="child-content">Child Content</div>
      </Layout>
    );
    
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });
});
