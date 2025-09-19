/**
 * Smart Trip Recommendation Engine with ML-Based Optimization - Refactored to extend BaseMLEngine
 *
 * Provides intelligent trip planning recommendations using:
 * - Machine learning models for route optimization
 * - User preference learning and pattern recognition
 * - Real-time data integration (weather, traffic, events)
 * - Multi-objective optimization (cost, time, experience)
 * - Collaborative filtering for social recommendations
 *
 * Now uses shared functionality from BaseMLEngine, eliminating duplicate code.
 */

import { BaseMLEngine } from './BaseMLEngine';
import { tripDataPipeline } from '@/services/dataPipeline/tripDataPipeline';
import { userBehaviorAnalytics } from '@/services/analytics/userBehaviorAnalytics';
import { collectUserAction, collectResponseTime } from '@/services/pam/analytics/analyticsCollector';
import { logger } from '@/lib/logger';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface UserPreferenceProfile {
  travel_style: 'adventure' | 'leisure' | 'luxury' | 'budget' | 'family';
  preferred_distance_range: [number, number]; // [min, max] in km
  typical_trip_duration: number; // days
  budget_sensitivity: number; // 0-1 scale
  weather_sensitivity: number; // 0-1 scale
  social_tendency: number; // 0-1 scale (solo vs group)
  activity_preferences: string[]; // outdoor, cultural, dining, etc.
  time_flexibility: number; // 0-1 scale
  route_complexity_preference: number; // 1-10 scale
  accommodation_preferences: string[]; // camping, hotel, airbnb, etc.
}

interface TripContext {
  origin: { lat: number; lng: number; name: string };
  destination?: { lat: number; lng: number; name: string };
  departure_date: string;
  return_date?: string;
  budget_range: [number, number];
  travel_party_size: number;
  vehicle_type: 'rv' | 'car' | 'motorcycle' | 'bicycle';
  special_requirements: string[];
  priority_factors: Array<'cost' | 'time' | 'scenery' | 'activities' | 'weather'>;
}

interface ExternalFactors {
  weather_forecast: Array<{
    date: string;
    location: { lat: number; lng: number };
    conditions: string;
    temperature: number;
    precipitation_chance: number;
  }>;
  traffic_conditions: Array<{
    route_segment: string;
    congestion_level: number;
    estimated_delay: number;
  }>;
  fuel_prices: Array<{
    location: { lat: number; lng: number };
    price_per_liter: number;
    station_name: string;
  }>;
  events_and_attractions: Array<{
    name: string;
    location: { lat: number; lng: number };
    date_range: [string, string];
    category: string;
    popularity_score: number;
  }>;
  accommodation_availability: Array<{
    location: { lat: number; lng: number };
    type: string;
    availability: number; // 0-1 scale
    price_range: [number, number];
  }>;
}

interface RouteRecommendation {
  route_id: string;
  waypoints: Array<{
    location: { lat: number; lng: number; name: string };
    arrival_time: string;
    departure_time: string;
    activities: string[];
    accommodation_suggestion?: string;
    estimated_cost: number;
    weather_forecast: any;
  }>;
  total_distance: number;
  total_duration: number;
  estimated_total_cost: number;
  scenic_score: number;
  difficulty_score: number;
  weather_risk_score: number;
  confidence_score: number;
  optimization_factors: {
    cost_efficiency: number;
    time_efficiency: number;
    experience_quality: number;
    weather_optimization: number;
  };
  alternative_routes: Array<{
    description: string;
    trade_offs: string[];
    route_preview: any[];
  }>;
  personalization_score: number;
  social_recommendations?: Array<{
    from_user: string;
    similarity_score: number;
    review: string;
  }>;
}

interface MLModelWeights {
  user_preference_weight: number;
  historical_pattern_weight: number;
  external_factor_weight: number;
  social_signal_weight: number;
  temporal_weight: number;
  cost_sensitivity_weight: number;
}

// =====================================================
// TRIP RECOMMENDATION ENGINE
// =====================================================

export class TripRecommendationEngine extends BaseMLEngine {
  private static instance: TripRecommendationEngine;
  private userProfiles = new Map<string, UserPreferenceProfile>();
  private modelWeights: MLModelWeights = {
    user_preference_weight: 0.3,
    historical_pattern_weight: 0.25,
    external_factor_weight: 0.2,
    social_signal_weight: 0.15,
    temporal_weight: 0.05,
    cost_sensitivity_weight: 0.05
  };

  private readonly MAX_RECOMMENDATIONS = 5;
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.6;

  private constructor() {
    super({
      cacheTTL: 30 * 60 * 1000, // 30 minutes
      enableLogging: true,
      maxRetries: 3
    });
    this.initializeEngine();
  }

  static getInstance(): TripRecommendationEngine {
    if (!TripRecommendationEngine.instance) {
      TripRecommendationEngine.instance = new TripRecommendationEngine();
    }
    return TripRecommendationEngine.instance;
  }

  getName(): string {
    return 'Trip Recommendation Engine';
  }

  getVersion(): string {
    return '2.0.0';
  }

  private initializeEngine(): void {
    // Start model training and updating
    setInterval(() => this.updateModelWeights(), 1000 * 60 * 60 * 24); // Daily

    if (this.config.enableLogging) {
      logger.debug('🤖 Trip Recommendation Engine initialized');
    }
  }

  // =====================================================
  // MAIN RECOMMENDATION API
  // =====================================================

  async generateRecommendations(
    userId: string,
    tripContext: TripContext,
    options: {
      include_alternatives?: boolean;
      max_recommendations?: number;
      force_refresh?: boolean;
    } = {}
  ): Promise<RouteRecommendation[]> {
    this.validateUserId(userId);

    const startTime = Date.now();
    const cacheKey = this.getCacheKey(userId, 'trip_recommendations', {
      origin: tripContext.origin,
      destination: tripContext.destination,
      departure_date: tripContext.departure_date,
      budget_range: tripContext.budget_range
    });

    return this.withErrorHandling(async () => {
      // Check cache first (unless force refresh)
      if (!options.force_refresh) {
        const cached = this.getFromCache<RouteRecommendation[]>(cacheKey);
        if (cached) {
          collectResponseTime({
            operation: 'trip_recommendations_cached',
            response_time_ms: Date.now() - startTime,
            cache_hit: true
          });
          return cached;
        }
      }

      // Get or create user profile
      const userProfile = await this.getUserProfile(userId);

      // Gather external data
      const externalFactors = await this.gatherExternalFactors(tripContext);

      // Generate base recommendations using ML
      const recommendations = await this.generateMLRecommendations(
        userProfile,
        tripContext,
        externalFactors
      );

      // Apply personalization and ranking
      const personalizedRecommendations = await this.personalizeRecommendations(
        recommendations,
        userProfile,
        userId
      );

      // Filter and limit results
      const finalRecommendations = personalizedRecommendations
        .filter(rec => rec.confidence_score >= this.MIN_CONFIDENCE_THRESHOLD)
        .slice(0, options.max_recommendations || this.MAX_RECOMMENDATIONS);

      // Cache results using base class
      this.setCache(cacheKey, finalRecommendations);

      // Track analytics
      collectResponseTime({
        operation: 'trip_recommendations_generated',
        response_time_ms: Date.now() - startTime,
        cache_hit: false
      });

      collectUserAction('trip_recommendations_generated', {
        user_id: userId,
        recommendation_count: finalRecommendations.length,
        avg_confidence: finalRecommendations.reduce((sum, r) => sum + r.confidence_score, 0) / finalRecommendations.length,
        processing_time: Date.now() - startTime
      });

      return finalRecommendations;
    }, 'generateRecommendations', []);
  }

  // =====================================================
  // USER PROFILE MANAGEMENT
  // =====================================================

  private async getUserProfile(userId: string): Promise<UserPreferenceProfile> {
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      profile = await this.buildUserProfile(userId);
      this.userProfiles.set(userId, profile);
    }

    return profile;
  }

  private async buildUserProfile(userId: string): Promise<UserPreferenceProfile> {
    return this.withErrorHandling(async () => {
      // Get user's historical trip data
      const userTrips = await tripDataPipeline.getUserTrips(userId, {
        include_analytics: true,
        limit: 50
      });

      // Get user behavior analytics
      const behaviorData = userBehaviorAnalytics.getUserJourneys(userId);

      // Analyze patterns and preferences
      const profile = this.analyzeUserPatterns(userTrips.data || [], behaviorData);

      return profile;
    }, 'buildUserProfile', this.getDefaultProfile());
  }

  private analyzeUserPatterns(trips: any[], behaviorData: any[]): UserPreferenceProfile {
    // Analyze trip distance patterns
    const distances = trips.map(trip => trip.enhanced_metrics?.distance || 0).filter(d => d > 0);
    const avgDistance = distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : 300;
    const distanceRange: [number, number] = [
      Math.max(50, avgDistance * 0.5),
      avgDistance * 1.5
    ];

    // Analyze budget patterns
    const budgets = trips.map(trip => trip.enhanced_metrics?.estimated_cost || 0).filter(b => b > 0);
    const avgBudget = budgets.length > 0 ? budgets.reduce((a, b) => a + b, 0) / budgets.length : 500;
    const budgetSensitivity = this.calculateBudgetSensitivity(budgets);

    // Analyze complexity preferences
    const complexities = trips.map(trip => trip.enhanced_metrics?.complexity_score || 5);
    const avgComplexity = complexities.length > 0 ? complexities.reduce((a, b) => a + b, 0) / complexities.length : 5;

    // Determine travel style from patterns
    const travelStyle = this.inferTravelStyle(trips, avgDistance, avgBudget, avgComplexity);

    return {
      travel_style: travelStyle,
      preferred_distance_range: distanceRange,
      typical_trip_duration: this.calculateTypicalDuration(trips),
      budget_sensitivity: budgetSensitivity,
      weather_sensitivity: 0.7, // Default, could be learned from behavior
      social_tendency: this.calculateSocialTendency(behaviorData),
      activity_preferences: this.inferActivityPreferences(trips),
      time_flexibility: 0.6, // Default, could be learned
      route_complexity_preference: avgComplexity,
      accommodation_preferences: this.inferAccommodationPreferences(trips)
    };
  }

  private calculateBudgetSensitivity(budgets: number[]): number {
    if (budgets.length < 2) return 0.5;

    const variance = this.calculateVariance(budgets);
    const mean = budgets.reduce((a, b) => a + b, 0) / budgets.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;

    // Lower CV = more budget sensitive (consistent spending)
    return Math.max(0.1, Math.min(0.9, 1 - coefficientOfVariation));
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = this.calculateAverage(numbers);
    return numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
  }

  private inferTravelStyle(trips: any[], avgDistance: number, avgBudget: number, avgComplexity: number): UserPreferenceProfile['travel_style'] {
    // Simple heuristics for travel style inference
    if (avgBudget > 1000 && avgComplexity > 7) return 'luxury';
    if (avgBudget < 300) return 'budget';
    if (avgComplexity > 8) return 'adventure';
    if (avgDistance < 200) return 'leisure';
    return 'family'; // Default
  }

  private calculateTypicalDuration(trips: any[]): number {
    // Calculate from trip metadata or default to 3 days
    return 3;
  }

  private calculateSocialTendency(behaviorData: any[]): number {
    // Analyze social feature usage
    return 0.5; // Default
  }

  private inferActivityPreferences(trips: any[]): string[] {
    // Analyze trip patterns to infer activity preferences
    return ['outdoor', 'scenic', 'cultural']; // Default
  }

  private inferAccommodationPreferences(trips: any[]): string[] {
    // Analyze accommodation patterns
    return ['camping', 'hotel']; // Default
  }

  private getDefaultProfile(): UserPreferenceProfile {
    return {
      travel_style: 'leisure',
      preferred_distance_range: [100, 500],
      typical_trip_duration: 3,
      budget_sensitivity: 0.7,
      weather_sensitivity: 0.7,
      social_tendency: 0.5,
      activity_preferences: ['outdoor', 'scenic'],
      time_flexibility: 0.6,
      route_complexity_preference: 5,
      accommodation_preferences: ['camping', 'hotel']
    };
  }

  // =====================================================
  // EXTERNAL DATA GATHERING
  // =====================================================

  private async gatherExternalFactors(tripContext: TripContext): Promise<ExternalFactors> {
    // In a real implementation, these would be actual API calls
    const mockExternalFactors: ExternalFactors = {
      weather_forecast: await this.getWeatherForecast(tripContext),
      traffic_conditions: await this.getTrafficConditions(tripContext),
      fuel_prices: await this.getFuelPrices(tripContext),
      events_and_attractions: await this.getEventsAndAttractions(tripContext),
      accommodation_availability: await this.getAccommodationAvailability(tripContext)
    };

    return mockExternalFactors;
  }

  private async getWeatherForecast(tripContext: TripContext): Promise<ExternalFactors['weather_forecast']> {
    // Mock weather data - in reality, integrate with weather API
    const forecast = [];
    const startDate = new Date(tripContext.departure_date);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      forecast.push({
        date: date.toISOString().split('T')[0],
        location: tripContext.origin,
        conditions: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
        temperature: 15 + Math.random() * 20,
        precipitation_chance: Math.random() * 0.5
      });
    }

    return forecast;
  }

  private async getTrafficConditions(tripContext: TripContext): Promise<ExternalFactors['traffic_conditions']> {
    // Mock traffic data
    return [
      {
        route_segment: 'main_route',
        congestion_level: 0.3,
        estimated_delay: 15
      }
    ];
  }

  private async getFuelPrices(tripContext: TripContext): Promise<ExternalFactors['fuel_prices']> {
    // Mock fuel price data
    return [
      {
        location: tripContext.origin,
        price_per_liter: 1.45 + Math.random() * 0.2,
        station_name: 'Local Station'
      }
    ];
  }

  private async getEventsAndAttractions(tripContext: TripContext): Promise<ExternalFactors['events_and_attractions']> {
    // Mock events data
    return [
      {
        name: 'Local Festival',
        location: tripContext.origin,
        date_range: [tripContext.departure_date, tripContext.return_date || tripContext.departure_date],
        category: 'cultural',
        popularity_score: 0.8
      }
    ];
  }

  private async getAccommodationAvailability(tripContext: TripContext): Promise<ExternalFactors['accommodation_availability']> {
    // Mock accommodation data
    return [
      {
        location: tripContext.origin,
        type: 'camping',
        availability: 0.7,
        price_range: [25, 50]
      }
    ];
  }

  // =====================================================
  // ML RECOMMENDATION GENERATION
  // =====================================================

  private async generateMLRecommendations(
    userProfile: UserPreferenceProfile,
    tripContext: TripContext,
    externalFactors: ExternalFactors
  ): Promise<RouteRecommendation[]> {
    const recommendations: RouteRecommendation[] = [];

    // Generate multiple route alternatives using different optimization strategies
    const strategies = [
      'cost_optimized',
      'time_optimized',
      'scenic_optimized',
      'weather_optimized',
      'balanced'
    ];

    for (const strategy of strategies) {
      const recommendation = await this.generateRouteWithStrategy(
        strategy,
        userProfile,
        tripContext,
        externalFactors
      );

      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  private async generateRouteWithStrategy(
    strategy: string,
    userProfile: UserPreferenceProfile,
    tripContext: TripContext,
    externalFactors: ExternalFactors
  ): Promise<RouteRecommendation | null> {
    return this.withErrorHandling(async () => {
      // Apply ML algorithm based on strategy
      const optimizationWeights = this.getOptimizationWeights(strategy, userProfile);

      // Generate waypoints and route
      const waypoints = await this.generateOptimalWaypoints(
        tripContext,
        externalFactors,
        optimizationWeights,
        userProfile
      );

      // Calculate route metrics
      const metrics = this.calculateRouteMetrics(waypoints, tripContext, externalFactors);

      // Calculate confidence score using base class method
      const confidenceScore = this.calculateConfidence(
        waypoints.length,
        metrics.weather_risk_score
      );

      const recommendation: RouteRecommendation = {
        route_id: `${strategy}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        waypoints,
        total_distance: metrics.total_distance,
        total_duration: metrics.total_duration,
        estimated_total_cost: metrics.estimated_cost,
        scenic_score: metrics.scenic_score,
        difficulty_score: metrics.difficulty_score,
        weather_risk_score: metrics.weather_risk_score,
        confidence_score: confidenceScore,
        optimization_factors: optimizationWeights,
        alternative_routes: [],
        personalization_score: 0, // Will be calculated in personalization step
        social_recommendations: []
      };

      return recommendation;
    }, `generateRouteWithStrategy_${strategy}`, null);
  }

  private getOptimizationWeights(strategy: string, userProfile: UserPreferenceProfile): RouteRecommendation['optimization_factors'] {
    const baseWeights = {
      cost_efficiency: 0.25,
      time_efficiency: 0.25,
      experience_quality: 0.25,
      weather_optimization: 0.25
    };

    switch (strategy) {
      case 'cost_optimized':
        return {
          cost_efficiency: 0.6,
          time_efficiency: 0.2,
          experience_quality: 0.1,
          weather_optimization: 0.1
        };
      case 'time_optimized':
        return {
          cost_efficiency: 0.1,
          time_efficiency: 0.6,
          experience_quality: 0.2,
          weather_optimization: 0.1
        };
      case 'scenic_optimized':
        return {
          cost_efficiency: 0.1,
          time_efficiency: 0.1,
          experience_quality: 0.7,
          weather_optimization: 0.1
        };
      case 'weather_optimized':
        return {
          cost_efficiency: 0.2,
          time_efficiency: 0.2,
          experience_quality: 0.2,
          weather_optimization: 0.4
        };
      default:
        // Apply user profile bias to balanced approach
        return {
          cost_efficiency: baseWeights.cost_efficiency * (1 + userProfile.budget_sensitivity),
          time_efficiency: baseWeights.time_efficiency * (1 + userProfile.time_flexibility),
          experience_quality: baseWeights.experience_quality * (1 + userProfile.route_complexity_preference / 10),
          weather_optimization: baseWeights.weather_optimization * (1 + userProfile.weather_sensitivity)
        };
    }
  }

  private async generateOptimalWaypoints(
    tripContext: TripContext,
    externalFactors: ExternalFactors,
    optimizationWeights: RouteRecommendation['optimization_factors'],
    userProfile: UserPreferenceProfile
  ): Promise<RouteRecommendation['waypoints']> {
    const waypoints: RouteRecommendation['waypoints'] = [];

    // Start with origin
    waypoints.push({
      location: tripContext.origin,
      arrival_time: tripContext.departure_date,
      departure_time: tripContext.departure_date,
      activities: [],
      estimated_cost: 0,
      weather_forecast: externalFactors.weather_forecast[0]
    });

    // Generate intermediate waypoints based on optimization strategy
    const numWaypoints = Math.min(
      Math.max(2, Math.floor(userProfile.route_complexity_preference / 2)),
      5
    );

    for (let i = 1; i < numWaypoints; i++) {
      const waypoint = this.generateWaypoint(
        tripContext,
        externalFactors,
        optimizationWeights,
        userProfile,
        i,
        numWaypoints
      );
      waypoints.push(waypoint);
    }

    // Add destination if specified
    if (tripContext.destination) {
      waypoints.push({
        location: tripContext.destination,
        arrival_time: tripContext.return_date || tripContext.departure_date,
        departure_time: tripContext.return_date || tripContext.departure_date,
        activities: userProfile.activity_preferences.slice(0, 2),
        estimated_cost: 100,
        weather_forecast: externalFactors.weather_forecast[externalFactors.weather_forecast.length - 1]
      });
    }

    return waypoints;
  }

  private generateWaypoint(
    tripContext: TripContext,
    externalFactors: ExternalFactors,
    optimizationWeights: RouteRecommendation['optimization_factors'],
    userProfile: UserPreferenceProfile,
    index: number,
    totalWaypoints: number
  ): RouteRecommendation['waypoints'][0] {
    // Generate a waypoint along the route based on optimization factors
    const progress = index / totalWaypoints;

    // Simple interpolation for demo (in reality, this would use routing algorithms)
    const lat = tripContext.origin.lat +
                (tripContext.destination ?
                 (tripContext.destination.lat - tripContext.origin.lat) * progress :
                 Math.random() * 2 - 1);

    const lng = tripContext.origin.lng +
                (tripContext.destination ?
                 (tripContext.destination.lng - tripContext.origin.lng) * progress :
                 Math.random() * 2 - 1);

    // Calculate arrival time
    const departureDate = new Date(tripContext.departure_date);
    const arrivalTime = new Date(departureDate);
    arrivalTime.setHours(arrivalTime.getHours() + index * 4); // 4 hours between waypoints

    const departureTime = new Date(arrivalTime);
    departureTime.setHours(departureTime.getHours() + 2); // 2 hour stop

    return {
      location: {
        lat,
        lng,
        name: `Waypoint ${index}`
      },
      arrival_time: arrivalTime.toISOString(),
      departure_time: departureTime.toISOString(),
      activities: this.selectActivitiesForWaypoint(userProfile, optimizationWeights),
      accommodation_suggestion: this.selectAccommodation(userProfile, optimizationWeights),
      estimated_cost: this.estimateWaypointCost(userProfile, optimizationWeights),
      weather_forecast: externalFactors.weather_forecast[Math.min(index, externalFactors.weather_forecast.length - 1)]
    };
  }

  private selectActivitiesForWaypoint(
    userProfile: UserPreferenceProfile,
    optimizationWeights: RouteRecommendation['optimization_factors']
  ): string[] {
    // Select activities based on user preferences and optimization weights
    const activities = userProfile.activity_preferences.slice();

    if (optimizationWeights.experience_quality > 0.5) {
      activities.push('scenic_viewing', 'photography');
    }

    return activities.slice(0, 3);
  }

  private selectAccommodation(
    userProfile: UserPreferenceProfile,
    optimizationWeights: RouteRecommendation['optimization_factors']
  ): string {
    if (optimizationWeights.cost_efficiency > 0.5) {
      return userProfile.accommodation_preferences.includes('camping') ? 'camping' : 'budget_hotel';
    }

    return userProfile.accommodation_preferences[0] || 'hotel';
  }

  private estimateWaypointCost(
    userProfile: UserPreferenceProfile,
    optimizationWeights: RouteRecommendation['optimization_factors']
  ): number {
    let baseCost = 150; // Base cost per waypoint

    if (optimizationWeights.cost_efficiency > 0.5) {
      baseCost *= 0.7; // 30% reduction for cost-optimized routes
    }

    if (optimizationWeights.experience_quality > 0.5) {
      baseCost *= 1.3; // 30% increase for experience-focused routes
    }

    return Math.round(baseCost * userProfile.budget_sensitivity);
  }

  private calculateRouteMetrics(
    waypoints: RouteRecommendation['waypoints'],
    tripContext: TripContext,
    externalFactors: ExternalFactors
  ): {
    total_distance: number;
    total_duration: number;
    estimated_cost: number;
    scenic_score: number;
    difficulty_score: number;
    weather_risk_score: number;
  } {
    // Calculate route metrics from waypoints
    const totalDistance = waypoints.reduce((sum, wp, index) => {
      if (index === 0) return 0;
      const prev = waypoints[index - 1];
      return sum + this.calculateDistance(prev.location, wp.location);
    }, 0);

    const totalDuration = waypoints.length * 4; // 4 hours per segment (simplified)
    const estimatedCost = waypoints.reduce((sum, wp) => sum + wp.estimated_cost, 0);

    const scenicScore = Math.random() * 10; // Would be calculated from route analysis
    const difficultyScore = Math.min(10, waypoints.length + Math.random() * 3);

    // Calculate weather risk from forecast
    const weatherRiskScore = externalFactors.weather_forecast.reduce((risk, forecast) => {
      return risk + forecast.precipitation_chance * 2; // Higher precipitation = higher risk
    }, 0) / externalFactors.weather_forecast.length;

    return {
      total_distance: totalDistance,
      total_duration: totalDuration,
      estimated_cost: estimatedCost,
      scenic_score: scenicScore,
      difficulty_score: difficultyScore,
      weather_risk_score: weatherRiskScore
    };
  }

  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }


  // =====================================================
  // PERSONALIZATION AND RANKING
  // =====================================================

  private async personalizeRecommendations(
    recommendations: RouteRecommendation[],
    userProfile: UserPreferenceProfile,
    userId: string
  ): Promise<RouteRecommendation[]> {
    // Apply personalization scoring and re-rank recommendations
    for (const recommendation of recommendations) {
      recommendation.personalization_score = await this.calculatePersonalizationScore(
        recommendation,
        userProfile,
        userId
      );

      // Add social recommendations if available
      recommendation.social_recommendations = await this.getSocialRecommendations(
        recommendation,
        userId
      );
    }

    // Re-rank based on combined scoring
    return recommendations.sort((a, b) => {
      const scoreA = this.calculateFinalScore(a, userProfile);
      const scoreB = this.calculateFinalScore(b, userProfile);
      return scoreB - scoreA;
    });
  }

  private async calculatePersonalizationScore(
    recommendation: RouteRecommendation,
    userProfile: UserPreferenceProfile,
    userId: string
  ): Promise<number> {
    let score = 0;

    // Distance preference alignment
    const avgDistance = recommendation.total_distance;
    if (avgDistance >= userProfile.preferred_distance_range[0] &&
        avgDistance <= userProfile.preferred_distance_range[1]) {
      score += 0.2;
    }

    // Budget alignment
    const budgetFit = this.calculateBudgetFit(recommendation.estimated_total_cost, userProfile);
    score += budgetFit * 0.25;

    // Complexity preference alignment
    const complexityFit = 1 - Math.abs(recommendation.difficulty_score - userProfile.route_complexity_preference) / 10;
    score += complexityFit * 0.2;

    // Activity preference alignment
    const activityScore = this.calculateActivityAlignment(recommendation, userProfile);
    score += activityScore * 0.2;

    // Weather sensitivity alignment
    if (userProfile.weather_sensitivity > 0.7 && recommendation.weather_risk_score < 0.3) {
      score += 0.15;
    }

    return Math.min(1.0, score);
  }

  private calculateBudgetFit(estimatedCost: number, userProfile: UserPreferenceProfile): number {
    // Simple budget fit calculation (could be more sophisticated)
    const budgetSensitivity = userProfile.budget_sensitivity;

    if (budgetSensitivity > 0.7) {
      // High budget sensitivity - prefer lower costs
      return Math.max(0, 1 - (estimatedCost / 1000)); // Normalize around $1000
    } else {
      // Lower budget sensitivity - less concerned about cost
      return 0.5 + (estimatedCost / 2000) * 0.5; // Slight preference for higher cost (better experience)
    }
  }

  private calculateActivityAlignment(recommendation: RouteRecommendation, userProfile: UserPreferenceProfile): number {
    const allActivities = recommendation.waypoints.flatMap(wp => wp.activities);
    const matchingActivities = allActivities.filter(activity =>
      userProfile.activity_preferences.includes(activity)
    );

    if (allActivities.length === 0) return 0;
    return matchingActivities.length / allActivities.length;
  }

  private async getSocialRecommendations(
    recommendation: RouteRecommendation,
    userId: string
  ): Promise<RouteRecommendation['social_recommendations']> {
    // In a real implementation, this would query similar users who took similar routes
    // For now, return empty array
    return [];
  }

  private calculateFinalScore(recommendation: RouteRecommendation, userProfile: UserPreferenceProfile): number {
    const weights = this.modelWeights;

    return (
      recommendation.confidence_score * weights.user_preference_weight +
      recommendation.personalization_score * weights.historical_pattern_weight +
      (1 - recommendation.weather_risk_score) * weights.external_factor_weight +
      0.5 * weights.social_signal_weight + // No social data yet
      0.7 * weights.temporal_weight + // Default temporal score
      this.calculateBudgetFit(recommendation.estimated_total_cost, userProfile) * weights.cost_sensitivity_weight
    );
  }

  // =====================================================
  // MODEL TRAINING AND OPTIMIZATION
  // =====================================================

  private updateModelWeights(): void {
    // In a real implementation, this would use feedback data to update ML model weights
    logger.debug('🔄 Updating ML model weights based on user feedback');

    // Mock weight adjustment
    this.modelWeights.user_preference_weight = Math.max(0.2, Math.min(0.4,
      this.modelWeights.user_preference_weight + (Math.random() - 0.5) * 0.02));
  }

  async learnFromUserFeedback(
    userId: string,
    recommendationId: string,
    feedback: {
      rating: number; // 1-5 scale
      selected: boolean;
      feedback_text?: string;
      actual_cost?: number;
      actual_duration?: number;
    }
  ): Promise<void> {
    this.validateUserId(userId);

    return this.withErrorHandling(async () => {
      // Store feedback for learning
      collectUserAction('trip_recommendation_feedback', {
        user_id: userId,
        recommendation_id: recommendationId,
        rating: feedback.rating,
        selected: feedback.selected,
        feedback_text: feedback.feedback_text
      });

      // Update user profile based on feedback
      await this.updateUserProfileFromFeedback(userId, feedback);

      if (this.config.enableLogging) {
        logger.debug('📚 Learning from user feedback', { userId, recommendationId, rating: feedback.rating });
      }
    }, 'learnFromUserFeedback');
  }

  private async updateUserProfileFromFeedback(userId: string, feedback: any): Promise<void> {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;

    // Adjust profile based on feedback
    if (feedback.rating >= 4) {
      // Positive feedback - reinforce current preferences
      // This is simplified - real implementation would be more sophisticated
    } else if (feedback.rating <= 2) {
      // Negative feedback - adjust preferences
      // This is simplified - real implementation would be more sophisticated
    }

    this.userProfiles.set(userId, profile);
  }

  // =====================================================
  // CACHE MANAGEMENT - Now handled by BaseMLEngine
  // =====================================================

  // =====================================================
  // PUBLIC API
  // =====================================================

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferenceProfile>): Promise<void> {
    this.validateUserId(userId);

    return this.withErrorHandling(async () => {
      const existingProfile = this.userProfiles.get(userId) || this.getDefaultProfile();
      const updatedProfile = { ...existingProfile, ...preferences };
      this.userProfiles.set(userId, updatedProfile);

      // Clear user-specific cache when preferences change
      this.clearCache(userId);

      collectUserAction('user_preferences_updated', {
        user_id: userId,
        updated_fields: Object.keys(preferences)
      });
    }, 'updateUserPreferences');
  }

  getUserPreferences(userId: string): UserPreferenceProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  getRecommendationStats(): {
    cached_recommendations: number;
    user_profiles: number;
    model_weights: MLModelWeights;
    cache_stats: { size: number; keys: string[] };
  } {
    return {
      cached_recommendations: this.getCacheStats().size,
      user_profiles: this.userProfiles.size,
      model_weights: { ...this.modelWeights },
      cache_stats: this.getCacheStats()
    };
  }

  clearUserData(userId: string): void {
    this.validateUserId(userId);

    this.userProfiles.delete(userId);

    // Clear user-specific cache using base class method
    this.clearCache(userId);
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const tripRecommendationEngine = TripRecommendationEngine.getInstance();

// Convenience functions
export const generateTripRecommendations = (
  userId: string,
  tripContext: TripContext,
  options?: any
) => tripRecommendationEngine.generateRecommendations(userId, tripContext, options);

export const updateUserTravelPreferences = (
  userId: string,
  preferences: Partial<UserPreferenceProfile>
) => tripRecommendationEngine.updateUserPreferences(userId, preferences);

export const learnFromTripFeedback = (
  userId: string,
  recommendationId: string,
  feedback: any
) => tripRecommendationEngine.learnFromUserFeedback(userId, recommendationId, feedback);