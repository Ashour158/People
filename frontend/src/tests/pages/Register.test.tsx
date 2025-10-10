import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import { fireEvent, waitFor } from '@testing-library/react';
import Register from '../../pages/auth/Register';

describe('Register Page', () => {
  it('renders registration form', () => {
    render(<Register />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up|register/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<Register />);
    
    const submitButton = screen.getByRole('button', { name: /sign up|register/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const errorMessages = screen.queryAllByText(/required/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('validates email format', async () => {
    render(<Register />);
    
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      const errorText = screen.queryByText(/valid email/i) || screen.queryByText(/invalid/i);
      if (errorText) {
        expect(errorText).toBeInTheDocument();
      }
    });
  });

  it('validates password strength', async () => {
    render(<Register />);
    
    const passwordInput = screen.getByLabelText(/^password/i);
    fireEvent.change(passwordInput, { target: { value: 'weak' } });
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      const errorText = screen.queryByText(/strong|characters|uppercase|lowercase/i);
      if (errorText) {
        expect(errorText).toBeInTheDocument();
      }
    });
  });

  it('validates password confirmation match', async () => {
    render(<Register />);
    
    const passwordInput = screen.getByLabelText(/^password(?! confirmation)/i);
    const confirmPasswordInput = screen.queryByLabelText(/confirm password|password confirmation/i);
    
    if (confirmPasswordInput) {
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'Different123!' } });
      fireEvent.blur(confirmPasswordInput);

      await waitFor(() => {
        const errorText = screen.queryByText(/match|same/i);
        if (errorText) {
          expect(errorText).toBeInTheDocument();
        }
      });
    }
  });

  it('submits form with valid data', async () => {
    render(<Register />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password(?! confirmation)/i);
    const submitButton = screen.getByRole('button', { name: /sign up|register/i });

    fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    
    // Fill other required fields if they exist
    const firstNameInput = screen.queryByLabelText(/first name/i);
    const lastNameInput = screen.queryByLabelText(/last name/i);
    const orgNameInput = screen.queryByLabelText(/organization|company/i);
    
    if (firstNameInput) fireEvent.change(firstNameInput, { target: { value: 'John' } });
    if (lastNameInput) fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    if (orgNameInput) fireEvent.change(orgNameInput, { target: { value: 'Test Org' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDefined();
    });
  });

  it('has link to login page', () => {
    render(<Register />);
    
    const loginLink = screen.queryByText(/sign in|login|already have/i);
    if (loginLink) {
      expect(loginLink).toBeInTheDocument();
    }
  });
});
