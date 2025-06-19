import { ProjectStatus } from './project-status';

/**
 * Base project interface that matches the database schema
 * Uses snake_case for database fields
 */
export interface DbProject {
  id: string;
  user_id: string;
  title: string;
  company?: string | null;
  artist?: string | null;
  drill_shape?: string | null;
  drill_type?: string | null;
  canvas_type?: string | null;
  width?: number | null;
  height?: number | null;
  status: ProjectStatus;
  date_purchased?: string | null;
  date_received?: string | null;
  date_started?: string | null;
  date_completed?: string | null;
  notes?: string | null;
  general_notes?: string | null;
  image_url?: string | null;
  source_url?: string | null;
  total_diamonds?: number | null;
  deleted_at?: string | null;
  kit_category?: 'full' | 'mini' | null; // Added kit_category
  created_at: string;
  updated_at: string;
  // Optional foreign key fields (not commonly used yet)
  company_id?: string | null;
  artist_id?: string | null;
}
