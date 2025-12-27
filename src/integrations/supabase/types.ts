export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      active_sessions: {
        Row: {
          created_at: string | null
          device_id: string | null
          device_type: string | null
          id: string
          ip_address: unknown
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_email_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_id: string | null
          event_type: string
          id: string
          message: string
          recipient_email: string
          status: string | null
          subject: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          message: string
          recipient_email: string
          status?: string | null
          subject: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          message?: string
          recipient_email?: string
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      admin_email_preferences: {
        Row: {
          admin_user_id: string | null
          created_at: string | null
          email: string
          enabled: boolean | null
          id: string
          notify_error: boolean | null
          notify_feedback: boolean | null
          notify_new_comment: boolean | null
          notify_new_listing: boolean | null
          notify_new_message: boolean | null
          notify_new_post: boolean | null
          notify_new_user: boolean | null
          notify_payment: boolean | null
          notify_trip: boolean | null
          updated_at: string | null
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string | null
          email: string
          enabled?: boolean | null
          id?: string
          notify_error?: boolean | null
          notify_feedback?: boolean | null
          notify_new_comment?: boolean | null
          notify_new_listing?: boolean | null
          notify_new_message?: boolean | null
          notify_new_post?: boolean | null
          notify_new_user?: boolean | null
          notify_payment?: boolean | null
          notify_trip?: boolean | null
          updated_at?: string | null
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string | null
          email?: string
          enabled?: boolean | null
          id?: string
          notify_error?: boolean | null
          notify_feedback?: boolean | null
          notify_new_comment?: boolean | null
          notify_new_listing?: boolean | null
          notify_new_message?: boolean | null
          notify_new_post?: boolean | null
          notify_new_user?: boolean | null
          notify_payment?: boolean | null
          notify_trip?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_sms_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_id: string | null
          event_type: string
          id: string
          message: string
          phone_number: string
          status: string | null
          twilio_sid: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          message: string
          phone_number: string
          status?: string | null
          twilio_sid?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          message?: string
          phone_number?: string
          status?: string | null
          twilio_sid?: string | null
        }
        Relationships: []
      }
      admin_sms_preferences: {
        Row: {
          admin_user_id: string | null
          created_at: string | null
          enabled: boolean | null
          id: string
          notify_error: boolean | null
          notify_feedback: boolean | null
          notify_new_comment: boolean | null
          notify_new_listing: boolean | null
          notify_new_message: boolean | null
          notify_new_post: boolean | null
          notify_new_user: boolean | null
          notify_payment: boolean | null
          notify_trip: boolean | null
          phone_number: string
          updated_at: string | null
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          notify_error?: boolean | null
          notify_feedback?: boolean | null
          notify_new_comment?: boolean | null
          notify_new_listing?: boolean | null
          notify_new_message?: boolean | null
          notify_new_post?: boolean | null
          notify_new_user?: boolean | null
          notify_payment?: boolean | null
          notify_trip?: boolean | null
          phone_number: string
          updated_at?: string | null
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          notify_error?: boolean | null
          notify_feedback?: boolean | null
          notify_new_comment?: boolean | null
          notify_new_listing?: boolean | null
          notify_new_message?: boolean | null
          notify_new_post?: boolean | null
          notify_new_user?: boolean | null
          notify_payment?: boolean | null
          notify_trip?: boolean | null
          phone_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      affiliate_product_clicks: {
        Row: {
          clicked_at: string | null
          id: string
          ip_address: unknown
          product_id: string | null
          referrer: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          clicked_at?: string | null
          id?: string
          ip_address?: unknown
          product_id?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_at?: string | null
          id?: string
          ip_address?: unknown
          product_id?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_product_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "affiliate_products"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_products: {
        Row: {
          additional_images: string[] | null
          affiliate_provider: Database["public"]["Enums"]["affiliate_provider"]
          affiliate_url: string
          asin: string | null
          category: Database["public"]["Enums"]["product_category"]
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
          price: number | null
          regional_asins: Json | null
          regional_prices: Json | null
          regional_urls: Json | null
          short_description: string | null
          sort_order: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          additional_images?: string[] | null
          affiliate_provider: Database["public"]["Enums"]["affiliate_provider"]
          affiliate_url: string
          asin?: string | null
          category: Database["public"]["Enums"]["product_category"]
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
          price?: number | null
          regional_asins?: Json | null
          regional_prices?: Json | null
          regional_urls?: Json | null
          short_description?: string | null
          sort_order?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          additional_images?: string[] | null
          affiliate_provider?: Database["public"]["Enums"]["affiliate_provider"]
          affiliate_url?: string
          asin?: string | null
          category?: Database["public"]["Enums"]["product_category"]
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
          price?: number | null
          regional_asins?: Json | null
          regional_prices?: Json | null
          regional_urls?: Json | null
          short_description?: string | null
          sort_order?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      aggregated_content: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          created_at: string | null
          description: string | null
          difficulty_level: string | null
          distance_km: number | null
          elevation_gain_m: number | null
          featured_image_url: string | null
          feed_id: string | null
          gpx_file_url: string | null
          guid: string | null
          id: string
          latitude: number | null
          likes_count: number | null
          longitude: number | null
          published_at: string | null
          saves_count: number | null
          tags: string[] | null
          title: string
          track_points_count: number | null
          updated_at: string | null
          url: string
          views_count: number | null
          waypoints_count: number | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          distance_km?: number | null
          elevation_gain_m?: number | null
          featured_image_url?: string | null
          feed_id?: string | null
          gpx_file_url?: string | null
          guid?: string | null
          id?: string
          latitude?: number | null
          likes_count?: number | null
          longitude?: number | null
          published_at?: string | null
          saves_count?: number | null
          tags?: string[] | null
          title: string
          track_points_count?: number | null
          updated_at?: string | null
          url: string
          views_count?: number | null
          waypoints_count?: number | null
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          distance_km?: number | null
          elevation_gain_m?: number | null
          featured_image_url?: string | null
          feed_id?: string | null
          gpx_file_url?: string | null
          guid?: string | null
          id?: string
          latitude?: number | null
          likes_count?: number | null
          longitude?: number | null
          published_at?: string | null
          saves_count?: number | null
          tags?: string[] | null
          title?: string
          track_points_count?: number | null
          updated_at?: string | null
          url?: string
          views_count?: number | null
          waypoints_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "aggregated_content_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "rss_feeds"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_config: {
        Row: {
          api_key_env_var: string
          created_at: string | null
          created_by: string | null
          fallback_model: string | null
          fallback_provider: string | null
          id: string
          is_active: boolean | null
          last_modified_by: string | null
          max_tokens: number | null
          model_name: string
          provider: string
          service_name: string
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          api_key_env_var: string
          created_at?: string | null
          created_by?: string | null
          fallback_model?: string | null
          fallback_provider?: string | null
          id?: string
          is_active?: boolean | null
          last_modified_by?: string | null
          max_tokens?: number | null
          model_name: string
          provider: string
          service_name: string
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          api_key_env_var?: string
          created_at?: string | null
          created_by?: string | null
          fallback_model?: string | null
          fallback_provider?: string | null
          id?: string
          is_active?: boolean | null
          last_modified_by?: string | null
          max_tokens?: number | null
          model_name?: string
          provider?: string
          service_name?: string
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_routing_logs: {
        Row: {
          created_at: string | null
          error_text: string | null
          estimated_cost_class: string | null
          id: string
          input_tokens: number | null
          latency_ms: number | null
          output_tokens: number | null
          reason: string | null
          route_model: string
          route_provider: string
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_text?: string | null
          estimated_cost_class?: string | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          output_tokens?: number | null
          reason?: string | null
          route_model: string
          route_provider: string
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_text?: string | null
          estimated_cost_class?: string | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          output_tokens?: number | null
          reason?: string | null
          route_model?: string
          route_provider?: string
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      amazon_products: {
        Row: {
          amazon_url: string
          asin: string
          category: string
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          price: number
          sort_order: number
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          amazon_url: string
          asin: string
          category: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          price: number
          sort_order?: number
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          amazon_url?: string
          asin?: string
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          price?: number
          sort_order?: number
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      answer_cache: {
        Row: {
          component_name: string | null
          content: string
          expires_at: string
          id: number
          refs: Json
          signature: string
          task: string
          updated_at: string | null
        }
        Insert: {
          component_name?: string | null
          content: string
          expires_at: string
          id?: number
          refs: Json
          signature: string
          task: string
          updated_at?: string | null
        }
        Update: {
          component_name?: string | null
          content?: string
          expires_at?: string
          id?: number
          refs?: Json
          signature?: string
          task?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      attribute_synonyms: {
        Row: {
          approved_by: string | null
          attribute_id: string
          confidence: number | null
          created_at: string | null
          id: string
          lang: string | null
          synonym: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          attribute_id: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          lang?: string | null
          synonym: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          attribute_id?: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          lang?: string | null
          synonym?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attribute_synonyms_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      attributes: {
        Row: {
          created_at: string | null
          id: string
          meta: Json | null
          name: string
          unit_hint: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meta?: Json | null
          name: string
          unit_hint?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meta?: Json | null
          name?: string
          unit_hint?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      barry_knowledge_base: {
        Row: {
          aliases: string[] | null
          barry_response_template: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          manual_references: Json
          norm_keywords: string[] | null
          priority: number | null
          question_keywords: string[]
          search_fts: unknown
          search_priority: number | null
          updated_at: string | null
        }
        Insert: {
          aliases?: string[] | null
          barry_response_template?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manual_references?: Json
          norm_keywords?: string[] | null
          priority?: number | null
          question_keywords: string[]
          search_fts?: unknown
          search_priority?: number | null
          updated_at?: string | null
        }
        Update: {
          aliases?: string[] | null
          barry_response_template?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manual_references?: Json
          norm_keywords?: string[] | null
          priority?: number | null
          question_keywords?: string[]
          search_fts?: unknown
          search_priority?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      barry_learned_responses: {
        Row: {
          barry_response: string
          confidence_score: number | null
          created_at: string | null
          extracted_pdf_content: string | null
          id: string
          last_used_at: string | null
          manual_references: Json | null
          original_query: string
          query_embedding: string
          similar_queries: string[] | null
          usage_count: number | null
        }
        Insert: {
          barry_response: string
          confidence_score?: number | null
          created_at?: string | null
          extracted_pdf_content?: string | null
          id?: string
          last_used_at?: string | null
          manual_references?: Json | null
          original_query: string
          query_embedding: string
          similar_queries?: string[] | null
          usage_count?: number | null
        }
        Update: {
          barry_response?: string
          confidence_score?: number | null
          created_at?: string | null
          extracted_pdf_content?: string | null
          id?: string
          last_used_at?: string | null
          manual_references?: Json | null
          original_query?: string
          query_embedding?: string
          similar_queries?: string[] | null
          usage_count?: number | null
        }
        Relationships: []
      }
      barry_personality_templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          system_category: string | null
          template_text: string
          template_type: string
          usage_weight: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          system_category?: string | null
          template_text: string
          template_type: string
          usage_weight?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          system_category?: string | null
          template_text?: string
          template_type?: string
          usage_weight?: number | null
        }
        Relationships: []
      }
      barry_search_analytics: {
        Row: {
          created_at: string | null
          id: string
          normalized_query: string
          response_time_ms: number | null
          results_count: number | null
          search_stage: string
          top_match_source: string | null
          top_match_term: string | null
          user_id: string | null
          user_query: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          normalized_query: string
          response_time_ms?: number | null
          results_count?: number | null
          search_stage: string
          top_match_source?: string | null
          top_match_term?: string | null
          user_id?: string | null
          user_query: string
        }
        Update: {
          created_at?: string | null
          id?: string
          normalized_query?: string
          response_time_ms?: number | null
          results_count?: number | null
          search_stage?: string
          top_match_source?: string | null
          top_match_term?: string | null
          user_id?: string | null
          user_query?: string
        }
        Relationships: []
      }
      barry_validated_answers: {
        Row: {
          answer: string
          created_at: string | null
          id: string
          manual_references: Json | null
          question: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          manual_references?: Json | null
          question: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          manual_references?: Json | null
          question?: string
          user_id?: string
        }
        Relationships: []
      }
      blocked_emails: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          email: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          email: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          email?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      canonical_access_logs: {
        Row: {
          created_at: string | null
          endpoint: string
          entity_type: string | null
          error_text: string | null
          id: string
          identifier: string | null
          ip: string | null
          query: string | null
          status_code: number | null
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          entity_type?: string | null
          error_text?: string | null
          id?: string
          identifier?: string | null
          ip?: string | null
          query?: string | null
          status_code?: number | null
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          entity_type?: string | null
          error_text?: string | null
          id?: string
          identifier?: string | null
          ip?: string | null
          query?: string | null
          status_code?: number | null
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_logs: {
        Row: {
          capability: string | null
          clarification_asked: boolean | null
          created_at: string | null
          entities: Json | null
          has_location: boolean | null
          id: string
          intent: string | null
          knowledge_source: string | null
          manual_sections_found: number | null
          messages: Json
          model: string | null
          pdf_references_found: number | null
          provider_hits: Json | null
          response: string | null
          routing_match: string | null
          routing_rule: string | null
          tokens_used: number | null
          user_id: string | null
          zero_result: boolean | null
        }
        Insert: {
          capability?: string | null
          clarification_asked?: boolean | null
          created_at?: string | null
          entities?: Json | null
          has_location?: boolean | null
          id?: string
          intent?: string | null
          knowledge_source?: string | null
          manual_sections_found?: number | null
          messages: Json
          model?: string | null
          pdf_references_found?: number | null
          provider_hits?: Json | null
          response?: string | null
          routing_match?: string | null
          routing_rule?: string | null
          tokens_used?: number | null
          user_id?: string | null
          zero_result?: boolean | null
        }
        Update: {
          capability?: string | null
          clarification_asked?: boolean | null
          created_at?: string | null
          entities?: Json | null
          has_location?: boolean | null
          id?: string
          intent?: string | null
          knowledge_source?: string | null
          manual_sections_found?: number | null
          messages?: Json
          model?: string | null
          pdf_references_found?: number | null
          provider_hits?: Json | null
          response?: string | null
          routing_match?: string | null
          routing_rule?: string | null
          tokens_used?: number | null
          user_id?: string | null
          zero_result?: boolean | null
        }
        Relationships: []
      }
      chat_rate_limits: {
        Row: {
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
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
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_articles: {
        Row: {
          author_id: string | null
          author_name: string
          category: string
          content: string
          cover_image: string | null
          excerpt: string
          id: string
          is_approved: boolean | null
          is_archived: boolean | null
          is_system: boolean | null
          likes: number | null
          order: number | null
          original_file_url: string | null
          published_at: string | null
          reading_time: number | null
          source_url: string | null
          title: string
          views: number | null
        }
        Insert: {
          author_id?: string | null
          author_name: string
          category: string
          content: string
          cover_image?: string | null
          excerpt: string
          id?: string
          is_approved?: boolean | null
          is_archived?: boolean | null
          is_system?: boolean | null
          likes?: number | null
          order?: number | null
          original_file_url?: string | null
          published_at?: string | null
          reading_time?: number | null
          source_url?: string | null
          title: string
          views?: number | null
        }
        Update: {
          author_id?: string | null
          author_name?: string
          category?: string
          content?: string
          cover_image?: string | null
          excerpt?: string
          id?: string
          is_approved?: boolean | null
          is_archived?: boolean | null
          is_system?: boolean | null
          likes?: number | null
          order?: number | null
          original_file_url?: string | null
          published_at?: string | null
          reading_time?: number | null
          source_url?: string | null
          title?: string
          views?: number | null
        }
        Relationships: []
      }
      community_documents: {
        Row: {
          categories: string[] | null
          created_at: string
          created_by: string | null
          creator_name: string
          description: string | null
          document_type: string
          download_count: number | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          rating_average: number | null
          rating_count: number | null
          rating_sum: number | null
          search_vector: unknown
          tags: string[] | null
          title: string
          updated_at: string
          vehicle_models: string[] | null
        }
        Insert: {
          categories?: string[] | null
          created_at?: string
          created_by?: string | null
          creator_name: string
          description?: string | null
          document_type: string
          download_count?: number | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          rating_average?: number | null
          rating_count?: number | null
          rating_sum?: number | null
          search_vector?: unknown
          tags?: string[] | null
          title: string
          updated_at?: string
          vehicle_models?: string[] | null
        }
        Update: {
          categories?: string[] | null
          created_at?: string
          created_by?: string | null
          creator_name?: string
          description?: string | null
          document_type?: string
          download_count?: number | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          rating_average?: number | null
          rating_count?: number | null
          rating_sum?: number | null
          search_vector?: unknown
          tags?: string[] | null
          title?: string
          updated_at?: string
          vehicle_models?: string[] | null
        }
        Relationships: []
      }
      community_groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_private: boolean | null
          metadata: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          metadata?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_private?: boolean | null
          metadata?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          author_id: string
          category: string | null
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          author_id: string
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          author_id?: string
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_details"
            referencedColumns: ["id"]
          },
        ]
      }
      community_recommendations: {
        Row: {
          author_avatar: string | null
          author_id: string | null
          author_name: string | null
          business_name: string | null
          category: string
          contact_info: Json | null
          content: string
          created_at: string
          excerpt: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          is_verified: boolean | null
          likes_count: number | null
          location: string | null
          price_range: string | null
          published_at: string | null
          rating: number | null
          recommendation_type: string | null
          saves_count: number | null
          tags: string[] | null
          title: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          author_avatar?: string | null
          author_id?: string | null
          author_name?: string | null
          business_name?: string | null
          category: string
          contact_info?: Json | null
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          is_verified?: boolean | null
          likes_count?: number | null
          location?: string | null
          price_range?: string | null
          published_at?: string | null
          rating?: number | null
          recommendation_type?: string | null
          saves_count?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          author_avatar?: string | null
          author_id?: string | null
          author_name?: string | null
          business_name?: string | null
          category?: string
          contact_info?: Json | null
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          is_verified?: boolean | null
          likes_count?: number | null
          location?: string | null
          price_range?: string | null
          published_at?: string | null
          rating?: number | null
          recommendation_type?: string | null
          saves_count?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: []
      }
      component_synonyms: {
        Row: {
          approved_by: string | null
          component_id: string
          confidence: number | null
          created_at: string | null
          id: string
          lang: string | null
          synonym: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          component_id: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          lang?: string | null
          synonym: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          component_id?: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          lang?: string | null
          synonym?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "component_synonyms_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
        ]
      }
      component_task_refs: {
        Row: {
          component_id: number
          confidence: number | null
          id: number
          manual_pages: number[] | null
          rps_pages: number[] | null
          task: string
          updated_at: string | null
        }
        Insert: {
          component_id: number
          confidence?: number | null
          id?: number
          manual_pages?: number[] | null
          rps_pages?: number[] | null
          task: string
          updated_at?: string | null
        }
        Update: {
          component_id?: number
          confidence?: number | null
          id?: number
          manual_pages?: number[] | null
          rps_pages?: number[] | null
          task?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "component_task_refs_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "rps_components"
            referencedColumns: ["id"]
          },
        ]
      }
      components: {
        Row: {
          created_at: string | null
          id: string
          meta: Json | null
          name: string
          system: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meta?: Json | null
          name: string
          system?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meta?: Json | null
          name?: string
          system?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      connections: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_interactions: {
        Row: {
          content_id: string | null
          created_at: string | null
          id: string
          interaction_type: string
          user_id: string | null
        }
        Insert: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          interaction_type: string
          user_id?: string | null
        }
        Update: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          interaction_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_interactions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "aggregated_content"
            referencedColumns: ["id"]
          },
        ]
      }
      content_relationships: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          relationship_type: string
          source_id: string
          source_type: string
          target_id: string
          target_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          relationship_type: string
          source_id: string
          source_type: string
          target_id: string
          target_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          relationship_type?: string
          source_id?: string
          source_type?: string
          target_id?: string
          target_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          id: string
          updated_at: string
        }
        Insert: {
          id?: string
          updated_at?: string
        }
        Update: {
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_content: {
        Row: {
          confidence_score: number | null
          content: string | null
          content_embedding: string | null
          content_vector: unknown
          created_at: string | null
          display_page_number: number
          document_id: number
          extraction_method: string | null
          has_visual_elements: boolean | null
          id: number
          page_image_url: string | null
          page_number: number
          visual_content_type: string | null
        }
        Insert: {
          confidence_score?: number | null
          content?: string | null
          content_embedding?: string | null
          content_vector?: unknown
          created_at?: string | null
          display_page_number: number
          document_id: number
          extraction_method?: string | null
          has_visual_elements?: boolean | null
          id?: number
          page_image_url?: string | null
          page_number: number
          visual_content_type?: string | null
        }
        Update: {
          confidence_score?: number | null
          content?: string | null
          content_embedding?: string | null
          content_vector?: unknown
          created_at?: string | null
          display_page_number?: number
          document_id?: number
          extraction_method?: string | null
          has_visual_elements?: boolean | null
          id?: number
          page_image_url?: string | null
          page_number?: number
          visual_content_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_content_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_index: {
        Row: {
          confidence: number | null
          context: string | null
          created_at: string | null
          document_id: number
          id: number
          page_number: number
          term: string
          term_type: string | null
        }
        Insert: {
          confidence?: number | null
          context?: string | null
          created_at?: string | null
          document_id: number
          id?: number
          page_number: number
          term: string
          term_type?: string | null
        }
        Update: {
          confidence?: number | null
          context?: string | null
          created_at?: string | null
          document_id?: number
          id?: number
          page_number?: number
          term?: string
          term_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_index_document_id_page_number_fkey"
            columns: ["document_id", "page_number"]
            isOneToOne: false
            referencedRelation: "document_content"
            referencedColumns: ["document_id", "page_number"]
          },
        ]
      }
      document_ratings: {
        Row: {
          created_at: string
          document_id: string | null
          id: string
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          id?: string
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string | null
          id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_ratings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "community_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          document_hash: string
          document_type: string
          filename: string
          id: number
          ingestion_attempts: number | null
          ingestion_status: string | null
          last_error: string | null
          last_ingestion_attempt: string | null
          page_offset: number | null
          storage_path: string
          total_pages: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_hash: string
          document_type: string
          filename: string
          id?: number
          ingestion_attempts?: number | null
          ingestion_status?: string | null
          last_error?: string | null
          last_ingestion_attempt?: string | null
          page_offset?: number | null
          storage_path: string
          total_pages: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_hash?: string
          document_type?: string
          filename?: string
          id?: number
          ingestion_attempts?: number | null
          ingestion_status?: string | null
          last_error?: string | null
          last_ingestion_attempt?: string | null
          page_offset?: number | null
          storage_path?: string
          total_pages?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      download_logs: {
        Row: {
          created_at: string | null
          file_size: number | null
          file_type: string | null
          id: string
          ip_address: unknown
          resource: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          ip_address?: unknown
          resource: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          ip_address?: unknown
          resource?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      embedding_generation_logs: {
        Row: {
          batch_size: number
          chunks_failed: number
          chunks_processed: number
          created_at: string | null
          id: string
          processing_log: Json | null
          total_chunks_attempted: number
        }
        Insert: {
          batch_size: number
          chunks_failed: number
          chunks_processed: number
          created_at?: string | null
          id?: string
          processing_log?: Json | null
          total_chunks_attempted: number
        }
        Update: {
          batch_size?: number
          chunks_failed?: number
          chunks_processed?: number
          created_at?: string | null
          id?: string
          processing_log?: Json | null
          total_chunks_attempted?: number
        }
        Relationships: []
      }
      event_invitations: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          invited_by_user_id: string | null
          invited_user_id: string
          responded_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          invited_by_user_id?: string | null
          invited_user_id: string
          responded_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          invited_by_user_id?: string | null
          invited_user_id?: string
          responded_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          can_provide: string[] | null
          checked_in: boolean | null
          checked_in_at: string | null
          event_id: string
          id: string
          notes: string | null
          rsvp_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_provide?: string[] | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          event_id: string
          id?: string
          notes?: string | null
          rsvp_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_provide?: string[] | null
          checked_in?: boolean | null
          checked_in_at?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          rsvp_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          category: string | null
          created_at: string | null
          description: string | null
          emergency_resolved_at: string | null
          emergency_severity: string | null
          end_date: string | null
          event_type: string
          id: string
          is_barry_suggested: boolean | null
          is_emergency: boolean | null
          location_address: string | null
          location_coordinates: unknown
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          max_participants: number | null
          min_participants: number | null
          organizer_id: string
          required_equipment: string[] | null
          rsvp_deadline: string | null
          skill_level: string | null
          start_date: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          vehicle_requirements: Json | null
          visibility: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          emergency_resolved_at?: string | null
          emergency_severity?: string | null
          end_date?: string | null
          event_type: string
          id?: string
          is_barry_suggested?: boolean | null
          is_emergency?: boolean | null
          location_address?: string | null
          location_coordinates?: unknown
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          max_participants?: number | null
          min_participants?: number | null
          organizer_id: string
          required_equipment?: string[] | null
          rsvp_deadline?: string | null
          skill_level?: string | null
          start_date: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          vehicle_requirements?: Json | null
          visibility?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          emergency_resolved_at?: string | null
          emergency_severity?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          is_barry_suggested?: boolean | null
          is_emergency?: boolean | null
          location_address?: string | null
          location_coordinates?: unknown
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          max_participants?: number | null
          min_participants?: number | null
          organizer_id?: string
          required_equipment?: string[] | null
          rsvp_deadline?: string | null
          skill_level?: string | null
          start_date?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          vehicle_requirements?: Json | null
          visibility?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          rating: number | null
          status: string | null
          type: string
          user_id: string | null
          votes: number | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          rating?: number | null
          status?: string | null
          type: string
          user_id?: string | null
          votes?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          rating?: number | null
          status?: string | null
          type?: string
          user_id?: string | null
          votes?: number | null
        }
        Relationships: []
      }
      feedback_votes: {
        Row: {
          created_at: string
          feedback_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_votes_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_logs: {
        Row: {
          created_at: string
          currency: string
          fill_date: string
          fuel_amount: number
          fuel_price_per_unit: number
          fuel_station: string | null
          fuel_type: string
          full_tank: boolean | null
          id: string
          notes: string | null
          odometer: number
          total_cost: number
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          fill_date?: string
          fuel_amount: number
          fuel_price_per_unit: number
          fuel_station?: string | null
          fuel_type: string
          full_tank?: boolean | null
          id?: string
          notes?: string | null
          odometer: number
          total_cost: number
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          fill_date?: string
          fuel_amount?: number
          fuel_price_per_unit?: number
          fuel_station?: string | null
          fuel_type?: string
          full_tank?: boolean | null
          id?: string
          notes?: string | null
          odometer?: number
          total_cost?: number
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      gpx_track_points: {
        Row: {
          cadence: number | null
          created_at: string | null
          distance: number | null
          elevation: number | null
          heart_rate: number | null
          id: string
          latitude: number
          longitude: number
          point_index: number
          speed: number | null
          timestamp: string | null
          track_id: string
        }
        Insert: {
          cadence?: number | null
          created_at?: string | null
          distance?: number | null
          elevation?: number | null
          heart_rate?: number | null
          id?: string
          latitude: number
          longitude: number
          point_index: number
          speed?: number | null
          timestamp?: string | null
          track_id: string
        }
        Update: {
          cadence?: number | null
          created_at?: string | null
          distance?: number | null
          elevation?: number | null
          heart_rate?: number | null
          id?: string
          latitude?: number
          longitude?: number
          point_index?: number
          speed?: number | null
          timestamp?: string | null
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gpx_track_points_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "gpx_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      gpx_tracks: {
        Row: {
          bounds_east: number
          bounds_north: number
          bounds_south: number
          bounds_west: number
          created_at: string | null
          description: string | null
          distance: number | null
          duration: number | null
          elevation_gain: number | null
          elevation_loss: number | null
          elevation_max: number | null
          elevation_min: number | null
          filename: string | null
          id: string
          name: string
          point_count: number | null
          trip_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bounds_east: number
          bounds_north: number
          bounds_south: number
          bounds_west: number
          created_at?: string | null
          description?: string | null
          distance?: number | null
          duration?: number | null
          elevation_gain?: number | null
          elevation_loss?: number | null
          elevation_max?: number | null
          elevation_min?: number | null
          filename?: string | null
          id?: string
          name: string
          point_count?: number | null
          trip_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bounds_east?: number
          bounds_north?: number
          bounds_south?: number
          bounds_west?: number
          created_at?: string | null
          description?: string | null
          distance?: number | null
          duration?: number | null
          elevation_gain?: number | null
          elevation_loss?: number | null
          elevation_max?: number | null
          elevation_min?: number | null
          filename?: string | null
          id?: string
          name?: string
          point_count?: number | null
          trip_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gpx_tracks_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      gpx_waypoints: {
        Row: {
          created_at: string | null
          description: string | null
          elevation: number | null
          id: string
          latitude: number
          longitude: number
          name: string
          symbol: string | null
          track_id: string | null
          trip_id: string | null
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          elevation?: number | null
          id?: string
          latitude: number
          longitude: number
          name: string
          symbol?: string | null
          track_id?: string | null
          trip_id?: string | null
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          elevation?: number | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          symbol?: string | null
          track_id?: string | null
          trip_id?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gpx_waypoints_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "gpx_tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gpx_waypoints_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_posts: {
        Row: {
          content: string
          created_at: string | null
          group_id: string
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          group_id: string
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          group_id?: string
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      guacamole_connection: {
        Row: {
          connection_id: number
          connection_name: string
          connection_weight: number | null
          failover_only: boolean
          max_connections: number | null
          max_connections_per_user: number | null
          parent_id: number | null
          protocol: string
        }
        Insert: {
          connection_id?: number
          connection_name: string
          connection_weight?: number | null
          failover_only?: boolean
          max_connections?: number | null
          max_connections_per_user?: number | null
          parent_id?: number | null
          protocol: string
        }
        Update: {
          connection_id?: number
          connection_name?: string
          connection_weight?: number | null
          failover_only?: boolean
          max_connections?: number | null
          max_connections_per_user?: number | null
          parent_id?: number | null
          protocol?: string
        }
        Relationships: []
      }
      guacamole_connection_group: {
        Row: {
          connection_group_id: number
          connection_group_name: string
          enable_session_affinity: boolean
          max_connections: number | null
          max_connections_per_user: number | null
          parent_id: number | null
          type: string
        }
        Insert: {
          connection_group_id?: number
          connection_group_name: string
          enable_session_affinity?: boolean
          max_connections?: number | null
          max_connections_per_user?: number | null
          parent_id?: number | null
          type?: string
        }
        Update: {
          connection_group_id?: number
          connection_group_name?: string
          enable_session_affinity?: boolean
          max_connections?: number | null
          max_connections_per_user?: number | null
          parent_id?: number | null
          type?: string
        }
        Relationships: []
      }
      guacamole_connection_group_permission: {
        Row: {
          connection_group_id: number
          entity_id: number
          permission: string
        }
        Insert: {
          connection_group_id: number
          entity_id: number
          permission: string
        }
        Update: {
          connection_group_id?: number
          entity_id?: number
          permission?: string
        }
        Relationships: []
      }
      guacamole_connection_history: {
        Row: {
          connection_id: number | null
          connection_name: string
          end_date: string | null
          history_id: number
          remote_host: string | null
          sharing_profile_id: number | null
          sharing_profile_name: string | null
          start_date: string
          user_id: number | null
          username: string
        }
        Insert: {
          connection_id?: number | null
          connection_name: string
          end_date?: string | null
          history_id?: number
          remote_host?: string | null
          sharing_profile_id?: number | null
          sharing_profile_name?: string | null
          start_date: string
          user_id?: number | null
          username: string
        }
        Update: {
          connection_id?: number | null
          connection_name?: string
          end_date?: string | null
          history_id?: number
          remote_host?: string | null
          sharing_profile_id?: number | null
          sharing_profile_name?: string | null
          start_date?: string
          user_id?: number | null
          username?: string
        }
        Relationships: []
      }
      guacamole_connection_parameter: {
        Row: {
          connection_id: number
          parameter_name: string
          parameter_value: string | null
        }
        Insert: {
          connection_id: number
          parameter_name: string
          parameter_value?: string | null
        }
        Update: {
          connection_id?: number
          parameter_name?: string
          parameter_value?: string | null
        }
        Relationships: []
      }
      guacamole_connection_permission: {
        Row: {
          connection_id: number
          entity_id: number
          permission: string
        }
        Insert: {
          connection_id: number
          entity_id: number
          permission: string
        }
        Update: {
          connection_id?: number
          entity_id?: number
          permission?: string
        }
        Relationships: []
      }
      guacamole_entity: {
        Row: {
          entity_id: number
          name: string
          type: string
        }
        Insert: {
          entity_id?: number
          name: string
          type: string
        }
        Update: {
          entity_id?: number
          name?: string
          type?: string
        }
        Relationships: []
      }
      guacamole_user: {
        Row: {
          access_window_end: string | null
          access_window_start: string | null
          disabled: boolean
          email_address: string | null
          expired: boolean
          full_name: string | null
          organization: string | null
          organizational_role: string | null
          password_date: string
          password_hash: string
          password_salt: string | null
          timezone: string | null
          user_id: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          access_window_end?: string | null
          access_window_start?: string | null
          disabled?: boolean
          email_address?: string | null
          expired?: boolean
          full_name?: string | null
          organization?: string | null
          organizational_role?: string | null
          password_date?: string
          password_hash: string
          password_salt?: string | null
          timezone?: string | null
          user_id: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          access_window_end?: string | null
          access_window_start?: string | null
          disabled?: boolean
          email_address?: string | null
          expired?: boolean
          full_name?: string | null
          organization?: string | null
          organizational_role?: string | null
          password_date?: string
          password_hash?: string
          password_salt?: string | null
          timezone?: string | null
          user_id?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      guacamole_user_group: {
        Row: {
          disabled: boolean
          user_group_id: number
        }
        Insert: {
          disabled?: boolean
          user_group_id: number
        }
        Update: {
          disabled?: boolean
          user_group_id?: number
        }
        Relationships: []
      }
      guacamole_user_group_member: {
        Row: {
          member_entity_id: number
          user_group_id: number
        }
        Insert: {
          member_entity_id: number
          user_group_id: number
        }
        Update: {
          member_entity_id?: number
          user_group_id?: number
        }
        Relationships: []
      }
      guacamole_user_permission: {
        Row: {
          affected_user_id: number
          entity_id: number
          permission: string
        }
        Insert: {
          affected_user_id: number
          entity_id: number
          permission: string
        }
        Update: {
          affected_user_id?: number
          entity_id?: number
          permission?: string
        }
        Relationships: []
      }
      location_checkins: {
        Row: {
          activity_type: string | null
          checked_in_at: string | null
          coordinates: unknown
          id: string
          location_name: string
          notes: string | null
          user_id: string
          vehicle_id: string
        }
        Insert: {
          activity_type?: string | null
          checked_in_at?: string | null
          coordinates?: unknown
          id?: string
          location_name: string
          notes?: string | null
          user_id: string
          vehicle_id: string
        }
        Update: {
          activity_type?: string | null
          checked_in_at?: string | null
          coordinates?: unknown
          id?: string
          location_name?: string
          notes?: string | null
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_checkins_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      location_tracking_settings: {
        Row: {
          auto_detect_trip_start: boolean | null
          auto_tracking_enabled: boolean | null
          created_at: string | null
          id: string
          minimum_trip_distance_km: number | null
          privacy_mode: boolean | null
          share_location_data: boolean | null
          tracking_mode: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_detect_trip_start?: boolean | null
          auto_tracking_enabled?: boolean | null
          created_at?: string | null
          id?: string
          minimum_trip_distance_km?: number | null
          privacy_mode?: boolean | null
          share_location_data?: boolean | null
          tracking_mode?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_detect_trip_start?: boolean | null
          auto_tracking_enabled?: boolean | null
          created_at?: string | null
          id?: string
          minimum_trip_distance_km?: number | null
          privacy_mode?: boolean | null
          share_location_data?: boolean | null
          tracking_mode?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      maintenance_logs: {
        Row: {
          completed_by: string | null
          cost: number | null
          created_at: string
          currency: string
          date: string
          id: string
          location: string | null
          maintenance_type: string
          notes: string | null
          odometer: number
          parts_replaced: string[] | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          completed_by?: string | null
          cost?: number | null
          created_at?: string
          currency?: string
          date: string
          id?: string
          location?: string | null
          maintenance_type: string
          notes?: string | null
          odometer: number
          parts_replaced?: string[] | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          completed_by?: string | null
          cost?: number | null
          created_at?: string
          currency?: string
          date?: string
          id?: string
          location?: string | null
          maintenance_type?: string
          notes?: string | null
          odometer?: number
          parts_replaced?: string[] | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_notification_settings: {
        Row: {
          created_at: string
          email_notifications: boolean
          id: string
          notification_frequency: string
          phone_number: string | null
          sms_notifications: boolean
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          notification_frequency?: string
          phone_number?: string | null
          sms_notifications?: boolean
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          notification_frequency?: string
          phone_number?: string | null
          sms_notifications?: boolean
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_notification_settings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_emergency_info: {
        Row: {
          id: string
          user_id: string
          blood_type: string | null
          allergies: string[] | null
          medical_conditions: string[] | null
          emergency_contacts: {
            name: string
            phone: string
            relationship: string
            isPrimary: boolean
          }[] | null
          primary_doctor: {
            name?: string
            phone?: string
            practice?: string
          } | null
          insurance_info: {
            provider?: string
            policyNumber?: string
            groupNumber?: string
            phone?: string
          } | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          blood_type?: string | null
          allergies?: string[] | null
          medical_conditions?: string[] | null
          emergency_contacts?: {
            name: string
            phone: string
            relationship: string
            isPrimary: boolean
          }[] | null
          primary_doctor?: {
            name?: string
            phone?: string
            practice?: string
          } | null
          insurance_info?: {
            provider?: string
            policyNumber?: string
            groupNumber?: string
            phone?: string
          } | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          blood_type?: string | null
          allergies?: string[] | null
          medical_conditions?: string[] | null
          emergency_contacts?: {
            name: string
            phone: string
            relationship: string
            isPrimary: boolean
          }[] | null
          primary_doctor?: {
            name?: string
            phone?: string
            practice?: string
          } | null
          insurance_info?: {
            provider?: string
            policyNumber?: string
            groupNumber?: string
            phone?: string
          } | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_medications: {
        Row: {
          id: string
          user_id: string
          name: string
          dosage: string | null
          frequency: Database["public"]["Enums"]["medication_frequency"] | null
          refill_date: string | null
          prescribed_by: string | null
          notes: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          dosage?: string | null
          frequency?: Database["public"]["Enums"]["medication_frequency"] | null
          refill_date?: string | null
          prescribed_by?: string | null
          notes?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          dosage?: string | null
          frequency?: Database["public"]["Enums"]["medication_frequency"] | null
          refill_date?: string | null
          prescribed_by?: string | null
          notes?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_records: {
        Row: {
          id: string
          user_id: string
          type: Database["public"]["Enums"]["medical_record_type"]
          title: string
          summary: string | null
          tags: string[] | null
          test_date: string | null
          document_url: string | null
          content_json: Json | null
          ocr_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: Database["public"]["Enums"]["medical_record_type"]
          title: string
          summary?: string | null
          tags?: string[] | null
          test_date?: string | null
          document_url?: string | null
          content_json?: Json | null
          ocr_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: Database["public"]["Enums"]["medical_record_type"]
          title?: string
          summary?: string | null
          tags?: string[] | null
          test_date?: string | null
          document_url?: string | null
          content_json?: Json | null
          ocr_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      manual_chunks: {
        Row: {
          blurb_lex: unknown
          chunk_index: number
          content: string
          content_tsv: unknown
          content_type: string | null
          created_at: string | null
          embedding: string | null
          extraction_method: string | null
          extraction_quality: number | null
          has_visual_elements: boolean | null
          id: string
          manual_id: string
          manual_title: string
          metadata: Json | null
          ocr_processed: boolean | null
          ocr_processed_at: string | null
          ocr_text: string | null
          page_image_url: string | null
          page_number: number | null
          part_numbers: string[] | null
          parts_lex: unknown
          procedure_complexity: number | null
          rps_group_code: string | null
          rps_group_name: string | null
          section_title: string | null
          system_family: string | null
          title_lex: unknown
          visual_content_type: string | null
        }
        Insert: {
          blurb_lex?: unknown
          chunk_index: number
          content: string
          content_tsv?: unknown
          content_type?: string | null
          created_at?: string | null
          embedding?: string | null
          extraction_method?: string | null
          extraction_quality?: number | null
          has_visual_elements?: boolean | null
          id?: string
          manual_id: string
          manual_title: string
          metadata?: Json | null
          ocr_processed?: boolean | null
          ocr_processed_at?: string | null
          ocr_text?: string | null
          page_image_url?: string | null
          page_number?: number | null
          part_numbers?: string[] | null
          parts_lex?: unknown
          procedure_complexity?: number | null
          rps_group_code?: string | null
          rps_group_name?: string | null
          section_title?: string | null
          system_family?: string | null
          title_lex?: unknown
          visual_content_type?: string | null
        }
        Update: {
          blurb_lex?: unknown
          chunk_index?: number
          content?: string
          content_tsv?: unknown
          content_type?: string | null
          created_at?: string | null
          embedding?: string | null
          extraction_method?: string | null
          extraction_quality?: number | null
          has_visual_elements?: boolean | null
          id?: string
          manual_id?: string
          manual_title?: string
          metadata?: Json | null
          ocr_processed?: boolean | null
          ocr_processed_at?: string | null
          ocr_text?: string | null
          page_image_url?: string | null
          page_number?: number | null
          part_numbers?: string[] | null
          parts_lex?: unknown
          procedure_complexity?: number | null
          rps_group_code?: string | null
          rps_group_name?: string | null
          section_title?: string | null
          system_family?: string | null
          title_lex?: unknown
          visual_content_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_chunks_manual_id_fkey"
            columns: ["manual_id"]
            isOneToOne: false
            referencedRelation: "processed_manuals"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_images: {
        Row: {
          alt_text: string | null
          chunk_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_path: string | null
          image_url: string | null
          manual_id: string
        }
        Insert: {
          alt_text?: string | null
          chunk_id?: string | null
          created_at?: string | null
          description?: string | null
          id: string
          image_path?: string | null
          image_url?: string | null
          manual_id: string
        }
        Update: {
          alt_text?: string | null
          chunk_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          manual_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_images_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "manual_chunks"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_index_metadata: {
        Row: {
          created_at: string | null
          group_code: string | null
          group_title: string | null
          id: string
          is_available: boolean | null
          manual_id: string | null
          page_range: string | null
          topics: Json | null
          volume: number | null
        }
        Insert: {
          created_at?: string | null
          group_code?: string | null
          group_title?: string | null
          id?: string
          is_available?: boolean | null
          manual_id?: string | null
          page_range?: string | null
          topics?: Json | null
          volume?: number | null
        }
        Update: {
          created_at?: string | null
          group_code?: string | null
          group_title?: string | null
          id?: string
          is_available?: boolean | null
          manual_id?: string | null
          page_range?: string | null
          topics?: Json | null
          volume?: number | null
        }
        Relationships: []
      }
      manual_metadata: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          category: string | null
          created_at: string | null
          file_size: number | null
          filename: string
          id: string
          model_codes: string[] | null
          page_count: number | null
          processed_at: string | null
          rejection_reason: string | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
          year_range: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          file_size?: number | null
          filename: string
          id?: string
          model_codes?: string[] | null
          page_count?: number | null
          processed_at?: string | null
          rejection_reason?: string | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
          year_range?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          model_codes?: string[] | null
          page_count?: number | null
          processed_at?: string | null
          rejection_reason?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
          year_range?: string | null
        }
        Relationships: []
      }
      manual_processing_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error: string | null
          id: string
          manual_id: string | null
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          manual_id?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          manual_id?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_processing_queue_manual_id_fkey"
            columns: ["manual_id"]
            isOneToOne: false
            referencedRelation: "manuals"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_tables: {
        Row: {
          chunk_id: string | null
          created_at: string | null
          extracted_method: string | null
          id: string
          manual_id: string
          rows_data: Json
          table_type: string | null
          updated_at: string | null
        }
        Insert: {
          chunk_id?: string | null
          created_at?: string | null
          extracted_method?: string | null
          id?: string
          manual_id: string
          rows_data: Json
          table_type?: string | null
          updated_at?: string | null
        }
        Update: {
          chunk_id?: string | null
          created_at?: string | null
          extracted_method?: string | null
          id?: string
          manual_id?: string
          rows_data?: Json
          table_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      manuals: {
        Row: {
          approved_by: string | null
          category: string
          chunk_count: number | null
          created_at: string | null
          description: string | null
          file_size: number
          filename: string
          id: string
          model_codes: string[] | null
          original_filename: string
          page_count: number | null
          processing_completed_at: string | null
          processing_error: string | null
          processing_started_at: string | null
          processing_status: string | null
          title: string
          updated_at: string | null
          uploaded_by: string
          year_range: string | null
        }
        Insert: {
          approved_by?: string | null
          category: string
          chunk_count?: number | null
          created_at?: string | null
          description?: string | null
          file_size: number
          filename: string
          id?: string
          model_codes?: string[] | null
          original_filename: string
          page_count?: number | null
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?: string | null
          title: string
          updated_at?: string | null
          uploaded_by: string
          year_range?: string | null
        }
        Update: {
          approved_by?: string | null
          category?: string
          chunk_count?: number | null
          created_at?: string | null
          description?: string | null
          file_size?: number
          filename?: string
          id?: string
          model_codes?: string[] | null
          original_filename?: string
          page_count?: number | null
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string
          year_range?: string | null
        }
        Relationships: []
      }
      manuals_old: {
        Row: {
          approved: boolean | null
          created_at: string | null
          description: string
          file_path: string
          file_size: number
          id: string
          pages: number | null
          submitted_by: string
          title: string
          updated_at: string | null
        }
        Insert: {
          approved?: boolean | null
          created_at?: string | null
          description: string
          file_path: string
          file_size: number
          id?: string
          pages?: number | null
          submitted_by: string
          title: string
          updated_at?: string | null
        }
        Update: {
          approved?: boolean | null
          created_at?: string | null
          description?: string
          file_path?: string
          file_size?: number
          id?: string
          pages?: number | null
          submitted_by?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          category: string
          condition: string
          created_at: string | null
          description: string
          id: string
          images: string[] | null
          location: string | null
          price: number
          saved_count: number | null
          seller_id: string
          status: string | null
          title: string
          updated_at: string | null
          view_count: number | null
          views: number | null
        }
        Insert: {
          category: string
          condition: string
          created_at?: string | null
          description: string
          id?: string
          images?: string[] | null
          location?: string | null
          price: number
          saved_count?: number | null
          seller_id: string
          status?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
          views?: number | null
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string | null
          description?: string
          id?: string
          images?: string[] | null
          location?: string | null
          price?: number
          saved_count?: number | null
          seller_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
          views?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notice_board: {
        Row: {
          allow_comments: boolean | null
          allow_reactions: boolean | null
          author_id: string
          author_type: string
          category: string | null
          comment_count: number | null
          content: string
          created_at: string | null
          expires_at: string | null
          formatting: Json | null
          id: string
          is_featured: boolean | null
          is_pinned: boolean | null
          media: Json | null
          priority: string
          published_at: string | null
          reaction_count: number | null
          status: string
          tags: string[] | null
          target_audience: string | null
          target_users: string[] | null
          title: string
          type: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          allow_comments?: boolean | null
          allow_reactions?: boolean | null
          author_id: string
          author_type?: string
          category?: string | null
          comment_count?: number | null
          content: string
          created_at?: string | null
          expires_at?: string | null
          formatting?: Json | null
          id?: string
          is_featured?: boolean | null
          is_pinned?: boolean | null
          media?: Json | null
          priority?: string
          published_at?: string | null
          reaction_count?: number | null
          status?: string
          tags?: string[] | null
          target_audience?: string | null
          target_users?: string[] | null
          title: string
          type?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          allow_comments?: boolean | null
          allow_reactions?: boolean | null
          author_id?: string
          author_type?: string
          category?: string | null
          comment_count?: number | null
          content?: string
          created_at?: string | null
          expires_at?: string | null
          formatting?: Json | null
          id?: string
          is_featured?: boolean | null
          is_pinned?: boolean | null
          media?: Json | null
          priority?: string
          published_at?: string | null
          reaction_count?: number | null
          status?: string
          tags?: string[] | null
          target_audience?: string | null
          target_users?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notice_board_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_board_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_details"
            referencedColumns: ["id"]
          },
        ]
      }
      notice_comments: {
        Row: {
          content: string
          created_at: string | null
          deleted_by: string | null
          deleted_reason: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          notice_id: string
          parent_comment_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          notice_id: string
          parent_comment_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          deleted_by?: string | null
          deleted_reason?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          notice_id?: string
          parent_comment_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notice_comments_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_comments_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "user_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_comments_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notice_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "notice_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_details"
            referencedColumns: ["id"]
          },
        ]
      }
      notice_reactions: {
        Row: {
          created_at: string | null
          id: string
          notice_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notice_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notice_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notice_reactions_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notice_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_details"
            referencedColumns: ["id"]
          },
        ]
      }
      notice_submissions: {
        Row: {
          admin_notes: string | null
          category: string | null
          content: string
          created_at: string | null
          id: string
          media: Json | null
          published_notice_id: string | null
          rejection_reason: string | null
          requested_priority: string | null
          requested_tags: string[] | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitter_id: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          media?: Json | null
          published_notice_id?: string | null
          rejection_reason?: string | null
          requested_priority?: string | null
          requested_tags?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitter_id: string
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          media?: Json | null
          published_notice_id?: string | null
          rejection_reason?: string | null
          requested_priority?: string | null
          requested_tags?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitter_id?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notice_submissions_published_notice_id_fkey"
            columns: ["published_notice_id"]
            isOneToOne: false
            referencedRelation: "notice_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_submissions_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_submissions_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "user_details"
            referencedColumns: ["id"]
          },
        ]
      }
      notice_views: {
        Row: {
          id: string
          ip_address: unknown
          notice_id: string
          user_agent: string | null
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          id?: string
          ip_address?: unknown
          notice_id: string
          user_agent?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          id?: string
          ip_address?: unknown
          notice_id?: string
          user_agent?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notice_views_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notice_board"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notice_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_details"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          reference_id: string | null
          reference_type: string | null
          sender_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          sender_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          sender_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nudge_history: {
        Row: {
          converted: boolean | null
          days_into_trial: number | null
          dismissed: boolean | null
          id: string
          nudge_type: string
          shown_at: string | null
          user_id: string | null
        }
        Insert: {
          converted?: boolean | null
          days_into_trial?: number | null
          dismissed?: boolean | null
          id?: string
          nudge_type: string
          shown_at?: string | null
          user_id?: string | null
        }
        Update: {
          converted?: boolean | null
          days_into_trial?: number | null
          dismissed?: boolean | null
          id?: string
          nudge_type?: string
          shown_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pending_manual_uploads: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string | null
          description: string | null
          file_size: number
          filename: string
          id: string
          model_codes: string[] | null
          original_filename: string
          rejection_reason: string | null
          title: string
          updated_at: string | null
          uploaded_by: string
          year_range: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          file_size: number
          filename: string
          id?: string
          model_codes?: string[] | null
          original_filename: string
          rejection_reason?: string | null
          title: string
          updated_at?: string | null
          uploaded_by: string
          year_range?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          file_size?: number
          filename?: string
          id?: string
          model_codes?: string[] | null
          original_filename?: string
          rejection_reason?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string
          year_range?: string | null
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
      post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_details"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          link_description: string | null
          link_image: string | null
          link_title: string | null
          link_url: string | null
          metadata: Json | null
          post_type: string | null
          updated_at: string
          user_id: string
          video_url: string | null
          visibility: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          link_description?: string | null
          link_image?: string | null
          link_title?: string | null
          link_url?: string | null
          metadata?: Json | null
          post_type?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
          visibility?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          link_description?: string | null
          link_image?: string | null
          link_title?: string | null
          link_url?: string | null
          metadata?: Json | null
          post_type?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      processed_manuals: {
        Row: {
          approved_by: string | null
          category: string
          chunk_count: number | null
          created_at: string | null
          description: string | null
          file_size: number
          filename: string
          id: string
          model_codes: string[] | null
          original_filename: string
          page_count: number | null
          processing_completed_at: string | null
          processing_error: string | null
          processing_started_at: string | null
          processing_status: string | null
          title: string
          updated_at: string | null
          uploaded_by: string
          year_range: string | null
        }
        Insert: {
          approved_by?: string | null
          category: string
          chunk_count?: number | null
          created_at?: string | null
          description?: string | null
          file_size: number
          filename: string
          id?: string
          model_codes?: string[] | null
          original_filename: string
          page_count?: number | null
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?: string | null
          title: string
          updated_at?: string | null
          uploaded_by: string
          year_range?: string | null
        }
        Update: {
          approved_by?: string | null
          category?: string
          chunk_count?: number | null
          created_at?: string | null
          description?: string | null
          file_size?: number
          filename?: string
          id?: string
          model_codes?: string[] | null
          original_filename?: string
          page_count?: number | null
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string
          year_range?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string | null
          avatar_url: string | null
          banned_until: string | null
          bio: string | null
          certifications: Json | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          currency: string | null
          display_name: string | null
          email: string | null
          email_notifications: boolean | null
          email_verified: boolean | null
          emergency_contact: Json | null
          experience_level: string | null
          full_name: string | null
          granted_at: string | null
          granted_by: string | null
          has_free_access: boolean | null
          id: string
          insurance_info: Json | null
          is_admin: boolean | null
          is_moderator: boolean | null
          is_public: boolean | null
          language: string | null
          last_active_at: string | null
          last_nudge_shown_at: string | null
          location: string | null
          mechanical_skills: string[] | null
          notification_preferences: Json | null
          online: boolean | null
          payment_method: string | null
          phone_number: string | null
          phone_verified: boolean | null
          postal_code: string | null
          preferred_terrain: string[] | null
          privacy_settings: Json | null
          profile_completion_percentage: number | null
          role: string | null
          state: string | null
          status: string | null
          street_address: string | null
          subscription_expires_at: string | null
          subscription_started_at: string | null
          subscription_tier: string | null
          subscription_type: string | null
          trial_converted: boolean | null
          trial_ends_at: string | null
          trial_reminder_sent: boolean | null
          trial_started_at: string | null
          unimog_features: string[] | null
          unimog_model: string | null
          unimog_modifications: string | null
          unimog_series: string | null
          unimog_specs: Json | null
          unimog_wiki_data: Json | null
          unimog_year: string | null
          updated_at: string
          use_vehicle_photo_as_profile: boolean | null
          vehicle_photo_url: string | null
          website: string | null
        }
        Insert: {
          account_status?: string | null
          avatar_url?: string | null
          banned_until?: string | null
          bio?: string | null
          certifications?: Json | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string | null
          display_name?: string | null
          email?: string | null
          email_notifications?: boolean | null
          email_verified?: boolean | null
          emergency_contact?: Json | null
          experience_level?: string | null
          full_name?: string | null
          granted_at?: string | null
          granted_by?: string | null
          has_free_access?: boolean | null
          id: string
          insurance_info?: Json | null
          is_admin?: boolean | null
          is_moderator?: boolean | null
          is_public?: boolean | null
          language?: string | null
          last_active_at?: string | null
          last_nudge_shown_at?: string | null
          location?: string | null
          mechanical_skills?: string[] | null
          notification_preferences?: Json | null
          online?: boolean | null
          payment_method?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          postal_code?: string | null
          preferred_terrain?: string[] | null
          privacy_settings?: Json | null
          profile_completion_percentage?: number | null
          role?: string | null
          state?: string | null
          status?: string | null
          street_address?: string | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?: string | null
          subscription_type?: string | null
          trial_converted?: boolean | null
          trial_ends_at?: string | null
          trial_reminder_sent?: boolean | null
          trial_started_at?: string | null
          unimog_features?: string[] | null
          unimog_model?: string | null
          unimog_modifications?: string | null
          unimog_series?: string | null
          unimog_specs?: Json | null
          unimog_wiki_data?: Json | null
          unimog_year?: string | null
          updated_at?: string
          use_vehicle_photo_as_profile?: boolean | null
          vehicle_photo_url?: string | null
          website?: string | null
        }
        Update: {
          account_status?: string | null
          avatar_url?: string | null
          banned_until?: string | null
          bio?: string | null
          certifications?: Json | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string | null
          display_name?: string | null
          email?: string | null
          email_notifications?: boolean | null
          email_verified?: boolean | null
          emergency_contact?: Json | null
          experience_level?: string | null
          full_name?: string | null
          granted_at?: string | null
          granted_by?: string | null
          has_free_access?: boolean | null
          id?: string
          insurance_info?: Json | null
          is_admin?: boolean | null
          is_moderator?: boolean | null
          is_public?: boolean | null
          language?: string | null
          last_active_at?: string | null
          last_nudge_shown_at?: string | null
          location?: string | null
          mechanical_skills?: string[] | null
          notification_preferences?: Json | null
          online?: boolean | null
          payment_method?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          postal_code?: string | null
          preferred_terrain?: string[] | null
          privacy_settings?: Json | null
          profile_completion_percentage?: number | null
          role?: string | null
          state?: string | null
          status?: string | null
          street_address?: string | null
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
          subscription_tier?: string | null
          subscription_type?: string | null
          trial_converted?: boolean | null
          trial_ends_at?: string | null
          trial_reminder_sent?: boolean | null
          trial_started_at?: string | null
          unimog_features?: string[] | null
          unimog_model?: string | null
          unimog_modifications?: string | null
          unimog_series?: string | null
          unimog_specs?: Json | null
          unimog_wiki_data?: Json | null
          unimog_year?: string | null
          updated_at?: string
          use_vehicle_photo_as_profile?: boolean | null
          vehicle_photo_url?: string | null
          website?: string | null
        }
        Relationships: []
      }
      qa_issues: {
        Row: {
          category: string
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          notes: string | null
          priority: string
          screenshot_url: string | null
          status: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          category?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          priority?: string
          screenshot_url?: string | null
          status?: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          priority?: string
          screenshot_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      reddit_articles: {
        Row: {
          author_id: string | null
          author_name: string | null
          category: string | null
          content: string | null
          coverImage: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          likes: number | null
          published_at: string | null
          reading_time: number | null
          subreddit: string | null
          title: string
          url: string | null
          views: number | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content?: string | null
          coverImage?: string | null
          created_at?: string | null
          excerpt?: string | null
          id: string
          likes?: number | null
          published_at?: string | null
          reading_time?: number | null
          subreddit?: string | null
          title: string
          url?: string | null
          views?: number | null
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content?: string | null
          coverImage?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          likes?: number | null
          published_at?: string | null
          reading_time?: number | null
          subreddit?: string | null
          title?: string
          url?: string | null
          views?: number | null
        }
        Relationships: []
      }
      reference_requests: {
        Row: {
          created_at: string | null
          document_id: number | null
          id: number
          page_number: number | null
          query: string
          resolution_method: string
          response_time_ms: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: number | null
          id?: number
          page_number?: number | null
          query: string
          resolution_method: string
          response_time_ms?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: number | null
          id?: number
          page_number?: number | null
          query?: string
          resolution_method?: string
          response_time_ms?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_requests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      rps_component_synonyms: {
        Row: {
          created_at: string | null
          group_hint: string | null
          id: number
          normalized_phrase: string | null
          phrase: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          group_hint?: string | null
          id?: number
          normalized_phrase?: string | null
          phrase: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          group_hint?: string | null
          id?: number
          normalized_phrase?: string | null
          phrase?: string
          weight?: number | null
        }
        Relationships: []
      }
      rps_components: {
        Row: {
          created_at: string | null
          group_code: string | null
          id: number
          name: string
          normalized_name: string | null
        }
        Insert: {
          created_at?: string | null
          group_code?: string | null
          id?: number
          name: string
          normalized_name?: string | null
        }
        Update: {
          created_at?: string | null
          group_code?: string | null
          id?: number
          name?: string
          normalized_name?: string | null
        }
        Relationships: []
      }
      rps_groups: {
        Row: {
          callout_range: string | null
          chunk_file: string | null
          created_at: string | null
          group_code: string
          group_name: string
          id: string
          illustration_pages: number[] | null
          metadata: Json | null
          page_end: number | null
          page_start: number | null
          page_type: string | null
          parts_list_pages: number[] | null
          rps_number: string
          shared_with_groups: string[] | null
          status: string | null
          total_parts: number | null
          updated_at: string | null
        }
        Insert: {
          callout_range?: string | null
          chunk_file?: string | null
          created_at?: string | null
          group_code: string
          group_name: string
          id?: string
          illustration_pages?: number[] | null
          metadata?: Json | null
          page_end?: number | null
          page_start?: number | null
          page_type?: string | null
          parts_list_pages?: number[] | null
          rps_number: string
          shared_with_groups?: string[] | null
          status?: string | null
          total_parts?: number | null
          updated_at?: string | null
        }
        Update: {
          callout_range?: string | null
          chunk_file?: string | null
          created_at?: string | null
          group_code?: string
          group_name?: string
          id?: string
          illustration_pages?: number[] | null
          metadata?: Json | null
          page_end?: number | null
          page_start?: number | null
          page_type?: string | null
          parts_list_pages?: number[] | null
          rps_number?: string
          shared_with_groups?: string[] | null
          status?: string | null
          total_parts?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rps_illustration_reviews: {
        Row: {
          corrected_description: string | null
          created_at: string | null
          id: string
          illustration_id: string | null
          notes: string | null
          original_description: string | null
          proposed_description: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string | null
        }
        Insert: {
          corrected_description?: string | null
          created_at?: string | null
          id?: string
          illustration_id?: string | null
          notes?: string | null
          original_description?: string | null
          proposed_description?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string | null
        }
        Update: {
          corrected_description?: string | null
          created_at?: string | null
          id?: string
          illustration_id?: string | null
          notes?: string | null
          original_description?: string | null
          proposed_description?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rps_illustration_reviews_illustration_id_fkey"
            columns: ["illustration_id"]
            isOneToOne: false
            referencedRelation: "rps_illustrations"
            referencedColumns: ["id"]
          },
        ]
      }
      rps_illustrations: {
        Row: {
          callouts: Json | null
          cdn_url: string | null
          created_at: string | null
          description: string | null
          figure_number: string
          group_code: string
          id: string
          image_url: string | null
          metadata: Json | null
          page_number: number | null
          rps_number: string
        }
        Insert: {
          callouts?: Json | null
          cdn_url?: string | null
          created_at?: string | null
          description?: string | null
          figure_number: string
          group_code: string
          id?: string
          image_url?: string | null
          metadata?: Json | null
          page_number?: number | null
          rps_number: string
        }
        Update: {
          callouts?: Json | null
          cdn_url?: string | null
          created_at?: string | null
          description?: string | null
          figure_number?: string
          group_code?: string
          id?: string
          image_url?: string | null
          metadata?: Json | null
          page_number?: number | null
          rps_number?: string
        }
        Relationships: []
      }
      rps_niin_index: {
        Row: {
          created_at: string | null
          group_code: string
          group_ident_no: string
          id: string
          niin: string
        }
        Insert: {
          created_at?: string | null
          group_code: string
          group_ident_no: string
          id?: string
          niin: string
        }
        Update: {
          created_at?: string | null
          group_code?: string
          group_ident_no?: string
          id?: string
          niin?: string
        }
        Relationships: []
      }
      rps_parts: {
        Row: {
          callout: string | null
          chunk_file: string | null
          created_at: string | null
          description: string
          figure_reference: string | null
          group_code: string
          id: string
          item_number: string
          metadata: Json | null
          niin: string | null
          nsn: string | null
          page_number: number | null
          quantity: number | null
          repair_grade: string | null
          rps_number: string
          updated_at: string | null
          vehicle_model: string | null
        }
        Insert: {
          callout?: string | null
          chunk_file?: string | null
          created_at?: string | null
          description: string
          figure_reference?: string | null
          group_code: string
          id?: string
          item_number: string
          metadata?: Json | null
          niin?: string | null
          nsn?: string | null
          page_number?: number | null
          quantity?: number | null
          repair_grade?: string | null
          rps_number: string
          updated_at?: string | null
          vehicle_model?: string | null
        }
        Update: {
          callout?: string | null
          chunk_file?: string | null
          created_at?: string | null
          description?: string
          figure_reference?: string | null
          group_code?: string
          id?: string
          item_number?: string
          metadata?: Json | null
          niin?: string | null
          nsn?: string | null
          page_number?: number | null
          quantity?: number | null
          repair_grade?: string | null
          rps_number?: string
          updated_at?: string | null
          vehicle_model?: string | null
        }
        Relationships: []
      }
      rps_synonym_suggestions: {
        Row: {
          candidates: Json | null
          created_at: string | null
          id: number
          normalized_phrase: string | null
          phrase: string
          user_id: string | null
        }
        Insert: {
          candidates?: Json | null
          created_at?: string | null
          id?: number
          normalized_phrase?: string | null
          phrase: string
          user_id?: string | null
        }
        Update: {
          candidates?: Json | null
          created_at?: string | null
          id?: number
          normalized_phrase?: string | null
          phrase?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rss_feeds: {
        Row: {
          category: string | null
          created_at: string | null
          error_count: number | null
          feed_url: string
          id: string
          is_active: boolean | null
          last_error: string | null
          last_fetched_at: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          error_count?: number | null
          feed_url: string
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_fetched_at?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          error_count?: number | null
          feed_url?: string
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_fetched_at?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_content: {
        Row: {
          content_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          tags: string[] | null
          user_id: string | null
        }
        Insert: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          tags?: string[] | null
          user_id?: string | null
        }
        Update: {
          content_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          tags?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_content_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "aggregated_content"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_listings: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings_with_seller"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          severity: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          severity: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          severity?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          severity: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shop_carts: {
        Row: {
          created_at: string
          id: string
          product_index: number
          quantity: number
          session_id: string
          updated_at: string
          user_id: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_index: number
          quantity?: number
          session_id: string
          updated_at?: string
          user_id?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_index?: number
          quantity?: number
          session_id?: string
          updated_at?: string
          user_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_carts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          items: Json
          notes: string | null
          order_number: string
          payment_method: string | null
          session_id: string | null
          shipping_address_id: string | null
          shipping_cost_aud: number | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal_aud: number
          total_aud: number
          updated_at: string
          user_id: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_number: string
          payment_method?: string | null
          session_id?: string | null
          shipping_address_id?: string | null
          shipping_cost_aud?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal_aud: number
          total_aud: number
          updated_at?: string
          user_id?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          session_id?: string | null
          shipping_address_id?: string | null
          shipping_cost_aud?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal_aud?: number
          total_aud?: number
          updated_at?: string
          user_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "shop_shipping_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_quote_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          message: string | null
          product_index: number
          product_name: string
          quoted_price_aud: number | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          message?: string | null
          product_index: number
          product_name: string
          quoted_price_aud?: number | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          message?: string | null
          product_index?: number
          product_name?: string
          quoted_price_aud?: number | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_quote_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_shipping_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean | null
          phone: string | null
          postcode: string
          session_id: string | null
          state: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country?: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean | null
          phone?: string | null
          postcode: string
          session_id?: string | null
          state: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean | null
          phone?: string | null
          postcode?: string
          session_id?: string | null
          state?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      signup_functionality_log: {
        Row: {
          check_time: string | null
          created_at: string | null
          endpoint_tested: string | null
          error_message: string | null
          id: string
          response_time_ms: number | null
          test_result: string
        }
        Insert: {
          check_time?: string | null
          created_at?: string | null
          endpoint_tested?: string | null
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          test_result: string
        }
        Update: {
          check_time?: string | null
          created_at?: string | null
          endpoint_tested?: string | null
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          test_result?: string
        }
        Relationships: []
      }
      signup_health_log: {
        Row: {
          alert_sent: boolean | null
          check_time: string | null
          created_at: string | null
          health_status: string
          hours_since_last_signup: number | null
          id: string
          signups_last_24h: number | null
          signups_last_6h: number | null
          signups_last_hour: number | null
        }
        Insert: {
          alert_sent?: boolean | null
          check_time?: string | null
          created_at?: string | null
          health_status: string
          hours_since_last_signup?: number | null
          id?: string
          signups_last_24h?: number | null
          signups_last_6h?: number | null
          signups_last_hour?: number | null
        }
        Update: {
          alert_sent?: boolean | null
          check_time?: string | null
          created_at?: string | null
          health_status?: string
          hours_since_last_signup?: number | null
          id?: string
          signups_last_24h?: number | null
          signups_last_6h?: number | null
          signups_last_hour?: number | null
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      track_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          track_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          track_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          track_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_comments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string | null
          distance_km: number | null
          elevation_gain: number | null
          id: string
          is_public: boolean
          metadata: Json | null
          name: string
          segments: Json
          source_type: string
          trip_id: string | null
          updated_at: string
          visible: boolean
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          distance_km?: number | null
          elevation_gain?: number | null
          id?: string
          is_public?: boolean
          metadata?: Json | null
          name: string
          segments: Json
          source_type: string
          trip_id?: string | null
          updated_at?: string
          visible?: boolean
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          distance_km?: number | null
          elevation_gain?: number | null
          id?: string
          is_public?: boolean
          metadata?: Json | null
          name?: string
          segments?: Json
          source_type?: string
          trip_id?: string | null
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_tracks_trip_id"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_events: {
        Row: {
          created_at: string | null
          event: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      trip_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_comments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_coordinates: {
        Row: {
          coordinates: Json
          created_at: string
          id: string
          sequence_number: number
          trip_id: string
        }
        Insert: {
          coordinates: Json
          created_at?: string
          id?: string
          sequence_number: number
          trip_id: string
        }
        Update: {
          coordinates?: Json
          created_at?: string
          id?: string
          sequence_number?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_coordinates_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_emergency_alerts: {
        Row: {
          alert_type: string
          coordinates: Json | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          issued_at: string
          severity: string
          source: string | null
          title: string
          trip_id: string
        }
        Insert: {
          alert_type: string
          coordinates?: Json | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          issued_at: string
          severity: string
          source?: string | null
          title: string
          trip_id: string
        }
        Update: {
          alert_type?: string
          coordinates?: Json | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string
          severity?: string
          source?: string | null
          title?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_emergency_alerts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_logs: {
        Row: {
          average_speed_kmh: number | null
          created_at: string | null
          distance_km: number | null
          duration_minutes: number | null
          end_coordinates: unknown
          end_location: string | null
          end_time: string | null
          fuel_consumed_liters: number | null
          gps_data: Json | null
          id: string
          is_active: boolean | null
          max_speed_kmh: number | null
          notes: string | null
          start_coordinates: unknown
          start_location: string | null
          start_time: string
          tracking_method: string | null
          trip_name: string | null
          trip_type: string | null
          updated_at: string | null
          user_id: string
          vehicle_id: string
        }
        Insert: {
          average_speed_kmh?: number | null
          created_at?: string | null
          distance_km?: number | null
          duration_minutes?: number | null
          end_coordinates?: unknown
          end_location?: string | null
          end_time?: string | null
          fuel_consumed_liters?: number | null
          gps_data?: Json | null
          id?: string
          is_active?: boolean | null
          max_speed_kmh?: number | null
          notes?: string | null
          start_coordinates?: unknown
          start_location?: string | null
          start_time: string
          tracking_method?: string | null
          trip_name?: string | null
          trip_type?: string | null
          updated_at?: string | null
          user_id: string
          vehicle_id: string
        }
        Update: {
          average_speed_kmh?: number | null
          created_at?: string | null
          distance_km?: number | null
          duration_minutes?: number | null
          end_coordinates?: unknown
          end_location?: string | null
          end_time?: string | null
          fuel_consumed_liters?: number | null
          gps_data?: Json | null
          id?: string
          is_active?: boolean | null
          max_speed_kmh?: number | null
          notes?: string | null
          start_coordinates?: unknown
          start_location?: string | null
          start_time?: string
          tracking_method?: string | null
          trip_name?: string | null
          trip_type?: string | null
          updated_at?: string | null
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_shares: {
        Row: {
          created_at: string | null
          id: string
          shared_by: string
          shared_with_group_id: string | null
          shared_with_user_id: string | null
          trip_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          shared_by: string
          shared_with_group_id?: string | null
          shared_with_user_id?: string | null
          trip_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          shared_by?: string
          shared_with_group_id?: string | null
          shared_with_user_id?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "user_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_shares_shared_with_group_id_fkey"
            columns: ["shared_with_group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "user_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_shares_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_weather_data: {
        Row: {
          created_at: string
          forecast_date: string
          id: string
          trip_id: string
          updated_at: string
          weather_data: Json
        }
        Insert: {
          created_at?: string
          forecast_date: string
          id?: string
          trip_id: string
          updated_at?: string
          weather_data: Json
        }
        Update: {
          created_at?: string
          forecast_date?: string
          id?: string
          trip_id?: string
          updated_at?: string
          weather_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "trip_weather_data_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          completion_date: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string | null
          distance_km: number | null
          end_coordinates: Json | null
          end_date: string | null
          estimated_duration_hours: number | null
          id: string
          is_completed: boolean | null
          is_public: boolean
          metadata: Json | null
          name: string
          notes: string | null
          rating: number | null
          route_data: Json | null
          shared_with_groups: string[] | null
          shared_with_users: string[] | null
          start_coordinates: Json | null
          start_date: string | null
          tags: string[] | null
          terrain_types: string[] | null
          trip_type: string | null
          updated_at: string
          user_id: string | null
          vehicle_requirements: Json | null
          visibility: string | null
          weather_conditions: Json | null
        }
        Insert: {
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          distance_km?: number | null
          end_coordinates?: Json | null
          end_date?: string | null
          estimated_duration_hours?: number | null
          id?: string
          is_completed?: boolean | null
          is_public?: boolean
          metadata?: Json | null
          name: string
          notes?: string | null
          rating?: number | null
          route_data?: Json | null
          shared_with_groups?: string[] | null
          shared_with_users?: string[] | null
          start_coordinates?: Json | null
          start_date?: string | null
          tags?: string[] | null
          terrain_types?: string[] | null
          trip_type?: string | null
          updated_at?: string
          user_id?: string | null
          vehicle_requirements?: Json | null
          visibility?: string | null
          weather_conditions?: Json | null
        }
        Update: {
          completion_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          distance_km?: number | null
          end_coordinates?: Json | null
          end_date?: string | null
          estimated_duration_hours?: number | null
          id?: string
          is_completed?: boolean | null
          is_public?: boolean
          metadata?: Json | null
          name?: string
          notes?: string | null
          rating?: number | null
          route_data?: Json | null
          shared_with_groups?: string[] | null
          shared_with_users?: string[] | null
          start_coordinates?: Json | null
          start_date?: string | null
          tags?: string[] | null
          terrain_types?: string[] | null
          trip_type?: string | null
          updated_at?: string
          user_id?: string | null
          vehicle_requirements?: Json | null
          visibility?: string | null
          weather_conditions?: Json | null
        }
        Relationships: []
      }
      u435_manual_index: {
        Row: {
          aliases: string[] | null
          chapter_filename: string
          chapter_number: number
          created_at: string | null
          has_safety_warning: boolean | null
          id: string
          is_active: boolean | null
          manual_part_id: number | null
          norm_term: string | null
          page_number: number
          pdf_page_number: number
          search_fts: unknown
          search_priority: number | null
          storage_url: string
          system_category: string | null
          term: string
        }
        Insert: {
          aliases?: string[] | null
          chapter_filename: string
          chapter_number: number
          created_at?: string | null
          has_safety_warning?: boolean | null
          id?: string
          is_active?: boolean | null
          manual_part_id?: number | null
          norm_term?: string | null
          page_number: number
          pdf_page_number: number
          search_fts?: unknown
          search_priority?: number | null
          storage_url: string
          system_category?: string | null
          term: string
        }
        Update: {
          aliases?: string[] | null
          chapter_filename?: string
          chapter_number?: number
          created_at?: string | null
          has_safety_warning?: boolean | null
          id?: string
          is_active?: boolean | null
          manual_part_id?: number | null
          norm_term?: string | null
          page_number?: number
          pdf_page_number?: number
          search_fts?: unknown
          search_priority?: number | null
          storage_url?: string
          system_category?: string | null
          term?: string
        }
        Relationships: []
      }
      u435_manual_parts: {
        Row: {
          created_at: string | null
          end_page: number | null
          file_size_mb: number | null
          filename: string
          id: number
          keywords: string[] | null
          manual_type: string
          page_count: number | null
          part_number: number | null
          priority: string | null
          slug: string
          start_page: number | null
          storage_bucket: string
          storage_path: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_page?: number | null
          file_size_mb?: number | null
          filename: string
          id?: number
          keywords?: string[] | null
          manual_type: string
          page_count?: number | null
          part_number?: number | null
          priority?: string | null
          slug: string
          start_page?: number | null
          storage_bucket: string
          storage_path: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_page?: number | null
          file_size_mb?: number | null
          filename?: string
          id?: number
          keywords?: string[] | null
          manual_type?: string
          page_count?: number | null
          part_number?: number | null
          priority?: string | null
          slug?: string
          start_page?: number | null
          storage_bucket?: string
          storage_path?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      unimog_models: {
        Row: {
          capabilities: string | null
          created_at: string
          features: Json | null
          history: string | null
          id: string
          model_code: string
          name: string
          series: string
          specs: Json
          updated_at: string
          wiki_data: Json | null
        }
        Insert: {
          capabilities?: string | null
          created_at?: string
          features?: Json | null
          history?: string | null
          id?: string
          model_code: string
          name: string
          series: string
          specs?: Json
          updated_at?: string
          wiki_data?: Json | null
        }
        Update: {
          capabilities?: string | null
          created_at?: string
          features?: Json | null
          history?: string | null
          id?: string
          model_code?: string
          name?: string
          series?: string
          specs?: Json
          updated_at?: string
          wiki_data?: Json | null
        }
        Relationships: []
      }
      unimog_resources: {
        Row: {
          address: string | null
          city: string | null
          country_code: string
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          last_verified: string | null
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          type: string
          updated_at: string | null
          verification_notes: string | null
          verified: boolean | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country_code: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          last_verified?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          type: string
          updated_at?: string | null
          verification_notes?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country_code?: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          last_verified?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          type?: string
          updated_at?: string | null
          verification_notes?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      user_activities: {
        Row: {
          event_data: Json | null
          event_id: string | null
          event_type: string
          id: string
          page: string | null
          session_id: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          event_data?: Json | null
          event_id?: string | null
          event_type: string
          id?: string
          page?: string | null
          session_id: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          event_data?: Json | null
          event_id?: string | null
          event_type?: string
          id?: string
          page?: string | null
          session_id?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          dashboard_display_mode: string | null
          id: string
          show_vehicle_on_dashboard: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dashboard_display_mode?: string | null
          id?: string
          show_vehicle_on_dashboard?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dashboard_display_mode?: string | null
          id?: string
          show_vehicle_on_dashboard?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          free_access_reason: string | null
          id: string
          is_free_access: boolean | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          subscription_type: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          free_access_reason?: string | null
          id?: string
          is_free_access?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_type?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          free_access_reason?: string | null
          id?: string
          is_free_access?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_type?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions_backup: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          expires_at: string | null
          id: string | null
          is_active: boolean | null
          starts_at: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_level: string | null
          subscription_status: string | null
          subscription_type: string | null
          tier: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          expires_at?: string | null
          id?: string | null
          is_active?: boolean | null
          starts_at?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_level?: string | null
          subscription_status?: string | null
          subscription_type?: string | null
          tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          expires_at?: string | null
          id?: string | null
          is_active?: boolean | null
          starts_at?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_level?: string | null
          subscription_status?: string | null
          subscription_type?: string | null
          tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_trail_library: {
        Row: {
          bounds: Json | null
          created_at: string | null
          difficulty_level: string | null
          distance_meters: number | null
          elevation_gain_meters: number | null
          elevation_loss_meters: number | null
          geojson_data: Json
          id: string
          is_favorite: boolean | null
          is_public: boolean | null
          last_driven_at: string | null
          max_elevation_meters: number | null
          min_elevation_meters: number | null
          osm_way_id: number | null
          terrain_types: string[] | null
          times_driven: number | null
          trail_description: string | null
          trail_name: string
          trail_source: string | null
          updated_at: string | null
          user_id: string
          user_notes: string | null
          user_rating: number | null
        }
        Insert: {
          bounds?: Json | null
          created_at?: string | null
          difficulty_level?: string | null
          distance_meters?: number | null
          elevation_gain_meters?: number | null
          elevation_loss_meters?: number | null
          geojson_data: Json
          id?: string
          is_favorite?: boolean | null
          is_public?: boolean | null
          last_driven_at?: string | null
          max_elevation_meters?: number | null
          min_elevation_meters?: number | null
          osm_way_id?: number | null
          terrain_types?: string[] | null
          times_driven?: number | null
          trail_description?: string | null
          trail_name: string
          trail_source?: string | null
          updated_at?: string | null
          user_id: string
          user_notes?: string | null
          user_rating?: number | null
        }
        Update: {
          bounds?: Json | null
          created_at?: string | null
          difficulty_level?: string | null
          distance_meters?: number | null
          elevation_gain_meters?: number | null
          elevation_loss_meters?: number | null
          geojson_data?: Json
          id?: string
          is_favorite?: boolean | null
          is_public?: boolean | null
          last_driven_at?: string | null
          max_elevation_meters?: number | null
          min_elevation_meters?: number | null
          osm_way_id?: number | null
          terrain_types?: string[] | null
          times_driven?: number | null
          trail_description?: string | null
          trail_name?: string
          trail_source?: string | null
          updated_at?: string | null
          user_id?: string
          user_notes?: string | null
          user_rating?: number | null
        }
        Relationships: []
      }
      user_trials: {
        Row: {
          converted_to_subscription: boolean
          created_at: string
          email_sent_at: string | null
          expires_at: string
          id: string
          is_active: boolean
          started_at: string
          user_id: string
        }
        Insert: {
          converted_to_subscription?: boolean
          created_at?: string
          email_sent_at?: string | null
          expires_at: string
          id?: string
          is_active?: boolean
          started_at?: string
          user_id: string
        }
        Update: {
          converted_to_subscription?: boolean
          created_at?: string
          email_sent_at?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      validation_reports: {
        Row: {
          checks_passed: number
          checks_run: number
          created_at: string | null
          id: number
          issues_fixed: number
          issues_found: number
          report_data: Json
          report_date: string
        }
        Insert: {
          checks_passed: number
          checks_run: number
          created_at?: string | null
          id?: number
          issues_fixed: number
          issues_found: number
          report_data: Json
          report_date: string
        }
        Update: {
          checks_passed?: number
          checks_run?: number
          created_at?: string | null
          id?: number
          issues_fixed?: number
          issues_found?: number
          report_data?: Json
          report_date?: string
        }
        Relationships: []
      }
      vector_search_analytics: {
        Row: {
          confidence_threshold: number | null
          created_at: string | null
          embedding_similarity_scores: Json | null
          id: string
          query: string
          response_time_ms: number | null
          results_returned: number | null
          search_method: string | null
          user_id: string | null
        }
        Insert: {
          confidence_threshold?: number | null
          created_at?: string | null
          embedding_similarity_scores?: Json | null
          id?: string
          query: string
          response_time_ms?: number | null
          results_returned?: number | null
          search_method?: string | null
          user_id?: string | null
        }
        Update: {
          confidence_threshold?: number | null
          created_at?: string | null
          embedding_similarity_scores?: Json | null
          id?: string
          query?: string
          response_time_ms?: number | null
          results_returned?: number | null
          search_method?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      vector_search_feedback: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          feedback_text: string | null
          id: string
          manual_references: Json | null
          query: string
          search_results: Json | null
          user_id: string | null
          user_rating: number | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          manual_references?: Json | null
          query: string
          search_results?: Json | null
          user_id?: string | null
          user_rating?: number | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          manual_references?: Json | null
          query?: string
          search_results?: Json | null
          user_id?: string | null
          user_rating?: number | null
        }
        Relationships: []
      }
      vehicle_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          vehicle_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          vehicle_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_comments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_data_entries: {
        Row: {
          created_at: string | null
          description: string
          entry_date: string
          entry_type: string
          id: string
          location: string | null
          notes: string | null
          unit: string
          updated_at: string | null
          value: number
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          entry_date?: string
          entry_type: string
          id?: string
          location?: string | null
          notes?: string | null
          unit?: string
          updated_at?: string | null
          value: number
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          entry_date?: string
          entry_type?: string
          id?: string
          location?: string | null
          notes?: string | null
          unit?: string
          updated_at?: string | null
          value?: number
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_data_entries_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_fuel_logs: {
        Row: {
          created_at: string | null
          fill_date: string
          fuel_amount: number
          fuel_cost: number
          fuel_price_per_unit: number
          id: string
          is_full_tank: boolean | null
          location_lat: number | null
          location_lng: number | null
          mileage: number
          notes: string | null
          station_name: string | null
          trip_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string | null
          fill_date: string
          fuel_amount: number
          fuel_cost: number
          fuel_price_per_unit: number
          id?: string
          is_full_tank?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          mileage: number
          notes?: string | null
          station_name?: string | null
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string | null
          fill_date?: string
          fuel_amount?: number
          fuel_cost?: number
          fuel_price_per_unit?: number
          id?: string
          is_full_tank?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          mileage?: number
          notes?: string | null
          station_name?: string | null
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_fuel_logs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_fuel_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_fuel_stats: {
        Row: {
          avg_fuel_economy: number | null
          id: string
          period_end: string
          period_start: string
          total_distance: number | null
          total_fuel_amount: number | null
          total_fuel_cost: number | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          avg_fuel_economy?: number | null
          id?: string
          period_end: string
          period_start: string
          total_distance?: number | null
          total_fuel_amount?: number | null
          total_fuel_cost?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          avg_fuel_economy?: number | null
          id?: string
          period_end?: string
          period_start?: string
          total_distance?: number | null
          total_fuel_amount?: number | null
          total_fuel_cost?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_fuel_stats_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_likes: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_likes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_location_logs: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          latitude: number
          location_type: string | null
          longitude: number
          mileage: number | null
          notes: string | null
          timestamp: string | null
          trip_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          latitude: number
          location_type?: string | null
          longitude: number
          mileage?: number | null
          notes?: string | null
          timestamp?: string | null
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          latitude?: number
          location_type?: string | null
          longitude?: number
          mileage?: number | null
          notes?: string | null
          timestamp?: string | null
          trip_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_location_logs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_location_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_maintenance_schedules: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          interval_miles: number | null
          interval_months: number | null
          is_active: boolean | null
          last_service_date: string | null
          last_service_mileage: number | null
          maintenance_type: string
          next_due_date: string | null
          next_due_mileage: number | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          interval_miles?: number | null
          interval_months?: number | null
          is_active?: boolean | null
          last_service_date?: string | null
          last_service_mileage?: number | null
          maintenance_type: string
          next_due_date?: string | null
          next_due_mileage?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          interval_miles?: number | null
          interval_months?: number | null
          is_active?: boolean | null
          last_service_date?: string | null
          last_service_mileage?: number | null
          maintenance_type?: string
          next_due_date?: string | null
          next_due_mileage?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_photos: {
        Row: {
          caption: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_primary: boolean | null
          mime_type: string | null
          photo_type: string | null
          taken_at: string | null
          uploaded_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          caption?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_primary?: boolean | null
          mime_type?: string | null
          photo_type?: string | null
          taken_at?: string | null
          uploaded_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          caption?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_primary?: boolean | null
          mime_type?: string | null
          photo_type?: string | null
          taken_at?: string | null
          uploaded_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_photos_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_service_logs: {
        Row: {
          cost: number | null
          created_at: string | null
          description: string | null
          id: string
          mileage_at_service: number | null
          next_service_due: string | null
          next_service_mileage: number | null
          notes: string | null
          parts_replaced: string[] | null
          receipt_url: string | null
          service_date: string
          service_provider: string | null
          service_type: string
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          mileage_at_service?: number | null
          next_service_due?: string | null
          next_service_mileage?: number | null
          notes?: string | null
          parts_replaced?: string[] | null
          receipt_url?: string | null
          service_date: string
          service_provider?: string | null
          service_type: string
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          mileage_at_service?: number | null
          next_service_due?: string | null
          next_service_mileage?: number | null
          notes?: string | null
          parts_replaced?: string[] | null
          receipt_url?: string | null
          service_date?: string
          service_provider?: string | null
          service_type?: string
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_service_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_usage_stats: {
        Row: {
          avg_trip_distance: number | null
          id: string
          most_visited_locations: string[] | null
          period_end: string
          period_start: string
          total_miles: number | null
          total_trips: number | null
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          avg_trip_distance?: number | null
          id?: string
          most_visited_locations?: string[] | null
          period_end: string
          period_start: string
          total_miles?: number | null
          total_trips?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          avg_trip_distance?: number | null
          id?: string
          most_visited_locations?: string[] | null
          period_end?: string
          period_start?: string
          total_miles?: number | null
          total_trips?: number | null
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_usage_stats_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_views: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_views_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string
          current_odometer: number
          description: string | null
          id: string
          is_showcase: boolean | null
          license_plate: string | null
          likes_count: number | null
          model: string
          modifications: string | null
          name: string
          odometer_unit: string
          photos: string[] | null
          region: string | null
          showcase_order: number | null
          specs: Json | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          views_count: number | null
          vin: string | null
          year: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          current_odometer: number
          description?: string | null
          id?: string
          is_showcase?: boolean | null
          license_plate?: string | null
          likes_count?: number | null
          model: string
          modifications?: string | null
          name: string
          odometer_unit: string
          photos?: string[] | null
          region?: string | null
          showcase_order?: number | null
          specs?: Json | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          views_count?: number | null
          vin?: string | null
          year: string
        }
        Update: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          current_odometer?: number
          description?: string | null
          id?: string
          is_showcase?: boolean | null
          license_plate?: string | null
          likes_count?: number | null
          model?: string
          modifications?: string | null
          name?: string
          odometer_unit?: string
          photos?: string[] | null
          region?: string | null
          showcase_order?: number | null
          specs?: Json | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          views_count?: number | null
          vin?: string | null
          year?: string
        }
        Relationships: []
      }
      vendor_analytics: {
        Row: {
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          vendor_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          vendor_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_analytics_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          business_name: string
          created_at: string | null
          description: string | null
          display_order: number | null
          email: string | null
          hero_image_url: string | null
          id: string
          is_featured: boolean | null
          is_verified: boolean | null
          location: string | null
          logo_url: string | null
          phone: string | null
          portfolio_images: Json | null
          products: Json | null
          slug: string
          social_links: Json | null
          specialties: string[] | null
          tagline: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          business_name: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          email?: string | null
          hero_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          logo_url?: string | null
          phone?: string | null
          portfolio_images?: Json | null
          products?: Json | null
          slug: string
          social_links?: Json | null
          specialties?: string[] | null
          tagline?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          business_name?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          email?: string | null
          hero_image_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_verified?: boolean | null
          location?: string | null
          logo_url?: string | null
          phone?: string | null
          portfolio_images?: Json | null
          products?: Json | null
          slug?: string
          social_links?: Json | null
          specialties?: string[] | null
          tagline?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      visitor_analytics: {
        Row: {
          converted_to_subscription: boolean
          converted_to_trial: boolean
          id: string
          metadata: Json | null
          referrer: string | null
          session_id: string
          signed_up: boolean
          user_id: string | null
          visited_at: string
        }
        Insert: {
          converted_to_subscription?: boolean
          converted_to_trial?: boolean
          id?: string
          metadata?: Json | null
          referrer?: string | null
          session_id: string
          signed_up?: boolean
          user_id?: string | null
          visited_at?: string
        }
        Update: {
          converted_to_subscription?: boolean
          converted_to_trial?: boolean
          id?: string
          metadata?: Json | null
          referrer?: string | null
          session_id?: string
          signed_up?: boolean
          user_id?: string | null
          visited_at?: string
        }
        Relationships: []
      }
      waypoints: {
        Row: {
          actual_arrival_time: string | null
          coordinates: Json
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          elevation_m: number | null
          estimated_arrival_time: string | null
          id: string
          images: string[] | null
          is_completed: boolean | null
          metadata: Json | null
          name: string
          notes: string | null
          order_index: number
          track_id: string | null
          trip_id: string
          updated_at: string | null
          user_id: string
          waypoint_type: string | null
        }
        Insert: {
          actual_arrival_time?: string | null
          coordinates: Json
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          elevation_m?: number | null
          estimated_arrival_time?: string | null
          id?: string
          images?: string[] | null
          is_completed?: boolean | null
          metadata?: Json | null
          name: string
          notes?: string | null
          order_index?: number
          track_id?: string | null
          trip_id: string
          updated_at?: string | null
          user_id: string
          waypoint_type?: string | null
        }
        Update: {
          actual_arrival_time?: string | null
          coordinates?: Json
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          elevation_m?: number | null
          estimated_arrival_time?: string | null
          id?: string
          images?: string[] | null
          is_completed?: boolean | null
          metadata?: Json | null
          name?: string
          notes?: string | null
          order_index?: number
          track_id?: string | null
          trip_id?: string
          updated_at?: string | null
          user_id?: string
          waypoint_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waypoints_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waypoints_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waypoints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waypoints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_details"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_bookmarks: {
        Row: {
          connection_params: Json
          created_at: string
          id: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_params: Json
          created_at?: string
          id?: never
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_params?: Json
          created_at?: string
          id?: never
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wis_bulletin_procedures: {
        Row: {
          bulletin_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          procedure_id: string | null
          relationship_type: string
        }
        Insert: {
          bulletin_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          procedure_id?: string | null
          relationship_type: string
        }
        Update: {
          bulletin_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          procedure_id?: string | null
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "wis_bulletin_procedures_bulletin_id_fkey"
            columns: ["bulletin_id"]
            isOneToOne: false
            referencedRelation: "wis_service_bulletins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wis_bulletin_procedures_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "wis_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_bulletins: {
        Row: {
          bulletin_number: string
          category: string | null
          content: string | null
          created_at: string | null
          date_issued: string | null
          date_updated: string | null
          description: string | null
          id: string
          media: Json | null
          severity: string | null
          status: string | null
          title: string
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          bulletin_number: string
          category?: string | null
          content?: string | null
          created_at?: string | null
          date_issued?: string | null
          date_updated?: string | null
          description?: string | null
          id?: string
          media?: Json | null
          severity?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          bulletin_number?: string
          category?: string | null
          content?: string | null
          created_at?: string | null
          date_issued?: string | null
          date_updated?: string | null
          description?: string | null
          id?: string
          media?: Json | null
          severity?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      wis_chunks: {
        Row: {
          chunk_index: number
          content: string
          doc_id: string
          doc_type: string
          embedding: string | null
          embedding_updated_at: string | null
          id: number
          media: Json | null
          ref: string | null
          searchable: unknown
          title: string | null
          updated_at: string
        }
        Insert: {
          chunk_index: number
          content: string
          doc_id: string
          doc_type: string
          embedding?: string | null
          embedding_updated_at?: string | null
          id?: number
          media?: Json | null
          ref?: string | null
          searchable?: unknown
          title?: string | null
          updated_at: string
        }
        Update: {
          chunk_index?: number
          content?: string
          doc_id?: string
          doc_type?: string
          embedding?: string | null
          embedding_updated_at?: string | null
          id?: number
          media?: Json | null
          ref?: string | null
          searchable?: unknown
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wis_component_relationships: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          relationship_type: string
          source_part_number: string
          strength: number | null
          target_part_number: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          relationship_type: string
          source_part_number: string
          strength?: number | null
          target_part_number: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          relationship_type?: string
          source_part_number?: string
          strength?: number | null
          target_part_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "wis_component_relationships_source_part_number_fkey"
            columns: ["source_part_number"]
            isOneToOne: false
            referencedRelation: "wis_parts_catalog"
            referencedColumns: ["part_number"]
          },
          {
            foreignKeyName: "wis_component_relationships_target_part_number_fkey"
            columns: ["target_part_number"]
            isOneToOne: false
            referencedRelation: "wis_parts_catalog"
            referencedColumns: ["part_number"]
          },
        ]
      }
      wis_component_taxonomy: {
        Row: {
          component_category: string
          created_at: string | null
          description: string | null
          id: string
          level: number
          metadata: Json | null
          parent_category: string | null
          subsystem_name: string | null
          system_name: string
          updated_at: string | null
        }
        Insert: {
          component_category: string
          created_at?: string | null
          description?: string | null
          id?: string
          level?: number
          metadata?: Json | null
          parent_category?: string | null
          subsystem_name?: string | null
          system_name: string
          updated_at?: string | null
        }
        Update: {
          component_category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          level?: number
          metadata?: Json | null
          parent_category?: string | null
          subsystem_name?: string | null
          system_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      wis_components: {
        Row: {
          component_code: string
          component_name: string
          created_at: string | null
          description: string | null
          estimated_procedures: number | null
          id: string
          sort_order: number | null
          system_id: string | null
        }
        Insert: {
          component_code: string
          component_name: string
          created_at?: string | null
          description?: string | null
          estimated_procedures?: number | null
          id?: string
          sort_order?: number | null
          system_id?: string | null
        }
        Update: {
          component_code?: string
          component_name?: string
          created_at?: string | null
          description?: string | null
          estimated_procedures?: number | null
          id?: string
          sort_order?: number | null
          system_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wis_components_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "wis_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_diagrams: {
        Row: {
          created_at: string | null
          file_path: string | null
          id: string
          metadata: Json | null
          name: string
          part_id: string | null
          procedure_id: string | null
          thumbnail_path: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json | null
          name: string
          part_id?: string | null
          procedure_id?: string | null
          thumbnail_path?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          file_path?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          part_id?: string | null
          procedure_id?: string | null
          thumbnail_path?: string | null
          type?: string | null
        }
        Relationships: []
      }
      wis_etl_logs: {
        Row: {
          created_at: string | null
          id: string
          job_id: string | null
          log_level: string
          message: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          log_level: string
          message: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          log_level?: string
          message?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "wis_etl_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_wis_active_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wis_etl_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "wis_ingest_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_file_metadata: {
        Row: {
          complexity_score: number | null
          content_type: string | null
          created_at: string | null
          extraction_confidence: number | null
          file_format: string | null
          file_name: string
          file_size_bytes: number | null
          id: string
          original_offset: number | null
          quality_ranking: number | null
          size_category: string | null
          storage_url: string
          vehicle_compatibility: string[] | null
        }
        Insert: {
          complexity_score?: number | null
          content_type?: string | null
          created_at?: string | null
          extraction_confidence?: number | null
          file_format?: string | null
          file_name: string
          file_size_bytes?: number | null
          id?: string
          original_offset?: number | null
          quality_ranking?: number | null
          size_category?: string | null
          storage_url: string
          vehicle_compatibility?: string[] | null
        }
        Update: {
          complexity_score?: number | null
          content_type?: string | null
          created_at?: string | null
          extraction_confidence?: number | null
          file_format?: string | null
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          original_offset?: number | null
          quality_ranking?: number | null
          size_category?: string | null
          storage_url?: string
          vehicle_compatibility?: string[] | null
        }
        Relationships: []
      }
      wis_ingest_errors: {
        Row: {
          created_at: string | null
          error_code: string | null
          error_context: Json | null
          error_message: string
          error_type: string
          id: string
          job_id: string | null
          severity: string | null
        }
        Insert: {
          created_at?: string | null
          error_code?: string | null
          error_context?: Json | null
          error_message: string
          error_type: string
          id?: string
          job_id?: string | null
          severity?: string | null
        }
        Update: {
          created_at?: string | null
          error_code?: string | null
          error_context?: Json | null
          error_message?: string
          error_type?: string
          id?: string
          job_id?: string | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wis_ingest_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_wis_active_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wis_ingest_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "wis_ingest_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_ingest_jobs: {
        Row: {
          checkpoint_state: Json | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          job_type: string
          plan_item_id: string | null
          progress_pct: number | null
          result_summary: Json | null
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          checkpoint_state?: Json | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          plan_item_id?: string | null
          progress_pct?: number | null
          result_summary?: Json | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          checkpoint_state?: Json | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          plan_item_id?: string | null
          progress_pct?: number | null
          result_summary?: Json | null
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wis_ingest_jobs_plan_item_id_fkey"
            columns: ["plan_item_id"]
            isOneToOne: false
            referencedRelation: "wis_plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_media_catalog: {
        Row: {
          auto_generated_description: string | null
          bucket: string
          component_tags: string[] | null
          content_embedding: string | null
          created_at: string | null
          description: string | null
          dimensions: Json | null
          file_name: string
          file_size_bytes: number | null
          id: string
          media_type: string
          part_numbers_shown: string[] | null
          related_procedures: string[] | null
          similar_media: string[] | null
          system_tags: string[] | null
          updated_at: string | null
          visual_embedding: string | null
          visual_features: Json | null
        }
        Insert: {
          auto_generated_description?: string | null
          bucket: string
          component_tags?: string[] | null
          content_embedding?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          file_name: string
          file_size_bytes?: number | null
          id?: string
          media_type: string
          part_numbers_shown?: string[] | null
          related_procedures?: string[] | null
          similar_media?: string[] | null
          system_tags?: string[] | null
          updated_at?: string | null
          visual_embedding?: string | null
          visual_features?: Json | null
        }
        Update: {
          auto_generated_description?: string | null
          bucket?: string
          component_tags?: string[] | null
          content_embedding?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: Json | null
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          media_type?: string
          part_numbers_shown?: string[] | null
          related_procedures?: string[] | null
          similar_media?: string[] | null
          system_tags?: string[] | null
          updated_at?: string | null
          visual_embedding?: string | null
          visual_features?: Json | null
        }
        Relationships: []
      }
      wis_media_files: {
        Row: {
          bucket_name: string
          created_at: string | null
          description: string | null
          file_name: string
          file_size_bytes: number | null
          id: string
          media_type: string
          procedure_ids: string[] | null
          storage_url: string
          updated_at: string | null
        }
        Insert: {
          bucket_name?: string
          created_at?: string | null
          description?: string | null
          file_name: string
          file_size_bytes?: number | null
          id?: string
          media_type?: string
          procedure_ids?: string[] | null
          storage_url: string
          updated_at?: string | null
        }
        Update: {
          bucket_name?: string
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          media_type?: string
          procedure_ids?: string[] | null
          storage_url?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      wis_mercedes_proprietary: {
        Row: {
          confidence_score: number | null
          data_type: string | null
          extracted_at: string | null
          file_name: string
          file_size_bytes: number | null
          id: string
          part_numbers: string[] | null
          storage_url: string
          vehicle_models: string[] | null
        }
        Insert: {
          confidence_score?: number | null
          data_type?: string | null
          extracted_at?: string | null
          file_name: string
          file_size_bytes?: number | null
          id?: string
          part_numbers?: string[] | null
          storage_url: string
          vehicle_models?: string[] | null
        }
        Update: {
          confidence_score?: number | null
          data_type?: string | null
          extracted_at?: string | null
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          part_numbers?: string[] | null
          storage_url?: string
          vehicle_models?: string[] | null
        }
        Relationships: []
      }
      wis_models: {
        Row: {
          active: boolean | null
          alias_of: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          model_code: string
          model_name: string
          sort_order: number | null
          year_range: string | null
        }
        Insert: {
          active?: boolean | null
          alias_of?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          model_code: string
          model_name: string
          sort_order?: number | null
          year_range?: string | null
        }
        Update: {
          active?: boolean | null
          alias_of?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          model_code?: string
          model_name?: string
          sort_order?: number | null
          year_range?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_wis_models_alias_of"
            columns: ["alias_of"]
            isOneToOne: false
            referencedRelation: "wis_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wis_models_alias_of_fkey"
            columns: ["alias_of"]
            isOneToOne: false
            referencedRelation: "wis_models"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_parts: {
        Row: {
          alternative_parts: string[] | null
          category: string | null
          created_at: string | null
          description: string
          id: string
          mercedes_part_number: string
          specifications: Json | null
          status: string | null
          superseded_by_part_number: string | null
          supersedes_part_number: string | null
        }
        Insert: {
          alternative_parts?: string[] | null
          category?: string | null
          created_at?: string | null
          description: string
          id?: string
          mercedes_part_number: string
          specifications?: Json | null
          status?: string | null
          superseded_by_part_number?: string | null
          supersedes_part_number?: string | null
        }
        Update: {
          alternative_parts?: string[] | null
          category?: string | null
          created_at?: string | null
          description?: string
          id?: string
          mercedes_part_number?: string
          specifications?: Json | null
          status?: string | null
          superseded_by_part_number?: string | null
          supersedes_part_number?: string | null
        }
        Relationships: []
      }
      wis_parts_catalog: {
        Row: {
          availability: string | null
          category: string
          compatible_years: number[] | null
          created_at: string | null
          cross_reference: string[] | null
          description: string
          description_embedding: string | null
          id: string
          media_references: Json | null
          part_number: string
          price_eur: number | null
          related_parts: string[] | null
          required_with: string[] | null
          subsystem_name: string | null
          superseded_by: string | null
          system_name: string
          technical_specs: Json | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          availability?: string | null
          category: string
          compatible_years?: number[] | null
          created_at?: string | null
          cross_reference?: string[] | null
          description: string
          description_embedding?: string | null
          id?: string
          media_references?: Json | null
          part_number: string
          price_eur?: number | null
          related_parts?: string[] | null
          required_with?: string[] | null
          subsystem_name?: string | null
          superseded_by?: string | null
          system_name: string
          technical_specs?: Json | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          availability?: string | null
          category?: string
          compatible_years?: number[] | null
          created_at?: string | null
          cross_reference?: string[] | null
          description?: string
          description_embedding?: string | null
          id?: string
          media_references?: Json | null
          part_number?: string
          price_eur?: number | null
          related_parts?: string[] | null
          required_with?: string[] | null
          subsystem_name?: string | null
          superseded_by?: string | null
          system_name?: string
          technical_specs?: Json | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      wis_plan_items: {
        Row: {
          component_code: string | null
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          model_code: string
          priority: number | null
          source_fingerprint: string | null
          source_path: string
          source_type: string
          status: string | null
          system_code: string | null
          updated_at: string | null
        }
        Insert: {
          component_code?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          model_code: string
          priority?: number | null
          source_fingerprint?: string | null
          source_path: string
          source_type: string
          status?: string | null
          system_code?: string | null
          updated_at?: string | null
        }
        Update: {
          component_code?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          model_code?: string
          priority?: number | null
          source_fingerprint?: string | null
          source_path?: string
          source_type?: string
          status?: string | null
          system_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wis_plan_releases: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          plan_items: Json
          release_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          plan_items: Json
          release_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          plan_items?: Json
          release_name?: string
        }
        Relationships: []
      }
      wis_procedure_media_mapping: {
        Row: {
          auto_generated: boolean | null
          created_at: string | null
          id: string
          media_id: string
          media_role: string | null
          procedure_id: string
          relevance_score: number | null
          step_number: number | null
        }
        Insert: {
          auto_generated?: boolean | null
          created_at?: string | null
          id?: string
          media_id: string
          media_role?: string | null
          procedure_id: string
          relevance_score?: number | null
          step_number?: number | null
        }
        Update: {
          auto_generated?: boolean | null
          created_at?: string | null
          id?: string
          media_id?: string
          media_role?: string | null
          procedure_id?: string
          relevance_score?: number | null
          step_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wis_procedure_media_mapping_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "wis_media_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_procedure_parts: {
        Row: {
          created_at: string | null
          id: string
          part_id: string | null
          procedure_id: string | null
          quantity: number
          required: boolean | null
          step_numbers: number[] | null
          usage_note: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          part_id?: string | null
          procedure_id?: string | null
          quantity?: number
          required?: boolean | null
          step_numbers?: number[] | null
          usage_note?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          part_id?: string | null
          procedure_id?: string | null
          quantity?: number
          required?: boolean | null
          step_numbers?: number[] | null
          usage_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wis_procedure_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "wis_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wis_procedure_parts_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "wis_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_procedure_relationships: {
        Row: {
          created_at: string | null
          id: string
          relationship_description: string | null
          relationship_type: Database["public"]["Enums"]["procedure_relationship_type"]
          sequence_order: number | null
          source_procedure_id: string | null
          target_procedure_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          relationship_description?: string | null
          relationship_type: Database["public"]["Enums"]["procedure_relationship_type"]
          sequence_order?: number | null
          source_procedure_id?: string | null
          target_procedure_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          relationship_description?: string | null
          relationship_type?: Database["public"]["Enums"]["procedure_relationship_type"]
          sequence_order?: number | null
          source_procedure_id?: string | null
          target_procedure_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wis_procedure_relationships_source_procedure_id_fkey"
            columns: ["source_procedure_id"]
            isOneToOne: false
            referencedRelation: "wis_procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wis_procedure_relationships_target_procedure_id_fkey"
            columns: ["target_procedure_id"]
            isOneToOne: false
            referencedRelation: "wis_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_procedure_steps: {
        Row: {
          additional_image_urls: string[] | null
          common_mistakes: string[] | null
          created_at: string | null
          detailed_notes: string | null
          diagram_urls: string[] | null
          id: string
          instruction: string
          measurements: Json | null
          primary_image_url: string | null
          procedure_id: string | null
          safety_warnings: string[] | null
          step_number: number
          step_title: string | null
          torque_specs: Json | null
          verification_points: string[] | null
          video_url: string | null
        }
        Insert: {
          additional_image_urls?: string[] | null
          common_mistakes?: string[] | null
          created_at?: string | null
          detailed_notes?: string | null
          diagram_urls?: string[] | null
          id?: string
          instruction: string
          measurements?: Json | null
          primary_image_url?: string | null
          procedure_id?: string | null
          safety_warnings?: string[] | null
          step_number: number
          step_title?: string | null
          torque_specs?: Json | null
          verification_points?: string[] | null
          video_url?: string | null
        }
        Update: {
          additional_image_urls?: string[] | null
          common_mistakes?: string[] | null
          created_at?: string | null
          detailed_notes?: string | null
          diagram_urls?: string[] | null
          id?: string
          instruction?: string
          measurements?: Json | null
          primary_image_url?: string | null
          procedure_id?: string | null
          safety_warnings?: string[] | null
          step_number?: number
          step_title?: string | null
          torque_specs?: Json | null
          verification_points?: string[] | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wis_procedure_steps_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "wis_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_procedure_tools: {
        Row: {
          created_at: string | null
          id: string
          procedure_id: string | null
          required: boolean | null
          step_numbers: number[] | null
          tool_id: string | null
          usage_note: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          procedure_id?: string | null
          required?: boolean | null
          step_numbers?: number[] | null
          tool_id?: string | null
          usage_note?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          procedure_id?: string | null
          required?: boolean | null
          step_numbers?: number[] | null
          tool_id?: string | null
          usage_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wis_procedure_tools_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "wis_procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wis_procedure_tools_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "wis_tools"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_procedures: {
        Row: {
          component_id: string | null
          created_at: string | null
          description: string | null
          difficulty_level: number | null
          difficulty_rating: number | null
          estimated_time: number | null
          estimated_time_hours: number | null
          id: string
          labor_category: string | null
          media_files: string[] | null
          mercedes_files: string[] | null
          overview: string | null
          primary_files: string[] | null
          procedure_code: string
          required_tools: string[] | null
          safety_warnings: string[] | null
          search_vector: unknown
          source_fingerprint: string | null
          source_path: string | null
          source_url: string | null
          special_notes: string[] | null
          status: string | null
          supersedes_procedure_id: string | null
          supplementary_files: string[] | null
          title: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          component_id?: string | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: number | null
          difficulty_rating?: number | null
          estimated_time?: number | null
          estimated_time_hours?: number | null
          id?: string
          labor_category?: string | null
          media_files?: string[] | null
          mercedes_files?: string[] | null
          overview?: string | null
          primary_files?: string[] | null
          procedure_code: string
          required_tools?: string[] | null
          safety_warnings?: string[] | null
          search_vector?: unknown
          source_fingerprint?: string | null
          source_path?: string | null
          source_url?: string | null
          special_notes?: string[] | null
          status?: string | null
          supersedes_procedure_id?: string | null
          supplementary_files?: string[] | null
          title: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          component_id?: string | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: number | null
          difficulty_rating?: number | null
          estimated_time?: number | null
          estimated_time_hours?: number | null
          id?: string
          labor_category?: string | null
          media_files?: string[] | null
          mercedes_files?: string[] | null
          overview?: string | null
          primary_files?: string[] | null
          procedure_code?: string
          required_tools?: string[] | null
          safety_warnings?: string[] | null
          search_vector?: unknown
          source_fingerprint?: string | null
          source_path?: string | null
          source_url?: string | null
          special_notes?: string[] | null
          status?: string | null
          supersedes_procedure_id?: string | null
          supplementary_files?: string[] | null
          title?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wis_procedures_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "wis_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wis_procedures_supersedes_procedure_id_fkey"
            columns: ["supersedes_procedure_id"]
            isOneToOne: false
            referencedRelation: "wis_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_properties: {
        Row: {
          attribute_id: string | null
          component_id: string | null
          confidence: number | null
          created_at: string | null
          engine_code: string | null
          id: string
          model_code: string | null
          source_ref: string | null
          source_type: string | null
          unit: string | null
          updated_at: string | null
          value: string | null
        }
        Insert: {
          attribute_id?: string | null
          component_id?: string | null
          confidence?: number | null
          created_at?: string | null
          engine_code?: string | null
          id?: string
          model_code?: string | null
          source_ref?: string | null
          source_type?: string | null
          unit?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          attribute_id?: string | null
          component_id?: string | null
          confidence?: number | null
          created_at?: string | null
          engine_code?: string | null
          id?: string
          model_code?: string | null
          source_ref?: string | null
          source_type?: string | null
          unit?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wis_properties_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wis_properties_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_samples: {
        Row: {
          created_at: string
          id: string
          job_id: string
          procedure_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          procedure_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          procedure_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "wis_samples_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "v_wis_active_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wis_samples_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "wis_ingest_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wis_samples_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "wis_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_schema_versions: {
        Row: {
          applied_at: string | null
          description: string | null
          id: string
          migration_sql: string | null
          version: string
        }
        Insert: {
          applied_at?: string | null
          description?: string | null
          id?: string
          migration_sql?: string | null
          version: string
        }
        Update: {
          applied_at?: string | null
          description?: string | null
          id?: string
          migration_sql?: string | null
          version?: string
        }
        Relationships: []
      }
      wis_search_queries: {
        Row: {
          created_at: string | null
          id: string
          model_bias: string | null
          query_text: string
          results_count: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          model_bias?: string | null
          query_text: string
          results_count?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          model_bias?: string | null
          query_text?: string
          results_count?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      wis_semantic_search_cache: {
        Row: {
          cache_expires_at: string | null
          created_at: string | null
          id: string
          query_embedding: string | null
          query_text: string
          result_count: number | null
          search_results: Json
        }
        Insert: {
          cache_expires_at?: string | null
          created_at?: string | null
          id?: string
          query_embedding?: string | null
          query_text: string
          result_count?: number | null
          search_results: Json
        }
        Update: {
          cache_expires_at?: string | null
          created_at?: string | null
          id?: string
          query_embedding?: string | null
          query_text?: string
          result_count?: number | null
          search_results?: Json
        }
        Relationships: []
      }
      wis_servers: {
        Row: {
          created_at: string
          guacamole_url: string
          host_url: string
          id: number
          max_concurrent_sessions: number
          name: string
          specs: Json
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          guacamole_url: string
          host_url: string
          id?: never
          max_concurrent_sessions?: number
          name: string
          specs?: Json
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          guacamole_url?: string
          host_url?: string
          id?: never
          max_concurrent_sessions?: number
          name?: string
          specs?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      wis_service_bulletins: {
        Row: {
          applicable_models: string[] | null
          applicable_systems: string[] | null
          bulletin_number: string
          category: string | null
          content: string | null
          created_at: string | null
          description: string | null
          effective_date: string | null
          id: string
          pdf_url: string | null
          search_vector: unknown
          severity: string | null
          status: string | null
          supersedes_bulletin: string | null
          title: string
        }
        Insert: {
          applicable_models?: string[] | null
          applicable_systems?: string[] | null
          bulletin_number: string
          category?: string | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          pdf_url?: string | null
          search_vector?: unknown
          severity?: string | null
          status?: string | null
          supersedes_bulletin?: string | null
          title: string
        }
        Update: {
          applicable_models?: string[] | null
          applicable_systems?: string[] | null
          bulletin_number?: string
          category?: string | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          pdf_url?: string | null
          search_vector?: unknown
          severity?: string | null
          status?: string | null
          supersedes_bulletin?: string | null
          title?: string
        }
        Relationships: []
      }
      wis_sessions: {
        Row: {
          connection_token: string
          created_at: string
          ended_at: string | null
          id: number
          server_id: number
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_token: string
          created_at?: string
          ended_at?: string | null
          id?: never
          server_id: number
          started_at?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_token?: string
          created_at?: string
          ended_at?: string | null
          id?: never
          server_id?: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wis_sessions_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "wis_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_systems: {
        Row: {
          created_at: string | null
          description: string | null
          estimated_procedures: number | null
          icon_name: string | null
          id: string
          model_id: string | null
          sort_order: number | null
          system_code: string
          system_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          estimated_procedures?: number | null
          icon_name?: string | null
          id?: string
          model_id?: string | null
          sort_order?: number | null
          system_code: string
          system_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          estimated_procedures?: number | null
          icon_name?: string | null
          id?: string
          model_id?: string | null
          sort_order?: number | null
          system_code?: string
          system_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "wis_systems_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "wis_models"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_technical_specs: {
        Row: {
          component_system: string | null
          created_at: string | null
          id: string
          source_file_id: string | null
          spec_type: string | null
          unit: string | null
          value: string | null
          vehicle_models: string[] | null
        }
        Insert: {
          component_system?: string | null
          created_at?: string | null
          id?: string
          source_file_id?: string | null
          spec_type?: string | null
          unit?: string | null
          value?: string | null
          vehicle_models?: string[] | null
        }
        Update: {
          component_system?: string | null
          created_at?: string | null
          id?: string
          source_file_id?: string | null
          spec_type?: string | null
          unit?: string | null
          value?: string | null
          vehicle_models?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "wis_technical_specs_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "wis_file_metadata"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_tools: {
        Row: {
          alternative_tools: string[] | null
          created_at: string | null
          description: string | null
          id: string
          mercedes_tool_number: string | null
          specifications: Json | null
          tool_name: string
          tool_type: string | null
        }
        Insert: {
          alternative_tools?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          mercedes_tool_number?: string | null
          specifications?: Json | null
          tool_name: string
          tool_type?: string | null
        }
        Update: {
          alternative_tools?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          mercedes_tool_number?: string | null
          specifications?: Json | null
          tool_name?: string
          tool_type?: string | null
        }
        Relationships: []
      }
      wis_usage_logs: {
        Row: {
          created_at: string
          duration_seconds: number
          id: number
          server_id: number
          session_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds: number
          id?: never
          server_id: number
          session_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: never
          server_id?: number
          session_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wis_usage_logs_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "wis_servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wis_usage_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "wis_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_user_bookmarks: {
        Row: {
          completed_at: string | null
          completion_notes: string | null
          created_at: string | null
          id: string
          personal_notes: string | null
          procedure_id: string | null
          rating: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          id?: string
          personal_notes?: string | null
          procedure_id?: string | null
          rating?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          id?: string
          personal_notes?: string | null
          procedure_id?: string | null
          rating?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wis_user_bookmarks_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "wis_procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wis_user_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wis_user_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_details"
            referencedColumns: ["id"]
          },
        ]
      }
      wis_wiring: {
        Row: {
          components: Json | null
          connections: Json | null
          created_at: string | null
          diagram_name: string
          id: string
          model: string
          svg_content: string | null
          system: string
        }
        Insert: {
          components?: Json | null
          connections?: Json | null
          created_at?: string | null
          diagram_name: string
          id?: string
          model: string
          svg_content?: string | null
          system: string
        }
        Update: {
          components?: Json | null
          connections?: Json | null
          created_at?: string | null
          diagram_name?: string
          id?: string
          model?: string
          svg_content?: string | null
          system?: string
        }
        Relationships: []
      }
    }
    Views: {
      barry_manual_navigation: {
        Row: {
          direct_url: string | null
          end_page: number | null
          file_size_mb: number | null
          filename: string | null
          keywords: string[] | null
          manual_type: string | null
          page_count: number | null
          part_number: number | null
          priority: string | null
          slug: string | null
          start_page: number | null
          title: string | null
        }
        Insert: {
          direct_url?: never
          end_page?: number | null
          file_size_mb?: number | null
          filename?: string | null
          keywords?: string[] | null
          manual_type?: string | null
          page_count?: number | null
          part_number?: number | null
          priority?: string | null
          slug?: string | null
          start_page?: number | null
          title?: string | null
        }
        Update: {
          direct_url?: never
          end_page?: number | null
          file_size_mb?: number | null
          filename?: string | null
          keywords?: string[] | null
          manual_type?: string | null
          page_count?: number | null
          part_number?: number | null
          priority?: string | null
          slug?: string | null
          start_page?: number | null
          title?: string | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      manual_processing_view: {
        Row: {
          category: string | null
          created_at: string | null
          file_size: number | null
          filename: string | null
          id: string | null
          model_codes: string[] | null
          page_count: number | null
          processing_status: string | null
          source_table: string | null
          title: string | null
          updated_at: string | null
          uploaded_by: string | null
          year_range: string | null
        }
        Relationships: []
      }
      marketplace_listings_with_seller: {
        Row: {
          category: string | null
          condition: string | null
          created_at: string | null
          description: string | null
          id: string | null
          images: string[] | null
          location: string | null
          price: number | null
          seller_email: string | null
          seller_id: string | null
          seller_name: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          views: number | null
        }
        Relationships: []
      }
      rps_existing_pages: {
        Row: {
          page_number: number | null
        }
        Relationships: []
      }
      rps_missing_storage: {
        Row: {
          exists_in_storage: boolean | null
          expected_object_name: string | null
          group_code: string | null
          page_number: number | null
        }
        Relationships: []
      }
      security_analytics: {
        Row: {
          event_count: number | null
          event_type: string | null
          hour: string | null
          severity: string | null
          unique_users: number | null
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
          status_message: string | null
        }
        Relationships: []
      }
      user_details: {
        Row: {
          avatar_url: string | null
          banned_until: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          experience_level: string | null
          full_name: string | null
          id: string | null
          is_admin: boolean | null
          location: string | null
          online: boolean | null
          unimog_model: string | null
          unimog_modifications: string | null
          unimog_year: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          banned_until?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          experience_level?: string | null
          full_name?: string | null
          id?: string | null
          is_admin?: boolean | null
          location?: string | null
          online?: boolean | null
          unimog_model?: string | null
          unimog_modifications?: string | null
          unimog_year?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          banned_until?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          experience_level?: string | null
          full_name?: string | null
          id?: string | null
          is_admin?: boolean | null
          location?: string | null
          online?: boolean | null
          unimog_model?: string | null
          unimog_modifications?: string | null
          unimog_year?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_wis_active_jobs: {
        Row: {
          error_count: number | null
          id: string | null
          job_type: string | null
          model_code: string | null
          progress_pct: number | null
          source_path: string | null
          source_type: string | null
          started_at: string | null
          status: string | null
          system_code: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      vw_pending_synonyms: {
        Row: {
          approved_by: string | null
          canonical_name: string | null
          confidence: number | null
          created_at: string | null
          id: string | null
          lang: string | null
          synonym: string | null
          synonym_type: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      vw_recent_wis_properties: {
        Row: {
          attribute_name: string | null
          component_name: string | null
          confidence: number | null
          created_at: string | null
          engine_code: string | null
          id: string | null
          model_code: string | null
          source_ref: string | null
          source_type: string | null
          unit: string | null
          updated_at: string | null
          value: string | null
        }
        Relationships: []
      }
      wis_documents_unified: {
        Row: {
          category: string | null
          code: string | null
          content: string | null
          created_at: string | null
          description: string | null
          difficulty_level: number | null
          document_type: string | null
          estimated_time_hours: number | null
          id: string | null
          models_affected: string[] | null
          severity_level: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      alert_if_signup_broken: { Args: never; Returns: undefined }
      approve_manual_for_processing: {
        Args: { pending_upload_id: string }
        Returns: string
      }
      approve_notice_submission: {
        Args: {
          admin_notes?: string
          reviewer_id: string
          submission_id: string
        }
        Returns: string
      }
      barry_search_pipeline: {
        Args: { user_id_param?: string; user_query: string }
        Returns: {
          response_time_ms: number
          result_count: number
          results: Json
          search_stage: string
          suggestions: Json
        }[]
      }
      barry_search_with_personality: {
        Args: { user_id_param?: string; user_query: string }
        Returns: {
          barry_response: string
          response_time_ms: number
          result_count: number
          results: Json
          search_stage: string
          suggestions: Json
        }[]
      }
      build_barry_response: {
        Args: {
          include_safety?: boolean
          manual_reference?: Json
          system_category_param?: string
          user_query: string
        }
        Returns: string
      }
      calculate_trip_distance: {
        Args: { end_coords: Json; start_coords: Json }
        Returns: number
      }
      check_admin_access: { Args: never; Returns: boolean }
      check_column_exists: {
        Args: { column_name: string; table_name: string }
        Returns: boolean
      }
      check_device_limit: { Args: { p_user_id: string }; Returns: Json }
      check_download_limit: { Args: { p_user_id: string }; Returns: Json }
      check_signup_endpoints: { Args: never; Returns: Json }
      check_signup_health: {
        Args: never
        Returns: {
          details: Json
          message: string
          should_alert: boolean
          status: string
        }[]
      }
      check_trial_status: { Args: { p_user_id: string }; Returns: Json }
      cleanup_old_security_events: { Args: never; Returns: undefined }
      create_conversation: {
        Args: { user1_id: string; user2_id: string }
        Returns: string
      }
      create_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_reference_id?: string
          p_reference_type?: string
          p_sender_id?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      decrement_feedback_votes:
        | { Args: { feedback_id: string }; Returns: undefined }
        | { Args: never; Returns: undefined }
      decrement_saved_count: {
        Args: { listing_id: string }
        Returns: undefined
      }
      delete_gpx_track: { Args: { track_uuid: string }; Returns: boolean }
      disablelongtransactions: { Args: never; Returns: string }
      dreamlit_auth_admin_executor: {
        Args: { command: string }
        Returns: undefined
      }
      dropgeometrycolumn:
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      dropgeometrytable:
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      find_conversation_by_participants: {
        Args: { user_ids: string[] }
        Returns: {
          conversation_id: string
          updated_at: string
        }[]
      }
      find_events_nearby: {
        Args: {
          p_event_type?: string
          radius_km?: number
          user_lat: number
          user_lng: number
        }
        Returns: {
          distance_km: number
          event_id: string
          event_type: string
          location_name: string
          max_participants: number
          organizer_id: string
          participant_count: number
          start_date: string
          title: string
        }[]
      }
      find_manual_by_fuzzy_title: {
        Args: { partial_title: string; similarity_threshold?: number }
        Returns: {
          chunk_count: number
          manual_title: string
          similarity_score: number
        }[]
      }
      generate_order_number: { Args: never; Returns: string }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_available_server: {
        Args: never
        Returns: {
          active_sessions: number
          guacamole_url: string
          host_url: string
          id: number
          name: string
        }[]
      }
      get_barry_personality: {
        Args: { system_category_param?: string; template_type_param: string }
        Returns: string
      }
      get_component_hierarchy: {
        Args: never
        Returns: {
          component_category: string
          description: string
          id: string
          level: number
          parent_category: string
          subsystem_name: string
          system_name: string
        }[]
      }
      get_event_participant_count: {
        Args: { p_event_id: string }
        Returns: number
      }
      get_event_summary: { Args: { p_event_id: string }; Returns: Json }
      get_gpx_track_with_points: { Args: { track_uuid: string }; Returns: Json }
      get_group_member_count: {
        Args: { group_id_param: string }
        Returns: number
      }
      get_manual_coverage_stats: {
        Args: never
        Returns: {
          avg_extraction_quality: number
          chunks_with_embeddings: number
          embedding_coverage: number
          manual_title: string
          pages_with_visuals: number
          total_chunks: number
          unique_sections: number
        }[]
      }
      get_manual_page_context: {
        Args: {
          context_pages?: number
          target_manual_title: string
          target_page: number
        }
        Returns: {
          chunk_id: string
          content: string
          extraction_quality: number
          has_visual_elements: boolean
          is_target_page: boolean
          manual_title: string
          page_image_url: string
          page_number: number
          section_title: string
          visual_content_type: string
        }[]
      }
      get_manual_processing_stats: {
        Args: never
        Returns: {
          total_approved: number
          total_chunks: number
          total_pending: number
          total_processed: number
          total_rejected: number
        }[]
      }
      get_manual_processing_status: { Args: never; Returns: Json }
      get_parts_with_media: {
        Args: never
        Returns: {
          category: string
          description: string
          id: string
          media_references: Json
          part_number: string
          system_name: string
        }[]
      }
      get_popular_wis_content: {
        Args: { limit_count?: number }
        Returns: {
          content_type: string
          id: string
          model: string
          title: string
          view_count: number
        }[]
      }
      get_post_comment_count: {
        Args: { post_id_param: string }
        Returns: number
      }
      get_post_like_count: { Args: { post_id_param: string }; Returns: number }
      get_posts_with_engagement: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          author_id: string
          avatar_url: string
          category: string
          comments_count: number
          content: string
          created_at: string
          display_name: string
          full_name: string
          id: string
          image_url: string
          likes_count: number
          location: string
          online: boolean
          shares_count: number
          tags: string[]
          title: string
          unimog_model: string
          updated_at: string
          user_has_liked: boolean
          visibility: string
        }[]
      }
      get_procedure_bulletins: {
        Args: { procedure_id: string }
        Returns: {
          bulletin_number: string
          date_issued: string
          severity: string
          title: string
        }[]
      }
      get_procedure_parts: {
        Args: { procedure_id: string }
        Returns: {
          description: string
          part_number: string
          quantity: number
        }[]
      }
      get_procedure_search: {
        Args: never
        Returns: {
          component_id: string
          description: string
          difficulty_rating: number
          estimated_time: number
          id: string
          system_name: string
          title: string
        }[]
      }
      get_procedure_tools: {
        Args: { procedure_id: string }
        Returns: {
          required: boolean
          tool_name: string
          tool_type: string
        }[]
      }
      get_recommended_events_for_user: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          distance_km: number
          event_id: string
          event_type: string
          match_reason: string
          start_date: string
          title: string
        }[]
      }
      get_referencing_procedures: {
        Args: { component_id: string }
        Returns: {
          description: string
          id: string
          title: string
        }[]
      }
      get_related_procedures: {
        Args: { procedure_id: string }
        Returns: {
          description: string
          id: string
          title: string
        }[]
      }
      get_rps_exploded_view: {
        Args: { p_component: string }
        Returns: {
          group_code: string
          group_name: string
          page_number: number
        }[]
      }
      get_rps_exploded_view_v2: {
        Args: { p_component: string }
        Returns: {
          group_code: string
          group_name: string
          page_number: number
          score: number
        }[]
      }
      get_rps_group_candidates: {
        Args: { p_component: string }
        Returns: {
          group_code: string
          group_name: string
          score: number
        }[]
      }
      get_search_suggestions: {
        Args: { max_suggestions?: number; user_query: string }
        Returns: {
          suggested_term: string
          term_category: string
          usage_count: number
        }[]
      }
      get_shared_trips: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          description: string
          difficulty: string
          distance_km: number
          id: string
          name: string
          owner_id: string
          owner_name: string
          shared_via: string
        }[]
      }
      get_system_analytics: {
        Args: never
        Returns: {
          name: string
          parts_count: number
          procedure_count: number
        }[]
      }
      get_trending_content:
        | {
            Args: never
            Returns: {
              content_id: number
              content_title: string
            }[]
          }
        | {
            Args: {
              content_type: string
              result_limit?: number
              time_ago: string
            }
            Returns: {
              content_id: string
              engagement_count: number
            }[]
          }
      get_unread_message_count:
        | { Args: never; Returns: number }
        | { Args: { user_id: string }; Returns: number }
      get_usage_statistics: {
        Args: {
          p_period_days?: number
          p_user_id: string
          p_vehicle_id?: string
        }
        Returns: {
          average_speed_kmh: number
          off_road_percentage: number
          total_distance_km: number
          total_operating_hours: number
          trip_count: number
        }[]
      }
      get_user_gpx_tracks: {
        Args: { user_uuid?: string }
        Returns: {
          created_at: string
          description: string
          distance: number
          duration: number
          elevation_gain: number
          elevation_max: number
          filename: string
          id: string
          name: string
          point_count: number
          trip_id: string
          waypoint_count: number
        }[]
      }
      get_user_subscription:
        | {
            Args: { user_id_param: string }
            Returns: {
              expires_at: string
              id: string
              is_active: boolean
              starts_at: string
              subscription_level: string
              tier: string
              user_id: string
            }[]
          }
        | {
            Args: never
            Returns: {
              cancel_at_period_end: boolean
              current_period_end: string
              current_period_start: string
              id: string
              stripe_customer_id: string
              stripe_subscription_id: string
              subscription_status: string
              subscription_type: string
              trial_ends_at: string
            }[]
          }
      get_wis_catalog: { Args: { model_code?: string }; Returns: Json }
      get_wis_component_hierarchy: {
        Args: never
        Returns: {
          component_category: string
          description: string
          id: string
          level: number
          parent_category: string
          subsystem_name: string
          system_name: string
        }[]
      }
      get_wis_items: {
        Args: {
          item_type: string
          limit_count?: number
          model_code?: string
          search_terms?: string[]
        }
        Returns: Json
      }
      get_wis_parts_with_media: {
        Args: never
        Returns: {
          category: string
          description: string
          id: string
          media_references: Json
          part_number: string
          system_name: string
        }[]
      }
      get_wis_procedure_details: {
        Args: { procedure_id: string }
        Returns: Json
      }
      get_wis_procedure_search: {
        Args: never
        Returns: {
          component_id: string
          description: string
          difficulty_rating: number
          estimated_time: number
          id: string
          system_name: string
          title: string
        }[]
      }
      get_wis_system_analytics: {
        Args: never
        Returns: {
          name: string
          parts_count: number
          procedure_count: number
        }[]
      }
      get_wis_tree: { Args: never; Returns: Json }
      gettransactionid: { Args: never; Returns: unknown }
      grant_free_access:
        | { Args: { user_id: string }; Returns: boolean }
        | {
            Args: { granting_user_id: string; target_user_id: string }
            Returns: boolean
          }
      has_active_subscription: { Args: { user_id: string }; Returns: boolean }
      has_role:
        | { Args: { role_name: string }; Returns: boolean }
        | { Args: never; Returns: boolean }
        | { Args: { role_name: string; user_id: number }; Returns: boolean }
        | {
            Args: { _role: Database["public"]["Enums"]["app_role"] }
            Returns: boolean
          }
        | {
            Args: {
              role: Database["public"]["Enums"]["app_role"]
              user_id: string
            }
            Returns: boolean
          }
      immutable_lower_unaccent: { Args: { "": string }; Returns: string }
      immutable_unaccent: { Args: { "": string }; Returns: string }
      increment_download_count: { Args: { doc_id: string }; Returns: boolean }
      increment_feedback_votes: {
        Args: { feedback_id: string }
        Returns: undefined
      }
      increment_product_clicks: {
        Args: { product_uuid: string }
        Returns: undefined
      }
      increment_saved_count: {
        Args: { listing_id: string }
        Returns: undefined
      }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { user_id?: string }; Returns: boolean }
      is_admin_safe: { Args: { user_id?: string }; Returns: boolean }
      is_event_full: { Args: { p_event_id: string }; Returns: boolean }
      is_group_admin: {
        Args: { group_id_param: string; user_id_param: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { group_id_param: string; user_id_param: string }
        Returns: boolean
      }
      is_super_admin: { Args: { user_id?: string }; Returns: boolean }
      is_trial_active:
        | { Args: { user_id: string }; Returns: boolean }
        | { Args: never; Returns: boolean }
      is_user_admin: { Args: { user_id: string }; Returns: boolean }
      list_manual_files: { Args: { bucket_name?: string }; Returns: Json }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mark_conversation_as_read:
        | {
            Args: { conversation_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.mark_conversation_as_read(conversation_id => int8), public.mark_conversation_as_read(conversation_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { conversation_id: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.mark_conversation_as_read(conversation_id => int8), public.mark_conversation_as_read(conversation_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      mark_message_as_read:
        | {
            Args: { message_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.mark_message_as_read(message_id => int8), public.mark_message_as_read(message_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | { Args: never; Returns: undefined }
        | {
            Args: { message_id: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.mark_message_as_read(message_id => int8), public.mark_message_as_read(message_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      match_manual_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          manual_title: string
          metadata: Json
          page_image_url: string
          page_number: number
          section_title: string
          similarity: number
        }[]
      }
      match_manual_images: {
        Args: {
          manual_ids?: string[]
          match_count: number
          query_embedding: string
        }
        Returns: {
          id_text: string
          manual_id: string
          page_image_url: string
          page_number: number
          section_title: string
          similarity: number
        }[]
      }
      normalize_component_phrase: { Args: { p: string }; Returns: string }
      normalize_search_text: { Args: { input_text: string }; Returns: string }
      populate_geometry_columns:
        | { Args: { use_typmod?: boolean }; Returns: string }
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      process_manual_rpc: {
        Args: { bucket_name?: string; manual_filename: string }
        Returns: Json
      }
      queue_admin_email: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_message: string
          p_subject: string
        }
        Returns: string
      }
      queue_admin_sms: {
        Args: { p_event_id: string; p_event_type: string; p_message: string }
        Returns: string
      }
      record_download: {
        Args: {
          p_file_size?: number
          p_file_type?: string
          p_resource: string
          p_user_id: string
        }
        Returns: boolean
      }
      reject_manual_upload: {
        Args: { pending_upload_id: string; reason?: string }
        Returns: boolean
      }
      reject_notice_submission: {
        Args: {
          admin_notes?: string
          rejection_reason: string
          reviewer_id: string
          submission_id: string
        }
        Returns: boolean
      }
      search_barry_cache: {
        Args: {
          max_results?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          barry_response: string
          id: string
          manual_references: Json
          original_query: string
          similarity_score: number
          usage_count: number
        }[]
      }
      search_curated_knowledge: {
        Args: { max_results?: number; user_query: string }
        Returns: {
          id: string
          manual_references: Json
          match_score: number
          match_type: string
          response_template: string
          search_priority: number
        }[]
      }
      search_enhanced_manual_chunks: {
        Args: {
          content_type_filter?: string
          limit_results?: number
          min_quality?: number
          search_query: string
        }
        Returns: {
          content: string
          content_type: string
          extraction_quality: number
          has_visual_elements: boolean
          id: string
          manual_id: string
          manual_title: string
          page_number: number
          procedure_complexity: number
          relevance_score: number
          section_title: string
          visual_content_type: string
        }[]
      }
      search_manual_chunks:
        | {
            Args: {
              match_count?: number
              match_threshold?: number
              query_embedding: string
            }
            Returns: {
              content: string
              id: string
              manual_id: string
              manual_title: string
              page_number: number
              section_title: string
              similarity: number
            }[]
          }
        | {
            Args: {
              match_count?: number
              match_threshold?: number
              query_embedding: string
            }
            Returns: {
              chunk_index: number
              content: string
              id: string
              manual_id: string
              manual_title: string
              page_number: number
              section_title: string
              similarity: number
            }[]
          }
      search_manual_chunks_fallback: {
        Args: {
          min_extraction_quality?: number
          query_text: string
          user_model?: string
        }
        Returns: {
          chunk_id: string
          content: string
          has_visual_elements: boolean
          manual_title: string
          match_type: string
          page_image_url: string
          page_number: number
          relevance_score: number
          section_title: string
        }[]
      }
      search_manual_chunks_hybrid:
        | {
            Args: {
              max_results?: number
              query_embedding: string
              query_text: string
              similarity_threshold?: number
              text_boost?: number
              user_model?: string
              vector_boost?: number
            }
            Returns: {
              chunk_id: string
              combined_score: number
              content: string
              extraction_quality: number
              has_visual_elements: boolean
              manual_title: string
              page_image_url: string
              page_number: number
              section_title: string
              text_rank: number
              vector_similarity: number
              visual_content_type: string
            }[]
          }
        | {
            Args: {
              max_results?: number
              query_embedding: string
              query_text: string
              similarity_threshold?: number
              user_model?: string
            }
            Returns: {
              chunk_id: string
              combined_score: number
              content: string
              has_visual_elements: boolean
              manual_title: string
              page_image_url: string
              page_number: number
              section_title: string
              similarity_score: number
            }[]
          }
      search_manual_chunks_semantic:
        | {
            Args: {
              max_results?: number
              query_embedding: string
              similarity_threshold?: number
              user_model?: string
            }
            Returns: {
              chunk_id: string
              content: string
              extraction_quality: number
              has_visual_elements: boolean
              manual_title: string
              page_image_url: string
              page_number: number
              section_title: string
              similarity_score: number
              visual_content_type: string
            }[]
          }
        | {
            Args: {
              max_results?: number
              query_embedding: string
              similarity_threshold?: number
              user_model?: string
            }
            Returns: {
              chunk_id: string
              content: string
              has_visual_elements: boolean
              manual_title: string
              page_image_url: string
              page_number: number
              section_title: string
              similarity_score: number
            }[]
          }
      search_manual_content: {
        Args: {
          content_types?: string[]
          limit_results?: number
          manual_id_filter?: string
          page_range_end?: number
          page_range_start?: number
          search_query: string
        }
        Returns: {
          chunk_id: string
          content: string
          content_type: string
          has_visual_elements: boolean
          manual_id: string
          page_number: number
          related_images: number
          related_tables: number
          relevance_score: number
          section_title: string
        }[]
      }
      search_manual_hybrid: {
        Args: {
          limit_n?: number
          q: string
          want_diagram?: boolean
          want_group_code?: string
        }
        Returns: {
          bm25_score: number
          chunk_id: string
          content: string
          exact_bonus: number
          hybrid_score: number
          page_number: number
          phrase_bonus: number
          rps_group_code: string
          rps_group_name: string
          visual_content_type: string
        }[]
      }
      search_manual_index: {
        Args: { max_results?: number; user_query: string }
        Returns: {
          chapter_filename: string
          has_safety_warning: boolean
          id: string
          match_score: number
          match_type: string
          page_number: number
          pdf_page_number: number
          search_priority: number
          storage_url: string
          system_category: string
          term: string
        }[]
      }
      search_procedures: {
        Args: { query_text: string }
        Returns: {
          description: string
          difficulty: string
          estimated_time: string
          id: string
          title: string
        }[]
      }
      search_u435_manuals: {
        Args: { search_term: string }
        Returns: {
          filename: string
          manual_type: string
          part_number: number
          relevance: number
          slug: string
          storage_path: string
          title: string
        }[]
      }
      search_wis_content:
        | {
            Args: {
              filter_model?: string
              filter_system?: string
              search_query: string
            }
            Returns: {
              content_type: string
              id: string
              model: string
              relevance: number
              system: string
              title: string
            }[]
          }
        | {
            Args: { query_text: string; similarity_threshold: number }
            Returns: {
              description: string
              id: number
              similarity: number
              title: string
            }[]
          }
      send_signup_alert: { Args: never; Returns: undefined }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_askml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      start_free_trial: { Args: { p_user_id: string }; Returns: Json }
      start_user_trial: {
        Args: { p_expires_at: string; p_started_at: string; p_user_id: string }
        Returns: {
          converted_to_subscription: boolean
          created_at: string
          email_sent_at: string | null
          expires_at: string
          id: string
          is_active: boolean
          started_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "user_trials"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      test_signup_triggers: {
        Args: never
        Returns: {
          error_message: string
          status: string
          trigger_name: string
        }[]
      }
      trigram_search_similarity: {
        Args: { search_term: string; target_text: string }
        Returns: number
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      user_has_liked_post: {
        Args: { post_id_param: string; user_id_param: string }
        Returns: boolean
      }
      user_is_group_admin_safe: {
        Args: { group_id_param: string; user_id_param: string }
        Returns: boolean
      }
      user_is_group_member_safe: {
        Args: { group_id_param: string; user_id_param: string }
        Returns: boolean
      }
      validate_pdf_links: {
        Args: never
        Returns: {
          invalid_details: Json
          invalid_entries: number
          total_entries: number
          valid_entries: number
        }[]
      }
      wis_comprehensive_search: {
        Args: { search_term: string }
        Returns: {
          description: string
          id: string
          relevance_score: number
          result_type: string
          title: string
        }[]
      }
      wis_create_plan_release: {
        Args: { p_description?: string; p_release_name: string }
        Returns: string
      }
      wis_create_samples: {
        Args: { p_count: number; p_job_id?: string; p_model_code?: string }
        Returns: Json
      }
      wis_get_media_urls: {
        Args: { document_id: string }
        Returns: {
          bucket: string
          description: string
          file_name: string
          media_type: string
        }[]
      }
      wis_import_bulletins: { Args: { payload: Json }; Returns: number }
      wis_import_parts: { Args: { payload: Json }; Returns: number }
      wis_import_procedures: { Args: { payload: Json }; Returns: number }
      wis_log_query: {
        Args: { model_bias?: string; q: string; session_id?: string }
        Returns: undefined
      }
      wis_media_url: {
        Args: { bucket: string; expires_in?: number; file_name: string }
        Returns: string
      }
      wis_record_ingest_error: {
        Args: {
          p_error_code: string
          p_error_context?: Json
          p_error_message: string
          p_error_type: string
          p_job_id: string
          p_severity?: string
        }
        Returns: string
      }
      wis_search: {
        Args: { result_limit?: number; search_query: string }
        Returns: {
          content: string
          doc_id: string
          doc_type: string
          media: Json
          ref: string
          relevance: number
          title: string
        }[]
      }
      wis_search_by_type: {
        Args: {
          result_limit?: number
          search_query: string
          type_filter: string
        }
        Returns: {
          content: string
          doc_id: string
          doc_type: string
          media: Json
          ref: string
          relevance: number
          title: string
        }[]
      }
      wis_search2: {
        Args: { limit_rows?: number; model_bias?: string; q: string }
        Returns: {
          chunk_index: number
          content: string
          created_at: string
          id: string
          manual_name: string
          metadata: Json
          rank_score: number
        }[]
      }
      wis_semantic_search: {
        Args: {
          limit_rows?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          content: string
          doc_id: string
          doc_type: string
          media: Json
          ref: string
          relevance_score: number
          title: string
        }[]
      }
      wis_start_ingest_job: {
        Args: { p_job_type: string; p_plan_item_id: string }
        Returns: string
      }
      wis_suggest_prefix:
        | {
            Args: { max_results?: number; prefix: string }
            Returns: {
              doc_count: number
              doc_type: string
              suggestion: string
            }[]
          }
        | {
            Args: { limit_rows?: number; model_bias?: string; q: string }
            Returns: {
              manual_name: string
              relevance_score: number
              suggestion: string
            }[]
          }
      wis_suggest_titles: {
        Args: {
          limit_rows?: number
          model_filter?: string
          search_query: string
        }
        Returns: {
          doc_type: string
          reference_number: string
          relevance_score: number
          suggestion: string
        }[]
      }
      wis_update_ingest_job: {
        Args: {
          p_checkpoint_state?: Json
          p_error_message?: string
          p_job_id: string
          p_progress_pct?: number
          p_result_summary?: Json
          p_status?: string
        }
        Returns: undefined
      }
      wis_upsert_plan_item: {
        Args: {
          p_component_code: string
          p_metadata?: Json
          p_model_code: string
          p_source_fingerprint: string
          p_source_path: string
          p_source_type: string
          p_system_code: string
        }
        Returns: string
      }
    }
    Enums: {
      affiliate_provider: "amazon" | "ebay" | "custom"
      app_role: "admin" | "user"
      medication_frequency:
        | "once_daily"
        | "twice_daily"
        | "three_times_daily"
        | "four_times_daily"
        | "as_needed"
        | "weekly"
        | "monthly"
      medical_record_type:
        | "document"
        | "lab_result"
        | "prescription"
        | "insurance_card"
        | "doctor_note"
        | "vaccination"
        | "imaging"
        | "other"
      procedure_relationship_type:
        | "prerequisite"
        | "follow_up"
        | "alternative"
        | "related"
        | "part_of_series"
        | "references"
        | "supersedes"
        | "see_also"
      product_category:
        | "recovery_gear"
        | "camping_expedition"
        | "tools_maintenance"
        | "parts_upgrades"
        | "books_manuals"
        | "apparel_merchandise"
        | "electronics"
        | "outdoor_gear"
      recommendation_category:
        | "Repair"
        | "Maintenance"
        | "Modifications"
        | "Tyres"
        | "Adventures"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      affiliate_provider: ["amazon", "ebay", "custom"],
      app_role: ["admin", "user"],
      procedure_relationship_type: [
        "prerequisite",
        "follow_up",
        "alternative",
        "related",
        "part_of_series",
        "references",
        "supersedes",
        "see_also",
      ],
      product_category: [
        "recovery_gear",
        "camping_expedition",
        "tools_maintenance",
        "parts_upgrades",
        "books_manuals",
        "apparel_merchandise",
        "electronics",
        "outdoor_gear",
      ],
      recommendation_category: [
        "Repair",
        "Maintenance",
        "Modifications",
        "Tyres",
        "Adventures",
      ],
    },
  },
} as const
