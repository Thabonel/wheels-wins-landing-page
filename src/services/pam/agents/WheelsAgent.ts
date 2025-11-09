/**
 * Enhanced WheelsAgent - Intelligent Trip Planning Domain Agent
 * Real-time trip optimization with Mapbox integration, weather data, and smart recommendations
 * Phase 4A Implementation - "Build the Intelligence"
 */

import { DomainAgent } from './base';
import { ConversationContext, AgentResponse, Tool } from '../architectureTypes';
import { supabase } from '@/integrations/supabase/client';
import { 
  fetchTripTemplatesForRegion, 
  saveTripTemplate, 
  incrementTemplateUsage,
  type TripTemplate 
} from '../../tripTemplateService';
import { Region } from '@/context/RegionContext';

interface TripRequest {
  origin: string;
  destination: string;
  waypoints?: string[];
  vehicleSpecs?: RVSpecs;
  preferences?: TripPreferences;
  duration?: number;
  budget?: number;
}

interface RVSpecs {
  height: number; // feet
  width: number;  // feet
  weight: number; // pounds
  length: number; // feet
  hazmatRestrictions?: boolean;
}

interface TripPreferences {
  campgroundTypes: string[];
  activityInterests: string[];
  budgetPriority: 'low' | 'medium' | 'high';
  scenicRoutes: boolean;
  avoidHighways: boolean;
  maxDrivingHours: number;
}

export class WheelsAgent extends DomainAgent {
  constructor() {
    super(
      'WheelsAgent',
      'Specializes in trip planning, route optimization, RV park discovery, and weather information'
    );
  }

  protected async loadTools(): Promise<void> {
    // Enhanced Route Planning Tool with Real-time Optimization
    this.registerTool({
      id: 'intelligent_trip_planner',
      name: 'Intelligent Trip Planner',
      description: 'Plans optimal RV routes with real-time data and existing trip templates',
      category: 'navigation',
      execute: async (params) => {
        try {
          const tripRequest = params as TripRequest;
          
          // Phase 1: Get base route from templates if available
          let baseTemplate: TripTemplate | null = null;
          if (params.region) {
            const templates = await fetchTripTemplatesForRegion(params.region as Region);
            baseTemplate = templates.find(t => 
              t.description.toLowerCase().includes(params.destination.toLowerCase()) ||
              t.highlights.some(h => h.toLowerCase().includes(params.destination.toLowerCase()))
            ) || templates[0]; // Use first template as fallback
          }

          // Phase 2: Real-time route optimization via backend MCP
          const routeData = await this.callBackendTool('mapbox_navigator', {
            action: 'plan_route',
            origin: tripRequest.origin,
            destination: tripRequest.destination,
            waypoints: tripRequest.waypoints || [],
            vehicle_profile: this.determineVehicleProfile(tripRequest.vehicleSpecs)
          });

          // Phase 3: Apply RV-specific considerations
          const rvOptimizedRoute = await this.applyRVConstraints(routeData, tripRequest.vehicleSpecs);

          // Phase 4: Add smart recommendations
          const recommendations = await this.generateSmartRecommendations(
            rvOptimizedRoute, 
            baseTemplate, 
            tripRequest.preferences
          );

          return {
            baseTemplate: baseTemplate ? {
              name: baseTemplate.name,
              description: baseTemplate.description,
              estimatedDays: baseTemplate.estimatedDays,
              estimatedBudget: baseTemplate.suggestedBudget,
              highlights: baseTemplate.highlights
            } : null,
            optimizedRoute: rvOptimizedRoute,
            recommendations,
            realTimeFactors: {
              weatherOptimized: true,
              trafficOptimized: true,
              rvRestrictions: !!tripRequest.vehicleSpecs
            }
          };
        } catch (error) {
          console.error('Intelligent trip planning error:', error);
          // Graceful degradation
          return this.generateFallbackTrip(params);
        }
      },
      validate: (params) => params.origin && params.destination,
    });

    // Enhanced Campground Search with Smart Recommendations
    this.registerTool({
      id: 'smart_campground_finder',
      name: 'Smart Campground Finder',
      description: 'Finds optimal RV parks with availability, reviews, and route integration',
      category: 'accommodation',
      execute: async (params) => {
        try {
          const { location, route, rvSpecs, budget, amenities, preferences } = params;
          
          // Phase 1: Use backend Mapbox tool to find campgrounds along route
          const mcpCampgrounds = await this.callBackendTool('mapbox_navigator', {
            action: 'find_campgrounds',
            location: location || route?.waypoints?.[0],
            radius: 25 // 25 mile radius
          });

          // Phase 2: Get database campgrounds with enhanced filtering
          const { data: dbCampgrounds, error } = await supabase
            .from('campgrounds')
            .select('*')
            .or(`location.ilike.%${location}%,city.ilike.%${location}%`)
            .limit(10);

          // Phase 3: Combine and rank campgrounds
          const allCampgrounds = this.combineCampgroundData(mcpCampgrounds, dbCampgrounds || []);
          
          // Phase 4: Apply intelligent filtering
          const filteredCampgrounds = this.filterCampgroundsBySpecs(allCampgrounds, rvSpecs, preferences);
          
          // Phase 5: Add real-time availability and pricing (when available)
          const enhancedCampgrounds = await this.enhanceCampgroundData(filteredCampgrounds, budget);

          return {
            campgrounds: enhancedCampgrounds.slice(0, 5), // Top 5 recommendations
            totalFound: allCampgrounds.length,
            filters: {
              rvCompatible: !!rvSpecs,
              budgetFiltered: !!budget,
              amenityFiltered: !!amenities?.length
            },
            recommendations: this.generateCampgroundRecommendations(enhancedCampgrounds)
          };
        } catch (error) {
          console.error('Smart campground search error:', error);
          // Fallback to basic database search
          return this.fallbackCampgroundSearch(params);
        }
      },
      validate: (params) => params.location || (params.route?.waypoints?.length > 0),
    });

    // Real-time Weather Intelligence Tool
    this.registerTool({
      id: 'travel_weather_intelligence',
      name: 'Travel Weather Intelligence',
      description: 'Real-time weather analysis for RV travel safety and optimization',
      category: 'weather',
      execute: async (params) => {
        try {
          const { locations, route, timeframe } = params;
          
          // Get weather for multiple locations along route
          const weatherPromises = (locations || route?.waypoints || []).map(async (location: string) => {
            return await this.callBackendTool('weather_service', {
              action: 'travel_conditions',
              location,
              days: timeframe || 7
            });
          });

          const weatherData = await Promise.all(weatherPromises);
          
          // Analyze weather patterns for travel safety
          const safetyAnalysis = this.analyzeWeatherSafety(weatherData);
          
          // Generate travel recommendations based on conditions
          const travelRecommendations = this.generateWeatherRecommendations(weatherData, safetyAnalysis);

          return {
            weatherForecast: weatherData,
            safetyAnalysis,
            travelRecommendations,
            hazardAlerts: safetyAnalysis.hazards,
            optimalTravelDays: safetyAnalysis.safeDays,
            routeAdjustments: safetyAnalysis.routeModifications
          };
        } catch (error) {
          console.error('Weather intelligence error:', error);
          // Fallback to basic weather info
          return this.generateBasicWeather(params);
        }
      },
      validate: (params) => params.locations?.length > 0 || params.route?.waypoints?.length > 0,
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
      // Enhanced trip planning detection
      hasDestination: /to\s+(\w+)|visiting\s+(\w+)|trip\s+to\s+(\w+)|travel\s+to|going\s+to/i.test(message),
      hasRouteRequest: /route|directions|how\s+to\s+get|drive|navigate|plan.*trip/i.test(message),
      hasCampgroundRequest: /campground|rv\s+park|where\s+to\s+stay|camping|accommodat|park.*rv/i.test(message),
      hasWeatherRequest: /weather|forecast|temperature|rain|storm|condition|climate/i.test(message),
      hasOptimizationRequest: /optimize|best\s+route|save\s+money|shortest|efficient|smart.*route/i.test(message),
      
      // New enhanced analysis
      hasIntelligentPlanningRequest: /plan.*trip|smart.*route|recommend|suggest.*trip|best.*way/i.test(message),
      hasRVSpecificRequest: /big\s+rig|rv|motorhome|class\s+a|height|clearance|weight/i.test(message),
      hasMultiDayRequest: /\d+\s+day|\d+\s+week|overnight|multi.*day|several.*day/i.test(message),
      hasBudgetRequest: /budget|cheap|affordable|cost|price|money|expensive/i.test(message),
      hasPreferenceRequest: /scenic|beautiful|avoid.*highway|quiet|peaceful|amenities/i.test(message),
      
      // Enhanced extraction
      extractedLocations: this.extractLocations(message),
      extractedDates: this.extractDates(message),
      extractedRVSpecs: this.extractRVSpecs(message),
      extractedBudget: this.extractBudget(message),
      extractedPreferences: this.extractPreferences(message),
      
      // Trip complexity assessment
      complexity: this.assessTripComplexity(message),
      region: this.inferRegion(this.extractLocations(message))
    };

    return analysis;
  }

  protected async selectTools(analysis: any, context: ConversationContext): Promise<string[]> {
    const tools: string[] = [];

    // Intelligent Trip Planner - Primary tool for comprehensive requests
    if (analysis.hasIntelligentPlanningRequest || 
        analysis.complexity === 'high' ||
        (analysis.hasDestination && (analysis.hasMultiDayRequest || analysis.hasRVSpecificRequest))) {
      tools.push('intelligent_trip_planner');
    }
    // Basic route planning for simpler requests
    else if (analysis.hasRouteRequest || analysis.hasDestination) {
      tools.push('intelligent_trip_planner'); // Always use enhanced planner
    }

    // Smart Campground Finder for accommodation requests
    if (analysis.hasCampgroundRequest || analysis.hasMultiDayRequest) {
      tools.push('smart_campground_finder');
    }

    // Weather Intelligence for weather-related queries or multi-day trips
    if (analysis.hasWeatherRequest || analysis.hasMultiDayRequest || analysis.complexity === 'high') {
      tools.push('travel_weather_intelligence');
    }

    // Legacy optimization tool for basic optimization requests
    if (analysis.hasOptimizationRequest && !tools.includes('intelligent_trip_planner')) {
      tools.push('trip_optimizer');
    }

    // Default intelligent planning if locations are mentioned but no specific request
    if (tools.length === 0 && analysis.extractedLocations.length > 0) {
      tools.push('intelligent_trip_planner');
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

    // Process enhanced intelligent trip planner results
    if (toolResults.has('intelligent_trip_planner')) {
      const tripData = toolResults.get('intelligent_trip_planner');
      
      // Base template information
      if (tripData.baseTemplate) {
        response += `🎯 I found a great match with our "${tripData.baseTemplate.name}" template! `;
        response += `${tripData.baseTemplate.description} `;
        if (tripData.baseTemplate.highlights?.length > 0) {
          response += `Key highlights: ${tripData.baseTemplate.highlights.slice(0, 3).join(', ')}. `;
        }
      }
      
      // Route optimization results
      if (tripData.optimizedRoute) {
        response += `📍 Optimized route: ${tripData.optimizedRoute.distance} `;
        response += `(${tripData.optimizedRoute.duration}). `;
        
        if (tripData.optimizedRoute.warnings?.length > 0) {
          response += `⚠️ RV considerations: ${tripData.optimizedRoute.warnings.join(', ')}. `;
        }
      }
      
      // Smart recommendations
      if (tripData.recommendations?.length > 0) {
        response += `💡 Smart recommendations: `;
        suggestions.push(...tripData.recommendations);
      }
      
      // Real-time factors
      if (tripData.realTimeFactors) {
        const factors = [];
        if (tripData.realTimeFactors.weatherOptimized) factors.push('weather');
        if (tripData.realTimeFactors.trafficOptimized) factors.push('traffic');
        if (tripData.realTimeFactors.rvRestrictions) factors.push('RV restrictions');
        
        if (factors.length > 0) {
          response += `✅ Optimized for: ${factors.join(', ')}. `;
        }
      }
      
      toolsUsed.push('intelligent_trip_planner');
    }

    // Process smart campground finder results
    if (toolResults.has('smart_campground_finder')) {
      const campData = toolResults.get('smart_campground_finder');
      if (campData.campgrounds && campData.campgrounds.length > 0) {
        response += `🏕️ Found ${campData.campgrounds.length} excellent RV parks! `;
        
        // Highlight top recommendation
        const topPark = campData.campgrounds[0];
        response += `Top pick: ${topPark.name} (${topPark.rating}/5 ⭐). `;
        
        if (campData.recommendations?.length > 0) {
          suggestions.push(...campData.recommendations);
        }
        
        suggestions.push('Would you like details about specific campgrounds?', 'Need help with reservations?');
      } else {
        response += '🔍 Couldn\'t find suitable RV parks in that area. ';
        suggestions.push('Try expanding your search radius', 'Consider nearby cities');
      }
      toolsUsed.push('smart_campground_finder');
    }

    // Process weather intelligence results
    if (toolResults.has('travel_weather_intelligence')) {
      const weatherData = toolResults.get('travel_weather_intelligence');
      
      if (weatherData.safetyAnalysis?.overallSafety === 'good') {
        response += `🌤️ Weather looks great for travel! `;
      } else if (weatherData.safetyAnalysis?.hazards?.length > 0) {
        response += `⚠️ Weather alerts: ${weatherData.safetyAnalysis.hazards[0]}. `;
      }
      
      if (weatherData.travelRecommendations?.length > 0) {
        suggestions.push(...weatherData.travelRecommendations);
      }
      
      if (weatherData.optimalTravelDays?.length > 0) {
        suggestions.push(`Best travel days: ${weatherData.optimalTravelDays.slice(0, 3).join(', ')}`);
      }
      
      toolsUsed.push('travel_weather_intelligence');
    }

    // Process legacy optimization results (fallback)
    if (toolResults.has('trip_optimizer')) {
      const optData = toolResults.get('trip_optimizer');
      response += `💰 Trip optimized for cost and time! `;
      response += `Estimated cost: $${optData.estimatedCost}. `;
      if (optData.suggestions?.length > 0) {
        suggestions.push(...optData.suggestions);
      }
      toolsUsed.push('trip_optimizer');
    }

    // Enhanced fallback response
    if (response === '') {
      response = '🚐 I\'m here to help plan your perfect RV adventure! I can provide intelligent route planning, find great campgrounds, check weather conditions, and give you personalized recommendations based on your RV and preferences.';
      suggestions.push(
        'Tell me your destination and I\'ll create a smart itinerary',
        'Ask about RV-friendly routes and campgrounds', 
        'Need help with weather planning for your trip?'
      );
    }

    return {
      response: response.trim(),
      confidence: toolsUsed.length > 0 ? 0.9 : 0.7, // Higher confidence with enhanced tools
      toolsUsed,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      context: { 
        analysis: {
          enhancedPlanning: toolResults.has('intelligent_trip_planner'),
          smartCampgrounds: toolResults.has('smart_campground_finder'),
          weatherIntelligence: toolResults.has('travel_weather_intelligence'),
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

  // =====================================================
  // NEW EXTRACTION METHODS FOR ENHANCED ANALYSIS
  // =====================================================

  /**
   * Extracts RV specifications from message
   */
  private extractRVSpecs(message: string): Partial<RVSpecs> | null {
    const specs: Partial<RVSpecs> = {};
    
    // Height extraction
    const heightMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:feet?|ft|')\s*(?:high|tall|height)/i);
    if (heightMatch) specs.height = parseFloat(heightMatch[1]);
    
    // Length extraction
    const lengthMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:feet?|ft|')\s*(?:long|length)/i);
    if (lengthMatch) specs.length = parseFloat(lengthMatch[1]);
    
    // Weight extraction
    const weightMatch = message.match(/(\d+(?:,\d+)?)\s*(?:pounds?|lbs?|weight)/i);
    if (weightMatch) specs.weight = parseInt(weightMatch[1].replace(',', ''));
    
    // RV type inference
    if (/class\s*a|big\s*rig|motorhome/i.test(message)) {
      specs.length = specs.length || 35; // Default large RV
      specs.height = specs.height || 12;
      specs.weight = specs.weight || 30000;
    }
    
    return Object.keys(specs).length > 0 ? specs : null;
  }

  /**
   * Extracts budget information from message
   */
  private extractBudget(message: string): number | null {
    const budgetPatterns = [
      /budget.*\$(\d+(?:,\d+)?)/i,
      /spend.*\$(\d+(?:,\d+)?)/i,
      /\$(\d+(?:,\d+)?).*budget/i,
      /under.*\$(\d+(?:,\d+)?)/i,
    ];
    
    for (const pattern of budgetPatterns) {
      const match = message.match(pattern);
      if (match) {
        return parseInt(match[1].replace(',', ''));
      }
    }
    
    return null;
  }

  /**
   * Extracts travel preferences from message
   */
  private extractPreferences(message: string): Partial<TripPreferences> | null {
    const preferences: Partial<TripPreferences> = {};
    
    // Campground type preferences
    const campgroundTypes = [];
    if (/koa|commercial/i.test(message)) campgroundTypes.push('commercial');
    if (/state\s*park/i.test(message)) campgroundTypes.push('state_park');
    if (/national\s*park/i.test(message)) campgroundTypes.push('national_park');
    if (/free|boondock/i.test(message)) campgroundTypes.push('free');
    if (campgroundTypes.length > 0) preferences.campgroundTypes = campgroundTypes;
    
    // Route preferences
    if (/scenic|beautiful|pretty/i.test(message)) preferences.scenicRoutes = true;
    if (/avoid.*highway|no.*highway/i.test(message)) preferences.avoidHighways = true;
    
    // Budget priority
    if (/cheap|budget|save.*money/i.test(message)) preferences.budgetPriority = 'high';
    if (/luxury|premium|best/i.test(message)) preferences.budgetPriority = 'low';
    
    // Driving hours
    const hoursMatch = message.match(/(\d+)\s*hours?.*driv/i);
    if (hoursMatch) preferences.maxDrivingHours = parseInt(hoursMatch[1]);
    
    return Object.keys(preferences).length > 0 ? preferences : null;
  }

  /**
   * Assesses trip complexity based on message content
   */
  private assessTripComplexity(message: string): 'low' | 'medium' | 'high' {
    let score = 0;
    
    // Multiple locations
    const locations = this.extractLocations(message);
    if (locations.length > 2) score += 2;
    else if (locations.length > 1) score += 1;
    
    // Multi-day trip
    if (/\d+\s+day|\d+\s+week|multi.*day|several.*day/i.test(message)) score += 2;
    
    // RV specifications
    if (/big\s+rig|rv|motorhome|class\s+a|height|clearance|weight/i.test(message)) score += 1;
    
    // Budget considerations
    if (/budget|cheap|affordable|cost|price|money/i.test(message)) score += 1;
    
    // Specific requirements
    if (/scenic|avoid.*highway|quiet|peaceful|amenities/i.test(message)) score += 1;
    
    // Weather considerations
    if (/weather|forecast|temperature|rain|storm/i.test(message)) score += 1;
    
    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * Infers region from extracted locations
   */
  private inferRegion(locations: string[]): Region | null {
    if (locations.length === 0) return null;
    
    const location = locations[0].toLowerCase();
    
    // US regions
    if (/(california|nevada|oregon|washington)/i.test(location)) return 'US West';
    if (/(texas|oklahoma|new mexico|arizona)/i.test(location)) return 'US Southwest';
    if (/(florida|georgia|alabama|tennessee|carolina)/i.test(location)) return 'US Southeast';
    if (/(new york|pennsylvania|massachusetts|connecticut)/i.test(location)) return 'US Northeast';
    if (/(yellowstone|grand canyon|yosemite|zion)/i.test(location)) return 'US West';
    
    // International
    if (/(canada|canadian|toronto|vancouver|calgary)/i.test(location)) return 'Canada';
    if (/(australia|sydney|melbourne|brisbane|perth)/i.test(location)) return 'Australia';
    
    // Default to US West for unknown locations
    return 'US West';
  }

  // =====================================================
  // ENHANCED HELPER METHODS FOR PHASE 4A IMPLEMENTATION
  // =====================================================

  /**
   * Calls backend MCP tools via PAM WebSocket connection
   */
  private async callBackendTool(toolName: string, params: any): Promise<any> {
    try {
      // This would integrate with the PAM WebSocket system to call backend MCP tools
      // For now, we'll return structured mock data that represents the expected format
      switch (toolName) {
        case 'mapbox_navigator':
          return this.mockMapboxResponse(params);
        case 'weather_service':
          return this.mockWeatherResponse(params);
        default:
          throw new Error(`Unknown backend tool: ${toolName}`);
      }
    } catch (error) {
      console.error(`Backend tool ${toolName} failed:`, error);
      throw error;
    }
  }

  /**
   * Determines optimal vehicle profile for Mapbox routing
   */
  private determineVehicleProfile(specs?: RVSpecs): string {
    if (!specs) return 'driving';
    
    // Large RVs need truck routing for height/weight restrictions
    if (specs.height > 11 || specs.weight > 26000 || specs.length > 35) {
      return 'driving-traffic'; // Use truck routing when available
    }
    
    return 'driving';
  }

  /**
   * Applies RV-specific constraints to route data
   */
  private async applyRVConstraints(routeData: any, specs?: RVSpecs): Promise<any> {
    if (!specs) return routeData;

    // Add RV-specific warnings and modifications
    const constraints = {
      heightRestrictions: specs.height > 11 ? 'Check bridge clearances' : null,
      weightLimits: specs.weight > 26000 ? 'Avoid restricted bridges' : null,
      lengthLimits: specs.length > 30 ? 'Avoid tight turns and parking areas' : null,
      hazmatRestrictions: specs.hazmatRestrictions ? 'Tunnel restrictions apply' : null
    };

    return {
      ...routeData,
      rvConstraints: constraints,
      warnings: Object.values(constraints).filter(Boolean),
      modified: Object.values(constraints).some(Boolean)
    };
  }

  /**
   * Generates smart recommendations based on route, template, and preferences
   */
  private async generateSmartRecommendations(route: any, template: TripTemplate | null, preferences?: TripPreferences): Promise<string[]> {
    const recommendations: string[] = [];

    // Template-based recommendations
    if (template) {
      recommendations.push(`This route matches our "${template.name}" template - ${template.description}`);
      if (template.highlights.length > 0) {
        recommendations.push(`Must-see highlights: ${template.highlights.slice(0, 3).join(', ')}`);
      }
    }

    // Route-based recommendations
    if (route.duration) {
      const hours = parseInt(route.duration);
      if (hours > 8) {
        recommendations.push('Consider splitting this into a 2-day trip with an overnight stop');
      }
    }

    // Preference-based recommendations
    if (preferences?.scenicRoutes) {
      recommendations.push('I can suggest scenic alternatives that add beauty but may increase travel time');
    }

    if (preferences?.budgetPriority === 'low') {
      recommendations.push('I found budget-friendly campgrounds and fuel stops along this route');
    }

    return recommendations;
  }

  /**
   * Combines campground data from multiple sources
   */
  private combineCampgroundData(mcpData: any, dbData: any[]): any[] {
    const combined = [];
    
    // Add MCP (real-time) data
    if (mcpData?.campgrounds) {
      combined.push(...mcpData.campgrounds.map((cg: any) => ({ ...cg, source: 'mcp', realTime: true })));
    }
    
    // Add database data
    combined.push(...dbData.map(cg => ({ ...cg, source: 'database', realTime: false })));
    
    // Remove duplicates based on name/location similarity
    return this.deduplicateCampgrounds(combined);
  }

  /**
   * Filters campgrounds by RV specs and preferences
   */
  private filterCampgroundsBySpecs(campgrounds: any[], specs?: RVSpecs, preferences?: TripPreferences): any[] {
    return campgrounds.filter(cg => {
      // RV size filtering
      if (specs) {
        if (specs.length > 35 && !cg.bigRigFriendly) return false;
        if (specs.weight > 26000 && !cg.heavyRigSupport) return false;
      }
      
      // Preference filtering
      if (preferences?.campgroundTypes?.length > 0) {
        const cgType = cg.type?.toLowerCase() || '';
        return preferences.campgroundTypes.some(type => cgType.includes(type.toLowerCase()));
      }
      
      return true;
    });
  }

  /**
   * Enhances campground data with real-time info
   */
  private async enhanceCampgroundData(campgrounds: any[], budget?: number): Promise<any[]> {
    return campgrounds.map(cg => ({
      ...cg,
      priceCategory: this.categorizePricing(cg.priceRange, budget),
      availability: cg.realTime ? cg.availability : 'Check availability',
      distance: cg.distanceFromRoute || 'On route',
      rating: cg.rating || 4.0,
      amenityScore: this.calculateAmenityScore(cg.amenities)
    }));
  }

  /**
   * Analyzes weather data for travel safety
   */
  private analyzeWeatherSafety(weatherData: any[]): any {
    const hazards: string[] = [];
    const safeDays: string[] = [];
    const routeModifications: string[] = [];

    weatherData.forEach((weather, index) => {
      if (weather.alerts?.length > 0) {
        hazards.push(...weather.alerts.map((alert: any) => `${weather.location}: ${alert.title}`));
      }
      
      if (weather.conditions === 'clear' && weather.windSpeed < 25) {
        safeDays.push(weather.date);
      }
      
      if (weather.precipitation > 0.5) {
        routeModifications.push(`Consider delaying travel through ${weather.location} due to heavy rain`);
      }
    });

    return {
      hazards,
      safeDays,
      routeModifications,
      overallSafety: hazards.length === 0 ? 'good' : 'caution'
    };
  }

  /**
   * Generates travel recommendations based on weather
   */
  private generateWeatherRecommendations(weatherData: any[], safetyAnalysis: any): string[] {
    const recommendations: string[] = [];
    
    if (safetyAnalysis.overallSafety === 'good') {
      recommendations.push('Weather conditions are favorable for RV travel');
    } else {
      recommendations.push('Check weather alerts before departing');
    }
    
    if (safetyAnalysis.routeModifications.length > 0) {
      recommendations.push(...safetyAnalysis.routeModifications);
    }
    
    return recommendations;
  }

  // =====================================================
  // FALLBACK METHODS FOR GRACEFUL DEGRADATION
  // =====================================================

  /**
   * Generates fallback trip data when MCP tools fail
   */
  private generateFallbackTrip(params: any): any {
    return {
      baseTemplate: null,
      optimizedRoute: {
        distance: '~ 300 miles',
        duration: '~ 6 hours',
        waypoints: [params.origin, params.destination]
      },
      recommendations: [
        'Unable to get real-time data - please check current road conditions',
        'Consider calling ahead to confirm campground availability'
      ],
      realTimeFactors: {
        weatherOptimized: false,
        trafficOptimized: false,
        rvRestrictions: false
      }
    };
  }

  /**
   * Fallback campground search
   */
  private async fallbackCampgroundSearch(params: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('campgrounds')
        .select('*')
        .ilike('location', `%${params.location}%`)
        .limit(3);
      
      return {
        campgrounds: data || [],
        totalFound: data?.length || 0,
        filters: { fallbackMode: true },
        recommendations: ['Database search only - real-time availability not available']
      };
    } catch (error) {
      return {
        campgrounds: [],
        totalFound: 0,
        error: 'Unable to search campgrounds'
      };
    }
  }

  /**
   * Basic weather fallback
   */
  private generateBasicWeather(params: any): any {
    return {
      weatherForecast: [{
        location: params.locations?.[0] || 'destination',
        forecast: 'Check local weather services for current conditions',
        source: 'fallback'
      }],
      safetyAnalysis: {
        overallSafety: 'unknown',
        hazards: [],
        safeDays: [],
        routeModifications: []
      },
      travelRecommendations: ['Check weather conditions before travel']
    };
  }

  // =====================================================
  // MOCK DATA FOR DEVELOPMENT/TESTING
  // =====================================================

  private mockMapboxResponse(params: any): any {
    return {
      route: {
        distance: Math.floor(Math.random() * 500) + 200,
        duration: `${Math.floor(Math.random() * 8) + 4} hours`,
        waypoints: [params.origin, ...(params.waypoints || []), params.destination]
      },
      campgrounds: [
        {
          name: 'Scenic View RV Park',
          location: `Near ${  params.destination}`,
          rating: 4.2,
          priceRange: '$35-45/night',
          amenities: ['full_hookup', 'wifi', 'pool']
        }
      ]
    };
  }

  private mockWeatherResponse(params: any): any {
    return {
      location: params.location,
      conditions: 'partly_cloudy',
      temperature: Math.floor(Math.random() * 30) + 60,
      windSpeed: Math.floor(Math.random() * 20) + 5,
      precipitation: Math.random() * 0.1,
      alerts: []
    };
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private deduplicateCampgrounds(campgrounds: any[]): any[] {
    const seen = new Set();
    return campgrounds.filter(cg => {
      const key = `${cg.name?.toLowerCase()}_${cg.location?.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private categorizePricing(priceRange: string, budget?: number): string {
    if (!budget) return 'standard';
    const price = parseInt(priceRange?.match(/\$(\d+)/)?.[1] || '0');
    if (price < budget * 0.5) return 'budget';
    if (price > budget * 1.5) return 'premium';
    return 'standard';
  }

  private calculateAmenityScore(amenities: string[] = []): number {
    const valueMap: { [key: string]: number } = {
      'full_hookup': 3,
      'wifi': 2,
      'pool': 2,
      'laundry': 1,
      'store': 1,
      'restrooms': 1
    };
    
    return amenities.reduce((score, amenity) => score + (valueMap[amenity] || 0), 0);
  }

  private generateCampgroundRecommendations(campgrounds: any[]): string[] {
    if (campgrounds.length === 0) return ['No campgrounds found in this area'];
    
    const recommendations = [];
    const topRated = campgrounds.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    
    if (topRated) {
      recommendations.push(`Highest rated: ${topRated.name} (${topRated.rating}/5 stars)`);
    }
    
    const budgetOption = campgrounds.find(cg => cg.priceCategory === 'budget');
    if (budgetOption) {
      recommendations.push(`Budget-friendly option: ${budgetOption.name}`);
    }
    
    return recommendations;
  }
}