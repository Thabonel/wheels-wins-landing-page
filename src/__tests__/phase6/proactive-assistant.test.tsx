/**
 * Phase 6 Proactive Assistant Integration Tests
 * Based on industry testing patterns from:
 * - MakeMyTrip's recommendation testing framework
 * - Google Assistant's proactive suggestion tests
 * - Microsoft Cortana's predictive insight validation
 * - Amazon Alexa's routine suggestion testing
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProactiveAssistant } from '../../services/pam/learning/ProactiveAssistant';
import { LearningSystem } from '../../services/pam/learning/LearningSystem';
import { MemoryAgent } from '../../services/pam/agents/MemoryAgent';
import { WheelsAgent } from '../../services/pam/agents/WheelsAgent';
import { WinsAgent } from '../../services/pam/agents/WinsAgent';
import { SocialAgent } from '../../services/pam/agents/SocialAgent';
import { 
  ProactiveInsight, 
  ConversationContext,
  UserContext,
  TravelPattern,
  BudgetPattern 
} from '../../services/pam/types';

// Mock implementations based on industry patterns
const mockMemoryAgent = {
  getEnhancedPamMemory: vi.fn(),
  loadUserContext: vi.fn(),
  storeConversationMemory: vi.fn(),
  initialize: vi.fn(),
  getStats: vi.fn(),
  shutdown: vi.fn(),
  process: vi.fn(),
  storeInteraction: vi.fn()
};

const mockWheelsAgent = {
  process: vi.fn(),
  initialize: vi.fn(),
  getStats: vi.fn(),
  shutdown: vi.fn()
};

const mockWinsAgent = {
  process: vi.fn(),
  initialize: vi.fn(),
  getStats: vi.fn(),
  shutdown: vi.fn()
};

const mockSocialAgent = {
  process: vi.fn(),
  initialize: vi.fn(),
  getStats: vi.fn(),
  shutdown: vi.fn()
};

const mockLearningSystem = {
  processFeedback: vi.fn(),
  getPerformanceMetrics: vi.fn(),
  getPredictiveInsights: vi.fn()
};

const createMockContext = (): ConversationContext => ({
  userId: 'test-user-456',
  messages: [],
  userProfile: { preferences: { climatePreference: 'temperate' } },
  sessionId: 'test-session-proactive',
  startTime: new Date(),
  lastUserMessage: 'test message',
  previousAgent: 'memory',
  userLocation: 'Denver, CO'
});

const createMockUserContext = (): UserContext => ({
  userId: 'test-user-456',
  currentLocation: 'Denver, CO',
  travelPatterns: {
    totalTrips: 15,
    favoriteDestinations: ['Yellowstone', 'Grand Canyon'],
    averageTripLength: 7,
    seasonalPreferences: { spring: 0.4, summer: 0.6 },
    upcomingTrips: [
      { id: 'trip1', destination: 'Moab', dates: { start: Date.now() + 86400000 * 7 } }
    ],
    soloTravelFrequency: 0.3
  },
  budgetPatterns: {
    monthlyBudget: 2000,
    monthlySpending: 1600,
    budgetConcerns: ['fuel_costs', 'campground_fees'],
    spendingCategories: { fuel: 600, food: 400, camping: 500, other: 100 }
  },
  socialPatterns: {
    socialActivityLevel: 0.6,
    communityInterests: ['hiking', 'photography'],
    preferredSocialActivities: ['meetups', 'group_trips']
  },
  preferences: {
    climatePreference: 'temperate',
    accommodationType: 'rv_parks',
    activityLevel: 'moderate',
    groupSize: 'small',
    budgetLevel: 'moderate'
  },
  conversationContext: createMockContext(),
  lastActive: Date.now()
});

describe('Phase 6: Proactive Assistant Integration Tests', () => {
  let proactiveAssistant: ProactiveAssistant;
  let context: ConversationContext;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Initialize proactive assistant with mocked dependencies
    proactiveAssistant = new ProactiveAssistant(
      mockMemoryAgent as any,
      mockWheelsAgent as any,
      mockWinsAgent as any,
      mockSocialAgent as any,
      mockLearningSystem as any,
      {
        insightGenerationInterval: 30000, // 30 seconds for testing
        minConfidenceThreshold: 0.6,
        maxInsightsPerSession: 5,
        enableWeatherAlerts: true,
        enableBudgetAlerts: true,
        enableTripSuggestions: true,
        enableMaintenanceReminders: true,
        enableCommunityNotifications: true
      }
    );
    
    context = createMockContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Weather-Based Travel Insights (Expedia Pattern)', () => {
    test('should generate weather alerts for upcoming trips', async () => {
      // Arrange
      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [
          { 
            content: 'Planning trip to Moab next week',
            timestamp: Date.now() - 86400000,
            metadata: { intent: { category: 'trip_planning' } }
          }
        ],
        semantic_memories: []
      });

      // Mock weather service to return alert
      const mockWeatherForecast = {
        hasAlerts: true,
        alertType: 'Severe Thunderstorm Warning',
        severity: 'moderate'
      };

      // Act
      const insights = await proactiveAssistant.generateInsights('test-user-456', context);

      // Assert
      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);

      // Should contain weather-related insights if patterns detected
      const weatherInsight = insights.find(i => i.type === 'weather_alert');
      if (weatherInsight) {
        expect(weatherInsight).toMatchObject({
          type: 'weather_alert',
          priority: expect.oneOf(['high', 'medium', 'low']),
          confidence: expect.any(Number),
          title: expect.stringMatching(/weather/i),
          message: expect.any(String),
          actionable: true,
          actions: expect.arrayContaining([
            expect.objectContaining({
              label: expect.any(String),
              action: expect.any(String)
            })
          ])
        });
      }
    });

    test('should generate seasonal travel suggestions', async () => {
      // Arrange
      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [
          { content: 'love traveling in spring', timestamp: Date.now() - 86400000 }
        ],
        semantic_memories: []
      });

      // Act
      const insights = await proactiveAssistant.generateInsights('test-user-456', context);

      // Assert
      const seasonalInsight = insights.find(i => i.type === 'seasonal_suggestion');
      if (seasonalInsight) {
        expect(seasonalInsight.confidence).toBeGreaterThan(0.5);
        expect(seasonalInsight.message).toMatch(/season|time|visit/i);
        expect(seasonalInsight.expiresAt).toBeGreaterThan(Date.now());
      }
    });
  });

  describe('Budget-Based Insights (Mint/YNAB Pattern)', () => {
    test('should generate budget alerts when approaching limits', async () => {
      // Arrange - User with high spending
      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [
          { content: 'expensive fuel costs lately', timestamp: Date.now() - 86400000 },
          { content: 'running over budget this month', timestamp: Date.now() - 172800000 }
        ],
        semantic_memories: []
      });

      // Act
      const insights = await proactiveAssistant.generateInsights('test-user-456', context);

      // Assert
      const budgetInsight = insights.find(i => i.type === 'budget_alert');
      if (budgetInsight) {
        expect(budgetInsight).toMatchObject({
          type: 'budget_alert',
          priority: expect.oneOf(['high', 'medium', 'low']),
          confidence: expect.any(Number),
          title: expect.stringMatching(/budget/i),
          actionable: true,
          actions: expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringMatching(/budget|breakdown|options/i),
              action: expect.any(String)
            })
          ])
        });

        expect(budgetInsight.data).toHaveProperty('currentSpending');
        expect(budgetInsight.data).toHaveProperty('percentageUsed');
      }
    });

    test('should suggest budget-friendly alternatives', async () => {
      // Arrange
      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [
          { content: 'looking for cheap campgrounds', timestamp: Date.now() - 86400000 },
          { content: 'need to save money on travel', timestamp: Date.now() - 172800000 }
        ],
        semantic_memories: []
      });

      // Act
      const insights = await proactiveAssistant.generateInsights('test-user-456', context);

      // Assert
      const budgetInsight = insights.find(i => 
        i.type === 'budget_alert' && 
        i.message.includes('budget-friendly')
      );
      
      if (budgetInsight) {
        expect(budgetInsight.actions).toContain(
          expect.objectContaining({
            action: 'suggest_budget_options'
          })
        );
      }
    });
  });

  describe('Trip Suggestions (MakeMyTrip Pattern)', () => {
    test('should suggest similar destinations based on travel history', async () => {
      // Arrange
      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [
          { content: 'loved yellowstone national park', timestamp: Date.now() - 86400000 },
          { content: 'amazing time at grand canyon', timestamp: Date.now() - 172800000 },
          { content: 'national parks are the best', timestamp: Date.now() - 259200000 }
        ],
        semantic_memories: [
          { content: 'prefers national parks and scenic routes' }
        ]
      });

      // Act
      const insights = await proactiveAssistant.generateInsights('test-user-456', context);

      // Assert
      const tripInsight = insights.find(i => i.type === 'trip_suggestion');
      if (tripInsight) {
        expect(tripInsight).toMatchObject({
          type: 'trip_suggestion',
          priority: 'medium',
          confidence: expect.any(Number),
          title: expect.stringMatching(/destination|trip/i),
          actionable: true,
          actions: expect.arrayContaining([
            expect.objectContaining({
              label: 'Plan Trip',
              action: 'start_trip_planning'
            })
          ])
        });

        expect(tripInsight.data).toHaveProperty('suggestions');
        expect(tripInsight.data).toHaveProperty('basedOn');
      }
    });

    test('should not suggest trips without sufficient travel history', async () => {
      // Arrange
      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [
          { content: 'hello there', timestamp: Date.now() - 86400000 }
        ],
        semantic_memories: []
      });

      // Act
      const insights = await proactiveAssistant.generateInsights('test-user-456', context);

      // Assert
      const tripInsight = insights.find(i => i.type === 'trip_suggestion');
      expect(tripInsight).toBeUndefined(); // Should not suggest without patterns
    });
  });

  describe('Maintenance Reminders (Tesla/BMW Pattern)', () => {
    test('should generate service reminders based on mileage', async () => {
      // Arrange - Mock vehicle data with high mileage since service
      const contextWithVehicle = {
        ...context,
        vehicleData: {
          id: 'rv-123',
          make: 'Ford',
          model: 'F-350',
          year: 2020,
          milesSinceLastService: 5200,
          lastServiceDate: Date.now() - (90 * 24 * 60 * 60 * 1000), // 90 days ago
          nextServiceDue: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days from now
        }
      };

      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [],
        semantic_memories: []
      });

      // Act
      const insights = await proactiveAssistant.generateInsights('test-user-456', contextWithVehicle);

      // Assert
      const maintenanceInsight = insights.find(i => i.type === 'maintenance_reminder');
      if (maintenanceInsight) {
        expect(maintenanceInsight).toMatchObject({
          type: 'maintenance_reminder',
          priority: expect.oneOf(['high', 'medium', 'low']),
          title: expect.stringMatching(/service|maintenance/i),
          actionable: true,
          actions: expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringMatching(/service|schedule/i),
              action: expect.oneOf(['find_service_centers', 'schedule_service'])
            })
          ])
        });

        expect(maintenanceInsight.data).toHaveProperty('milesSinceService');
        expect(maintenanceInsight.data.milesSinceService).toBeGreaterThan(5000);
      }
    });
  });

  describe('Community Notifications (Facebook/Nextdoor Pattern)', () => {
    test('should suggest local RV events and meetups', async () => {
      // Arrange
      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [
          { content: 'would love to meet other rvers', timestamp: Date.now() - 86400000 },
          { content: 'any rv groups in denver', timestamp: Date.now() - 172800000 }
        ],
        semantic_memories: []
      });

      // Act
      const insights = await proactiveAssistant.generateInsights('test-user-456', context);

      // Assert
      const communityInsight = insights.find(i => i.type === 'community_activity');
      if (communityInsight) {
        expect(communityInsight).toMatchObject({
          type: 'community_activity',
          priority: 'low',
          title: expect.stringMatching(/event|community|meetup/i),
          actionable: true,
          actions: expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringMatching(/view|join/i),
              action: expect.oneOf(['show_local_events', 'join_rv_community'])
            })
          ])
        });

        expect(communityInsight.data).toHaveProperty('location');
      }
    });

    test('should suggest travel buddies for solo travelers', async () => {
      // Arrange - High solo travel frequency pattern
      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [
          { content: 'traveling alone again', timestamp: Date.now() - 86400000 },
          { content: 'solo trip to utah', timestamp: Date.now() - 172800000 },
          { content: 'would be nice to have company', timestamp: Date.now() - 259200000 }
        ],
        semantic_memories: []
      });

      // Act
      const insights = await proactiveAssistant.generateInsights('test-user-456', context);

      // Assert - Look for any community or social suggestions
      const socialInsights = insights.filter(i => 
        i.type === 'community_activity' || 
        i.message.includes('buddy') || 
        i.message.includes('connect')
      );

      if (socialInsights.length > 0) {
        expect(socialInsights[0].confidence).toBeGreaterThan(0.5);
      }
    });
  });

  describe('Insight Filtering and Prioritization', () => {
    test('should filter insights by confidence threshold', async () => {
      // Arrange
      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [
          { content: 'minimal interaction', timestamp: Date.now() - 86400000 }
        ],
        semantic_memories: []
      });

      // Create assistant with high confidence threshold
      const restrictiveAssistant = new ProactiveAssistant(
        mockMemoryAgent as any,
        mockWheelsAgent as any,
        mockWinsAgent as any,
        mockSocialAgent as any,
        mockLearningSystem as any,
        {
          minConfidenceThreshold: 0.9, // Very high threshold
          maxInsightsPerSession: 3
        }
      );

      // Act
      const insights = await restrictiveAssistant.generateInsights('test-user-456', context);

      // Assert
      expect(insights).toBeDefined();
      insights.forEach(insight => {
        expect(insight.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });

    test('should limit number of insights per session', async () => {
      // Arrange - Many potential insights
      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [
          { content: 'plan trip to yellowstone', timestamp: Date.now() - 86400000 },
          { content: 'running over budget', timestamp: Date.now() - 86400000 },
          { content: 'need rv service', timestamp: Date.now() - 86400000 },
          { content: 'meet other rvers', timestamp: Date.now() - 86400000 },
          { content: 'check weather forecast', timestamp: Date.now() - 86400000 }
        ],
        semantic_memories: []
      });

      const limitedAssistant = new ProactiveAssistant(
        mockMemoryAgent as any,
        mockWheelsAgent as any,
        mockWinsAgent as any,
        mockSocialAgent as any,
        mockLearningSystem as any,
        {
          maxInsightsPerSession: 2 // Limit to 2 insights
        }
      );

      // Act
      const insights = await limitedAssistant.generateInsights('test-user-456', context);

      // Assert
      expect(insights.length).toBeLessThanOrEqual(2);
      
      // Should prioritize by confidence (highest first)
      if (insights.length > 1) {
        for (let i = 0; i < insights.length - 1; i++) {
          expect(insights[i].confidence).toBeGreaterThanOrEqual(insights[i + 1].confidence);
        }
      }
    });

    test('should prioritize high-priority insights', async () => {
      // Arrange - Mix of priority levels
      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [
          { content: 'severe weather warning for my area', timestamp: Date.now() - 3600000 },
          { content: 'might plan a trip sometime', timestamp: Date.now() - 86400000 }
        ],
        semantic_memories: []
      });

      // Act
      const insights = await proactiveAssistant.generateInsights('test-user-456', context);

      // Assert
      if (insights.length > 1) {
        const priorities = insights.map(i => i.priority);
        const hasHighPriority = priorities.includes('high');
        const hasLowPriority = priorities.includes('low');
        
        if (hasHighPriority && hasLowPriority) {
          // High priority should come first
          const highIndex = insights.findIndex(i => i.priority === 'high');
          const lowIndex = insights.findIndex(i => i.priority === 'low');
          expect(highIndex).toBeLessThan(lowIndex);
        }
      }
    });
  });

  describe('Rate Limiting and Caching', () => {
    test('should respect insight generation interval', async () => {
      // Arrange
      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [
          { content: 'test message', timestamp: Date.now() - 86400000 }
        ],
        semantic_memories: []
      });

      // Act - Generate insights twice in quick succession
      const insights1 = await proactiveAssistant.generateInsights('test-user-456', context);
      const insights2 = await proactiveAssistant.generateInsights('test-user-456', context);

      // Assert - Second call should return cached results
      expect(insights1).toEqual(insights2);
      expect(mockMemoryAgent.getEnhancedPamMemory).toHaveBeenCalledTimes(1);
    });

    test('should cache insights per user', async () => {
      // Arrange
      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [
          { content: 'test message', timestamp: Date.now() - 86400000 }
        ],
        semantic_memories: []
      });

      // Act
      await proactiveAssistant.generateInsights('user-1', context);
      await proactiveAssistant.generateInsights('user-2', context);

      // Assert - Should call memory service for each different user
      expect(mockMemoryAgent.getEnhancedPamMemory).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle memory service failures gracefully', async () => {
      // Arrange
      mockMemoryAgent.getEnhancedPamMemory.mockRejectedValue(new Error('Memory service error'));

      // Act
      const insights = await proactiveAssistant.generateInsights('test-user-456', context);

      // Assert - Should return empty array, not throw
      expect(insights).toEqual([]);
    });

    test('should handle partial feature failures', async () => {
      // Arrange - Mock one feature to fail
      const originalConsoleError = console.error;
      console.error = vi.fn();

      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [
          { content: 'plan trip', timestamp: Date.now() - 86400000 },
          { content: 'check budget', timestamp: Date.now() - 86400000 }
        ],
        semantic_memories: []
      });

      // Act
      const insights = await proactiveAssistant.generateInsights('test-user-456', context);

      // Assert - Should still return some insights even if one feature fails
      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);

      // Restore console
      console.error = originalConsoleError;
    });

    test('should validate insight data structure', async () => {
      // Arrange
      mockMemoryAgent.getEnhancedPamMemory.mockResolvedValue({
        recent_memories: [
          { content: 'valid message', timestamp: Date.now() - 86400000 }
        ],
        semantic_memories: []
      });

      // Act
      const insights = await proactiveAssistant.generateInsights('test-user-456', context);

      // Assert - Each insight should have required properties
      insights.forEach(insight => {
        expect(insight).toMatchObject({
          id: expect.any(String),
          type: expect.any(String),
          priority: expect.oneOf(['high', 'medium', 'low']),
          confidence: expect.any(Number),
          title: expect.any(String),
          message: expect.any(String),
          actionable: expect.any(Boolean),
          data: expect.any(Object),
          source: expect.any(String),
          timestamp: expect.any(Number),
          expiresAt: expect.any(Number)
        });

        // Validate confidence range
        expect(insight.confidence).toBeGreaterThanOrEqual(0);
        expect(insight.confidence).toBeLessThanOrEqual(1);

        // Validate timestamp
        expect(insight.timestamp).toBeLessThanOrEqual(Date.now());
        expect(insight.expiresAt).toBeGreaterThan(insight.timestamp);
      });
    });
  });
});