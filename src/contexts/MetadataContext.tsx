import React, { useMemo, useEffect, useCallback } from 'react';
import { useAllCompanies } from '@/hooks/queries/useCompanies';
import { useArtists } from '@/hooks/queries/useArtists';
import { useTags } from '@/hooks/queries/useTags';
import { useAuth } from '@/hooks/useAuth';
import { MetadataContext, type MetadataContextType } from '@/contexts/contexts-metadata';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MetadataContext');

// Hook moved to useMetadata.ts for React Fast Refresh optimization
// Import with: import { useMetadata } from '@/contexts/useMetadata';

interface MetadataProviderProps {
  children: React.ReactNode;
}

/**
 * Shared metadata context using React Query for companies, artists, and tags
 * React Query handles caching, deduplication, and prevents redundant API calls
 */
export const MetadataProvider = React.memo(
  ({ children }: MetadataProviderProps) => {
    const { user } = useAuth();
    const userId = user?.id;

    logger.debug('MetadataProvider: Starting render, calling hooks');

    const companiesQuery = useAllCompanies(userId);
    logger.debug('MetadataProvider: useAllCompanies completed', {
      isLoading: companiesQuery.isLoading,
      dataLength:
        companiesQuery.isSuccess && Array.isArray(companiesQuery.data)
          ? companiesQuery.data.length
          : 0,
      error: companiesQuery.error?.message,
    });

    const artistsQuery = useArtists(userId);
    logger.debug('MetadataProvider: useArtists completed', {
      isLoading: artistsQuery.isLoading,
      dataLength:
        artistsQuery.isSuccess && Array.isArray(artistsQuery.data) ? artistsQuery.data.length : 0,
      error: artistsQuery.error?.message,
    });

    const tagsQuery = useTags(userId);
    logger.debug('MetadataProvider: useTags completed', {
      isLoading: tagsQuery.isLoading,
      dataLength: tagsQuery.isSuccess && Array.isArray(tagsQuery.data) ? tagsQuery.data.length : 0,
      error: tagsQuery.error?.message,
    });

    // Debug logging to track re-renders
    useEffect(() => {
      logger.debug('MetadataProvider rendered/re-rendered', {
        companiesLoading: companiesQuery.isLoading,
        artistsLoading: artistsQuery.isLoading,
        tagsLoading: tagsQuery.isLoading,
        companiesData:
          companiesQuery.isSuccess && Array.isArray(companiesQuery.data)
            ? companiesQuery.data.length
            : 0,
        artistsData:
          artistsQuery.isSuccess && Array.isArray(artistsQuery.data) ? artistsQuery.data.length : 0,
        tagsData: tagsQuery.isSuccess && Array.isArray(tagsQuery.data) ? tagsQuery.data.length : 0,
      });
    }, [
      companiesQuery.isLoading,
      artistsQuery.isLoading,
      tagsQuery.isLoading,
      companiesQuery.isSuccess,
      artistsQuery.isSuccess,
      tagsQuery.isSuccess,
      companiesQuery.data,
      artistsQuery.data,
      tagsQuery.data,
    ]);

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

    const artistNames = useMemo(
      () => artists.map(artist => artist.name).filter(Boolean),
      [artists]
    );

    // Batch loading state updates to reduce cascading re-renders
    const isLoading = useMemo(() => {
      return {
        companies: companiesQuery.isLoading,
        artists: artistsQuery.isLoading,
        tags: tagsQuery.isLoading,
      };
    }, [companiesQuery.isLoading, artistsQuery.isLoading, tagsQuery.isLoading]);

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
    }, [companiesQuery, artistsQuery, tagsQuery]);

    const refreshCompanies = useCallback(async () => {
      await companiesQuery.refetch();
    }, [companiesQuery]);

    const refreshArtists = useCallback(async () => {
      await artistsQuery.refetch();
    }, [artistsQuery]);

    const refreshTags = useCallback(async () => {
      await tagsQuery.refetch();
    }, [tagsQuery]);

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
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    // Since children is typically stable in context providers, we can use reference equality
    return prevProps.children === nextProps.children;
  }
);

MetadataProvider.displayName = 'MetadataProvider';
