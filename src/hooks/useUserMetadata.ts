/**
 * Hook for managing user metadata (companies and artists)
 * @author @serabi
 * @created 2025-08-02
 */

import { useState, useEffect, useRef } from 'react';
import { pb } from '@/lib/pocketbase';
import { ServiceResponse, createSuccessResponse, createErrorResponse } from '@/types/shared';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/utils/logger';

const metadataLogger = createLogger('UserMetadata');

// Simplified toast handler interface with just the toast method we need
interface ToastHandler {
  toast: {
    (props: { title: string; description?: string; variant?: 'default' | 'destructive' }): void;
  };
}

// Utility functions to fetch company and artist names
async function fetchCompanyNames(
  toastHandlers?: ToastHandler,
  signal?: AbortSignal
): Promise<ServiceResponse<string[]>> {
  try {
    // Get the current user from PocketBase auth
    if (!pb.authStore.isValid) {
      return createErrorResponse(new Error('User not authenticated'));
    }

    const userId = pb.authStore.model?.id;
    if (!userId) {
      return createErrorResponse(new Error('User not authenticated'));
    }

    metadataLogger.debug('fetchCompanyNames: userId:', userId);

    const records = await pb.collection('companies').getList(1, 200, {
      filter: `user = "${userId}"`,
      sort: 'name',
      fields: 'name',
      requestKey: `companies-${userId}`,
    });

    // Check if operation was aborted
    if (signal?.aborted) {
      return createErrorResponse(new Error('Operation was cancelled'));
    }

    metadataLogger.debug('fetchCompanyNames: raw response:', records);

    const companyNames = records.items.map(company => company.name);
    metadataLogger.debug('fetchCompanyNames: processed names:', companyNames);

    return createSuccessResponse(companyNames);
  } catch (error) {
    metadataLogger.error('fetchCompanyNames: error caught:', error);

    // Don't show toast for aborted operations
    if (signal?.aborted) {
      return createErrorResponse(new Error('Operation was cancelled'));
    }

    if (toastHandlers?.toast) {
      toastHandlers.toast({
        title: 'Failed to load companies',
        description: 'Could not load your company list',
        variant: 'destructive',
      });
    }

    metadataLogger.error('Error fetching company names:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to fetch companies')
    );
  }
}

async function fetchArtistNames(
  toastHandlers?: ToastHandler,
  signal?: AbortSignal
): Promise<ServiceResponse<string[]>> {
  try {
    // Get the current user from PocketBase auth
    if (!pb.authStore.isValid) {
      return createErrorResponse(new Error('User not authenticated'));
    }

    const userId = pb.authStore.model?.id;
    if (!userId) {
      return createErrorResponse(new Error('User not authenticated'));
    }

    metadataLogger.debug('fetchArtistNames: userId:', userId);

    const records = await pb.collection('artists').getList(1, 200, {
      filter: `user = "${userId}"`,
      sort: 'name',
      fields: 'name',
      requestKey: `artists-${userId}`,
    });

    // Check if operation was aborted
    if (signal?.aborted) {
      return createErrorResponse(new Error('Operation was cancelled'));
    }

    metadataLogger.log('fetchArtistNames: raw response:', records);

    const artistNames = records.items.map(artist => artist.name);
    metadataLogger.debug('fetchArtistNames: processed names:', artistNames);

    return createSuccessResponse(artistNames);
  } catch (error) {
    metadataLogger.error('fetchArtistNames: error caught:', error);

    // Don't show toast for aborted operations
    if (signal?.aborted) {
      return createErrorResponse(new Error('Operation was cancelled'));
    }

    if (toastHandlers?.toast) {
      toastHandlers.toast({
        title: 'Failed to load artists',
        description: 'Could not load your artist list',
        variant: 'destructive',
      });
    }

    metadataLogger.error('Error fetching artist names:', error);
    return createErrorResponse(
      error instanceof Error ? error : new Error('Failed to fetch artists')
    );
  }
}

export const useUserMetadata = () => {
  const [companies, setCompanies] = useState<string[]>([]);
  const [artists, setArtists] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const { toast } = useToast();

  // Track if we're currently fetching to prevent duplicate requests
  const fetchingRef = useRef(false);

  useEffect(() => {
    const abortController = new AbortController();

    async function fetchUserData() {
      // Prevent duplicate concurrent requests
      if (fetchingRef.current) {
        metadataLogger.debug('useUserMetadata: Already fetching, skipping duplicate request');
        return;
      }

      try {
        fetchingRef.current = true;
        metadataLogger.debug('useUserMetadata: Starting data fetch...');

        // First check if user is authenticated with PocketBase
        if (!pb.authStore.isValid) {
          metadataLogger.debug('useUserMetadata: No authenticated user found');
          if (!abortController.signal.aborted) {
            setLoading(false);
            setAuthChecked(true);
          }
          return;
        }

        const userId = pb.authStore.model?.id;
        if (!userId) {
          metadataLogger.debug('useUserMetadata: No user ID found');
          if (!abortController.signal.aborted) {
            setLoading(false);
            setAuthChecked(true);
          }
          return;
        }

        metadataLogger.debug('useUserMetadata: User authenticated:', userId);

        // Add a small delay to let other components settle
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check if operation was aborted after delay
        if (abortController.signal.aborted) return;

        // Fetch companies and artists with sequential requests to avoid auto-cancellation
        let companiesResponse: ServiceResponse<string[]>;
        let artistsResponse: ServiceResponse<string[]>;

        try {
          companiesResponse = await fetchCompanyNames({ toast }, abortController.signal);
          // Check if operation was aborted
          if (abortController.signal.aborted) return;

          artistsResponse = await fetchArtistNames({ toast }, abortController.signal);
          // Check if operation was aborted
          if (abortController.signal.aborted) return;
        } catch (error) {
          // Handle cancellation gracefully
          if (abortController.signal.aborted) {
            metadataLogger.debug('useUserMetadata: Request was cancelled');
            return;
          }
          throw error;
        }

        // Handle companies response
        if (companiesResponse.status === 'success' && companiesResponse.data) {
          metadataLogger.debug(
            'useUserMetadata: Companies fetched successfully:',
            companiesResponse.data.length,
            companiesResponse.data
          );
          if (!abortController.signal.aborted) {
            setCompanies(companiesResponse.data);
          }
        } else if (companiesResponse.error) {
          metadataLogger.error(
            'useUserMetadata: Error fetching companies:',
            companiesResponse.error
          );
          // Only show toast for actual errors, not cancelled operations
          if (
            !abortController.signal.aborted &&
            !companiesResponse.error.message?.includes('not authenticated') &&
            !companiesResponse.error.message?.includes('cancelled')
          ) {
            toast({
              title: 'Warning',
              description: 'Could not load companies list. You may need to add companies first.',
              variant: 'destructive',
            });
          }
        }

        // Handle artists response
        if (artistsResponse.status === 'success' && artistsResponse.data) {
          metadataLogger.debug(
            'useUserMetadata: Artists fetched successfully:',
            artistsResponse.data.length,
            artistsResponse.data
          );
          if (!abortController.signal.aborted) {
            setArtists(artistsResponse.data);
          }
        } else if (artistsResponse.error) {
          metadataLogger.error('useUserMetadata: Error fetching artists:', artistsResponse.error);
          // Only show toast for actual errors, not cancelled operations
          if (
            !abortController.signal.aborted &&
            !artistsResponse.error.message?.includes('not authenticated') &&
            !artistsResponse.error.message?.includes('cancelled')
          ) {
            toast({
              title: 'Warning',
              description: 'Could not load artists list. You may need to add artists first.',
              variant: 'destructive',
            });
          }
        }

        if (!abortController.signal.aborted) {
          setAuthChecked(true);
        }
      } catch (error) {
        metadataLogger.error('Error in fetchUserData:', error);
        // Don't show toast for cancellation errors
        if (abortController.signal.aborted) {
          metadataLogger.debug('useUserMetadata: Request cancelled during fetch');
          return;
        }
        toast({
          title: 'Error',
          description: 'Failed to load user data',
          variant: 'destructive',
        });
      } finally {
        fetchingRef.current = false;
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchUserData();

    return () => {
      abortController.abort();
      fetchingRef.current = false;
    };
  }, [toast]); // Include toast as dependency

  // Function to refresh metadata
  const refreshMetadata = async () => {
    if (fetchingRef.current) {
      metadataLogger.debug('useUserMetadata: Already refreshing, skipping');
      return;
    }

    setLoading(true);
    const abortController = new AbortController();

    try {
      fetchingRef.current = true;

      const [companiesResponse, artistsResponse] = await Promise.all([
        fetchCompanyNames({ toast }, abortController.signal),
        fetchArtistNames({ toast }, abortController.signal),
      ]);

      if (!abortController.signal.aborted) {
        if (companiesResponse.status === 'success' && companiesResponse.data) {
          setCompanies(companiesResponse.data);
        }

        if (artistsResponse.status === 'success' && artistsResponse.data) {
          setArtists(artistsResponse.data);
        }
      }
    } catch (error) {
      metadataLogger.error('Error refreshing metadata:', error);
      if (!abortController.signal.aborted) {
        toast({
          title: 'Error',
          description: 'Failed to refresh data',
          variant: 'destructive',
        });
      }
    } finally {
      fetchingRef.current = false;
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  };

  return {
    companies,
    artists,
    loading,
    authChecked,
    refreshMetadata,
  };
};
