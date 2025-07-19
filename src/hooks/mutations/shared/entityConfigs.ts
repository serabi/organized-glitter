/**
 * Entity configurations for consolidated CRUD operations
 * @author @serabi
 * @created 2025-07-16
 */

import { Collections, ArtistsResponse, CompaniesResponse } from '@/types/pocketbase.types';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { EntityConfig } from './useEntityCRUD';

/**
 * Generic entity configuration factory for name-based entities
 * @author @serabi
 * @param entityName - The name of the entity (e.g., 'artist', 'company')
 * @param collection - The PocketBase collection for the entity
 * @param queryKeysRef - The query keys object for the entity
 * @returns EntityConfig with shared validation logic
 */
function createEntityConfig<T extends Record<string, unknown>>(
  entityName: string,
  collection: Collections,
  queryKeysRef: {
    lists: () => readonly unknown[];
    list: (userId: string) => readonly unknown[];
    detail: (id: string) => readonly unknown[];
  }
): EntityConfig<T> {
  const capitalizedEntityName = entityName.charAt(0).toUpperCase() + entityName.slice(1);

  return {
    collection,
    entityName,
    queryKeys: queryKeysRef,
    fields: {
      required: ['name'],
      optional: ['website_url'],
    },
    validation: {
      beforeCreate: data => {
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
          return `${capitalizedEntityName} name is required`;
        }
        if (data.name.trim().length > 100) {
          return `${capitalizedEntityName} name must be 100 characters or less`;
        }
        if (
          data.website_url &&
          typeof data.website_url === 'string' &&
          data.website_url.length > 500
        ) {
          return 'Website URL must be 500 characters or less';
        }
        return null;
      },
      beforeUpdate: data => {
        if (data.name !== undefined) {
          if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
            return `${capitalizedEntityName} name is required`;
          }
          if (data.name.trim().length > 100) {
            return `${capitalizedEntityName} name must be 100 characters or less`;
          }
        }
        if (
          data.website_url &&
          typeof data.website_url === 'string' &&
          data.website_url.length > 500
        ) {
          return 'Website URL must be 500 characters or less';
        }
        return null;
      },
    },
  };
}

/**
 * Artist entity configuration
 * @author @serabi
 */
export const artistConfig: EntityConfig<ArtistsResponse> = createEntityConfig<ArtistsResponse>(
  'artist',
  Collections.Artists,
  queryKeys.artists
);

/**
 * Company entity configuration (with adapted query keys for CRUD compatibility)
 * @author @serabi
 */
export const companyConfig: EntityConfig<CompaniesResponse> = createEntityConfig<CompaniesResponse>(
  'company',
  Collections.Companies,
  {
    lists: queryKeys.companies.lists,
    list: (userId: string) => queryKeys.companies.allForUser(userId), // Use allForUser for single-param compatibility
    detail: queryKeys.companies.detail,
  }
);
