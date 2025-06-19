import { trackEvent, identifyUser } from '@/utils/posthog';
import type { ProjectsResponse } from '@/types/pocketbase.types';

/**
 * Centralized analytics service for consistent event tracking
 */
export const analytics = {
  // Authentication Events
  auth: {
    loginAttempted: (method: 'email' | 'google' | 'discord') => {
      trackEvent('auth_login_attempted', { method });
    },

    loginSucceeded: (method: 'email' | 'google' | 'discord', userId: string) => {
      trackEvent('auth_login_succeeded', { method, userId });
    },

    loginFailed: (method: 'email' | 'google' | 'discord', error: string) => {
      trackEvent('auth_login_failed', { method, error });
    },

    signupCompleted: (
      method: 'email' | 'google' | 'discord',
      userData?: {
        userId?: string;
        email?: string;
        username?: string;
        name?: string;
        isNewRecord?: boolean;
      }
    ) => {
      const now = new Date().toISOString();
      const eventData = {
        method,
        timestamp: now,
        ...userData,
      };

      trackEvent('auth_signup_completed', eventData);

      // Identify the user in PostHog if we have their info
      if (userData?.userId) {
        identifyUser(userData.userId, {
          email: userData.email,
          username: userData.username,
          name: userData.name,
          signup_method: method,
          signup_date: now,
          is_new_signup: userData?.isNewRecord ?? true,
          beta_tester: true, // All new users are beta testers
        });
      }
    },

    logout: () => {
      trackEvent('auth_logout');
    },
  },

  // Project Events
  project: {
    created: (project: Partial<ProjectsResponse>) => {
      trackEvent('project_created', {
        status: project.status,
        kit_category: project.kit_category,
        drill_shape: project.drill_shape,
        has_image: !!project.image,
        has_company: !!project.company,
        has_artist: !!project.artist,
        dimensions: project.width && project.height ? `${project.width}x${project.height}` : null,
      });
    },

    updated: (projectId: string, changes: Record<string, unknown>) => {
      trackEvent('project_updated', {
        projectId,
        fields_changed: Object.keys(changes),
        status_changed: 'status' in changes,
        new_status: changes.status,
      });
    },

    deleted: (projectId: string, projectStatus?: string) => {
      trackEvent('project_deleted', {
        projectId,
        status_at_deletion: projectStatus,
      });
    },

    statusChanged: (projectId: string, oldStatus: string, newStatus: string) => {
      trackEvent('project_status_changed', {
        projectId,
        old_status: oldStatus,
        new_status: newStatus,
        transition: `${oldStatus}_to_${newStatus}`,
      });
    },

    viewed: (projectId: string) => {
      trackEvent('project_viewed', { projectId });
    },
  },

  // Progress Note Events
  progressNote: {
    created: (projectId: string, hasImage: boolean) => {
      trackEvent('progress_note_created', {
        projectId,
        has_image: hasImage,
      });
    },

    updated: (noteId: string) => {
      trackEvent('progress_note_updated', { noteId });
    },

    deleted: (noteId: string) => {
      trackEvent('progress_note_deleted', { noteId });
    },
  },

  // Data Management Events
  data: {
    exported: (recordCount: number, format: 'csv' | 'json' = 'csv') => {
      trackEvent('data_exported', {
        record_count: recordCount,
        format,
      });
    },

    importStarted: (format: 'csv' | 'json' = 'csv') => {
      trackEvent('data_import_started', { format });
    },

    importCompleted: (successCount: number, errorCount: number) => {
      trackEvent('data_import_completed', {
        success_count: successCount,
        error_count: errorCount,
        success_rate: successCount / (successCount + errorCount),
      });
    },

    importFailed: (error: string) => {
      trackEvent('data_import_failed', { error });
    },
  },

  // Feature Usage Events
  feature: {
    bulkDeleteUsed: (itemCount: number, itemType: string) => {
      trackEvent('feature_bulk_delete_used', {
        item_count: itemCount,
        item_type: itemType,
      });
    },

    advancedViewUsed: () => {
      trackEvent('feature_advanced_view_used');
    },

    imageUploaded: (context: 'project' | 'progress_note' | 'avatar', sizeKB: number) => {
      trackEvent('feature_image_uploaded', {
        context,
        size_kb: Math.round(sizeKB),
      });
    },

    feedbackSubmitted: (type: string, page: string) => {
      trackEvent('feature_feedback_submitted', {
        feedback_type: type,
        source_page: page,
      });
    },
  },

  // User Profile Events
  user: {
    profileUpdated: (fields: string[]) => {
      trackEvent('user_profile_updated', {
        updated_fields: fields,
      });
    },

    avatarChanged: () => {
      trackEvent('user_avatar_changed');
    },

    betaTesterToggled: (enabled: boolean) => {
      trackEvent('user_beta_tester_toggled', { enabled });
    },
  },

  // Error Tracking Events
  error: {
    apiError: (endpoint: string, method: string, statusCode: number, error: string) => {
      trackEvent('error_api_call', {
        endpoint,
        method,
        status_code: statusCode,
        error_message: error,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
    },

    authenticationFailed: (method: 'email' | 'google' | 'discord', error: string) => {
      trackEvent('error_authentication_failed', {
        auth_method: method,
        error_message: error,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
    },

    formValidationFailed: (formName: string, fieldErrors: Record<string, string>) => {
      trackEvent('error_form_validation', {
        form_name: formName,
        error_fields: Object.keys(fieldErrors),
        error_count: Object.keys(fieldErrors).length,
        field_errors: fieldErrors,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
    },

    imageUploadFailed: (
      context: 'project' | 'progress_note' | 'avatar',
      error: string,
      fileSize?: number
    ) => {
      trackEvent('error_image_upload', {
        context,
        error_message: error,
        file_size_kb: fileSize ? Math.round(fileSize / 1024) : null,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
    },

    databaseOperation: (
      operation: 'create' | 'read' | 'update' | 'delete',
      table: string,
      error: string
    ) => {
      trackEvent('error_database_operation', {
        operation,
        table,
        error_message: error,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
    },

    pageLoadFailed: (page: string, error: string) => {
      trackEvent('error_page_load', {
        page,
        error_message: error,
        url: window.location.href,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
      });
    },
  },

  // Enhanced User Identification
  identifyUserWithContext: (userId: string, properties: Record<string, unknown>) => {
    identifyUser(userId, {
      ...properties,
      // Add computed properties
      account_age_days:
        properties.created && typeof properties.created === 'string'
          ? Math.floor(
              (Date.now() - new Date(properties.created).getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0,
      has_avatar: !!properties.avatar,
      is_beta_tester: properties.beta_tester || false,
    });
  },
};
