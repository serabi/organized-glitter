/**
 * @fileoverview Performance tests for OptimizedWheel component
 *
 * Tests performance optimizations including Canvas fallback,
 * memoization, and render mode switching.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OptimizedWheel } from '../OptimizedWheel';
import type { Project } from '@/types/shared';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024, // 2GB
  },
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Mock requestAnimationFrame
let animationFrameId = 0;
const mockRequestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  animationFrameId++;
  setTimeout(() => callback(Date.now()), 16); // ~60fps
  return animationFrameId;
});

const mockCancelAnimationFrame = vi.fn((id: number) => {
  // Mock implementation
});

Object.defineProperty(window, 'requestAnimationFrame', {
  value: mockRequestAnimationFrame,
  writable: true,
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  value: mockCancelAnimationFrame,
  writable: true,
});

// Mock Canvas API
const mockCanvas = {
  getContext: vi.fn(() => ({
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
  })),
  width: 320,
  height: 320,
};

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: mockCanvas.getContext,
  writable: true,
});

// Helper function to create mock projects
const createMockProjects = (count: number): Project[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `project-${index}`,
    title: `Project ${index + 1}`,
    company: index % 2 === 0 ? `Company ${index}` : undefined,
    artist: index % 3 === 0 ? `Artist ${index}` : undefined,
    status: 'progress' as const,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  }));
};

describe('OptimizedWheel Performance Tests', () => {
  let mockOnSpinComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSpinComplete = vi.fn();
    vi.clearAllMocks();
    mockPerformance.now.mockImplementation(() => Date.now());
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Render Mode Selection', () => {
    it('should use CSS render mode for small project counts', () => {
      const projects = createMockProjects(5);

      render(<OptimizedWheel projects={projects} onSpinComplete={mockOnSpinComplete} />);

      // Should render CSS-based wheel (no canvas element)
      expect(screen.queryByRole('application')).toBeInTheDocument();
      expect(document.querySelector('canvas')).not.toBeInTheDocument();
    });

    it('should use Canvas render mode for large project counts', () => {
      const projects = createMockProjects(25); // Above threshold of 20

      render(<OptimizedWheel projects={projects} onSpinComplete={mockOnSpinComplete} />);

      // Should render Canvas-based wheel
      expect(document.querySelector('canvas')).toBeInTheDocument();
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

      // Should use Canvas despite low project count
      expect(document.querySelector('canvas')).toBeInTheDocument();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track render performance metrics', async () => {
      const projects = createMockProjects(10);
      let performanceMetrics: any[] = [];

      // Mock console methods to capture performance logs
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      render(<OptimizedWheel projects={projects} onSpinComplete={mockOnSpinComplete} />);

      // Trigger a spin to generate performance metrics
      const spinButton = screen.getByRole('button', { name: /spin the wheel/i });
      fireEvent.click(spinButton);

      await waitFor(
        () => {
          expect(consoleSpy).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );

      consoleSpy.mockRestore();
    });

    it('should switch to Canvas mode when CSS performance is poor', async () => {
      const projects = createMockProjects(15); // Below Canvas threshold

      // Mock poor performance
      let callCount = 0;
      mockPerformance.now.mockImplementation(() => {
        callCount++;
        // Simulate slow render times after a few calls
        return callCount > 5 ? Date.now() + 50 : Date.now(); // 50ms render time
      });

      const { rerender } = render(
        <OptimizedWheel projects={projects} onSpinComplete={mockOnSpinComplete} />
      );

      // Initially should use CSS mode
      expect(document.querySelector('canvas')).not.toBeInTheDocument();

      // Trigger multiple renders to accumulate performance metrics
      for (let i = 0; i < 5; i++) {
        rerender(<OptimizedWheel projects={projects} onSpinComplete={mockOnSpinComplete} />);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Should eventually switch to Canvas mode due to poor performance
      await waitFor(
        () => {
          expect(document.querySelector('canvas')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Memory Management', () => {
    it('should cleanup resources on unmount', () => {
      const projects = createMockProjects(25); // Canvas mode

      const { unmount } = render(
        <OptimizedWheel projects={projects} onSpinComplete={mockOnSpinComplete} />
      );

      // Trigger animation to create resources
      const spinButton = screen.getByRole('button', { name: /spin the wheel/i });
      fireEvent.click(spinButton);

      // Unmount component
      unmount();

      // Should have called cancelAnimationFrame
      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });

    it('should monitor memory usage in development', () => {
      const projects = createMockProjects(30);

      // Mock high memory usage
      mockPerformance.memory.usedJSHeapSize = 60 * 1024 * 1024; // 60MB (above 50MB threshold)

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      render(<OptimizedWheel projects={projects} onSpinComplete={mockOnSpinComplete} />);

      // Should log memory warning in development
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('High memory usage detected'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Memoization Optimizations', () => {
    it('should memoize wheel gradient generation', () => {
      const projects = createMockProjects(10);

      const { rerender } = render(
        <OptimizedWheel projects={projects} onSpinComplete={mockOnSpinComplete} />
      );

      // Get initial render count
      const initialCallCount = mockPerformance.now.mock.calls.length;

      // Rerender with same projects - should use memoized gradient
      rerender(<OptimizedWheel projects={projects} onSpinComplete={mockOnSpinComplete} />);

      // Should not have generated new gradient (minimal additional calls)
      const finalCallCount = mockPerformance.now.mock.calls.length;
      expect(finalCallCount - initialCallCount).toBeLessThan(5);
    });

    it('should memoize project labels', () => {
      const projects = createMockProjects(8);

      const { rerender } = render(
        <OptimizedWheel projects={projects} onSpinComplete={mockOnSpinComplete} />
      );

      // Count initial label elements
      const initialLabels = document.querySelectorAll('.wheel__label').length;

      // Rerender with same projects
      rerender(<OptimizedWheel projects={projects} onSpinComplete={mockOnSpinComplete} />);

      // Should have same number of labels (memoized)
      const finalLabels = document.querySelectorAll('.wheel__label').length;
      expect(finalLabels).toBe(initialLabels);
      expect(finalLabels).toBe(projects.length);
    });
  });

  describe('Canvas Fallback Optimizations', () => {
    it('should use offscreen canvas for complex scenarios', () => {
      const projects = createMockProjects(35); // Above offscreen threshold of 30

      render(<OptimizedWheel projects={projects} onSpinComplete={mockOnSpinComplete} />);

      // Should create canvas element
      expect(document.querySelector('canvas')).toBeInTheDocument();

      // Should have called canvas context methods
      expect(mockCanvas.getContext).toHaveBeenCalled();
    });

    it('should optimize Canvas rendering for many projects', async () => {
      const projects = createMockProjects(40);

      render(<OptimizedWheel projects={projects} onSpinComplete={mockOnSpinComplete} />);

      // Trigger spin to test animation performance
      const spinButton = screen.getByRole('button', { name: /spin the wheel/i });
      fireEvent.click(spinButton);

      // Should use Canvas rendering optimizations
      await waitFor(() => {
        expect(mockRequestAnimationFrame).toHaveBeenCalled();
      });
    });
  });

  describe('Responsive Performance', () => {
    it('should adapt rendering based on screen size', () => {
      const projects = createMockProjects(15);

      // Mock small screen
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        writable: true,
      });

      render(
        <OptimizedWheel projects={projects} onSpinComplete={mockOnSpinComplete} size="small" />
      );

      // Should render with small size optimizations
      const wheelContainer = document.querySelector('.wheel-container--small');
      expect(wheelContainer).toBeInTheDocument();
    });
  });
});
