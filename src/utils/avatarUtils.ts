import { AvatarConfig, AVATAR_COLORS } from '@/types/avatar';
import { uploadFile } from './storageService';
import { getCurrentUserId } from '@/lib/pocketbase';

/**
 * Get user initials from name or email
 */
export function getUserInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return words[0][0].toUpperCase();
  }

  if (email) {
    const username = email.split('@')[0];
    if (username.length >= 2) {
      return (username[0] + username[1]).toUpperCase();
    }
    return username[0].toUpperCase();
  }

  return 'U'; // Ultimate fallback
}

/**
 * Get consistent color index based on string
 */
export function getColorIndex(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % AVATAR_COLORS.length;
}

/**
 * Create avatar config from profile data
 */
const avatarConfigCache = new Map<string, AvatarConfig>();

export function createAvatarConfig(profile: {
  avatar_url?: string | null;
  avatar_type?: string | null;
  email?: string | null;
  username?: string | null;
}): AvatarConfig {
  // Create a cache key based on the profile data
  const cacheKey = JSON.stringify({
    url: profile.avatar_url,
    type: profile.avatar_type,
    email: profile.email,
    username: profile.username,
  });

  // Return cached config if available
  if (avatarConfigCache.has(cacheKey)) {
    return avatarConfigCache.get(cacheKey)!;
  }

  // Auto-detect avatar type based on whether avatar_url exists and is valid
  const hasValidAvatarUrl = profile.avatar_url && profile.avatar_url.trim() !== '';
  let config: AvatarConfig;

  if (hasValidAvatarUrl) {
    config = {
      type: 'upload',
      uploadUrl: profile.avatar_url!,
    };
  } else {
    // Default to initials avatar
    const initials = getUserInitials(profile.username ?? undefined, profile.email ?? undefined);
    const colorIndex = getColorIndex(profile.email || profile.username || 'user');
    config = {
      type: 'initials',
      initials,
      colorIndex,
    };
  }

  // Cache the config
  avatarConfigCache.set(cacheKey, config);

  // Clean cache if it gets too large (prevent memory leaks)
  if (avatarConfigCache.size > 100) {
    const firstKey = avatarConfigCache.keys().next().value;
    if (firstKey) {
      avatarConfigCache.delete(firstKey);
    }
  }

  return config;
}

/**
 * Get avatar URL for upload type avatars
 */
export function getAvatarUrl(config: AvatarConfig): string | null {
  if (config.type === 'upload' && config.uploadUrl) {
    return config.uploadUrl;
  }
  return null;
}

/**
 * Get default avatar seed from user data
 */
export function getDefaultAvatarSeed(email?: string | null, username?: string | null): string {
  // Create a consistent seed from user data
  if (email && email.trim()) {
    return email.toLowerCase().trim();
  }
  if (username && username.trim()) {
    return username.toLowerCase().trim();
  }
  return 'default-user';
}

/**
 * Upload avatar file via unified storage service (handles R2/Supabase routing)
 */
export async function uploadAvatar(file: File, userIdParam?: string): Promise<string> {
  // For PocketBase, we need the actual user record ID
  const userId = userIdParam || getCurrentUserId();
  if (!userId) {
    throw new Error('User ID is required for avatar uploads');
  }
  return await uploadFile(file, 'users', userId);
}
