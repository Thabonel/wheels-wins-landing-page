/**
 * AI SDK Tools Registry
 * Migrated from Python backend tools to TypeScript
 */

import { tool } from 'ai';
import { z } from 'zod';
import { searchNearbyPlaces, getDirections } from '@/services/locationService';
import { fetchWeatherData } from '@/services/weatherService';
import { supabase } from '@/integrations/supabase/client';
import * as Sentry from '@sentry/react';

/**
 * Weather Tool
 */
export const weatherTool = tool({
  description: 'Get current weather for a location',
  parameters: z.object({
    location: z.string().describe('City name or coordinates'),
    units: z.enum(['metric', 'imperial']).optional().default('imperial'),
  }),
  execute: async ({ location, units }) => {
    try {
      const weather = await fetchWeatherData(location, units);
      return {
        success: true,
        data: weather,
        message: `Weather in ${location}: ${weather.temp}°${units === 'metric' ? 'C' : 'F'}, ${weather.description}`,
      };
    } catch (error) {
      Sentry.captureException(error);
      return {
        success: false,
        error: 'Failed to fetch weather data',
      };
    }
  },
});

/**
 * Search Nearby Tool
 */
export const searchNearbyTool = tool({
  description: 'Search for nearby places like gas stations, campgrounds, restaurants',
  parameters: z.object({
    query: z.string().describe('What to search for'),
    location: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
    radius: z.number().optional().default(10000), // meters
  }),
  execute: async ({ query, location, radius }) => {
    try {
      if (!location) {
        // Try to get user's current location from context
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          return {
            success: false,
            error: 'Location not provided and user location not available',
          };
        }
      }

      const results = await searchNearbyPlaces(query, location, radius);
      return {
        success: true,
        data: results,
        message: `Found ${results.length} ${query} nearby`,
      };
    } catch (error) {
      Sentry.captureException(error);
      return {
        success: false,
        error: 'Failed to search nearby places',
      };
    }
  },
});

/**
 * Expense Tracking Tool
 */
export const trackExpenseTool = tool({
  description: 'Track an expense for the trip',
  parameters: z.object({
    amount: z.number().describe('Expense amount'),
    category: z.enum(['fuel', 'food', 'camping', 'maintenance', 'other']),
    description: z.string().optional(),
    date: z.string().optional(), // ISO date string
  }),
  execute: async ({ amount, category, description, date }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: userData.user.id,
          amount,
          category,
          description,
          date: date || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
        message: `Tracked ${category} expense of $${amount}`,
      };
    } catch (error) {
      Sentry.captureException(error);
      return {
        success: false,
        error: 'Failed to track expense',
      };
    }
  },
});

/**
 * Trip Planning Tool
 */
export const planTripTool = tool({
  description: 'Plan a trip route with waypoints',
  parameters: z.object({
    origin: z.string().describe('Starting location'),
    destination: z.string().describe('Ending location'),
    waypoints: z.array(z.string()).optional(),
    preferences: z.object({
      avoidHighways: z.boolean().optional(),
      avoidTolls: z.boolean().optional(),
      preferScenic: z.boolean().optional(),
    }).optional(),
  }),
  execute: async ({ origin, destination, waypoints, preferences }) => {
    try {
      const directions = await getDirections(
        origin,
        destination,
        waypoints,
        preferences
      );

      return {
        success: true,
        data: directions,
        message: `Route planned from ${origin} to ${destination}: ${directions.distance}, ${directions.duration}`,
      };
    } catch (error) {
      Sentry.captureException(error);
      return {
        success: false,
        error: 'Failed to plan trip',
      };
    }
  },
});

/**
 * User Context Tool
 */
export const getUserContextTool = tool({
  description: 'Get user context including location, preferences, and recent activity',
  parameters: z.object({
    includeLocation: z.boolean().optional().default(true),
    includePreferences: z.boolean().optional().default(true),
    includeRecentActivity: z.boolean().optional().default(true),
  }),
  execute: async ({ includeLocation, includePreferences, includeRecentActivity }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      const context: any = {
        userId: userData.user.id,
        email: userData.user.email,
      };

      if (includePreferences) {
        const { data: settings } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userData.user.id)
          .single();
        
        if (settings) {
          context.preferences = settings;
        }
      }

      if (includeRecentActivity) {
        const { data: recentTrips } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (recentTrips) {
          context.recentTrips = recentTrips;
        }
      }

      return {
        success: true,
        data: context,
        message: 'User context retrieved',
      };
    } catch (error) {
      Sentry.captureException(error);
      return {
        success: false,
        error: 'Failed to get user context',
      };
    }
  },
});

/**
 * Search Web Tool
 */
export const searchWebTool = tool({
  description: 'Search the web for information',
  parameters: z.object({
    query: z.string().describe('Search query'),
    maxResults: z.number().optional().default(5),
  }),
  execute: async ({ query, maxResults }) => {
    try {
      // This would integrate with a search API like Brave Search or Google Custom Search
      // For now, return a placeholder
      return {
        success: true,
        data: {
          query,
          results: [],
          message: 'Web search not yet implemented in POC',
        },
      };
    } catch (error) {
      Sentry.captureException(error);
      return {
        success: false,
        error: 'Failed to search web',
      };
    }
  },
});

/**
 * Emergency Assistance Tool
 */
export const emergencyAssistanceTool = tool({
  description: 'Get emergency assistance information',
  parameters: z.object({
    type: z.enum(['medical', 'mechanical', 'police', 'fire', 'roadside']),
    location: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }),
  execute: async ({ type, location }) => {
    try {
      // Get nearest emergency services
      const emergencyNumbers = {
        medical: '911',
        mechanical: 'AAA: 1-800-222-4357',
        police: '911',
        fire: '911',
        roadside: 'AAA: 1-800-222-4357',
      };

      const response = {
        type,
        number: emergencyNumbers[type],
        message: `For ${type} emergency, call ${emergencyNumbers[type]}`,
      };

      if (location) {
        // Search for nearest hospitals, police stations, etc.
        const places = await searchNearbyPlaces(`${type} emergency`, location, 50000);
        return {
          success: true,
          data: {
            ...response,
            nearbyServices: places.slice(0, 3),
          },
        };
      }

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      Sentry.captureException(error);
      return {
        success: false,
        error: 'Failed to get emergency assistance',
      };
    }
  },
});

/**
 * Export all tools as a registry
 */
export const toolRegistry = {
  weather: weatherTool,
  searchNearby: searchNearbyTool,
  trackExpense: trackExpenseTool,
  planTrip: planTripTool,
  getUserContext: getUserContextTool,
  searchWeb: searchWebTool,
  emergencyAssistance: emergencyAssistanceTool,
};

/**
 * Get tools array for AI SDK
 */
export const getTools = () => Object.values(toolRegistry);

/**
 * Tool execution metrics
 */
export const trackToolExecution = (toolName: string, success: boolean, duration: number) => {
  Sentry.addBreadcrumb({
    message: `Tool execution: ${toolName}`,
    data: {
      success,
      duration,
      timestamp: Date.now(),
    },
    level: success ? 'info' : 'error',
  });
};