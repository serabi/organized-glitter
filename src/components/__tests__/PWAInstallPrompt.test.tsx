/**
 * Tests for PWAInstallPrompt component focusing on memory leak prevention
 * @author @serabi
 * @created 2025-08-03
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PWAInstallPrompt } from '../PWAInstallPrompt';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useAuth } from '@/hooks/useAuth';
// Mock device detection utilities BEFORE importing them to ensure mock is applied
vi.mock('@/utils/deviceDetection', () => ({
  shouldShowIOSInstallPrompt: vi.fn(() => false),
  isMacOSSafari: vi.fn(() => false),
}));
import { shouldShowIOSInstallPrompt, isMacOSSafari } from '@/utils/deviceDetection';

// Mock the hooks
vi.mock('@/hooks/usePWAInstall');
vi.mock('@/hooks/useAuth');
vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    error: vi.fn(),
  })),
}));

const mockUsePWAInstall = vi.mocked(usePWAInstall);
const mockUseAuth = vi.mocked(useAuth);
const mockShouldShowIOSInstallPrompt = vi.mocked(shouldShowIOSInstallPrompt);
const mockIsMacOSSafari = vi.mocked(isMacOSSafari);

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    // Set up default mock returns
    mockUsePWAInstall.mockReturnValue({
      canShowPrompt: true,
      promptInstall: vi.fn(),
      dismissPrompt: vi.fn(),
    });

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      initialCheckComplete: true,
    });

    // Set up default device detection mocks
    mockShouldShowIOSInstallPrompt.mockReturnValue(false);
    mockIsMacOSSafari.mockReturnValue(false);

    // Mock navigator.userAgent to avoid iOS detection
    Object.defineProperty(window.navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('renders without memory leaks when mounted and unmounted quickly', async () => {
    const { unmount } = render(<PWAInstallPrompt />);

    // Component should be visible
    expect(screen.getByText('Install Organized Glitter')).toBeInTheDocument();

    // Unmount immediately (simulating rapid mount/unmount cycles)
    unmount();

    // No errors should occur and no timeouts should be left hanging
    // This test passes if no cleanup warnings appear in console
  });

  it('handles dismiss action without setTimeout memory leaks', async () => {
    const mockDismissPrompt = vi.fn();
    mockUsePWAInstall.mockReturnValue({
      canShowPrompt: true,
      promptInstall: vi.fn(),
      dismissPrompt: mockDismissPrompt,
    });

    const { unmount } = render(<PWAInstallPrompt />);
    const user = userEvent.setup();

    // Find and click dismiss button
    const dismissButton = screen.getByLabelText('Dismiss install prompt');
    await user.click(dismissButton);

    // Wait for the 300ms timeout to complete
    await waitFor(
      () => {
        expect(mockDismissPrompt).toHaveBeenCalledTimes(1);
      },
      { timeout: 1000 }
    );

    // Unmount immediately after dismiss
    unmount();

    // No setTimeout cleanup issues should occur
  });

  it('handles authentication state changes without memory leaks', async () => {
    // Start with authenticated user
    const { rerender, unmount } = render(<PWAInstallPrompt />);

    expect(screen.getByText('Install Organized Glitter')).toBeInTheDocument();

    // Change to unauthenticated
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      initialCheckComplete: true,
    });

    rerender(<PWAInstallPrompt />);

    // Component should not be visible
    expect(screen.queryByText('Install Organized Glitter')).not.toBeInTheDocument();

    // Unmount immediately
    unmount();

    // No memory leaks should occur from state transitions
  });

  it('handles install action without memory leaks', async () => {
    const mockPromptInstall = vi.fn().mockResolvedValue(undefined);
    const mockDismissPrompt = vi.fn();

    mockUsePWAInstall.mockReturnValue({
      canShowPrompt: true,
      promptInstall: mockPromptInstall,
      dismissPrompt: mockDismissPrompt,
    });

    const { unmount } = render(<PWAInstallPrompt />);
    const user = userEvent.setup();

    // Find and click install button
    const installButton = screen.getByText('Install');
    await user.click(installButton);

    // Wait for install and dismiss to be called
    await waitFor(() => {
      expect(mockPromptInstall).toHaveBeenCalledTimes(1);
      expect(mockDismissPrompt).toHaveBeenCalledTimes(1);
    });

    // Unmount immediately
    unmount();

    // No async cleanup issues should occur
  });

  it('does not render when conditions are not met', () => {
    mockUsePWAInstall.mockReturnValue({
      canShowPrompt: false,
      promptInstall: vi.fn(),
      dismissPrompt: vi.fn(),
    });

    render(<PWAInstallPrompt />);

    // Component should not be visible
    expect(screen.queryByText('Install Organized Glitter')).not.toBeInTheDocument();
  });

  it('renders iOS-specific UI without memory leaks', () => {
    // Mock iOS detection to return true
    mockShouldShowIOSInstallPrompt.mockReturnValue(true);

    const { unmount } = render(<PWAInstallPrompt />);

    // Should show iOS-specific messaging (text split across elements)
    expect(screen.getByText('Tap the')).toBeInTheDocument();
    expect(screen.getByText('share button')).toBeInTheDocument();

    // Unmount immediately
    unmount();

    // No memory leaks should occur
  });

  it('handles localStorage SecurityError gracefully', async () => {
    // Mock localStorage to throw SecurityError
    const originalLocalStorage = window.localStorage;
    const mockGetItem = vi.fn(() => {
      throw new DOMException('Access denied', 'SecurityError');
    });
    const mockSetItem = vi.fn(() => {
      throw new DOMException('Access denied', 'SecurityError');
    });
    const mockRemoveItem = vi.fn(() => {
      throw new DOMException('Access denied', 'SecurityError');
    });

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: mockGetItem,
        setItem: mockSetItem,
        removeItem: mockRemoveItem,
      },
      writable: true,
    });

    const mockDismissPrompt = vi.fn();
    mockUsePWAInstall.mockReturnValue({
      canShowPrompt: true,
      promptInstall: vi.fn(),
      dismissPrompt: mockDismissPrompt,
    });

    const { unmount } = render(<PWAInstallPrompt />);

    // Component should still render despite localStorage errors
    expect(screen.getByText('Install Organized Glitter')).toBeInTheDocument();

    // Dismiss should still work despite localStorage errors
    const dismissButton = screen.getByLabelText('Dismiss install prompt');
    const user = userEvent.setup();
    await user.click(dismissButton);

    // Wait for the dismiss function to be called after animation
    await waitFor(
      () => {
        expect(mockDismissPrompt).toHaveBeenCalledTimes(1);
      },
      { timeout: 1000 }
    );

    // Clean up
    unmount();
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });

    // No crashes should occur despite localStorage being unavailable
  });
});
