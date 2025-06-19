import { useToast as useOriginalToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

/**
 * Toast option types compatible with the ProjectQueryService
 */
export interface ServiceToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
}

/**
 * Toast handlers interface expected by the ProjectQueryService
 */
export interface ToastHandlers {
  toast: (options: ServiceToastOptions) => void;
}

/**
 * Extended toast handlers interface that includes onSuccess callback
 */
export interface ExtendedToastHandlers extends ToastHandlers {
  onSuccess?: (options: ServiceToastOptions) => void;
}

/**
 * Creates a toast adapter that converts UI toast variants to service-compatible variants
 *
 * This utility helps bridge the gap between the UI toast component's variant types
 * and the variant types expected by the ProjectQueryService.
 *
 * @returns A toast function compatible with the service layer
 */
export function useServiceToast(): ToastHandlers {
  const { toast: originalToast } = useOriginalToast();

  // Create a toast wrapper that matches the expected interface for ProjectQueryService
  const toast = useCallback(
    (options: ServiceToastOptions) => {
      // Map variant values for compatibility
      const { variant, ...rest } = options;
      let safeVariant: 'default' | 'destructive' | null | undefined = undefined;

      if (variant === 'success' || variant === 'warning') {
        safeVariant = 'default';
      } else {
        safeVariant = variant as 'default' | 'destructive' | null | undefined;
      }

      return originalToast({
        ...rest,
        variant: safeVariant,
      });
    },
    [originalToast]
  );

  return { toast };
}

/**
 * Creates extended toast handlers with success callback
 *
 * @returns Extended toast handlers with both regular toast and onSuccess functions
 */
export function useExtendedServiceToast(): ExtendedToastHandlers {
  const { toast } = useServiceToast();

  const handlers: ExtendedToastHandlers = {
    toast,
    onSuccess: toast,
  };

  return handlers;
}
