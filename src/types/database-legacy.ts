/**
 * Legacy database types extracted from Supabase migration
 * These are the essential types we still need for the PocketBase migration
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProjectStatus =
  | 'wishlist'
  | 'purchased'
  | 'stash'
  | 'progress'
  | 'completed'
  | 'archived'
  | 'destashed';

export type KitCategory = 'full' | 'mini';

export type DrillShape = 'round' | 'square';

export type DeletionRequestStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type EmailNotificationStatus = 'pending' | 'sent' | 'failed';
