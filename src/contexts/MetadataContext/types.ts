/**
 * Metadata Context Types
 * @author @serabi
 * @created 2025-08-02
 */

import type { Tag } from '@/types/tag';
import { ArtistsResponse, CompaniesResponse } from '@/types/pocketbase.types';

/**
 * Individual resource loading states
 */
export interface MetadataLoadingStates {
  companies: boolean;
  artists: boolean;
  tags: boolean;
}

/**
 * Individual resource error states
 */
export interface MetadataErrorStates {
  companies: Error | null;
  artists: Error | null;
  tags: Error | null;
}

/**
 * Refresh function types for metadata resources
 */
export interface MetadataRefreshFunctions {
  /** Refresh all metadata resources */
  refresh: () => Promise<void>;
  /** Refresh only companies */
  refreshCompanies: () => Promise<void>;
  /** Refresh only artists */
  refreshArtists: () => Promise<void>;
  /** Refresh only tags */
  refreshTags: () => Promise<void>;
}

/**
 * Core metadata context type definition
 */
export interface MetadataContextType {
  /** Raw companies data */
  companies: CompaniesResponse[];
  /** Raw artists data */
  artists: ArtistsResponse[];
  /** Raw tags data */
  tags: Tag[];
  /** Derived company names array */
  companyNames: string[];
  /** Derived artist names array */
  artistNames: string[];
  /** Loading states for each resource */
  isLoading: MetadataLoadingStates;
  /** Error states for each resource */
  error: MetadataErrorStates;
  /** Refresh functions */
  refresh: () => Promise<void>;
  refreshCompanies: () => Promise<void>;
  refreshArtists: () => Promise<void>;
  refreshTags: () => Promise<void>;
}

/**
 * Default loading states factory
 */
export const getDefaultLoadingStates = (): MetadataLoadingStates => ({
  companies: false,
  artists: false,
  tags: false,
});

/**
 * Default error states factory
 */
export const getDefaultErrorStates = (): MetadataErrorStates => ({
  companies: null,
  artists: null,
  tags: null,
});
