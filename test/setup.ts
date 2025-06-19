import '@testing-library/jest-dom';
import { vi } from 'vitest';

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

// Mock PostHog to prevent initialization errors in tests
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    opt_out_capturing: vi.fn(),
    opt_in_capturing: vi.fn(),
    get_distinct_id: vi.fn(),
    get_session_id: vi.fn(),
    register: vi.fn(),
    register_once: vi.fn(),
    unregister: vi.fn(),
    get_property: vi.fn(),
    alias: vi.fn(),
    set_config: vi.fn(),
    get_config: vi.fn(),
    get_feature_flag: vi.fn(),
    is_feature_enabled: vi.fn(),
    onFeatureFlags: vi.fn(),
    reloadFeatureFlags: vi.fn(),
    group: vi.fn(),
    setPersonProperties: vi.fn(),
    setPersonPropertiesForFlags: vi.fn(),
    resetPersonPropertiesForFlags: vi.fn(),
    setGroupPropertiesForFlags: vi.fn(),
    resetGroupPropertiesForFlags: vi.fn(),
    reset_groups: vi.fn(),
    set_group: vi.fn(),
    add_group: vi.fn(),
    remove_group: vi.fn(),
    track_pageview: vi.fn(),
    track_clicks: vi.fn(),
    track_links: vi.fn(),
    track_forms: vi.fn(),
    capture_pageview: vi.fn(),
    capture_pageleave: vi.fn(),
    debug: vi.fn(),
    get_session_recording_url: vi.fn(),
    disable: vi.fn(),
    opt_out_session_recording: vi.fn(),
    opt_in_session_recording: vi.fn(),
    get_session_replay_url: vi.fn(),
    flush: vi.fn(),
  },
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
window.location = {
  ...window.location,
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};

// Mock HTMLFormElement.prototype.requestSubmit for jsdom compatibility
if (!HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function (submitter?: HTMLElement) {
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
global.createMockFile = (
  name: string = 'test.jpg',
  type: string = 'image/jpeg',
  size: number = 1024
) => {
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
