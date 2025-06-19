// Test utilities exports for easy importing
export * from './helpers/render';
export * from './factories/project';
// export * from './factories/user';
export * from './mocks/pocketbase';

// Re-export commonly used testing library functions
export { screen, waitFor, fireEvent, cleanup, act } from '@testing-library/react';

export { default as userEvent } from '@testing-library/user-event';

// Re-export vitest functions
export { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
