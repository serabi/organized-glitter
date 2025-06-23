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
describe('edge cases and boundary conditions', () => {
    it('should handle empty string path navigation', async () => {
      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: false,
        })
      );

      await act(async () => {
        await result.current.navigateWithWarning('');
      });

      expect(mockNavigate).toHaveBeenCalledWith('', undefined);
    });

    it('should handle special characters in navigation path', async () => {
      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: false,
        })
      );

      const specialPath = '/test-path?query=value&param=123#anchor';
      
      await act(async () => {
        await result.current.navigateWithWarning(specialPath);
      });

      expect(mockNavigate).toHaveBeenCalledWith(specialPath, undefined);
    });

    it('should handle extremely long navigation paths', async () => {
      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: false,
        })
      );

      const longPath = '/' + 'a'.repeat(1000);
      
      await act(async () => {
        await result.current.navigateWithWarning(longPath);
      });

      expect(mockNavigate).toHaveBeenCalledWith(longPath, undefined);
    });

    it('should handle navigation with null/undefined paths gracefully', async () => {
      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: false,
        })
      );

      await act(async () => {
        await result.current.navigateWithWarning(null as any);
      });

      expect(mockNavigate).toHaveBeenCalledWith(null, undefined);
    });
  });

  describe('dynamic isDirty state changes', () => {
    it('should handle isDirty state changes between renders', async () => {
      let isDirty = false;
      const { result, rerender } = renderHook(({ isDirty }) =>
        useNavigationWithWarning({
          isDirty,
        }), {
          initialProps: { isDirty }
        }
      );

      // First navigation without dirty state
      await act(async () => {
        await result.current.navigateWithWarning('/test-path-1');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/test-path-1', undefined);
      expect(window.confirm).not.toHaveBeenCalled();

      // Change to dirty state
      isDirty = true;
      rerender({ isDirty });

      (window.confirm as vi.MockedFunction<typeof window.confirm>).mockReturnValue(true);

      // Second navigation with dirty state
      await act(async () => {
        await result.current.navigateWithWarning('/test-path-2');
      });

      expect(window.confirm).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/test-path-2', undefined);
    });

    it('should handle rapid isDirty state toggles', async () => {
      let isDirty = false;
      const { result, rerender } = renderHook(({ isDirty }) =>
        useNavigationWithWarning({
          isDirty,
        }), {
          initialProps: { isDirty }
        }
      );

      // Toggle isDirty rapidly
      for (let i = 0; i < 5; i++) {
        isDirty = !isDirty;
        rerender({ isDirty });
      }

      // Final state is dirty, so should show confirmation
      (window.confirm as vi.MockedFunction<typeof window.confirm>).mockReturnValue(true);

      await act(async () => {
        await result.current.navigateWithWarning('/test-path');
      });

      expect(window.confirm).toHaveBeenCalled();
    });
  });

  describe('complex navigation options', () => {
    it('should handle complex navigation options object', async () => {
      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: false,
        })
      );

      const complexOptions = {
        replace: true,
        state: { from: 'test', data: { key: 'value' } },
        preventScrollReset: true
      };

      await act(async () => {
        await result.current.navigateWithWarning('/test-path', complexOptions);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/test-path', complexOptions);
    });

    it('should preserve navigation options through confirmation flow', async () => {
      (window.confirm as vi.MockedFunction<typeof window.confirm>).mockReturnValue(true);

      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
        })
      );

      const options = { replace: true, state: { test: true } };

      await act(async () => {
        await result.current.navigateWithWarning('/test-path', options);
      });

      expect(window.confirm).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/test-path', options);
    });
  });

  describe('confirmation dialog error handling', () => {
    it('should handle ConfirmationDialog throwing errors', async () => {
      const mockConfirmWithError = vi.fn().mockRejectedValue(new Error('Dialog error'));

      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
          confirmationDialog: { confirmUnsavedChanges: mockConfirmWithError },
        })
      );

      await act(async () => {
        await result.current.navigateWithWarning('/test-path');
      });

      expect(mockConfirmWithError).toHaveBeenCalledWith('navigate');
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(result.current.navigationState.error).toBe('Dialog error');
    });

    it('should handle window.confirm throwing errors', async () => {
      (window.confirm as vi.MockedFunction<typeof window.confirm>).mockImplementation(() => {
        throw new Error('Confirm error');
      });

      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
        })
      );

      await act(async () => {
        await result.current.navigateWithWarning('/test-path');
      });

      expect(result.current.navigationState.error).toBe('Confirm error');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('concurrent navigation attempts', () => {
    it('should handle multiple simultaneous navigation calls', async () => {
      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: false,
        })
      );

      const promises = [
        result.current.navigateWithWarning('/path-1'),
        result.current.navigateWithWarning('/path-2'),
        result.current.navigateWithWarning('/path-3')
      ];

      await act(async () => {
        await Promise.all(promises);
      });

      // Should have called navigate for all paths
      expect(mockNavigate).toHaveBeenCalledTimes(3);
      expect(mockNavigate).toHaveBeenCalledWith('/path-1', undefined);
      expect(mockNavigate).toHaveBeenCalledWith('/path-2', undefined);
      expect(mockNavigate).toHaveBeenCalledWith('/path-3', undefined);
    });

    it('should handle navigation during existing navigation', async () => {
      let resolveNavigation: () => void;
      const navigationPromise = new Promise<void>((resolve) => {
        resolveNavigation = resolve;
      });

      mockNavigate.mockImplementation(() => navigationPromise);

      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: false,
        })
      );

      // Start first navigation
      const firstNavigation = act(async () => {
        await result.current.navigateWithWarning('/path-1');
      });

      expect(result.current.navigationState.isNavigating).toBe(true);

      // Start second navigation while first is in progress
      const secondNavigation = act(async () => {
        await result.current.navigateWithWarning('/path-2');
      });

      // Resolve the navigation
      resolveNavigation!();
      
      await firstNavigation;
      await secondNavigation;

      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });
  });

  describe('message customization', () => {
    it('should use default message when none provided', async () => {
      (window.confirm as vi.MockedFunction<typeof window.confirm>).mockReturnValue(true);

      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
        })
      );

      await act(async () => {
        await result.current.navigateWithWarning('/test-path');
      });

      expect(window.confirm).toHaveBeenCalledWith(expect.any(String));
      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('unsaved changes'));
    });

    it('should handle empty message string', async () => {
      (window.confirm as vi.MockedFunction<typeof window.confirm>).mockReturnValue(true);

      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
          message: '',
        })
      );

      await act(async () => {
        await result.current.navigateWithWarning('/test-path');
      });

      expect(window.confirm).toHaveBeenCalledWith('');
    });

    it('should handle very long custom messages', async () => {
      (window.confirm as vi.MockedFunction<typeof window.confirm>).mockReturnValue(true);

      const longMessage = 'This is a very long message that exceeds typical lengths. '.repeat(10);
      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
          message: longMessage,
        })
      );

      await act(async () => {
        await result.current.navigateWithWarning('/test-path');
      });

      expect(window.confirm).toHaveBeenCalledWith(longMessage);
    });
  });

  describe('force navigation edge cases', () => {
    it('should handle force navigation with null path using smartNavigation', () => {
      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
        })
      );

      act(() => {
        result.current.forceNavigate(null as any);
      });

      expect(mockNavigate).toHaveBeenCalledWith(null, {});
    });

    it('should handle force navigation with undefined options', () => {
      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
        })
      );

      act(() => {
        result.current.forceNavigate('/test-path', undefined);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/test-path', {});
    });

    it('should handle window.location assignment errors', () => {
      // Mock window.location to throw an error
      Object.defineProperty(window, 'location', {
        writable: true,
        value: {
          set href(value: string) {
            throw new Error('Location assignment failed');
          }
        }
      });

      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
        })
      );

      expect(() => {
        act(() => {
          result.current.forceNavigate('/test-path', { smartNavigation: false });
        });
      }).toThrow('Location assignment failed');
    });
  });

  describe('beforeunload event edge cases', () => {
    it('should handle beforeunload event when isDirty is false', () => {
      renderHook(() =>
        useNavigationWithWarning({
          isDirty: false,
        })
      );

      // Get the beforeunload handler
      const beforeunloadHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'beforeunload'
      )?.[1];

      expect(beforeunloadHandler).toBeDefined();

      // Call the handler with a mock event
      const mockEvent = { preventDefault: vi.fn(), returnValue: '' };
      beforeunloadHandler(mockEvent);

      // Should not prevent default or set returnValue when not dirty
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.returnValue).toBe('');
    });

    it('should handle beforeunload event when isDirty is true', () => {
      renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
        })
      );

      // Get the beforeunload handler
      const beforeunloadHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'beforeunload'
      )?.[1];

      expect(beforeunloadHandler).toBeDefined();

      // Call the handler with a mock event
      const mockEvent = { preventDefault: vi.fn(), returnValue: '' };
      beforeunloadHandler(mockEvent);

      // Should prevent default and set returnValue when dirty
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.returnValue).toBe('');
    });
  });

  describe('hook unmounting and cleanup', () => {
    it('should handle unmounting during navigation', async () => {
      const { result, unmount } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: false,
        })
      );

      const navigationPromise = act(async () => {
        await result.current.navigateWithWarning('/test-path');
      });

      // Unmount before navigation completes
      unmount();

      await navigationPromise;

      expect(mockRemoveEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('should handle multiple unmounts gracefully', () => {
      const { unmount } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
        })
      );

      unmount();
      
      // Second unmount should not cause errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should handle rapid state changes and navigation attempts', async () => {
      let isDirty = false;
      const { result, rerender } = renderHook(({ isDirty }) =>
        useNavigationWithWarning({
          isDirty,
        }), {
          initialProps: { isDirty }
        }
      );

      // Rapid state changes with navigation attempts
      for (let i = 0; i < 10; i++) {
        isDirty = !isDirty;
        rerender({ isDirty });
        
        if (isDirty) {
          (window.confirm as vi.MockedFunction<typeof window.confirm>).mockReturnValue(i % 2 === 0);
        }

        await act(async () => {
          await result.current.navigateWithWarning(`/path-${i}`);
        });
      }

      // Should have attempted navigation for all iterations
      expect(mockNavigate).toHaveBeenCalled();
    });

    it('should maintain consistent state across complex interaction patterns', async () => {
      const { result } = renderHook(() =>
        useNavigationWithWarning({
          isDirty: true,
          confirmationDialog: { confirmUnsavedChanges: mockConfirmUnsavedChanges },
        })
      );

      // Test various interaction patterns
      mockConfirmUnsavedChanges.mockResolvedValue(false);
      await act(async () => {
        await result.current.navigateWithWarning('/cancelled-path');
      });
      expect(mockNavigate).not.toHaveBeenCalled();

      mockConfirmUnsavedChanges.mockResolvedValue(true);
      await act(async () => {
        await result.current.navigateWithWarning('/confirmed-path');
      });
      expect(mockNavigate).toHaveBeenCalledWith('/confirmed-path', undefined);

      act(() => {
        result.current.forceNavigate('/forced-path');
      });
      expect(mockNavigate).toHaveBeenCalledWith('/forced-path', {});

      act(() => {
        result.current.unsafeNavigate('/unsafe-path');
      });
      expect(mockNavigate).toHaveBeenCalledWith('/unsafe-path', undefined);
    });
  });
