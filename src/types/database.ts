import { ProjectStatus } from './shared';

/**
 * Type definitions for the database schema
 * These types are used for data conversion and compatibility
 */

// Import DbProject from its source file
import { DbProject } from './db-project';

export type { DbProject };

// Legacy database interface for compatibility (no longer extends Supabase)
export interface LegacyDatabase {
  public: {
    Tables: {
      projects: {
        Row: DbProject;
        Insert: Omit<DbProject, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DbProject, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string;
        };
      };
    };
    Functions: {
      update_project: {
        Args: {
          project_id: string;
          user_id: string;
          p_title: string;
          p_company?: string | null;
          p_artist?: string | null;
          p_drill_shape?: string | null;
          p_width?: number | null;
          p_height?: number | null;
          p_status: ProjectStatus;
          p_date_purchased?: string | null;
          p_date_started?: string | null;
          p_date_completed?: string | null;
          p_image_url?: string | null;
          p_general_notes?: string | null;
          p_source_url?: string | null;
          p_total_diamonds?: number | null;
        };
        Returns: void;
      };
    };
  };
}

/**
 * Type for the result of the update_project function
 */
export interface UpdateProjectResult {
  success: boolean;
  message?: string;
}
