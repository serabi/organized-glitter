/**
 * Simplified test setup for fast, reliable testing
 * Only includes essential mocks and configuration
 * @author @serabi
 * @created 2025-07-29
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Essential environment setup
Object.defineProperty(import.meta, 'env', {
  value: {
    MODE: 'test',
    VITE_POCKETBASE_URL: 'http://localhost:8090',
    VITE_APP_VERSION: '1.0.0',
  },
  writable: true,
  configurable: true,
});

// Core browser API mocks - minimal but complete
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn(() => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Observer APIs used by components
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// URL APIs for file handling
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mock:blob-url'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

// Suppress React Router warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('React Router Future Flag Warning')) {
    return;
  }
  originalWarn(...args);
};

// Test cleanup and isolation
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
