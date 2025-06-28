// PocketBase services
import { progressNotesService } from '@/services/pocketbase/progressNotesService';
import { companyService } from '@/services/pocketbase/companyService';
// TODO: projectService removed - replaced with direct PocketBase calls
// import { projectService } from '@/services/pocketbase/projectService';

// Auth service
import * as authService from '@/services/auth';

// PocketBase service response type
export interface ServiceResponse<T = unknown> {
  data: T | null;
  error: string | null;
  success: boolean;
}

// Export services
export { progressNotesService, companyService, authService };
// TODO: projectService removed - replaced with direct PocketBase calls

// Service registry for easy access to all services
const services = {
  progressNotes: progressNotesService,
  company: companyService,
  // TODO: project service removed - replaced with direct PocketBase calls
  auth: authService,
};

export default services;

// TODO: During migration to PocketBase:
// - Complete migration of ProjectCRUDService
// - Complete migration of ProjectImageService
// - Complete migration of ProjectSchemaService
// These services currently depend on Supabase and are being migrated
