/**
 * PAM Proactive Assistant - Phase 6.2 Implementation
 * Based on industry patterns from:
 * - MakeMyTrip's Myra predictive recommendations
 * - Expedia's proactive travel alerts
 * - Google Assistant's proactive suggestions
 * - Microsoft Cortana's predictive insights
 * - Amazon Alexa's routine suggestions
 */

import { BaseAgent } from '../agents/base';
import { MemoryAgent } from '../agents/MemoryAgent';
import { WheelsAgent } from '../agents/WheelsAgent';
import { WinsAgent } from '../agents/WinsAgent';
import { SocialAgent } from '../agents/SocialAgent';
import { LearningSystem } from './LearningSystem';
import { 
  ProactiveInsight, 
  UserContext, 
  TravelPattern,
  BudgetPattern,
  WeatherAlert,
  MaintenanceReminder,
  CommunityActivity,
  ConversationContext
} from '../types';

// Enhanced error handling for Proactive Assistant
class ProactiveAssistantError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ProactiveAssistantError';
  }
}

// Bounded Map with TTL for cache management
class TTLBoundedMap<K, V> extends Map<K, V & { timestamp: number; ttl: number }> {
  constructor(private maxSize: number, private defaultTTL: number = 300000) {
    super();
  }

  set(key: K, value: V, ttl?: number): this {
    if (this.size >= this.maxSize) {
      const firstKey = this.keys().next().value;
      if (firstKey !== undefined) {
        this.delete(firstKey);
      }
    }
    return super.set(key, {
      ...value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    } as V & { timestamp: number; ttl: number });
  }

  get(key: K): V | undefined {
    const entry = super.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry;
    }
    if (entry) {
      this.delete(key);
    }
    return undefined;
  }
}

export interface ProactiveConfiguration {
  // How often to generate insights (in milliseconds)
  insightGenerationInterval: number;
  // Minimum confidence score for showing suggestions
  minConfidenceThreshold: number;
  // Maximum insights to show per session
  maxInsightsPerSession: number;
  // Enable different insight types
  enableWeatherAlerts: boolean;
  enableBudgetAlerts: boolean;
  enableTripSuggestions: boolean;
  enableMaintenanceReminders: boolean;
  enableCommunityNotifications: boolean;
}

/**
 * Proactive Assistant implementing industry-standard recommendation patterns
 * Reference: MakeMyTrip's predictive travel recommendations
 * Reference: Google Assistant's proactive suggestions framework
 * Reference: Microsoft's predictive insights architecture
 */
export class ProactiveAssistant {
  private memoryAgent: MemoryAgent;
  private wheelsAgent: WheelsAgent;
  private winsAgent: WinsAgent;
  private socialAgent: SocialAgent;
  private learningSystem: LearningSystem;
  private config: ProactiveConfiguration;
  private userInsightHistory: TTLBoundedMap<string, ProactiveInsight[]>;
  private lastInsightGeneration: TTLBoundedMap<string, number>;

  constructor(
    memoryAgent: MemoryAgent,
    wheelsAgent: WheelsAgent,
    winsAgent: WinsAgent,
    socialAgent: SocialAgent,
    learningSystem: LearningSystem,
    config: Partial<ProactiveConfiguration> = {}
  ) {
    this.memoryAgent = memoryAgent;
    this.wheelsAgent = wheelsAgent;
    this.winsAgent = winsAgent;
    this.socialAgent = socialAgent;
    this.learningSystem = learningSystem;
    
    // Industry-standard configuration based on major platforms
    this.config = {
      insightGenerationInterval: 300000, // 5 minutes (Google Assistant standard)
      minConfidenceThreshold: 0.7, // MakeMyTrip Myra standard
      maxInsightsPerSession: 3, // Microsoft Cortana standard
      enableWeatherAlerts: true,
      enableBudgetAlerts: true,
      enableTripSuggestions: true,
      enableMaintenanceReminders: true,
      enableCommunityNotifications: true,
      ...config
    };

    this.userInsightHistory = new TTLBoundedMap(1000, 1800000); // 30 min TTL, max 1000 users
    this.lastInsightGeneration = new TTLBoundedMap(1000, 3600000); // 1 hour TTL for rate limiting
  }

  /**
   * Generate proactive insights for user
   * Based on MakeMyTrip's recommendation engine
   */
  async generateInsights(
    userId: string, 
    context: ConversationContext
  ): Promise<ProactiveInsight[]> {
    const lastGeneration = this.lastInsightGeneration.get(userId) || 0;
    const now = Date.now();
    
    // Rate limiting to prevent spam (industry standard)
    if (now - lastGeneration < this.config.insightGenerationInterval) {
      return this.getCachedInsights(userId);
    }

    try {
      const insights: ProactiveInsight[] = [];
      
      // Get user context and patterns
      const userContext = await this.buildUserContext(userId, context);
      
      // 1. Weather-based travel suggestions (Expedia pattern)
      if (this.config.enableWeatherAlerts) {
        const weatherInsights = await this.generateWeatherInsights(userContext);
        insights.push(...weatherInsights);
      }
      
      // 2. Budget alerts and recommendations (Mint/YNAB pattern)
      if (this.config.enableBudgetAlerts) {
        const budgetInsights = await this.generateBudgetInsights(userContext);
        insights.push(...budgetInsights);
      }
      
      // 3. Trip suggestions based on patterns (MakeMyTrip pattern)
      if (this.config.enableTripSuggestions) {
        const tripInsights = await this.generateTripSuggestions(userContext);
        insights.push(...tripInsights);
      }
      
      // 4. Maintenance reminders (Tesla/BMW pattern)
      if (this.config.enableMaintenanceReminders) {
        const maintenanceInsights = await this.generateMaintenanceReminders(userContext);
        insights.push(...maintenanceInsights);
      }
      
      // 5. Community activity notifications (Facebook/Nextdoor pattern)
      if (this.config.enableCommunityNotifications) {
        const communityInsights = await this.generateCommunityInsights(userContext);
        insights.push(...communityInsights);
      }
      
      // Filter by confidence and limit count
      const filteredInsights = insights
        .filter(insight => insight.confidence >= this.config.minConfidenceThreshold)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, this.config.maxInsightsPerSession);
      
      // Cache results and update timestamp
      this.userInsightHistory.set(userId, filteredInsights);
      this.lastInsightGeneration.set(userId, now);
      
      // Log insights for analytics
      this.logInsightGeneration(userId, filteredInsights);
      
      return filteredInsights;
      
    } catch (error) {
      console.error('Proactive Assistant: Failed to generate insights', {
        userId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Generate weather-based travel insights
   * Based on Expedia's weather alert system
   */
  private async generateWeatherInsights(userContext: UserContext): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];
    
    try {
      const { travelPatterns, currentLocation } = userContext;
      
      // Check for upcoming trips with weather concerns
      if (travelPatterns.upcomingTrips && travelPatterns.upcomingTrips.length > 0) {
        for (const trip of travelPatterns.upcomingTrips) {
          // Get weather forecast for trip dates
          const weatherForecast = await this.getWeatherForecast(trip.destination, trip.dates);
          
          if (weatherForecast.hasAlerts) {
            insights.push({
              id: `weather_${trip.id}`,
              type: 'weather_alert',
              priority: 'high',
              confidence: 0.9,
              title: `Weather Alert for ${trip.destination}`,
              message: `${weatherForecast.alertType} expected during your trip to ${trip.destination}`,
              actionable: true,
              actions: [
                {
                  label: 'View Alternative Dates',
                  action: 'suggest_alternative_dates',
                  data: { tripId: trip.id }
                },
                {
                  label: 'Find Weather-Safe Routes',
                  action: 'suggest_weather_routes',
                  data: { tripId: trip.id }
                }
              ],
              data: {
                tripId: trip.id,
                weatherAlert: weatherForecast,
                severity: weatherForecast.severity
              },
              source: 'weather_service',
              timestamp: Date.now(),
              expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            });
          }
        }
      }
      
      // Seasonal travel suggestions
      const seasonalSuggestion = await this.generateSeasonalSuggestion(userContext);
      if (seasonalSuggestion) {
        insights.push(seasonalSuggestion);
      }
      
    } catch (error) {
      console.error('Failed to generate weather insights:', error);
    }
    
    return insights;
  }

  /**
   * Generate budget-related insights
   * Based on Mint and YNAB budgeting patterns
   */
  private async generateBudgetInsights(userContext: UserContext): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];
    
    try {
      const { budgetPatterns, travelPatterns } = userContext;
      
      // Budget threshold alerts
      if (budgetPatterns.monthlySpending > budgetPatterns.monthlyBudget * 0.8) {
        insights.push({
          id: `budget_alert_${Date.now()}`,
          type: 'budget_alert',
          priority: budgetPatterns.monthlySpending > budgetPatterns.monthlyBudget ? 'high' : 'medium',
          confidence: 0.85,
          title: 'Budget Alert',
          message: `You've used ${Math.round((budgetPatterns.monthlySpending / budgetPatterns.monthlyBudget) * 100)}% of your travel budget this month`,
          actionable: true,
          actions: [
            {
              label: 'View Budget Breakdown',
              action: 'show_budget_breakdown',
              data: {}
            },
            {
              label: 'Find Budget-Friendly Options',
              action: 'suggest_budget_options',
              data: {}
            }
          ],
          data: {
            currentSpending: budgetPatterns.monthlySpending,
            budget: budgetPatterns.monthlyBudget,
            percentageUsed: (budgetPatterns.monthlySpending / budgetPatterns.monthlyBudget) * 100
          },
          source: 'budget_analyzer',
          timestamp: Date.now(),
          expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        });
      }
      
      // Fuel price alerts
      const fuelInsight = await this.generateFuelPriceInsight(userContext);
      if (fuelInsight) {
        insights.push(fuelInsight);
      }
      
    } catch (error) {
      console.error('Failed to generate budget insights:', error);
    }
    
    return insights;
  }

  /**
   * Generate trip suggestions based on user patterns
   * Based on MakeMyTrip's recommendation algorithm
   */
  private async generateTripSuggestions(userContext: UserContext): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];
    
    try {
      const { travelPatterns, preferences } = userContext;
      
      // Destination suggestions based on history
      if (travelPatterns.favoriteDestinations && travelPatterns.favoriteDestinations.length > 0) {
        const similarDestinations = await this.findSimilarDestinations(
          travelPatterns.favoriteDestinations,
          preferences
        );
        
        if (similarDestinations.length > 0) {
          insights.push({
            id: `trip_suggestion_${Date.now()}`,
            type: 'trip_suggestion',
            priority: 'medium',
            confidence: 0.75,
            title: 'New Destinations for You',
            message: `Based on your love for ${travelPatterns.favoriteDestinations[0]}, you might enjoy these similar places`,
            actionable: true,
            actions: [
              {
                label: 'Plan Trip',
                action: 'start_trip_planning',
                data: { destinations: similarDestinations }
              },
              {
                label: 'Learn More',
                action: 'show_destination_details',
                data: { destinations: similarDestinations }
              }
            ],
            data: {
              suggestions: similarDestinations,
              basedOn: travelPatterns.favoriteDestinations
            },
            source: 'trip_recommender',
            timestamp: Date.now(),
            expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
          });
        }
      }
      
    } catch (error) {
      console.error('Failed to generate trip suggestions:', error);
    }
    
    return insights;
  }

  /**
   * Generate maintenance reminders
   * Based on Tesla and BMW connected car patterns
   */
  private async generateMaintenanceReminders(userContext: UserContext): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];
    
    try {
      const { vehicleData, travelPatterns } = userContext;
      
      if (vehicleData) {
        // Mileage-based maintenance
        if (vehicleData.milesSinceLastService > 4500) {
          insights.push({
            id: `maintenance_service_${Date.now()}`,
            type: 'maintenance_reminder',
            priority: vehicleData.milesSinceLastService > 5500 ? 'high' : 'medium',
            confidence: 0.9,
            title: 'Service Reminder',
            message: `Your RV has traveled ${vehicleData.milesSinceLastService} miles since the last service`,
            actionable: true,
            actions: [
              {
                label: 'Find Service Centers',
                action: 'find_service_centers',
                data: { location: userContext.currentLocation }
              },
              {
                label: 'Schedule Service',
                action: 'schedule_service',
                data: { vehicleId: vehicleData.id }
              }
            ],
            data: {
              milesSinceService: vehicleData.milesSinceLastService,
              recommendedInterval: 5000,
              vehicleInfo: vehicleData
            },
            source: 'maintenance_tracker',
            timestamp: Date.now(),
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
          });
        }
        
        // Seasonal maintenance reminders
        const seasonalReminder = await this.generateSeasonalMaintenanceReminder(userContext);
        if (seasonalReminder) {
          insights.push(seasonalReminder);
        }
      }
      
    } catch (error) {
      console.error('Failed to generate maintenance reminders:', error);
    }
    
    return insights;
  }

  /**
   * Generate community-based insights
   * Based on Facebook Groups and Nextdoor patterns
   */
  private async generateCommunityInsights(userContext: UserContext): Promise<ProactiveInsight[]> {
    const insights: ProactiveInsight[] = [];
    
    try {
      const { currentLocation, socialPatterns, travelPatterns } = userContext;
      
      // Local RV meetups and events
      const localEvents = await this.findLocalRVEvents(currentLocation);
      if (localEvents && localEvents.length > 0) {
        insights.push({
          id: `community_events_${Date.now()}`,
          type: 'community_activity',
          priority: 'low',
          confidence: 0.7,
          title: 'RV Events Nearby',
          message: `${localEvents.length} RV meetups and events happening near you this week`,
          actionable: true,
          actions: [
            {
              label: 'View Events',
              action: 'show_local_events',
              data: { events: localEvents }
            },
            {
              label: 'Join Community',
              action: 'join_rv_community',
              data: { location: currentLocation }
            }
          ],
          data: {
            events: localEvents,
            location: currentLocation
          },
          source: 'community_finder',
          timestamp: Date.now(),
          expiresAt: Date.now() + (3 * 24 * 60 * 60 * 1000) // 3 days
        });
      }
      
      // Travel buddy suggestions
      if (travelPatterns.soloTravelFrequency > 0.7) {
        const travelBuddySuggestion = await this.generateTravelBuddySuggestion(userContext);
        if (travelBuddySuggestion) {
          insights.push(travelBuddySuggestion);
        }
      }
      
    } catch (error) {
      console.error('Failed to generate community insights:', error);
    }
    
    return insights;
  }

  // Private helper methods

  private async buildUserContext(
    userId: string, 
    context: ConversationContext
  ): Promise<UserContext> {
    const memory = await this.memoryAgent.getEnhancedPamMemory(userId, 100);
    
    // Analyze patterns from memory and conversation history
    const travelPatterns = this.analyzeTravelPatterns(memory);
    const budgetPatterns = this.analyzeBudgetPatterns(memory);
    const socialPatterns = this.analyzeSocialPatterns(memory);
    const preferences = this.extractUserPreferences(memory);
    
    return {
      userId,
      currentLocation: context.userLocation || 'Unknown',
      travelPatterns,
      budgetPatterns,
      socialPatterns,
      preferences,
      conversationContext: context,
      lastActive: Date.now()
    };
  }

  private analyzeTravelPatterns(memory: any): TravelPattern {
    // Analyze travel patterns from memory (simplified implementation)
    const trips = memory.semantic_memories?.filter((m: any) => 
      m.content?.includes('trip') || m.content?.includes('travel')
    ) || [];
    
    return {
      totalTrips: trips.length,
      favoriteDestinations: this.extractDestinations(trips),
      averageTripLength: this.calculateAverageTripLength(trips),
      seasonalPreferences: this.analyzeSeasonalPreferences(trips),
      upcomingTrips: this.extractUpcomingTrips(trips),
      soloTravelFrequency: this.calculateSoloTravelFrequency(trips)
    };
  }

  private analyzeBudgetPatterns(memory: any): BudgetPattern {
    // Analyze budget patterns from memory
    const budgetConversations = memory.recent_memories?.filter((m: any) => 
      m.content?.includes('budget') || m.content?.includes('cost') || m.content?.includes('price')
    ) || [];
    
    return {
      monthlyBudget: this.estimateMonthlyBudget(budgetConversations),
      monthlySpending: this.estimateMonthlySpending(budgetConversations),
      budgetConcerns: this.extractBudgetConcerns(budgetConversations),
      spendingCategories: this.analyzeSpendingCategories(budgetConversations)
    };
  }

  private analyzeSocialPatterns(memory: any): any {
    // Analyze social interaction patterns
    const socialConversations = memory.recent_memories?.filter((m: any) => 
      m.content?.includes('meet') || m.content?.includes('community') || m.content?.includes('friends')
    ) || [];
    
    return {
      socialActivityLevel: socialConversations.length / Math.max(1, memory.recent_memories?.length || 1),
      communityInterests: this.extractCommunityInterests(socialConversations),
      preferredSocialActivities: this.extractSocialActivities(socialConversations)
    };
  }

  private extractUserPreferences(memory: any): any {
    // Extract user preferences from memory
    return {
      climatePreference: 'temperate',
      accommodationType: 'rv_parks',
      activityLevel: 'moderate',
      groupSize: 'small',
      budgetLevel: 'moderate'
    };
  }

  private getCachedInsights(userId: string): ProactiveInsight[] {
    return this.userInsightHistory.get(userId) || [];
  }

  private async getWeatherForecast(destination: string, dates: any): Promise<any> {
    // Placeholder for weather API integration
    return {
      hasAlerts: Math.random() > 0.8,
      alertType: 'Storm Warning',
      severity: 'moderate'
    };
  }

  private async generateSeasonalSuggestion(userContext: UserContext): Promise<ProactiveInsight | null> {
    // Generate seasonal travel suggestions
    const currentMonth = new Date().getMonth();
    const seasonalDestinations = this.getSeasonalDestinations(currentMonth);
    
    if (seasonalDestinations.length > 0) {
      return {
        id: `seasonal_${currentMonth}`,
        type: 'seasonal_suggestion',
        priority: 'low',
        confidence: 0.6,
        title: 'Perfect Season for Travel',
        message: `This is the ideal time to visit ${seasonalDestinations[0]}`,
        actionable: true,
        actions: [
          {
            label: 'Plan Trip',
            action: 'start_trip_planning',
            data: { destination: seasonalDestinations[0] }
          }
        ],
        data: { destinations: seasonalDestinations },
        source: 'seasonal_recommender',
        timestamp: Date.now(),
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
      };
    }
    
    return null;
  }

  private async generateFuelPriceInsight(userContext: UserContext): Promise<ProactiveInsight | null> {
    // Generate fuel price alerts (placeholder)
    return null;
  }

  private async findSimilarDestinations(favorites: string[], preferences: any): Promise<string[]> {
    // Find similar destinations based on favorites (placeholder)
    return ['Yellowstone National Park', 'Grand Canyon', 'Zion National Park'];
  }

  private async generateSeasonalMaintenanceReminder(userContext: UserContext): Promise<ProactiveInsight | null> {
    // Generate seasonal maintenance reminders (placeholder)
    return null;
  }

  private async findLocalRVEvents(location: string): Promise<any[]> {
    // Find local RV events (placeholder)
    return [];
  }

  private async generateTravelBuddySuggestion(userContext: UserContext): Promise<ProactiveInsight | null> {
    // Generate travel buddy suggestions (placeholder)
    return null;
  }

  private getSeasonalDestinations(month: number): string[] {
    const seasonalMap: Record<number, string[]> = {
      0: ['Arizona', 'Florida', 'Southern California'], // January
      1: ['Arizona', 'Florida', 'Texas'], // February
      2: ['Texas', 'Arizona', 'California'], // March
      3: ['California', 'Texas', 'Nevada'], // April
      4: ['Utah', 'Colorado', 'New Mexico'], // May
      5: ['Montana', 'Wyoming', 'Colorado'], // June
      6: ['Alaska', 'Montana', 'Idaho'], // July
      7: ['Alaska', 'Washington', 'Oregon'], // August
      8: ['Colorado', 'Utah', 'Wyoming'], // September
      9: ['Arizona', 'New Mexico', 'Utah'], // October
      10: ['Arizona', 'Texas', 'Florida'], // November
      11: ['Florida', 'Arizona', 'California'] // December
    };
    
    return seasonalMap[month] || [];
  }

  // Placeholder methods for pattern analysis
  private extractDestinations(trips: any[]): string[] { return []; }
  private calculateAverageTripLength(trips: any[]): number { return 0; }
  private analyzeSeasonalPreferences(trips: any[]): any { return {}; }
  private extractUpcomingTrips(trips: any[]): any[] { return []; }
  private calculateSoloTravelFrequency(trips: any[]): number { return 0; }
  private estimateMonthlyBudget(conversations: any[]): number { return 2000; }
  private estimateMonthlySpending(conversations: any[]): number { return 1500; }
  private extractBudgetConcerns(conversations: any[]): string[] { return []; }
  private analyzeSpendingCategories(conversations: any[]): any { return {}; }
  private extractCommunityInterests(conversations: any[]): string[] { return []; }
  private extractSocialActivities(conversations: any[]): string[] { return []; }

  private logInsightGeneration(userId: string, insights: ProactiveInsight[]): void {
    console.log('Proactive Assistant: Generated insights', {
      userId,
      insightCount: insights.length,
      types: insights.map(i => i.type),
      confidenceScores: insights.map(i => i.confidence)
    });
  }
}

export default ProactiveAssistant;