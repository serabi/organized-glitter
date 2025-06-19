import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TagBadge } from '../TagBadge';

// Mock UI components
vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    onClick,
    className,
    style,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <span
      className={className}
      onClick={onClick}
      style={style}
      data-testid="badge"
      role={onClick ? 'button' : undefined}
    >
      {children}
    </span>
  ),
}));

// Mock icons
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">×</span>,
}));

describe('TagBadge', () => {
  const mockTag = {
    id: 'tag1',
    name: 'Landscape',
    color: '#3b82f6',
    slug: 'landscape',
    userId: 'user1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render tag with name and color', () => {
    render(<TagBadge tag={mockTag} />);

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('Landscape');
    expect(badge).toHaveStyle('background-color: rgba(59, 130, 246, 0.125)'); // Uses opacity
  });

  it('should render without clickable behavior by default', () => {
    render(<TagBadge tag={mockTag} />);

    const badge = screen.getByTestId('badge');
    expect(badge).not.toHaveAttribute('role', 'button');
  });

  it('should render remove button when onRemove is provided', () => {
    const mockOnRemove = vi.fn();
    render(<TagBadge tag={mockTag} onRemove={mockOnRemove} removable={true} />);

    const removeButton = screen.getByTestId('x-icon');
    expect(removeButton).toBeInTheDocument();

    fireEvent.click(removeButton.closest('button')!);
    expect(mockOnRemove).toHaveBeenCalledTimes(1);
  });

  it('should render remove button when removable is true', () => {
    const mockOnRemove = vi.fn();

    render(<TagBadge tag={mockTag} onRemove={mockOnRemove} removable={true} />);

    // Should have remove button
    const badge = screen.getByTestId('badge');
    const removeButton = screen.getByTestId('x-icon');

    expect(badge).not.toHaveAttribute('role', 'button');
    expect(removeButton).toBeInTheDocument();
  });

  it('should handle different tag colors', () => {
    const redTag = { ...mockTag, color: '#ef4444' };
    const { rerender } = render(<TagBadge tag={redTag} />);

    let badge = screen.getByTestId('badge');
    expect(badge).toHaveStyle('background-color: rgba(239, 68, 68, 0.125)');

    const greenTag = { ...mockTag, color: '#10b981' };
    rerender(<TagBadge tag={greenTag} />);

    badge = screen.getByTestId('badge');
    expect(badge).toHaveStyle('background-color: rgba(16, 185, 129, 0.125)');
  });

  it('should handle tag with long name', () => {
    const longNameTag = {
      ...mockTag,
      name: 'Very Long Tag Name That Might Need Truncation',
    };

    render(<TagBadge tag={longNameTag} />);

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('Very Long Tag Name That Might Need Truncation');
  });

  it('should handle tag with special characters in name', () => {
    const specialTag = {
      ...mockTag,
      name: 'Tag & Special "Characters"',
    };

    render(<TagBadge tag={specialTag} />);

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveTextContent('Tag & Special "Characters"');
  });

  it('should render without interactions when no handlers provided', () => {
    render(<TagBadge tag={mockTag} />);

    const badge = screen.getByTestId('badge');
    expect(badge).not.toHaveAttribute('role', 'button');
    expect(screen.queryByTestId('x-icon')).not.toBeInTheDocument();
  });

  it('should apply custom className when provided', () => {
    render(<TagBadge tag={mockTag} className="custom-class" />);

    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('custom-class');
  });

  it('should handle small size variant', () => {
    render(<TagBadge tag={mockTag} size="sm" />);

    const badge = screen.getByTestId('badge');
    // The size prop should affect the className
    expect(badge).toBeInTheDocument();
  });

  it('should call onRemove when remove button is clicked', () => {
    const mockOnRemove = vi.fn();

    render(<TagBadge tag={mockTag} onRemove={mockOnRemove} removable={true} />);

    const removeButton = screen.getByTestId('x-icon').closest('button')!;
    fireEvent.click(removeButton);

    expect(mockOnRemove).toHaveBeenCalledTimes(1);
  });

  it('should handle undefined or invalid color gracefully', () => {
    const invalidColorTag = {
      ...mockTag,
      color: undefined as unknown,
    } as typeof mockTag;

    render(<TagBadge tag={invalidColorTag} />);

    const badge = screen.getByTestId('badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Landscape');
  });

  it('should maintain accessibility for screen readers', () => {
    const mockOnRemove = vi.fn();
    render(<TagBadge tag={mockTag} onRemove={mockOnRemove} removable={true} />);

    const removeButton = screen.getByTestId('x-icon').closest('button')!;
    expect(removeButton).toHaveAttribute('aria-label', 'Remove Landscape tag');
  });
});
