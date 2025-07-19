/**
 * @fileoverview Basic tests for OptimizedWheel component
 *
 * Simple tests to verify the component renders without infinite loops.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { OptimizedWheel } from '../OptimizedWheel';
import type { Project } from '@/types/shared';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Helper function to create mock projects
const createMockProjects = (count: number): Project[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `project-${index}`,
    userId: 'test-user',
    title: `Project ${index + 1}`,
    status: 'progress' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
};

describe('OptimizedWheel Basic Tests', () => {
  let mockOnSpinComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSpinComplete = vi.fn();
    vi.clearAllMocks();
  });

  it('should render empty state without projects', () => {
    render(<OptimizedWheel projects={[]} onSpinComplete={mockOnSpinComplete} />);

    expect(screen.getByText('Select projects below')).toBeInTheDocument();
    expect(screen.getByText('to get started!')).toBeInTheDocument();
  });

  it('should render with small number of projects', () => {
    const projects = createMockProjects(3);

    render(<OptimizedWheel projects={projects} onSpinComplete={mockOnSpinComplete} />);

    expect(screen.getByRole('button', { name: /spin the wheel/i })).toBeInTheDocument();
    expect(screen.getByRole('application')).toBeInTheDocument();
  });

  it('should render with large number of projects', () => {
    const projects = createMockProjects(25);

    render(<OptimizedWheel projects={projects} onSpinComplete={mockOnSpinComplete} />);

    expect(screen.getByRole('button', { name: /spin the wheel/i })).toBeInTheDocument();
  });

  it('should handle disabled state', () => {
    const projects = createMockProjects(5);

    render(
      <OptimizedWheel projects={projects} onSpinComplete={mockOnSpinComplete} disabled={true} />
    );

    const spinButton = screen.getByRole('button', { name: /spin the wheel/i });
    expect(spinButton).toBeDisabled();
  });

  it('should respect forced render mode', () => {
    const projects = createMockProjects(5);

    render(
      <OptimizedWheel
        projects={projects}
        onSpinComplete={mockOnSpinComplete}
        forceRenderMode="canvas"
      />
    );

    // Should render without errors
    expect(screen.getByRole('button', { name: /spin the wheel/i })).toBeInTheDocument();
  });
});
