// =========================================================================
// GENERATED DATABASE TYPES - MATCHES ACTUAL SUPABASE SCHEMA
// =========================================================================
// Generated: January 17, 2025
// Source: Live Supabase database schema analysis
//
// These types match the ACTUAL database structure, not assumptions
// =========================================================================

export interface Database {
  public: {
    Tables: {
      affiliate_sales: {
        Row: {
          id: string;
          user_id: string;
          product_name: string;
          commission_amount: number;
          sale_date: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_name: string;
          commission_amount: number;
          sale_date?: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_name?: string;
          commission_amount?: number;
          sale_date?: string;
          created_at?: string | null;
        };
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          amount: number;
          period: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          amount: number;
          period?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: string;
          amount?: number;
          period?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          icon: string | null;
          color: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          icon?: string | null;
          color?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          icon?: string | null;
          color?: string | null;
          created_at?: string | null;
        };
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          description: string;
          category: string | null;
          date: string;
          created_at: string | null;
          updated_at: string | null;
          trip_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          description: string;
          category?: string | null;
          date?: string;
          created_at?: string | null;
          updated_at?: string | null;
          trip_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          description?: string;
          category?: string | null;
          date?: string;
          created_at?: string | null;
          updated_at?: string | null;
          trip_id?: string | null;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          target_amount: number;
          current_amount: number | null;
          target_date: string | null;
          category: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          target_amount: number;
          current_amount?: number | null;
          target_date?: string | null;
          category?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          target_amount?: number;
          current_amount?: number | null;
          target_date?: string | null;
          category?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      income_entries: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          source: string;
          date: string;
          created_at: string | null;
          updated_at: string | null;
          description: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          source: string;
          date?: string;
          created_at?: string | null;
          updated_at?: string | null;
          description?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          source?: string;
          date?: string;
          created_at?: string | null;
          updated_at?: string | null;
          description?: string | null;
        };
      };
      pam_conversations: {
        Row: {
          id: string;
          user_id: string;
          message: string;
          response: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          message: string;
          response?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          message?: string;
          response?: string | null;
          created_at?: string | null;
        };
      };
      pam_feedback: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string | null;
          rating: number;
          feedback_text: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id?: string | null;
          rating: number;
          feedback_text?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          conversation_id?: string | null;
          rating?: number;
          feedback_text?: string | null;
          created_at?: string | null;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          image_url: string | null;
          created_at: string | null;
          updated_at: string | null;
          trip_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          image_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          trip_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          image_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          trip_id?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string | null;
          updated_at: string | null;
          username: string | null;
          bio: string | null;
        };
        Insert: {
          id: string; // This must match auth.users.id
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          username?: string | null;
          bio?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          username?: string | null;
          bio?: string | null;
        };
      };
      trip_templates: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          route: any; // JSONB
          duration_days: number | null;
          difficulty_level: string | null;
          estimated_cost: number | null;
          tags: string[] | null;
          is_featured: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          photos: any; // JSONB
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          route?: any;
          duration_days?: number | null;
          difficulty_level?: string | null;
          estimated_cost?: number | null;
          tags?: string[] | null;
          is_featured?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          photos?: any;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          route?: any;
          duration_days?: number | null;
          difficulty_level?: string | null;
          estimated_cost?: number | null;
          tags?: string[] | null;
          is_featured?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          photos?: any;
        };
      };
      trips: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          start_date: string | null;
          end_date: string | null;
          route: any; // JSONB
          budget: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          route?: any;
          budget?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          route?: any;
          budget?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      user_wishlists: {
        Row: {
          id: string;
          user_id: string;
          trip_template_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          trip_template_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          trip_template_id?: string;
          created_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// =========================================================================
// HELPER TYPES FOR COMMON OPERATIONS
// =========================================================================

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Specific table types for common use
export type Profile = Tables<'profiles'>;
export type Expense = Tables<'expenses'>;
export type Income = Tables<'income_entries'>;
export type Budget = Tables<'budgets'>;
export type Trip = Tables<'trips'>;
export type TripTemplate = Tables<'trip_templates'>;
export type Post = Tables<'posts'>;
export type Goal = Tables<'goals'>;
export type UserWishlist = Tables<'user_wishlists'>;
export type AffiliateSale = Tables<'affiliate_sales'>;
export type Category = Tables<'categories'>;
export type PamConversation = Tables<'pam_conversations'>;
export type PamFeedback = Tables<'pam_feedback'>;

// Insert types for forms
export type ProfileInsert = Inserts<'profiles'>;
export type ExpenseInsert = Inserts<'expenses'>;
export type IncomeInsert = Inserts<'income_entries'>;
export type BudgetInsert = Inserts<'budgets'>;
export type TripInsert = Inserts<'trips'>;
export type PostInsert = Inserts<'posts'>;

// Update types for editing
export type ProfileUpdate = Updates<'profiles'>;
export type ExpenseUpdate = Updates<'expenses'>;
export type IncomeUpdate = Updates<'income_entries'>;
export type BudgetUpdate = Updates<'budgets'>;
export type TripUpdate = Updates<'trips'>;
export type PostUpdate = Updates<'posts'>;

// =========================================================================
// IMPORTANT NOTES
// =========================================================================
//
// 1. All user_id fields reference profiles.id (not auth.users.id directly)
// 2. profiles.id has a foreign key to auth.users.id
// 3. Use auth.uid() in RLS policies and Supabase queries
// 4. The 'period' column exists in budgets table (not 'budget_period')
// 5. user_wishlists is for trip template favorites (simple junction table)
// 6. trip_templates does NOT have a created_by field
// 7. posts table has image_url (singular), not images (array)
//
// =========================================================================