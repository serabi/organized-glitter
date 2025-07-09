/**
 * Filter Meta Context - Metadata values for dashboard filters
 * @author @serabi
 * @created 2025-07-09
 */

import React, { createContext, useContext, useMemo, useRef, ReactNode } from 'react';
import { useMetadata } from '@/contexts/MetadataContext';
import { createLogger } from '@/utils/secureLogger';
import { Tag } from '@/types/project';

const logger = createLogger('FilterMetaContext');

/**
 * Context interface for filter metadata management
 */
export interface FilterMetaContextType {
  // Available options
  companies: { label: string; value: string }[];
  artists: { label: string; value: string }[];
  drillShapes: string[];
  allTags: Tag[];

  // UI state
  searchInputRef: React.RefObject<HTMLInputElement>;
}

const FilterMetaContext = createContext<FilterMetaContextType | null>(null);

/**
 * Props interface for FilterMetaProvider component
 */
interface FilterMetaProviderProps {
  children: ReactNode;
}

/**
 * FilterMetaProvider component that provides stable filter metadata
 */
export const FilterMetaProvider: React.FC<FilterMetaProviderProps> = ({ children }) => {
  const userMetadata = useMetadata();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Memoized metadata values - these change infrequently
  const companies = useMemo(
    () =>
      userMetadata?.companies?.map(company => ({
        label: company.name,
        value: company.id,
      })) || [],
    [userMetadata?.companies]
  );

  const artists = useMemo(
    () =>
      userMetadata?.artists?.map(artist => ({
        label: artist.name,
        value: artist.id,
      })) || [],
    [userMetadata?.artists]
  );

  const allTags = useMemo(() => userMetadata?.tags || [], [userMetadata?.tags]);

  const drillShapes = useMemo(() => ['round', 'square'], []);

  // Stable context value - metadata values change infrequently
  const contextValue: FilterMetaContextType = useMemo(
    () => ({
      companies,
      artists,
      drillShapes,
      allTags,
      searchInputRef,
    }),
    [companies, artists, drillShapes, allTags]
  );

  logger.debug('FilterMetaContext value updated:', {
    companiesCount: companies.length,
    artistsCount: artists.length,
    tagsCount: allTags.length,
    drillShapesCount: drillShapes.length,
  });

  return <FilterMetaContext.Provider value={contextValue}>{children}</FilterMetaContext.Provider>;
};

/**
 * Hook to use the FilterMetaContext
 */
export const useFilterMeta = (): FilterMetaContextType => {
  const context = useContext(FilterMetaContext);
  if (!context) {
    throw new Error('useFilterMeta must be used within a FilterMetaProvider');
  }
  return context;
};
