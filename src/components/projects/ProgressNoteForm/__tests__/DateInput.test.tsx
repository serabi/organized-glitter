import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DateInput } from '../DateInput';

describe('DateInput', () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    value: '',
    onChange: mockOnChange,
    disabled: false,
    error: undefined,
  };

  it('renders the date input with the correct label', () => {
    render(<DateInput {...defaultProps} />);
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
  });

  it('displays the current date value', () => {
    render(<DateInput {...defaultProps} value="2025-05-26" />);
    expect(screen.getByDisplayValue('2025-05-26')).toBeInTheDocument();
  });

  it('calls onChange when the date is changed', () => {
    render(<DateInput {...defaultProps} />);
    const input = screen.getByLabelText('Date');
    fireEvent.change(input, { target: { value: '2025-05-27' } });
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('disables the input when disabled prop is true', () => {
    render(<DateInput {...defaultProps} disabled={true} />);
    expect(screen.getByLabelText('Date')).toBeDisabled();
  });

  it('displays an error message when error prop is provided', () => {
    const errorMessage = 'Date is required.';
    render(<DateInput {...defaultProps} error={errorMessage} />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not display an error message when error prop is not provided', () => {
    render(<DateInput {...defaultProps} />);
    expect(screen.queryByText(/is required/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toHaveAttribute('aria-invalid', 'false');
  });
});
