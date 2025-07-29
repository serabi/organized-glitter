# Simplified Testing Guide

A streamlined testing approach focused on user workflows and business value.

## Quick Start

```typescript
import { describe, it, expect, renderWithProviders, screen, userEvent } from '@/test-utils';

describe('MyComponent', () => {
  it('should handle user interaction', async () => {
    const user = userEvent.setup();

    renderWithProviders(<MyComponent />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(screen.getByText('Success!')).toBeInTheDocument();
  });
});
```

## Testing Patterns

### 1. Component Tests

Focus on user interactions and rendering:

```typescript
import { renderWithProviders, screen, userEvent } from '@/test-utils';

// ✅ Test user interactions
it('should submit form when button is clicked', async () => {
  const user = userEvent.setup();
  renderWithProviders(<ContactForm />);

  await user.type(screen.getByLabelText('Email'), 'test@example.com');
  await user.click(screen.getByRole('button', { name: 'Submit' }));

  expect(screen.getByText('Form submitted!')).toBeInTheDocument();
});

// ✅ Test conditional rendering
it('should show error message for invalid input', () => {
  renderWithProviders(<ContactForm />);

  expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();

  // Trigger validation
  fireEvent.blur(screen.getByLabelText('Email'));

  expect(screen.getByTestId('error-message')).toBeInTheDocument();
});
```

### 2. Hook Tests

Test behavior with minimal mocking:

```typescript
import { renderHookWithProviders, act, waitFor } from '@/test-utils';

// ✅ Simple mock-based testing
const createMockUseMyHook = (overrides = {}) => {
  const defaults = {
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  };
  return { ...defaults, ...overrides };
};

it('should handle loading state', () => {
  const mockHook = createMockUseMyHook({ isLoading: true });
  expect(mockHook.isLoading).toBe(true);
});
```

### 3. Integration Tests

Test real user workflows:

```typescript
// ✅ Authentication flow
it('should allow user to login', async () => {
  const user = userEvent.setup();

  renderWithProviders(<LoginForm />);

  await user.type(screen.getByLabelText('Email'), 'user@example.com');
  await user.type(screen.getByLabelText('Password'), 'password');
  await user.click(screen.getByRole('button', { name: 'Login' }));

  await waitFor(() => {
    expect(screen.getByText('Welcome back!')).toBeInTheDocument();
  });
});

// ✅ CRUD operations
it('should create, update, and delete items', async () => {
  const user = userEvent.setup();

  renderWithProviders(<ProjectManager />);

  // Create
  await user.type(screen.getByPlaceholderText('Project name'), 'New Project');
  await user.click(screen.getByRole('button', { name: 'Create' }));

  expect(screen.getByText('New Project')).toBeInTheDocument();

  // Update
  await user.click(screen.getByRole('button', { name: 'Edit' }));
  await user.clear(screen.getByDisplayValue('New Project'));
  await user.type(screen.getByDisplayValue(''), 'Updated Project');
  await user.click(screen.getByRole('button', { name: 'Save' }));

  expect(screen.getByText('Updated Project')).toBeInTheDocument();

  // Delete
  await user.click(screen.getByRole('button', { name: 'Delete' }));

  expect(screen.queryByText('Updated Project')).not.toBeInTheDocument();
});
```

## Available Utilities

### Rendering

- `renderWithProviders(component, options)` - Render with all necessary providers
- `renderHookWithProviders(hook, options)` - Render hooks with providers

### Mock Factories

- `createMockProject(overrides)` - Create project test data
- `createMockUser(overrides)` - Create user test data
- `createMockFile(name, type, size)` - Create file objects for uploads

### Testing Library Exports

All essential testing-library utilities are re-exported:

- `screen` - Query the rendered DOM
- `waitFor` - Wait for async operations
- `fireEvent` - Trigger DOM events
- `userEvent` - Simulate user interactions
- `act` - Wrap state updates
- `within` - Query within specific elements

### Vitest Exports

Essential Vitest utilities:

- `describe`, `it`, `expect` - Test structure
- `beforeEach`, `afterEach` - Test lifecycle
- `vi` - Mocking utilities

## Writing Good Tests

### DO ✅

- Test user workflows and interactions
- Use realistic test data with mock factories
- Focus on behavior, not implementation
- Write tests that read like user stories
- Use `screen.getByRole()` for accessibility
- Test error states and edge cases
- Keep tests simple and focused

### DON'T ❌

- Test implementation details
- Mock everything - use real components when possible
- Write complex test utilities or base classes
- Test library code or third-party components
- Create elaborate test hierarchies
- Use complex selectors or queries
- Write tests that are hard to understand

## Test Organization

```
src/
├── __tests__/
│   └── integration/          # User workflow tests
├── components/
│   └── __tests__/           # Component interaction tests
├── hooks/
│   └── __tests__/           # Hook behavior tests
├── services/
│   └── __tests__/           # Service function tests
└── test-utils/
    ├── index.tsx            # Test utilities
    └── README.md            # This guide
```

## Performance Tips

- Tests run with optimized Vitest configuration
- Use `screen` queries for better performance
- Avoid unnecessary `waitFor` calls
- Use `userEvent` instead of `fireEvent` for realistic interactions
- Keep test setup minimal - avoid complex mocking

## Debugging Tests

Use the browser-like environment for debugging:

```typescript
it('should debug component state', () => {
  renderWithProviders(<MyComponent />);

  // Debug the DOM
  screen.debug();

  // Debug specific elements
  screen.debug(screen.getByTestId('my-element'));

  // Check what's available
  console.log(screen.getByRole('button')); // Will show available buttons
});
```

## Examples

See these files for complete examples:

- `src/__tests__/integration/auth-flow.test.tsx` - Authentication workflow
- `src/__tests__/integration/project-crud.test.tsx` - CRUD operations
- `src/__tests__/integration/project-status-logic.test.tsx` - Business logic
- `src/hooks/__tests__/useAuth.test.tsx` - Hook testing patterns
- `src/hooks/mutations/__tests__/useCreateSpin.test.tsx` - Mutation testing

This approach prioritizes:

- **User-focused testing** - Tests simulate real user interactions
- **Minimal boilerplate** - Simple, reusable utilities
- **Fast execution** - Optimized configuration for speed
- **Clear intent** - Tests read like user stories
- **Maintainability** - Easy to understand and modify
