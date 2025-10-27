export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ab_test_assignments: {
        Row: {
          assigned_at: string | null
          conversion_value: number | null
          converted: boolean | null
          experiment_id: string | null
          id: string
          metadata: Json | null
          user_id: string
          variant_name: string
        }
        Insert: {
          assigned_at?: string | null
          conversion_value?: number | null
          converted?: boolean | null
          experiment_id?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
          variant_name: string
        }
        Update: {
          assigned_at?: string | null
          conversion_value?: number | null
          converted?: boolean | null
          experiment_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_assignments_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "ab_test_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_test_experiments: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string | null
          success_metrics: Json | null
          traffic_allocation: number | null
          updated_at: string | null
          variants: Json
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string | null
          success_metrics?: Json | null
          traffic_allocation?: number | null
          updated_at?: string | null
          variants: Json
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string | null
          success_metrics?: Json | null
          traffic_allocation?: number | null
          updated_at?: string | null
          variants?: Json
        }
        Relationships: []
      }
      account_deletion_requests: {
        Row: {
          created_at: string | null
          id: string
          reason: string | null
          scheduled_deletion_date: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason?: string | null
          scheduled_deletion_date?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string | null
          scheduled_deletion_date?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          last_login: string | null
          permissions: Json | null
          region: string | null
          role: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          last_login?: string | null
          permissions?: Json | null
          region?: string | null
          role?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          last_login?: string | null
          permissions?: Json | null
          region?: string | null
          role?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      ai_feedback_events: {
        Row: {
          conversation_id: string | null
          correction_text: string | null
          created_at: string | null
          feedback_category: string | null
          feedback_text: string | null
          feedback_type: string
          id: string
          metadata: Json | null
          rating: number | null
          suggestion_text: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          correction_text?: string | null
          created_at?: string | null
          feedback_category?: string | null
          feedback_text?: string | null
          feedback_type: string
          id?: string
          metadata?: Json | null
          rating?: number | null
          suggestion_text?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          correction_text?: string | null
          created_at?: string | null
          feedback_category?: string | null
          feedback_text?: string | null
          feedback_type?: string
          id?: string
          metadata?: Json | null
          rating?: number | null
          suggestion_text?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_training_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_finetuning_jobs: {
        Row: {
          actual_completion: string | null
          actual_cost: number | null
          base_model: string
          cost_estimate: number | null
          created_at: string | null
          created_by: string | null
          dataset_id: string | null
          error_message: string | null
          estimated_completion: string | null
          id: string
          job_config: Json
          job_name: string
          job_status: string | null
          logs: string | null
          performance_improvement: Json | null
          progress_percentage: number | null
          resulting_model_id: string | null
          updated_at: string | null
        }
        Insert: {
          actual_completion?: string | null
          actual_cost?: number | null
          base_model: string
          cost_estimate?: number | null
          created_at?: string | null
          created_by?: string | null
          dataset_id?: string | null
          error_message?: string | null
          estimated_completion?: string | null
          id?: string
          job_config: Json
          job_name: string
          job_status?: string | null
          logs?: string | null
          performance_improvement?: Json | null
          progress_percentage?: number | null
          resulting_model_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_completion?: string | null
          actual_cost?: number | null
          base_model?: string
          cost_estimate?: number | null
          created_at?: string | null
          created_by?: string | null
          dataset_id?: string | null
          error_message?: string | null
          estimated_completion?: string | null
          id?: string
          job_config?: Json
          job_name?: string
          job_status?: string | null
          logs?: string | null
          performance_improvement?: Json | null
          progress_percentage?: number | null
          resulting_model_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_finetuning_jobs_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "ai_training_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_performance: {
        Row: {
          created_at: string | null
          created_by: string | null
          domain_expertise_score: number | null
          evaluation_date: string | null
          general_performance_score: number | null
          id: string
          improvement_areas: string[] | null
          knowledge_accuracy_score: number | null
          model_version: string
          notes: string | null
          performance_metrics: Json
          response_relevance_score: number | null
          test_dataset_id: string | null
          user_satisfaction_score: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          domain_expertise_score?: number | null
          evaluation_date?: string | null
          general_performance_score?: number | null
          id?: string
          improvement_areas?: string[] | null
          knowledge_accuracy_score?: number | null
          model_version: string
          notes?: string | null
          performance_metrics: Json
          response_relevance_score?: number | null
          test_dataset_id?: string | null
          user_satisfaction_score?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          domain_expertise_score?: number | null
          evaluation_date?: string | null
          general_performance_score?: number | null
          id?: string
          improvement_areas?: string[] | null
          knowledge_accuracy_score?: number | null
          model_version?: string
          notes?: string | null
          performance_metrics?: Json
          response_relevance_score?: number | null
          test_dataset_id?: string | null
          user_satisfaction_score?: number | null
        }
        Relationships: []
      }
      ai_training_conversations: {
        Row: {
          ai_response: string
          context_data: Json | null
          conversation_type: string
          created_at: string | null
          entities_extracted: Json | null
          feedback_type: string | null
          id: string
          intent_classification: string | null
          is_training_approved: boolean | null
          model_version: string | null
          quality_score: number | null
          response_time_ms: number | null
          session_id: string
          updated_at: string | null
          user_correction: string | null
          user_id: string | null
          user_message: string
        }
        Insert: {
          ai_response: string
          context_data?: Json | null
          conversation_type: string
          created_at?: string | null
          entities_extracted?: Json | null
          feedback_type?: string | null
          id?: string
          intent_classification?: string | null
          is_training_approved?: boolean | null
          model_version?: string | null
          quality_score?: number | null
          response_time_ms?: number | null
          session_id: string
          updated_at?: string | null
          user_correction?: string | null
          user_id?: string | null
          user_message: string
        }
        Update: {
          ai_response?: string
          context_data?: Json | null
          conversation_type?: string
          created_at?: string | null
          entities_extracted?: Json | null
          feedback_type?: string | null
          id?: string
          intent_classification?: string | null
          is_training_approved?: boolean | null
          model_version?: string | null
          quality_score?: number | null
          response_time_ms?: number | null
          session_id?: string
          updated_at?: string | null
          user_correction?: string | null
          user_id?: string | null
          user_message?: string
        }
        Relationships: []
      }
      ai_training_datasets: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_source: Json
          dataset_type: string
          description: string | null
          domain_focus: string | null
          id: string
          is_active: boolean | null
          last_used_for_training: string | null
          name: string
          preprocessing_applied: string[] | null
          quality_threshold: number | null
          size_metrics: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data_source: Json
          dataset_type: string
          description?: string | null
          domain_focus?: string | null
          id?: string
          is_active?: boolean | null
          last_used_for_training?: string | null
          name: string
          preprocessing_applied?: string[] | null
          quality_threshold?: number | null
          size_metrics?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data_source?: Json
          dataset_type?: string
          description?: string | null
          domain_focus?: string | null
          id?: string
          is_active?: boolean | null
          last_used_for_training?: string | null
          name?: string
          preprocessing_applied?: string[] | null
          quality_threshold?: number | null
          size_metrics?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      analytics_sessions: {
        Row: {
          bounce_rate: number | null
          created_at: string | null
          device_type: string | null
          duration_seconds: number | null
          id: string
          interactions_count: number | null
          ip_address: unknown | null
          page_views: number | null
          session_end: string | null
          session_start: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          bounce_rate?: number | null
          created_at?: string | null
          device_type?: string | null
          duration_seconds?: number | null
          id?: string
          interactions_count?: number | null
          ip_address?: unknown | null
          page_views?: number | null
          session_end?: string | null
          session_start?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          bounce_rate?: number | null
          created_at?: string | null
          device_type?: string | null
          duration_seconds?: number | null
          id?: string
          interactions_count?: number | null
          ip_address?: unknown | null
          page_views?: number | null
          session_end?: string | null
          session_start?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audio_cache: {
        Row: {
          audio_base64: string
          created_at: string | null
          duration_seconds: number | null
          expires_at: string | null
          file_size: number | null
          id: string
          text_hash: string
          user_id: string
          voice_settings: Json | null
        }
        Insert: {
          audio_base64: string
          created_at?: string | null
          duration_seconds?: number | null
          expires_at?: string | null
          file_size?: number | null
          id?: string
          text_hash: string
          user_id?: string
          voice_settings?: Json | null
        }
        Update: {
          audio_base64?: string
          created_at?: string | null
          duration_seconds?: number | null
          expires_at?: string | null
          file_size?: number | null
          id?: string
          text_hash?: string
          user_id?: string
          voice_settings?: Json | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auto_moderation_rules: {
        Row: {
          actions: Json
          conditions: Json
          content_types: string[]
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          rule_name: string
          severity_level: string | null
          updated_at: string | null
        }
        Insert: {
          actions: Json
          conditions: Json
          content_types: string[]
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          rule_name: string
          severity_level?: string | null
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          conditions?: Json
          content_types?: string[]
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          rule_name?: string
          severity_level?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      budget_categories: {
        Row: {
          budgeted_amount: number
          color: string | null
          created_at: string | null
          id: string
          name: string
          spent_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          budgeted_amount?: number
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          spent_amount?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          budgeted_amount?: number
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          spent_amount?: number
          updated_at?: string | null
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
          name: string | null
          start_date: string
          user_id: string
        }
        Insert: {
          budgeted_amount: number
          category: string
          created_at?: string | null
          end_date: string
          id?: string
          name?: string | null
          start_date: string
          user_id: string
        }
        Update: {
          budgeted_amount?: number
          category?: string
          created_at?: string | null
          end_date?: string
          id?: string
          name?: string | null
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
          updated_at: string | null
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
          updated_at?: string | null
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
          updated_at?: string | null
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
      camping_locations: {
        Row: {
          address: string | null
          amenities: Json | null
          availability_calendar: Json | null
          created_at: string | null
          hookups: Json | null
          id: string
          latitude: number
          longitude: number
          max_rig_length: number | null
          name: string
          price_per_night: number | null
          reservation_link: string | null
          reservation_required: boolean | null
          reviews_summary: string | null
          seasonal_info: Json | null
          type: string
          updated_at: string | null
          user_ratings: number | null
        }
        Insert: {
          address?: string | null
          amenities?: Json | null
          availability_calendar?: Json | null
          created_at?: string | null
          hookups?: Json | null
          id?: string
          latitude: number
          longitude: number
          max_rig_length?: number | null
          name: string
          price_per_night?: number | null
          reservation_link?: string | null
          reservation_required?: boolean | null
          reviews_summary?: string | null
          seasonal_info?: Json | null
          type: string
          updated_at?: string | null
          user_ratings?: number | null
        }
        Update: {
          address?: string | null
          amenities?: Json | null
          availability_calendar?: Json | null
          created_at?: string | null
          hookups?: Json | null
          id?: string
          latitude?: number
          longitude?: number
          max_rig_length?: number | null
          name?: string
          price_per_night?: number | null
          reservation_link?: string | null
          reservation_required?: boolean | null
          reviews_summary?: string | null
          seasonal_info?: Json | null
          type?: string
          updated_at?: string | null
          user_ratings?: number | null
        }
        Relationships: []
      }
      community_intelligence: {
        Row: {
          category: string | null
          created_at: string | null
          data_source: string
          data_type: string
          description: string | null
          expires_at: string | null
          facebook_events: Json | null
          free_camping_updates: Json | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          priority_level: string | null
          recommendation_id: string | null
          reddit_discussions: Json | null
          relevance_score: number | null
          rv_forum_tips: Json | null
          savings_amount: number | null
          scraped_at: string | null
          source_data_id: string | null
          time_sensitive: boolean | null
          title: string | null
          user_acted: boolean | null
          user_id: string | null
          user_viewed: boolean | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          data_source: string
          data_type: string
          description?: string | null
          expires_at?: string | null
          facebook_events?: Json | null
          free_camping_updates?: Json | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          priority_level?: string | null
          recommendation_id?: string | null
          reddit_discussions?: Json | null
          relevance_score?: number | null
          rv_forum_tips?: Json | null
          savings_amount?: number | null
          scraped_at?: string | null
          source_data_id?: string | null
          time_sensitive?: boolean | null
          title?: string | null
          user_acted?: boolean | null
          user_id?: string | null
          user_viewed?: boolean | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          data_source?: string
          data_type?: string
          description?: string | null
          expires_at?: string | null
          facebook_events?: Json | null
          free_camping_updates?: Json | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          priority_level?: string | null
          recommendation_id?: string | null
          reddit_discussions?: Json | null
          relevance_score?: number | null
          rv_forum_tips?: Json | null
          savings_amount?: number | null
          scraped_at?: string | null
          source_data_id?: string | null
          time_sensitive?: boolean | null
          title?: string | null
          user_acted?: boolean | null
          user_id?: string | null
          user_viewed?: boolean | null
        }
        Relationships: []
      }
      content_moderation: {
        Row: {
          author_email: string | null
          author_id: string | null
          content_id: string
          content_text: string | null
          content_type: string
          created_at: string | null
          flagged_by: string | null
          flagged_reason: string | null
          id: string
          moderator_id: string | null
          moderator_notes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          author_email?: string | null
          author_id?: string | null
          content_id: string
          content_text?: string | null
          content_type: string
          created_at?: string | null
          flagged_by?: string | null
          flagged_reason?: string | null
          id?: string
          moderator_id?: string | null
          moderator_notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          author_email?: string | null
          author_id?: string | null
          content_id?: string
          content_text?: string | null
          content_type?: string
          created_at?: string | null
          flagged_by?: string | null
          flagged_reason?: string | null
          id?: string
          moderator_id?: string | null
          moderator_notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      drawers: {
        Row: {
          created_at: string | null
          id: string
          name: string
          photo_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          photo_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      event_attendees: {
        Row: {
          event_id: string | null
          id: string
          notes: string | null
          rsvp_date: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          event_id?: string | null
          id?: string
          notes?: string | null
          rsvp_date?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          event_id?: string | null
          id?: string
          notes?: string | null
          rsvp_date?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "group_events"
            referencedColumns: ["id"]
          },
        ]
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
      facebook_groups: {
        Row: {
          activity_level: string | null
          admin_contact: string | null
          created_at: string | null
          description: string | null
          group_name: string
          group_type: string | null
          group_url: string | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          meetup_frequency: string | null
          member_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          activity_level?: string | null
          admin_contact?: string | null
          created_at?: string | null
          description?: string | null
          group_name: string
          group_type?: string | null
          group_url?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          meetup_frequency?: string | null
          member_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          activity_level?: string | null
          admin_contact?: string | null
          created_at?: string | null
          description?: string | null
          group_name?: string
          group_type?: string | null
          group_url?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          meetup_frequency?: string | null
          member_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      failed_login_attempts: {
        Row: {
          attempt_time: string | null
          email: string
          id: string
          ip_address: unknown
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          attempt_time?: string | null
          email: string
          id?: string
          ip_address: unknown
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          attempt_time?: string | null
          email?: string
          id?: string
          ip_address?: unknown
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      financial_tips: {
        Row: {
          category: string
          content: string
          created_at: string | null
          id: string
          is_shared: boolean | null
          savings_amount: number | null
          title: string
          user_id: string
          votes: number | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          id?: string
          is_shared?: boolean | null
          savings_amount?: number | null
          title: string
          user_id: string
          votes?: number | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          is_shared?: boolean | null
          savings_amount?: number | null
          title?: string
          user_id?: string
          votes?: number | null
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
            foreignKeyName: "fk_food_items_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "food_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "food_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_locations: {
        Row: {
          created_at: string | null
          id: string
          is_public: boolean | null
          last_updated: string | null
          latitude: number
          location_name: string | null
          longitude: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          last_updated?: string | null
          latitude: number
          location_name?: string | null
          longitude: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          last_updated?: string | null
          latitude?: number
          location_name?: string | null
          longitude?: number
          status?: string
          user_id?: string
        }
        Relationships: []
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
      fuel_stations: {
        Row: {
          address: string
          amenities: Json | null
          brand: string | null
          created_at: string | null
          diesel_price: number | null
          id: string
          last_updated: string | null
          latitude: number
          longitude: number
          premium_price: number | null
          regular_price: number | null
          rv_friendly: boolean | null
          station_name: string
          updated_at: string | null
          user_ratings: number | null
        }
        Insert: {
          address: string
          amenities?: Json | null
          brand?: string | null
          created_at?: string | null
          diesel_price?: number | null
          id?: string
          last_updated?: string | null
          latitude: number
          longitude: number
          premium_price?: number | null
          regular_price?: number | null
          rv_friendly?: boolean | null
          station_name: string
          updated_at?: string | null
          user_ratings?: number | null
        }
        Update: {
          address?: string
          amenities?: Json | null
          brand?: string | null
          created_at?: string | null
          diesel_price?: number | null
          id?: string
          last_updated?: string | null
          latitude?: number
          longitude?: number
          premium_price?: number | null
          regular_price?: number | null
          rv_friendly?: boolean | null
          station_name?: string
          updated_at?: string | null
          user_ratings?: number | null
        }
        Relationships: []
      }
      group_events: {
        Row: {
          cost_per_person: number | null
          created_at: string | null
          description: string | null
          end_date: string | null
          event_type: string | null
          group_id: string | null
          id: string
          location: Json | null
          max_attendees: number | null
          metadata: Json | null
          organizer_id: string | null
          requirements: string[] | null
          start_date: string
          status: string | null
          title: string
          trip_id: string | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          cost_per_person?: number | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          group_id?: string | null
          id?: string
          location?: Json | null
          max_attendees?: number | null
          metadata?: Json | null
          organizer_id?: string | null
          requirements?: string[] | null
          start_date: string
          status?: string | null
          title: string
          trip_id?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          cost_per_person?: number | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          group_id?: string | null
          id?: string
          location?: Json | null
          max_attendees?: number | null
          metadata?: Json | null
          organizer_id?: string | null
          requirements?: string[] | null
          start_date?: string
          status?: string | null
          title?: string
          trip_id?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "social_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "group_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          group_id: string | null
          id: string
          is_active: boolean | null
          joined_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "social_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_polls: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          ends_at: string | null
          group_id: string | null
          id: string
          is_anonymous: boolean | null
          options: Json
          poll_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          group_id?: string | null
          id?: string
          is_anonymous?: boolean | null
          options: Json
          poll_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          group_id?: string | null
          id?: string
          is_anonymous?: boolean | null
          options?: Json
          poll_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_polls_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "social_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_resources: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          file_path: string | null
          group_id: string | null
          id: string
          is_pinned: boolean | null
          resource_type: string
          tags: string[] | null
          title: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_path?: string | null
          group_id?: string | null
          id?: string
          is_pinned?: boolean | null
          resource_type: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          file_path?: string | null
          group_id?: string | null
          id?: string
          is_pinned?: boolean | null
          resource_type?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_resources_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "social_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_trip_participants: {
        Row: {
          id: string
          joined_at: string | null
          role: string
          status: string
          trip_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: string
          status?: string
          trip_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: string
          status?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_trip_participants_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "group_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      group_trips: {
        Row: {
          budget_coordination: Json | null
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          meeting_point: Json | null
          route_data: Json | null
          start_date: string | null
          status: string
          trip_name: string
          updated_at: string | null
        }
        Insert: {
          budget_coordination?: Json | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          meeting_point?: Json | null
          route_data?: Json | null
          start_date?: string | null
          status?: string
          trip_name: string
          updated_at?: string | null
        }
        Update: {
          budget_coordination?: Json | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          meeting_point?: Json | null
          route_data?: Json | null
          start_date?: string | null
          status?: string
          trip_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      health_check: {
        Row: {
          checked_at: string | null
          created_at: string | null
          details: Json | null
          id: string
          service_name: string
          status: string
        }
        Insert: {
          checked_at?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          service_name?: string
          status?: string
        }
        Update: {
          checked_at?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          service_name?: string
          status?: string
        }
        Relationships: []
      }
      hustle_ideas: {
        Row: {
          avg_earnings: number | null
          created_at: string | null
          description: string | null
          id: string
          image: string | null
          likes: number | null
          rating: number | null
          status: string | null
          tags: string[] | null
          title: string
          trending: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avg_earnings?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          likes?: number | null
          rating?: number | null
          status?: string | null
          tags?: string[] | null
          title: string
          trending?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avg_earnings?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          likes?: number | null
          rating?: number | null
          status?: string | null
          tags?: string[] | null
          title?: string
          trending?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      hustle_leaderboard: {
        Row: {
          attempts_count: number | null
          created_at: string
          hustle_id: string
          id: string
          success_rate: number | null
          total_earnings: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts_count?: number | null
          created_at?: string
          hustle_id: string
          id?: string
          success_rate?: number | null
          total_earnings?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts_count?: number | null
          created_at?: string
          hustle_id?: string
          id?: string
          success_rate?: number | null
          total_earnings?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hustle_leaderboard_hustle_id_fkey"
            columns: ["hustle_id"]
            isOneToOne: false
            referencedRelation: "youtube_hustles"
            referencedColumns: ["id"]
          },
        ]
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
      income_entries: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          description: string | null
          id: string
          source: string
          type: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          source: string
          type?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          source?: string
          type?: string | null
          user_id?: string
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
            foreignKeyName: "fk_items_drawer"
            columns: ["drawer_id"]
            isOneToOne: false
            referencedRelation: "drawers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_drawer_id_fkey"
            columns: ["drawer_id"]
            isOneToOne: false
            referencedRelation: "drawers"
            referencedColumns: ["id"]
          },
        ]
      }
      local_events: {
        Row: {
          address: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          event_name: string
          event_type: string | null
          id: string
          is_free: boolean | null
          latitude: number | null
          longitude: number | null
          registration_link: string | null
          registration_required: boolean | null
          start_date: string
          start_time: string | null
          target_audience: Json | null
          ticket_price: number | null
          updated_at: string | null
          venue_name: string | null
          weather_dependent: boolean | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_name: string
          event_type?: string | null
          id?: string
          is_free?: boolean | null
          latitude?: number | null
          longitude?: number | null
          registration_link?: string | null
          registration_required?: boolean | null
          start_date: string
          start_time?: string | null
          target_audience?: Json | null
          ticket_price?: number | null
          updated_at?: string | null
          venue_name?: string | null
          weather_dependent?: boolean | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_name?: string
          event_type?: string | null
          id?: string
          is_free?: boolean | null
          latitude?: number | null
          longitude?: number | null
          registration_link?: string | null
          registration_required?: boolean | null
          start_date?: string
          start_time?: string | null
          target_audience?: Json | null
          ticket_price?: number | null
          updated_at?: string | null
          venue_name?: string | null
          weather_dependent?: boolean | null
        }
        Relationships: []
      }
      location_weather_patterns: {
        Row: {
          avg_high_temp: number | null
          avg_low_temp: number | null
          avg_precipitation: number | null
          best_for_activities: Json | null
          created_at: string | null
          crowd_levels: string | null
          id: string
          latitude: number
          location_name: string | null
          longitude: number
          month: number | null
          weather_warnings: Json | null
        }
        Insert: {
          avg_high_temp?: number | null
          avg_low_temp?: number | null
          avg_precipitation?: number | null
          best_for_activities?: Json | null
          created_at?: string | null
          crowd_levels?: string | null
          id?: string
          latitude: number
          location_name?: string | null
          longitude: number
          month?: number | null
          weather_warnings?: Json | null
        }
        Update: {
          avg_high_temp?: number | null
          avg_low_temp?: number | null
          avg_precipitation?: number | null
          best_for_activities?: Json | null
          created_at?: string | null
          crowd_levels?: string | null
          id?: string
          latitude?: number
          location_name?: string | null
          longitude?: number
          month?: number | null
          weather_warnings?: Json | null
        }
        Relationships: []
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
      marketplace_favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          category: string | null
          condition: string | null
          created_at: string | null
          description: string | null
          id: string
          image: string | null
          is_favorite: boolean | null
          location: string | null
          photos: string[] | null
          posted: string | null
          price: number | null
          seller: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          is_favorite?: boolean | null
          location?: string | null
          photos?: string[] | null
          posted?: string | null
          price?: number | null
          seller?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          is_favorite?: boolean | null
          location?: string | null
          photos?: string[] | null
          posted?: string | null
          price?: number | null
          seller?: string | null
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
      meetup_suggestions: {
        Row: {
          confidence_score: number | null
          cost_impact: number | null
          created_at: string | null
          distance_deviation_km: number | null
          expires_at: string | null
          friend_id: string
          id: string
          status: string
          suggested_date: string | null
          suggested_location: Json
          trip_day: number | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          cost_impact?: number | null
          created_at?: string | null
          distance_deviation_km?: number | null
          expires_at?: string | null
          friend_id: string
          id?: string
          status?: string
          suggested_date?: string | null
          suggested_location: Json
          trip_day?: number | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          cost_impact?: number | null
          created_at?: string | null
          distance_deviation_km?: number | null
          expires_at?: string | null
          friend_id?: string
          id?: string
          status?: string
          suggested_date?: string | null
          suggested_location?: Json
          trip_day?: number | null
          user_id?: string
        }
        Relationships: []
      }
      mfa_settings: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          enabled: boolean | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      moderation_actions: {
        Row: {
          action_type: string
          appeal_status: string | null
          content_id: string | null
          content_type: string | null
          created_at: string | null
          duration_hours: number | null
          expires_at: string | null
          id: string
          is_automated: boolean | null
          moderator_id: string | null
          reason: string
          target_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          action_type: string
          appeal_status?: string | null
          content_id?: string | null
          content_type?: string | null
          created_at?: string | null
          duration_hours?: number | null
          expires_at?: string | null
          id?: string
          is_automated?: boolean | null
          moderator_id?: string | null
          reason: string
          target_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          appeal_status?: string | null
          content_id?: string | null
          content_type?: string | null
          created_at?: string | null
          duration_hours?: number | null
          expires_at?: string | null
          id?: string
          is_automated?: boolean | null
          moderator_id?: string | null
          reason?: string
          target_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      moderation_queue: {
        Row: {
          assigned_moderator: string | null
          category: string
          content_id: string
          content_type: string
          created_at: string | null
          description: string | null
          evidence_urls: string[] | null
          id: string
          priority_level: string | null
          reason: string
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_moderator?: string | null
          category: string
          content_id: string
          content_type: string
          created_at?: string | null
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          priority_level?: string | null
          reason: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_moderator?: string | null
          category?: string
          content_id?: string
          content_type?: string
          created_at?: string | null
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          priority_level?: string | null
          reason?: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      money_maker_ideas: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          monthly_income: number | null
          name: string
          progress: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          monthly_income?: number | null
          name: string
          progress?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          monthly_income?: number | null
          name?: string
          progress?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
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
      offroad_routes: {
        Row: {
          best_seasons: Json | null
          created_at: string | null
          difficulty_level: string | null
          distance_miles: number | null
          end_location: Json | null
          estimated_time_hours: number | null
          id: string
          latitude: number
          longitude: number
          route_description: string | null
          route_name: string
          safety_notes: string | null
          scenic_rating: number | null
          start_location: Json | null
          updated_at: string | null
          vehicle_requirements: Json | null
        }
        Insert: {
          best_seasons?: Json | null
          created_at?: string | null
          difficulty_level?: string | null
          distance_miles?: number | null
          end_location?: Json | null
          estimated_time_hours?: number | null
          id?: string
          latitude: number
          longitude: number
          route_description?: string | null
          route_name: string
          safety_notes?: string | null
          scenic_rating?: number | null
          start_location?: Json | null
          updated_at?: string | null
          vehicle_requirements?: Json | null
        }
        Update: {
          best_seasons?: Json | null
          created_at?: string | null
          difficulty_level?: string | null
          distance_miles?: number | null
          end_location?: Json | null
          estimated_time_hours?: number | null
          id?: string
          latitude?: number
          longitude?: number
          route_description?: string | null
          route_name?: string
          safety_notes?: string | null
          scenic_rating?: number | null
          start_location?: Json | null
          updated_at?: string | null
          vehicle_requirements?: Json | null
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
      pam_analytics: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pam_analytics_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "pam_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      pam_analytics_logs: {
        Row: {
          api_calls_count: number | null
          confidence: number | null
          confidence_level: string | null
          created_at: string | null
          day_of_week: number | null
          error_message: string | null
          error_type: string | null
          has_error: boolean | null
          hour_of_day: number | null
          id: number
          intent: string | null
          is_weekend: boolean | null
          log_id: string | null
          log_level: string | null
          message: string | null
          message_preview: string | null
          raw_context: Json | null
          response_time_ms: number | null
          session_id: string | null
          timestamp: string | null
          trace_id: string | null
          user_id: string | null
          validation_passed: boolean | null
          voice_enabled: boolean | null
          workflow_name: string | null
        }
        Insert: {
          api_calls_count?: number | null
          confidence?: number | null
          confidence_level?: string | null
          created_at?: string | null
          day_of_week?: number | null
          error_message?: string | null
          error_type?: string | null
          has_error?: boolean | null
          hour_of_day?: number | null
          id?: never
          intent?: string | null
          is_weekend?: boolean | null
          log_id?: string | null
          log_level?: string | null
          message?: string | null
          message_preview?: string | null
          raw_context?: Json | null
          response_time_ms?: number | null
          session_id?: string | null
          timestamp?: string | null
          trace_id?: string | null
          user_id?: string | null
          validation_passed?: boolean | null
          voice_enabled?: boolean | null
          workflow_name?: string | null
        }
        Update: {
          api_calls_count?: number | null
          confidence?: number | null
          confidence_level?: string | null
          created_at?: string | null
          day_of_week?: number | null
          error_message?: string | null
          error_type?: string | null
          has_error?: boolean | null
          hour_of_day?: number | null
          id?: never
          intent?: string | null
          is_weekend?: boolean | null
          log_id?: string | null
          log_level?: string | null
          message?: string | null
          message_preview?: string | null
          raw_context?: Json | null
          response_time_ms?: number | null
          session_id?: string | null
          timestamp?: string | null
          trace_id?: string | null
          user_id?: string | null
          validation_passed?: boolean | null
          voice_enabled?: boolean | null
          workflow_name?: string | null
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
      pam_conversation_memory: {
        Row: {
          context_used: Json | null
          created_at: string | null
          detected_intent: string | null
          entities_extracted: Json | null
          follow_up_needed: boolean | null
          follow_up_reason: string | null
          id: string
          intent_confidence: number | null
          message_sequence: number
          message_timestamp: string | null
          node_used: string | null
          pam_response: string | null
          response_quality: number | null
          response_time_ms: number | null
          session_id: string | null
          user_feedback: string | null
          user_id: string
          user_message: string | null
          user_preferences_learned: Json | null
        }
        Insert: {
          context_used?: Json | null
          created_at?: string | null
          detected_intent?: string | null
          entities_extracted?: Json | null
          follow_up_needed?: boolean | null
          follow_up_reason?: string | null
          id?: string
          intent_confidence?: number | null
          message_sequence: number
          message_timestamp?: string | null
          node_used?: string | null
          pam_response?: string | null
          response_quality?: number | null
          response_time_ms?: number | null
          session_id?: string | null
          user_feedback?: string | null
          user_id: string
          user_message?: string | null
          user_preferences_learned?: Json | null
        }
        Update: {
          context_used?: Json | null
          created_at?: string | null
          detected_intent?: string | null
          entities_extracted?: Json | null
          follow_up_needed?: boolean | null
          follow_up_reason?: string | null
          id?: string
          intent_confidence?: number | null
          message_sequence?: number
          message_timestamp?: string | null
          node_used?: string | null
          pam_response?: string | null
          response_quality?: number | null
          response_time_ms?: number | null
          session_id?: string | null
          user_feedback?: string | null
          user_id?: string
          user_message?: string | null
          user_preferences_learned?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pam_conversation_memory_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pam_conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pam_conversation_sessions: {
        Row: {
          created_at: string | null
          id: string
          intent_topics: string[] | null
          is_active: boolean | null
          session_context: Json | null
          session_end: string | null
          session_start: string | null
          total_messages: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          intent_topics?: string[] | null
          is_active?: boolean | null
          session_context?: Json | null
          session_end?: string | null
          session_start?: string | null
          total_messages?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          intent_topics?: string[] | null
          is_active?: boolean | null
          session_context?: Json | null
          session_end?: string | null
          session_start?: string | null
          total_messages?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pam_conversation_threads: {
        Row: {
          collected_data: Json | null
          created_at: string | null
          expected_completion: string | null
          id: string
          last_activity: string | null
          missing_data: string[] | null
          next_question: string | null
          progress_percentage: number | null
          session_id: string | null
          started_at: string | null
          thread_status: string | null
          thread_type: string
          user_id: string
        }
        Insert: {
          collected_data?: Json | null
          created_at?: string | null
          expected_completion?: string | null
          id?: string
          last_activity?: string | null
          missing_data?: string[] | null
          next_question?: string | null
          progress_percentage?: number | null
          session_id?: string | null
          started_at?: string | null
          thread_status?: string | null
          thread_type: string
          user_id: string
        }
        Update: {
          collected_data?: Json | null
          created_at?: string | null
          expected_completion?: string | null
          id?: string
          last_activity?: string | null
          missing_data?: string[] | null
          next_question?: string | null
          progress_percentage?: number | null
          session_id?: string | null
          started_at?: string | null
          thread_status?: string | null
          thread_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pam_conversation_threads_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pam_conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pam_conversations: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_activity: string | null
          message_count: number | null
          session_id: string
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          message_count?: number | null
          session_id: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          message_count?: number | null
          session_id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
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
      pam_intent_context: {
        Row: {
          confidence_boost: number | null
          context_triggers: Json
          created_at: string | null
          examples: Json | null
          id: string
          intent_name: string
          node_assignment: string
          required_data: string[] | null
        }
        Insert: {
          confidence_boost?: number | null
          context_triggers: Json
          created_at?: string | null
          examples?: Json | null
          id?: string
          intent_name: string
          node_assignment: string
          required_data?: string[] | null
        }
        Update: {
          confidence_boost?: number | null
          context_triggers?: Json
          created_at?: string | null
          examples?: Json | null
          id?: string
          intent_name?: string
          node_assignment?: string
          required_data?: string[] | null
        }
        Relationships: []
      }
      pam_learning_events: {
        Row: {
          confidence_impact: number | null
          context_data: Json | null
          corrected_response: string | null
          created_at: string | null
          event_type: string
          id: string
          original_response: string | null
          related_intent: string | null
          session_id: string | null
          user_id: string
          user_preference_change: Json | null
        }
        Insert: {
          confidence_impact?: number | null
          context_data?: Json | null
          corrected_response?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          original_response?: string | null
          related_intent?: string | null
          session_id?: string | null
          user_id: string
          user_preference_change?: Json | null
        }
        Update: {
          confidence_impact?: number | null
          context_data?: Json | null
          corrected_response?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          original_response?: string | null
          related_intent?: string | null
          session_id?: string | null
          user_id?: string
          user_preference_change?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pam_learning_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "pam_conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
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
          user_id: string | null
          workflow_name: string | null
        }
        Insert: {
          context?: Json | null
          id?: number
          log_level?: string | null
          message?: string | null
          timestamp?: string | null
          trace_id?: string | null
          user_id?: string | null
          workflow_name?: string | null
        }
        Update: {
          context?: Json | null
          id?: number
          log_level?: string | null
          message?: string | null
          timestamp?: string | null
          trace_id?: string | null
          user_id?: string | null
          workflow_name?: string | null
        }
        Relationships: []
      }
      pam_memory: {
        Row: {
          content: string
          context: Json | null
          created_at: string | null
          error: Json | null
          error_details: Json | null
          error_summary: Json | null
          id: string
          intent: string | null
          intent_confidence: string | null
          is_fallback: boolean | null
          message: string | null
          metadata: Json | null
          original_message: string | null
          request_metadata: Json | null
          response: string | null
          response_quality: string | null
          response_source: string | null
          session_id: string | null
          subflow_response: string | null
          timestamp: string | null
          trace_id: string | null
          user_id: string
          validation_passed: boolean | null
          voice_enabled: boolean | null
        }
        Insert: {
          content: string
          context?: Json | null
          created_at?: string | null
          error?: Json | null
          error_details?: Json | null
          error_summary?: Json | null
          id?: string
          intent?: string | null
          intent_confidence?: string | null
          is_fallback?: boolean | null
          message?: string | null
          metadata?: Json | null
          original_message?: string | null
          request_metadata?: Json | null
          response?: string | null
          response_quality?: string | null
          response_source?: string | null
          session_id?: string | null
          subflow_response?: string | null
          timestamp?: string | null
          trace_id?: string | null
          user_id: string
          validation_passed?: boolean | null
          voice_enabled?: boolean | null
        }
        Update: {
          content?: string
          context?: Json | null
          created_at?: string | null
          error?: Json | null
          error_details?: Json | null
          error_summary?: Json | null
          id?: string
          intent?: string | null
          intent_confidence?: string | null
          is_fallback?: boolean | null
          message?: string | null
          metadata?: Json | null
          original_message?: string | null
          request_metadata?: Json | null
          response?: string | null
          response_quality?: string | null
          response_source?: string | null
          session_id?: string | null
          subflow_response?: string | null
          timestamp?: string | null
          trace_id?: string | null
          user_id?: string
          validation_passed?: boolean | null
          voice_enabled?: boolean | null
        }
        Relationships: []
      }
      pam_messages: {
        Row: {
          confidence: number | null
          content: string
          conversation_id: string | null
          created_at: string | null
          entities: Json | null
          id: string
          intent: string | null
          metadata: Json | null
          role: string
        }
        Insert: {
          confidence?: number | null
          content: string
          conversation_id?: string | null
          created_at?: string | null
          entities?: Json | null
          id?: string
          intent?: string | null
          metadata?: Json | null
          role: string
        }
        Update: {
          confidence?: number | null
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          entities?: Json | null
          id?: string
          intent?: string | null
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "pam_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "pam_conversations"
            referencedColumns: ["id"]
          },
        ]
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
      pam_recommendations: {
        Row: {
          category: string
          created_at: string | null
          description: string
          expires_at: string | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          priority_level: string | null
          recommendation_id: string
          savings_amount: number | null
          source_data_id: string | null
          time_sensitive: boolean | null
          title: string
          user_acted: boolean | null
          user_id: string
          user_rating: number | null
          user_viewed: boolean | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          expires_at?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          priority_level?: string | null
          recommendation_id: string
          savings_amount?: number | null
          source_data_id?: string | null
          time_sensitive?: boolean | null
          title: string
          user_acted?: boolean | null
          user_id: string
          user_rating?: number | null
          user_viewed?: boolean | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          expires_at?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          priority_level?: string | null
          recommendation_id?: string
          savings_amount?: number | null
          source_data_id?: string | null
          time_sensitive?: boolean | null
          title?: string
          user_acted?: boolean | null
          user_id?: string
          user_rating?: number | null
          user_viewed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pam_recommendations_source_data_id_fkey"
            columns: ["source_data_id"]
            isOneToOne: false
            referencedRelation: "travel_intelligence_raw"
            referencedColumns: ["id"]
          },
        ]
      }
      pam_user_context: {
        Row: {
          active_trip_id: string | null
          conversation_mood: string | null
          current_location: Json | null
          current_session_id: string | null
          interaction_patterns: Json | null
          last_interaction: string | null
          learned_preferences: Json | null
          preferred_response_style: string | null
          recent_intents: string[] | null
          travel_preferences: Json | null
          updated_at: string | null
          user_id: string
          vehicle_info: Json | null
        }
        Insert: {
          active_trip_id?: string | null
          conversation_mood?: string | null
          current_location?: Json | null
          current_session_id?: string | null
          interaction_patterns?: Json | null
          last_interaction?: string | null
          learned_preferences?: Json | null
          preferred_response_style?: string | null
          recent_intents?: string[] | null
          travel_preferences?: Json | null
          updated_at?: string | null
          user_id: string
          vehicle_info?: Json | null
        }
        Update: {
          active_trip_id?: string | null
          conversation_mood?: string | null
          current_location?: Json | null
          current_session_id?: string | null
          interaction_patterns?: Json | null
          last_interaction?: string | null
          learned_preferences?: Json | null
          preferred_response_style?: string | null
          recent_intents?: string[] | null
          travel_preferences?: Json | null
          updated_at?: string | null
          user_id?: string
          vehicle_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pam_user_context_current_session_id_fkey"
            columns: ["current_session_id"]
            isOneToOne: false
            referencedRelation: "pam_conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string | null
          id: string
          poll_id: string | null
          selected_options: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          poll_id?: string | null
          selected_options: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          poll_id?: string | null
          selected_options?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "group_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      popular_routes: {
        Row: {
          best_travel_months: Json | null
          created_at: string | null
          distance_miles: number | null
          end_location: Json | null
          estimated_travel_time_hours: number | null
          fuel_stop_frequency: number | null
          id: string
          route_difficulty: string | null
          route_name: string | null
          route_points: Json | null
          rv_friendly_rating: number | null
          scenic_rating: number | null
          start_location: Json | null
          updated_at: string | null
        }
        Insert: {
          best_travel_months?: Json | null
          created_at?: string | null
          distance_miles?: number | null
          end_location?: Json | null
          estimated_travel_time_hours?: number | null
          fuel_stop_frequency?: number | null
          id?: string
          route_difficulty?: string | null
          route_name?: string | null
          route_points?: Json | null
          rv_friendly_rating?: number | null
          scenic_rating?: number | null
          start_location?: Json | null
          updated_at?: string | null
        }
        Update: {
          best_travel_months?: Json | null
          created_at?: string | null
          distance_miles?: number | null
          end_location?: Json | null
          estimated_travel_time_hours?: number | null
          fuel_stop_frequency?: number | null
          id?: string
          route_difficulty?: string | null
          route_name?: string | null
          route_points?: Json | null
          rv_friendly_rating?: number | null
          scenic_rating?: number | null
          start_location?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
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
      predictive_models: {
        Row: {
          accuracy_score: number | null
          created_at: string | null
          id: string
          last_trained: string | null
          model_name: string
          model_parameters: Json | null
          model_type: string
          owner_id: string | null
          prediction_targets: Json | null
          status: string | null
          training_data_period: unknown | null
        }
        Insert: {
          accuracy_score?: number | null
          created_at?: string | null
          id?: string
          last_trained?: string | null
          model_name: string
          model_parameters?: Json | null
          model_type: string
          owner_id?: string | null
          prediction_targets?: Json | null
          status?: string | null
          training_data_period?: unknown | null
        }
        Update: {
          accuracy_score?: number | null
          created_at?: string | null
          id?: string
          last_trained?: string | null
          model_name?: string
          model_parameters?: Json | null
          model_type?: string
          owner_id?: string | null
          prediction_targets?: Json | null
          status?: string | null
          training_data_period?: unknown | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accessibility: string | null
          accessibility_needs: string[] | null
          budget_range: string | null
          camp_types: string | null
          cancellation_token: string | null
          created_at: string | null
          current_latitude: number | null
          current_longitude: number | null
          destination_latitude: number | null
          destination_longitude: number | null
          email: string | null
          emergency_contact: Json | null
          fuel_type: string | null
          full_name: string | null
          id: number
          last_active: string | null
          max_driving: string | null
          medical_info: Json | null
          nickname: string | null
          partner_email: string | null
          partner_name: string | null
          partner_profile_image_url: string | null
          pets: string | null
          preferences: Json | null
          profile_image_url: string | null
          region: string | null
          role: string | null
          second_vehicle: string | null
          status: string | null
          subscription_cancelled: boolean | null
          towing: string | null
          travel_radius_miles: number | null
          travel_style: string | null
          trial_end_date: string | null
          trial_notification_sent: boolean | null
          updated_at: string | null
          user_id: string
          vehicle_make_model: string | null
          vehicle_type: string | null
        }
        Insert: {
          accessibility?: string | null
          accessibility_needs?: string[] | null
          budget_range?: string | null
          camp_types?: string | null
          cancellation_token?: string | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          destination_latitude?: number | null
          destination_longitude?: number | null
          email?: string | null
          emergency_contact?: Json | null
          fuel_type?: string | null
          full_name?: string | null
          id?: never
          last_active?: string | null
          max_driving?: string | null
          medical_info?: Json | null
          nickname?: string | null
          partner_email?: string | null
          partner_name?: string | null
          partner_profile_image_url?: string | null
          pets?: string | null
          preferences?: Json | null
          profile_image_url?: string | null
          region?: string | null
          role?: string | null
          second_vehicle?: string | null
          status?: string | null
          subscription_cancelled?: boolean | null
          towing?: string | null
          travel_radius_miles?: number | null
          travel_style?: string | null
          trial_end_date?: string | null
          trial_notification_sent?: boolean | null
          updated_at?: string | null
          user_id: string
          vehicle_make_model?: string | null
          vehicle_type?: string | null
        }
        Update: {
          accessibility?: string | null
          accessibility_needs?: string[] | null
          budget_range?: string | null
          camp_types?: string | null
          cancellation_token?: string | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          destination_latitude?: number | null
          destination_longitude?: number | null
          email?: string | null
          emergency_contact?: Json | null
          fuel_type?: string | null
          full_name?: string | null
          id?: never
          last_active?: string | null
          max_driving?: string | null
          medical_info?: Json | null
          nickname?: string | null
          partner_email?: string | null
          partner_name?: string | null
          partner_profile_image_url?: string | null
          pets?: string | null
          preferences?: Json | null
          profile_image_url?: string | null
          region?: string | null
          role?: string | null
          second_vehicle?: string | null
          status?: string | null
          subscription_cancelled?: boolean | null
          towing?: string | null
          travel_radius_miles?: number | null
          travel_style?: string | null
          trial_end_date?: string | null
          trial_notification_sent?: boolean | null
          updated_at?: string | null
          user_id?: string
          vehicle_make_model?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      rate_limit_log: {
        Row: {
          id: number
          timestamp: string | null
          user_id: string
        }
        Insert: {
          id?: number
          timestamp?: string | null
          user_id: string
        }
        Update: {
          id?: number
          timestamp?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recommendation_interactions: {
        Row: {
          created_at: string | null
          id: string
          interaction_data: Json | null
          interaction_type: string
          recommendation_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_data?: Json | null
          interaction_type: string
          recommendation_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_data?: Json | null
          interaction_type?: string
          recommendation_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_interactions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "active_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_interactions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "pam_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      rl_learning_events: {
        Row: {
          action_taken: string | null
          context_state: Json | null
          conversation_id: string | null
          created_at: string | null
          event_type: string
          id: string
          is_processed: boolean | null
          learning_weight: number | null
          processed_at: string | null
          reward_reason: string | null
          reward_score: number | null
          user_response: string | null
        }
        Insert: {
          action_taken?: string | null
          context_state?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          is_processed?: boolean | null
          learning_weight?: number | null
          processed_at?: string | null
          reward_reason?: string | null
          reward_score?: number | null
          user_response?: string | null
        }
        Update: {
          action_taken?: string | null
          context_state?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          is_processed?: boolean | null
          learning_weight?: number | null
          processed_at?: string | null
          reward_reason?: string | null
          reward_score?: number | null
          user_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rl_learning_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_training_conversations"
            referencedColumns: ["id"]
          },
        ]
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
      rv_knowledge_base: {
        Row: {
          category: string
          confidence_score: number | null
          content: string
          created_at: string | null
          created_by: string | null
          difficulty_level: string | null
          effectiveness_score: number | null
          id: string
          source_type: string | null
          subcategory: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          usage_count: number | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          category: string
          confidence_score?: number | null
          content: string
          created_at?: string | null
          created_by?: string | null
          difficulty_level?: string | null
          effectiveness_score?: number | null
          id?: string
          source_type?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          category?: string
          confidence_score?: number | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          difficulty_level?: string | null
          effectiveness_score?: number | null
          id?: string
          source_type?: string | null
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      rv_services: {
        Row: {
          accepts_walkins: boolean | null
          address: string
          appointment_required: boolean | null
          business_name: string
          created_at: string | null
          email: string | null
          emergency_service: boolean | null
          id: string
          latitude: number
          longitude: number
          operating_hours: Json | null
          phone_number: string | null
          pricing_info: Json | null
          rv_experience_level: string | null
          service_type: string | null
          services_offered: Json | null
          updated_at: string | null
          user_ratings: number | null
          website: string | null
        }
        Insert: {
          accepts_walkins?: boolean | null
          address: string
          appointment_required?: boolean | null
          business_name: string
          created_at?: string | null
          email?: string | null
          emergency_service?: boolean | null
          id?: string
          latitude: number
          longitude: number
          operating_hours?: Json | null
          phone_number?: string | null
          pricing_info?: Json | null
          rv_experience_level?: string | null
          service_type?: string | null
          services_offered?: Json | null
          updated_at?: string | null
          user_ratings?: number | null
          website?: string | null
        }
        Update: {
          accepts_walkins?: boolean | null
          address?: string
          appointment_required?: boolean | null
          business_name?: string
          created_at?: string | null
          email?: string | null
          emergency_service?: boolean | null
          id?: string
          latitude?: number
          longitude?: number
          operating_hours?: Json | null
          phone_number?: string | null
          pricing_info?: Json | null
          rv_experience_level?: string | null
          service_type?: string | null
          services_offered?: Json | null
          updated_at?: string | null
          user_ratings?: number | null
          website?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ip_address: unknown | null
          location: Json | null
          metadata: Json | null
          resolved: boolean | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          location?: Json | null
          metadata?: Json | null
          resolved?: boolean | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          location?: Json | null
          metadata?: Json | null
          resolved?: boolean | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
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
      shop_orders: {
        Row: {
          created_at: string | null
          id: string
          order_items: Json | null
          payment_status: string | null
          shipping_address: Json | null
          status: string | null
          total_amount: number | null
          tracking_number: string | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_items?: Json | null
          payment_status?: string | null
          shipping_address?: Json | null
          status?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_items?: Json | null
          payment_status?: string | null
          shipping_address?: Json | null
          status?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shop_products: {
        Row: {
          available_regions: string[] | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          external_url: string | null
          id: string
          image_url: string | null
          images: Json | null
          inventory_count: number | null
          name: string
          price: number | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          available_regions?: string[] | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          inventory_count?: number | null
          name: string
          price?: number | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          available_regions?: string[] | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          inventory_count?: number | null
          name?: string
          price?: number | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
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
          is_active: boolean | null
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          is_active?: boolean | null
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          is_active?: boolean | null
          joined_at?: string | null
          role?: string | null
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
          activity_level: string | null
          admin_id: string | null
          avatar_url: string | null
          cover: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          location: string | null
          member_count: number | null
          name: string
          owner_id: string | null
          privacy: string | null
          updated_at: string | null
        }
        Insert: {
          activity_level?: string | null
          admin_id?: string | null
          avatar_url?: string | null
          cover?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          member_count?: number | null
          name: string
          owner_id?: string | null
          privacy?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_level?: string | null
          admin_id?: string | null
          avatar_url?: string | null
          cover?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          member_count?: number | null
          name?: string
          owner_id?: string | null
          privacy?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      social_interactions: {
        Row: {
          content_id: string | null
          content_type: string | null
          created_at: string | null
          id: string
          interaction_type: string | null
          metadata: Json | null
          target_user_id: string | null
          user_id: string | null
        }
        Insert: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string | null
          id?: string
          interaction_type?: string | null
          metadata?: Json | null
          target_user_id?: string | null
          user_id?: string | null
        }
        Update: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string | null
          id?: string
          interaction_type?: string | null
          metadata?: Json | null
          target_user_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          comment_count: number | null
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
          comment_count?: number | null
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
          comment_count?: number | null
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
      social_venues: {
        Row: {
          address: string
          created_at: string | null
          has_wifi: boolean | null
          id: string
          latitude: number
          longitude: number
          noise_level: string | null
          operating_hours: Json | null
          price_range: string | null
          rv_parking_available: boolean | null
          social_atmosphere_rating: number | null
          special_offers: Json | null
          updated_at: string | null
          user_ratings: number | null
          venue_name: string
          venue_type: string | null
          wifi_quality: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          has_wifi?: boolean | null
          id?: string
          latitude: number
          longitude: number
          noise_level?: string | null
          operating_hours?: Json | null
          price_range?: string | null
          rv_parking_available?: boolean | null
          social_atmosphere_rating?: number | null
          special_offers?: Json | null
          updated_at?: string | null
          user_ratings?: number | null
          venue_name: string
          venue_type?: string | null
          wifi_quality?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          has_wifi?: boolean | null
          id?: string
          latitude?: number
          longitude?: number
          noise_level?: string | null
          operating_hours?: Json | null
          price_range?: string | null
          rv_parking_available?: boolean | null
          social_atmosphere_rating?: number | null
          special_offers?: Json | null
          updated_at?: string | null
          user_ratings?: number | null
          venue_name?: string
          venue_type?: string | null
          wifi_quality?: string | null
        }
        Relationships: []
      }
      storage_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      storage_items: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          location_id: string | null
          name: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          name: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          name?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "storage_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_locations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string | null
          id: string
          message: string
          status: string | null
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          status?: string | null
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          status?: string | null
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      travel_intelligence_raw: {
        Row: {
          ai_processed: boolean | null
          created_at: string | null
          data_freshness: string | null
          event_data: Json | null
          gas_price_data: Json | null
          google_maps_data: Json | null
          id: string
          latitude: number
          longitude: number
          radius_miles: number | null
          scraped_at: string | null
          search_type: string
          user_id: string
          weather_forecast: Json | null
          weather_summary: string | null
        }
        Insert: {
          ai_processed?: boolean | null
          created_at?: string | null
          data_freshness?: string | null
          event_data?: Json | null
          gas_price_data?: Json | null
          google_maps_data?: Json | null
          id?: string
          latitude: number
          longitude: number
          radius_miles?: number | null
          scraped_at?: string | null
          search_type: string
          user_id: string
          weather_forecast?: Json | null
          weather_summary?: string | null
        }
        Update: {
          ai_processed?: boolean | null
          created_at?: string | null
          data_freshness?: string | null
          event_data?: Json | null
          gas_price_data?: Json | null
          google_maps_data?: Json | null
          id?: string
          latitude?: number
          longitude?: number
          radius_miles?: number | null
          scraped_at?: string | null
          search_type?: string
          user_id?: string
          weather_forecast?: Json | null
          weather_summary?: string | null
        }
        Relationships: []
      }
      trial_notifications: {
        Row: {
          cancellation_token: string | null
          created_at: string | null
          id: number
          notification_sent: boolean | null
          subscription_cancelled: boolean | null
          trial_end_date: string
          updated_at: string | null
          user_id: number
        }
        Insert: {
          cancellation_token?: string | null
          created_at?: string | null
          id?: number
          notification_sent?: boolean | null
          subscription_cancelled?: boolean | null
          trial_end_date: string
          updated_at?: string | null
          user_id: number
        }
        Update: {
          cancellation_token?: string | null
          created_at?: string | null
          id?: number
          notification_sent?: boolean | null
          subscription_cancelled?: boolean | null
          trial_end_date?: string
          updated_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "trial_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          tags: string[] | null
          template_data: Json
          updated_at: string
          usage_count: number
          user_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          tags?: string[] | null
          template_data?: Json
          updated_at?: string
          usage_count?: number
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          tags?: string[] | null
          template_data?: Json
          updated_at?: string
          usage_count?: number
          user_id?: string | null
        }
        Relationships: []
      }
      trips: {
        Row: {
          best_time: string | null
          category: string | null
          country: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          distance: string | null
          duration: string | null
          end_location: string | null
          highlights: string[] | null
          id: string
          name: string
          route_type: string | null
          source: string | null
          start_location: string | null
          updated_at: string | null
          vehicle_requirements: string | null
        }
        Insert: {
          best_time?: string | null
          category?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          distance?: string | null
          duration?: string | null
          end_location?: string | null
          highlights?: string[] | null
          id?: string
          name: string
          route_type?: string | null
          source?: string | null
          start_location?: string | null
          updated_at?: string | null
          vehicle_requirements?: string | null
        }
        Update: {
          best_time?: string | null
          category?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          distance?: string | null
          duration?: string | null
          end_location?: string | null
          highlights?: string[] | null
          id?: string
          name?: string
          route_type?: string | null
          source?: string | null
          start_location?: string | null
          updated_at?: string | null
          vehicle_requirements?: string | null
        }
        Relationships: []
      }
      trust_scores: {
        Row: {
          factors: Json | null
          last_calculated: string | null
          score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          factors?: Json | null
          last_calculated?: string | null
          score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          factors?: Json | null
          last_calculated?: string | null
          score?: number | null
          updated_at?: string | null
          user_id?: string
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
      user_active_sessions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          expires_at: string | null
          id: string
          ip_address: unknown | null
          is_current: boolean | null
          last_activity: string | null
          location_info: Json | null
          session_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown | null
          is_current?: boolean | null
          last_activity?: string | null
          location_info?: Json | null
          session_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown | null
          is_current?: boolean | null
          last_activity?: string | null
          location_info?: Json | null
          session_id?: string
          user_agent?: string | null
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
      user_follows: {
        Row: {
          created_at: string | null
          follower_id: string | null
          following_id: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string
        }
        Relationships: []
      }
      user_friends: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          friend_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          friend_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_friendships: {
        Row: {
          addressee_id: string | null
          created_at: string | null
          id: string
          requester_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          addressee_id?: string | null
          created_at?: string | null
          id?: string
          requester_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          addressee_id?: string | null
          created_at?: string | null
          id?: string
          requester_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_hustle_attempts: {
        Row: {
          created_at: string
          earnings: number | null
          hours_spent: number | null
          hustle_id: string
          id: string
          notes: string | null
          start_date: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          earnings?: number | null
          hours_spent?: number | null
          hustle_id: string
          id?: string
          notes?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          earnings?: number | null
          hours_spent?: number | null
          hustle_id?: string
          id?: string
          notes?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_hustle_attempts_hustle_id_fkey"
            columns: ["hustle_id"]
            isOneToOne: false
            referencedRelation: "youtube_hustles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interactions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          element_clicked: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          page_path: string | null
          session_id: string | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          element_clicked?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          element_clicked?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_knowledge_buckets: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_knowledge_chunks: {
        Row: {
          chunk_index: number
          chunk_metadata: Json | null
          content: string
          created_at: string | null
          document_id: string
          embedding: string | null
          id: string
          token_count: number | null
          user_id: string
        }
        Insert: {
          chunk_index: number
          chunk_metadata?: Json | null
          content: string
          created_at?: string | null
          document_id: string
          embedding?: string | null
          id?: string
          token_count?: number | null
          user_id: string
        }
        Update: {
          chunk_index?: number
          chunk_metadata?: Json | null
          content?: string
          created_at?: string | null
          document_id?: string
          embedding?: string | null
          id?: string
          token_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "user_knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_knowledge_documents: {
        Row: {
          bucket_id: string
          content_type: string | null
          created_at: string | null
          extracted_text: string | null
          file_path: string
          file_size: number | null
          filename: string
          id: string
          metadata: Json | null
          processing_status: string | null
          user_id: string
        }
        Insert: {
          bucket_id: string
          content_type?: string | null
          created_at?: string | null
          extracted_text?: string | null
          file_path: string
          file_size?: number | null
          filename: string
          id?: string
          metadata?: Json | null
          processing_status?: string | null
          user_id: string
        }
        Update: {
          bucket_id?: string
          content_type?: string | null
          created_at?: string | null
          extracted_text?: string | null
          file_path?: string
          file_size?: number | null
          filename?: string
          id?: string
          metadata?: Json | null
          processing_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_knowledge_documents_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "user_knowledge_buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          created_at: string | null
          current_latitude: number
          current_longitude: number
          destination_latitude: number | null
          destination_longitude: number | null
          id: number
          preferences: Json | null
          status: string | null
          travel_radius_miles: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_latitude: number
          current_longitude: number
          destination_latitude?: number | null
          destination_longitude?: number | null
          id?: number
          preferences?: Json | null
          status?: string | null
          travel_radius_miles?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_latitude?: number
          current_longitude?: number
          destination_latitude?: number | null
          destination_longitude?: number | null
          id?: number
          preferences?: Json | null
          status?: string | null
          travel_radius_miles?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_login_history: {
        Row: {
          device_info: Json | null
          id: string
          ip_address: unknown | null
          location_info: Json | null
          login_method: string | null
          login_time: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          device_info?: Json | null
          id?: string
          ip_address?: unknown | null
          location_info?: Json | null
          login_method?: string | null
          login_time?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          device_info?: Json | null
          id?: string
          ip_address?: unknown | null
          location_info?: Json | null
          login_method?: string | null
          login_time?: string | null
          success?: boolean | null
          user_agent?: string | null
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
        ]
      }
      user_profiles_extended: {
        Row: {
          bio: string | null
          created_at: string | null
          experience_level: string | null
          interests: string[] | null
          privacy_settings: Json | null
          rig_type: string | null
          social_preferences: Json | null
          travel_style: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          experience_level?: string | null
          interests?: string[] | null
          privacy_settings?: Json | null
          rig_type?: string | null
          social_preferences?: Json | null
          travel_style?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          experience_level?: string | null
          interests?: string[] | null
          privacy_settings?: Json | null
          rig_type?: string | null
          social_preferences?: Json | null
          travel_style?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_savings_tracking: {
        Row: {
          actual_savings: number | null
          created_at: string | null
          estimated_savings: number | null
          id: string
          notes: string | null
          recommendation_id: string | null
          saved_on_date: string | null
          savings_category: string | null
          user_id: string
          user_reported: boolean | null
          verification_method: string | null
        }
        Insert: {
          actual_savings?: number | null
          created_at?: string | null
          estimated_savings?: number | null
          id?: string
          notes?: string | null
          recommendation_id?: string | null
          saved_on_date?: string | null
          savings_category?: string | null
          user_id: string
          user_reported?: boolean | null
          verification_method?: string | null
        }
        Update: {
          actual_savings?: number | null
          created_at?: string | null
          estimated_savings?: number | null
          id?: string
          notes?: string | null
          recommendation_id?: string | null
          saved_on_date?: string | null
          savings_category?: string | null
          user_id?: string
          user_reported?: boolean | null
          verification_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_savings_tracking_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "active_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_savings_tracking_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "pam_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token_hash: string
          user_data: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token_hash: string
          user_data: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token_hash?: string
          user_data?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string | null
          display_preferences: Json | null
          id: string
          notification_preferences: Json | null
          pam_preferences: Json | null
          privacy_preferences: Json | null
          regional_preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_preferences?: Json | null
          id?: string
          notification_preferences?: Json | null
          pam_preferences?: Json | null
          privacy_preferences?: Json | null
          regional_preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_preferences?: Json | null
          id?: string
          notification_preferences?: Json | null
          pam_preferences?: Json | null
          privacy_preferences?: Json | null
          regional_preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_shopping_behavior: {
        Row: {
          category_browsing: Json | null
          click_through_rates: Json | null
          conversion_metrics: Json | null
          created_at: string | null
          id: string
          price_preferences: Json | null
          product_views: Json | null
          purchase_patterns: Json | null
          seasonal_preferences: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category_browsing?: Json | null
          click_through_rates?: Json | null
          conversion_metrics?: Json | null
          created_at?: string | null
          id?: string
          price_preferences?: Json | null
          product_views?: Json | null
          purchase_patterns?: Json | null
          seasonal_preferences?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category_browsing?: Json | null
          click_through_rates?: Json | null
          conversion_metrics?: Json | null
          created_at?: string | null
          id?: string
          price_preferences?: Json | null
          product_views?: Json | null
          purchase_patterns?: Json | null
          seasonal_preferences?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_social_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          friends_can_see_route: boolean | null
          id: string
          location_sharing_enabled: boolean | null
          rv_info: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          friends_can_see_route?: boolean | null
          id?: string
          location_sharing_enabled?: boolean | null
          rv_info?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          friends_can_see_route?: boolean | null
          id?: string
          location_sharing_enabled?: boolean | null
          rv_info?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          id: number
          plan_type: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          trial_ends_at: string
          updated_at: string | null
          user_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          plan_type?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          trial_ends_at: string
          updated_at?: string | null
          user_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          plan_type?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          trial_ends_at?: string
          updated_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_travel_preferences: {
        Row: {
          accessibility_needs: Json | null
          budget_range: Json | null
          created_at: string | null
          dietary_restrictions: Json | null
          id: string
          notification_preferences: Json | null
          preferred_activities: Json | null
          rv_specifications: Json | null
          social_preference: string | null
          travel_style: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accessibility_needs?: Json | null
          budget_range?: Json | null
          created_at?: string | null
          dietary_restrictions?: Json | null
          id?: string
          notification_preferences?: Json | null
          preferred_activities?: Json | null
          rv_specifications?: Json | null
          social_preference?: string | null
          travel_style?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accessibility_needs?: Json | null
          budget_range?: Json | null
          created_at?: string | null
          dietary_restrictions?: Json | null
          id?: string
          notification_preferences?: Json | null
          preferred_activities?: Json | null
          rv_specifications?: Json | null
          social_preference?: string | null
          travel_style?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_two_factor_auth: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          enabled: boolean | null
          id: string
          secret_key: string
          updated_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          secret_key: string
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          secret_key?: string
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: number
          name: string | null
          password_hash: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: number
          name?: string | null
          password_hash: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: number
          name?: string | null
          password_hash?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      youtube_hustles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          initial_results: Json | null
          test_date: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          initial_results?: Json | null
          test_date?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          initial_results?: Json | null
          test_date?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      active_recommendations: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string | null
          is_expired: boolean | null
          latitude: number | null
          location: string | null
          longitude: number | null
          priority_level: string | null
          recommendation_id: string | null
          savings_amount: number | null
          source_data_id: string | null
          time_sensitive: boolean | null
          title: string | null
          user_acted: boolean | null
          user_id: string | null
          user_rating: number | null
          user_viewed: boolean | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string | null
          is_expired?: never
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          priority_level?: string | null
          recommendation_id?: string | null
          savings_amount?: number | null
          source_data_id?: string | null
          time_sensitive?: boolean | null
          title?: string | null
          user_acted?: boolean | null
          user_id?: string | null
          user_rating?: number | null
          user_viewed?: boolean | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string | null
          is_expired?: never
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          priority_level?: string | null
          recommendation_id?: string | null
          savings_amount?: number | null
          source_data_id?: string | null
          time_sensitive?: boolean | null
          title?: string | null
          user_acted?: boolean | null
          user_id?: string | null
          user_rating?: number | null
          user_viewed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pam_recommendations_source_data_id_fkey"
            columns: ["source_data_id"]
            isOneToOne: false
            referencedRelation: "travel_intelligence_raw"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_summary: {
        Row: {
          budget_id: string | null
          name: string | null
          total_budget: number | null
          total_remaining: number | null
          total_spent: number | null
          user_id: string | null
        }
        Relationships: []
      }
      location_venue_density: {
        Row: {
          avg_rating: number | null
          coffee_shops: number | null
          latitude: number | null
          longitude: number | null
          restaurants: number | null
          rv_friendly_venues: number | null
          total_venues: number | null
          wifi_venues: number | null
        }
        Relationships: []
      }
      user_savings_summary: {
        Row: {
          avg_savings_per_action: number | null
          last_savings_date: string | null
          total_actual_savings: number | null
          total_estimated_savings: number | null
          total_recommendations_acted_on: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_shop_products: {
        Row: {
          available_regions: string[] | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          external_url: string | null
          id: string | null
          image_url: string | null
          images: Json | null
          inventory_count: number | null
          name: string | null
          price: number | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          available_regions?: string[] | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          external_url?: string | null
          id?: string | null
          image_url?: string | null
          images?: Json | null
          inventory_count?: number | null
          name?: string | null
          price?: number | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          available_regions?: string[] | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          external_url?: string | null
          id?: string | null
          image_url?: string | null
          images?: Json | null
          inventory_count?: number | null
          name?: string | null
          price?: number | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_get_flagged_content: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          content_type: string
          content_id: string
          content_text: string
          author_email: string
          flagged_reason: string
          status: string
          moderator_notes: string
          created_at: string
          updated_at: string
          author_id: string
          flagged_by: string
          moderator_id: string
        }[]
      }
      admin_get_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          user_id: string
          email: string
          role: string
          status: string
          created_at: string
          updated_at: string
          region: string
          last_login: string
          permissions: Json
        }[]
      }
      auto_moderate_content: {
        Args: { content_type: string; content_id: string; content_text: string }
        Returns: boolean
      }
      calculate_model_performance_score: {
        Args: { model_version_param: string }
        Returns: number
      }
      calculate_trust_score: {
        Args: { user_id: string }
        Returns: number
      }
      check_failed_login_attempts: {
        Args: { p_email: string; p_ip_address: unknown }
        Returns: number
      }
      check_rate_limit: {
        Args:
          | Record<PropertyKey, never>
          | { user_id: string; window_start: string; limit_count: number }
        Returns: Json
      }
      check_user_admin_status: {
        Args: Record<PropertyKey, never> | { check_user_id: string }
        Returns: boolean
      }
      check_user_is_admin: {
        Args: Record<PropertyKey, never> | { check_user_id: string }
        Returns: boolean
      }
      cleanup_expired_audio_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_audit_log: {
        Args: {
          p_user_id: string
          p_action: string
          p_resource_type: string
          p_resource_id: string
          p_old_values?: Json
          p_new_values?: Json
        }
        Returns: string
      }
      debug_auth_state: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_user_id: string
          session_user_name: string
          user_role: string
        }[]
      }
      generate_training_dataset: {
        Args: {
          dataset_name_param: string
          domain_focus_param?: string
          quality_threshold_param?: number
        }
        Returns: string
      }
      get_conversation_history: {
        Args:
          | Record<PropertyKey, never>
          | { p_user_id: string; p_limit?: number }
          | { user_id: string }
        Returns: string[]
      }
      get_nearby_recommendations: {
        Args: {
          user_lat: number
          user_lng: number
          radius_miles?: number
          limit_count?: number
        }
        Returns: {
          id: string
          title: string
          description: string
          category: string
          savings_amount: number
          distance_miles: number
          priority_level: string
        }[]
      }
      get_or_create_pam_conversation: {
        Args:
          | Record<PropertyKey, never>
          | { p_user_id: string; p_assistant_id: string }
          | { p_user_id: string; p_session_id: string; p_context?: Json }
          | { param1: string; param2: number }
          | { user_id: string }
        Returns: {
          id: string
          created_at: string
          updated_at: string
        }[]
      }
      get_user_id_from_auth: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_user_preferences: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      increment_template_usage: {
        Args: { template_id: string }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          p_user_id: string
          p_event_type: string
          p_severity: string
          p_metadata?: Json
        }
        Returns: string
      }
      process_rl_events: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      search_knowledge_chunks: {
        Args: {
          user_id: string
          query_embedding: string
          match_count?: number
          similarity_threshold?: number
        }
        Returns: {
          chunk_id: string
          content: string
          document_name: string
          similarity: number
          chunk_metadata: Json
        }[]
      }
      seed_default_drawers: {
        Args: Record<PropertyKey, never> | { user_id: string }
        Returns: undefined
      }
      start_transition_profile: {
        Args: { p_departure_date?: string | null; p_is_enabled?: boolean | null }
        Returns: {
          id: string
          user_id: string
          departure_date: string
          current_phase: string
          transition_type: string
          motivation: string | null
          concerns: Json
          is_enabled: boolean
          auto_hide_after_departure: boolean
          hide_days_after_departure: number
          completion_percentage: number
          last_milestone_reached: string | null
          created_at: string
          updated_at: string
          archived_at: string | null
        }
      }
      store_pam_message: {
        Args:
          | Record<PropertyKey, never>
          | {
              p_conversation_id: string
              p_role: string
              p_content: string
              p_intent?: string
              p_confidence?: number
              p_entities?: Json
              p_metadata?: Json
            }
        Returns: undefined
      }
      store_user_context: {
        Args:
          | Record<PropertyKey, never>
          | { data: Json }
          | { p_user_id: string; p_context: Json }
          | {
              p_user_id: string
              p_context_type: string
              p_key: string
              p_value: Json
              p_confidence?: number
              p_source?: string
            }
        Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
