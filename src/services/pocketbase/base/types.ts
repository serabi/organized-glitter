/**
 * Core type definitions for PocketBase service layer
 * @author @serabi
 * @created 2025-07-16
 */

import { ClientResponseError } from 'pocketbase';

// Base PocketBase record interface
export interface BaseRecord {
  id: string;
  created: string;
  updated: string;
}

// Filter operator types
export type FilterOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | '~'
  | '!~' // Like/Contains
  | '?='
  | '?!='
  | '?>'
  | '?>='
  | '?<'
  | '?<='
  | '?~'
  | '?!~'; // Any/At least one

// Structured filter interface
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export interface FilterGroup {
  conditions?: FilterCondition[];
  groups?: FilterGroup[];
  logic: 'AND' | 'OR';
}

export interface StructuredFilter {
  conditions?: FilterCondition[];
  groups?: FilterGroup[];
  logic?: 'AND' | 'OR';
}

// CRUD operation options
export interface ListOptions {
  page?: number;
  perPage?: number;
  sort?: string;
  expand?: string | string[];
  filter?: StructuredFilter;
}

export interface ListResult<T> {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
}

// Error types
export interface PocketBaseError {
  type: 'network' | 'validation' | 'auth' | 'permission' | 'not_found' | 'server';
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  originalError?: ClientResponseError;
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

// Field mapping types
export interface FieldMapping {
  [frontendKey: string]: string; // Maps to backend snake_case
}

// Service configuration
export interface ServiceConfig {
  collection: string;
  fieldMapping?: FieldMapping;
  defaultExpand?: string[];
  defaultSort?: string;
}

// Subscription management
export interface SubscriptionCleanup {
  unsubscribe: () => void;
  collection: string;
  filter?: string;
}

export interface SubscriptionManager {
  subscribe<T>(
    collection: string,
    callback: (data: T) => void,
    filter?: string
  ): SubscriptionCleanup;
  unsubscribeAll(): void;
  unsubscribeCollection(collection: string): void;
}

// Generic CRUD service interface
export interface CRUDService<T extends BaseRecord> {
  list(options?: ListOptions): Promise<ListResult<T>>;
  getOne(id: string, expand?: string[]): Promise<T>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}
