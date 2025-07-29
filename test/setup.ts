import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables for testing
Object.defineProperty(import.meta, 'env', {
  value: {
    DEV: true,
    PROD: false,
    MODE: 'test',
    VITE_POCKETBASE_URL: 'http://127.0.0.1:8090',
    VITE_APP_VERSION: '1.0.0',
    VITE_APP_URL: 'http://localhost:3000',
  },
  writable: true,
  configurable: true,
});

// Mock environment utilities
vi.mock('@/utils/env', () => ({
  env: {
    VITE_POCKETBASE_URL: 'http://127.0.0.1:8090',
    VITE_APP_VERSION: '1.0.0',
    VITE_APP_URL: 'http://localhost:3000',
    MODE: 'test',
  },
  isProduction: false,
  isDevelopment: false,
  isTest: true,
}));

// Essential browser API mocks for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated but still used by some libraries
    removeListener: vi.fn(), // deprecated but still used by some libraries
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// File API mocks for upload testing
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'blob:mock-url-12345'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

// Form submission mock for jsdom
if (!HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function () {
    this.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  };
}
