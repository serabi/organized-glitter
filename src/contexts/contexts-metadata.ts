/**
 * Metadata context definition - separated for circular import avoidance
 * @author @serabi
 * @created 2025-08-02
 */

import { createContext } from 'react';
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

export const MetadataContext = createContext<MetadataContextType | undefined>(undefined);

export type { MetadataContextType };
