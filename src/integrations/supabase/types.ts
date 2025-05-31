export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_logs: {
        Row: {
          created_at: string | null
          id: string
          input: string
          intent: string | null
          memory_used: boolean | null
          response: string | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          input: string
          intent?: string | null
          memory_used?: boolean | null
          response?: string | null
          source: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          input?: string
          intent?: string | null
          memory_used?: boolean | null
          response?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          budgeted_amount: number
          category: string
          created_at: string | null
          end_date: string
          id: string
          spent: number | null
          start_date: string
          user_id: string
        }
        Insert: {
          budgeted_amount: number
          category: string
          created_at?: string | null
          end_date: string
          id?: string
          spent?: number | null
          start_date: string
          user_id: string
        }
        Update: {
          budgeted_amount?: number
          category?: string
          created_at?: string | null
          end_date?: string
          id?: string
          spent?: number | null
          start_date?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          end_time: string | null
          id: string
          location: string | null
          start_time: string | null
          time: string | null
          timezone: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          start_time?: string | null
          time?: string | null
          timezone?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          start_time?: string | null
          time?: string | null
          timezone?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      campaign_logs: {
        Row: {
          campaign_id: string | null
          clicked_cta: boolean | null
          delivery_status: string | null
          email_sent_at: string | null
          engagement_score: number | null
          id: string
          unsubscribed: boolean | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          clicked_cta?: boolean | null
          delivery_status?: string | null
          email_sent_at?: string | null
          engagement_score?: number | null
          id?: string
          unsubscribed?: boolean | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          clicked_cta?: boolean | null
          delivery_status?: string | null
          email_sent_at?: string | null
          engagement_score?: number | null
          id?: string
          unsubscribed?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_content"
            referencedColumns: ["id"]
          },
        ]
      }
      drawers: {
        Row: {
          created_at: string | null
          id: string
          name: string
          photo_url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          photo_url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date: string
          description: string | null
          id: number
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          date: string
          description?: string | null
          id?: never
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: never
          user_id?: string
        }
        Relationships: []
      }
      food_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          photo_url: string | null
          temperature_zone: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          photo_url?: string | null
          temperature_zone?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          temperature_zone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      food_items: {
        Row: {
          barcode: string | null
          category_id: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          name: string
          notes: string | null
          photo_url: string | null
          purchase_date: string | null
          quantity: number | null
          status: string | null
          unit: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          name: string
          notes?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          quantity?: number | null
          status?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          quantity?: number | null
          status?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "food_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_log: {
        Row: {
          consumption: number | null
          created_at: string | null
          date: string
          id: number
          location: string | null
          notes: string | null
          odometer: number | null
          price: number | null
          receipt_photo_url: string | null
          region: string | null
          total: number | null
          user_id: string | null
          volume: number | null
        }
        Insert: {
          consumption?: number | null
          created_at?: string | null
          date: string
          id?: number
          location?: string | null
          notes?: string | null
          odometer?: number | null
          price?: number | null
          receipt_photo_url?: string | null
          region?: string | null
          total?: number | null
          user_id?: string | null
          volume?: number | null
        }
        Update: {
          consumption?: number | null
          created_at?: string | null
          date?: string
          id?: number
          location?: string | null
          notes?: string | null
          odometer?: number | null
          price?: number | null
          receipt_photo_url?: string | null
          region?: string | null
          total?: number | null
          user_id?: string | null
          volume?: number | null
        }
        Relationships: []
      }
      hustle_opportunities: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          earning_potential: string | null
          id: string
          requirements: string[] | null
          source: string | null
          status: string | null
          time_commitment: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          earning_potential?: string | null
          id?: string
          requirements?: string[] | null
          source?: string | null
          status?: string | null
          time_commitment?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          earning_potential?: string | null
          id?: string
          requirements?: string[] | null
          source?: string | null
          status?: string | null
          time_commitment?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      income_sources: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          source: string
          type: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          source: string
          type?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          source?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          category: string | null
          created_at: string | null
          drawer_id: string | null
          id: string
          name: string
          notes: string | null
          packed: boolean | null
          photo_url: string | null
          quantity: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          drawer_id?: string | null
          id?: string
          name: string
          notes?: string | null
          packed?: boolean | null
          photo_url?: string | null
          quantity?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          drawer_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          packed?: boolean | null
          photo_url?: string | null
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_drawer_id_fkey"
            columns: ["drawer_id"]
            isOneToOne: false
            referencedRelation: "drawers"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          cost: number | null
          created_at: string | null
          date: string
          id: number
          mileage: number
          next_due_date: string | null
          next_due_mileage: number | null
          notes: string | null
          receipt_photo_url: string | null
          status: string | null
          task: string
          user_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          date: string
          id?: number
          mileage: number
          next_due_date?: string | null
          next_due_mileage?: number | null
          notes?: string | null
          receipt_photo_url?: string | null
          status?: string | null
          task: string
          user_id?: string
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          date?: string
          id?: number
          mileage?: number
          next_due_date?: string | null
          next_due_mileage?: number | null
          notes?: string | null
          receipt_photo_url?: string | null
          status?: string | null
          task?: string
          user_id?: string
        }
        Relationships: []
      }
      marketing_content: {
        Row: {
          campaign_name: string
          created_at: string | null
          email_body_html: string
          email_subject: string
          id: string
          user_id: string
        }
        Insert: {
          campaign_name: string
          created_at?: string | null
          email_body_html: string
          email_subject: string
          id?: string
          user_id: string
        }
        Update: {
          campaign_name?: string
          created_at?: string | null
          email_body_html?: string
          email_subject?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          photos: string[] | null
          price: number | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          photos?: string[] | null
          price?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          photos?: string[] | null
          price?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          created_at: string | null
          id: string
          ingredients: Json | null
          meal_date: string
          meal_type: string
          notes: string | null
          recipe_name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredients?: Json | null
          meal_date: string
          meal_type: string
          notes?: string | null
          recipe_name?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredients?: Json | null
          meal_date?: string
          meal_type?: string
          notes?: string | null
          recipe_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      newsletters: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          status: string | null
          subject: string | null
          type: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          subject?: string | null
          type?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          subject?: string | null
          type?: string | null
        }
        Relationships: []
      }
      onboarding_responses: {
        Row: {
          accessibility: string | null
          camp_types: string | null
          created_at: string | null
          drive_limit: string | null
          email: string | null
          fuel_type: string | null
          full_name: string | null
          id: string
          nickname: string | null
          pets: string | null
          region: string | null
          second_vehicle: string | null
          towing: string | null
          travel_style: string | null
          updated_at: string | null
          user_id: string | null
          vehicle_make_model_year: string | null
          vehicle_type: string | null
        }
        Insert: {
          accessibility?: string | null
          camp_types?: string | null
          created_at?: string | null
          drive_limit?: string | null
          email?: string | null
          fuel_type?: string | null
          full_name?: string | null
          id?: string
          nickname?: string | null
          pets?: string | null
          region?: string | null
          second_vehicle?: string | null
          towing?: string | null
          travel_style?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_make_model_year?: string | null
          vehicle_type?: string | null
        }
        Update: {
          accessibility?: string | null
          camp_types?: string | null
          created_at?: string | null
          drive_limit?: string | null
          email?: string | null
          fuel_type?: string | null
          full_name?: string | null
          id?: string
          nickname?: string | null
          pets?: string | null
          region?: string | null
          second_vehicle?: string | null
          towing?: string | null
          travel_style?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_make_model_year?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      pam_config: {
        Row: {
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      pam_feedback: {
        Row: {
          chat_input: string | null
          feedback: string | null
          id: string
          intent: string | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          chat_input?: string | null
          feedback?: string | null
          id?: string
          intent?: string | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          chat_input?: string | null
          feedback?: string | null
          id?: string
          intent?: string | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pam_life_memory: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          topic: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          topic?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pam_logs: {
        Row: {
          context: Json | null
          id: number
          log_level: string | null
          message: string | null
          timestamp: string | null
          trace_id: string | null
          workflow_name: string | null
        }
        Insert: {
          context?: Json | null
          id?: number
          log_level?: string | null
          message?: string | null
          timestamp?: string | null
          trace_id?: string | null
          workflow_name?: string | null
        }
        Update: {
          context?: Json | null
          id?: number
          log_level?: string | null
          message?: string | null
          timestamp?: string | null
          trace_id?: string | null
          workflow_name?: string | null
        }
        Relationships: []
      }
      pam_memory: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      pam_metrics: {
        Row: {
          id: number
          metric_name: string | null
          timestamp: string | null
          value: number | null
          workflow_name: string | null
        }
        Insert: {
          id?: number
          metric_name?: string | null
          timestamp?: string | null
          value?: number | null
          workflow_name?: string | null
        }
        Update: {
          id?: number
          metric_name?: string | null
          timestamp?: string | null
          value?: number | null
          workflow_name?: string | null
        }
        Relationships: []
      }
      post_votes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
          vote_type: boolean
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
          vote_type: boolean
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
          vote_type?: boolean
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          flagged: boolean | null
          id: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          flagged?: boolean | null
          id?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          flagged?: boolean | null
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: number
          region: string | null
          role: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: never
          region?: string | null
          role?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: never
          region?: string | null
          role?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      route_data: {
        Row: {
          country: string | null
          id: string
          inserted_at: string | null
          location: string
          name: string | null
          skipped: boolean | null
          source: string | null
          type: string | null
        }
        Insert: {
          country?: string | null
          id?: string
          inserted_at?: string | null
          location: string
          name?: string | null
          skipped?: boolean | null
          source?: string | null
          type?: string | null
        }
        Update: {
          country?: string | null
          id?: string
          inserted_at?: string | null
          location?: string
          name?: string | null
          skipped?: boolean | null
          source?: string | null
          type?: string | null
        }
        Relationships: []
      }
      routing_logs: {
        Row: {
          id: string
          intent: string
          query_text: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          id?: string
          intent: string
          query_text: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          id?: string
          intent?: string
          query_text?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          email_notifications: boolean | null
          two_factor_auth: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          email_notifications?: boolean | null
          two_factor_auth?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          email_notifications?: boolean | null
          two_factor_auth?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shopping_lists: {
        Row: {
          created_at: string | null
          id: string
          items: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          items?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          items?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      social_group_members: {
        Row: {
          group_id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "social_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      social_groups: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          description: string | null
          id: string
          member_count: number | null
          name: string
          owner_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          member_count?: number | null
          name: string
          owner_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          member_count?: number | null
          name?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string | null
          downvotes: number | null
          group_id: string | null
          id: string
          image_url: string | null
          location: string | null
          status: string | null
          upvotes: number | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string | null
          downvotes?: number | null
          group_id?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          status?: string | null
          upvotes?: number | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string | null
          downvotes?: number | null
          group_id?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          status?: string | null
          upvotes?: number | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          action_description: string | null
          action_type: string | null
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          action_description?: string | null
          action_type?: string | null
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action_description?: string | null
          action_type?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          context: string | null
          feedback: string | null
          id: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          context?: string | null
          feedback?: string | null
          id?: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          context?: string | null
          feedback?: string | null
          id?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          newsletter_id: string | null
          read: boolean | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          newsletter_id?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          newsletter_id?: string | null
          read?: boolean | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_newsletter_id_fkey"
            columns: ["newsletter_id"]
            isOneToOne: false
            referencedRelation: "newsletters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          accessibility: string | null
          camp_types: string | null
          created_at: string | null
          drive_limit: number | null
          email: string | null
          fuel_type: string | null
          full_name: string | null
          newsletter_opt_in: boolean | null
          nickname: string | null
          onboarded: boolean | null
          pets: string | null
          region: string | null
          second_vehicle: string | null
          towing: string | null
          travel_style: string | null
          user_id: string
          vehicle_make_model_year: string | null
          vehicle_type: string | null
        }
        Insert: {
          accessibility?: string | null
          camp_types?: string | null
          created_at?: string | null
          drive_limit?: number | null
          email?: string | null
          fuel_type?: string | null
          full_name?: string | null
          newsletter_opt_in?: boolean | null
          nickname?: string | null
          onboarded?: boolean | null
          pets?: string | null
          region?: string | null
          second_vehicle?: string | null
          towing?: string | null
          travel_style?: string | null
          user_id: string
          vehicle_make_model_year?: string | null
          vehicle_type?: string | null
        }
        Update: {
          accessibility?: string | null
          camp_types?: string | null
          created_at?: string | null
          drive_limit?: number | null
          email?: string | null
          fuel_type?: string | null
          full_name?: string | null
          newsletter_opt_in?: boolean | null
          nickname?: string | null
          onboarded?: boolean | null
          pets?: string | null
          region?: string | null
          second_vehicle?: string | null
          towing?: string | null
          travel_style?: string | null
          user_id?: string
          vehicle_make_model_year?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      seed_default_drawers: {
        Args: Record<PropertyKey, never> | { user_id: string }
        Returns: undefined
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      post_location: "feed" | "group"
      post_status: "pending" | "approved" | "rejected" | "hidden"
      region:
        | "Australia"
        | "New Zealand"
        | "United States"
        | "Canada"
        | "United Kingdom"
        | "Rest of the World"
      supported_region:
        | "Australia"
        | "New Zealand"
        | "United States"
        | "Canada"
        | "United Kingdom"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      post_location: ["feed", "group"],
      post_status: ["pending", "approved", "rejected", "hidden"],
      region: [
        "Australia",
        "New Zealand",
        "United States",
        "Canada",
        "United Kingdom",
        "Rest of the World",
      ],
      supported_region: [
        "Australia",
        "New Zealand",
        "United States",
        "Canada",
        "United Kingdom",
      ],
    },
  },
} as const
