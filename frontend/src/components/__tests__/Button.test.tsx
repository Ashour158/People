import { render, screen } from '@testing-library/react';
import { Button } from '@mui/material';

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies variant correctly', () => {
    render(<Button variant="contained">Contained Button</Button>);
    const button = screen.getByText('Contained Button');
    expect(button).toHaveClass('MuiButton-contained');
  });
});
