/**
 * Entity configurations for consolidated CRUD operations
 * @author @serabi
 * @created 2025-01-16
 */

import { Collections, ArtistsResponse, CompaniesResponse } from '@/types/pocketbase.types';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { EntityConfig } from './useEntityCRUD';

/**
 * Artist entity configuration
 * @author @serabi
 */
export const artistConfig: EntityConfig<ArtistsResponse> = {
  collection: Collections.Artists,
  entityName: 'artist',
  queryKeys: {
    lists: () => queryKeys.artists.lists(),
    list: (userId: string) => queryKeys.artists.list(userId),
    detail: (id: string) => queryKeys.artists.detail(id),
  },
  fields: {
    required: ['name'],
    optional: ['website_url'],
  },
  validation: {
    beforeCreate: (data) => {
      if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        return 'Artist name is required';
      }
      if (data.name.trim().length > 100) {
        return 'Artist name must be 100 characters or less';
      }
      if (data.website_url && typeof data.website_url === 'string' && data.website_url.length > 500) {
        return 'Website URL must be 500 characters or less';
      }
      return null;
    },
    beforeUpdate: (data) => {
      if (data.name !== undefined) {
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
          return 'Artist name is required';
        }
        if (data.name.trim().length > 100) {
          return 'Artist name must be 100 characters or less';
        }
      }
      if (data.website_url && typeof data.website_url === 'string' && data.website_url.length > 500) {
        return 'Website URL must be 500 characters or less';
      }
      return null;
    },
  },
};

/**
 * Company entity configuration
 * @author @serabi
 */
export const companyConfig: EntityConfig<CompaniesResponse> = {
  collection: Collections.Companies,
  entityName: 'company',
  queryKeys: {
    lists: () => queryKeys.companies.lists(),
    list: (userId: string) => queryKeys.companies.list(userId),
    detail: (id: string) => queryKeys.companies.detail(id),
  },
  fields: {
    required: ['name'],
    optional: ['website_url'],
  },
  validation: {
    beforeCreate: (data) => {
      if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        return 'Company name is required';
      }
      if (data.name.trim().length > 100) {
        return 'Company name must be 100 characters or less';
      }
      if (data.website_url && typeof data.website_url === 'string' && data.website_url.length > 500) {
        return 'Website URL must be 500 characters or less';
      }
      return null;
    },
    beforeUpdate: (data) => {
      if (data.name !== undefined) {
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
          return 'Company name is required';
        }
        if (data.name.trim().length > 100) {
          return 'Company name must be 100 characters or less';
        }
      }
      if (data.website_url && typeof data.website_url === 'string' && data.website_url.length > 500) {
        return 'Website URL must be 500 characters or less';
      }
      return null;
    },
  },
};