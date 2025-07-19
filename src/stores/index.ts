/**
 * @fileoverview Store Exports
 *
 * Central export point for all Zustand stores used in the application.
 * Provides a clean interface for importing stores and related utilities.
 *
 * @author @serabi
 * @version 2.0.0
 * @since 2025-07-19
 */

// Randomizer store exports
export {
  useRandomizerStore,
  useSelectedProjects,
  useRandomizerStats,
  useRandomizerLoading,
  useRandomizerError,
  useRandomizerUI,
  useRandomizerPreferences,
  useRandomizerActions,
  createRandomizerError,
  RandomizerErrorType,
} from './randomizerStore';

export type {
  RandomizerState,
  RandomizerError,
  RandomizerPreferences,
  WheelRenderMode,
  DeviceType,
  SpinMethod,
  RandomizerStats,
} from './randomizerStore';

// Randomizer utilities
export {
  validateSpinSelection,
  validateProjectData,
  filterRandomizableProjects,
  cloneSelectedIds,
  validatePreferences,
  calculateStats,
  generateRandomSelection,
  isOptimalSelection,
  createStandardError,
  isRecoverableError,
  getRetryDelay,
  createCleanupFunction,
  debounce,
  throttle,
} from './randomizerUtils';