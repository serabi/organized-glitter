/**
 * Consolidated company mutation hooks using generic CRUD factory
 * @author @serabi
 * @created 2025-01-16
 */

import { CompaniesResponse } from '@/types/pocketbase.types';
import { createEntityCRUDHooks } from './shared/useEntityCRUD';
import { companyConfig } from './shared/entityConfigs';

// Create the CRUD hooks using the generic factory
const companyCRUD = createEntityCRUDHooks<CompaniesResponse>(companyConfig);

// Export individual hooks to maintain existing API compatibility
export const useCreateCompany = companyCRUD.useCreate;
export const useUpdateCompany = companyCRUD.useUpdate;
export const useDeleteCompany = companyCRUD.useDelete;

// Export the complete CRUD object for convenience
export const useCompanyMutations = companyCRUD;

// Type definitions for backward compatibility
export interface CreateCompanyData {
  name: string;
  website_url?: string;
}

export interface UpdateCompanyData {
  name?: string;
  website_url?: string;
}