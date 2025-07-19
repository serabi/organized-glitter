/**
 * Comprehensive mock type definitions for testing
 * @author @serabi
 * @created 2025-07-14
 */

import type { Mock } from 'vitest';
import type { NavigateFunction } from 'react-router-dom';
import type { Project, ProjectFormValues, ProjectStatus } from './shared';
import type { ProjectsResponse } from './pocketbase.types';

// Core mock function type
export type MockFn<T extends (...args: unknown[]) => unknown> = Mock<T>;

// React Query Mocks
export interface MockQueryClient {
  getQueryData: MockFn<(queryKey: readonly unknown[]) => unknown>;
  setQueryData: MockFn<(queryKey: readonly unknown[], data: unknown) => void>;
  invalidateQueries: MockFn<(filters?: { queryKey?: readonly unknown[] }) => Promise<void>>;
  cancelQueries: MockFn<(filters?: { queryKey?: readonly unknown[] }) => Promise<void>>;
  refetchQueries: MockFn<(filters?: { queryKey?: readonly unknown[] }) => Promise<void>>;
}

export interface MockUseQueryResult<TData = unknown> {
  data?: TData;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  refetch?: MockFn<() => Promise<{ data: TData }>>;
}

export interface MockUseMutationResult<TData = unknown, TVariables = unknown> {
  mutate?: MockFn<(variables: TVariables) => void>;
  mutateAsync?: MockFn<(variables: TVariables) => Promise<TData>>;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  data?: TData;
}

// Navigation Mocks
export interface MockNavigateFunction extends Partial<NavigateFunction> {
  (to: string | number, options?: { replace?: boolean; state?: unknown }): void;
}

// PocketBase Collection Mocks
export interface MockPocketBaseCollection {
  getOne: MockFn<(id: string, options?: Record<string, unknown>) => Promise<ProjectsResponse>>;
  getList: MockFn<
    (
      page?: number,
      perPage?: number,
      options?: Record<string, unknown>
    ) => Promise<{
      page: number;
      perPage: number;
      totalItems: number;
      totalPages: number;
      items: ProjectsResponse[];
    }>
  >;
  create: MockFn<
    (data: Record<string, unknown>, options?: Record<string, unknown>) => Promise<ProjectsResponse>
  >;
  update: MockFn<
    (
      id: string,
      data: Record<string, unknown>,
      options?: Record<string, unknown>
    ) => Promise<ProjectsResponse>
  >;
  delete: MockFn<(id: string) => Promise<boolean>>;
  getFirstListItem: MockFn<
    (filter: string, options?: Record<string, unknown>) => Promise<ProjectsResponse>
  >;
  getFullList: MockFn<(options?: Record<string, unknown>) => Promise<ProjectsResponse[]>>;
  getURL: MockFn<(record: ProjectsResponse, filename: string) => string>;
}

export interface MockPocketBase {
  collection: MockFn<(name: string) => MockPocketBaseCollection>;
  filter: MockFn<(query: string, params: Record<string, unknown>) => string>;
  authStore: {
    isValid: boolean;
    model: {
      id: string;
      email: string;
      username: string;
    } | null;
  };
}

// Randomizer/Spin specific mocks
export interface MockSpinData {
  id: string;
  user: string;
  selected_projects: string[];
  spin_type: string;
  created: string;
  updated: string;
}

export interface MockCreateSpinParams {
  user: string;
  project: string;
  project_title: string;
  selected_projects: string[];
}

// Project specific mocks
export interface MockProjectData extends Partial<Project> {
  id: string;
  title: string;
  status: ProjectStatus;
  userId: string;
}

export interface MockProjectFormData extends Partial<ProjectFormValues> {
  title: string;
  status: ProjectStatus;
}

// Context Mocks
export interface MockFilterContext {
  filters: Record<string, unknown>;
  setFilters: MockFn<(filters: Record<string, unknown>) => void>;
  resetFilters: MockFn<() => void>;
}

export interface MockUIContext {
  isLoading: boolean;
  setIsLoading: MockFn<(loading: boolean) => void>;
  showDialog: MockFn<(config: { title: string; message: string }) => void>;
}

// Hook Return Value Mocks
export interface MockRandomizerHook {
  availableProjects: MockProjectData[];
  selectedProjects: MockProjectData[];
  isSpinning: boolean;
  spinHistory: MockSpinData[];
  spin: MockFn<() => void>;
  addProject: MockFn<(project: MockProjectData) => void>;
  removeProject: MockFn<(projectId: string) => void>;
  clearSelection: MockFn<() => void>;
}

export interface MockNavigationHook {
  navigateToProject: MockFn<
    (projectId: string, options?: { replace?: boolean; state?: unknown }) => void
  >;
  navigateToDashboard: MockFn<(options?: { replace?: boolean }) => void>;
}

// Form Mocks
export interface MockFormHandlers {
  handleSubmit: MockFn<(data: ProjectFormValues) => void>;
  handleFieldChange: MockFn<(field: keyof ProjectFormValues, value: unknown) => void>;
  resetForm: MockFn<() => void>;
}

// User/Auth Mocks
export interface MockUser {
  id: string;
  email: string;
  username: string;
  verified?: boolean;
}

export interface MockAuthState {
  user: MockUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: MockFn<(email: string, password: string) => Promise<void>>;
  logout: MockFn<() => void>;
  register: MockFn<
    (userData: { email: string; password: string; username: string }) => Promise<void>
  >;
}

// Component Mock Props
export interface MockComponentProps {
  [key: string]: unknown;
}

// Logger Mocks (already defined in test-utils.ts but keeping for completeness)
export interface MockLogger {
  debug: MockFn<(message: string, ...args: unknown[]) => void>;
  info: MockFn<(message: string, ...args: unknown[]) => void>;
  warn: MockFn<(message: string, ...args: unknown[]) => void>;
  error: MockFn<(message: string, ...args: unknown[]) => void>;
  criticalError: MockFn<(message: string, ...args: unknown[]) => void>;
}

// Utility type for creating test data factories
export type TestDataFactory<T> = (overrides?: Partial<T>) => T;

// Common test helper types
export type MockSetup<T = unknown> = () => T;
export type MockCleanup = () => void;
export type MockReset = () => void;
