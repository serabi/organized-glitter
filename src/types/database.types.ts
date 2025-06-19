export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      artists: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          user_id: string;
          website_url: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          user_id: string;
          website_url?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          user_id?: string;
          website_url?: string | null;
        };
        Relationships: [];
      };
      deletion_requests: {
        Row: {
          created_at: string;
          id: string;
          notes: string | null;
          processed_at: string | null;
          processed_by: string | null;
          status: string;
          updated_at: string;
          user_email: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          processed_at?: string | null;
          processed_by?: string | null;
          status?: string;
          updated_at?: string;
          user_email: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          processed_at?: string | null;
          processed_by?: string | null;
          status?: string;
          updated_at?: string;
          user_email?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      email_notifications: {
        Row: {
          created_at: string | null;
          error_message: string | null;
          id: string;
          payload: Json;
          sent_at: string | null;
          status: string | null;
          type: string;
          user_email: string;
        };
        Insert: {
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          payload: Json;
          sent_at?: string | null;
          status?: string | null;
          type: string;
          user_email: string;
        };
        Update: {
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          payload?: Json;
          sent_at?: string | null;
          status?: string | null;
          type?: string;
          user_email?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          allow_email_tracking: boolean | null;
          avatar_seed: string | null;
          avatar_style: string | null;
          avatar_type: string | null;
          avatar_url: string | null;
          beta_tester: boolean | null;
          created_at: string;
          email: string | null;
          id: string;
          newsletter_subscribed: boolean | null;
          updated_at: string;
          username: string;
        };
        Insert: {
          allow_email_tracking?: boolean | null;
          avatar_seed?: string | null;
          avatar_style?: string | null;
          avatar_type?: string | null;
          avatar_url?: string | null;
          beta_tester?: boolean | null;
          created_at?: string;
          email?: string | null;
          id: string;
          newsletter_subscribed?: boolean | null;
          updated_at?: string;
          username: string;
        };
        Update: {
          allow_email_tracking?: boolean | null;
          avatar_seed?: string | null;
          avatar_style?: string | null;
          avatar_type?: string | null;
          avatar_url?: string | null;
          beta_tester?: boolean | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          newsletter_subscribed?: boolean | null;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      progress_notes: {
        Row: {
          content: string;
          created_at: string;
          date: string;
          id: string;
          image_url: string | null;
          project_id: string;
          updated_at: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          date?: string;
          id?: string;
          image_url?: string | null;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          date?: string;
          id?: string;
          image_url?: string | null;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'progress_notes_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      projects: {
        Row: {
          artist: string | null;
          artist_id: string | null;
          canvas_type: string | null;
          company: string | null;
          company_id: string | null;
          created_at: string;
          date_completed: string | null;
          date_purchased: string | null;
          date_received: string | null;
          date_started: string | null;
          deleted_at: string | null;
          drill_shape: string | null;
          drill_type: string | null;
          general_notes: string | null;
          height: number | null;
          id: string;
          image_url: string | null;
          notes: string | null;
          source_url: string | null;
          status: string;
          title: string;
          total_diamonds: number | null;
          updated_at: string;
          user_id: string;
          width: number | null;
        };
        Insert: {
          artist?: string | null;
          artist_id?: string | null;
          canvas_type?: string | null;
          company?: string | null;
          company_id?: string | null;
          created_at?: string;
          date_completed?: string | null;
          date_purchased?: string | null;
          date_received?: string | null;
          date_started?: string | null;
          deleted_at?: string | null;
          drill_shape?: string | null;
          drill_type?: string | null;
          general_notes?: string | null;
          height?: number | null;
          id?: string;
          image_url?: string | null;
          notes?: string | null;
          source_url?: string | null;
          status?: string;
          title: string;
          total_diamonds?: number | null;
          updated_at?: string;
          user_id: string;
          width?: number | null;
        };
        Update: {
          artist?: string | null;
          artist_id?: string | null;
          canvas_type?: string | null;
          company?: string | null;
          company_id?: string | null;
          created_at?: string;
          date_completed?: string | null;
          date_purchased?: string | null;
          date_received?: string | null;
          date_started?: string | null;
          deleted_at?: string | null;
          drill_shape?: string | null;
          drill_type?: string | null;
          general_notes?: string | null;
          height?: number | null;
          id?: string;
          image_url?: string | null;
          notes?: string | null;
          source_url?: string | null;
          status?: string;
          title?: string;
          total_diamonds?: number | null;
          updated_at?: string;
          user_id?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_projects_artist';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'artists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_projects_company';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      user_preferences: {
        Row: {
          created_at: string;
          dashboard_sort_direction: string;
          dashboard_sort_field: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          dashboard_sort_direction: string;
          dashboard_sort_field: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          dashboard_sort_direction?: string;
          dashboard_sort_field?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      delete_user: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      delete_user_data: {
        Args: { user_id_param: string };
        Returns: undefined;
      };
      generate_beta_invite_token: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_beta_tester_status: {
        Args: { user_id: string };
        Returns: boolean;
      };
      get_signup_method: {
        Args: { user_email: string };
        Returns: string;
      };
      is_profile_owner: {
        Args: { profile_id_param: string };
        Returns: boolean;
      };
      is_project_owner: {
        Args: { project_id_param: string };
        Returns: boolean;
      };
      project_exists: {
        Args: { project_id: string };
        Returns: boolean;
      };
      record_deletion_request: {
        Args: { p_notes?: string } | { p_user_id: string; p_user_email: string; p_notes?: string };
        Returns: Json;
      };
      update_profile_avatar: {
        Args: { user_id: string; avatar_url: string };
        Returns: undefined;
      };
      update_project: {
        Args: {
          project_id: string;
          user_id: string;
          p_title: string;
          p_company: string;
          p_artist: string;
          p_dimensions: string;
          p_drill_shape: string;
          p_status: string;
          p_date_purchased: string;
          p_date_started: string;
          p_date_completed: string;
          p_image_url: string;
          p_general_notes: string;
          p_source_url: string;
          p_total_diamonds: number;
        };
        Returns: undefined;
      };
      update_project_notes: {
        Args: { p_project_id: string; p_notes: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
