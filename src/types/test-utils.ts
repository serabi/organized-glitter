/**
 * Type definitions for testing utilities and mocks
 * @author @serabi
 * @created 2025-01-14
 */

import type { Mock } from 'vitest';
import type { ProjectFormValues, Project } from './shared';
import type { ProjectsResponse, ProjectTagsResponse } from './pocketbase.types';

// Mock function type for vitest
export type MockFunction<T extends (...args: unknown[]) => unknown> = Mock<
  Parameters<T>,
  ReturnType<T>
>;

// Form value types for testing
export type ProjectFormValue = ProjectFormValues[keyof ProjectFormValues];

// Mock PocketBase collection methods
export interface MockPocketBaseCollection {
  getOne: MockFunction<(id: string, options?: Record<string, unknown>) => Promise<Project>>;
  getList: MockFunction<
    (
      page?: number,
      perPage?: number,
      options?: Record<string, unknown>
    ) => Promise<MockProjectListResponse>
  >;
  create: MockFunction<
    (data: Record<string, unknown>, options?: Record<string, unknown>) => Promise<Project>
  >;
  update: MockFunction<
    (
      id: string,
      data: Record<string, unknown>,
      options?: Record<string, unknown>
    ) => Promise<Project>
  >;
  delete: MockFunction<(id: string) => Promise<boolean>>;
  getURL: MockFunction<(record: Project, filename: string) => string>;
}

// Mock PocketBase instance
export interface MockPocketBase {
  collection: MockFunction<(name: string) => MockPocketBaseCollection>;
  filter: MockFunction<(query: string, params: Record<string, unknown>) => string>;
  authStore: {
    isValid: boolean;
    model: {
      id: string;
      email: string;
      username: string;
    } | null;
  };
}

// Query configuration types for React Query mocks
export interface MockQueryConfig {
  queryKey: unknown[];
  queryFn: (...args: unknown[]) => Promise<unknown>;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

// Mock query result types
export interface MockQueryResult<T = unknown> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: MockFunction<() => Promise<T>>;
}

// Mock mutation result types
export interface MockMutationResult<TData = unknown, TVariables = unknown> {
  mutate: MockFunction<(variables: TVariables) => void>;
  mutateAsync: MockFunction<(variables: TVariables) => Promise<TData>>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  data: TData | undefined;
}

// PocketBase response types for mocking
export interface MockProjectResponse extends Project {
  expand?: {
    project_tags_via_project?: ProjectTagsResponse[];
  };
}

export interface MockProjectListResponse {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: MockProjectResponse[];
}

// User metadata mock types
export interface MockUserMetadata {
  companies: Array<{ id: string; name: string }>;
  artists: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string; color?: string }>;
}

// Navigation mock types
export interface MockNavigationHook {
  navigateToProject: MockFunction<(projectId: string, options?: Record<string, unknown>) => void>;
}

// Component mock props
export interface MockComponentProps {
  [key: string]: unknown;
}

// Logger mock types
export interface MockLogger {
  debug: MockFunction<(message: string, ...args: unknown[]) => void>;
  info: MockFunction<(message: string, ...args: unknown[]) => void>;
  warn: MockFunction<(message: string, ...args: unknown[]) => void>;
  error: MockFunction<(message: string, ...args: unknown[]) => void>;
  criticalError: MockFunction<(message: string, ...args: unknown[]) => void>;
}

// Form change handler type
export type FormChangeHandler = (field: keyof ProjectFormValues, value: ProjectFormValue) => void;

// Generic test data factory type
export type TestDataFactory<T> = (overrides?: Partial<T>) => T;
