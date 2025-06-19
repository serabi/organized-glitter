import * as VisuallyHiddenPrimitive from '@radix-ui/react-visually-hidden';
import { forwardRef } from 'react';

const VisuallyHidden = forwardRef<
  React.ElementRef<typeof VisuallyHiddenPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof VisuallyHiddenPrimitive.Root>
>(({ ...props }, ref) => <VisuallyHiddenPrimitive.Root ref={ref} {...props} />);
VisuallyHidden.displayName = 'VisuallyHidden';

export { VisuallyHidden };
