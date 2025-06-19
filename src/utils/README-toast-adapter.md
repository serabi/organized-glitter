# Toast Adapter Utility

## Overview

The Toast Adapter utility provides a standardized way to display toast notifications across the application. It bridges the gap between the UI toast component and the service layer by adapting the interfaces to be compatible with each other.

## Features

- Type-safe toast notifications
- Consistent toast behavior across the application
- Support for both basic and extended toast handlers
- Compatible with the ProjectQueryService and ProjectCRUDService

## Usage

### Basic Toast Usage

```typescript
import { useServiceToast } from '@/utils/toast-adapter';

function MyComponent() {
  const { toast } = useServiceToast();

  const handleAction = () => {
    toast({
      title: 'Success',
      description: 'Operation completed successfully',
      variant: 'success',
    });
  };

  return <button onClick={handleAction}>Perform Action</button>;
}
```

### Extended Toast Handlers (with success callback)

```typescript
import { useExtendedServiceToast } from '@/utils/toast-adapter';

function MyComponent() {
  const extendedToastHandlers = useExtendedServiceToast();

  // Pass to service methods that support success callbacks
  const response = await crudService.createProject(formData, userId, extendedToastHandlers);
}
```

## API Reference

### `useServiceToast()`

Returns a toast handler compatible with the ProjectQueryService.

**Returns:**

- `{ toast }` - An object containing the toast function

### `useExtendedServiceToast()`

Returns extended toast handlers with both regular toast and success callback.

**Returns:**

- `{ toast, onSuccess }` - An object containing the toast function and onSuccess callback

### Types

```typescript
// Toast option types compatible with the ProjectQueryService
interface ServiceToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
}

// Toast handlers interface expected by the ProjectQueryService
interface ToastHandlers {
  toast: (options: ServiceToastOptions) => void;
}

// Extended toast handlers interface that includes onSuccess callback
interface ExtendedToastHandlers extends ToastHandlers {
  onSuccess?: (options: ServiceToastOptions) => void;
}
```

## Implementation Details

The toast adapter converts between the UI toast component's variant types and the service layer's expected variant types. This ensures compatibility while maintaining a clean interface for both layers.

For more detailed documentation, see the [Toast Adapter Pattern](/docs/toast-adapter-pattern.md) documentation.
