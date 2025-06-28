import React, { createContext, useContext, useMemo } from 'react';
import { useCompanies } from '@/hooks/queries/useCompanies';
import { useArtists } from '@/hooks/queries/useArtists';
import { useTags } from '@/hooks/queries/useTags';
import type { Tag } from '@/types/tag';
import { ArtistsResponse, CompaniesResponse } from '@/types/pocketbase.types';

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
export function MetadataProvider({ children }: MetadataProviderProps) {
  const companiesQuery = useCompanies();
  const artistsQuery = useArtists();
  const tagsQuery = useTags();

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

  // Memoize loading and error objects to prevent recreation
  const isLoading = useMemo(
    () => ({
      companies: companiesQuery.isLoading,
      artists: artistsQuery.isLoading,
      tags: tagsQuery.isLoading,
    }),
    [companiesQuery.isLoading, artistsQuery.isLoading, tagsQuery.isLoading]
  );

  const error = useMemo(
    () => ({
      companies: companiesQuery.error,
      artists: artistsQuery.error,
      tags: tagsQuery.error,
    }),
    [companiesQuery.error, artistsQuery.error, tagsQuery.error]
  );

  // Memoize callback functions to prevent recreation
  const refresh = useMemo(
    () => async () => {
      await Promise.all([companiesQuery.refetch(), artistsQuery.refetch(), tagsQuery.refetch()]);
    },
    [companiesQuery.refetch, artistsQuery.refetch, tagsQuery.refetch]
  );

  const refreshCompanies = useMemo(
    () => async () => {
      await companiesQuery.refetch();
    },
    [companiesQuery.refetch]
  );

  const refreshArtists = useMemo(
    () => async () => {
      await artistsQuery.refetch();
    },
    [artistsQuery.refetch]
  );

  const refreshTags = useMemo(
    () => async () => {
      await tagsQuery.refetch();
    },
    [tagsQuery.refetch]
  );

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
}
