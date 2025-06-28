/**
 * Common TypeScript interfaces for PocketBase operations
 * 
 * This file contains shared type definitions used across PocketBase services
 * and utilities, following TypeScript best practices for type organization.
 */

// PocketBase error interface for consistent error handling
export interface PocketBaseError {
  status?: number;
  message?: string;
  data?: {
    message?: string;
    data?: Record<string, { message?: string; code?: string }>;
  };
  isAbort?: boolean;
}

// Generic PocketBase record interface with common fields
export interface PocketBaseRecord {
  id: string;
  created: string;
  updated: string;
  [key: string]: unknown;
}