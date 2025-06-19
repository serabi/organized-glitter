import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ContentTextarea } from '../ContentTextarea';

describe('ContentTextarea', () => {
  const mockOnChange = vi.fn();

  it('renders the textarea with the correct label and placeholder', () => {
    render(<ContentTextarea value="" onChange={mockOnChange} disabled={false} />);
    expect(screen.getByLabelText('Caption (optional)')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Add a caption for your progress picture...')
    ).toBeInTheDocument();
  });

  it('displays the current content value', () => {
    render(<ContentTextarea value="Initial content" onChange={mockOnChange} disabled={false} />);
    expect(screen.getByRole('textbox')).toHaveValue('Initial content');
  });

  it('calls onChange when the content is changed', () => {
    render(<ContentTextarea value="" onChange={mockOnChange} disabled={false} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'New content' } });
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('disables the textarea when disabled prop is true', () => {
    render(<ContentTextarea value="" onChange={mockOnChange} disabled={true} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('displays an error message when error prop is provided', () => {
    const errorMessage = 'Content is required.';
    render(
      <ContentTextarea value="" onChange={mockOnChange} disabled={false} error={errorMessage} />
    );
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not display an error message when error prop is not provided', () => {
    render(<ContentTextarea value="" onChange={mockOnChange} disabled={false} />);
    expect(screen.queryByText(/is required/i)).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
  });
});
