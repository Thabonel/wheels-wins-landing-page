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
          created_at: string | null
          data_source: string
          data_type: string
          facebook_events: Json | null
          free_camping_updates: Json | null
          id: string
          reddit_discussions: Json | null
          relevance_score: number | null
          rv_forum_tips: Json | null
          scraped_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_source: string
          data_type: string
          facebook_events?: Json | null
          free_camping_updates?: Json | null
          id?: string
          reddit_discussions?: Json | null
          relevance_score?: number | null
          rv_forum_tips?: Json | null
          scraped_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_source?: string
          data_type?: string
          facebook_events?: Json | null
          free_camping_updates?: Json | null
          id?: string
          reddit_discussions?: Json | null
          relevance_score?: number | null
          rv_forum_tips?: Json | null
          scraped_at?: string | null
        }
        Relationships: []
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
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
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
    }
    Functions: {
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
      seed_default_drawers: {
        Args: Record<PropertyKey, never> | { user_id: string }
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
