/**
 * @fileoverview Zustand Store for Randomizer State Management
 *
 * Centralized state management for the project randomizer feature using Zustand.
 * Provides type-safe state management with persistence, actions, and computed values.
 * Replaces local useState hooks with a centralized store for better performance
 * and state consistency across components.
 *
 * @author @serabi
 * @version 2.0.0
 * @since 2025-07-19
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Project } from '@/types/project';
import type { RandomizerSpinsResponse } from '@/types/pocketbase.types';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('RandomizerStore');

/**
 * Error types specific to randomizer operations
 */
export enum RandomizerErrorType {
  DATABASE_UNAVAILABLE = 'database_unavailable',
  COLLECTION_MISSING = 'collection_missing',
  NETWORK_ERROR = 'network_error',
  ANIMATION_FAILED = 'animation_failed',
  INVALID_SELECTION = 'invalid_selection',
  PERMISSION_DENIED = 'permission_denied',
  VALIDATION_ERROR = 'validation_error',
}

/**
 * Enhanced error interface for randomizer operations
 */
export interface RandomizerError {
  type: RandomizerErrorType;
  message: string;
  canRetry: boolean;
  suggestedAction: string;
  technicalDetails?: unknown;
  timestamp: number;
}

/**
 * Render modes for the wheel component
 */
export type WheelRenderMode = 'svg' | 'canvas' | 'css';

/**
 * Device types for analytics and responsive behavior
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Spin methods for analytics tracking
 */
export type SpinMethod = 'click' | 'keyboard' | 'touch';

/**
 * User preferences that should be persisted
 */
export interface RandomizerPreferences {
  /** Whether animations are enabled */
  animationEnabled: boolean;
  /** Preferred render mode for the wheel */
  renderMode: WheelRenderMode;
  /** Whether to show spin history by default */
  showHistoryByDefault: boolean;
  /** Whether to auto-clear results after navigation */
  autoClearResults: boolean;
  /** Preferred wheel size */
  wheelSize: 'small' | 'medium' | 'large';
  /** Whether to show project images on wheel */
  showProjectImages: boolean;
}

/**
 * Statistics computed from current state
 */
export interface RandomizerStats {
  /** Total number of available projects */
  totalProjects: number;
  /** Number of currently selected projects */
  selectedCount: number;
  /** Whether spinning is possible (2+ projects selected) */
  canSpin: boolean;
  /** Total number of historical spins */
  totalSpins: number;
  /** Whether user has any projects */
  hasProjects: boolean;
  /** Whether user has made any selections */
  hasSelection: boolean;
}

/**
 * Main randomizer state interface
 */
export interface RandomizerState {
  // Core data
  /** All available projects for randomization */
  availableProjects: Project[];
  /** Set of selected project IDs for efficient lookup */
  selectedProjectIds: Set<string>;
  /** Most recent spin result */
  lastSpinResult: Project | null;
  /** Spin history data */
  spinHistory: RandomizerSpinsResponse[];

  // UI state
  /** Whether the wheel is currently spinning */
  isSpinning: boolean;
  /** Current wheel rotation in degrees */
  wheelRotation: number;
  /** Whether spin history panel is visible */
  showHistory: boolean;
  /** Whether project selector is expanded */
  showProjectSelector: boolean;

  // Loading states
  /** Whether projects are being loaded */
  isLoadingProjects: boolean;
  /** Whether spin history is being loaded */
  isLoadingHistory: boolean;
  /** Whether a spin is being created/saved */
  isCreatingSpin: boolean;

  // Error state
  /** Current error, if any */
  error: RandomizerError | null;
  /** Number of retry attempts for current operation */
  retryCount: number;

  // Performance and preferences
  /** Current render mode for the wheel */
  renderMode: WheelRenderMode;
  /** Whether animations are enabled */
  animationEnabled: boolean;
  /** User preferences (persisted) */
  preferences: RandomizerPreferences;

  // Computed values (getters)
  /** Get currently selected projects */
  getSelectedProjects: () => Project[];
  /** Get computed statistics */
  getStats: () => RandomizerStats;
  /** Check if a project is selected */
  isProjectSelected: (projectId: string) => boolean;

  // Actions
  actions: {
    // Project management
    setAvailableProjects: (projects: Project[]) => void;
    toggleProjectSelection: (projectId: string) => void;
    selectAllProjects: () => void;
    clearSelection: () => void;
    selectProjectsByIds: (projectIds: string[]) => void;

    // Spin management
    setLastSpinResult: (project: Project | null) => void;
    setSpinning: (spinning: boolean) => void;
    setWheelRotation: (rotation: number) => void;
    clearLastResult: () => void;

    // History management
    setSpinHistory: (history: RandomizerSpinsResponse[]) => void;
    addSpinToHistory: (spin: RandomizerSpinsResponse) => void;
    clearSpinHistory: () => void;

    // UI state management
    setShowHistory: (show: boolean) => void;
    toggleShowHistory: () => void;
    setShowProjectSelector: (show: boolean) => void;
    toggleShowProjectSelector: () => void;

    // Loading state management
    setLoadingProjects: (loading: boolean) => void;
    setLoadingHistory: (loading: boolean) => void;
    setCreatingSpin: (creating: boolean) => void;

    // Error management
    setError: (error: RandomizerError | null) => void;
    clearError: () => void;
    incrementRetryCount: () => void;
    resetRetryCount: () => void;

    // Performance and preferences
    setRenderMode: (mode: WheelRenderMode) => void;
    setAnimationEnabled: (enabled: boolean) => void;
    updatePreferences: (preferences: Partial<RandomizerPreferences>) => void;
    resetPreferences: () => void;

    // Utility actions
    reset: () => void;
    resetUIState: () => void;
    resetDataState: () => void;
  };
}

/**
 * Default user preferences
 */
const defaultPreferences: RandomizerPreferences = {
  animationEnabled: true,
  renderMode: 'css',
  showHistoryByDefault: false,
  autoClearResults: false,
  wheelSize: 'medium',
  showProjectImages: true,
};

/**
 * Initial state values
 */
const initialState = {
  // Core data
  availableProjects: [],
  selectedProjectIds: new Set<string>(),
  lastSpinResult: null,
  spinHistory: [],

  // UI state
  isSpinning: false,
  wheelRotation: 0,
  showHistory: false,
  showProjectSelector: true,

  // Loading states
  isLoadingProjects: false,
  isLoadingHistory: false,
  isCreatingSpin: false,

  // Error state
  error: null,
  retryCount: 0,

  // Performance and preferences
  renderMode: 'css' as WheelRenderMode,
  animationEnabled: true,
  preferences: defaultPreferences,
};

/**
 * Create randomizer error helper
 */
export function createRandomizerError(
  type: RandomizerErrorType,
  message: string,
  canRetry: boolean = false,
  suggestedAction: string = 'Please try again later',
  technicalDetails?: unknown
): RandomizerError {
  return {
    type,
    message,
    canRetry,
    suggestedAction,
    technicalDetails,
    timestamp: Date.now(),
  };
}

/**
 * Main Zustand store for randomizer state management
 *
 * Uses Immer middleware for immutable updates and persist middleware
 * for user preferences. Provides comprehensive state management with
 * computed values and type-safe actions.
 */
export const useRandomizerStore = create<RandomizerState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Computed values (getters)
      getSelectedProjects: () => {
        const state = get();
        return state.availableProjects.filter(project => state.selectedProjectIds.has(project.id));
      },

      getStats: (): RandomizerStats => {
        const state = get();
        const totalProjects = state.availableProjects.length;
        const selectedCount = state.selectedProjectIds.size;

        return {
          totalProjects,
          selectedCount,
          canSpin: selectedCount >= 2,
          totalSpins: state.spinHistory.length,
          hasProjects: totalProjects > 0,
          hasSelection: selectedCount > 0,
        };
      },

      isProjectSelected: (projectId: string) => {
        return get().selectedProjectIds.has(projectId);
      },

      // Actions
      actions: {
        // Project management
        setAvailableProjects: projects =>
          set(state => {
            // Clear invalid selections
            const validIds = new Set(projects.map(p => p.id));
            const filteredSelectedIds = new Set(
              Array.from(state.selectedProjectIds).filter(id => validIds.has(id))
            );
            logger.debug('Available projects updated', {
              count: projects.length,
              selectedCount: filteredSelectedIds.size,
            });
            return {
              ...state,
              availableProjects: projects,
              selectedProjectIds: filteredSelectedIds,
            };
          }),

        toggleProjectSelection: projectId =>
          set(state => {
            const newSelectedIds = new Set(state.selectedProjectIds);
            if (newSelectedIds.has(projectId)) {
              newSelectedIds.delete(projectId);
              logger.debug('Project deselected', { projectId });
            } else {
              newSelectedIds.add(projectId);
              logger.debug('Project selected', { projectId });
            }
            return {
              ...state,
              selectedProjectIds: newSelectedIds,
            };
          }),

        selectAllProjects: () =>
          set(state => {
            const allIds = state.availableProjects.map(p => p.id);
            logger.debug('All projects selected', { count: allIds.length });
            return {
              ...state,
              selectedProjectIds: new Set(allIds),
            };
          }),

        clearSelection: () =>
          set(state => {
            logger.debug('All projects deselected');
            return {
              ...state,
              selectedProjectIds: new Set(),
            };
          }),

        selectProjectsByIds: projectIds =>
          set(state => {
            // Validate that all IDs exist in available projects
            const validIds = new Set(state.availableProjects.map(p => p.id));
            const filteredIds = projectIds.filter(id => validIds.has(id));
            logger.debug('Projects selected by IDs', {
              requested: projectIds.length,
              valid: filteredIds.length,
            });
            return {
              ...state,
              selectedProjectIds: new Set(filteredIds),
            };
          }),

        // Spin management
        setLastSpinResult: project =>
          set(state => {
            if (project) {
              logger.info('Spin result set', { projectId: project.id, title: project.title });
            } else {
              logger.debug('Spin result cleared');
            }
            return {
              ...state,
              lastSpinResult: project,
            };
          }),

        setSpinning: spinning =>
          set(state => {
            logger.debug('Spinning state changed', { spinning });
            return {
              ...state,
              isSpinning: spinning,
            };
          }),

        setWheelRotation: rotation =>
          set(state => ({
            ...state,
            wheelRotation: rotation,
          })),

        clearLastResult: () =>
          set(state => {
            logger.debug('Last spin result cleared');
            return {
              ...state,
              lastSpinResult: null,
            };
          }),

        // History management
        setSpinHistory: history =>
          set(state => {
            logger.debug('Spin history updated', { count: history.length });
            return {
              ...state,
              spinHistory: history,
            };
          }),

        addSpinToHistory: spin =>
          set(state => {
            logger.debug('Spin added to history', { spinId: spin.id });
            return {
              ...state,
              spinHistory: [spin, ...state.spinHistory], // Add to beginning
            };
          }),

        clearSpinHistory: () =>
          set(state => {
            logger.debug('Spin history cleared');
            return {
              ...state,
              spinHistory: [],
            };
          }),

        // UI state management
        setShowHistory: show =>
          set(state => ({
            ...state,
            showHistory: show,
          })),

        toggleShowHistory: () =>
          set(state => ({
            ...state,
            showHistory: !state.showHistory,
          })),

        setShowProjectSelector: show =>
          set(state => ({
            ...state,
            showProjectSelector: show,
          })),

        toggleShowProjectSelector: () =>
          set(state => ({
            ...state,
            showProjectSelector: !state.showProjectSelector,
          })),

        // Loading state management
        setLoadingProjects: loading =>
          set(state => ({
            ...state,
            isLoadingProjects: loading,
          })),

        setLoadingHistory: loading =>
          set(state => ({
            ...state,
            isLoadingHistory: loading,
          })),

        setCreatingSpin: creating =>
          set(state => ({
            ...state,
            isCreatingSpin: creating,
          })),

        // Error management
        setError: error =>
          set(state => {
            if (error) {
              logger.error('Randomizer error set', {
                type: error.type,
                message: error.message,
                canRetry: error.canRetry,
              });
            } else {
              logger.debug('Error cleared');
            }
            return {
              ...state,
              error,
            };
          }),

        clearError: () =>
          set(state => ({
            ...state,
            error: null,
            retryCount: 0,
          })),

        incrementRetryCount: () =>
          set(state => {
            const newRetryCount = state.retryCount + 1;
            logger.debug('Retry count incremented', { retryCount: newRetryCount });
            return {
              ...state,
              retryCount: newRetryCount,
            };
          }),

        resetRetryCount: () =>
          set(state => ({
            ...state,
            retryCount: 0,
          })),

        // Performance and preferences
        setRenderMode: mode =>
          set(state => {
            logger.debug('Render mode changed', { mode });
            return {
              ...state,
              renderMode: mode,
              preferences: {
                ...state.preferences,
                renderMode: mode,
              },
            };
          }),

        setAnimationEnabled: enabled =>
          set(state => {
            logger.debug('Animation enabled changed', { enabled });
            return {
              ...state,
              animationEnabled: enabled,
              preferences: {
                ...state.preferences,
                animationEnabled: enabled,
              },
            };
          }),

        updatePreferences: newPreferences =>
          set(state => {
            const updatedPreferences = { ...state.preferences, ...newPreferences };
            logger.debug('Preferences updated', { preferences: newPreferences });
            return {
              ...state,
              preferences: updatedPreferences,
              // Sync relevant preferences to main state
              animationEnabled: updatedPreferences.animationEnabled,
              renderMode: updatedPreferences.renderMode,
              showHistory: updatedPreferences.showHistoryByDefault,
            };
          }),

        resetPreferences: () =>
          set(state => {
            logger.debug('Preferences reset to defaults');
            return {
              ...state,
              preferences: { ...defaultPreferences },
              animationEnabled: defaultPreferences.animationEnabled,
              renderMode: defaultPreferences.renderMode,
            };
          }),

        // Utility actions
        reset: () =>
          set(state => {
            logger.debug('Randomizer state reset');
            // Reset everything except preferences
            return {
              ...initialState,
              preferences: state.preferences, // Keep preferences
            };
          }),

        resetUIState: () =>
          set(state => {
            logger.debug('UI state reset');
            return {
              ...state,
              isSpinning: false,
              wheelRotation: 0,
              showHistory: state.preferences.showHistoryByDefault,
              showProjectSelector: true,
              error: null,
              retryCount: 0,
            };
          }),

        resetDataState: () =>
          set(state => {
            logger.debug('Data state reset');
            return {
              ...state,
              availableProjects: [],
              selectedProjectIds: new Set(),
              lastSpinResult: null,
              spinHistory: [],
            };
          }),
      },
    }),
    {
      name: 'randomizer-preferences', // Storage key
      storage: createJSONStorage(() => localStorage),
      // Only persist user preferences, not the entire state
      partialize: state => ({
        preferences: state.preferences,
      }),
      // Merge persisted preferences back into state
      onRehydrateStorage: () => state => {
        if (state?.preferences) {
          // Sync preferences to main state
          state.animationEnabled = state.preferences.animationEnabled;
          state.renderMode = state.preferences.renderMode;
          state.showHistory = state.preferences.showHistoryByDefault;
          logger.debug('Preferences rehydrated from storage');
        }
      },
    }
  )
);

/**
 * Selector hooks for specific parts of the state
 * These provide optimized subscriptions to prevent unnecessary re-renders
 */

/** Hook to get only the selected projects */
export const useSelectedProjects = () => useRandomizerStore(state => state.getSelectedProjects());

/** Hook to get only the statistics */
export const useRandomizerStats = () => useRandomizerStore(state => state.getStats());

/** Hook to get only the loading states */
export const useRandomizerLoading = () =>
  useRandomizerStore(state => ({
    isLoadingProjects: state.isLoadingProjects,
    isLoadingHistory: state.isLoadingHistory,
    isCreatingSpin: state.isCreatingSpin,
    isSpinning: state.isSpinning,
  }));

/** Hook to get only the error state */
export const useRandomizerError = () =>
  useRandomizerStore(state => ({
    error: state.error,
    retryCount: state.retryCount,
  }));

/** Hook to get only the UI state */
export const useRandomizerUI = () =>
  useRandomizerStore(state => ({
    showHistory: state.showHistory,
    showProjectSelector: state.showProjectSelector,
    wheelRotation: state.wheelRotation,
  }));

/** Hook to get only the preferences */
export const useRandomizerPreferences = () => useRandomizerStore(state => state.preferences);

/** Hook to get all actions */
export const useRandomizerActions = () => useRandomizerStore(state => state.actions);
