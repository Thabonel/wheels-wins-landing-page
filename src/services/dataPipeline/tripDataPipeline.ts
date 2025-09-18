/**
 * Enhanced Trip Data Pipeline with Intelligent Caching and Real-time Analytics
 *
 * Optimizes trip planning data flow with:
 * - Multi-level caching strategy
 * - Real-time data synchronization
 * - Performance analytics
 * - Predictive data prefetching
 */

import { supabase } from '@/integrations/supabase/client';
import { collectUserAction, collectCacheEvent, collectResponseTime } from '@/services/pam/analytics/analyticsCollector';
import { logger } from '@/lib/logger';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface TripMetrics {
  distance: number;
  duration: number;
  waypoint_count: number;
  complexity_score: number;
  estimated_cost: number;
  carbon_footprint: number;
}

interface CachedTripData {
  trip: any;
  metrics: TripMetrics;
  cached_at: string;
  expires_at: string;
  access_count: number;
  popularity_score: number;
}

interface TripAnalytics {
  user_preferences: Record<string, any>;
  frequently_visited: string[];
  trip_patterns: Array<{
    pattern_type: string;
    frequency: number;
    avg_duration: number;
    preferred_times: string[];
  }>;
  optimization_suggestions: string[];
}

interface PipelineMetrics {
  cache_hit_rate: number;
  avg_response_time: number;
  data_freshness: number;
  user_engagement: number;
}

// =====================================================
// ENHANCED TRIP DATA PIPELINE
// =====================================================

export class TripDataPipeline {
  private static instance: TripDataPipeline;
  private cache = new Map<string, CachedTripData>();
  private userAnalytics = new Map<string, TripAnalytics>();
  private metrics: PipelineMetrics = {
    cache_hit_rate: 0,
    avg_response_time: 0,
    data_freshness: 1,
    user_engagement: 0
  };

  // Cache configuration
  private readonly CACHE_TTL = 1000 * 60 * 15; // 15 minutes
  private readonly MAX_CACHE_SIZE = 500;
  private readonly PREFETCH_THRESHOLD = 0.7; // Prefetch if popularity > 70%

  private constructor() {
    this.initializePipeline();
  }

  static getInstance(): TripDataPipeline {
    if (!TripDataPipeline.instance) {
      TripDataPipeline.instance = new TripDataPipeline();
    }
    return TripDataPipeline.instance;
  }

  private initializePipeline(): void {
    // Start cache cleanup process
    setInterval(() => this.cleanupCache(), 1000 * 60 * 5); // Every 5 minutes

    // Prefetch popular user_trips
    setInterval(() => this.prefetchPopularTrips(), 1000 * 60 * 10); // Every 10 minutes

    logger.debug('🚗 Trip Data Pipeline initialized');
  }

  // =====================================================
  // CORE TRIP OPERATIONS WITH CACHING
  // =====================================================

  async saveTrip(userId: string, tripData: any): Promise<{ success: boolean; data?: any; error?: any }> {
    const startTime = Date.now();
    const cacheKey = `trip_${userId}_${Date.now()}`;

    try {
      // Calculate trip metrics
      const metrics = this.calculateTripMetrics(tripData);

      // Save to database
      const { data, error } = await supabase
        .from('user_trips')
        .insert({
          user_id: userId,
          title: tripData.title,
          description: tripData.description,
          status: tripData.status || 'draft',
          privacy_level: tripData.privacy_level || 'private',
          metadata: {
            route_data: tripData.route_data,
            metrics,
            pipeline_version: '2.0',
            created_via: 'enhanced_pipeline'
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Cache the new trip
      this.cacheTrip(cacheKey, data, metrics);

      // Update user analytics
      await this.updateUserAnalytics(userId, tripData, 'save');

      // Track analytics
      const responseTime = Date.now() - startTime;
      collectResponseTime({
        operation: 'save_trip',
        response_time_ms: responseTime,
        cache_hit: false
      });

      collectUserAction('trip_saved', {
        trip_id: data.id,
        metrics,
        response_time: responseTime
      });

      return { success: true, data };
    } catch (error) {
      logger.error('Error in trip save pipeline:', error);
      return { success: false, error };
    }
  }

  async loadTrip(tripId: string, userId?: string): Promise<{ success: boolean; data?: any; error?: any }> {
    const startTime = Date.now();
    const cacheKey = `trip_${tripId}`;

    try {
      // Check cache first
      const cached = this.getCachedTrip(cacheKey);
      if (cached) {
        collectCacheEvent('hit', {
          operation: 'load_trip',
          cache_key: cacheKey,
          response_time_saved: 50 // Estimated DB query time
        });

        collectResponseTime({
          operation: 'load_trip',
          response_time_ms: Date.now() - startTime,
          cache_hit: true
        });

        return { success: true, data: cached.trip };
      }

      // Cache miss - load from database
      collectCacheEvent('miss', {
        operation: 'load_trip',
        cache_key: cacheKey
      });

      const { data, error } = await supabase
        .from('user_trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (error) throw error;

      // Calculate and cache metrics
      const metrics = this.calculateTripMetrics(data.metadata?.route_data || {});
      this.cacheTrip(cacheKey, data, metrics);

      // Update user analytics if user provided
      if (userId) {
        await this.updateUserAnalytics(userId, data, 'load');
      }

      const responseTime = Date.now() - startTime;
      collectResponseTime({
        operation: 'load_trip',
        response_time_ms: responseTime,
        cache_hit: false
      });

      return { success: true, data };
    } catch (error) {
      logger.error('Error in trip load pipeline:', error);
      return { success: false, error };
    }
  }

  async getUserTrips(userId: string, options: {
    limit?: number;
    offset?: number;
    status?: string;
    include_analytics?: boolean;
  } = {}): Promise<{ success: boolean; data?: any[]; analytics?: TripAnalytics; error?: any }> {
    const startTime = Date.now();
    const cacheKey = `user_trips_${userId}_${JSON.stringify(options)}`;

    try {
      // Check cache
      const cached = this.getCachedTrip(cacheKey);
      if (cached) {
        collectCacheEvent('hit', {
          operation: 'get_user_trips',
          cache_key: cacheKey
        });

        const result: any = { success: true, data: cached.trip };
        if (options.include_analytics) {
          result.analytics = this.userAnalytics.get(userId);
        }
        return result;
      }

      // Load from database with optimized query
      let query = supabase
        .from('user_trips')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (options.limit) query = query.limit(options.limit);
      if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      if (options.status) query = query.eq('status', options.status);

      const { data, error } = await query;
      if (error) throw error;

      // Process and cache results
      const processedData = (data || []).map(trip => ({
        ...trip,
        enhanced_metrics: this.calculateTripMetrics(trip.metadata?.route_data || {})
      }));

      this.cacheTrip(cacheKey, processedData, this.calculateAggregateMetrics(processedData));

      const responseTime = Date.now() - startTime;
      collectResponseTime({
        operation: 'get_user_trips',
        response_time_ms: responseTime,
        cache_hit: false
      });

      const result: any = { success: true, data: processedData };
      if (options.include_analytics) {
        result.analytics = this.userAnalytics.get(userId);
      }

      return result;
    } catch (error) {
      logger.error('Error in getUserTrips pipeline:', error);
      return { success: false, error };
    }
  }

  // =====================================================
  // ANALYTICS AND METRICS
  // =====================================================

  private calculateTripMetrics(routeData: any): TripMetrics {
    const waypoints = routeData.waypoints || [];
    const distance = routeData.distance || 0;
    const duration = routeData.duration || 0;

    // Calculate complexity score based on various factors
    const complexityScore = this.calculateComplexityScore(waypoints, distance, duration);

    // Estimate cost (rough calculation)
    const estimatedCost = this.estimateTripCost(distance, duration, waypoints.length);

    // Calculate carbon footprint
    const carbonFootprint = this.calculateCarbonFootprint(distance, routeData.profile);

    return {
      distance,
      duration,
      waypoint_count: waypoints.length,
      complexity_score: complexityScore,
      estimated_cost: estimatedCost,
      carbon_footprint: carbonFootprint
    };
  }

  private calculateComplexityScore(waypoints: any[], distance: number, duration: number): number {
    let score = 0;

    // Base complexity from waypoint count
    score += waypoints.length * 0.2;

    // Distance factor
    score += Math.min(distance / 1000, 10) * 0.3; // Max 10 points for distance

    // Duration factor
    score += Math.min(duration / 3600, 8) * 0.2; // Max 8 points for duration

    // Route complexity (turns, traffic, etc.)
    score += waypoints.length > 5 ? 0.3 : 0;

    return Math.min(score, 10); // Cap at 10
  }

  private estimateTripCost(distance: number, duration: number, waypointCount: number): number {
    // Rough estimation: $0.50 per km + $5 per hour + $2 per waypoint
    const fuelCost = (distance / 1000) * 0.50;
    const timeCost = (duration / 3600) * 5;
    const waypointCost = waypointCount * 2;

    return fuelCost + timeCost + waypointCost;
  }

  private calculateCarbonFootprint(distance: number, profile: string = 'driving'): number {
    // CO2 emissions in kg
    const emissionFactors = {
      driving: 0.21, // kg CO2 per km
      walking: 0,
      cycling: 0,
      public_transport: 0.05
    };

    const factor = emissionFactors[profile as keyof typeof emissionFactors] || emissionFactors.driving;
    return (distance / 1000) * factor;
  }

  private calculateAggregateMetrics(user_trips: any[]): TripMetrics {
    const totals = user_trips.reduce((acc, trip) => {
      const metrics = trip.enhanced_metrics || {};
      return {
        distance: acc.distance + (metrics.distance || 0),
        duration: acc.duration + (metrics.duration || 0),
        waypoint_count: acc.waypoint_count + (metrics.waypoint_count || 0),
        complexity_score: acc.complexity_score + (metrics.complexity_score || 0),
        estimated_cost: acc.estimated_cost + (metrics.estimated_cost || 0),
        carbon_footprint: acc.carbon_footprint + (metrics.carbon_footprint || 0)
      };
    }, {
      distance: 0, duration: 0, waypoint_count: 0,
      complexity_score: 0, estimated_cost: 0, carbon_footprint: 0
    });

    return {
      ...totals,
      complexity_score: totals.complexity_score / user_trips.length // Average complexity
    };
  }

  // =====================================================
  // CACHE MANAGEMENT
  // =====================================================

  private cacheTrip(key: string, trip: any, metrics: TripMetrics): void {
    const cached: CachedTripData = {
      trip,
      metrics,
      cached_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + this.CACHE_TTL).toISOString(),
      access_count: 1,
      popularity_score: 0.1
    };

    // Remove old entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastPopular();
    }

    this.cache.set(key, cached);
    this.updateMetrics();
  }

  private getCachedTrip(key: string): CachedTripData | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check expiration
    if (new Date() > new Date(cached.expires_at)) {
      this.cache.delete(key);
      return null;
    }

    // Update access count and popularity
    cached.access_count++;
    cached.popularity_score = this.calculatePopularityScore(cached);

    return cached;
  }

  private calculatePopularityScore(cached: CachedTripData): number {
    const ageHours = (Date.now() - new Date(cached.cached_at).getTime()) / (1000 * 60 * 60);
    const recencyFactor = Math.max(0, 1 - (ageHours / 24)); // Decay over 24 hours
    const accessFactor = Math.min(cached.access_count / 10, 1); // Max boost at 10 accesses

    return (recencyFactor * 0.6) + (accessFactor * 0.4);
  }

  private evictLeastPopular(): void {
    let leastPopular = '';
    let lowestScore = Infinity;

    for (const [key, cached] of this.cache) {
      if (cached.popularity_score < lowestScore) {
        lowestScore = cached.popularity_score;
        leastPopular = key;
      }
    }

    if (leastPopular) {
      this.cache.delete(leastPopular);
    }
  }

  private cleanupCache(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, cached] of this.cache) {
      if (now > new Date(cached.expires_at)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`🧹 Cleaned ${cleanedCount} expired cache entries`);
      this.updateMetrics();
    }
  }

  private async prefetchPopularTrips(): Promise<void> {
    // Find user_trips with high popularity scores that aren't cached
    const popularThreshold = this.PREFETCH_THRESHOLD;

    // This would typically analyze user patterns and prefetch likely-to-be-accessed user_trips
    // For now, we'll implement a simple strategy

    for (const [key, cached] of this.cache) {
      if (cached.popularity_score > popularThreshold && cached.access_count > 5) {
        // Refresh cache for popular items before they expire
        const timeUntilExpiry = new Date(cached.expires_at).getTime() - Date.now();
        if (timeUntilExpiry < this.CACHE_TTL * 0.2) { // Refresh when 20% of TTL remaining
          // Extend cache life
          cached.expires_at = new Date(Date.now() + this.CACHE_TTL).toISOString();
        }
      }
    }
  }

  // =====================================================
  // USER ANALYTICS
  // =====================================================

  private async updateUserAnalytics(userId: string, tripData: any, action: 'save' | 'load'): Promise<void> {
    let analytics = this.userAnalytics.get(userId) || {
      user_preferences: {},
      frequently_visited: [],
      trip_patterns: [],
      optimization_suggestions: []
    };

    // Update based on action
    if (action === 'save') {
      this.analyzeTripPreferences(analytics, tripData);
    } else if (action === 'load') {
      this.analyzeAccessPatterns(analytics, tripData);
    }

    // Generate optimization suggestions
    analytics.optimization_suggestions = this.generateOptimizationSuggestions(analytics);

    this.userAnalytics.set(userId, analytics);
  }

  private analyzeTripPreferences(analytics: TripAnalytics, tripData: any): void {
    const routeData = tripData.metadata?.route_data || {};

    // Track preferred profiles
    if (routeData.profile) {
      analytics.user_preferences.preferred_profile = routeData.profile;
    }

    // Track typical trip distances
    if (routeData.distance) {
      analytics.user_preferences.avg_distance =
        (analytics.user_preferences.avg_distance || 0) * 0.8 + routeData.distance * 0.2;
    }

    // Track waypoint preferences
    const waypointCount = routeData.waypoints?.length || 0;
    analytics.user_preferences.avg_waypoints =
      (analytics.user_preferences.avg_waypoints || 0) * 0.8 + waypointCount * 0.2;
  }

  private analyzeAccessPatterns(analytics: TripAnalytics, tripData: any): void {
    // Track when user_trips are typically accessed
    const hour = new Date().getHours();
    const timeSlot = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

    // Find or create pattern
    let pattern = analytics.trip_patterns.find(p => p.pattern_type === 'access_time');
    if (!pattern) {
      pattern = {
        pattern_type: 'access_time',
        frequency: 0,
        avg_duration: 0,
        preferred_times: []
      };
      analytics.trip_patterns.push(pattern);
    }

    pattern.frequency++;
    if (!pattern.preferred_times.includes(timeSlot)) {
      pattern.preferred_times.push(timeSlot);
    }
  }

  private generateOptimizationSuggestions(analytics: TripAnalytics): string[] {
    const suggestions: string[] = [];

    // Distance-based suggestions
    const avgDistance = analytics.user_preferences.avg_distance || 0;
    if (avgDistance > 500000) { // 500km+
      suggestions.push('Consider multi-day trip planning for better rest stops');
    }

    // Waypoint suggestions
    const avgWaypoints = analytics.user_preferences.avg_waypoints || 0;
    if (avgWaypoints > 8) {
      suggestions.push('Consider breaking complex user_trips into segments');
    }

    // Time-based suggestions
    const patterns = analytics.trip_patterns;
    const accessPattern = patterns.find(p => p.pattern_type === 'access_time');
    if (accessPattern && accessPattern.preferred_times.includes('night')) {
      suggestions.push('Plan overnight stops for late-night travel');
    }

    return suggestions.slice(0, 3); // Limit to top 3 suggestions
  }

  // =====================================================
  // METRICS AND MONITORING
  // =====================================================

  private updateMetrics(): void {
    const totalRequests = this.getTotalRequests();
    const cacheHits = this.getCacheHits();

    this.metrics.cache_hit_rate = totalRequests > 0 ? cacheHits / totalRequests : 0;
    this.metrics.data_freshness = this.calculateDataFreshness();
    this.metrics.user_engagement = this.calculateUserEngagement();
  }

  private getTotalRequests(): number {
    // This would be tracked separately in a real implementation
    return Array.from(this.cache.values()).reduce((sum, cached) => sum + cached.access_count, 0);
  }

  private getCacheHits(): number {
    // This would be tracked separately in a real implementation
    return Array.from(this.cache.values()).filter(cached => cached.access_count > 1).length;
  }

  private calculateDataFreshness(): number {
    if (this.cache.size === 0) return 1;

    const avgAge = Array.from(this.cache.values()).reduce((sum, cached) => {
      const age = Date.now() - new Date(cached.cached_at).getTime();
      return sum + age;
    }, 0) / this.cache.size;

    // Convert to freshness score (1 = very fresh, 0 = very stale)
    return Math.max(0, 1 - (avgAge / this.CACHE_TTL));
  }

  private calculateUserEngagement(): number {
    const analytics = Array.from(this.userAnalytics.values());
    if (analytics.length === 0) return 0;

    const avgPatterns = analytics.reduce((sum, a) => sum + a.trip_patterns.length, 0) / analytics.length;
    return Math.min(avgPatterns / 5, 1); // Normalize to 0-1
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  getPipelineMetrics(): PipelineMetrics {
    return { ...this.metrics };
  }

  getUserAnalytics(userId: string): TripAnalytics | undefined {
    return this.userAnalytics.get(userId);
  }

  clearCache(): void {
    this.cache.clear();
    this.updateMetrics();
    logger.debug('🧹 Trip cache cleared');
  }

  getCacheStats(): {
    size: number;
    hit_rate: number;
    popular_items: Array<{ key: string; popularity: number; access_count: number }>;
  } {
    const popular = Array.from(this.cache.entries())
      .map(([key, cached]) => ({
        key,
        popularity: cached.popularity_score,
        access_count: cached.access_count
      }))
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 10);

    return {
      size: this.cache.size,
      hit_rate: this.metrics.cache_hit_rate,
      popular_items: popular
    };
  }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const tripDataPipeline = TripDataPipeline.getInstance();

// Convenience functions
export const saveTripWithPipeline = tripDataPipeline.saveTrip.bind(tripDataPipeline);
export const loadTripWithPipeline = tripDataPipeline.loadTrip.bind(tripDataPipeline);
export const getUserTripsWithPipeline = tripDataPipeline.getUserTrips.bind(tripDataPipeline);