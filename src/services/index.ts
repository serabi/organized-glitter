// Auth service
import * as authService from '@/services/auth';

// PocketBase service response type (legacy - kept for compatibility)
export interface ServiceResponse<T = unknown> {
  data: T | null;
  error: string | null;
  success: boolean;
}

// Export services
export { authService };

// Service registry for easy access to all services
const services = {
  auth: authService,
};

export default services;
