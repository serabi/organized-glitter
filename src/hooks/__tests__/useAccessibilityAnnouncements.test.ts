/**
 * @fileoverview Tests for Accessibility Announcements Hook
 *
 * Tests the useAccessibilityAnnouncements hook functionality including
 * screen reader announcements, ARIA live regions, and focus management.
 *
 * @author serabi
 * @version 1.0.0
 * @since 2025-07-19
 */

import { renderHook, act } from '@testing-library/react';
import {
  useAccessibilityAnnouncements,
  useFocusManagement,
} from '../useAccessibilityAnnouncements';
import { vi } from 'vitest';

// Mock logger
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('useAccessibilityAnnouncements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should provide announcement functions and refs', () => {
    const { result } = renderHook(() => useAccessibilityAnnouncements());

    expect(result.current.announce).toBeInstanceOf(Function);
    expect(result.current.clearAnnouncements).toBeInstanceOf(Function);
    expect(result.current.announceSpinStart).toBeInstanceOf(Function);
    expect(result.current.announceSpinResult).toBeInstanceOf(Function);
    expect(result.current.announceKeyboardInstructions).toBeInstanceOf(Function);
    expect(result.current.announceTouchInstructions).toBeInstanceOf(Function);
    expect(result.current.liveRegionRef).toBeDefined();
    expect(result.current.statusRef).toBeDefined();
  });

  it('should make polite announcements', () => {
    const { result } = renderHook(() => useAccessibilityAnnouncements());

    // Create mock DOM elements
    const mockLiveRegion = document.createElement('div');
    const mockStatusRegion = document.createElement('div');

    // Mock the refs
    Object.defineProperty(result.current.liveRegionRef, 'current', {
      value: mockLiveRegion,
      writable: true,
    });
    Object.defineProperty(result.current.statusRef, 'current', {
      value: mockStatusRegion,
      writable: true,
    });

    act(() => {
      result.current.announce('Test polite message', { priority: 'polite' });
    });

    expect(mockLiveRegion.textContent).toBe('Test polite message');
  });

  it('should make assertive announcements', () => {
    const { result } = renderHook(() => useAccessibilityAnnouncements());

    // Create mock DOM elements
    const mockLiveRegion = document.createElement('div');
    const mockStatusRegion = document.createElement('div');

    // Mock the refs
    Object.defineProperty(result.current.liveRegionRef, 'current', {
      value: mockLiveRegion,
      writable: true,
    });
    Object.defineProperty(result.current.statusRef, 'current', {
      value: mockStatusRegion,
      writable: true,
    });

    act(() => {
      result.current.announce('Test assertive message', { priority: 'assertive' });
    });

    expect(mockStatusRegion.textContent).toBe('Test assertive message');
  });

  it('should clear previous announcements when requested', () => {
    const { result } = renderHook(() => useAccessibilityAnnouncements());

    // Create mock DOM elements
    const mockLiveRegion = document.createElement('div');
    const mockStatusRegion = document.createElement('div');

    // Mock the refs
    Object.defineProperty(result.current.liveRegionRef, 'current', {
      value: mockLiveRegion,
      writable: true,
    });
    Object.defineProperty(result.current.statusRef, 'current', {
      value: mockStatusRegion,
      writable: true,
    });

    // Set initial content
    mockLiveRegion.textContent = 'Previous message';

    act(() => {
      result.current.announce('New message', { clearPrevious: true });
    });

    // Should clear first, then set new message after delay
    expect(mockLiveRegion.textContent).toBe('');

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockLiveRegion.textContent).toBe('New message');
  });

  it('should handle delayed announcements', () => {
    const { result } = renderHook(() => useAccessibilityAnnouncements());

    // Create mock DOM elements
    const mockLiveRegion = document.createElement('div');
    const mockStatusRegion = document.createElement('div');

    // Mock the refs
    Object.defineProperty(result.current.liveRegionRef, 'current', {
      value: mockLiveRegion,
      writable: true,
    });
    Object.defineProperty(result.current.statusRef, 'current', {
      value: mockStatusRegion,
      writable: true,
    });

    act(() => {
      result.current.announce('Delayed message', { delay: 500 });
    });

    // Should not be announced immediately
    expect(mockLiveRegion.textContent).toBe('');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockLiveRegion.textContent).toBe('Delayed message');
  });

  it('should announce spin start correctly', () => {
    const { result } = renderHook(() => useAccessibilityAnnouncements());

    // Create mock DOM elements
    const mockStatusRegion = document.createElement('div');

    // Mock the refs
    Object.defineProperty(result.current.statusRef, 'current', {
      value: mockStatusRegion,
      writable: true,
    });

    act(() => {
      result.current.announceSpinStart(5);
    });

    // Should clear first, then set message after delay
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockStatusRegion.textContent).toBe(
      'Spinning wheel to randomly select from 5 projects. Please wait for the result...'
    );
  });

  it('should announce spin result correctly', () => {
    const { result } = renderHook(() => useAccessibilityAnnouncements());

    // Create mock DOM elements
    const mockStatusRegion = document.createElement('div');

    // Mock the refs
    Object.defineProperty(result.current.statusRef, 'current', {
      value: mockStatusRegion,
      writable: true,
    });

    act(() => {
      result.current.announceSpinResult('Test Project', 'Test Company');
    });

    // Should clear first, then set message after delay (100ms + 50ms for clearPrevious)
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(mockStatusRegion.textContent).toBe(
      'Spin complete! Selected project: Test Project by Test Company'
    );
  });

  it('should clear all announcements', () => {
    const { result } = renderHook(() => useAccessibilityAnnouncements());

    // Create mock DOM elements
    const mockLiveRegion = document.createElement('div');
    const mockStatusRegion = document.createElement('div');

    // Mock the refs
    Object.defineProperty(result.current.liveRegionRef, 'current', {
      value: mockLiveRegion,
      writable: true,
    });
    Object.defineProperty(result.current.statusRef, 'current', {
      value: mockStatusRegion,
      writable: true,
    });

    // Set some content
    mockLiveRegion.textContent = 'Live message';
    mockStatusRegion.textContent = 'Status message';

    act(() => {
      result.current.clearAnnouncements();
    });

    expect(mockLiveRegion.textContent).toBe('');
    expect(mockStatusRegion.textContent).toBe('');
  });
});

describe('useFocusManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide focus management functions', () => {
    const { result } = renderHook(() => useFocusManagement());

    expect(result.current.setFocus).toBeInstanceOf(Function);
    expect(result.current.removeFocus).toBeInstanceOf(Function);
    expect(result.current.isFocusable).toBeInstanceOf(Function);
    expect(result.current.getFocusableElements).toBeInstanceOf(Function);
    expect(result.current.focusedElementRef).toBeDefined();
    expect(result.current.focusTrapActiveRef).toBeDefined();
  });

  it('should set focus on element', () => {
    const { result } = renderHook(() => useFocusManagement());

    const mockElement = document.createElement('button');
    const focusSpy = vi.spyOn(mockElement, 'focus');

    act(() => {
      result.current.setFocus(mockElement);
    });

    expect(focusSpy).toHaveBeenCalled();
    expect(result.current.focusedElementRef.current).toBe(mockElement);
  });

  it('should remove focus from current element', () => {
    const { result } = renderHook(() => useFocusManagement());

    const mockElement = document.createElement('button');
    const blurSpy = vi.spyOn(mockElement, 'blur');

    // Set focus first
    act(() => {
      result.current.setFocus(mockElement);
    });

    // Then remove focus
    act(() => {
      result.current.removeFocus();
    });

    expect(blurSpy).toHaveBeenCalled();
    expect(result.current.focusedElementRef.current).toBeNull();
  });

  it('should identify focusable elements correctly', () => {
    const { result } = renderHook(() => useFocusManagement());

    const button = document.createElement('button');
    const input = document.createElement('input');
    const div = document.createElement('div');
    const disabledButton = document.createElement('button');
    disabledButton.disabled = true;

    expect(result.current.isFocusable(button)).toBe(true);
    expect(result.current.isFocusable(input)).toBe(true);
    expect(result.current.isFocusable(div)).toBe(false);
    expect(result.current.isFocusable(disabledButton)).toBe(false);
  });

  it('should get focusable elements from container', () => {
    const { result } = renderHook(() => useFocusManagement());

    const container = document.createElement('div');
    const button = document.createElement('button');
    const input = document.createElement('input');
    const div = document.createElement('div');

    container.appendChild(button);
    container.appendChild(input);
    container.appendChild(div);

    const focusableElements = result.current.getFocusableElements(container);

    expect(focusableElements).toHaveLength(2);
    expect(focusableElements).toContain(button);
    expect(focusableElements).toContain(input);
    expect(focusableElements).not.toContain(div);
  });

  it('should handle focus errors gracefully', () => {
    const { result } = renderHook(() => useFocusManagement());

    const mockElement = {
      focus: vi.fn().mockImplementation(() => {
        throw new Error('Focus failed');
      }),
    } as any;

    // Should not throw
    expect(() => {
      act(() => {
        result.current.setFocus(mockElement);
      });
    }).not.toThrow();

    expect(mockElement.focus).toHaveBeenCalled();
  });
});
