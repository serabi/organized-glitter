import { renderHook, act, waitFor } from '@testing-library/react';
import { useNavigationWithWarning } from '../useNavigationWithWarning';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(),
});

// Mock window.addEventListener and removeEventListener
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
Object.defineProperty(window, 'addEventListener', {
  writable: true,
  value: mockAddEventListener,
});
Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  value: mockRemoveEventListener,
});

describe('useNavigationWithWarning', () => {
  const mockConfirmUnsavedChanges = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('basic navigation without unsaved changes', () => {
    it('should navigate directly when no unsaved changes', async () => {
      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: false,
        })
      );

      await act(async () => {
        await result.current.navigateWithWarning('/test-path');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/test-path', undefined);
      expect(window.confirm).not.toHaveBeenCalled();
    });

    it('should handle navigation options correctly', async () => {
      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: false,
        })
      );

      await act(async () => {
        await result.current.navigateWithWarning('/test-path', { replace: true });
      });

      expect(mockNavigate).toHaveBeenCalledWith('/test-path', { replace: true });
    });
  });

  describe('navigation with unsaved changes - window.confirm fallback', () => {
    it('should show confirmation dialog when isDirty is true', async () => {
      (window.confirm as vi.MockedFunction<typeof window.confirm>).mockReturnValue(true);

      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
          message: 'Custom warning message',
        })
      );

      await act(async () => {
        await result.current.navigateWithWarning('/test-path');
      });

      expect(window.confirm).toHaveBeenCalledWith('Custom warning message');
      expect(mockNavigate).toHaveBeenCalledWith('/test-path', undefined);
    });

    it('should not navigate when user cancels confirmation', async () => {
      (window.confirm as vi.MockedFunction<typeof window.confirm>).mockReturnValue(false);

      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
        })
      );

      await act(async () => {
        await result.current.navigateWithWarning('/test-path');
      });

      expect(window.confirm).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('navigation with unsaved changes - ConfirmationDialog', () => {
    it('should use ConfirmationDialog when provided', async () => {
      mockConfirmUnsavedChanges.mockResolvedValue(true);

      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
          confirmationDialog: { confirmUnsavedChanges: mockConfirmUnsavedChanges },
        })
      );

      await act(async () => {
        await result.current.navigateWithWarning('/test-path');
      });

      expect(mockConfirmUnsavedChanges).toHaveBeenCalledWith('navigate');
      expect(mockNavigate).toHaveBeenCalledWith('/test-path', undefined);
      expect(window.confirm).not.toHaveBeenCalled();
    });

    it('should not navigate when ConfirmationDialog is cancelled', async () => {
      mockConfirmUnsavedChanges.mockResolvedValue(false);

      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
          confirmationDialog: { confirmUnsavedChanges: mockConfirmUnsavedChanges },
        })
      );

      await act(async () => {
        await result.current.navigateWithWarning('/test-path');
      });

      expect(mockConfirmUnsavedChanges).toHaveBeenCalledWith('navigate');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('force navigation', () => {
    it('should force navigate with smart navigation by default', () => {
      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
        })
      );

      act(() => {
        result.current.forceNavigate('/test-path');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/test-path', {});
    });

    it('should use window.location when smartNavigation is disabled', () => {
      (window as unknown as { location?: unknown }).location = undefined;
      (window as unknown as { location: { href: string } }).location = { href: '' };

      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
        })
      );

      act(() => {
        result.current.forceNavigate('/test-path', { smartNavigation: false });
      });

      expect(window.location.href).toBe('/test-path');
    });
  });

  describe('navigation state management', () => {
    it('should track navigation state correctly', async () => {
      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: false,
        })
      );

      expect(result.current.navigationState.isNavigating).toBe(false);
      expect(result.current.navigationState.error).toBe(null);

      await act(async () => {
        await result.current.navigateWithWarning('/test-path');
      });

      // Navigation state should be reset after successful navigation
      expect(result.current.navigationState.isNavigating).toBe(false);
    });

    it('should handle navigation errors', async () => {
      mockNavigate.mockImplementation(() => {
        throw new Error('Navigation failed');
      });

      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: false,
        })
      );

      await act(async () => {
        await result.current.navigateWithWarning('/test-path');
      });

      expect(result.current.navigationState.error).toBe('Navigation failed');
      expect(result.current.navigationState.isNavigating).toBe(false);
    });

    it('should clear navigation errors', async () => {
      mockNavigate.mockImplementation(() => {
        throw new Error('Navigation failed');
      });

      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: false,
        })
      );

      await act(async () => {
        await result.current.navigateWithWarning('/test-path');
      });

      expect(result.current.navigationState.error).toBe('Navigation failed');

      act(() => {
        result.current.clearNavigationError();
      });

      expect(result.current.navigationState.error).toBe(null);
    });
  });

  describe('beforeunload event handling', () => {
    it('should add beforeunload listener when component mounts', () => {
      renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
        })
      );

      expect(mockAddEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('should remove beforeunload listener when component unmounts', () => {
      const { unmount } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
        })
      );

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });
  });

  describe('unsafe navigation', () => {
    it('should navigate without confirmation using unsafeNavigate', () => {
      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
        })
      );

      act(() => {
        result.current.unsafeNavigate('/test-path');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/test-path', undefined);
      expect(window.confirm).not.toHaveBeenCalled();
    });
  });
});
