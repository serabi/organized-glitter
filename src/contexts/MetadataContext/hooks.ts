/**
 * Metadata Context Hooks
 * @author @serabi
 * @created 2025-08-02
 */

import { useContext, useMemo } from 'react';
import { MetadataContext, MetadataContextType } from './context';

/**
 * Main metadata hook - covers most use cases
 * @returns Full metadata context with all data and functions
 * @throws Error if used outside of MetadataProvider
 */
export const useMetadata = (): MetadataContextType => {
  const context = useContext(MetadataContext);
  if (!context) {
    throw new Error('useMetadata must be used within a MetadataProvider');
  }
  return context;
};

/**
 * Companies-specific utilities hook
 */
export const useMetadataCompanies = () => {
  const { companies, companyNames, isLoading, error, refreshCompanies } = useMetadata();

  return useMemo(
    () => ({
      companies,
      companyNames,
      isLoading: isLoading.companies,
      error: error.companies,
      refresh: refreshCompanies,
      hasCompanies: companies.length > 0,
      companiesCount: companies.length,
    }),
    [companies, companyNames, isLoading.companies, error.companies, refreshCompanies]
  );
};

/**
 * Artists-specific utilities hook
 */
export const useMetadataArtists = () => {
  const { artists, artistNames, isLoading, error, refreshArtists } = useMetadata();

  return useMemo(
    () => ({
      artists,
      artistNames,
      isLoading: isLoading.artists,
      error: error.artists,
      refresh: refreshArtists,
      hasArtists: artists.length > 0,
      artistsCount: artists.length,
    }),
    [artists, artistNames, isLoading.artists, error.artists, refreshArtists]
  );
};

/**
 * Tags-specific utilities hook
 */
export const useMetadataTags = () => {
  const { tags, isLoading, error, refreshTags } = useMetadata();

  return useMemo(
    () => ({
      tags,
      isLoading: isLoading.tags,
      error: error.tags,
      refresh: refreshTags,
      hasTags: tags.length > 0,
      tagsCount: tags.length,
    }),
    [tags, isLoading.tags, error.tags, refreshTags]
  );
};

/**
 * Loading states utilities hook
 */
export const useMetadataLoading = () => {
  const { isLoading } = useMetadata();

  return useMemo(
    () => ({
      ...isLoading,
      isAnyLoading: isLoading.companies || isLoading.artists || isLoading.tags,
      isAllLoading: isLoading.companies && isLoading.artists && isLoading.tags,
      loadingCount: [isLoading.companies, isLoading.artists, isLoading.tags].filter(Boolean).length,
    }),
    [isLoading]
  );
};

/**
 * Error states utilities hook
 */
export const useMetadataErrors = () => {
  const { error } = useMetadata();

  return useMemo(
    () => ({
      ...error,
      hasAnyError: !!error.companies || !!error.artists || !!error.tags,
      hasAllErrors: !!error.companies && !!error.artists && !!error.tags,
      errorCount: [error.companies, error.artists, error.tags].filter(Boolean).length,
    }),
    [error]
  );
};

/**
 * Refresh utilities hook
 */
export const useMetadataRefresh = () => {
  const { refresh, refreshCompanies, refreshArtists, refreshTags } = useMetadata();

  return useMemo(
    () => ({
      refresh,
      refreshCompanies,
      refreshArtists,
      refreshTags,
      refreshAll: refresh,
    }),
    [refresh, refreshCompanies, refreshArtists, refreshTags]
  );
};
