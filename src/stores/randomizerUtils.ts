/**
 * @fileoverview Utility functions for Randomizer Store
 *
 * Provides helper functions for state management, validation, and cleanup
 * operations for the randomizer store. These utilities help maintain
 * consistency and provide reusable logic across the application.
 *
 * @author @serabi
 * @version 2.0.0
 * @since 2025-07-19
 */

import type { Project } from '@/types/project';
import {
  RandomizerError,
  RandomizerErrorType,
  RandomizerPreferences,
} from './randomizerStore';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('RandomizerUtils');

/**
 * Validates that a project selection is valid for spinning
 */
export function validateSpinSelection(selectedProjects: Project[]): {
  isValid: boolean;
  error?: RandomizerError;
} {
  if (selectedProjects.length < 2) {
    return {
      isValid: false,
      error: {
        type: RandomizerErrorType.INVALID_SELECTION,
        message: 'At least 2 projects must be selected for randomization',
        canRetry: false,
        suggestedAction: 'Select more projects from your in-progress list',
        timestamp: Date.now(),
      },
    };
  }

  // Check for duplicate projects
  const uniqueIds = new Set(selectedProjects.map(p => p.id));
  if (uniqueIds.size !== selectedProjects.length) {
    return {
      isValid: false,
      error: {
        type: RandomizerErrorType.VALIDATION_ERROR,
        message: 'Duplicate projects detected in selection',
        canRetry: true,
        suggestedAction: 'Remove duplicate projects and try again',
        timestamp: Date.now(),
      },
    };
  }

  return { isValid: true };
}

/**
 * Validates project data integrity
 */
export function validateProjectData(projects: Project[]): {
  validProjects: Project[];
  invalidCount: number;
  errors: string[];
} {
  const validProjects: Project[] = [];
  const errors: string[] = [];
  let invalidCount = 0;

  for (const project of projects) {
    const projectErrors: string[] = [];

    // Check required fields
    if (!project.id || typeof project.id !== 'string') {
      projectErrors.push('Missing or invalid project ID');
    }
    if (!project.title || typeof project.title !== 'string') {
      projectErrors.push('Missing or invalid project title');
    }
    if (!project.status) {
      projectErrors.push('Missing project status');
    }

    // Check ID format (PocketBase uses 15-character IDs)
    if (project.id && project.id.length !== 15) {
      projectErrors.push('Invalid project ID format');
    }

    if (projectErrors.length > 0) {
      invalidCount++;
      errors.push(`Project "${project.title || project.id}": ${projectErrors.join(', ')}`);
    } else {
      validProjects.push(project);
    }
  }

  if (invalidCount > 0) {
    logger.warn('Invalid projects detected during validation', {
      invalidCount,
      totalCount: projects.length,
      errors: errors.slice(0, 5), // Log first 5 errors
    });
  }

  return {
    validProjects,
    invalidCount,
    errors,
  };
}

/**
 * Filters projects to only include those suitable for randomization
 */
export function filterRandomizableProjects(projects: Project[]): Project[] {
  return projects.filter(project => {
    // Only include projects that are in progress
    if (project.status !== 'progress') {
      return false;
    }

    // Exclude projects without titles
    if (!project.title || project.title.trim().length === 0) {
      return false;
    }

    return true;
  });
}

/**
 * Creates a safe copy of selected project IDs set
 */
export function cloneSelectedIds(selectedIds: Set<string>): Set<string> {
  return new Set(Array.from(selectedIds));
}

/**
 * Validates and sanitizes user preferences
 */
export function validatePreferences(
  preferences: Partial<RandomizerPreferences>
): RandomizerPreferences {
  const defaultPreferences: RandomizerPreferences = {
    animationEnabled: true,
    renderMode: 'css',
    showHistoryByDefault: false,
    autoClearResults: false,
    wheelSize: 'medium',
    showProjectImages: true,
  };

  const sanitized: RandomizerPreferences = { ...defaultPreferences };

  // Validate animationEnabled
  if (typeof preferences.animationEnabled === 'boolean') {
    sanitized.animationEnabled = preferences.animationEnabled;
  }

  // Validate renderMode
  if (preferences.renderMode && ['svg', 'canvas', 'css'].includes(preferences.renderMode)) {
    sanitized.renderMode = preferences.renderMode;
  }

  // Validate showHistoryByDefault
  if (typeof preferences.showHistoryByDefault === 'boolean') {
    sanitized.showHistoryByDefault = preferences.showHistoryByDefault;
  }

  // Validate autoClearResults
  if (typeof preferences.autoClearResults === 'boolean') {
    sanitized.autoClearResults = preferences.autoClearResults;
  }

  // Validate wheelSize
  if (preferences.wheelSize && ['small', 'medium', 'large'].includes(preferences.wheelSize)) {
    sanitized.wheelSize = preferences.wheelSize;
  }

  // Validate showProjectImages
  if (typeof preferences.showProjectImages === 'boolean') {
    sanitized.showProjectImages = preferences.showProjectImages;
  }

  return sanitized;
}

/**
 * Calculates statistics from current state
 */
export function calculateStats(
  availableProjects: Project[],
  selectedProjectIds: Set<string>,
  spinHistoryCount: number
) {
  const totalProjects = availableProjects.length;
  const selectedCount = selectedProjectIds.size;

  return {
    totalProjects,
    selectedCount,
    canSpin: selectedCount >= 2,
    totalSpins: spinHistoryCount,
    hasProjects: totalProjects > 0,
    hasSelection: selectedCount > 0,
    selectionPercentage: totalProjects > 0 ? Math.round((selectedCount / totalProjects) * 100) : 0,
  };
}

/**
 * Generates a random selection from available projects
 */
export function generateRandomSelection(
  availableProjects: Project[],
  count: number = 3
): Set<string> {
  if (availableProjects.length <= count) {
    return new Set(availableProjects.map(p => p.id));
  }

  const shuffled = [...availableProjects].sort(() => Math.random() - 0.5);
  return new Set(shuffled.slice(0, count).map(p => p.id));
}

/**
 * Checks if the current selection is optimal for spinning
 */
export function isOptimalSelection(
  selectedCount: number,
  totalCount: number
): {
  isOptimal: boolean;
  suggestion?: string;
} {
  if (selectedCount < 2) {
    return {
      isOptimal: false,
      suggestion: 'Select at least 2 projects to enable spinning',
    };
  }

  if (selectedCount === totalCount && totalCount > 10) {
    return {
      isOptimal: false,
      suggestion: 'Consider selecting fewer projects for more meaningful randomization',
    };
  }

  if (selectedCount > totalCount * 0.8 && totalCount > 5) {
    return {
      isOptimal: false,
      suggestion: 'You have most projects selected - consider being more selective',
    };
  }

  return { isOptimal: true };
}

/**
 * Creates a standardized error for randomizer operations
 */
export function createStandardError(
  type: RandomizerErrorType,
  message: string,
  options: {
    canRetry?: boolean;
    suggestedAction?: string;
    technicalDetails?: unknown;
  } = {}
): RandomizerError {
  return {
    type,
    message,
    canRetry: options.canRetry ?? false,
    suggestedAction: options.suggestedAction ?? 'Please try again later',
    technicalDetails: options.technicalDetails,
    timestamp: Date.now(),
  };
}

/**
 * Determines if an error is recoverable
 */
export function isRecoverableError(error: RandomizerError): boolean {
  const recoverableTypes: RandomizerErrorType[] = [
    RandomizerErrorType.NETWORK_ERROR,
    RandomizerErrorType.DATABASE_UNAVAILABLE,
    RandomizerErrorType.ANIMATION_FAILED,
  ];

  return error.canRetry && recoverableTypes.includes(error.type);
}

/**
 * Gets appropriate retry delay based on attempt count
 */
export function getRetryDelay(attemptCount: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
  const baseDelay = 1000;
  const maxDelay = 30000;
  const delay = Math.min(baseDelay * Math.pow(2, attemptCount), maxDelay);

  // Add some jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay;
  return Math.floor(delay + jitter);
}

/**
 * Cleanup function for resetting state on component unmount
 */
export function createCleanupFunction(resetFn: () => void) {
  return () => {
    try {
      resetFn();
      logger.debug('Randomizer state cleaned up successfully');
    } catch (error) {
      logger.error('Error during randomizer cleanup', { error });
    }
  };
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
