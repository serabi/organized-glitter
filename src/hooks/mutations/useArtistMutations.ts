/**
 * Consolidated artist mutation hooks using generic CRUD factory
 * @author @serabi
 * @created 2025-01-16
 */

import { ArtistsResponse } from '@/types/pocketbase.types';
import { createEntityCRUDHooks } from './shared/useEntityCRUD';
import { artistConfig } from './shared/entityConfigs';

// Create the CRUD hooks using the generic factory
const artistCRUD = createEntityCRUDHooks<ArtistsResponse>(artistConfig);

// Export individual hooks to maintain existing API compatibility
export const useCreateArtist = artistCRUD.useCreate;
export const useUpdateArtist = artistCRUD.useUpdate;
export const useDeleteArtist = artistCRUD.useDelete;

// Export the complete CRUD object for convenience
export const useArtistMutations = artistCRUD;

// Type definitions for backward compatibility
export interface CreateArtistData {
  name: string;
}

export interface UpdateArtistData {
  name?: string;
}