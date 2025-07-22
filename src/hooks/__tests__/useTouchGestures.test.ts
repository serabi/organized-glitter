/**
 * @fileoverview Tests for Touch Gestures Hook
 *
 * Tests the useTouchGestures hook functionality including swipe detection,
 * touch optimization, and gesture-based interactions.
 *
 * @author serabi
 * @version 1.0.0
 * @since 2025-07-19
 */

import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useTouchGestures, useWheelTouchGestures } from '../useTouchGestures';

// Mock dependencies
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsTouchDevice: vi.fn(() => true),
}));

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true,
});

describe('useTouchGestures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should provide touch handlers and utilities', () => {
    const { result } = renderHook(() => useTouchGestures());

    expect(result.current.touchHandlers).toBeDefined();
    expect(result.current.touchHandlers.onTouchStart).toBeInstanceOf(Function);
    expect(result.current.touchHandlers.onTouchEnd).toBeInstanceOf(Function);
    expect(result.current.touchHandlers.onTouchMove).toBeInstanceOf(Function);
    expect(result.current.isTouch).toBe(true);
    expect(result.current.triggerHapticFeedback).toBeInstanceOf(Function);
  });

  it('should detect swipe gestures', () => {
    const onSwipe = vi.fn();
    const { result } = renderHook(() => useTouchGestures({ onSwipe }));

    // Create mock touch events
    const touchStart = {
      touches: [{ clientX: 100, clientY: 100, identifier: 0 }],
    } as TouchEvent;

    const touchEnd = {
      changedTouches: [{ clientX: 100, clientY: 50, identifier: 0 }],
    } as TouchEvent;

    // Simulate touch start
    act(() => {
      result.current.touchHandlers.onTouchStart(touchStart);
    });

    // Simulate touch end after short delay (swipe up)
    act(() => {
      vi.advanceTimersByTime(100);
      result.current.touchHandlers.onTouchEnd(touchEnd);
    });

    expect(onSwipe).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'swipe',
        direction: 'up',
        distance: expect.any(Number),
        velocity: expect.any(Number),
      })
    );
  });

  it('should detect tap gestures', () => {
    const onTap = vi.fn();
    const { result } = renderHook(() => useTouchGestures({ onTap }));

    // Create mock touch events for tap (same position)
    const touchStart = {
      touches: [{ clientX: 100, clientY: 100, identifier: 0 }],
    } as TouchEvent;

    const touchEnd = {
      changedTouches: [{ clientX: 102, clientY: 101, identifier: 0 }],
    } as TouchEvent;

    // Simulate touch start
    act(() => {
      result.current.touchHandlers.onTouchStart(touchStart);
    });

    // Simulate quick touch end (tap)
    act(() => {
      vi.advanceTimersByTime(100);
      result.current.touchHandlers.onTouchEnd(touchEnd);
    });

    expect(onTap).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tap',
        duration: expect.any(Number),
      })
    );
  });

  it('should detect long press gestures', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useTouchGestures({ onLongPress }));

    // Create mock touch event
    const touchStart = {
      touches: [{ clientX: 100, clientY: 100, identifier: 0 }],
    } as TouchEvent;

    // Simulate touch start
    act(() => {
      result.current.touchHandlers.onTouchStart(touchStart);
    });

    // Advance time to trigger long press
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onLongPress).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'longpress',
        duration: expect.any(Number),
      })
    );
  });

  it('should trigger haptic feedback', () => {
    const { result } = renderHook(() => useTouchGestures());

    act(() => {
      result.current.triggerHapticFeedback('medium');
    });

    expect(navigator.vibrate).toHaveBeenCalledWith([20]);
  });

  it('should handle touch move to cancel long press', () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useTouchGestures({ onLongPress }));

    // Create mock touch events
    const touchStart = {
      touches: [{ clientX: 100, clientY: 100, identifier: 0 }],
    } as TouchEvent;

    const touchMove = {
      touches: [{ clientX: 120, clientY: 100, identifier: 0 }],
    } as TouchEvent;

    // Simulate touch start
    act(() => {
      result.current.touchHandlers.onTouchStart(touchStart);
    });

    // Simulate touch move (should cancel long press)
    act(() => {
      result.current.touchHandlers.onTouchMove(touchMove);
    });

    // Advance time past long press threshold
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Long press should not have been triggered
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('should handle multiple touches correctly', () => {
    const onSwipe = vi.fn();
    const { result } = renderHook(() => useTouchGestures({ onSwipe }));

    // Create mock touch event with multiple touches
    const touchStart = {
      touches: [
        { clientX: 100, clientY: 100, identifier: 0 },
        { clientX: 200, clientY: 100, identifier: 1 },
      ],
    } as TouchEvent;

    // Should not handle multiple touches
    act(() => {
      result.current.touchHandlers.onTouchStart(touchStart);
    });

    // Verify no gesture tracking started
    const touchEnd = {
      changedTouches: [{ clientX: 100, clientY: 50, identifier: 0 }],
    } as TouchEvent;

    act(() => {
      result.current.touchHandlers.onTouchEnd(touchEnd);
    });

    expect(onSwipe).not.toHaveBeenCalled();
  });
});

describe('useWheelTouchGestures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should provide wheel-specific touch handlers', () => {
    const onSpin = vi.fn();
    const { result } = renderHook(() => useWheelTouchGestures(onSpin));

    expect(result.current.wheelTouchHandlers).toBeDefined();
    expect(result.current.isTouch).toBe(true);
    expect(result.current.touchFeedback).toBe('');
    expect(result.current.showTouchFeedback).toBeInstanceOf(Function);
    expect(result.current.triggerHapticFeedback).toBeInstanceOf(Function);
  });

  it('should trigger spin on upward swipe with sufficient velocity', () => {
    const onSpin = vi.fn();
    const { result } = renderHook(() => useWheelTouchGestures(onSpin));

    // Create mock touch events for upward swipe
    const touchStart = {
      touches: [{ clientX: 100, clientY: 200, identifier: 0 }],
    } as TouchEvent;

    const touchEnd = {
      changedTouches: [{ clientX: 100, clientY: 100, identifier: 0 }],
    } as TouchEvent;

    // Simulate touch start
    act(() => {
      result.current.wheelTouchHandlers.onTouchStart(touchStart);
    });

    // Simulate quick upward swipe
    act(() => {
      vi.advanceTimersByTime(100);
      result.current.wheelTouchHandlers.onTouchEnd(touchEnd);
    });

    expect(onSpin).toHaveBeenCalled();
  });

  it('should show feedback for slow upward swipe', () => {
    const onSpin = vi.fn();
    const { result } = renderHook(() => useWheelTouchGestures(onSpin));

    // Create mock touch events for upward swipe with sufficient distance but low velocity
    const touchStart = {
      touches: [{ clientX: 100, clientY: 150, identifier: 0 }],
    } as TouchEvent;

    const touchEnd = {
      changedTouches: [{ clientX: 100, clientY: 100, identifier: 0 }],
    } as TouchEvent;

    // Simulate touch start
    act(() => {
      result.current.wheelTouchHandlers.onTouchStart(touchStart);
    });

    // Simulate slow upward swipe (shorter than long press timeout but slow enough for low velocity)
    act(() => {
      vi.advanceTimersByTime(300); // Less than 500ms long press timeout
      result.current.wheelTouchHandlers.onTouchEnd(touchEnd);
    });

    expect(onSpin).not.toHaveBeenCalled();
    expect(result.current.touchFeedback).toBe('Swipe faster to spin!');
  });

  it('should not trigger spin when disabled', () => {
    const onSpin = vi.fn();
    const { result } = renderHook(() => useWheelTouchGestures(onSpin, true));

    // Create mock touch events
    const touchStart = {
      touches: [{ clientX: 100, clientY: 200, identifier: 0 }],
    } as TouchEvent;

    const touchEnd = {
      changedTouches: [{ clientX: 100, clientY: 100, identifier: 0 }],
    } as TouchEvent;

    // Simulate touch gestures
    act(() => {
      result.current.wheelTouchHandlers.onTouchStart(touchStart);
    });

    act(() => {
      vi.advanceTimersByTime(100);
      result.current.wheelTouchHandlers.onTouchEnd(touchEnd);
    });

    expect(onSpin).not.toHaveBeenCalled();
  });

  it('should show touch feedback and clear it after timeout', () => {
    const onSpin = vi.fn();
    const { result } = renderHook(() => useWheelTouchGestures(onSpin));

    act(() => {
      result.current.showTouchFeedback('Test feedback', 1000);
    });

    expect(result.current.touchFeedback).toBe('Test feedback');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.touchFeedback).toBe('');
  });

  it('should show instructions on long press', () => {
    const onSpin = vi.fn();
    const { result } = renderHook(() => useWheelTouchGestures(onSpin));

    // Create mock touch event
    const touchStart = {
      touches: [{ clientX: 100, clientY: 100, identifier: 0 }],
    } as TouchEvent;

    // Simulate touch start
    act(() => {
      result.current.wheelTouchHandlers.onTouchStart(touchStart);
    });

    // Advance time to trigger long press
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.touchFeedback).toBe('Use swipe up gesture or tap the spin button');
  });
});
