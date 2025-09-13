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
  'https://pam-backend.onrender.com';
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
      
      const headers = await getAuthHeaders();
      const response = await fetch(`${AGENTIC_BASE}/plan`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          goal,
          context: {
            ...context,
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
      
      const headers = await getAuthHeaders();
      const response = await fetch(`${AGENTIC_BASE}/execute`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          goal,
          plan_id: planId,
          context: {
            ...context,
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
      handleApiError(error, 'Plan And Execute');
      throw error;
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