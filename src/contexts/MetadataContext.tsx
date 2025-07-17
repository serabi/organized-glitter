import React, { createContext, useContext, useMemo, useEffect, useCallback, useState } from 'react';
import { useAllCompanies } from '@/hooks/queries/useCompanies';
import { useArtists } from '@/hooks/queries/useArtists';
import { useTags } from '@/hooks/queries/useTags';
import type { Tag } from '@/types/tag';
import { ArtistsResponse, CompaniesResponse } from '@/types/pocketbase.types';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('MetadataContext');

interface MetadataContextType {
  companies: CompaniesResponse[];
  artists: ArtistsResponse[];
  tags: Tag[];
  companyNames: string[];
  artistNames: string[];
  isLoading: {
    companies: boolean;
    artists: boolean;
    tags: boolean;
  };
  error: {
    companies: Error | null;
    artists: Error | null;
    tags: Error | null;
  };
  refresh: () => Promise<void>;
  refreshCompanies: () => Promise<void>;
  refreshArtists: () => Promise<void>;
  refreshTags: () => Promise<void>;
}

const MetadataContext = createContext<MetadataContextType | undefined>(undefined);

export function useMetadata() {
  const context = useContext(MetadataContext);
  if (!context) {
    throw new Error('useMetadata must be used within a MetadataProvider');
  }
  return context;
}

interface MetadataProviderProps {
  children: React.ReactNode;
}

/**
 * Shared metadata context using React Query for companies, artists, and tags
 * React Query handles caching, deduplication, and prevents redundant API calls
 */
export const MetadataProvider = React.memo(({ children }: MetadataProviderProps) => {
  logger.debug('MetadataProvider: Starting render, calling hooks');

  const companiesQuery = useAllCompanies();
  logger.debug('MetadataProvider: useAllCompanies completed', {
    isLoading: companiesQuery.isLoading,
    dataLength: companiesQuery.data?.length || 0,
    error: companiesQuery.error?.message,
  });

  const artistsQuery = useArtists();
  logger.debug('MetadataProvider: useArtists completed', {
    isLoading: artistsQuery.isLoading,
    dataLength: artistsQuery.data?.length || 0,
    error: artistsQuery.error?.message,
  });

  const tagsQuery = useTags();
  logger.debug('MetadataProvider: useTags completed', {
    isLoading: tagsQuery.isLoading,
    dataLength: tagsQuery.data?.length || 0,
    error: tagsQuery.error?.message,
  });

  // Debug logging to track re-renders
  useEffect(() => {
    logger.debug('MetadataProvider rendered/re-rendered', {
      companiesLoading: companiesQuery.isLoading,
      artistsLoading: artistsQuery.isLoading,
      tagsLoading: tagsQuery.isLoading,
      companiesData: companiesQuery.data?.length || 0,
      artistsData: artistsQuery.data?.length || 0,
      tagsData: tagsQuery.data?.length || 0,
    });
  });

  // Memoize arrays to prevent recreation on every render
  const companies = useMemo(
    () => (Array.isArray(companiesQuery.data) ? companiesQuery.data : []),
    [companiesQuery.data]
  );

  const artists = useMemo(
    () => (Array.isArray(artistsQuery.data) ? artistsQuery.data : []),
    [artistsQuery.data]
  );

  const tags = useMemo(
    () => (Array.isArray(tagsQuery.data) ? tagsQuery.data : []),
    [tagsQuery.data]
  );

  // Memoize derived arrays to prevent infinite loops
  const companyNames = useMemo(
    () => companies.map(company => company.name).filter(Boolean),
    [companies]
  );

  const artistNames = useMemo(() => artists.map(artist => artist.name).filter(Boolean), [artists]);

  // Debounced loading state to reduce frequent re-renders
  const [stableLoadingState, setStableLoadingState] = useState({
    companies: true,
    artists: true,
    tags: true,
  });

  // Update loading state with debouncing to prevent cascade re-renders
  useEffect(() => {
    const newLoadingState = {
      companies: companiesQuery.isLoading,
      artists: artistsQuery.isLoading,
      tags: tagsQuery.isLoading,
    };

    // Only update if the state actually changed to avoid unnecessary renders
    const stateChanged =
      stableLoadingState.companies !== newLoadingState.companies ||
      stableLoadingState.artists !== newLoadingState.artists ||
      stableLoadingState.tags !== newLoadingState.tags;

    if (stateChanged) {
      // Use a small delay to batch state updates
      const timeoutId = setTimeout(() => {
        setStableLoadingState(newLoadingState);
      }, 10);

      return () => clearTimeout(timeoutId);
    }
  }, [companiesQuery.isLoading, artistsQuery.isLoading, tagsQuery.isLoading, stableLoadingState]);

  const isLoading = stableLoadingState;

  const error = useMemo(
    () => ({
      companies: companiesQuery.error,
      artists: artistsQuery.error,
      tags: tagsQuery.error,
    }),
    [companiesQuery.error, artistsQuery.error, tagsQuery.error]
  );

  // Use useCallback for refresh functions to prevent recreation and reduce re-renders
  const refresh = useCallback(async () => {
    await Promise.all([companiesQuery.refetch(), artistsQuery.refetch(), tagsQuery.refetch()]);
  }, [companiesQuery.refetch, artistsQuery.refetch, tagsQuery.refetch]);

  const refreshCompanies = useCallback(async () => {
    await companiesQuery.refetch();
  }, [companiesQuery.refetch]);

  const refreshArtists = useCallback(async () => {
    await artistsQuery.refetch();
  }, [artistsQuery.refetch]);

  const refreshTags = useCallback(async () => {
    await tagsQuery.refetch();
  }, [tagsQuery.refetch]);

  const value: MetadataContextType = useMemo(
    () => ({
      companies,
      artists,
      tags,
      companyNames,
      artistNames,
      isLoading,
      error,
      refresh,
      refreshCompanies,
      refreshArtists,
      refreshTags,
    }),
    [
      companies,
      artists,
      tags,
      companyNames,
      artistNames,
      isLoading,
      error,
      refresh,
      refreshCompanies,
      refreshArtists,
      refreshTags,
    ]
  );

  return <MetadataContext.Provider value={value}>{children}</MetadataContext.Provider>;
});

MetadataProvider.displayName = 'MetadataProvider';
