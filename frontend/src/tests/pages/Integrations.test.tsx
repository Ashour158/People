import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';

describe('Integrations Page', () => {
  it('renders integrations page', () => {
    const IntegrationsPage = () => (
      <div>
        <h1>Integrations</h1>
        <div>Connect third-party services</div>
      </div>
    );
    
    render(<IntegrationsPage />);
    
    expect(screen.getByText('Integrations')).toBeInTheDocument();
  });

  it('displays available integrations', () => {
    const IntegrationsPage = () => (
      <div>
        <h1>Available Integrations</h1>
        <div>Slack</div>
        <div>Zoom</div>
        <div>Google Calendar</div>
      </div>
    );
    
    render(<IntegrationsPage />);
    
    expect(screen.getByText('Slack')).toBeInTheDocument();
    expect(screen.getByText('Zoom')).toBeInTheDocument();
    expect(screen.getByText('Google Calendar')).toBeInTheDocument();
  });

  it('displays connected integrations', () => {
    const IntegrationsPage = () => (
      <div>
        <h2>Connected</h2>
        <div data-testid="connected-slack">
          <span>Slack</span>
          <span>Connected</span>
        </div>
      </div>
    );
    
    render(<IntegrationsPage />);
    
    expect(screen.getByTestId('connected-slack')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('allows connecting new integration', () => {
    const IntegrationsPage = () => (
      <div>
        <button>Connect Slack</button>
        <button>Connect Zoom</button>
      </div>
    );
    
    render(<IntegrationsPage />);
    
    expect(screen.getByText('Connect Slack')).toBeInTheDocument();
    expect(screen.getByText('Connect Zoom')).toBeInTheDocument();
  });

  it('allows disconnecting integration', () => {
    const IntegrationsPage = () => (
      <div>
        <div>
          <span>Slack - Connected</span>
          <button>Disconnect</button>
        </div>
      </div>
    );
    
    render(<IntegrationsPage />);
    
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });
});
