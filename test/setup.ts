import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock import.meta.env for secureLogger and other utilities
Object.defineProperty(import.meta, 'env', {
  value: {
    ...(import.meta.env || {}), // Preserve existing Vitest/Vite environment variables
    DEV: true,
    PROD: false,
    MODE: 'test',
    NODE_ENV: 'test',
    VITE_POCKETBASE_URL: 'http://127.0.0.1:8090',
    VITE_APP_VERSION: '1.0.0',
    VITE_APP_URL: 'http://localhost:3000',
  },
  writable: true,
  configurable: true, // Allow per-test environment variable overrides
});

// Mock environment variables
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

// Mock window.matchMedia for components that use responsive hooks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver for components that use it
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver for components that use it
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL for file upload tests
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn().mockImplementation(() => 'blob:mock-url-12345'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

// Mock window.location for routing tests
delete (window as unknown as { location: unknown }).location;
(window as unknown as { location: unknown }).location = {
  ...window.location,
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
} as unknown as Location;

// Mock HTMLFormElement.prototype.requestSubmit for jsdom compatibility
if (!HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function () {
    // Mock implementation - just dispatch a submit event
    const event = new Event('submit', { bubbles: true, cancelable: true });
    this.dispatchEvent(event);
  };
}

// Mock window.confirm for jsdom compatibility
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn().mockReturnValue(true),
});

// Global test utilities
global.createMockFile = (name: string = 'test.jpg', type: string = 'image/jpeg') => {
  return new File(['test content'], name, { type, lastModified: Date.now() });
};

global.createMockFileList = (files: File[]) => {
  const fileList = {
    length: files.length,
    item: (index: number) => files[index] || null,
  } as FileList;

  files.forEach((file, index) => {
    (fileList as unknown as File[])[index] = file;
  });

  return fileList;
};

// Increase test timeout for integration tests
const originalTimeout = 5000;
vi.setConfig({ testTimeout: originalTimeout });
