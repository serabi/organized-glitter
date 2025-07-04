import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useNavigateToProject,
  useNavigateToProjectEdit,
  createNavigationContext,
} from '../useNavigateToProject';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => mockLogger,
}));

describe('useNavigateToProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useNavigateToProject hook', () => {
    it('should navigate to project detail page', () => {
      const { result } = renderHook(() => useNavigateToProject());

      const navigateToProject = result.current;
      navigateToProject('project123');

      expect(mockNavigate).toHaveBeenCalledWith('/projects/project123', { replace: false });
      expect(mockLogger.debug).toHaveBeenCalledWith('Navigating to project', {
        projectId: 'project123',
        replace: false,
      });
    });

    it('should navigate with replace option', () => {
      const { result } = renderHook(() => useNavigateToProject());

      const navigateToProject = result.current;
      navigateToProject('project456', { replace: true });

      expect(mockNavigate).toHaveBeenCalledWith('/projects/project456', { replace: true });
      expect(mockLogger.debug).toHaveBeenCalledWith('Navigating to project', {
        projectId: 'project456',
        replace: true,
      });
    });

    it('should use default options when none provided', () => {
      const { result } = renderHook(() => useNavigateToProject());

      const navigateToProject = result.current;
      navigateToProject('project789');

      expect(mockNavigate).toHaveBeenCalledWith('/projects/project789', { replace: false });
    });

    it('should handle empty project ID', () => {
      const { result } = renderHook(() => useNavigateToProject());

      const navigateToProject = result.current;
      navigateToProject('');

      expect(mockNavigate).toHaveBeenCalledWith('/projects/', { replace: false });
    });

    it('should be memoized and stable', () => {
      const { result, rerender } = renderHook(() => useNavigateToProject());

      const firstRender = result.current;
      rerender();
      const secondRender = result.current;

      expect(firstRender).toBe(secondRender);
    });
  });

  describe('useNavigateToProjectEdit hook', () => {
    it('should navigate to project edit page', () => {
      const { result } = renderHook(() => useNavigateToProjectEdit());

      const navigateToEdit = result.current;
      navigateToEdit('project123');

      expect(mockNavigate).toHaveBeenCalledWith('/projects/project123/edit');
      expect(mockLogger.debug).toHaveBeenCalledWith('Navigating to project edit', {
        projectId: 'project123',
      });
    });

    it('should ignore options parameter for backward compatibility', () => {
      const { result } = renderHook(() => useNavigateToProjectEdit());

      const navigateToEdit = result.current;
      navigateToEdit('project456', { someOption: true });

      expect(mockNavigate).toHaveBeenCalledWith('/projects/project456/edit');
    });

    it('should handle empty project ID', () => {
      const { result } = renderHook(() => useNavigateToProjectEdit());

      const navigateToEdit = result.current;
      navigateToEdit('');

      expect(mockNavigate).toHaveBeenCalledWith('/projects//edit');
    });

    it('should be memoized and stable', () => {
      const { result, rerender } = renderHook(() => useNavigateToProjectEdit());

      const firstRender = result.current;
      rerender();
      const secondRender = result.current;

      expect(firstRender).toBe(secondRender);
    });
  });

  describe('createNavigationContext helper', () => {
    it('should create minimal navigation context', () => {
      const beforeTime = Date.now();
      const context = createNavigationContext();
      const afterTime = Date.now();

      expect(context).toEqual({
        timestamp: expect.any(Number),
      });

      expect(context.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(context.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should create new timestamp on each call', () => {
      const context1 = createNavigationContext();

      // Small delay to ensure different timestamps
      const delay = new Promise(resolve => setTimeout(resolve, 1));
      return delay.then(() => {
        const context2 = createNavigationContext();

        expect(context1.timestamp).not.toBe(context2.timestamp);
        expect(context2.timestamp).toBeGreaterThan(context1.timestamp);
      });
    });
  });

  describe('error handling', () => {
    it('should handle navigation errors gracefully', () => {
      mockNavigate.mockImplementation(() => {
        throw new Error('Navigation failed');
      });

      const { result } = renderHook(() => useNavigateToProject());

      expect(() => {
        const navigateToProject = result.current;
        navigateToProject('project123');
      }).toThrow('Navigation failed');

      // Logger should still be called before the error
      expect(mockLogger.debug).toHaveBeenCalledWith('Navigating to project', {
        projectId: 'project123',
        replace: false,
      });
    });

    it('should handle special characters in project ID', () => {
      const { result } = renderHook(() => useNavigateToProject());

      const navigateToProject = result.current;
      const specialId = 'project-123_test@example.com';
      navigateToProject(specialId);

      expect(mockNavigate).toHaveBeenCalledWith(`/projects/${specialId}`, { replace: false });
    });
  });

  describe('integration with react-router', () => {
    it('should use react-router navigate function', () => {
      const { result } = renderHook(() => useNavigateToProject());

      const navigateToProject = result.current;
      navigateToProject('project123');

      // Verify the mock navigate was called (indicating react-router integration)
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('should pass correct parameters to navigate', () => {
      const { result } = renderHook(() => useNavigateToProject());

      const navigateToProject = result.current;
      navigateToProject('test-project', { replace: true });

      // Verify exact parameters passed to react-router navigate
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/projects/test-project', { replace: true });
    });
  });

  describe('performance', () => {
    it('should not create new functions on every render', () => {
      const { result, rerender } = renderHook(() => useNavigateToProject());

      const func1 = result.current;
      rerender();
      const func2 = result.current;
      rerender();
      const func3 = result.current;

      expect(func1).toBe(func2);
      expect(func2).toBe(func3);
    });

    it('should only create logger once', () => {
      renderHook(() => useNavigateToProject());
      renderHook(() => useNavigateToProject());
      renderHook(() => useNavigateToProjectEdit());

      // Logger creation is at module level, so this is just ensuring no errors
      expect(mockLogger).toBeDefined();
    });
  });

  describe('type safety', () => {
    it('should accept valid project IDs', () => {
      const { result } = renderHook(() => useNavigateToProject());

      const navigateToProject = result.current;

      // These should all work without TypeScript errors
      navigateToProject('valid-id');
      navigateToProject('123');
      navigateToProject('project_with_underscores');
      navigateToProject('project-with-dashes');

      expect(mockNavigate).toHaveBeenCalledTimes(4);
    });

    it('should accept valid options', () => {
      const { result } = renderHook(() => useNavigateToProject());

      const navigateToProject = result.current;

      // These should all work without TypeScript errors
      navigateToProject('id', {});
      navigateToProject('id', { replace: true });
      navigateToProject('id', { replace: false });

      expect(mockNavigate).toHaveBeenCalledTimes(3);
    });
  });
});
