/**
 * Mundi AI Integration Service
 * Handles communication with Mundi's geospatial AI capabilities
 */

import { supabase } from '../integrations/supabase/client';

export interface MundiQueryRequest {
  prompt: string;
  context?: Record<string, any>;
}

export interface MundiQueryResponse {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

export interface MundiStatusResponse {
  available: boolean;
  mundi_url: string;
  status_code?: number;
  error?: string;
}

class MundiService {
  private baseUrl = '';

  constructor() {
    // Use environment variable or default to backend URL
    this.baseUrl = import.meta.env.VITE_BACKEND_URL || 'https://pam-backend.onrender.com';
  }

  /**
   * Query Mundi AI for geospatial insights
   */
  async queryMundi(request: MundiQueryRequest): Promise<MundiQueryResponse> {
    try {
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.baseUrl}/api/v1/mundi/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Mundi query error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if Mundi AI service is available
   */
  async checkMundiStatus(): Promise<MundiStatusResponse> {
    try {
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.baseUrl}/api/v1/mundi/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Mundi status check error:', error);
      return {
        available: false,
        mundi_url: 'Unknown',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Query Mundi for travel-related geospatial insights
   */
  async queryTravelInsights(location: string, context?: Record<string, any>): Promise<MundiQueryResponse> {
    const prompt = `Provide travel insights for ${location}. Include information about:
    - Best routes and travel options
    - Points of interest and attractions
    - Travel safety considerations
    - Local amenities and services
    - Weather patterns and seasonal considerations`;

    return this.queryMundi({
      prompt,
      context: {
        query_type: 'travel_insights',
        location,
        ...context
      }
    });
  }

  /**
   * Query Mundi for camping and RV-specific information
   */
  async queryRVCampingInfo(location: string, context?: Record<string, any>): Promise<MundiQueryResponse> {
    const prompt = `Provide RV and camping information for ${location}. Include:
    - RV-friendly campgrounds and parks
    - Dump stations and water fill locations
    - Road conditions and accessibility for large vehicles
    - Local regulations and restrictions
    - Nearby amenities and services`;

    return this.queryMundi({
      prompt,
      context: {
        query_type: 'rv_camping',
        location,
        ...context
      }
    });
  }

  /**
   * Query Mundi for route planning assistance
   */
  async queryRouteAssistance(
    origin: string, 
    destination: string, 
    preferences?: Record<string, any>
  ): Promise<MundiQueryResponse> {
    const prompt = `Help plan a route from ${origin} to ${destination}. Consider:
    - Most efficient routes
    - Scenic alternatives
    - Rest stops and fuel stations
    - RV-friendly roads (if applicable)
    - Weather and seasonal considerations
    - Points of interest along the way`;

    return this.queryMundi({
      prompt,
      context: {
        query_type: 'route_planning',
        origin,
        destination,
        preferences,
        ...preferences
      }
    });
  }
}

// Export singleton instance
export const mundiService = new MundiService();
export default mundiService;