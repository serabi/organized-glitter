/**
 * @fileoverview Tests for Randomizer Store
 *
 * Comprehensive test suite for the Zustand randomizer store, covering
 * state management, actions, computed values, and persistence.
 *
 * @author @serabi
 * @version 2.0.0
 * @since 2025-07-19
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Project } from '../../types/project';
import { useRandomizerStore, createRandomizerError, RandomizerErrorType } from '../randomizerStore';

// Mock the logger
vi.mock('../../utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock projects for testing
const mockProjects: Project[] = [
  {
    id: '123456789012345',
    userId: 'user123',
    title: 'Test Project 1',
    status: 'progress',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '234567890123456',
    userId: 'user123',
    title: 'Test Project 2',
    status: 'progress',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '345678901234567',
    userId: 'user123',
    title: 'Test Project 3',
    status: 'progress',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

describe('RandomizerStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useRandomizerStore());
    act(() => {
      result.current.actions.reset();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useRandomizerStore());
      const state = result.current;

      expect(state.availableProjects).toEqual([]);
      expect(state.selectedProjectIds).toEqual(new Set());
      expect(state.lastSpinResult).toBeNull();
      expect(state.spinHistory).toEqual([]);
      expect(state.isSpinning).toBe(false);
      expect(state.wheelRotation).toBe(0);
      expect(state.showHistory).toBe(false);
      expect(state.showProjectSelector).toBe(true);
      expect(state.isLoadingProjects).toBe(false);
      expect(state.isLoadingHistory).toBe(false);
      expect(state.isCreatingSpin).toBe(false);
      expect(state.error).toBeNull();
      expect(state.retryCount).toBe(0);
      expect(state.renderMode).toBe('css');
      expect(state.animationEnabled).toBe(true);
    });

    it('should have correct default preferences', () => {
      const { result } = renderHook(() => useRandomizerStore());
      const preferences = result.current.preferences;

      expect(preferences.animationEnabled).toBe(true);
      expect(preferences.renderMode).toBe('css');
      expect(preferences.showHistoryByDefault).toBe(false);
      expect(preferences.autoClearResults).toBe(false);
      expect(preferences.wheelSize).toBe('medium');
      expect(preferences.showProjectImages).toBe(true);
    });
  });

  describe('Project Management', () => {
    it('should set available projects', () => {
      const { result } = renderHook(() => useRandomizerStore());

      act(() => {
        result.current.actions.setAvailableProjects(mockProjects);
      });

      expect(result.current.availableProjects).toEqual(mockProjects);
    });

    it('should toggle project selection', () => {
      const { result } = renderHook(() => useRandomizerStore());

      act(() => {
        result.current.actions.setAvailableProjects(mockProjects);
        result.current.actions.toggleProjectSelection(mockProjects[0].id);
      });

      expect(result.current.selectedProjectIds.has(mockProjects[0].id)).toBe(true);

      act(() => {
        result.current.actions.toggleProjectSelection(mockProjects[0].id);
      });

      expect(result.current.selectedProjectIds.has(mockProjects[0].id)).toBe(false);
    });

    it('should select all projects', () => {
      const { result } = renderHook(() => useRandomizerStore());

      act(() => {
        result.current.actions.setAvailableProjects(mockProjects);
        result.current.actions.selectAllProjects();
      });

      expect(result.current.selectedProjectIds.size).toBe(mockProjects.length);
      mockProjects.forEach(project => {
        expect(result.current.selectedProjectIds.has(project.id)).toBe(true);
      });
    });

    it('should clear selection', () => {
      const { result } = renderHook(() => useRandomizerStore());

      act(() => {
        result.current.actions.setAvailableProjects(mockProjects);
        result.current.actions.selectAllProjects();
        result.current.actions.clearSelection();
      });

      expect(result.current.selectedProjectIds.size).toBe(0);
    });

    it('should select projects by IDs', () => {
      const { result } = renderHook(() => useRandomizerStore());
      const idsToSelect = [mockProjects[0].id, mockProjects[2].id];

      act(() => {
        result.current.actions.setAvailableProjects(mockProjects);
        result.current.actions.selectProjectsByIds(idsToSelect);
      });

      expect(result.current.selectedProjectIds.size).toBe(2);
      expect(result.current.selectedProjectIds.has(mockProjects[0].id)).toBe(true);
      expect(result.current.selectedProjectIds.has(mockProjects[2].id)).toBe(true);
      expect(result.current.selectedProjectIds.has(mockProjects[1].id)).toBe(false);
    });

    it('should filter invalid IDs when selecting by IDs', () => {
      const { result } = renderHook(() => useRandomizerStore());
      const idsToSelect = [mockProjects[0].id, 'invalid-id', mockProjects[1].id];

      act(() => {
        result.current.actions.setAvailableProjects(mockProjects);
        result.current.actions.selectProjectsByIds(idsToSelect);
      });

      expect(result.current.selectedProjectIds.size).toBe(2);
      expect(result.current.selectedProjectIds.has(mockProjects[0].id)).toBe(true);
      expect(result.current.selectedProjectIds.has(mockProjects[1].id)).toBe(true);
      expect(result.current.selectedProjectIds.has('invalid-id')).toBe(false);
    });
  });

  describe('Computed Values', () => {
    it('should return selected projects correctly', () => {
      const { result } = renderHook(() => useRandomizerStore());

      act(() => {
        result.current.actions.setAvailableProjects(mockProjects);
        result.current.actions.toggleProjectSelection(mockProjects[0].id);
        result.current.actions.toggleProjectSelection(mockProjects[2].id);
      });

      const selectedProjects = result.current.getSelectedProjects();
      expect(selectedProjects).toHaveLength(2);
      expect(selectedProjects[0].id).toBe(mockProjects[0].id);
      expect(selectedProjects[1].id).toBe(mockProjects[2].id);
    });

    it('should calculate stats correctly', () => {
      const { result } = renderHook(() => useRandomizerStore());

      act(() => {
        result.current.actions.setAvailableProjects(mockProjects);
        result.current.actions.toggleProjectSelection(mockProjects[0].id);
        result.current.actions.toggleProjectSelection(mockProjects[1].id);
      });

      const stats = result.current.getStats();
      expect(stats.totalProjects).toBe(3);
      expect(stats.selectedCount).toBe(2);
      expect(stats.canSpin).toBe(true);
      expect(stats.hasProjects).toBe(true);
      expect(stats.hasSelection).toBe(true);
    });

    it('should indicate cannot spin with less than 2 projects', () => {
      const { result } = renderHook(() => useRandomizerStore());

      act(() => {
        result.current.actions.setAvailableProjects(mockProjects);
        result.current.actions.toggleProjectSelection(mockProjects[0].id);
      });

      const stats = result.current.getStats();
      expect(stats.canSpin).toBe(false);
    });

    it('should check if project is selected', () => {
      const { result } = renderHook(() => useRandomizerStore());

      act(() => {
        result.current.actions.setAvailableProjects(mockProjects);
        result.current.actions.toggleProjectSelection(mockProjects[0].id);
      });

      expect(result.current.isProjectSelected(mockProjects[0].id)).toBe(true);
      expect(result.current.isProjectSelected(mockProjects[1].id)).toBe(false);
    });
  });

  describe('Spin Management', () => {
    it('should set and clear spin result', () => {
      const { result } = renderHook(() => useRandomizerStore());

      act(() => {
        result.current.actions.setLastSpinResult(mockProjects[0]);
      });

      expect(result.current.lastSpinResult).toEqual(mockProjects[0]);

      act(() => {
        result.current.actions.clearLastResult();
      });

      expect(result.current.lastSpinResult).toBeNull();
    });

    it('should manage spinning state', () => {
      const { result } = renderHook(() => useRandomizerStore());

      act(() => {
        result.current.actions.setSpinning(true);
      });

      expect(result.current.isSpinning).toBe(true);

      act(() => {
        result.current.actions.setSpinning(false);
      });

      expect(result.current.isSpinning).toBe(false);
    });

    it('should set wheel rotation', () => {
      const { result } = renderHook(() => useRandomizerStore());

      act(() => {
        result.current.actions.setWheelRotation(180);
      });

      expect(result.current.wheelRotation).toBe(180);
    });
  });

  describe('UI State Management', () => {
    it('should toggle history visibility', () => {
      const { result } = renderHook(() => useRandomizerStore());

      expect(result.current.showHistory).toBe(false);

      act(() => {
        result.current.actions.toggleShowHistory();
      });

      expect(result.current.showHistory).toBe(true);

      act(() => {
        result.current.actions.toggleShowHistory();
      });

      expect(result.current.showHistory).toBe(false);
    });

    it('should set history visibility directly', () => {
      const { result } = renderHook(() => useRandomizerStore());

      act(() => {
        result.current.actions.setShowHistory(true);
      });

      expect(result.current.showHistory).toBe(true);
    });

    it('should toggle project selector visibility', () => {
      const { result } = renderHook(() => useRandomizerStore());

      expect(result.current.showProjectSelector).toBe(true);

      act(() => {
        result.current.actions.toggleShowProjectSelector();
      });

      expect(result.current.showProjectSelector).toBe(false);
    });
  });

  describe('Loading States', () => {
    it('should manage loading states', () => {
      const { result } = renderHook(() => useRandomizerStore());

      act(() => {
        result.current.actions.setLoadingProjects(true);
        result.current.actions.setLoadingHistory(true);
        result.current.actions.setCreatingSpin(true);
      });

      expect(result.current.isLoadingProjects).toBe(true);
      expect(result.current.isLoadingHistory).toBe(true);
      expect(result.current.isCreatingSpin).toBe(true);

      act(() => {
        result.current.actions.setLoadingProjects(false);
        result.current.actions.setLoadingHistory(false);
        result.current.actions.setCreatingSpin(false);
      });

      expect(result.current.isLoadingProjects).toBe(false);
      expect(result.current.isLoadingHistory).toBe(false);
      expect(result.current.isCreatingSpin).toBe(false);
    });
  });

  describe('Error Management', () => {
    it('should set and clear errors', () => {
      const { result } = renderHook(() => useRandomizerStore());
      const error = createRandomizerError(
        RandomizerErrorType.NETWORK_ERROR,
        'Test error',
        true,
        'Try again'
      );

      act(() => {
        result.current.actions.setError(error);
      });

      expect(result.current.error).toEqual(error);

      act(() => {
        result.current.actions.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.retryCount).toBe(0);
    });

    it('should manage retry count', () => {
      const { result } = renderHook(() => useRandomizerStore());

      act(() => {
        result.current.actions.incrementRetryCount();
        result.current.actions.incrementRetryCount();
      });

      expect(result.current.retryCount).toBe(2);

      act(() => {
        result.current.actions.resetRetryCount();
      });

      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('Preferences Management', () => {
    it('should update preferences', () => {
      const { result } = renderHook(() => useRandomizerStore());

      act(() => {
        result.current.actions.updatePreferences({
          animationEnabled: false,
          wheelSize: 'large',
        });
      });

      expect(result.current.preferences.animationEnabled).toBe(false);
      expect(result.current.preferences.wheelSize).toBe('large');
      expect(result.current.animationEnabled).toBe(false);
    });

    it('should reset preferences to defaults', () => {
      const { result } = renderHook(() => useRandomizerStore());

      act(() => {
        result.current.actions.updatePreferences({
          animationEnabled: false,
          wheelSize: 'large',
        });
        result.current.actions.resetPreferences();
      });

      expect(result.current.preferences.animationEnabled).toBe(true);
      expect(result.current.preferences.wheelSize).toBe('medium');
    });

    it('should sync preferences to main state', () => {
      const { result } = renderHook(() => useRandomizerStore());

      act(() => {
        result.current.actions.setRenderMode('canvas');
        result.current.actions.setAnimationEnabled(false);
      });

      expect(result.current.renderMode).toBe('canvas');
      expect(result.current.animationEnabled).toBe(false);
      expect(result.current.preferences.renderMode).toBe('canvas');
      expect(result.current.preferences.animationEnabled).toBe(false);
    });
  });

  describe('Utility Actions', () => {
    it('should reset entire state except preferences', () => {
      const { result } = renderHook(() => useRandomizerStore());

      // Set some state
      act(() => {
        result.current.actions.setAvailableProjects(mockProjects);
        result.current.actions.selectAllProjects();
        result.current.actions.setSpinning(true);
        result.current.actions.updatePreferences({ wheelSize: 'large' });
      });

      // Reset
      act(() => {
        result.current.actions.reset();
      });

      expect(result.current.availableProjects).toEqual([]);
      expect(result.current.selectedProjectIds.size).toBe(0);
      expect(result.current.isSpinning).toBe(false);
      expect(result.current.preferences.wheelSize).toBe('large'); // Preferences preserved
    });

    it('should reset only UI state', () => {
      const { result } = renderHook(() => useRandomizerStore());

      // Set some state
      act(() => {
        result.current.actions.setAvailableProjects(mockProjects);
        result.current.actions.selectAllProjects();
        result.current.actions.setSpinning(true);
        result.current.actions.setWheelRotation(180);
      });

      // Reset UI state
      act(() => {
        result.current.actions.resetUIState();
      });

      expect(result.current.availableProjects).toEqual(mockProjects); // Data preserved
      expect(result.current.selectedProjectIds.size).toBe(3); // Data preserved
      expect(result.current.isSpinning).toBe(false); // UI reset
      expect(result.current.wheelRotation).toBe(0); // UI reset
    });

    it('should reset only data state', () => {
      const { result } = renderHook(() => useRandomizerStore());

      // Set some state
      act(() => {
        result.current.actions.setAvailableProjects(mockProjects);
        result.current.actions.selectAllProjects();
        result.current.actions.setSpinning(true);
      });

      // Reset data state
      act(() => {
        result.current.actions.resetDataState();
      });

      expect(result.current.availableProjects).toEqual([]); // Data reset
      expect(result.current.selectedProjectIds.size).toBe(0); // Data reset
      expect(result.current.isSpinning).toBe(true); // UI preserved
    });
  });
});

describe('createRandomizerError', () => {
  it('should create error with correct properties', () => {
    const error = createRandomizerError(
      RandomizerErrorType.NETWORK_ERROR,
      'Test error message',
      true,
      'Try again later',
      { detail: 'extra info' }
    );

    expect(error.type).toBe(RandomizerErrorType.NETWORK_ERROR);
    expect(error.message).toBe('Test error message');
    expect(error.canRetry).toBe(true);
    expect(error.suggestedAction).toBe('Try again later');
    expect(error.technicalDetails).toEqual({ detail: 'extra info' });
    expect(error.timestamp).toBeTypeOf('number');
  });

  it('should use default values when not provided', () => {
    const error = createRandomizerError(
      RandomizerErrorType.VALIDATION_ERROR,
      'Test error'
    );

    expect(error.canRetry).toBe(false);
    expect(error.suggestedAction).toBe('Please try again later');
    expect(error.technicalDetails).toBeUndefined();
  });
});