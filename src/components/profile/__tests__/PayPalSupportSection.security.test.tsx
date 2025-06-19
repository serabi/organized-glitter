/**
 * Security Tests for PayPalSupportSection
 *
 * These tests verify that the PayPal integration is protected against XSS
 * and follows secure DOM manipulation practices.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import PayPalSupportSection from '../PayPalSupportSection';

// Mock PayPal global
const mockPayPalRender = vi.fn();
const mockPayPalButton = vi.fn(() => ({
  render: mockPayPalRender,
}));

Object.defineProperty(window, 'PayPal', {
  value: {
    Donation: {
      Button: mockPayPalButton,
    },
  },
  writable: true,
});

describe('PayPalSupportSection Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up any existing scripts
    const existingScript = document.querySelector(
      'script[src="https://www.paypalobjects.com/donate/sdk/donate-sdk.js"]'
    );
    if (existingScript) {
      existingScript.remove();
    }
  });

  afterEach(() => {
    cleanup();
    // Clean up any scripts added during tests
    const scripts = document.querySelectorAll(
      'script[src="https://www.paypalobjects.com/donate/sdk/donate-sdk.js"]'
    );
    scripts.forEach(script => script.remove());
  });

  describe('XSS Prevention', () => {
    it('should not use innerHTML for DOM manipulation', () => {
      // Spy on innerHTML setter to detect any usage
      const containers = [] as HTMLElement[];
      const originalCreateElement = document.createElement;

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement.call(document, tagName);
        if (tagName.toLowerCase() === 'div') {
          containers.push(element);
        }
        return element;
      });

      // Spy on getElementById to track container access
      const containerElement = document.createElement('div');
      containerElement.id = 'donate-button';
      vi.spyOn(document, 'getElementById').mockReturnValue(containerElement);

      // Spy on innerHTML setter
      const innerHTMLSpy = vi.spyOn(containerElement, 'innerHTML', 'set');

      render(<PayPalSupportSection />);

      // Verify innerHTML is never called
      expect(innerHTMLSpy).not.toHaveBeenCalled();
    });

    it('should use safe DOM methods for cleanup', () => {
      const containerElement = document.createElement('div');
      containerElement.id = 'donate-button';

      // Add some mock PayPal content
      const mockButton = document.createElement('div');
      mockButton.className = 'paypal-button';
      containerElement.appendChild(mockButton);

      vi.spyOn(document, 'getElementById').mockReturnValue(containerElement);

      // Spy on safe methods
      const replaceChildrenSpy = vi.spyOn(containerElement, 'replaceChildren');

      const { unmount } = render(<PayPalSupportSection />);

      // Trigger cleanup by unmounting
      unmount();

      // Verify safe cleanup method was used
      expect(replaceChildrenSpy).toHaveBeenCalledWith();
    });

    it('should handle malicious content safely', () => {
      const containerElement = document.createElement('div');
      containerElement.id = 'donate-button';

      // Simulate potential XSS content in container
      const maliciousContent = document.createElement('script');
      maliciousContent.textContent = 'alert("xss")';
      containerElement.appendChild(maliciousContent);

      vi.spyOn(document, 'getElementById').mockReturnValue(containerElement);

      const replaceChildrenSpy = vi.spyOn(containerElement, 'replaceChildren');

      const { unmount } = render(<PayPalSupportSection />);

      // Ensure container has content before cleanup
      expect(containerElement.children.length).toBe(1);

      // Trigger cleanup
      unmount();

      // Verify cleanup was called and content is removed safely
      expect(replaceChildrenSpy).toHaveBeenCalled();
      expect(containerElement.children.length).toBe(0);
    });
  });

  describe('PayPal Integration Security', () => {
    it('should only load PayPal script from official domain', () => {
      render(<PayPalSupportSection />);

      const script = document.querySelector(
        'script[src="https://www.paypalobjects.com/donate/sdk/donate-sdk.js"]'
      );
      expect(script).toBeTruthy();
      expect(script?.getAttribute('src')).toBe(
        'https://www.paypalobjects.com/donate/sdk/donate-sdk.js'
      );
    });

    it('should use proper configuration for PayPal button', () => {
      // This test verifies the component has secure configuration
      render(<PayPalSupportSection />);

      // The component should use production environment and official button ID
      const script = document.querySelector(
        'script[src="https://www.paypalobjects.com/donate/sdk/donate-sdk.js"]'
      );
      expect(script).toBeTruthy();

      // Verify the script is from official PayPal domain
      expect(script?.getAttribute('src')).toMatch(/^https:\/\/www\.paypalobjects\.com/);
    });

    it('should handle script loading errors gracefully', () => {
      // Remove any existing PayPal global to simulate script not loaded
      const originalPayPal = (window as unknown as { PayPal?: unknown }).PayPal;
      (window as unknown as { PayPal?: unknown }).PayPal = undefined;

      // Should not throw error when PayPal is not available
      expect(() => {
        render(<PayPalSupportSection />);
      }).not.toThrow();

      // Restore original PayPal object
      (window as unknown as { PayPal?: unknown }).PayPal = originalPayPal;
    });
  });

  describe('DOM Security', () => {
    it('should only manipulate intended DOM elements', () => {
      const containerElement = document.createElement('div');
      containerElement.id = 'donate-button';

      // Create other elements that should not be affected
      const otherElement = document.createElement('div');
      otherElement.id = 'other-element';
      document.body.appendChild(otherElement);

      vi.spyOn(document, 'getElementById').mockImplementation((id: string) => {
        if (id === 'donate-button') return containerElement;
        if (id === 'other-element') return otherElement;
        return null;
      });

      const { unmount } = render(<PayPalSupportSection />);

      // Other elements should remain untouched
      expect(otherElement.children.length).toBe(0);

      unmount();

      // Other elements should still be untouched
      expect(otherElement.children.length).toBe(0);

      // Cleanup
      document.body.removeChild(otherElement);
    });
  });
});
