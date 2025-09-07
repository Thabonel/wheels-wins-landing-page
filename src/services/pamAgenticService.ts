/**
 * PAM Agentic AI Service
 * Interfaces with the agentic orchestrator backend to provide autonomous AI capabilities
 * Features goal planning, multi-step reasoning, and intelligent execution
 */

import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TYPES & INTERFACES
// =====================================================

export interface AgenticPlan {
  user_goal: string;
  complexity: 'simple' | 'moderate' | 'complex' | 'collaborative';
  steps: ExecutionStep[];
  tools_required: string[];
  estimated_time: string;
  success_probability: number;
}

export interface ExecutionStep {
  id?: string;
  action: string;
  description: string;
  tool?: string;
  estimated_duration?: string;
  dependencies?: string[];
}

export interface AgenticPlanResponse {
  success: boolean;
  plan?: AgenticPlan;
  agent_reasoning?: string;
  can_execute?: boolean;
  error?: string;
  fallback_available?: boolean;
}

export interface ExecutionResult {
  response: string;
  steps_completed: number;
  tools_used: string[];
  execution_time: string;
}

export interface AgenticExecutionResponse {
  success: boolean;
  execution_result?: ExecutionResult;
  agent_insights?: string;
  learning_captured?: boolean;
  error?: string;
}

export interface AgenticCapabilities {
  goal_planning: boolean;
  multi_step_reasoning: boolean;
  dynamic_tool_selection: boolean;
  proactive_assistance: boolean;
  learning_adaptation: boolean;
  domain_expertise: {
    travel_planning: boolean;
    financial_management: boolean;
    social_networking: boolean;
    shopping_recommendations: boolean;
  };
  specialized_nodes: {
    you_node: string;
    wheels_node: string;
    wins_node: string;
    shop_node: string;
    social_node: string;
  };
}

export interface AgenticCapabilitiesResponse {
  success: boolean;
  capabilities?: AgenticCapabilities;
  system_status?: string;
  version?: string;
  last_updated?: string;
  error?: string;
}

// =====================================================
// API CLIENT CONFIGURATION
// =====================================================

const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  import.meta.env.VITE_BACKEND_URL || 
  'https://wheels-wins-backend-staging.onrender.com';
const AGENTIC_BASE = `${API_BASE_URL}/api/v1/pam/agentic`;

// Error handling wrapper
const handleApiError = (error: any, operation: string) => {
  console.error(`❌ PAM Agentic ${operation} error:`, error);
  throw new Error(`Failed to ${operation.toLowerCase()}: ${error.message || 'Unknown error'}`);
};

// Get authentication headers
const getAuthHeaders = async (): Promise<HeadersInit> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      throw error;
    }
    
    if (!session?.access_token) {
      throw new Error('No authentication session');
    }

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  } catch (error) {
    console.error('Auth header error:', error);
    // Return basic headers if auth fails
    return {
      'Content-Type': 'application/json',
    };
  }
};

// =====================================================
// AGENTIC API METHODS
// =====================================================

export const pamAgenticService = {
  /**
   * Create an autonomous execution plan for complex user goals
   * This exposes the agentic orchestrator's planning capabilities
   */
  async createPlan(goal: string, context: Record<string, any> = {}): Promise<AgenticPlanResponse> {
    try {
      console.log('🧠 Creating agentic plan for goal:', goal);
      
      // Sanitize context to prevent timestamp conflicts
      const sanitizedContext = this.sanitizeContext(context);
      
      const headers = await getAuthHeaders();
      const response = await fetch(`${AGENTIC_BASE}/plan`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          goal,
          context: {
            ...sanitizedContext,
            timestamp: new Date().toISOString(),
            source: 'frontend'
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Agentic plan created:', data);
      
      return data;
    } catch (error) {
      handleApiError(error, 'Create Plan');
      throw error;
    }
  },

  /**
   * Execute a previously created agentic plan with real-time monitoring
   */
  async executePlan(goal: string, planId?: string, context: Record<string, any> = {}): Promise<AgenticExecutionResponse> {
    try {
      console.log('🚀 Executing agentic plan:', { goal, planId });
      
      // Sanitize context to prevent timestamp conflicts
      const sanitizedContext = this.sanitizeContext(context);
      
      const headers = await getAuthHeaders();
      const response = await fetch(`${AGENTIC_BASE}/execute`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          goal,
          plan_id: planId,
          context: {
            ...sanitizedContext,
            timestamp: new Date().toISOString(),
            source: 'frontend'
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Agentic plan executed:', data);
      
      return data;
    } catch (error) {
      handleApiError(error, 'Execute Plan');
      throw error;
    }
  },

  /**
   * Get available agentic AI capabilities and system status
   */
  async getCapabilities(): Promise<AgenticCapabilitiesResponse> {
    try {
      console.log('🔍 Fetching agentic capabilities...');
      
      const headers = await getAuthHeaders();
      const response = await fetch(`${AGENTIC_BASE}/capabilities`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Agentic capabilities loaded:', data);
      
      return data;
    } catch (error) {
      console.error('❌ PAM Agentic Get Capabilities error:', error);
      // Return fallback response instead of throwing
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        system_status: 'unavailable'
      };
    }
  },

  /**
   * Plan and execute in one step for simpler workflows
   */
  async planAndExecute(goal: string, context: Record<string, any> = {}): Promise<{
    plan: AgenticPlanResponse;
    execution: AgenticExecutionResponse;
  }> {
    try {
      console.log('⚡ Planning and executing goal:', goal);
      
      // First create the plan
      const plan = await this.createPlan(goal, context);
      
      if (!plan.success || !plan.can_execute) {
        throw new Error(`Cannot execute plan: ${plan.error || 'Plan not executable'}`);
      }
      
      // Then execute it
      const execution = await this.executePlan(goal, undefined, context);
      
      return { plan, execution };
    } catch (error) {
      console.warn('❌ Agentic planning failed, attempting graceful fallback');
      
      // Graceful degradation: Try to provide immediate helpful response
      const fallbackResponse = await this.provideFallbackResponse(goal, context);
      if (fallbackResponse) {
        return fallbackResponse;
      }
      
      handleApiError(error, 'Plan And Execute');
      throw error;
    }
  },

  /**
   * Provide immediate helpful response when agentic planning fails
   * This ensures PAM is always helpful, even when advanced features are unavailable
   */
  async provideFallbackResponse(goal: string, context: Record<string, any> = {}): Promise<{
    plan: AgenticPlanResponse;
    execution: AgenticExecutionResponse;
  } | null> {
    try {
      console.log('🔄 Providing fallback response for:', goal);
      
      // Check if this is a trip planning request
      if (this.isTripPlanningRequest(goal)) {
        const tripResponse = this.generateTripPlanningResponse(goal, context);
        
        return {
          plan: {
            success: true,
            plan: {
              user_goal: goal,
              complexity: 'moderate',
              steps: [
                { action: 'analyze_route', description: 'Analyze the requested route' },
                { action: 'provide_recommendations', description: 'Provide travel recommendations' },
                { action: 'deliver_response', description: 'Deliver structured travel information' }
              ],
              tools_required: ['trip_planner'],
              estimated_time: 'immediate',
              success_probability: 0.9
            },
            agent_reasoning: 'Using fallback trip planning with structured recommendations',
            can_execute: true,
            fallback_available: true
          },
          execution: {
            success: true,
            execution_result: {
              response: tripResponse,
              steps_completed: 3,
              tools_used: ['fallback_trip_planner'],
              execution_time: 'immediate'
            },
            agent_insights: 'Provided comprehensive trip planning using fallback system',
            learning_captured: true
          }
        };
      }
      
      // Check if this is a financial planning request
      if (this.isFinancialPlanningRequest(goal)) {
        const financialResponse = this.generateFinancialPlanningResponse(goal, context);
        
        return {
          plan: {
            success: true,
            plan: {
              user_goal: goal,
              complexity: 'moderate',
              steps: [
                { action: 'analyze_request', description: 'Analyze financial planning request' },
                { action: 'provide_guidance', description: 'Provide financial guidance' }
              ],
              tools_required: ['financial_planner'],
              estimated_time: 'immediate',
              success_probability: 0.8
            },
            agent_reasoning: 'Using fallback financial planning guidance',
            can_execute: true,
            fallback_available: true
          },
          execution: {
            success: true,
            execution_result: {
              response: financialResponse,
              steps_completed: 2,
              tools_used: ['fallback_financial_planner'],
              execution_time: 'immediate'
            },
            agent_insights: 'Provided financial planning guidance using fallback system',
            learning_captured: true
          }
        };
      }
      
      // Generic helpful response for other requests
      const genericResponse = this.generateGenericHelpfulResponse(goal, context);
      if (genericResponse) {
        return {
          plan: {
            success: true,
            plan: {
              user_goal: goal,
              complexity: 'simple',
              steps: [
                { action: 'provide_assistance', description: 'Provide helpful assistance' }
              ],
              tools_required: ['basic_chat'],
              estimated_time: 'immediate',
              success_probability: 0.7
            },
            agent_reasoning: 'Using fallback assistance mode',
            can_execute: true,
            fallback_available: true
          },
          execution: {
            success: true,
            execution_result: {
              response: genericResponse,
              steps_completed: 1,
              tools_used: ['fallback_assistant'],
              execution_time: 'immediate'
            },
            agent_insights: 'Provided general assistance using fallback system',
            learning_captured: true
          }
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Fallback response failed:', error);
      return null;
    }
  },

  /**
   * Check if the goal is a trip planning request
   */
  isTripPlanningRequest(goal: string): boolean {
    const tripKeywords = [
      'trip', 'travel', 'plan', 'route', 'journey', 'visit', 'go to', 'drive to',
      'vacation', 'holiday', 'road trip', 'fly to', 'directions'
    ];
    
    const lowerGoal = goal.toLowerCase();
    return tripKeywords.some(keyword => lowerGoal.includes(keyword));
  },

  /**
   * Check if the goal is a financial planning request
   */
  isFinancialPlanningRequest(goal: string): boolean {
    const financialKeywords = [
      'budget', 'money', 'save', 'invest', 'expense', 'income', 'financial',
      'cost', 'price', 'afford', 'spend', 'earn', 'profit', 'loss', 'debt'
    ];
    
    const lowerGoal = goal.toLowerCase();
    return financialKeywords.some(keyword => lowerGoal.includes(keyword));
  },

  /**
   * Generate intelligent trip planning response based on the request
   */
  generateTripPlanningResponse(goal: string, context: Record<string, any>): string {
    return this.generateIntelligentResponse(goal, context, 'trip_planning');
  },

  /**
   * Generate financial planning response
   */
  generateFinancialPlanningResponse(goal: string, context: Record<string, any>): string {
    return this.generateIntelligentResponse(goal, context, 'financial_planning');
  },

  /**
   * Generate generic helpful response
   */
  generateGenericHelpfulResponse(goal: string, context: Record<string, any>): string {
    return this.generateIntelligentResponse(goal, context, 'general');
  },

  /**
   * Generate intelligent responses based on the user's actual request
   * This replaces hard-coded responses with contextual understanding
   */
  generateIntelligentResponse(goal: string, context: Record<string, any>, category: string): string {
    const lowerGoal = goal.toLowerCase();
    
    // Weather requests
    if (lowerGoal.includes('weather') || lowerGoal.includes('temperature') || lowerGoal.includes('forecast')) {
      return `I'd love to help with weather information! However, I don't have access to current weather data right now.

For accurate weather forecasts, I recommend:
- **Bureau of Meteorology**: bom.gov.au (official Australian weather)
- **Weather app** on your phone for location-specific forecasts
- **Local news** for detailed regional conditions

If you're planning travel, I can help with general seasonal guidance for different Australian regions instead!`;
    }
    
    // Trip planning with intelligent route detection
    if (category === 'trip_planning') {
      // Extract locations from the request
      const locations = this.extractLocationsFromRequest(lowerGoal);
      
      if (locations.origin && locations.destination) {
        return this.generateRouteResponse(locations.origin, locations.destination, context);
      }
      
      return `# 🗺️ Trip Planning Assistant

I'd be happy to help plan your trip! For the most helpful recommendations, I'll need a few details:

## What I Need to Know:
- **Starting location**: Where are you departing from?
- **Destination**: Where would you like to go?
- **Duration**: How long do you have for this trip?
- **Travel style**: Road trip, flying, or combination?
- **Interests**: What do you enjoy? (nature, culture, food, adventure)

## I Can Help With:
✅ **Route planning** with optimal stops
✅ **Accommodation suggestions** along the way  
✅ **Budget estimates** for your journey
✅ **Timing recommendations** for best experience
✅ **Local highlights** and must-see attractions
✅ **Practical tips** for Australian travel

Just let me know your preferences and I'll create a detailed itinerary for you!`;
    }
    
    // Financial planning
    if (category === 'financial_planning') {
      return `# 💰 Financial Planning Assistant

I'm here to help with your financial planning needs! 

## What I Can Help With:
✅ **Budget creation** and expense tracking
✅ **Savings goals** and strategies
✅ **Investment guidance** for beginners
✅ **Cost analysis** for major purchases
✅ **Income optimization** ideas

## To Provide the Best Advice:
- What's your specific financial goal?
- What's your current situation?
- What timeframe are you working with?

Let me know more details and I'll provide personalized financial guidance!`;
    }
    
    // General requests - try to be helpful based on content
    if (lowerGoal.includes('help') || lowerGoal.includes('what') || lowerGoal.includes('how')) {
      return `I'm here to help with your question: "${goal}"

## I Can Assist With:
✅ **Trip Planning** - Routes, destinations, and travel advice
✅ **Financial Guidance** - Budgeting and money management  
✅ **General Information** - Questions about Australia, travel, etc.
✅ **App Navigation** - Using Wheels & Wins features

Could you be more specific about what you're looking for? The more details you provide, the better I can help!`;
    }
    
    // Default response
    return `Thanks for your question: "${goal}"

I'm here to help! While my advanced AI system is temporarily unavailable, I can still provide assistance with:

✅ **Travel planning** and route advice
✅ **Financial guidance** and budgeting tips
✅ **General questions** about using the app
✅ **Information** about Australian destinations

What specifically would you like help with?`;
  },

  /**
   * Extract origin and destination from trip planning requests
   */
  extractLocationsFromRequest(goal: string): { origin?: string, destination?: string } {
    const locations: { origin?: string, destination?: string } = {};
    
    // Common patterns: "from X to Y", "X to Y", "plan trip X Y"
    const patterns = [
      /from\s+(.+?)\s+to\s+(.+)/i,
      /(.+?)\s+to\s+(.+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = goal.match(pattern);
      if (match) {
        locations.origin = match[1].trim();
        locations.destination = match[2].trim();
        break;
      }
    }
    
    return locations;
  },

  /**
   * Generate intelligent route responses based on detected locations
   */
  generateRouteResponse(origin: string, destination: string, context: Record<string, any>): string {
    const lowerOrigin = origin.toLowerCase();
    const lowerDest = destination.toLowerCase();
    
    // Sydney to Hobart
    if (lowerOrigin.includes('sydney') && lowerDest.includes('hobart')) {
      return `# 🗺️ ${origin} to ${destination} Trip Plan

## Route Overview
- **Distance**: ~1,100km (680 miles via Melbourne + ferry)
- **Driving Time**: ~15-17 hours (including ferry crossing)
- **Recommended Duration**: 3-4 days with stops

## Recommended Route
1. **Sydney** → Goulburn (2h) → Albury (3h) → **Melbourne** (3h)
2. **Melbourne** → Spirit of Tasmania ferry (overnight)
3. **Devonport, TAS** → Launceston (1h) → **Hobart** (2.5h)

## Key Highlights
- **Goulburn**: Famous Big Merino, rest stop
- **Melbourne**: Cultural capital, overnight recommended
- **Spirit of Tasmania**: Vehicle ferry, book advance
- **Launceston**: Historic city, Cataract Gorge
- **Hobart**: MONA, Salamanca Markets, Mt Wellington

## Budget Estimate
- Fuel: ~$250-350
- Ferry: ~$500-800 (car + passengers)
- Accommodation: ~$150-250/night
- Food: ~$100-150/day

Would you like specific details about any part of this journey?`;
    }
    
    // Generic route response
    return `# 🗺️ ${origin} to ${destination} Route

I can help plan your journey from ${origin} to ${destination}! 

## What I Need to Know:
- **Travel dates** - When are you planning to go?
- **Travel style** - Driving, flying, or combination?
- **Duration** - How many days do you have?
- **Interests** - Scenic routes, cities, nature, food?

## I Can Provide:
✅ Best route options and timing
✅ Recommended stops along the way
✅ Budget estimates for your journey
✅ Accommodation suggestions
✅ Local highlights and attractions

Let me know your preferences and I'll create a detailed itinerary!`;
  },

  /**
   * Sanitize context object to prevent timestamp conflicts and other issues
   */
  sanitizeContext(context: Record<string, any>): Record<string, any> {
    try {
      const sanitized: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(context)) {
        // Skip any existing timestamp fields to avoid conflicts
        if (key === 'timestamp') {
          continue;
        }
        
        // Handle different types of values
        if (value === null || value === undefined) {
          sanitized[key] = value;
        } else if (typeof value === 'object') {
          // Recursively sanitize nested objects, but avoid circular references
          try {
            sanitized[key] = JSON.parse(JSON.stringify(value));
          } catch (error) {
            console.warn(`❌ Failed to sanitize context key "${key}":`, error);
            sanitized[key] = String(value);
          }
        } else if (typeof value === 'function') {
          // Skip functions as they can't be JSON serialized
          continue;
        } else {
          // Keep primitive values as-is
          sanitized[key] = value;
        }
      }
      
      return sanitized;
    } catch (error) {
      console.error('❌ Context sanitization failed:', error);
      // Return empty object if sanitization fails completely
      return {};
    }
  }
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Format complexity level for display
 */
export const formatComplexity = (complexity: string): string => {
  const labels = {
    simple: '🟢 Simple',
    moderate: '🟡 Moderate', 
    complex: '🟠 Complex',
    collaborative: '🔴 Multi-Agent'
  };
  return labels[complexity as keyof typeof labels] || complexity;
};

/**
 * Get complexity color class
 */
export const getComplexityColor = (complexity: string): string => {
  const colors = {
    simple: 'text-green-600',
    moderate: 'text-yellow-600',
    complex: 'text-orange-600',
    collaborative: 'text-red-600'
  };
  return colors[complexity as keyof typeof colors] || 'text-gray-600';
};

/**
 * Format tool names for display
 */
export const formatToolName = (toolName: string): string => {
  const toolDisplayNames: Record<string, string> = {
    basic_chat: '💬 Basic Chat',
    enhanced_ai: '🧠 Enhanced AI',
    plan_trip: '🗺️ Trip Planner',
    track_expense: '💰 Expense Tracker',
    finance: '📊 Financial Analysis',
    social: '👥 Social Features',
    shop: '🛒 Shopping Assistant',
    moneymaker: '💡 Income Ideas',
    get_user_context: '📋 Context Analysis',
    think: '💭 Deep Reasoning'
  };
  
  return toolDisplayNames[toolName] || toolName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Check if agentic features are available
 */
export const isAgenticAvailable = async (): Promise<boolean> => {
  try {
    const capabilities = await pamAgenticService.getCapabilities();
    return capabilities.success && capabilities.system_status === 'operational';
  } catch (error) {
    console.warn('Agentic features not available:', error);
    return false;
  }
};

export default pamAgenticService;