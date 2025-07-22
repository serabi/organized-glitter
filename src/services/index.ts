/**
 * Service layer exports - Centralized access to all application services
 * @author @serabi
 * @created 2025-01-16
 */

// Authentication service
export * as authService from '@/services/auth';

// Analytics and tracking service
export * as analytics from '@/services/analytics';

// Image optimization and URL generation service
export { ImageService } from '@/services/ImageService';

// Dashboard statistics services
export * as dashboardStatsService from '@/services/dashboardStatsService';
export * as statsService from '@/services/statsService';

// PocketBase data services
export * as projectsService from '@/services/pocketbase/projects.service';
export * as randomizerService from '@/services/pocketbase/randomizerService';
