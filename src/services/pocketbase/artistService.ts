import { BasePocketBaseService } from './baseService';

export interface Artist {
  id: string;
  name: string;
  user: string;
  created: string;
  updated: string;
}

interface ToastHandlers {
  toast: (params: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
  }) => void;
}

interface ArtistResponse {
  data: Artist[] | Artist | null;
  error: string | null;
  status: 'success' | 'error';
}

export class ArtistService extends BasePocketBaseService {
  private collection = 'artists';

  /**
   * Get all artists for the current user
   */
  async getArtists(): Promise<ArtistResponse> {
    try {
      if (!this.checkAuth()) {
        return { data: null, error: 'Authentication required', status: 'error' };
      }

      const userId = this.getCurrentUserId();
      if (!userId) {
        return { data: null, error: 'User ID not found', status: 'error' };
      }

      const filter = this.buildFilter({ user: userId });
      const artists = await this.pb.collection(this.collection).getFullList({
        filter,
        sort: 'name',
      });

      const mappedArtists: Artist[] = artists.map(record => ({
        id: record.id,
        name: record.name,
        user: record.user,
        created: record.created,
        updated: record.updated,
      }));
      return { data: mappedArtists, error: null, status: 'success' };
    } catch (error: unknown) {
      this.logger.error('Failed to fetch artists:', error);
      return { data: null, error: 'Failed to fetch artists', status: 'error' };
    }
  }

  /**
   * Create a new artist
   */
  async createArtist(name: string, { toast }: ToastHandlers): Promise<ArtistResponse> {
    try {
      if (!this.checkAuth()) {
        const error = 'Authentication required';
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return { data: null, error, status: 'error' };
      }

      const userId = this.getCurrentUserId();
      if (!userId) {
        const error = 'User ID not found';
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return { data: null, error, status: 'error' };
      }

      // Check if artist name already exists for this user
      const existingFilter = this.buildFilter({ user: userId, name: name.trim() });
      const existing = await this.pb
        .collection(this.collection)
        .getFirstListItem(existingFilter)
        .catch(() => null);

      if (existing) {
        const error = 'An artist with this name already exists';
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return { data: null, error, status: 'error' };
      }

      const newArtist = await this.pb.collection(this.collection).create({
        name: name.trim(),
        user: userId,
      });

      toast({ title: 'Success', description: `${name} has been created` });
      const mappedArtist: Artist = {
        id: newArtist.id,
        name: newArtist.name,
        user: newArtist.user,
        created: newArtist.created,
        updated: newArtist.updated,
      };
      return { data: mappedArtist, error: null, status: 'success' };
    } catch (error: unknown) {
      this.logger.error('Failed to create artist:', error);
      const errorMessage = 'Failed to create artist';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      return { data: null, error: errorMessage, status: 'error' };
    }
  }

  /**
   * Update an existing artist
   */
  async updateArtist(
    artistId: string,
    name: string,
    { toast }: ToastHandlers
  ): Promise<ArtistResponse> {
    try {
      if (!this.checkAuth()) {
        const error = 'Authentication required';
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return { data: null, error, status: 'error' };
      }

      const userId = this.getCurrentUserId();
      if (!userId) {
        const error = 'User ID not found';
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return { data: null, error, status: 'error' };
      }

      // Get current artist to check ownership and name changes
      const currentArtist = await this.pb.collection(this.collection).getOne(artistId);

      if (currentArtist.user !== userId) {
        const error = 'You can only update your own artists';
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return { data: null, error, status: 'error' };
      }

      // Check if artist name already exists (if name changed)
      if (name.trim() !== currentArtist.name) {
        const existingFilter = this.buildFilter({ user: userId, name: name.trim() });
        const existing = await this.pb
          .collection(this.collection)
          .getFirstListItem(existingFilter)
          .catch(() => null);

        if (existing && existing.id !== artistId) {
          const error = 'An artist with this name already exists';
          toast({ title: 'Error', description: error, variant: 'destructive' });
          return { data: null, error, status: 'error' };
        }
      }

      const updatedArtist = await this.pb.collection(this.collection).update(artistId, {
        name: name.trim(),
      });

      toast({ title: 'Success', description: `${name} has been updated` });
      const mappedArtist: Artist = {
        id: updatedArtist.id,
        name: updatedArtist.name,
        user: updatedArtist.user,
        created: updatedArtist.created,
        updated: updatedArtist.updated,
      };
      return { data: mappedArtist, error: null, status: 'success' };
    } catch (error: unknown) {
      this.logger.error('Failed to update artist:', error);
      const errorMessage = 'Failed to update artist';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      return { data: null, error: errorMessage, status: 'error' };
    }
  }

  /**
   * Delete an artist
   */
  async deleteArtist(artistId: string, { toast }: ToastHandlers): Promise<ArtistResponse> {
    try {
      if (!this.checkAuth()) {
        const error = 'Authentication required';
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return { data: null, error, status: 'error' };
      }

      const userId = this.getCurrentUserId();
      if (!userId) {
        const error = 'User ID not found';
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return { data: null, error, status: 'error' };
      }

      // Get current artist to check ownership
      const currentArtist = await this.pb.collection(this.collection).getOne(artistId);

      if (currentArtist.user !== userId) {
        const error = 'You can only delete your own artists';
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return { data: null, error, status: 'error' };
      }

      await this.pb.collection(this.collection).delete(artistId);

      toast({ title: 'Success', description: 'Artist has been deleted' });
      return { data: null, error: null, status: 'success' };
    } catch (error: unknown) {
      this.logger.error('Failed to delete artist:', error);
      const errorMessage = 'Failed to delete artist';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      return { data: null, error: errorMessage, status: 'error' };
    }
  }
}

// Export singleton instance
export const artistService = new ArtistService();
