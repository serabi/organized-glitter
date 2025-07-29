# Simplified Test Utilities

This directory contains test utilities for Organized Glitter

## Philosophy

- **Minimal abstractions**: Only essential utilities, no complex base classes
- **User-focused testing**: Test what users see and interact with
- **Fast execution**: Simple setup for quick test runs
- **Easy to understand**: Clear, straightforward testing patterns

## Core Utilities

### `renderWithProviders()`

Renders components with essential React contexts (React Query, Router).

```tsx
import { renderWithProviders, screen } from '@/test-utils';

test('component renders correctly', () => {
  renderWithProviders(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### Mock Data Factories

Simple functions to create test data without complex patterns.

```tsx
import { createMockProject, createMockUser } from '@/test-utils';

const project = createMockProject({
  title: 'Custom Title',
  status: 'completed'
});

const user = createMockUser({
  email: 'test@example.com'
});
```

### PocketBase Mocking

Basic PocketBase mock for testing API interactions.

```tsx
import { createMockPocketBase } from '@/test-utils';

const mockPb = createMockPocketBase();
mockPb.collection().getList.mockResolvedValue({ items: [] });
```

## Testing Patterns

### Component Tests

Focus on rendering and user interactions:

```tsx
describe('Button', () => {
  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Hook Tests

Test hook behavior with minimal setup:

```tsx
describe('useAuth', () => {
  it('returns authentication state', () => {
    const { result } = renderHook(() => useAuth());
    
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

### Integration Tests

Test user workflows with realistic interactions:

```tsx
describe('Project Workflow', () => {
  it('allows creating and updating projects', async () => {
    renderWithProviders(<ProjectManager />);
    
    // Create project
    await user.type(screen.getByLabelText('Title'), 'New Project');
    await user.click(screen.getByText('Save'));
    
    // Verify project appears
    expect(screen.getByText('New Project')).toBeInTheDocument();
  });
});
```

## What We Removed

- **ServiceTestBase**: 200+ line complex base class
- **Complex mocking infrastructure**: Over-engineered PocketBase mocks
- **E2E tests**: Redundant with simpler integration tests
- **Performance tests**: Unnecessary for this application
- **Elaborate test utilities**: Multiple abstraction layers

## What We Kept

- **Essential functionality**: Core testing needs
- **Critical test coverage**: User-facing features
- **Fast execution**: Tests run in under 10 seconds
- **Clear patterns**: Easy to understand and maintain

## Usage Examples

See the example tests in:
- `src/components/ui/__tests__/Button.test.tsx` - Simple component test
- `src/components/projects/__tests__/ProjectCard.simple.test.tsx` - Component with providers
- `src/hooks/__tests__/useAuth.test.tsx` - Hook testing
- `src/__tests__/integration/project-workflow.test.tsx` - Integration test

## Migration Guide

### Before (Complex)
```tsx
class MyTest extends ServiceTestBase {
  async testSomething() {
    this.mockCollection.getList.mockResolvedValue(this.createMockListResponse([]));
    // 20+ lines of setup...
  }
}
```

### After (Simple)
```tsx
test('something works', () => {
  const mockPb = createMockPocketBase();
  mockPb.collection().getList.mockResolvedValue({ items: [] });
  // Test the actual behavior
});
```

The new approach focuses on what matters: testing that the application works correctly for users.