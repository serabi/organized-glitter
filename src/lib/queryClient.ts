import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Retry delay that increases exponentially
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Only refetch on window focus if data is stale (reduces unnecessary API calls)
      refetchOnWindowFocus: true,
      // Only refetch on reconnect if data is stale
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      // Don't retry on 4xx errors (client errors)
      retryDelay: 1000,
    },
  },
});

// Override cache settings for image-related queries
queryClient.setQueryDefaults(['optimized-image'], {
  staleTime: 30 * 60 * 1000, // 30 minutes for optimized images
  gcTime: 60 * 60 * 1000, // 1 hour retention for images
  refetchOnWindowFocus: false, // Images don't change frequently
  refetchOnReconnect: false, // Avoid unnecessary image refetches
});

queryClient.setQueryDefaults(['progressive-image'], {
  staleTime: 30 * 60 * 1000, // 30 minutes for progressive images
  gcTime: 60 * 60 * 1000, // 1 hour retention for images
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});
