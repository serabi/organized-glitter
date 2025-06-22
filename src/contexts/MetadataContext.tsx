import React, { createContext, useContext } from 'react';
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

  const value: MetadataContextType = {
    companies: Array.isArray(companiesQuery.data) ? companiesQuery.data : [],
    artists: Array.isArray(artistsQuery.data) ? artistsQuery.data : [],
    tags: Array.isArray(tagsQuery.data) ? tagsQuery.data : [],
    companyNames: Array.isArray(companiesQuery.data)
      ? companiesQuery.data.map(company => company.name).filter(Boolean)
      : [],
    artistNames: Array.isArray(artistsQuery.data)
      ? artistsQuery.data.map(artist => artist.name).filter(Boolean)
      : [],
    isLoading: {
      companies: companiesQuery.isLoading,
      artists: artistsQuery.isLoading,
      tags: tagsQuery.isLoading,
    },
    error: {
      companies: companiesQuery.error,
      artists: artistsQuery.error,
      tags: tagsQuery.error,
    },
    refresh: async () => {
      await Promise.all([companiesQuery.refetch(), artistsQuery.refetch(), tagsQuery.refetch()]);
    },
    refreshCompanies: async () => {
      await companiesQuery.refetch();
    },
    refreshArtists: async () => {
      await artistsQuery.refetch();
    },
    refreshTags: async () => {
      await tagsQuery.refetch();
    },
  };

  return <MetadataContext.Provider value={value}>{children}</MetadataContext.Provider>;
}
