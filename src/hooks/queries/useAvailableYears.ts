/**
 * @fileoverview Modern hook for fetching available years from user projects
 * 
 * This hook provides a lightweight, optimized query for generating year dropdown options.
 * Uses PocketBase field selection and indexes for maximum performance.
 * 
 * @author serabi
 * @since 1.2.0
 */

import { useQuery } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { createLogger } from '@/utils/secureLogger';
import { queryKeys } from './queryKeys';

const logger = createLogger('useAvailableYears');

/**
 * Represents a year with metadata about which date types are available
 */
export interface AvailableYear {
  year: number;
  hasCompleted: boolean;
  hasStarted: boolean;
  hasReceived: boolean;
  hasPurchased: boolean;
}

/**
 * Raw project data with only date fields for year extraction
 */
interface ProjectDateFields {
  date_completed?: string | null;
  date_started?: string | null;
  date_received?: string | null;
  date_purchased?: string | null;
}

/**
 * Parameters for the useAvailableYears hook
 */
export interface UseAvailableYearsParams {
  userId: string | undefined;
}

/**
 * Result type for the hook
 */
export interface AvailableYearsResult {
  years: number[];
  yearsWithMetadata: AvailableYear[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
}

/**
 * Extracts year from date string safely
 */
const extractYear = (dateString: string | null | undefined): number | null => {
  if (!dateString || dateString.trim() === '') {
    return null;
  }
  
  try {
    const year = new Date(dateString).getFullYear();
    // Validate reasonable year range (avoid invalid dates)
    if (year >= 1900 && year <= 2100) {
      return year;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Fetches all user projects with only date fields for year extraction
 */
const fetchAvailableYears = async (userId: string): Promise<AvailableYearsResult> => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  logger.debug(`Fetching available years for user ${userId}`);
  const startTime = performance.now();

  try {
    // Ultra-lightweight query: only fetch date fields
    // Uses PocketBase field selection for optimal performance
    const result = await pb.collection('projects').getFullList({
      filter: pb.filter('user = {:userId}', { userId }),
      // Only fetch date fields - massive performance improvement
      fields: 'date_completed,date_started,date_received,date_purchased',
      // Enable request deduplication
      requestKey: `available-years-${userId}`,
    });

    const endTime = performance.now();
    logger.debug(`Year query completed in ${Math.round(endTime - startTime)}ms - ${result.length} projects`);

    // Process years with metadata
    const yearMetadata = new Map<number, AvailableYear>();

    (result as ProjectDateFields[]).forEach(project => {
      // Extract years from all date fields
      const completedYear = extractYear(project.date_completed);
      const startedYear = extractYear(project.date_started);
      const receivedYear = extractYear(project.date_received);
      const purchasedYear = extractYear(project.date_purchased);

      // Track all unique years
      [completedYear, startedYear, receivedYear, purchasedYear].forEach(year => {
        if (year !== null) {
          const existing = yearMetadata.get(year) || {
            year,
            hasCompleted: false,
            hasStarted: false,
            hasReceived: false,
            hasPurchased: false,
          };

          // Update metadata flags
          if (year === completedYear) existing.hasCompleted = true;
          if (year === startedYear) existing.hasStarted = true;
          if (year === receivedYear) existing.hasReceived = true;
          if (year === purchasedYear) existing.hasPurchased = true;

          yearMetadata.set(year, existing);
        }
      });
    });

    // Convert to arrays and sort (most recent first)
    const yearsWithMetadata = Array.from(yearMetadata.values())
      .sort((a, b) => b.year - a.year);
    
    const years = yearsWithMetadata.map(y => y.year);

    logger.info(`Available years fetched: ${years.length} unique years found`);

    return {
      years,
      yearsWithMetadata,
      isLoading: false,
      error: null,
      refetch: () => Promise.resolve(),
    };
  } catch (error) {
    logger.error('Error fetching available years:', error);
    throw error;
  }
};

/**
 * Modern React Query hook for fetching available years from user projects
 * 
 * Features:
 * - Ultra-lightweight query (only date fields)
 * - Smart caching with long stale time
 * - Full TypeScript safety
 * - PocketBase performance optimization
 * - Comprehensive error handling
 * 
 * @param params - Hook parameters
 * @returns Available years data and query state
 * 
 * @example
 * ```tsx
 * const { years, isLoading, error } = useAvailableYears({ userId: user?.id });
 * 
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorMessage />;
 * 
 * return (
 *   <Select>
 *     <option value="all">All Years</option>
 *     {years.map(year => (
 *       <option key={year} value={year.toString()}>{year}</option>
 *     ))}
 *   </Select>
 * );
 * ```
 */
export const useAvailableYears = ({ userId }: UseAvailableYearsParams): AvailableYearsResult => {
  const query = useQuery({
    queryKey: queryKeys.projects.availableYears(userId || ''),
    queryFn: () => fetchAvailableYears(userId!),
    enabled: !!userId,
    
    // Smart caching: years don't change frequently
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour garbage collection
    
    // Conservative refetch settings
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: false,
    
    // Error handling
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      const errorMessage = error?.message || '';
      const isClientError = 
        errorMessage.includes('400') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404');

      if (isClientError) {
        return false;
      }

      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    
    // Fallback for errors
    select: (data) => data,
    placeholderData: {
      years: [],
      yearsWithMetadata: [],
      isLoading: false,
      error: null,
      refetch: () => Promise.resolve(),
    },
  });

  return {
    years: query.data?.years || [],
    yearsWithMetadata: query.data?.yearsWithMetadata || [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
};

/**
 * Hook variant that returns years as string array (for compatibility)
 */
export const useAvailableYearsAsStrings = ({ userId }: UseAvailableYearsParams) => {
  const { years, isLoading, error, refetch } = useAvailableYears({ userId });
  
  return {
    years: years.map(year => year.toString()),
    isLoading,
    error,
    refetch,
  };
};