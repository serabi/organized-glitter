/**
 * @fileoverview Enhanced React Query mutation hook for creating randomizer spin records
 *
 * Provides a comprehensive React Query mutation for recording randomizer wheel spins with
 * enhanced error handling, optimistic updates, analytics metadata capture, and comprehensive
 * error classification and recovery strategies. Uses the TypedRandomizerService for
 * improved type safety and error handling.
 *
 * @author @serabi
 * @version 2.0.0
 * @since 2025-07-19
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  EnhancedCreateSpinParams,
  createSpinEnhanced,
  RandomizerError,
  RandomizerErrorType,
  detectDeviceType,
} from '@/services/pocketbase/randomizerService';
import { randomizerQueryKeys } from '@/hooks/queries/useSpinHistory';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/utils/secureLogger';
import type { RandomizerSpinsResponse } from '@/types/pocketbase.types';
import { Collections } from '@/types/pocketbase.types';

const logger = createLogger('useCreateSpin');

/**
 * Enhanced parameters interface for creating spin records with analytics metadata
 */
export interface CreateSpinMutationParams {
  /** User ID performing the spin */
  user: string;
  /** Selected project ID */
  project: string;
  /** Project title for preservation */
  project_title: string;
  /** Project company name for preservation (optional) */
  project_company?: string;
  /** Project artist name for preservation (optional) */
  project_artist?: string;
  /** Array of all projects that were selectable */
  selected_projects: string[];
  /** Optional analytics metadata - will be auto-generated if not provided */
  metadata?: {
    selectionTime: number;
    deviceType?: 'mobile' | 'tablet' | 'desktop';
    spinMethod: 'click' | 'keyboard' | 'touch';
    userAgent?: string;
  };
}

/**
 * Error classification for enhanced error handling and recovery
 */
interface ClassifiedError {
  type: RandomizerErrorType;
  message: string;
  canRetry: boolean;
  suggestedAction: string;
  isTemporary: boolean;
  requiresUserAction: boolean;
}

/**
 * Classifies errors for enhanced error handling and user feedback
 */
function classifyError(error: unknown): ClassifiedError {
  // Handle RandomizerError types from the service
  if (error && typeof error === 'object' && 'type' in error) {
    const randomizerError = error as RandomizerError;
    return {
      type: randomizerError.type,
      message: randomizerError.message,
      canRetry: randomizerError.canRetry,
      suggestedAction: randomizerError.suggestedAction,
      isTemporary: randomizerError.canRetry,
      requiresUserAction: !randomizerError.canRetry,
    };
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return {
        type: RandomizerErrorType.NETWORK_ERROR,
        message: 'Network connection failed',
        canRetry: true,
        suggestedAction: 'Check your internet connection and try again',
        isTemporary: true,
        requiresUserAction: false,
      };
    }

    if (message.includes('permission') || message.includes('unauthorized')) {
      return {
        type: RandomizerErrorType.PERMISSION_DENIED,
        message: 'Permission denied',
        canRetry: false,
        suggestedAction: 'Please log in again',
        isTemporary: false,
        requiresUserAction: true,
      };
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return {
        type: RandomizerErrorType.VALIDATION_ERROR,
        message: 'Invalid data provided',
        canRetry: false,
        suggestedAction: 'Please check your selection and try again',
        isTemporary: false,
        requiresUserAction: true,
      };
    }
  }

  // Default classification for unknown errors
  return {
    type: RandomizerErrorType.DATABASE_UNAVAILABLE,
    message: 'An unexpected error occurred',
    canRetry: true,
    suggestedAction: 'Please try again in a moment',
    isTemporary: true,
    requiresUserAction: false,
  };
}

/**
 * Enhanced React Query mutation hook for creating randomizer spin records
 *
 * Provides a comprehensive mutation for recording wheel spin results with enhanced error
 * handling, optimistic updates, analytics metadata capture, and intelligent retry strategies.
 * Uses the TypedRandomizerService for improved type safety and error classification.
 *
 * @returns {UseMutationResult} Enhanced React Query mutation object with:
 *   - mutate: Function to trigger the mutation
 *   - mutateAsync: Async version that returns a promise
 *   - isPending: Boolean indicating if mutation is in progress
 *   - error: Classified error object with recovery information
 *   - data: The created spin record if successful
 *
 * @example
 * ```typescript
 * function RandomizerComponent() {
 *   const createSpinMutation = useCreateSpin();
 *
 *   const handleSpin = async (selectedProject: Project, selectionTime: number) => {
 *     try {
 *       await createSpinMutation.mutateAsync({
 *         user: user.id,
 *         project: selectedProject.id,
 *         project_title: selectedProject.title,
 *         project_company: selectedProject.company,
 *         project_artist: selectedProject.artist,
 *         selected_projects: selectedProjectIds,
 *         metadata: {
 *           selectionTime,
 *           spinMethod: 'click'
 *         }
 *       });
 *       // Success toast shown automatically with project name
 *     } catch (error) {
 *       // Enhanced error handling with specific recovery suggestions
 *       console.error('Spin creation failed:', error);
 *     }
 *   };
 *
 *   return (
 *     <button
 *       onClick={() => handleSpin(selectedProject, Date.now() - startTime)}
 *       disabled={createSpinMutation.isPending}
 *     >
 *       {createSpinMutation.isPending ? 'Recording...' : 'Spin Wheel'}
 *     </button>
 *   );
 * }
 * ```
 *
 * @features
 * - **Enhanced Error Handling**: Comprehensive error classification and recovery strategies
 * - **Optimistic Updates**: Immediate UI updates with automatic rollback on failure
 * - **Analytics Metadata**: Automatic capture of performance and usage metrics
 * - **Intelligent Retry**: Context-aware retry logic based on error type
 * - **Type Safety**: Full TypeScript support with enhanced parameter validation
 * - **Cache Management**: Optimized cache invalidation and prefetching
 * - **User Feedback**: Contextual toast messages with specific error guidance
 *
 * @errorhandling
 * - **Network Errors**: Auto-retry with exponential backoff
 * - **Permission Errors**: Clear user guidance for re-authentication
 * - **Validation Errors**: Specific feedback on data issues
 * - **Database Errors**: Graceful degradation with retry options
 * - **Optimistic Rollback**: Automatic UI state restoration on failure
 *
 * @analytics
 * - **Selection Time**: Tracks time from spin start to completion
 * - **Device Detection**: Automatic mobile/tablet/desktop classification
 * - **Interaction Method**: Tracks click/keyboard/touch input methods
 * - **Performance Metrics**: Captures timing and success/failure rates
 *
 * @sideeffects
 * - Invalidates randomizer history and count queries for the user
 * - Shows contextual success/error toast notifications
 * - Logs detailed mutation events for debugging and analytics
 * - Updates optimistic cache state during mutation
 */
export const useCreateSpin = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: CreateSpinMutationParams): Promise<RandomizerSpinsResponse> => {
      logger.debug('Creating enhanced spin record', {
        userId: params.user,
        projectId: params.project,
        selectedCount: params.selected_projects.length,
        hasMetadata: !!params.metadata,
      });

      // Auto-generate analytics metadata if not provided
      const metadata = params.metadata || {
        selectionTime: 0, // Default if not provided
        deviceType: detectDeviceType(navigator.userAgent),
        spinMethod: 'click' as const, // Default method
        userAgent: navigator.userAgent,
      };

      // Enhance parameters with complete metadata
      const enhancedParams: EnhancedCreateSpinParams = {
        ...params,
        metadata: {
          selectionTime: metadata.selectionTime,
          deviceType: metadata.deviceType || detectDeviceType(navigator.userAgent),
          spinMethod: metadata.spinMethod,
          userAgent: metadata.userAgent || navigator.userAgent,
        },
      };

      return await createSpinEnhanced(enhancedParams);
    },
    onMutate: async variables => {
      // Optimistic update: immediately add the spin to the cache
      logger.debug('Applying optimistic update for spin creation', {
        userId: variables.user,
        projectTitle: variables.project_title,
      });

      // Cancel any outgoing refetches to prevent overwriting our optimistic update
      await queryClient.cancelQueries({
        queryKey: randomizerQueryKeys.history(variables.user),
      });

      // Snapshot the previous value for rollback
      const previousHistory = queryClient.getQueryData(
        randomizerQueryKeys.history(variables.user, { limit: 8, expand: false })
      );

      // Optimistically update the cache with the new spin
      const optimisticSpin: RandomizerSpinsResponse = {
        id: `optimistic-${Date.now()}`, // Temporary ID
        user: variables.user,
        project: variables.project,
        project_title: variables.project_title,
        project_company: variables.project_company,
        project_artist: variables.project_artist,
        selected_projects: variables.selected_projects,
        selected_count: variables.selected_projects.length,
        spun_at: new Date().toISOString(),
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        collectionId: 'randomizer_spins',
        collectionName: Collections.RandomizerSpins,
      };

      queryClient.setQueryData(
        randomizerQueryKeys.history(variables.user, { limit: 8, expand: false }),
        (old: RandomizerSpinsResponse[] | undefined) => {
          return old ? [optimisticSpin, ...old.slice(0, 7)] : [optimisticSpin];
        }
      );

      // Update the count optimistically
      queryClient.setQueryData(
        randomizerQueryKeys.count(variables.user),
        (old: number | undefined) => (old || 0) + 1
      );

      // Return context for rollback
      return { previousHistory, optimisticSpin };
    },
    onSuccess: (data, variables, context) => {
      logger.info('Enhanced spin record created successfully', {
        spinId: data.id,
        userId: variables.user,
        projectTitle: variables.project_title,
        selectionTime: variables.metadata?.selectionTime,
        deviceType: variables.metadata?.deviceType,
      });

      // Replace optimistic update with real data
      queryClient.setQueryData(
        randomizerQueryKeys.history(variables.user, { limit: 8, expand: false }),
        (old: RandomizerSpinsResponse[] | undefined) => {
          if (!old) return [data];

          // Replace the optimistic record with the real one
          return old.map(spin => (spin.id === context?.optimisticSpin.id ? data : spin));
        }
      );

      // Invalidate related queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: randomizerQueryKeys.all,
      });

      // Show success toast with enhanced information
      toast({
        title: 'Spin recorded!',
        description: `Selected: ${variables.project_title}${
          variables.project_company ? ` by ${variables.project_company}` : ''
        }`,
      });
    },
    onError: (error, variables, context) => {
      const classifiedError = classifyError(error);

      logger.error('Failed to create enhanced spin record', {
        error,
        errorType: classifiedError.type,
        canRetry: classifiedError.canRetry,
        userId: variables.user,
        projectId: variables.project,
        projectTitle: variables.project_title,
      });

      // Rollback optimistic update
      if (context?.previousHistory !== undefined) {
        queryClient.setQueryData(
          randomizerQueryKeys.history(variables.user, { limit: 8, expand: false }),
          context.previousHistory
        );
      }

      // Rollback count update
      queryClient.setQueryData(
        randomizerQueryKeys.count(variables.user),
        (old: number | undefined) => Math.max((old || 1) - 1, 0)
      );

      // Show contextual error toast based on error classification
      const errorTitle = classifiedError.requiresUserAction
        ? 'Action Required'
        : classifiedError.isTemporary
          ? 'Temporary Issue'
          : 'Failed to record spin';

      toast({
        title: errorTitle,
        description: classifiedError.suggestedAction,
        variant: 'destructive',
      });
    },
    retry: (failureCount, error) => {
      const classifiedError = classifyError(error);

      // Don't retry errors that require user action
      if (classifiedError.requiresUserAction) {
        logger.debug('Not retrying error that requires user action', {
          errorType: classifiedError.type,
          message: classifiedError.message,
        });
        return false;
      }

      // Retry temporary errors up to 3 times
      if (classifiedError.canRetry && failureCount < 3) {
        logger.debug('Retrying spin creation', {
          attempt: failureCount + 1,
          errorType: classifiedError.type,
        });
        return true;
      }

      return false;
    },
    retryDelay: attemptIndex => {
      // Exponential backoff with jitter: 1s, 2s, 4s
      const baseDelay = 1000 * Math.pow(2, attemptIndex);
      const jitter = Math.random() * 500; // Add up to 500ms jitter
      return Math.min(baseDelay + jitter, 10000); // Cap at 10 seconds
    },
  });
};
