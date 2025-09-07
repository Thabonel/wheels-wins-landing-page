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
      'sydney', 'hobart', 'melbourne', 'brisbane', 'perth', 'adelaide', 'darwin',
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
   * Generate structured trip planning response
   */
  generateTripPlanningResponse(goal: string, context: Record<string, any>): string {
    const lowerGoal = goal.toLowerCase();
    
    // Sydney to Hobart specific route
    if (lowerGoal.includes('sydney') && lowerGoal.includes('hobart')) {
      return `# 🗺️ Sydney to Hobart Trip Plan

## Route Overview
- **Distance**: ~1,100km (680 miles)
- **Driving Time**: ~13-15 hours
- **Recommended Duration**: 3-4 days with stops

## Key Waypoints

### 1. **Sydney, NSW** (Starting Point)
- Iconic harbor city with Opera House and Bridge
- Stock up on supplies before heading south

### 2. **Goulburn, NSW** (2 hours south)
- Famous "Big Merino" statue
- Good rest stop and fuel up

### 3. **Albury, NSW** (Border Town)
- Murray River crossing point
- Historic border city with good accommodation

### 4. **Melbourne, VIC** (Major Stop)
- Cultural capital - plan overnight stop
- Great food scene and attractions

### 5. **Spirit of Tasmania Ferry**
- **Route**: Melbourne to Devonport (10-11 hours)
- **Booking**: Essential for vehicle + passengers
- **Alternative**: Jetstar flights (2 hours)

### 6. **Launceston, TAS**
- Historic city with Cataract Gorge
- Good stopping point before final push

### 7. **Hobart, TAS** (Destination)
- MONA (Museum of Old and New Art)
- Salamanca Market (Saturdays)
- Mount Wellington views

## Travel Tips
- **Best Time**: October-April (warmer weather)
- **Ferry Booking**: Book well in advance
- **Fuel**: Plan stops - distances are significant
- **Accommodation**: Book ahead, especially in Tasmania

## Budget Estimate
- **Fuel**: ~$200-300
- **Ferry**: ~$500-800 (car + 2 passengers)
- **Accommodation**: ~$150-250/night
- **Food**: ~$100-150/day

Would you like me to help you book any specific parts of this journey or provide more detailed information about any stops?`;
    }
    
    // Generic trip planning response
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
  },

  /**
   * Generate financial planning response
   */
  generateFinancialPlanningResponse(goal: string, context: Record<string, any>): string {
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
  },

  /**
   * Generate generic helpful response
   */
  generateGenericHelpfulResponse(goal: string, context: Record<string, any>): string {
    return `# 🤖 PAM Assistant

I'm here to help! While my advanced planning system is temporarily unavailable, I can still assist you with:

## Available Services:
✅ **Trip Planning** - Routes, stops, and travel advice
✅ **Financial Guidance** - Budgeting and money management
✅ **Social Features** - Connect with friends and community
✅ **Shopping Assistance** - Product recommendations
✅ **General Questions** - Information and guidance

## Your Request:
"${goal}"

Could you provide a bit more detail about what you're looking for? I'll do my best to give you helpful, actionable advice right away!`;
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