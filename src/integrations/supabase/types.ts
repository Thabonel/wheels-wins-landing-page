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
        Relationships: []
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
          is_expired?: boolean | null
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
          is_expired?: boolean | null
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
      affiliate_product_clicks: {
        Row: {
          clicked_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          product_id: string | null
          referrer: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          clicked_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          product_id?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          product_id?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      affiliate_products: {
        Row: {
          additional_images: string[] | null
          affiliate_provider: "amazon" | "ebay" | "custom"
          affiliate_url: string
          api_error_count: number | null
          api_last_error: string | null
          asin: string | null
          availability_change_detected: boolean | null
          availability_status: string | null
          category: "recovery_gear" | "camping_expedition" | "tools_maintenance" | "parts_upgrades" | "books_manuals" | "apparel_merchandise" | "electronics" | "outdoor_gear"
          click_count: number | null
          commission_rate: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          last_availability_check: string | null
          last_price_check: string | null
          last_scraped_price: number | null
          price: number | null
          price_change_detected: boolean | null
          regional_asins: Json | null
          regional_prices: Json | null
          regional_urls: Json | null
          scrape_batch_number: number | null
          short_description: string | null
          sort_order: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          additional_images?: string[] | null
          affiliate_provider: "amazon" | "ebay" | "custom"
          affiliate_url: string
          api_error_count?: number | null
          api_last_error?: string | null
          asin?: string | null
          availability_change_detected?: boolean | null
          availability_status?: string | null
          category: "recovery_gear" | "camping_expedition" | "tools_maintenance" | "parts_upgrades" | "books_manuals" | "apparel_merchandise" | "electronics" | "outdoor_gear"
          click_count?: number | null
          commission_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          last_availability_check?: string | null
          last_price_check?: string | null
          last_scraped_price?: number | null
          price?: number | null
          price_change_detected?: boolean | null
          regional_asins?: Json | null
          regional_prices?: Json | null
          regional_urls?: Json | null
          scrape_batch_number?: number | null
          short_description?: string | null
          sort_order?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          additional_images?: string[] | null
          affiliate_provider?: "amazon" | "ebay" | "custom"
          affiliate_url?: string
          api_error_count?: number | null
          api_last_error?: string | null
          asin?: string | null
          availability_change_detected?: boolean | null
          availability_status?: string | null
          category?: "recovery_gear" | "camping_expedition" | "tools_maintenance" | "parts_upgrades" | "books_manuals" | "apparel_merchandise" | "electronics" | "outdoor_gear"
          click_count?: number | null
          commission_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          last_availability_check?: string | null
          last_price_check?: string | null
          last_scraped_price?: number | null
          price?: number | null
          price_change_detected?: boolean | null
          regional_asins?: Json | null
          regional_prices?: Json | null
          regional_urls?: Json | null
          scrape_batch_number?: number | null
          short_description?: string | null
          sort_order?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      affiliate_products_backup_20251124_002016: {
        Row: {
          additional_images: string[] | null
          affiliate_provider: "amazon" | "ebay" | "custom" | null
          affiliate_url: string | null
          asin: string | null
          category: "recovery_gear" | "camping_expedition" | "tools_maintenance" | "parts_upgrades" | "books_manuals" | "apparel_merchandise" | "electronics" | "outdoor_gear" | null
          click_count: number | null
          commission_rate: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          price: number | null
          regional_asins: Json | null
          regional_prices: Json | null
          regional_urls: Json | null
          short_description: string | null
          sort_order: number | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          additional_images?: string[] | null
          affiliate_provider?: "amazon" | "ebay" | "custom" | null
          affiliate_url?: string | null
          asin?: string | null
          category?: "recovery_gear" | "camping_expedition" | "tools_maintenance" | "parts_upgrades" | "books_manuals" | "apparel_merchandise" | "electronics" | "outdoor_gear" | null
          click_count?: number | null
          commission_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          price?: number | null
          regional_asins?: Json | null
          regional_prices?: Json | null
          regional_urls?: Json | null
          short_description?: string | null
          sort_order?: number | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_images?: string[] | null
          affiliate_provider?: "amazon" | "ebay" | "custom" | null
          affiliate_url?: string | null
          asin?: string | null
          category?: "recovery_gear" | "camping_expedition" | "tools_maintenance" | "parts_upgrades" | "books_manuals" | "apparel_merchandise" | "electronics" | "outdoor_gear" | null
          click_count?: number | null
          commission_rate?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          price?: number | null
          regional_asins?: Json | null
          regional_prices?: Json | null
          regional_urls?: Json | null
          short_description?: string | null
          sort_order?: number | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      affiliate_sales: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string | null
          id: string
          payout_status: string | null
          product_id: string
          product_name: string | null
          sale_amount: number
          sale_date: string | null
          updated_at: string | null
          user_id: string | null
          vendor_name: string | null
        }
        Insert: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          payout_status?: string | null
          product_id: string
          product_name?: string | null
          sale_amount?: number
          sale_date?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          payout_status?: string | null
          product_id?: string
          product_name?: string | null
          sale_amount?: number
          sale_date?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor_name?: string | null
        }
        Relationships: []
      }
      agent_logs: {
        Row: {
          confidence_score: number | null
          created_at: string
          error_message: string | null
          id: string
          input_type: string | null
          intent: string | null
          message: string
          metadata: Json | null
          response: string
          response_time: number | null
          response_time_ms: number | null
          session_id: string
          tools_used: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_type?: string | null
          intent?: string | null
          message: string
          metadata?: Json | null
          response: string
          response_time?: number | null
          response_time_ms?: number | null
          session_id: string
          tools_used?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_type?: string | null
          intent?: string | null
          message?: string
          metadata?: Json | null
          response?: string
          response_time?: number | null
          response_time_ms?: number | null
          session_id?: string
          tools_used?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      agent_state: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          learned_patterns: Json | null
          previous_state_id: string | null
          recent_feedback: Json | null
          response_style_notes: string | null
          system_prompt_additions: string | null
          tool_preferences: Json | null
          updated_at: string | null
          user_id: string | null
          version: number | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          learned_patterns?: Json | null
          previous_state_id?: string | null
          recent_feedback?: Json | null
          response_style_notes?: string | null
          system_prompt_additions?: string | null
          tool_preferences?: Json | null
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          learned_patterns?: Json | null
          previous_state_id?: string | null
          recent_feedback?: Json | null
          response_style_notes?: string | null
          system_prompt_additions?: string | null
          tool_preferences?: Json | null
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
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
        Relationships: []
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
        Relationships: []
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
          ip_address: string | null
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
          ip_address?: string | null
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
          ip_address?: string | null
          page_views?: number | null
          session_end?: string | null
          session_start?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      anonymized_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          date: string
          hash: string
          id: number
          is_recurring: boolean | null
          location: string | null
          merchant_category: string | null
          metadata: Json | null
          transaction_type: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          date: string
          hash: string
          id?: number
          is_recurring?: boolean | null
          location?: string | null
          merchant_category?: string | null
          metadata?: Json | null
          transaction_type?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          date?: string
          hash?: string
          id?: number
          is_recurring?: boolean | null
          location?: string | null
          merchant_category?: string | null
          metadata?: Json | null
          transaction_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      anxiety_logs: {
        Row: {
          coping_strategy_used: string | null
          created_at: string
          fear_category: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          coping_strategy_used?: string | null
          created_at?: string
          fear_category: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          coping_strategy_used?: string | null
          created_at?: string
          fear_category?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      artifacts: {
        Row: {
          access_count: number | null
          artifact_type: string
          content: string | null
          content_hash: string | null
          content_url: string | null
          created_at: string | null
          expires_at: string | null
          handle: string
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          mime_type: string | null
          name: string
          session_id: string | null
          size_bytes: number | null
          summary: string
          user_id: string
        }
        Insert: {
          access_count?: number | null
          artifact_type: string
          content?: string | null
          content_hash?: string | null
          content_url?: string | null
          created_at?: string | null
          expires_at?: string | null
          handle: string
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          mime_type?: string | null
          name: string
          session_id?: string | null
          size_bytes?: number | null
          summary: string
          user_id: string
        }
        Update: {
          access_count?: number | null
          artifact_type?: string
          content?: string | null
          content_hash?: string | null
          content_url?: string | null
          created_at?: string | null
          expires_at?: string | null
          handle?: string
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          session_id?: string | null
          size_bytes?: number | null
          summary?: string
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
          ip_address: string | null
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
          ip_address?: string | null
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
          ip_address?: string | null
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
      bailout_plans: {
        Row: {
          created_at: string
          id: string
          plan_details: string
          plan_type: string
          resources_needed: string | null
          trigger_conditions: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_details: string
          plan_type: string
          resources_needed?: string | null
          trigger_conditions?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_details?: string
          plan_type?: string
          resources_needed?: string | null
          trigger_conditions?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_processing_sessions: {
        Row: {
          created_at: string | null
          file_name: string
          file_size_bytes: number
          file_type: string
          id: string
          processed_at: string | null
          processing_status: string
          transaction_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size_bytes: number
          file_type: string
          id?: string
          processed_at?: string | null
          processing_status?: string
          transaction_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size_bytes?: number
          file_type?: string
          id?: string
          processed_at?: string | null
          processing_status?: string
          transaction_count?: number | null
          updated_at?: string | null
          user_id?: string
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
          alert_threshold: number | null
          budgeted_amount: number
          category: string
          created_at: string | null
          end_date: string
          id: string
          monthly_limit: number
          name: string | null
          start_date: string
          user_id: string
        }
        Insert: {
          alert_threshold?: number | null
          budgeted_amount: number
          category: string
          created_at?: string | null
          end_date: string
          id?: string
          monthly_limit?: number
          name?: string | null
          start_date: string
          user_id: string
        }
        Update: {
          alert_threshold?: number | null
          budgeted_amount?: number
          category?: string
          created_at?: string | null
          end_date?: string
          id?: string
          monthly_limit?: number
          name?: string | null
          start_date?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean
          color: string
          created_at: string | null
          description: string | null
          end_date: string
          event_type: string
          id: string
          is_private: boolean
          location_name: string | null
          reminder_minutes: number[] | null
          start_date: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean
          color?: string
          created_at?: string | null
          description?: string | null
          end_date: string
          event_type?: string
          id?: string
          is_private?: boolean
          location_name?: string | null
          reminder_minutes?: number[] | null
          start_date: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean
          color?: string
          created_at?: string | null
          description?: string | null
          end_date?: string
          event_type?: string
          id?: string
          is_private?: boolean
          location_name?: string | null
          reminder_minutes?: number[] | null
          start_date?: string
          title?: string
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
        Relationships: []
      }
      campgrounds: {
        Row: {
          address: string
          amenities: string[] | null
          created_at: string | null
          description: string | null
          hookup_types: string[] | null
          id: string
          is_rv_friendly: boolean | null
          location: string | null
          max_rv_length: number | null
          name: string
          phone: string | null
          price_per_night: number | null
          rating: number | null
          total_reviews: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address: string
          amenities?: string[] | null
          created_at?: string | null
          description?: string | null
          hookup_types?: string[] | null
          id?: string
          is_rv_friendly?: boolean | null
          location?: string | null
          max_rv_length?: number | null
          name: string
          phone?: string | null
          price_per_night?: number | null
          rating?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string
          amenities?: string[] | null
          created_at?: string | null
          description?: string | null
          hookup_types?: string[] | null
          id?: string
          is_rv_friendly?: boolean | null
          location?: string | null
          max_rv_length?: number | null
          name?: string
          phone?: string | null
          price_per_night?: number | null
          rating?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      camping_budget_preferences: {
        Row: {
          alert_threshold: number | null
          amenity_priorities: Json | null
          budget_flexibility: string | null
          cost_saving_strategies: Json | null
          created_at: string | null
          currency: string | null
          daily_budget_max: number | null
          daily_budget_min: number | null
          id: string
          monthly_budget_max: number | null
          monthly_budget_min: number | null
          prefer_free_camping: boolean | null
          preferred_site_types: Json | null
          splurge_categories: Json | null
          updated_at: string | null
          user_id: string | null
          weekly_budget_max: number | null
          weekly_budget_min: number | null
        }
        Insert: {
          alert_threshold?: number | null
          amenity_priorities?: Json | null
          budget_flexibility?: string | null
          cost_saving_strategies?: Json | null
          created_at?: string | null
          currency?: string | null
          daily_budget_max?: number | null
          daily_budget_min?: number | null
          id?: string
          monthly_budget_max?: number | null
          monthly_budget_min?: number | null
          prefer_free_camping?: boolean | null
          preferred_site_types?: Json | null
          splurge_categories?: Json | null
          updated_at?: string | null
          user_id?: string | null
          weekly_budget_max?: number | null
          weekly_budget_min?: number | null
        }
        Update: {
          alert_threshold?: number | null
          amenity_priorities?: Json | null
          budget_flexibility?: string | null
          cost_saving_strategies?: Json | null
          created_at?: string | null
          currency?: string | null
          daily_budget_max?: number | null
          daily_budget_min?: number | null
          id?: string
          monthly_budget_max?: number | null
          monthly_budget_min?: number | null
          prefer_free_camping?: boolean | null
          preferred_site_types?: Json | null
          splurge_categories?: Json | null
          updated_at?: string | null
          user_id?: string | null
          weekly_budget_max?: number | null
          weekly_budget_min?: number | null
        }
        Relationships: []
      }
      camping_locations: {
        Row: {
          address: string | null
          alternative_sites: Json | null
          amenities: Json | null
          availability_calendar: Json | null
          created_at: string | null
          crowd_level: string | null
          hookups: Json | null
          id: string
          is_free: boolean | null
          last_crowd_update: string | null
          last_scraped: string | null
          latitude: number
          longitude: number
          max_rig_length: number | null
          name: string
          price_per_night: number | null
          reservation_link: string | null
          reservation_required: boolean | null
          reviews_summary: string | null
          seasonal_info: Json | null
          source_url: string | null
          type: string
          updated_at: string | null
          user_ratings: number | null
        }
        Insert: {
          address?: string | null
          alternative_sites?: Json | null
          amenities?: Json | null
          availability_calendar?: Json | null
          created_at?: string | null
          crowd_level?: string | null
          hookups?: Json | null
          id?: string
          is_free?: boolean | null
          last_crowd_update?: string | null
          last_scraped?: string | null
          latitude: number
          longitude: number
          max_rig_length?: number | null
          name: string
          price_per_night?: number | null
          reservation_link?: string | null
          reservation_required?: boolean | null
          reviews_summary?: string | null
          seasonal_info?: Json | null
          source_url?: string | null
          type: string
          updated_at?: string | null
          user_ratings?: number | null
        }
        Update: {
          address?: string | null
          alternative_sites?: Json | null
          amenities?: Json | null
          availability_calendar?: Json | null
          created_at?: string | null
          crowd_level?: string | null
          hookups?: Json | null
          id?: string
          is_free?: boolean | null
          last_crowd_update?: string | null
          last_scraped?: string | null
          latitude?: number
          longitude?: number
          max_rig_length?: number | null
          name?: string
          price_per_night?: number | null
          reservation_link?: string | null
          reservation_required?: boolean | null
          reviews_summary?: string | null
          seasonal_info?: Json | null
          source_url?: string | null
          type?: string
          updated_at?: string | null
          user_ratings?: number | null
        }
        Relationships: []
      }
      camping_site_updates: {
        Row: {
          availability_status: string | null
          camping_location_id: string | null
          conditions: string | null
          created_at: string | null
          crowd_level: string | null
          id: string
          is_verified: boolean | null
          photos: string[] | null
          user_id: string | null
        }
        Insert: {
          availability_status?: string | null
          camping_location_id?: string | null
          conditions?: string | null
          created_at?: string | null
          crowd_level?: string | null
          id?: string
          is_verified?: boolean | null
          photos?: string[] | null
          user_id?: string | null
        }
        Update: {
          availability_status?: string | null
          camping_location_id?: string | null
          conditions?: string | null
          created_at?: string | null
          crowd_level?: string | null
          id?: string
          is_verified?: boolean | null
          photos?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      community_connections: {
        Row: {
          connected_user_id: string
          connection_type: string
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_user_id: string
          connection_type: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_user_id?: string
          connection_type?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      community_group_posts: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          replies_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          replies_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          replies_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean
          member_count: number
          name: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean
          member_count?: number
          name: string
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean
          member_count?: number
          name?: string
          topic?: string
          updated_at?: string
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
      community_knowledge: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          author_id: string | null
          category: string
          content: string
          created_at: string | null
          difficulty_level: string | null
          downloads: number | null
          estimated_read_time: number | null
          excerpt: string | null
          helpful_count: number | null
          id: string
          rejection_reason: string | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          views: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          author_id?: string | null
          category: string
          content: string
          created_at?: string | null
          difficulty_level?: string | null
          downloads?: number | null
          estimated_read_time?: number | null
          excerpt?: string | null
          helpful_count?: number | null
          id?: string
          rejection_reason?: string | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string | null
          difficulty_level?: string | null
          downloads?: number | null
          estimated_read_time?: number | null
          excerpt?: string | null
          helpful_count?: number | null
          id?: string
          rejection_reason?: string | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          views?: number | null
        }
        Relationships: []
      }
      community_knowledge_feedback: {
        Row: {
          article_id: string
          comment: string | null
          created_at: string | null
          id: string
          is_helpful: boolean
          user_id: string
        }
        Insert: {
          article_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          is_helpful: boolean
          user_id: string
        }
        Update: {
          article_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          is_helpful?: boolean
          user_id?: string
        }
        Relationships: []
      }
      community_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          recipient_id: string
          replied_at: string | null
          sender_id: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          recipient_id: string
          replied_at?: string | null
          sender_id: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          recipient_id?: string
          replied_at?: string | null
          sender_id?: string
          subject?: string | null
        }
        Relationships: []
      }
      community_success_stories: {
        Row: {
          created_at: string
          departure_date: string | null
          id: string
          is_public: boolean
          likes_count: number
          story: string
          title: string
          transition_duration_months: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          departure_date?: string | null
          id?: string
          is_public?: boolean
          likes_count?: number
          story: string
          title: string
          transition_duration_months?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          departure_date?: string | null
          id?: string
          is_public?: boolean
          likes_count?: number
          story?: string
          title?: string
          transition_duration_months?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_tips: {
        Row: {
          category: string
          content: string
          created_at: string | null
          helpful_count: number | null
          id: string
          is_featured: boolean | null
          is_verified: boolean | null
          last_used_at: string | null
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          use_count: number | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          last_used_at?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          use_count?: number | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          last_used_at?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          use_count?: number | null
          user_id?: string
          view_count?: number | null
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
      conversations: {
        Row: {
          created_at: string | null
          id: string
          messages: Json | null
          metadata: Json | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          messages?: Json | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          messages?: Json | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_usage_stats: {
        Row: {
          created_at: string | null
          date: string
          estimated_cost: number | null
          id: string
          total_sessions: number | null
          total_tool_calls: number | null
          total_voice_minutes: number | null
          unique_users: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          estimated_cost?: number | null
          id?: string
          total_sessions?: number | null
          total_tool_calls?: number | null
          total_voice_minutes?: number | null
          unique_users?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          estimated_cost?: number | null
          id?: string
          total_sessions?: number | null
          total_tool_calls?: number | null
          total_voice_minutes?: number | null
          unique_users?: number | null
        }
        Relationships: []
      }
      data_collector_metrics: {
        Row: {
          api_calls_made: number | null
          created_at: string | null
          duration_seconds: number | null
          error_messages: Json | null
          id: string
          items_collected: number | null
          items_failed: number | null
          quality_scores: Json | null
          run_date: string
          run_id: string | null
          source: string
        }
        Insert: {
          api_calls_made?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          error_messages?: Json | null
          id?: string
          items_collected?: number | null
          items_failed?: number | null
          quality_scores?: Json | null
          run_date: string
          run_id?: string | null
          source: string
        }
        Update: {
          api_calls_made?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          error_messages?: Json | null
          id?: string
          items_collected?: number | null
          items_failed?: number | null
          quality_scores?: Json | null
          run_date?: string
          run_id?: string | null
          source?: string
        }
        Relationships: []
      }
      data_collector_runs: {
        Row: {
          actual_count: number | null
          completed_at: string | null
          created_at: string | null
          error_summary: string | null
          id: string
          run_type: string
          sources_attempted: Json | null
          sources_succeeded: Json | null
          started_at: string | null
          status: string
          target_count: number | null
        }
        Insert: {
          actual_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_summary?: string | null
          id?: string
          run_type: string
          sources_attempted?: Json | null
          sources_succeeded?: Json | null
          started_at?: string | null
          status?: string
          target_count?: number | null
        }
        Update: {
          actual_count?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_summary?: string | null
          id?: string
          run_type?: string
          sources_attempted?: Json | null
          sources_succeeded?: Json | null
          started_at?: string | null
          status?: string
          target_count?: number | null
        }
        Relationships: []
      }
      data_collector_sources: {
        Row: {
          api_key_name: string | null
          average_quality_score: number | null
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_collected_at: string | null
          name: string
          priority: number | null
          rate_limit: number | null
          source_type: string
          total_collected: number | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          api_key_name?: string | null
          average_quality_score?: number | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_collected_at?: string | null
          name: string
          priority?: number | null
          rate_limit?: number | null
          source_type: string
          total_collected?: number | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          api_key_name?: string | null
          average_quality_score?: number | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_collected_at?: string | null
          name?: string
          priority?: number | null
          rate_limit?: number | null
          source_type?: string
          total_collected?: number | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      data_collector_state: {
        Row: {
          active_sources: Json | null
          collection_config: Json | null
          created_at: string | null
          error_count: number | null
          id: string
          is_active: boolean | null
          last_run: string | null
          next_priority: string | null
          total_collected: number | null
          updated_at: string | null
        }
        Insert: {
          active_sources?: Json | null
          collection_config?: Json | null
          created_at?: string | null
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          last_run?: string | null
          next_priority?: string | null
          total_collected?: number | null
          updated_at?: string | null
        }
        Update: {
          active_sources?: Json | null
          collection_config?: Json | null
          created_at?: string | null
          error_count?: number | null
          id?: string
          is_active?: boolean | null
          last_run?: string | null
          next_priority?: string | null
          total_collected?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          user_id: string | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          user_id?: string | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          user_id?: string | null
        }
        Relationships: []
      }
      domain_memory_constraints: {
        Row: {
          budget_constraints: Json | null
          created_at: string | null
          id: string
          safety_rules: string[] | null
          scope_constraints: Json | null
          task_id: string | null
          time_constraints: Json | null
          updated_at: string | null
        }
        Insert: {
          budget_constraints?: Json | null
          created_at?: string | null
          id?: string
          safety_rules?: string[] | null
          scope_constraints?: Json | null
          task_id?: string | null
          time_constraints?: Json | null
          updated_at?: string | null
        }
        Update: {
          budget_constraints?: Json | null
          created_at?: string | null
          id?: string
          safety_rules?: string[] | null
          scope_constraints?: Json | null
          task_id?: string | null
          time_constraints?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      domain_memory_definitions: {
        Row: {
          created_at: string | null
          id: string
          original_request: string
          parsed_intent: Json
          success_criteria: Json
          task_id: string | null
          updated_at: string | null
          work_items: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          original_request: string
          parsed_intent: Json
          success_criteria: Json
          task_id?: string | null
          updated_at?: string | null
          work_items: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          original_request?: string
          parsed_intent?: Json
          success_criteria?: Json
          task_id?: string | null
          updated_at?: string | null
          work_items?: Json
        }
        Relationships: []
      }
      domain_memory_progress: {
        Row: {
          content: string
          created_at: string | null
          entry_type: string
          id: string
          metadata: Json | null
          task_id: string | null
          work_item_id: string | null
          worker_run_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          entry_type: string
          id?: string
          metadata?: Json | null
          task_id?: string | null
          work_item_id?: string | null
          worker_run_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          entry_type?: string
          id?: string
          metadata?: Json | null
          task_id?: string | null
          work_item_id?: string | null
          worker_run_id?: string
        }
        Relationships: []
      }
      domain_memory_states: {
        Row: {
          blocked_items: string[] | null
          completed_items: string[] | null
          context_snapshot: Json | null
          created_at: string | null
          current_work_item_id: string | null
          failed_items: string[] | null
          id: string
          last_worker_run: string | null
          task_id: string | null
          updated_at: string | null
          worker_run_count: number | null
        }
        Insert: {
          blocked_items?: string[] | null
          completed_items?: string[] | null
          context_snapshot?: Json | null
          created_at?: string | null
          current_work_item_id?: string | null
          failed_items?: string[] | null
          id?: string
          last_worker_run?: string | null
          task_id?: string | null
          updated_at?: string | null
          worker_run_count?: number | null
        }
        Update: {
          blocked_items?: string[] | null
          completed_items?: string[] | null
          context_snapshot?: Json | null
          created_at?: string | null
          current_work_item_id?: string | null
          failed_items?: string[] | null
          id?: string
          last_worker_run?: string | null
          task_id?: string | null
          updated_at?: string | null
          worker_run_count?: number | null
        }
        Relationships: []
      }
      domain_memory_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          priority: number | null
          scope: string
          status: string
          task_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          priority?: number | null
          scope?: string
          status?: string
          task_type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          priority?: number | null
          scope?: string
          status?: string
          task_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      domain_memory_tests: {
        Row: {
          created_at: string | null
          id: string
          task_id: string | null
          test_cases: Json
          updated_at: string | null
          validation_queries: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          task_id?: string | null
          test_cases: Json
          updated_at?: string | null
          validation_queries?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          task_id?: string | null
          test_cases?: Json
          updated_at?: string | null
          validation_queries?: string[] | null
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
        Relationships: []
      }
      events: {
        Row: {
          compacted_into_session_id: string | null
          content: string
          created_at: string | null
          event_type: string
          id: string
          is_compacted: boolean | null
          metadata: Json | null
          sequence_number: number
          session_id: string
          user_id: string
        }
        Insert: {
          compacted_into_session_id?: string | null
          content: string
          created_at?: string | null
          event_type: string
          id?: string
          is_compacted?: boolean | null
          metadata?: Json | null
          sequence_number: number
          session_id: string
          user_id: string
        }
        Update: {
          compacted_into_session_id?: string | null
          content?: string
          created_at?: string | null
          event_type?: string
          id?: string
          is_compacted?: boolean | null
          metadata?: Json | null
          sequence_number?: number
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      expectation_discussions: {
        Row: {
          created_at: string
          expectation_id: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expectation_id: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          expectation_id?: string
          id?: string
          message?: string
          user_id?: string
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
          expense_date: string | null
          id: number
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          date: string
          description?: string | null
          expense_date?: string | null
          id?: number
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          description?: string | null
          expense_date?: string | null
          id?: number
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
          ip_address: string
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          attempt_time?: string | null
          email: string
          id?: string
          ip_address: string
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          attempt_time?: string | null
          email?: string
          id?: string
          ip_address?: string
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      favorite_locations: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          location_address: string
          location_name: string
          notes: string | null
          rating: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          location_address: string
          location_name: string
          notes?: string | null
          rating?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          location_address?: string
          location_name?: string
          notes?: string | null
          rating?: number | null
          updated_at?: string | null
          user_id?: string
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
        Relationships: []
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
          filled_to_top: boolean | null
          id: number
          location: string | null
          notes: string | null
          odometer: number | null
          price: number | null
          receipt_metadata: Json | null
          receipt_photo_url: string | null
          receipt_url: string | null
          region: string | null
          total: number | null
          user_id: string | null
          volume: number | null
        }
        Insert: {
          consumption?: number | null
          created_at?: string | null
          date: string
          filled_to_top?: boolean | null
          id?: number
          location?: string | null
          notes?: string | null
          odometer?: number | null
          price?: number | null
          receipt_metadata?: Json | null
          receipt_photo_url?: string | null
          receipt_url?: string | null
          region?: string | null
          total?: number | null
          user_id?: string | null
          volume?: number | null
        }
        Update: {
          consumption?: number | null
          created_at?: string | null
          date?: string
          filled_to_top?: boolean | null
          id?: number
          location?: string | null
          notes?: string | null
          odometer?: number | null
          price?: number | null
          receipt_metadata?: Json | null
          receipt_photo_url?: string | null
          receipt_url?: string | null
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
      health_check_alerts: {
        Row: {
          created_at: string | null
          error_details: string[] | null
          failed_tests: string[]
          id: string
          status: string
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          error_details?: string[] | null
          failed_tests: string[]
          id?: string
          status: string
          timestamp?: string
        }
        Update: {
          created_at?: string | null
          error_details?: string[] | null
          failed_tests?: string[]
          id?: string
          status?: string
          timestamp?: string
        }
        Relationships: []
      }
      health_check_history: {
        Row: {
          created_at: string | null
          duration_ms: number
          error: string | null
          id: string
          status: string
          test_name: string
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          duration_ms: number
          error?: string | null
          id?: string
          status: string
          test_name: string
          timestamp?: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number
          error?: string | null
          id?: string
          status?: string
          test_name?: string
          timestamp?: string
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
      income_streams: {
        Row: {
          actual_monthly: number | null
          created_at: string | null
          discontinued_at: string | null
          id: string
          income_type: string
          monthly_estimate: number
          notes: string | null
          priority: string | null
          profile_id: string
          resources: Json | null
          setup_checklist: Json | null
          setup_completed: boolean | null
          setup_completed_date: string | null
          started_at: string | null
          status: string
          stream_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_monthly?: number | null
          created_at?: string | null
          discontinued_at?: string | null
          id?: string
          income_type: string
          monthly_estimate?: number
          notes?: string | null
          priority?: string | null
          profile_id: string
          resources?: Json | null
          setup_checklist?: Json | null
          setup_completed?: boolean | null
          setup_completed_date?: string | null
          started_at?: string | null
          status?: string
          stream_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_monthly?: number | null
          created_at?: string | null
          discontinued_at?: string | null
          id?: string
          income_type?: string
          monthly_estimate?: number
          notes?: string | null
          priority?: string | null
          profile_id?: string
          resources?: Json | null
          setup_checklist?: Json | null
          setup_completed?: boolean | null
          setup_completed_date?: string | null
          started_at?: string | null
          status?: string
          stream_name?: string
          updated_at?: string | null
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
        Relationships: []
      }
      launch_checkins: {
        Row: {
          challenges: string | null
          checkin_type: string
          created_at: string
          id: string
          mood: string | null
          response: string
          user_id: string
          wins: string | null
        }
        Insert: {
          challenges?: string | null
          checkin_type: string
          created_at?: string
          id?: string
          mood?: string | null
          response: string
          user_id: string
          wins?: string | null
        }
        Update: {
          challenges?: string | null
          checkin_type?: string
          created_at?: string
          id?: string
          mood?: string | null
          response?: string
          user_id?: string
          wins?: string | null
        }
        Relationships: []
      }
      launch_week_tasks: {
        Row: {
          category: string
          created_at: string
          day_number: number
          description: string
          id: string
          is_critical: boolean
          order_num: number
          task_name: string
          time_estimate_minutes: number
        }
        Insert: {
          category: string
          created_at?: string
          day_number: number
          description: string
          id?: string
          is_critical?: boolean
          order_num: number
          task_name: string
          time_estimate_minutes: number
        }
        Update: {
          category?: string
          created_at?: string
          day_number?: number
          description?: string
          id?: string
          is_critical?: boolean
          order_num?: number
          task_name?: string
          time_estimate_minutes?: number
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
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
        Relationships: []
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
      medical_emergency_info: {
        Row: {
          created_at: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      medical_medications: {
        Row: {
          active: boolean | null
          created_at: string | null
          dosage: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          dosage?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          dosage?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      medical_records: {
        Row: {
          content_json: Json | null
          created_at: string | null
          date_recorded: string
          description: string | null
          document_url: string | null
          id: string
          ocr_text: string | null
          summary: string | null
          tags: string[] | null
          test_date: string | null
          title: string
          type: "document" | "lab_result" | "prescription" | "insurance_card" | "doctor_note" | "vaccination" | "imaging" | "other" | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_json?: Json | null
          created_at?: string | null
          date_recorded: string
          description?: string | null
          document_url?: string | null
          id?: string
          ocr_text?: string | null
          summary?: string | null
          tags?: string[] | null
          test_date?: string | null
          title: string
          type?: "document" | "lab_result" | "prescription" | "insurance_card" | "doctor_note" | "vaccination" | "imaging" | "other" | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_json?: Json | null
          created_at?: string | null
          date_recorded?: string
          description?: string | null
          document_url?: string | null
          id?: string
          ocr_text?: string | null
          summary?: string | null
          tags?: string[] | null
          test_date?: string | null
          title?: string
          type?: "document" | "lab_result" | "prescription" | "insurance_card" | "doctor_note" | "vaccination" | "imaging" | "other" | null
          updated_at?: string | null
          user_id?: string
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
      memories: {
        Row: {
          access_count: number | null
          content: string
          created_at: string | null
          embedding: string | null
          expires_at: string | null
          id: string
          importance_score: number | null
          is_active: boolean | null
          last_accessed_at: string | null
          memory_type: string
          source_session_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_count?: number | null
          content: string
          created_at?: string | null
          embedding?: string | null
          expires_at?: string | null
          id?: string
          importance_score?: number | null
          is_active?: boolean | null
          last_accessed_at?: string | null
          memory_type: string
          source_session_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_count?: number | null
          content?: string
          created_at?: string | null
          embedding?: string | null
          expires_at?: string | null
          id?: string
          importance_score?: number | null
          is_active?: boolean | null
          last_accessed_at?: string | null
          memory_type?: string
          source_session_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          recipient_id: string
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          recipient_id: string
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          recipient_id?: string
          sender_id?: string
          updated_at?: string | null
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
      milestone_badges: {
        Row: {
          created_at: string
          criteria: Json
          description: string
          icon: string
          id: string
          name: string
          order_num: number
        }
        Insert: {
          created_at?: string
          criteria: Json
          description: string
          icon: string
          id?: string
          name: string
          order_num: number
        }
        Update: {
          created_at?: string
          criteria?: Json
          description?: string
          icon?: string
          id?: string
          name?: string
          order_num?: number
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
      monthly_savings_summary: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          budget_adherence: number | null
          created_at: string | null
          evaluation_date: string | null
          guarantee_amount: number | null
          guarantee_met: boolean | null
          id: number
          metadata: Json | null
          processed_date: string | null
          refund_amount: number | null
          refund_status: string | null
          refund_transaction_id: string | null
          savings_events_count: number | null
          savings_goal: number | null
          savings_rate: number | null
          subscription_cost: number
          top_expense_category: string | null
          total_actual_savings: number | null
          total_expenses: number | null
          total_income: number | null
          total_predicted_savings: number | null
          total_savings: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_period_end?: string
          billing_period_start?: string
          budget_adherence?: number | null
          created_at?: string | null
          evaluation_date?: string | null
          guarantee_amount?: number | null
          guarantee_met?: boolean | null
          id?: number
          metadata?: Json | null
          processed_date?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          refund_transaction_id?: string | null
          savings_events_count?: number | null
          savings_goal?: number | null
          savings_rate?: number | null
          subscription_cost?: number
          top_expense_category?: string | null
          total_actual_savings?: number | null
          total_expenses?: number | null
          total_income?: number | null
          total_predicted_savings?: number | null
          total_savings?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          budget_adherence?: number | null
          created_at?: string | null
          evaluation_date?: string | null
          guarantee_amount?: number | null
          guarantee_met?: boolean | null
          id?: number
          metadata?: Json | null
          processed_date?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          refund_transaction_id?: string | null
          savings_events_count?: number | null
          savings_goal?: number | null
          savings_rate?: number | null
          subscription_cost?: number
          top_expense_category?: string | null
          total_actual_savings?: number | null
          total_expenses?: number | null
          total_income?: number | null
          total_predicted_savings?: number | null
          total_savings?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mood_check_ins: {
        Row: {
          created_at: string
          date: string
          id: string
          journal_entry: string | null
          mood: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          journal_entry?: string | null
          mood: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          journal_entry?: string | null
          mood?: string
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
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          price_at_purchase: number
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          price_at_purchase: number
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          price_at_purchase?: number
          product_id?: string
          quantity?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          payment_method: string | null
          shipping_address: Json
          status: string
          total_amount: number
          tracking_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          shipping_address: Json
          status?: string
          total_amount: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          shipping_address?: Json
          status?: string
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pam_admin_knowledge: {
        Row: {
          admin_user_id: string
          category: string
          content: string
          created_at: string | null
          date_context: string | null
          id: string
          is_active: boolean | null
          knowledge_type: string
          last_used_at: string | null
          location_context: string | null
          priority: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          admin_user_id: string
          category: string
          content: string
          created_at?: string | null
          date_context?: string | null
          id?: string
          is_active?: boolean | null
          knowledge_type: string
          last_used_at?: string | null
          location_context?: string | null
          priority?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          admin_user_id?: string
          category?: string
          content?: string
          created_at?: string | null
          date_context?: string | null
          id?: string
          is_active?: boolean | null
          knowledge_type?: string
          last_used_at?: string | null
          location_context?: string | null
          priority?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
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
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          session_id?: string | null
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          session_id?: string | null
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: []
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
          event_data: Json | null
          event_type: string | null
          has_error: boolean | null
          hour_of_day: number | null
          id: number
          intent: string | null
          is_weekend: boolean | null
          log_id: string | null
          log_level: string | null
          message: string | null
          message_preview: string | null
          metadata: Json | null
          raw_context: Json | null
          response_time_ms: number | null
          session_id: string | null
          success: boolean | null
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
          event_data?: Json | null
          event_type?: string | null
          has_error?: boolean | null
          hour_of_day?: number | null
          id?: number
          intent?: string | null
          is_weekend?: boolean | null
          log_id?: string | null
          log_level?: string | null
          message?: string | null
          message_preview?: string | null
          metadata?: Json | null
          raw_context?: Json | null
          response_time_ms?: number | null
          session_id?: string | null
          success?: boolean | null
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
          event_data?: Json | null
          event_type?: string | null
          has_error?: boolean | null
          hour_of_day?: number | null
          id?: number
          intent?: string | null
          is_weekend?: boolean | null
          log_id?: string | null
          log_level?: string | null
          message?: string | null
          message_preview?: string | null
          metadata?: Json | null
          raw_context?: Json | null
          response_time_ms?: number | null
          session_id?: string | null
          success?: boolean | null
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
          key?: string
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
          expires_at: string | null
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
          expires_at?: string | null
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
          expires_at?: string | null
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
        Relationships: []
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
        Relationships: []
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
          created_at: string | null
          feedback: string | null
          id: string
          intent: string | null
          message_id: string | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          chat_input?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          intent?: string | null
          message_id?: string | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          chat_input?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          intent?: string | null
          message_id?: string | null
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
      pam_knowledge_usage_log: {
        Row: {
          conversation_context: string | null
          id: string
          knowledge_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          conversation_context?: string | null
          id?: string
          knowledge_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          conversation_context?: string | null
          id?: string
          knowledge_id?: string
          used_at?: string | null
          user_id?: string
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
          type: string
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
          type: string
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
          type?: string
          user_acted?: boolean | null
          user_id?: string
          user_rating?: number | null
          user_viewed?: boolean | null
        }
        Relationships: []
      }
      pam_savings_events: {
        Row: {
          actual_savings: number | null
          amount: number | null
          baseline_cost: number | null
          category: string | null
          confidence_score: number | null
          created_at: string | null
          description: string | null
          event_type: string
          id: number
          location: string | null
          metadata: Json | null
          optimized_cost: number | null
          predicted_savings: number | null
          recommendation_id: string | null
          saved_date: string
          savings_description: string | null
          savings_type: string | null
          updated_at: string | null
          user_id: string
          verification_method: string | null
        }
        Insert: {
          actual_savings?: number | null
          amount?: number | null
          baseline_cost?: number | null
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: number
          location?: string | null
          metadata?: Json | null
          optimized_cost?: number | null
          predicted_savings?: number | null
          recommendation_id?: string | null
          saved_date?: string
          savings_description?: string | null
          savings_type?: string | null
          updated_at?: string | null
          user_id: string
          verification_method?: string | null
        }
        Update: {
          actual_savings?: number | null
          amount?: number | null
          baseline_cost?: number | null
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: number
          location?: string | null
          metadata?: Json | null
          optimized_cost?: number | null
          predicted_savings?: number | null
          recommendation_id?: string | null
          saved_date?: string
          savings_description?: string | null
          savings_type?: string | null
          updated_at?: string | null
          user_id?: string
          verification_method?: string | null
        }
        Relationships: []
      }
      pam_user_context: {
        Row: {
          active_trip_id: string | null
          context_data: Json
          context_type: string
          conversation_mood: string | null
          current_location: Json | null
          current_session_id: string | null
          expires_at: string | null
          interaction_patterns: Json | null
          last_interaction: string | null
          last_updated: string | null
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
          context_data: Json
          context_type?: string
          conversation_mood?: string | null
          current_location?: Json | null
          current_session_id?: string | null
          expires_at?: string | null
          interaction_patterns?: Json | null
          last_interaction?: string | null
          last_updated?: string | null
          learned_preferences?: Json | null
          preferred_response_style?: string | null
          recent_intents?: string[] | null
          travel_preferences?: Json | null
          updated_at?: string | null
          user_id?: string
          vehicle_info?: Json | null
        }
        Update: {
          active_trip_id?: string | null
          context_data?: Json
          context_type?: string
          conversation_mood?: string | null
          current_location?: Json | null
          current_session_id?: string | null
          expires_at?: string | null
          interaction_patterns?: Json | null
          last_interaction?: string | null
          last_updated?: string | null
          learned_preferences?: Json | null
          preferred_response_style?: string | null
          recent_intents?: string[] | null
          travel_preferences?: Json | null
          updated_at?: string | null
          user_id?: string
          vehicle_info?: Json | null
        }
        Relationships: []
      }
      pantry_items: {
        Row: {
          created_at: string
          expiry_date: string | null
          id: string
          ingredient_name: string
          location: string | null
          quantity: number
          unit: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          ingredient_name: string
          location?: string | null
          quantity: number
          unit: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          ingredient_name?: string
          location?: string | null
          quantity?: number
          unit?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      partner_expectations: {
        Row: {
          category: string
          created_at: string
          expectation: string
          id: string
          partner_id: string | null
          priority: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          expectation: string
          id?: string
          partner_id?: string | null
          priority?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          expectation?: string
          id?: string
          partner_id?: string | null
          priority?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      poi_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_category_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_category_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_category_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pois: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          images: string[] | null
          is_verified: boolean | null
          latitude: number
          longitude: number
          metadata: Json | null
          name: string
          rating: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_verified?: boolean | null
          latitude: number
          longitude: number
          metadata?: Json | null
          name: string
          rating?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_verified?: boolean | null
          latitude?: number
          longitude?: number
          metadata?: Json | null
          name?: string
          rating?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
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
        Relationships: []
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
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
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
          training_data_period: string | null
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
          training_data_period?: string | null
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
          training_data_period?: string | null
        }
        Relationships: []
      }
      privacy_settings: {
        Row: {
          allow_messages: boolean | null
          created_at: string | null
          expense_sharing: boolean | null
          id: string
          location_sharing: boolean | null
          profile_visibility: string | null
          show_in_search: boolean | null
          trip_sharing: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_messages?: boolean | null
          created_at?: string | null
          expense_sharing?: boolean | null
          id?: string
          location_sharing?: boolean | null
          profile_visibility?: string | null
          show_in_search?: boolean | null
          trip_sharing?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_messages?: boolean | null
          created_at?: string | null
          expense_sharing?: boolean | null
          id?: string
          location_sharing?: boolean | null
          profile_visibility?: string | null
          show_in_search?: boolean | null
          trip_sharing?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      product_availability_log: {
        Row: {
          asin: string
          checked_at: string
          error_message: string | null
          id: string
          is_available: boolean
          product_id: string
          region: string
          source: string | null
          was_available: boolean | null
        }
        Insert: {
          asin: string
          checked_at?: string
          error_message?: string | null
          id?: string
          is_available: boolean
          product_id: string
          region: string
          source?: string | null
          was_available?: boolean | null
        }
        Update: {
          asin?: string
          checked_at?: string
          error_message?: string | null
          id?: string
          is_available?: boolean
          product_id?: string
          region?: string
          source?: string | null
          was_available?: boolean | null
        }
        Relationships: []
      }
      product_issue_reports: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          id: string
          issue_type: string
          notes: string | null
          product_id: string
          product_snapshot: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          issue_type: string
          notes?: string | null
          product_id: string
          product_snapshot?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          issue_type?: string
          notes?: string | null
          product_id?: string
          product_snapshot?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      product_price_history: {
        Row: {
          asin: string
          checked_at: string
          currency: string
          id: string
          new_price: number | null
          old_price: number | null
          price_change_percent: number | null
          product_id: string
          region: string
          source: string | null
        }
        Insert: {
          asin: string
          checked_at?: string
          currency: string
          id?: string
          new_price?: number | null
          old_price?: number | null
          price_change_percent?: number | null
          product_id: string
          region: string
          source?: string | null
        }
        Update: {
          asin?: string
          checked_at?: string
          currency?: string
          id?: string
          new_price?: number | null
          old_price?: number | null
          price_change_percent?: number | null
          product_id?: string
          region?: string
          source?: string | null
        }
        Relationships: []
      }
      products_legacy_backup: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          metadata: Json | null
          name: string
          price: number
          stock_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          price: number
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          price?: number
          stock_quantity?: number | null
          updated_at?: string | null
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
          content_preferences: Json | null
          created_at: string | null
          current_latitude: number | null
          current_longitude: number | null
          destination_latitude: number | null
          destination_longitude: number | null
          email: string | null
          emergency_contact: Json | null
          fuel_type: string | null
          full_name: string | null
          gender_custom: string | null
          gender_identity: string | null
          id: string
          interests: string[] | null
          language: string | null
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
          pronouns: string | null
          pronouns_custom: string | null
          region: string | null
          role: string | null
          second_vehicle: string | null
          status: string | null
          subscription_cancelled: boolean | null
          towing: string | null
          travel_radius_miles: number | null
          travel_style: string[] | null
          trial_end_date: string | null
          trial_notification_sent: boolean | null
          updated_at: string | null
          vehicle_make_model: string | null
          vehicle_type: string | null
        }
        Insert: {
          accessibility?: string | null
          accessibility_needs?: string[] | null
          budget_range?: string | null
          camp_types?: string | null
          cancellation_token?: string | null
          content_preferences?: Json | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          destination_latitude?: number | null
          destination_longitude?: number | null
          email?: string | null
          emergency_contact?: Json | null
          fuel_type?: string | null
          full_name?: string | null
          gender_custom?: string | null
          gender_identity?: string | null
          id?: string
          interests?: string[] | null
          language?: string | null
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
          pronouns?: string | null
          pronouns_custom?: string | null
          region?: string | null
          role?: string | null
          second_vehicle?: string | null
          status?: string | null
          subscription_cancelled?: boolean | null
          towing?: string | null
          travel_radius_miles?: number | null
          travel_style?: string[] | null
          trial_end_date?: string | null
          trial_notification_sent?: boolean | null
          updated_at?: string | null
          vehicle_make_model?: string | null
          vehicle_type?: string | null
        }
        Update: {
          accessibility?: string | null
          accessibility_needs?: string[] | null
          budget_range?: string | null
          camp_types?: string | null
          cancellation_token?: string | null
          content_preferences?: Json | null
          created_at?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          destination_latitude?: number | null
          destination_longitude?: number | null
          email?: string | null
          emergency_contact?: Json | null
          fuel_type?: string | null
          full_name?: string | null
          gender_custom?: string | null
          gender_identity?: string | null
          id?: string
          interests?: string[] | null
          language?: string | null
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
          pronouns?: string | null
          pronouns_custom?: string | null
          region?: string | null
          role?: string | null
          second_vehicle?: string | null
          status?: string | null
          subscription_cancelled?: boolean | null
          towing?: string | null
          travel_radius_miles?: number | null
          travel_style?: string[] | null
          trial_end_date?: string | null
          trial_notification_sent?: boolean | null
          updated_at?: string | null
          vehicle_make_model?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      qa_issues: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          notes: string | null
          priority: string | null
          screenshot_url: string | null
          status: string | null
          title: string
          updated_at: string | null
          updated_by: string | null
          url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          screenshot_url?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          updated_by?: string | null
          url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          screenshot_url?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
          url?: string | null
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
      recipes: {
        Row: {
          cook_time_minutes: number | null
          created_at: string
          cuisine: string | null
          description: string | null
          dietary_tags: Json | null
          difficulty: string | null
          id: string
          ingredients: Json | null
          instructions: Json | null
          is_public: boolean
          is_shared: boolean
          meal_type: Json | null
          nutrition_info: Json | null
          prep_time_minutes: number | null
          servings: number | null
          shared_with: Json | null
          source_type: string | null
          source_url: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cook_time_minutes?: number | null
          created_at?: string
          cuisine?: string | null
          description?: string | null
          dietary_tags?: Json | null
          difficulty?: string | null
          id?: string
          ingredients?: Json | null
          instructions?: Json | null
          is_public?: boolean
          is_shared?: boolean
          meal_type?: Json | null
          nutrition_info?: Json | null
          prep_time_minutes?: number | null
          servings?: number | null
          shared_with?: Json | null
          source_type?: string | null
          source_url?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cook_time_minutes?: number | null
          created_at?: string
          cuisine?: string | null
          description?: string | null
          dietary_tags?: Json | null
          difficulty?: string | null
          id?: string
          ingredients?: Json | null
          instructions?: Json | null
          is_public?: boolean
          is_shared?: boolean
          meal_type?: Json | null
          nutrition_info?: Json | null
          prep_time_minutes?: number | null
          servings?: number | null
          shared_with?: Json | null
          source_type?: string | null
          source_url?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
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
        Relationships: []
      }
      regional_pain_points: {
        Row: {
          challenge_type: string
          country: string
          created_at: string | null
          description: string | null
          id: string
          mitigation_tips: Json | null
          region: string
          season: string | null
          severity: string | null
          updated_at: string | null
        }
        Insert: {
          challenge_type: string
          country: string
          created_at?: string | null
          description?: string | null
          id?: string
          mitigation_tips?: Json | null
          region: string
          season?: string | null
          severity?: string | null
          updated_at?: string | null
        }
        Update: {
          challenge_type?: string
          country?: string
          created_at?: string | null
          description?: string | null
          id?: string
          mitigation_tips?: Json | null
          region?: string
          season?: string | null
          severity?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      saved_trips: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty: string | null
          distance: number | null
          duration: number | null
          end_location: string
          estimated_days: number | null
          gpx_data: string | null
          id: string
          is_public: boolean | null
          name: string
          route_data: Json | null
          start_location: string
          tags: string[] | null
          updated_at: string | null
          user_id: string
          waypoints: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          distance?: number | null
          duration?: number | null
          end_location: string
          estimated_days?: number | null
          gpx_data?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          route_data?: Json | null
          start_location: string
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          waypoints?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          distance?: number | null
          duration?: number | null
          end_location?: string
          estimated_days?: number | null
          gpx_data?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          route_data?: Json | null
          start_location?: string
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          waypoints?: Json | null
        }
        Relationships: []
      }
      savings_guarantee_history: {
        Row: {
          billing_period: string
          created_at: string | null
          evaluation_date: string
          guarantee_met: boolean
          id: number
          notes: string | null
          refund_amount: number | null
          refund_issued: boolean | null
          refund_method: string | null
          stripe_refund_id: string | null
          subscription_cost: number
          total_savings: number
          user_id: string
        }
        Insert: {
          billing_period: string
          created_at?: string | null
          evaluation_date?: string
          guarantee_met: boolean
          id?: number
          notes?: string | null
          refund_amount?: number | null
          refund_issued?: boolean | null
          refund_method?: string | null
          stripe_refund_id?: string | null
          subscription_cost: number
          total_savings: number
          user_id: string
        }
        Update: {
          billing_period?: string
          created_at?: string | null
          evaluation_date?: string
          guarantee_met?: boolean
          id?: number
          notes?: string | null
          refund_amount?: number | null
          refund_issued?: boolean | null
          refund_method?: string | null
          stripe_refund_id?: string | null
          subscription_cost?: number
          total_savings?: number
          user_id?: string
        }
        Relationships: []
      }
      scraper_ai_config: {
        Row: {
          config_data: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          max_tokens: number | null
          model_name: string
          model_version: string | null
          provider: string
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          config_data?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model_name: string
          model_version?: string | null
          provider?: string
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          config_data?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_tokens?: number | null
          model_name?: string
          model_version?: string | null
          provider?: string
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ip_address: string | null
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
          ip_address?: string | null
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
          ip_address?: string | null
          location?: Json | null
          metadata?: Json | null
          resolved?: boolean | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          compaction_count: number | null
          ended_at: string | null
          id: string
          last_activity_at: string | null
          last_compaction_at: string | null
          message_count: number | null
          session_summary: Json | null
          started_at: string | null
          status: string | null
          summary_embedding: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          compaction_count?: number | null
          ended_at?: string | null
          id?: string
          last_activity_at?: string | null
          last_compaction_at?: string | null
          message_count?: number | null
          session_summary?: Json | null
          started_at?: string | null
          status?: string | null
          summary_embedding?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          compaction_count?: number | null
          ended_at?: string | null
          id?: string
          last_activity_at?: string | null
          last_compaction_at?: string | null
          message_count?: number | null
          session_summary?: Json | null
          started_at?: string | null
          status?: string | null
          summary_embedding?: string | null
          title?: string | null
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
          user_id?: string
        }
        Update: {
          email_notifications?: boolean | null
          two_factor_auth?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shakedown_issues: {
        Row: {
          actual_cost: number | null
          category: string
          created_at: string
          description: string
          estimated_cost: number | null
          id: string
          is_resolved: boolean
          notes: string | null
          parts_needed: string | null
          profile_id: string
          resolved_date: string | null
          severity: string
          solution_found: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          category: string
          created_at?: string
          description: string
          estimated_cost?: number | null
          id?: string
          is_resolved?: boolean
          notes?: string | null
          parts_needed?: string | null
          profile_id: string
          resolved_date?: string | null
          severity: string
          solution_found?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          category?: string
          created_at?: string
          description?: string
          estimated_cost?: number | null
          id?: string
          is_resolved?: boolean
          notes?: string | null
          parts_needed?: string | null
          profile_id?: string
          resolved_date?: string | null
          severity?: string
          solution_found?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shakedown_trips: {
        Row: {
          confidence_rating: number | null
          created_at: string
          distance_miles: number | null
          duration_days: number
          end_date: string | null
          id: string
          lessons_learned: string | null
          name: string
          photos: Json | null
          profile_id: string
          start_date: string
          trip_type: string
          updated_at: string
        }
        Insert: {
          confidence_rating?: number | null
          created_at?: string
          distance_miles?: number | null
          duration_days: number
          end_date?: string | null
          id?: string
          lessons_learned?: string | null
          name: string
          photos?: Json | null
          profile_id: string
          start_date: string
          trip_type: string
          updated_at?: string
        }
        Update: {
          confidence_rating?: number | null
          created_at?: string
          distance_miles?: number | null
          duration_days?: number
          end_date?: string | null
          id?: string
          lessons_learned?: string | null
          name?: string
          photos?: Json | null
          profile_id?: string
          start_date?: string
          trip_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      shared_locations: {
        Row: {
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          location: string
          location_name: string | null
          share_duration_hours: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          location: string
          location_name?: string | null
          share_duration_hours?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string
          location_name?: string | null
          share_duration_hours?: number | null
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
          group_id?: string
          is_active?: boolean | null
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Update: {
          group_id?: string
          is_active?: boolean | null
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: []
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
        Relationships: []
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
          category: string | null
          created_at: string | null
          current_page: string | null
          id: string
          message: string
          status: string | null
          subject: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          current_page?: string | null
          id?: string
          message: string
          status?: string | null
          subject: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          current_page?: string | null
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
      timers_and_alarms: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          id: string
          label: string | null
          notification_sent: boolean | null
          scheduled_time: string
          status: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          label?: string | null
          notification_sent?: boolean | null
          scheduled_time: string
          status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          label?: string | null
          notification_sent?: boolean | null
          scheduled_time?: string
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tip_usage_log: {
        Row: {
          beneficiary_id: string | null
          contributor_id: string
          conversation_id: string | null
          created_at: string | null
          id: string
          pam_response: string | null
          tip_id: string
        }
        Insert: {
          beneficiary_id?: string | null
          contributor_id: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          pam_response?: string | null
          tip_id: string
        }
        Update: {
          beneficiary_id?: string | null
          contributor_id?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          pam_response?: string | null
          tip_id?: string
        }
        Relationships: []
      }
      transaction_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          display_name: string
          icon: string | null
          id: number
          is_income_category: boolean | null
          is_system: boolean | null
          keywords: string[] | null
          name: string
          parent_category_id: number | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          icon?: string | null
          id?: number
          is_income_category?: boolean | null
          is_system?: boolean | null
          keywords?: string[] | null
          name: string
          parent_category_id?: number | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: number
          is_income_category?: boolean | null
          is_system?: boolean | null
          keywords?: string[] | null
          name?: string
          parent_category_id?: number | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transition_community: {
        Row: {
          buddy_user_id: string | null
          connection_type: string
          created_at: string | null
          id: string
          last_contact_date: string | null
          match_score: number | null
          notes: string | null
          shared_interests: Json | null
          shared_timeline: boolean | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          buddy_user_id?: string | null
          connection_type: string
          created_at?: string | null
          id?: string
          last_contact_date?: string | null
          match_score?: number | null
          notes?: string | null
          shared_interests?: Json | null
          shared_timeline?: boolean | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          buddy_user_id?: string | null
          connection_type?: string
          created_at?: string | null
          id?: string
          last_contact_date?: string | null
          match_score?: number | null
          notes?: string | null
          shared_interests?: Json | null
          shared_timeline?: boolean | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transition_equipment: {
        Row: {
          acquired_date: string | null
          acquisition_status: string | null
          actual_cost: number | null
          budget_bucket: string | null
          category: string
          created_at: string | null
          equipment_name: string
          estimated_cost: number | null
          id: string
          installation_notes: string | null
          is_needed: boolean | null
          is_purchased: boolean
          priority: string | null
          product_links: Json | null
          profile_id: string
          purchase_location: string | null
          purchased_date: string | null
          research_notes: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          acquired_date?: string | null
          acquisition_status?: string | null
          actual_cost?: number | null
          budget_bucket?: string | null
          category: string
          created_at?: string | null
          equipment_name: string
          estimated_cost?: number | null
          id?: string
          installation_notes?: string | null
          is_needed?: boolean | null
          is_purchased?: boolean
          priority?: string | null
          product_links?: Json | null
          profile_id: string
          purchase_location?: string | null
          purchased_date?: string | null
          research_notes?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          acquired_date?: string | null
          acquisition_status?: string | null
          actual_cost?: number | null
          budget_bucket?: string | null
          category?: string
          created_at?: string | null
          equipment_name?: string
          estimated_cost?: number | null
          id?: string
          installation_notes?: string | null
          is_needed?: boolean | null
          is_purchased?: boolean
          priority?: string | null
          product_links?: Json | null
          profile_id?: string
          purchase_location?: string | null
          purchased_date?: string | null
          research_notes?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transition_financial: {
        Row: {
          bucket_type: string
          category: string
          created_at: string | null
          current_amount: number | null
          due_date: string | null
          estimated_amount: number
          funding_percentage: number | null
          id: string
          is_funded: boolean | null
          last_contribution_amount: number | null
          last_contribution_date: string | null
          notes: string | null
          priority: string | null
          profile_id: string
          subcategory: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bucket_type: string
          category: string
          created_at?: string | null
          current_amount?: number | null
          due_date?: string | null
          estimated_amount: number
          funding_percentage?: number | null
          id?: string
          is_funded?: boolean | null
          last_contribution_amount?: number | null
          last_contribution_date?: string | null
          notes?: string | null
          priority?: string | null
          profile_id: string
          subcategory?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bucket_type?: string
          category?: string
          created_at?: string | null
          current_amount?: number | null
          due_date?: string | null
          estimated_amount?: number
          funding_percentage?: number | null
          id?: string
          is_funded?: boolean | null
          last_contribution_amount?: number | null
          last_contribution_date?: string | null
          notes?: string | null
          priority?: string | null
          profile_id?: string
          subcategory?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transition_inventory: {
        Row: {
          buyer_info: string | null
          created_at: string | null
          decision: string | null
          decision_notes: string | null
          estimated_value: number | null
          id: string
          images: string[] | null
          is_processed: boolean | null
          item_category: string | null
          item_name: string
          processed_at: string | null
          profile_id: string
          quantity: number | null
          room_name: string
          room_type: string | null
          sold_date: string | null
          sold_price: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          buyer_info?: string | null
          created_at?: string | null
          decision?: string | null
          decision_notes?: string | null
          estimated_value?: number | null
          id?: string
          images?: string[] | null
          is_processed?: boolean | null
          item_category?: string | null
          item_name: string
          processed_at?: string | null
          profile_id: string
          quantity?: number | null
          room_name: string
          room_type?: string | null
          sold_date?: string | null
          sold_price?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          buyer_info?: string | null
          created_at?: string | null
          decision?: string | null
          decision_notes?: string | null
          estimated_value?: number | null
          id?: string
          images?: string[] | null
          is_processed?: boolean | null
          item_category?: string | null
          item_name?: string
          processed_at?: string | null
          profile_id?: string
          quantity?: number | null
          room_name?: string
          room_type?: string | null
          sold_date?: string | null
          sold_price?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transition_items: {
        Row: {
          category: string | null
          created_at: string | null
          decision: string | null
          decision_date: string | null
          description: string | null
          emotional_difficulty: number | null
          estimated_value: number | null
          id: string
          name: string
          notes: string | null
          photo_url: string | null
          profile_id: string
          room_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          decision?: string | null
          decision_date?: string | null
          description?: string | null
          emotional_difficulty?: number | null
          estimated_value?: number | null
          id?: string
          name: string
          notes?: string | null
          photo_url?: string | null
          profile_id: string
          room_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          decision?: string | null
          decision_date?: string | null
          description?: string | null
          emotional_difficulty?: number | null
          estimated_value?: number | null
          id?: string
          name?: string
          notes?: string | null
          photo_url?: string | null
          profile_id?: string
          room_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transition_profiles: {
        Row: {
          archived_at: string | null
          auto_hide_after_departure: boolean | null
          completion_percentage: number | null
          concerns: Json | null
          created_at: string | null
          current_phase: string | null
          departure_date: string | null
          hide_days_after_departure: number | null
          id: string
          is_enabled: boolean | null
          last_milestone_reached: string | null
          motivation: string | null
          transition_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          auto_hide_after_departure?: boolean | null
          completion_percentage?: number | null
          concerns?: Json | null
          created_at?: string | null
          current_phase?: string | null
          departure_date?: string | null
          hide_days_after_departure?: number | null
          id?: string
          is_enabled?: boolean | null
          last_milestone_reached?: string | null
          motivation?: string | null
          transition_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          auto_hide_after_departure?: boolean | null
          completion_percentage?: number | null
          concerns?: Json | null
          created_at?: string | null
          current_phase?: string | null
          departure_date?: string | null
          hide_days_after_departure?: number | null
          id?: string
          is_enabled?: boolean | null
          last_milestone_reached?: string | null
          motivation?: string | null
          transition_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transition_rooms: {
        Row: {
          completion_percentage: number | null
          created_at: string | null
          decided_items: number | null
          id: string
          name: string
          profile_id: string
          room_type: string
          status: string
          total_items: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string | null
          decided_items?: number | null
          id?: string
          name: string
          profile_id: string
          room_type?: string
          status?: string
          total_items?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string | null
          decided_items?: number | null
          id?: string
          name?: string
          profile_id?: string
          room_type?: string
          status?: string
          total_items?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transition_services: {
        Row: {
          account_number: string | null
          cancellation_completed: boolean | null
          cancellation_completed_date: string | null
          cancellation_target_date: string | null
          category: string
          consolidation_status: string | null
          created_at: string | null
          documents_scanned: number | null
          documents_total: number | null
          id: string
          new_account_info: string | null
          notes: string | null
          old_account_info: string | null
          priority: string | null
          profile_id: string
          provider: string | null
          service_name: string
          service_type: string
          status: string
          storage_location: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_number?: string | null
          cancellation_completed?: boolean | null
          cancellation_completed_date?: string | null
          cancellation_target_date?: string | null
          category: string
          consolidation_status?: string | null
          created_at?: string | null
          documents_scanned?: number | null
          documents_total?: number | null
          id?: string
          new_account_info?: string | null
          notes?: string | null
          old_account_info?: string | null
          priority?: string | null
          profile_id: string
          provider?: string | null
          service_name: string
          service_type: string
          status?: string
          storage_location?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_number?: string | null
          cancellation_completed?: boolean | null
          cancellation_completed_date?: string | null
          cancellation_target_date?: string | null
          category?: string
          consolidation_status?: string | null
          created_at?: string | null
          documents_scanned?: number | null
          documents_total?: number | null
          id?: string
          new_account_info?: string | null
          notes?: string | null
          old_account_info?: string | null
          priority?: string | null
          profile_id?: string
          provider?: string | null
          service_name?: string
          service_type?: string
          status?: string
          storage_location?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transition_tasks: {
        Row: {
          actual_completion_date: string | null
          blocks_task_ids: string[] | null
          category: string
          checklist_items: Json | null
          completed_at: string | null
          completed_by_user_id: string | null
          created_at: string | null
          days_before_departure: number | null
          depends_on_task_ids: string[] | null
          description: string | null
          estimated_hours: number | null
          id: string
          is_completed: boolean | null
          is_system_task: boolean | null
          milestone: string | null
          notes: string | null
          priority: string | null
          profile_id: string
          resources: Json | null
          suggested_completion_date: string | null
          suggested_start_date: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_completion_date?: string | null
          blocks_task_ids?: string[] | null
          category: string
          checklist_items?: Json | null
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string | null
          days_before_departure?: number | null
          depends_on_task_ids?: string[] | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          is_completed?: boolean | null
          is_system_task?: boolean | null
          milestone?: string | null
          notes?: string | null
          priority?: string | null
          profile_id: string
          resources?: Json | null
          suggested_completion_date?: string | null
          suggested_start_date?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_completion_date?: string | null
          blocks_task_ids?: string[] | null
          category?: string
          checklist_items?: Json | null
          completed_at?: string | null
          completed_by_user_id?: string | null
          created_at?: string | null
          days_before_departure?: number | null
          depends_on_task_ids?: string[] | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          is_completed?: boolean | null
          is_system_task?: boolean | null
          milestone?: string | null
          notes?: string | null
          priority?: string | null
          profile_id?: string
          resources?: Json | null
          suggested_completion_date?: string | null
          suggested_start_date?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transition_timeline: {
        Row: {
          celebration_message: string | null
          completed_at: string | null
          created_at: string | null
          custom_icon: string | null
          description: string | null
          id: string
          is_completed: boolean | null
          is_system_milestone: boolean | null
          milestone_date: string
          milestone_name: string
          milestone_type: string
          profile_id: string
          tasks_associated_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          celebration_message?: string | null
          completed_at?: string | null
          created_at?: string | null
          custom_icon?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          is_system_milestone?: boolean | null
          milestone_date: string
          milestone_name: string
          milestone_type: string
          profile_id: string
          tasks_associated_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          celebration_message?: string | null
          completed_at?: string | null
          created_at?: string | null
          custom_icon?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          is_system_milestone?: boolean | null
          milestone_date?: string
          milestone_name?: string
          milestone_type?: string
          profile_id?: string
          tasks_associated_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transition_vehicle_mods: {
        Row: {
          actual_cost: number | null
          category: string
          completion_date: string | null
          created_at: string | null
          dependencies: string[] | null
          description: string | null
          diy_feasible: boolean | null
          estimated_cost: number | null
          id: string
          name: string
          notes: string | null
          photo_urls: string[] | null
          priority: string
          profile_id: string
          status: string
          time_required_hours: number | null
          updated_at: string | null
          vendor_links: Json | null
        }
        Insert: {
          actual_cost?: number | null
          category: string
          completion_date?: string | null
          created_at?: string | null
          dependencies?: string[] | null
          description?: string | null
          diy_feasible?: boolean | null
          estimated_cost?: number | null
          id?: string
          name: string
          notes?: string | null
          photo_urls?: string[] | null
          priority?: string
          profile_id: string
          status?: string
          time_required_hours?: number | null
          updated_at?: string | null
          vendor_links?: Json | null
        }
        Update: {
          actual_cost?: number | null
          category?: string
          completion_date?: string | null
          created_at?: string | null
          dependencies?: string[] | null
          description?: string | null
          diy_feasible?: boolean | null
          estimated_cost?: number | null
          id?: string
          name?: string
          notes?: string | null
          photo_urls?: string[] | null
          priority?: string
          profile_id?: string
          status?: string
          time_required_hours?: number | null
          updated_at?: string | null
          vendor_links?: Json | null
        }
        Relationships: []
      }
      transition_vehicles: {
        Row: {
          acquisition_date: string | null
          acquisition_status: string | null
          created_at: string | null
          id: string
          images: string[] | null
          is_primary_vehicle: boolean | null
          is_road_ready: boolean | null
          make: string | null
          model: string | null
          modifications: Json | null
          notes: string | null
          profile_id: string
          purchase_price: number | null
          ready_date: string | null
          total_modification_cost: number | null
          updated_at: string | null
          user_id: string
          vehicle_type: string
          year: number | null
        }
        Insert: {
          acquisition_date?: string | null
          acquisition_status?: string | null
          created_at?: string | null
          id?: string
          images?: string[] | null
          is_primary_vehicle?: boolean | null
          is_road_ready?: boolean | null
          make?: string | null
          model?: string | null
          modifications?: Json | null
          notes?: string | null
          profile_id: string
          purchase_price?: number | null
          ready_date?: string | null
          total_modification_cost?: number | null
          updated_at?: string | null
          user_id: string
          vehicle_type: string
          year?: number | null
        }
        Update: {
          acquisition_date?: string | null
          acquisition_status?: string | null
          created_at?: string | null
          id?: string
          images?: string[] | null
          is_primary_vehicle?: boolean | null
          is_road_ready?: boolean | null
          make?: string | null
          model?: string | null
          modifications?: Json | null
          notes?: string | null
          profile_id?: string
          purchase_price?: number | null
          ready_date?: string | null
          total_modification_cost?: number | null
          updated_at?: string | null
          user_id?: string
          vehicle_type?: string
          year?: number | null
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
        Relationships: []
      }
      trip_comment_helpful: {
        Row: {
          comment_id: string | null
          created_at: string | null
          id: string
          is_helpful: boolean
          user_id: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          is_helpful: boolean
          user_id?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          is_helpful?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      trip_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          currency: string | null
          description: string | null
          expense_date: string
          id: string
          location: string | null
          payment_method: string | null
          receipt_url: string | null
          tags: string[] | null
          trip_id: string | null
          updated_at: string | null
          user_id: string | null
          vendor: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          expense_date: string
          id?: string
          location?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          tags?: string[] | null
          trip_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          location?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          tags?: string[] | null
          trip_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          vendor?: string | null
        }
        Relationships: []
      }
      trip_locations: {
        Row: {
          amenities: Json | null
          collected_at: string | null
          contact_info: Json | null
          country: string | null
          created_at: string | null
          data_source: string | null
          data_sources: Json | null
          id: string
          is_free: boolean | null
          latitude: number
          location_hash: string | null
          longitude: number
          name: string
          photo_confidence: string | null
          photo_search_query: string | null
          photo_search_url: string | null
          photo_source: string | null
          photo_stored: boolean | null
          photo_url: string | null
          quality_score: number | null
          rating: number | null
          review_count: number | null
          source_id: string | null
          state_province: string | null
          updated_at: string | null
          verification_date: string | null
          verification_source: string | null
          verified: boolean | null
        }
        Insert: {
          amenities?: Json | null
          collected_at?: string | null
          contact_info?: Json | null
          country?: string | null
          created_at?: string | null
          data_source?: string | null
          data_sources?: Json | null
          id?: string
          is_free?: boolean | null
          latitude: number
          location_hash?: string | null
          longitude: number
          name: string
          photo_confidence?: string | null
          photo_search_query?: string | null
          photo_search_url?: string | null
          photo_source?: string | null
          photo_stored?: boolean | null
          photo_url?: string | null
          quality_score?: number | null
          rating?: number | null
          review_count?: number | null
          source_id?: string | null
          state_province?: string | null
          updated_at?: string | null
          verification_date?: string | null
          verification_source?: string | null
          verified?: boolean | null
        }
        Update: {
          amenities?: Json | null
          collected_at?: string | null
          contact_info?: Json | null
          country?: string | null
          created_at?: string | null
          data_source?: string | null
          data_sources?: Json | null
          id?: string
          is_free?: boolean | null
          latitude?: number
          location_hash?: string | null
          longitude?: number
          name?: string
          photo_confidence?: string | null
          photo_search_query?: string | null
          photo_search_url?: string | null
          photo_source?: string | null
          photo_stored?: boolean | null
          photo_url?: string | null
          quality_score?: number | null
          rating?: number | null
          review_count?: number | null
          source_id?: string | null
          state_province?: string | null
          updated_at?: string | null
          verification_date?: string | null
          verification_source?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      trip_routes: {
        Row: {
          created_at: string | null
          distance_km: number | null
          end_location: string | null
          estimated_duration_hours: number | null
          id: string
          route_data: Json | null
          route_name: string
          route_order: number | null
          start_location: string | null
          trip_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          distance_km?: number | null
          end_location?: string | null
          estimated_duration_hours?: number | null
          id?: string
          route_data?: Json | null
          route_name: string
          route_order?: number | null
          start_location?: string | null
          trip_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          distance_km?: number | null
          end_location?: string | null
          estimated_duration_hours?: number | null
          id?: string
          route_data?: Json | null
          route_name?: string
          route_order?: number | null
          start_location?: string | null
          trip_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      trip_scraper_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          parameters: Json | null
          region: string | null
          results: Json | null
          source_url: string | null
          started_at: string | null
          status: string
          templates_created: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          parameters?: Json | null
          region?: string | null
          results?: Json | null
          source_url?: string | null
          started_at?: string | null
          status?: string
          templates_created?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          parameters?: Json | null
          region?: string | null
          results?: Json | null
          source_url?: string | null
          started_at?: string | null
          status?: string
          templates_created?: number | null
        }
        Relationships: []
      }
      trip_scraper_results: {
        Row: {
          ai_enhanced: boolean | null
          created_at: string | null
          id: string
          images_found: string[] | null
          import_status: string | null
          job_id: string | null
          processed_data: Json | null
          quality_score: number | null
          raw_data: Json | null
          source_id: string | null
          template_data: Json | null
        }
        Insert: {
          ai_enhanced?: boolean | null
          created_at?: string | null
          id?: string
          images_found?: string[] | null
          import_status?: string | null
          job_id?: string | null
          processed_data?: Json | null
          quality_score?: number | null
          raw_data?: Json | null
          source_id?: string | null
          template_data?: Json | null
        }
        Update: {
          ai_enhanced?: boolean | null
          created_at?: string | null
          id?: string
          images_found?: string[] | null
          import_status?: string | null
          job_id?: string | null
          processed_data?: Json | null
          quality_score?: number | null
          raw_data?: Json | null
          source_id?: string | null
          template_data?: Json | null
        }
        Relationships: []
      }
      trip_scraper_sources: {
        Row: {
          api_config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_scraped_at: string | null
          name: string
          rate_limit: number | null
          selectors: Json | null
          source_type: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          api_config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_scraped_at?: string | null
          name: string
          rate_limit?: number | null
          selectors?: Json | null
          source_type?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          api_config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_scraped_at?: string | null
          name?: string
          rate_limit?: number | null
          selectors?: Json | null
          source_type?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      trip_shares: {
        Row: {
          created_at: string | null
          id: string
          permission: string | null
          shared_by: string
          shared_with: string
          trip_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission?: string | null
          shared_by: string
          shared_with: string
          trip_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission?: string | null
          shared_by?: string
          shared_with?: string
          trip_id?: string
        }
        Relationships: []
      }
      trip_template_comments: {
        Row: {
          comment_type: string
          content: string
          created_at: string | null
          helpful_count: number | null
          id: string
          is_verified: boolean | null
          location: string | null
          location_name: string | null
          parent_id: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          comment_type: string
          content: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_verified?: boolean | null
          location?: string | null
          location_name?: string | null
          parent_id?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          comment_type?: string
          content?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_verified?: boolean | null
          location?: string | null
          location_name?: string | null
          parent_id?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      trip_template_images: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_primary: boolean | null
          source: string | null
          template_id: string | null
          thumbnail_url: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          source?: string | null
          template_id?: string | null
          thumbnail_url?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          source?: string | null
          template_id?: string | null
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      trip_template_ratings: {
        Row: {
          created_at: string | null
          id: string
          rating: number
          template_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          rating: number
          template_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          rating?: number
          template_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      trip_templates: {
        Row: {
          amenities: Json | null
          average_rating: number | null
          camping_type: string | null
          category: string
          collected_at: string | null
          country: string | null
          created_at: string
          data_source: string | null
          description: string | null
          difficulty_level: string | null
          estimated_duration: number | null
          id: string
          is_featured: boolean | null
          is_free: boolean | null
          is_public: boolean
          media_urls: Json | null
          name: string
          source_id: string | null
          status: string | null
          tags: string[] | null
          template_data: Json
          template_type: string | null
          total_ratings: number | null
          updated_at: string
          usage_count: number
          user_id: string | null
          waypoints: Json | null
        }
        Insert: {
          amenities?: Json | null
          average_rating?: number | null
          camping_type?: string | null
          category?: string
          collected_at?: string | null
          country?: string | null
          created_at?: string
          data_source?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_duration?: number | null
          id?: string
          is_featured?: boolean | null
          is_free?: boolean | null
          is_public?: boolean
          media_urls?: Json | null
          name: string
          source_id?: string | null
          status?: string | null
          tags?: string[] | null
          template_data: Json
          template_type?: string | null
          total_ratings?: number | null
          updated_at?: string
          usage_count?: number
          user_id?: string | null
          waypoints?: Json | null
        }
        Update: {
          amenities?: Json | null
          average_rating?: number | null
          camping_type?: string | null
          category?: string
          collected_at?: string | null
          country?: string | null
          created_at?: string
          data_source?: string | null
          description?: string | null
          difficulty_level?: string | null
          estimated_duration?: number | null
          id?: string
          is_featured?: boolean | null
          is_free?: boolean | null
          is_public?: boolean
          media_urls?: Json | null
          name?: string
          source_id?: string | null
          status?: string | null
          tags?: string[] | null
          template_data?: Json
          template_type?: string | null
          total_ratings?: number | null
          updated_at?: string
          usage_count?: number
          user_id?: string | null
          waypoints?: Json | null
        }
        Relationships: []
      }
      trip_waypoints: {
        Row: {
          actual_arrival: string | null
          actual_departure: string | null
          created_at: string | null
          description: string | null
          id: string
          location: string
          name: string
          notes: string | null
          planned_arrival: string | null
          planned_departure: string | null
          rating: number | null
          route_id: string | null
          updated_at: string | null
          user_id: string | null
          visit_duration_minutes: number | null
          waypoint_order: number
          waypoint_type: string | null
        }
        Insert: {
          actual_arrival?: string | null
          actual_departure?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location: string
          name: string
          notes?: string | null
          planned_arrival?: string | null
          planned_departure?: string | null
          rating?: number | null
          route_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          visit_duration_minutes?: number | null
          waypoint_order: number
          waypoint_type?: string | null
        }
        Update: {
          actual_arrival?: string | null
          actual_departure?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string
          name?: string
          notes?: string | null
          planned_arrival?: string | null
          planned_departure?: string | null
          rating?: number | null
          route_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          visit_duration_minutes?: number | null
          waypoint_order?: number
          waypoint_type?: string | null
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
          user_id?: string
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
      usage_events: {
        Row: {
          cost_estimate: number | null
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          timestamp?: string | null
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
          ip_address: string | null
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
          ip_address?: string | null
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
          ip_address?: string | null
          is_current?: boolean | null
          last_activity?: string | null
          location_info?: Json | null
          session_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          first_seen: string
          last_seen: string
          lifetime_cost_estimate: number | null
          total_sessions: number | null
          total_tool_calls: number | null
          total_voice_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          first_seen: string
          last_seen: string
          lifetime_cost_estimate?: number | null
          total_sessions?: number | null
          total_tool_calls?: number | null
          total_voice_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          first_seen?: string
          last_seen?: string
          lifetime_cost_estimate?: number | null
          total_sessions?: number | null
          total_tool_calls?: number | null
          total_voice_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_budget_preferences: {
        Row: {
          alert_threshold: number | null
          avoid_paid_camping: boolean | null
          created_at: string | null
          daily_camping_budget: number | null
          preferred_amenities: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_threshold?: number | null
          avoid_paid_camping?: boolean | null
          created_at?: string | null
          daily_camping_budget?: number | null
          preferred_amenities?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          alert_threshold?: number | null
          avoid_paid_camping?: boolean | null
          created_at?: string | null
          daily_camping_budget?: number | null
          preferred_amenities?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_camping_pain_points: {
        Row: {
          created_at: string | null
          description: string | null
          frequency: string | null
          id: string
          impact_level: number | null
          is_resolved: boolean | null
          pain_point_type: string
          severity: number | null
          solutions_tried: Json | null
          tags: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          impact_level?: number | null
          is_resolved?: boolean | null
          pain_point_type: string
          severity?: number | null
          solutions_tried?: Json | null
          tags?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          impact_level?: number | null
          is_resolved?: boolean | null
          pain_point_type?: string
          severity?: number | null
          solutions_tried?: Json | null
          tags?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_contribution_stats: {
        Row: {
          badges: Json | null
          created_at: string | null
          people_helped: number | null
          reputation_level: number | null
          reputation_points: number | null
          tips_shared: number | null
          total_tip_uses: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          badges?: Json | null
          created_at?: string | null
          people_helped?: number | null
          reputation_level?: number | null
          reputation_points?: number | null
          tips_shared?: number | null
          total_tip_uses?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          badges?: Json | null
          created_at?: string | null
          people_helped?: number | null
          reputation_level?: number | null
          reputation_points?: number | null
          tips_shared?: number | null
          total_tip_uses?: number | null
          updated_at?: string | null
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      user_launch_dates: {
        Row: {
          celebration_plans: string | null
          created_at: string
          emergency_contacts: Json | null
          first_destination: string | null
          id: string
          launch_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          celebration_plans?: string | null
          created_at?: string
          emergency_contacts?: Json | null
          first_destination?: string | null
          id?: string
          launch_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          celebration_plans?: string | null
          created_at?: string
          emergency_contacts?: Json | null
          first_destination?: string | null
          id?: string
          launch_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_launch_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          notes: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          notes?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: []
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
          ip_address: string | null
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
          ip_address?: string | null
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
          ip_address?: string | null
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
        Relationships: []
      }
      user_preferences: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          preference_key: string
          preference_value: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          preference_key: string
          preference_value: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          preference_key?: string
          preference_value?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles_extended: {
        Row: {
          achievements: Json | null
          avatar_url: string | null
          bio: string | null
          bucket_list: Json | null
          cover_image_url: string | null
          created_at: string | null
          favorite_destinations: string[] | null
          interests: string[] | null
          location: string | null
          preferences: Json | null
          rv_type: string | null
          social_links: Json | null
          statistics: Json | null
          travel_style: string | null
          updated_at: string | null
          user_id: string
          website: string | null
          years_of_experience: number | null
        }
        Insert: {
          achievements?: Json | null
          avatar_url?: string | null
          bio?: string | null
          bucket_list?: Json | null
          cover_image_url?: string | null
          created_at?: string | null
          favorite_destinations?: string[] | null
          interests?: string[] | null
          location?: string | null
          preferences?: Json | null
          rv_type?: string | null
          social_links?: Json | null
          statistics?: Json | null
          travel_style?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
          years_of_experience?: number | null
        }
        Update: {
          achievements?: Json | null
          avatar_url?: string | null
          bio?: string | null
          bucket_list?: Json | null
          cover_image_url?: string | null
          created_at?: string | null
          favorite_destinations?: string[] | null
          interests?: string[] | null
          location?: string | null
          preferences?: Json | null
          rv_type?: string | null
          social_links?: Json | null
          statistics?: Json | null
          travel_style?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
          years_of_experience?: number | null
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
        Relationships: []
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
          integration_preferences: Json | null
          location_preferences: Json | null
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
          integration_preferences?: Json | null
          location_preferences?: Json | null
          notification_preferences?: Json | null
          pam_preferences?: Json | null
          privacy_preferences?: Json | null
          regional_preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          display_preferences?: Json | null
          integration_preferences?: Json | null
          location_preferences?: Json | null
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
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_type: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
          video_course_access: boolean | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
          video_course_access?: boolean | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
          video_course_access?: boolean | null
        }
        Relationships: []
      }
      user_tags: {
        Row: {
          created_at: string
          id: string
          tag_category: string
          tag_value: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag_category: string
          tag_value: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag_category?: string
          tag_value?: string
          user_id?: string
        }
        Relationships: []
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
      user_trips: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          metadata: Json | null
          privacy_level: string | null
          spent_budget: number | null
          start_date: string | null
          status: string | null
          title: string
          total_budget: number | null
          trip_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          privacy_level?: string | null
          spent_budget?: number | null
          start_date?: string | null
          status?: string | null
          title: string
          total_budget?: number | null
          trip_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          metadata?: Json | null
          privacy_level?: string | null
          spent_budget?: number | null
          start_date?: string | null
          status?: string | null
          title?: string
          total_budget?: number | null
          trip_type?: string | null
          updated_at?: string | null
          user_id?: string | null
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
      user_wishlists: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          price: number | null
          priority: number | null
          product_id: string
          product_name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          price?: number | null
          priority?: number | null
          product_id: string
          product_name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          price?: number | null
          priority?: number | null
          product_id?: string
          product_name?: string
          updated_at?: string | null
          user_id?: string | null
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
      vehicles: {
        Row: {
          created_at: string | null
          engine_size: string | null
          fuel_capacity_gallons: number | null
          fuel_consumption_l_per_100km: number | null
          fuel_consumption_last_updated: string | null
          fuel_consumption_mpg: number | null
          fuel_consumption_sample_size: number | null
          fuel_consumption_source: string | null
          fuel_type: string | null
          id: string
          image_urls: string[] | null
          insurance_company: string | null
          insurance_expires: string | null
          insurance_policy: string | null
          is_primary: boolean | null
          license_plate: string | null
          make: string | null
          mileage_current: number | null
          mileage_purchased: number | null
          model: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          registration_expires: string | null
          specifications: Json | null
          transmission: string | null
          updated_at: string | null
          user_id: string | null
          vehicle_type: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          engine_size?: string | null
          fuel_capacity_gallons?: number | null
          fuel_consumption_l_per_100km?: number | null
          fuel_consumption_last_updated?: string | null
          fuel_consumption_mpg?: number | null
          fuel_consumption_sample_size?: number | null
          fuel_consumption_source?: string | null
          fuel_type?: string | null
          id?: string
          image_urls?: string[] | null
          insurance_company?: string | null
          insurance_expires?: string | null
          insurance_policy?: string | null
          is_primary?: boolean | null
          license_plate?: string | null
          make?: string | null
          mileage_current?: number | null
          mileage_purchased?: number | null
          model?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          registration_expires?: string | null
          specifications?: Json | null
          transmission?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_type?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          engine_size?: string | null
          fuel_capacity_gallons?: number | null
          fuel_consumption_l_per_100km?: number | null
          fuel_consumption_last_updated?: string | null
          fuel_consumption_mpg?: number | null
          fuel_consumption_sample_size?: number | null
          fuel_consumption_source?: string | null
          fuel_type?: string | null
          id?: string
          image_urls?: string[] | null
          insurance_company?: string | null
          insurance_expires?: string | null
          insurance_policy?: string | null
          is_primary?: boolean | null
          license_plate?: string | null
          make?: string | null
          mileage_current?: number | null
          mileage_purchased?: number | null
          model?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          registration_expires?: string | null
          specifications?: Json | null
          transmission?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_type?: string | null
          vin?: string | null
          year?: number | null
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
      budget_utilization: {
        Row: {
          budget_amount: number | null
          category: string | null
          id: string | null
          remaining_amount: number | null
          spent_amount: number | null
          user_id: string | null
          utilization_percentage: number | null
        }
        Relationships: []
      }
      latest_camping_updates: {
        Row: {
          availability_status: string | null
          camping_location_id: string | null
          conditions: string | null
          created_at: string | null
          crowd_level: string | null
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
      signup_health_check: {
        Row: {
          health_status: string | null
          hours_since_last_signup: number | null
          last_signup_time: string | null
          signups_last_24h: number | null
          signups_last_6h: number | null
          signups_last_hour: number | null
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
    }
    Functions: {
      admin_get_flagged_content: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      admin_get_users: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      auto_moderate_content: {
        Args: {
          content_id: string
          content_text: string
          content_type: string
        }
        Returns: unknown
      }
      basic_health_check: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      calculate_model_performance_score: {
        Args: {
          model_version_param: string
        }
        Returns: unknown
      }
      calculate_transition_completion: {
        Args: {
          p_profile_id: string
        }
        Returns: unknown
      }
      calculate_trust_score: {
        Args: {
          user_id: string
        }
        Returns: unknown
      }
      check_badge_eligibility: {
        Args: {
          p_user_id: string
        }
        Returns: unknown
      }
      check_failed_login_attempts: {
        Args: {
          p_email: string
          p_ip_address: string
        }
        Returns: unknown
      }
      check_rate_limit: {
        Args: {
          limit_count: number
          user_id: string
          window_start: string
        }
        Returns: unknown
      }
      check_user_admin_status: {
        Args: {
          check_user_id: string
        }
        Returns: unknown
      }
      check_user_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      check_user_is_admin_from_jwt: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      cleanup_expired_audio_cache: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      cleanup_expired_pam_memory: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      create_audit_log: {
        Args: {
          p_action: string
          p_new_values: Json
          p_old_values: Json
          p_resource_id: string
          p_resource_type: string
          p_user_id: string
        }
        Returns: unknown
      }
      create_default_income_streams: {
        Args: {
          p_profile_id: string
          p_user_id: string
        }
        Returns: unknown
      }
      create_default_rooms: {
        Args: {
          p_profile_id: string
          p_user_id: string
        }
        Returns: unknown
      }
      create_default_services: {
        Args: {
          p_profile_id: string
          p_user_id: string
        }
        Returns: unknown
      }
      create_default_transition_tasks: {
        Args: {
          p_departure_date: string
          p_profile_id: string
          p_user_id: string
        }
        Returns: unknown
      }
      debug_auth_state: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      determine_transition_phase: {
        Args: {
          p_departure_date: string
        }
        Returns: unknown
      }
      find_similar_users: {
        Args: {
          p_limit: number
          p_user_id: string
        }
        Returns: unknown
      }
      generate_location_hash: {
        Args: {
          lat: number
          lng: number
        }
        Returns: unknown
      }
      generate_training_dataset: {
        Args: {
          dataset_name_param: string
          domain_focus_param: string
          quality_threshold_param: number
        }
        Returns: unknown
      }
      get_community_stats: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      get_conversation_history: {
        Args: {
          p_limit: number
          p_user_id: string
        }
        Returns: unknown
      }
      get_days_until_launch: {
        Args: {
          p_user_id: string
        }
        Returns: unknown
      }
      get_downsizing_stats: {
        Args: {
          p_profile_id: string
        }
        Returns: unknown
      }
      get_equipment_stats: {
        Args: {
          p_user_id: string
        }
        Returns: unknown
      }
      get_income_stats: {
        Args: {
          p_profile_id: string
        }
        Returns: unknown
      }
      get_launch_week_progress: {
        Args: {
          p_user_id: string
        }
        Returns: unknown
      }
      get_mood_trends: {
        Args: {
          p_days: number
          p_user_id: string
        }
        Returns: unknown
      }
      get_nearby_recommendations: {
        Args: {
          limit_count: number
          radius_miles: number
          user_lat: number
          user_lng: number
        }
        Returns: unknown
      }
      get_next_event_sequence: {
        Args: {
          p_session_id: string
        }
        Returns: unknown
      }
      get_or_create_pam_conversation: {
        Args: {
          p_context: Json
          p_session_id: string
          p_user_id: string
        }
        Returns: unknown
      }
      get_partner_alignment_stats: {
        Args: {
          p_user_id: string
        }
        Returns: unknown
      }
      get_service_stats: {
        Args: {
          p_profile_id: string
        }
        Returns: unknown
      }
      get_shakedown_stats: {
        Args: {
          p_user_id: string
        }
        Returns: unknown
      }
      get_transition_profile: {
        Args: {
          p_user_id: string
        }
        Returns: unknown
      }
      get_user_connection_stats: {
        Args: {
          p_user_id: string
        }
        Returns: unknown
      }
      get_user_contribution_stats: {
        Args: {
          p_user_id: string
        }
        Returns: unknown
      }
      get_user_id_from_auth: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      get_user_preferences: {
        Args: {
          p_user_id: string
        }
        Returns: unknown
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      get_vehicle_mod_stats: {
        Args: {
          p_user_id: string
        }
        Returns: unknown
      }
      increment_product_clicks: {
        Args: {
          product_uuid: string
        }
        Returns: unknown
      }
      increment_template_usage: {
        Args: {
          template_id: string
        }
        Returns: unknown
      }
      insert_agent_log: {
        Args: {
          p_confidence_score: number
          p_error_message: string
          p_input_type: string
          p_intent: string
          p_message: string
          p_metadata: Json
          p_response: string
          p_response_time_ms: number
          p_session_id: string
          p_tools_used: Json
          p_user_id: string
        }
        Returns: unknown
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      is_trip_participant: {
        Args: {
          p_trip_id: string
          p_user_id: string
        }
        Returns: unknown
      }
      log_security_event: {
        Args: {
          p_event_type: string
          p_metadata: Json
          p_severity: string
          p_user_id: string
        }
        Returns: unknown
      }
      process_rl_events: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      search_community_tips: {
        Args: {
          p_category: string
          p_limit: number
          p_query: string
        }
        Returns: unknown
      }
      search_knowledge_chunks: {
        Args: {
          match_count: number
          query_embedding: string
          similarity_threshold: number
          user_id: string
        }
        Returns: unknown
      }
      search_memories: {
        Args: {
          match_count: number
          match_threshold: number
          match_user_id: string
          query_embedding: string
        }
        Returns: unknown
      }
      search_sessions: {
        Args: {
          match_count: number
          match_threshold: number
          match_user_id: string
          query_embedding: string
        }
        Returns: unknown
      }
      seed_default_drawers: {
        Args: {
          user_id: string
        }
        Returns: unknown
      }
      some_function: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      start_transition_profile: {
        Args: {
          p_departure_date: string
          p_is_enabled: boolean
        }
        Returns: unknown
      }
      store_pam_message: {
        Args: {
          p_confidence: number
          p_content: string
          p_conversation_id: string
          p_entities: Json
          p_intent: string
          p_metadata: Json
          p_role: string
        }
        Returns: unknown
      }
      store_user_context: {
        Args: {
          p_confidence: number
          p_context_type: string
          p_key: string
          p_source: string
          p_user_id: string
          p_value: Json
        }
        Returns: unknown
      }
      test_jwt_admin_role_fix: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      update_memory_access: {
        Args: {
          memory_id: string
        }
        Returns: unknown
      }
      validate_jwt_admin_fix_final: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      validate_jwt_admin_fix_type_safe: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      verify_pam_permissions: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      verify_rls_policies: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      verify_security_definer_functions: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
    Enums: {
      affiliate_products_affiliate_provider: "amazon" | "ebay" | "custom"
      affiliate_products_category: "recovery_gear" | "camping_expedition" | "tools_maintenance" | "parts_upgrades" | "books_manuals" | "apparel_merchandise" | "electronics" | "outdoor_gear"
      medical_records_type: "document" | "lab_result" | "prescription" | "insurance_card" | "doctor_note" | "vaccination" | "imaging" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
