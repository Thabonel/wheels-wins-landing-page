/**
 * PAM Supervisor - Core Orchestration Hub
 * 
 * Based on Microsoft Magentic-One and MakeMyTrip Myra patterns
 * Coordinates domain agents and manages conversation context
 * 
 * Architecture:
 * User → Supervisor → PauterRouter → Domain Agents → MCP Tools
 */

import { DomainAgent } from './agents/base';
import { WheelsAgent } from './agents/WheelsAgent';
import { WinsAgent } from './agents/WinsAgent';
import { SocialAgent } from './agents/SocialAgent';
import { MemoryAgent } from './agents/MemoryAgent';
import { PauterRouterClient } from './router/PauterRouterClient';
import { ConversationContext } from './types';

export interface SupervisorConfig {
  userId: string;
  enableLearning?: boolean;
  maxContextLength?: number;
}

export interface ProcessResult {
  response: string;
  agent: string;
  confidence: number;
  context?: any;
  tools?: string[];
  executionTime?: number;
}

export class PAMSupervisor {
  private agents: Map<string, DomainAgent>;
  private router: PauterRouterClient;
  private context: ConversationContext;
  private config: SupervisorConfig;
  private isInitialized: boolean = false;

  constructor(config: SupervisorConfig) {
    this.config = config;
    this.agents = new Map();
    this.router = new PauterRouterClient();
    this.context = {
      userId: config.userId,
      messages: [],
      userProfile: {},
      sessionId: this.generateSessionId(),
      startTime: new Date(),
    };
  }

  /**
   * Initialize the supervisor with all domain agents
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize domain agents
      const wheelsAgent = new WheelsAgent();
      const winsAgent = new WinsAgent();
      const socialAgent = new SocialAgent();
      const memoryAgent = new MemoryAgent();

      // Register agents
      this.agents.set('wheels', wheelsAgent);
      this.agents.set('wins', winsAgent);
      this.agents.set('social', socialAgent);
      this.agents.set('memory', memoryAgent);

      // Initialize all agents
      await Promise.all([
        wheelsAgent.initialize(),
        winsAgent.initialize(),
        socialAgent.initialize(),
        memoryAgent.initialize(),
      ]);

      // Initialize router
      await this.router.initialize();

      // Load user context from memory agent
      const userContext = await memoryAgent.loadUserContext(this.config.userId);
      if (userContext) {
        this.context.userProfile = userContext;
      }

      this.isInitialized = true;
      console.log('✅ PAM Supervisor initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize PAM Supervisor:', error);
      throw error;
    }
  }

  /**
   * Process a user message through the supervisor pipeline
   */
  async processMessage(message: string): Promise<ProcessResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      // 1. Update context with user message
      this.addToContext('user', message);

      // 2. Classify intent using PauterRouter
      const intent = await this.router.classify(message, this.context);
      console.log('🎯 Intent classified:', intent);

      // 3. Select appropriate agent based on intent
      const agent = this.selectAgent(intent);
      if (!agent) {
        throw new Error(`No agent available for intent: ${intent.category}`);
      }

      // 4. Process with selected agent
      const agentResponse = await agent.process(message, this.context);

      // 5. Update context with agent response
      this.addToContext('assistant', agentResponse.response, {
        agent: intent.category,
        confidence: intent.confidence,
      });

      // 6. Store interaction in memory for learning
      if (this.config.enableLearning) {
        const memoryAgent = this.agents.get('memory') as MemoryAgent;
        await memoryAgent.storeInteraction({
          message,
          response: agentResponse.response,
          intent,
          timestamp: new Date(),
        });
      }

      // 7. Return processed result
      return {
        response: agentResponse.response,
        agent: intent.category,
        confidence: intent.confidence,
        context: agentResponse.context,
        tools: agentResponse.toolsUsed,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('❌ Error processing message:', error);
      
      // Fallback response
      return {
        response: "I apologize, but I'm having trouble processing your request. Could you please rephrase it?",
        agent: 'error',
        confidence: 0,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Select the appropriate agent based on intent classification
   */
  private selectAgent(intent: any): DomainAgent | null {
    const agentMap: Record<string, string> = {
      'trip_planning': 'wheels',
      'route_optimization': 'wheels',
      'campground_search': 'wheels',
      'weather_check': 'wheels',
      'financial_tracking': 'wins',
      'expense_management': 'wins',
      'budget_analysis': 'wins',
      'savings_goals': 'wins',
      'community_interaction': 'social',
      'user_networking': 'social',
      'event_planning': 'social',
      'memory_update': 'memory',
      'preference_setting': 'memory',
      'profile_management': 'memory',
    };

    const agentKey = agentMap[intent.category];
    if (!agentKey) {
      // Default to memory agent for general queries
      return this.agents.get('memory') || null;
    }

    return this.agents.get(agentKey) || null;
  }

  /**
   * Add a message to the conversation context
   */
  private addToContext(role: 'user' | 'assistant', content: string, metadata?: any): void {
    this.context.messages.push({
      role,
      content,
      timestamp: new Date(),
      metadata,
    });

    // Maintain context window size
    if (this.config.maxContextLength && this.context.messages.length > this.config.maxContextLength) {
      // Keep system messages and recent history
      const systemMessages = this.context.messages.filter(m => m.metadata?.isSystem);
      const recentMessages = this.context.messages.slice(-this.config.maxContextLength);
      this.context.messages = [...systemMessages, ...recentMessages];
    }
  }

  /**
   * Get current conversation context
   */
  getContext(): ConversationContext {
    return { ...this.context };
  }

  /**
   * Clear conversation context (start new session)
   */
  clearContext(): void {
    this.context.messages = [];
    this.context.sessionId = this.generateSessionId();
    this.context.startTime = new Date();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `pam_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get agent statistics for monitoring
   */
  async getStatistics(): Promise<any> {
    const stats: any = {
      activeAgents: this.agents.size,
      sessionId: this.context.sessionId,
      messageCount: this.context.messages.length,
      uptime: Date.now() - this.context.startTime.getTime(),
      agents: {},
    };

    for (const [name, agent] of this.agents) {
      stats.agents[name] = await agent.getStats();
    }

    return stats;
  }

  /**
   * Shutdown supervisor and cleanup resources
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down PAM Supervisor...');
    
    // Shutdown all agents
    await Promise.all(
      Array.from(this.agents.values()).map(agent => agent.shutdown())
    );

    // Clear context
    this.clearContext();
    
    // Clear agents
    this.agents.clear();
    
    this.isInitialized = false;
    console.log('✅ PAM Supervisor shutdown complete');
  }
}

export default PAMSupervisor;