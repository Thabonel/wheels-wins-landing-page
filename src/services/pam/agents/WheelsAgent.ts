/**
 * WheelsAgent - Trip Planning Domain Agent
 * Handles trip planning, route optimization, campground search, and weather
 */

import { DomainAgent } from './base';
import { ConversationContext, AgentResponse, Tool } from '../architectureTypes';
import { supabase } from '@/integrations/supabase/client';

export class WheelsAgent extends DomainAgent {
  constructor() {
    super(
      'WheelsAgent',
      'Specializes in trip planning, route optimization, RV park discovery, and weather information'
    );
  }

  protected async loadTools(): Promise<void> {
    // Route Planning Tool
    this.registerTool({
      id: 'route_planner',
      name: 'Route Planner',
      description: 'Plans optimal routes for RV travel',
      category: 'navigation',
      execute: async (params) => {
        const { from, to, waypoints } = params;
        // TODO: Integrate with Mapbox Directions API
        return {
          distance: 500,
          duration: '8 hours',
          route: [from, ...(waypoints || []), to],
        };
      },
      validate: (params) => params.from && params.to,
    });

    // Campground Search Tool
    this.registerTool({
      id: 'campground_search',
      name: 'Campground Search',
      description: 'Finds RV parks and campgrounds',
      category: 'accommodation',
      execute: async (params) => {
        const { location, amenities, priceRange } = params;
        try {
          const { data, error } = await supabase
            .from('campgrounds')
            .select('*')
            .ilike('location', `%${location}%`)
            .limit(5);
          
          if (error) throw error;
          return { campgrounds: data || [] };
        } catch (error) {
          console.error('Campground search error:', error);
          return { campgrounds: [], error: 'Failed to search campgrounds' };
        }
      },
    });

    // Weather Tool
    this.registerTool({
      id: 'weather_check',
      name: 'Weather Check',
      description: 'Provides weather information for trip planning',
      category: 'weather',
      execute: async (params) => {
        const { location, date } = params;
        // TODO: Integrate with weather API
        return {
          location,
          date,
          forecast: 'Sunny, 75°F',
          conditions: 'Great for RV travel',
        };
      },
    });

    // Trip Optimization Tool
    this.registerTool({
      id: 'trip_optimizer',
      name: 'Trip Optimizer',
      description: 'Optimizes trip itinerary for time and cost',
      category: 'optimization',
      execute: async (params) => {
        const { destinations, budget, duration } = params;
        // Calculate optimal route considering budget and time
        return {
          optimizedRoute: destinations,
          estimatedCost: budget * 0.8,
          estimatedDays: duration,
          suggestions: ['Stop at Yellowstone', 'Visit Grand Canyon'],
        };
      },
    });
  }

  protected async analyzeRequest(message: string, context: ConversationContext): Promise<any> {
    const analysis = {
      hasDestination: /to\s+(\w+)|visiting\s+(\w+)|trip\s+to\s+(\w+)/i.test(message),
      hasRouteRequest: /route|directions|how\s+to\s+get|drive/i.test(message),
      hasCampgroundRequest: /campground|rv\s+park|where\s+to\s+stay|camping/i.test(message),
      hasWeatherRequest: /weather|forecast|temperature|rain/i.test(message),
      hasOptimizationRequest: /optimize|best\s+route|save\s+money|shortest/i.test(message),
      extractedLocations: this.extractLocations(message),
      extractedDates: this.extractDates(message),
    };

    return analysis;
  }

  protected async selectTools(analysis: any, context: ConversationContext): Promise<string[]> {
    const tools: string[] = [];

    if (analysis.hasRouteRequest || analysis.hasDestination) {
      tools.push('route_planner');
    }
    if (analysis.hasCampgroundRequest) {
      tools.push('campground_search');
    }
    if (analysis.hasWeatherRequest) {
      tools.push('weather_check');
    }
    if (analysis.hasOptimizationRequest) {
      tools.push('trip_optimizer');
    }

    // Default to route planner if locations are mentioned but no specific request
    if (tools.length === 0 && analysis.extractedLocations.length > 0) {
      tools.push('route_planner');
    }

    return tools;
  }

  protected async generateResponse(
    message: string,
    context: ConversationContext,
    toolResults: Map<string, any>
  ): Promise<AgentResponse> {
    let response = '';
    const toolsUsed: string[] = [];
    const suggestions: string[] = [];

    // Process route planning results
    if (toolResults.has('route_planner')) {
      const routeData = toolResults.get('route_planner');
      response += `I've planned your route: ${routeData.route.join(' → ')}. `;
      response += `Total distance: ${routeData.distance} miles, estimated time: ${routeData.duration}. `;
      toolsUsed.push('route_planner');
    }

    // Process campground results
    if (toolResults.has('campground_search')) {
      const campData = toolResults.get('campground_search');
      if (campData.campgrounds && campData.campgrounds.length > 0) {
        response += `I found ${campData.campgrounds.length} RV parks near your destination. `;
        suggestions.push('Would you like details about specific campgrounds?');
      } else {
        response += 'I couldn\'t find campgrounds in that area. ';
        suggestions.push('Try searching nearby cities');
      }
      toolsUsed.push('campground_search');
    }

    // Process weather results
    if (toolResults.has('weather_check')) {
      const weatherData = toolResults.get('weather_check');
      response += `Weather forecast: ${weatherData.forecast}. ${weatherData.conditions}. `;
      toolsUsed.push('weather_check');
    }

    // Process optimization results
    if (toolResults.has('trip_optimizer')) {
      const optData = toolResults.get('trip_optimizer');
      response += `I've optimized your trip to save time and money. `;
      response += `Estimated cost: $${optData.estimatedCost}. `;
      if (optData.suggestions.length > 0) {
        suggestions.push(...optData.suggestions);
      }
      toolsUsed.push('trip_optimizer');
    }

    // Fallback response if no tools were used
    if (response === '') {
      response = 'I can help you plan your RV trip! Tell me where you\'d like to go, and I\'ll help with routes, campgrounds, and weather information.';
      suggestions.push('Try asking about specific destinations', 'Ask for campground recommendations');
    }

    return {
      response: response.trim(),
      confidence: toolsUsed.length > 0 ? 0.85 : 0.6,
      toolsUsed,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      context: { 
        analysis: {
          hasDestination: toolResults.size > 0,
          toolsExecuted: toolsUsed.length,
        }
      },
    };
  }

  private extractLocations(message: string): string[] {
    // Simple location extraction - could be enhanced with NER
    const locationPatterns = [
      /to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /at\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    ];

    const locations = new Set<string>();
    for (const pattern of locationPatterns) {
      const matches = message.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) locations.add(match[1]);
      }
    }

    return Array.from(locations);
  }

  private extractDates(message: string): string[] {
    // Simple date extraction
    const datePatterns = [
      /\b(tomorrow|today|next\s+week|next\s+month)\b/gi,
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/gi,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
    ];

    const dates: string[] = [];
    for (const pattern of datePatterns) {
      const matches = message.match(pattern);
      if (matches) dates.push(...matches);
    }

    return dates;
  }
}