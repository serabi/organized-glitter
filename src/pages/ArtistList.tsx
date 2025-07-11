/**
 * Artist List page component
 * @author @serabi
 * @created 2025-01-09
 */

import { useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { useArtists } from '@/hooks/queries/useArtists';
import ArtistPageHeader from '@/components/artist/ArtistPageHeader';
import ArtistTable from '@/components/artist/ArtistTable';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('ArtistList');
/**
 * ArtistList Component
 *
 * Main page component for managing artists. Displays a list of artists
 * with the ability to add, edit, and delete artists.
 */
const ArtistList = () => {
  const { toast } = useToast();
  const { data: artists = [], isLoading: loading, error } = useArtists();

  // Performance validation logging
  useEffect(() => {
    const pageLoadStart = performance.now();
    logger.debug('ArtistList page component mounted', {
      timestamp: new Date().toISOString(),
      artistsCount: artists.length,
      isLoading: loading,
      hasError: !!error,
    });

    return () => {
      const pageLoadEnd = performance.now();
      logger.debug('ArtistList page component unmounted', {
        duration: Math.round(pageLoadEnd - pageLoadStart),
        timestamp: new Date().toISOString(),
      });
    };
  }, []);

  // Log when artists data changes
  useEffect(() => {
    if (artists.length > 0) {
      logger.debug('Artists data loaded successfully', {
        artistsCount: artists.length,
        isLoading: loading,
        timestamp: new Date().toISOString(),
      });
    }
  }, [artists.length, loading]);

  // Handle errors from React Query
  useEffect(() => {
    if (error) {
      logger.error('Artists loading error:', error);
      toast({
        title: 'Error',
        description: 'Could not load artists',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <ArtistPageHeader artists={artists} />
        <div className="rounded-lg bg-card text-card-foreground shadow">
          <ArtistTable artists={artists} loading={loading} />
        </div>
      </div>
    </MainLayout>
  );
};

export default ArtistList;
