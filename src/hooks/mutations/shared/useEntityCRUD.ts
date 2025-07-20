/**
 * Generic CRUD mutation factory for consolidating entity operations
 * @author @serabi
 * @created 2025-07-16
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { pb } from '@/lib/pocketbase';
import { Collections } from '@/types/pocketbase.types';
import { ClientResponseError } from 'pocketbase';
import { createLogger } from '@/utils/secureLogger';
import { FilterBuilder } from '@/utils/filterBuilder';
import { requireAuthenticatedUser } from '@/utils/authGuards';

const logger = createLogger('EntityCRUD');

/**
 * Configuration for entity CRUD operations (updated for TanStack Query v5 compatibility)
 * @author @serabi
 */
export interface EntityConfig<TData extends Record<string, unknown>> {
  /** PocketBase collection name */
  collection: Collections;
  /** Entity name for logging and user messages */
  entityName: string;
  /** Query keys for cache invalidation - flexible signature for different parameter patterns */
  queryKeys: {
    lists: () => readonly unknown[];
    list: (...args: unknown[]) => readonly unknown[]; // Flexible signature to handle variable parameters
    detail: (id: string) => readonly unknown[];
  };
  /** Required and optional field definitions */
  fields: {
    required: (keyof TData)[];
    optional?: (keyof TData)[];
  };
  /** Custom validation logic */
  validation?: {
    beforeCreate?: (data: Partial<TData>) => string | null;
    beforeUpdate?: (data: Partial<TData>) => string | null;
  };
}

/**
 * Generic create mutation factory
 * @author @serabi
 * @param config - Entity configuration
 * @returns React Query mutation hook for creating entities
 */
export function createEntityCreateMutation<TData extends Record<string, unknown>>(
  config: EntityConfig<TData>
) {
  return function useCreateEntity() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (data: Partial<TData>): Promise<TData> => {
        const userId = requireAuthenticatedUser(user);

        logger.debug(`Creating ${config.entityName}`, { userId, data });

        // Custom validation
        if (config.validation?.beforeCreate) {
          const validationError = config.validation.beforeCreate(data);
          if (validationError) {
            throw new Error(validationError);
          }
        }

        // Trim name field if it exists
        const processedData = { ...data };
        if ('name' in processedData && typeof processedData.name === 'string') {
          (processedData as TData & { name: string }).name = processedData.name.trim();
        }

        // Check for duplicate names before creating
        if ('name' in processedData && processedData.name) {
          const filterBuilder = new FilterBuilder();
          filterBuilder.equals('user', userId);
          filterBuilder.equals('name', processedData.name as string);

          const duplicates = await pb.collection(config.collection).getList(1, 1, {
            filter: filterBuilder.build(),
          });

          if (duplicates.items.length > 0) {
            throw new Error(`A ${config.entityName} with this name already exists`);
          }
        }

        // Add user reference
        const createData = {
          ...processedData,
          user: userId,
        };

        const record = await pb.collection(config.collection).create(createData);

        logger.info(`${config.entityName} created successfully`, {
          entityId: record.id,
          userId,
        });

        return record as unknown as TData;
      },
      onSuccess: newEntity => {
        // Invalidate relevant queries - use lists() for broader cache invalidation
        queryClient.invalidateQueries({ queryKey: config.queryKeys.lists() });

        // Show success toast
        const entityName =
          ('name' in newEntity ? String(newEntity.name) : undefined) || config.entityName;
        toast({
          title: 'Success!',
          description: `${config.entityName.charAt(0).toUpperCase() + config.entityName.slice(1)} "${entityName}" has been added`,
          variant: 'default',
        });

        logger.info(`${config.entityName} creation success toast shown`, {
          entityName,
          userId: user?.id,
        });
      },
      onError: (error: Error) => {
        logger.error(`Failed to create ${config.entityName}`, error);

        let errorMessage = `Failed to add ${config.entityName}`;

        if (error instanceof ClientResponseError && error.status === 400) {
          errorMessage = `A ${config.entityName} with this name already exists`;
        }

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      },
    });
  };
}

/**
 * Generic update mutation factory
 * @author @serabi
 * @param config - Entity configuration
 * @returns React Query mutation hook for updating entities
 */
export function createEntityUpdateMutation<TData extends Record<string, unknown>>(
  config: EntityConfig<TData>
) {
  return function useUpdateEntity() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({ id, data }: { id: string; data: Partial<TData> }): Promise<TData> => {
        const userId = requireAuthenticatedUser(user);

        logger.debug(`Updating ${config.entityName}`, { id, userId, data });

        // Get existing record to verify ownership
        const existingRecord = await pb.collection(config.collection).getOne(id);

        if (existingRecord.user !== userId) {
          throw new Error(`You don't have permission to update this ${config.entityName}`);
        }

        // Custom validation
        if (config.validation?.beforeUpdate) {
          const validationError = config.validation.beforeUpdate(data);
          if (validationError) {
            throw new Error(validationError);
          }
        }

        // Trim name field if it exists
        const processedData = { ...data };
        if ('name' in processedData && typeof processedData.name === 'string') {
          (processedData as TData & { name: string }).name = processedData.name.trim();
        }

        // Check for duplicate names (if name is being updated)
        if ('name' in processedData && processedData.name !== existingRecord.name) {
          const filterBuilder = new FilterBuilder();
          filterBuilder.equals('user', userId);
          filterBuilder.equals('name', processedData.name as string);
          filterBuilder.notEquals('id', id);

          const duplicates = await pb.collection(config.collection).getList(1, 1, {
            filter: filterBuilder.build(),
          });

          if (duplicates.items.length > 0) {
            throw new Error(`A ${config.entityName} with this name already exists`);
          }
        }

        const updatedRecord = await pb.collection(config.collection).update(id, processedData);

        logger.info(`${config.entityName} updated successfully`, {
          entityId: id,
          userId,
        });

        return updatedRecord as unknown as TData;
      },
      onSuccess: (updatedEntity, { id }) => {
        // Invalidate relevant queries - use lists() for broader cache invalidation
        queryClient.invalidateQueries({ queryKey: config.queryKeys.lists() });
        queryClient.invalidateQueries({ queryKey: config.queryKeys.detail(id) });

        // Show success toast
        const entityName =
          ('name' in updatedEntity ? String(updatedEntity.name) : undefined) || config.entityName;
        toast({
          title: 'Success!',
          description: `${config.entityName.charAt(0).toUpperCase() + config.entityName.slice(1)} "${entityName}" has been updated`,
          variant: 'default',
        });

        logger.info(`${config.entityName} update success toast shown`, {
          entityName,
          userId: user?.id,
        });
      },
      onError: (error: Error) => {
        logger.error(`Failed to update ${config.entityName}`, error);

        let errorMessage = `Failed to update ${config.entityName}`;

        if (error.message.includes('already exists')) {
          errorMessage = error.message;
        } else if (error.message.includes("don't have permission")) {
          errorMessage = error.message;
        }

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      },
    });
  };
}

/**
 * Generic delete mutation factory
 * @author @serabi
 * @param config - Entity configuration
 * @returns React Query mutation hook for deleting entities
 */
export function createEntityDeleteMutation<TData extends Record<string, unknown>>(
  config: EntityConfig<TData>
) {
  return function useDeleteEntity() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({ id }: { id: string }): Promise<void> => {
        const userId = requireAuthenticatedUser(user);

        logger.debug(`Deleting ${config.entityName}`, { id, userId });

        await pb.collection(config.collection).delete(id);

        logger.info(`${config.entityName} deleted successfully`, {
          entityId: id,
          userId,
        });
      },
      onSuccess: (_, { id }) => {
        // Invalidate relevant queries - use lists() for broader cache invalidation
        queryClient.invalidateQueries({ queryKey: config.queryKeys.lists() });
        queryClient.invalidateQueries({ queryKey: config.queryKeys.detail(id) });

        // Show success toast
        const entityName = config.entityName;
        toast({
          title: 'Success!',
          description: `${config.entityName.charAt(0).toUpperCase() + config.entityName.slice(1)} "${entityName}" has been deleted`,
          variant: 'default',
        });

        logger.info(`${config.entityName} deletion success toast shown`, {
          entityName,
          userId: user?.id,
        });
      },
      onError: (error: Error) => {
        logger.error(`Failed to delete ${config.entityName}`, error);

        let errorMessage = `Failed to delete ${config.entityName}`;

        if (error instanceof ClientResponseError) {
          if (error.status === 404) {
            errorMessage = `${config.entityName.charAt(0).toUpperCase() + config.entityName.slice(1)} not found`;
          } else if (error.status === 400) {
            errorMessage = `Cannot delete this ${config.entityName} because it is being used by other records`;
          }
        }

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      },
    });
  };
}

/**
 * Complete CRUD mutation factory for an entity
 * @author @serabi
 * @param config - Entity configuration
 * @returns Object with create, update, and delete mutation hooks
 */
export function createEntityCRUDHooks<TData extends Record<string, unknown>>(
  config: EntityConfig<TData>
) {
  return {
    useCreate: createEntityCreateMutation(config),
    useUpdate: createEntityUpdateMutation(config),
    useDelete: createEntityDeleteMutation(config),
  };
}
