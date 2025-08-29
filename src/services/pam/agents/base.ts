/**
 * Base Domain Agent Class
 * Abstract base class for all PAM domain agents
 * Provides common functionality and interface
 */

import { ConversationContext, AgentResponse, Tool, AgentStats } from '../architectureTypes';

export abstract class DomainAgent {
  protected name: string;
  protected description: string;
  protected tools: Map<string, Tool> = new Map();
  protected stats: AgentStats;
  protected initialized: boolean = false;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
    this.stats = {
      totalRequests: 0,
      successRate: 100,
      averageResponseTime: 0,
      toolUsage: {},
      lastActive: new Date(),
    };
  }

  /**
   * Initialize the agent and its tools
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load agent-specific tools
      await this.loadTools();
      
      // Perform any agent-specific initialization
      await this.onInitialize();
      
      this.initialized = true;
      console.log(`✅ ${this.name} agent initialized`);
    } catch (error) {
      console.error(`❌ Failed to initialize ${this.name} agent:`, error);
      throw error;
    }
  }

  /**
   * Process a message in the context of a conversation
   */
  async process(message: string, context: ConversationContext): Promise<AgentResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    this.stats.totalRequests++;
    this.stats.lastActive = new Date();

    try {
      // Analyze the message and context
      const analysis = await this.analyzeRequest(message, context);
      
      // Determine which tools to use
      const requiredTools = await this.selectTools(analysis, context);
      
      // Execute tools if needed
      const toolResults = await this.executeTools(requiredTools, analysis);
      
      // Generate response based on analysis and tool results
      const response = await this.generateResponse(message, context, toolResults);
      
      // Update statistics
      const responseTime = Date.now() - startTime;
      this.updateStats(responseTime, true, requiredTools);
      
      return response;
    } catch (error) {
      console.error(`❌ Error in ${this.name} agent:`, error);
      
      // Update statistics for failure
      const responseTime = Date.now() - startTime;
      this.updateStats(responseTime, false, []);
      
      // Return error response
      return {
        response: `I apologize, but I encountered an error while processing your ${this.name.toLowerCase()} request. Please try again.`,
        confidence: 0,
        toolsUsed: [],
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Register a tool for this agent
   */
  protected registerTool(tool: Tool): void {
    this.tools.set(tool.id, tool);
    if (!this.stats.toolUsage[tool.id]) {
      this.stats.toolUsage[tool.id] = 0;
    }
  }

  /**
   * Execute a set of tools
   */
  protected async executeTools(toolIds: string[], params: any): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    for (const toolId of toolIds) {
      const tool = this.tools.get(toolId);
      if (!tool) {
        console.warn(`Tool ${toolId} not found in ${this.name} agent`);
        continue;
      }
      
      try {
        // Validate parameters if validator exists
        if (tool.validate && !tool.validate(params)) {
          throw new Error(`Invalid parameters for tool ${toolId}`);
        }
        
        // Execute tool
        const result = await tool.execute(params);
        results.set(toolId, result);
        
        // Update tool usage stats
        this.stats.toolUsage[toolId]++;
      } catch (error) {
        console.error(`Error executing tool ${toolId}:`, error);
        results.set(toolId, { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    
    return results;
  }

  /**
   * Update agent statistics
   */
  protected updateStats(responseTime: number, success: boolean, toolsUsed: string[]): void {
    // Update average response time
    const totalTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime;
    this.stats.averageResponseTime = totalTime / this.stats.totalRequests;
    
    // Update success rate
    if (!success) {
      const successCount = (this.stats.successRate / 100) * (this.stats.totalRequests - 1);
      this.stats.successRate = (successCount / this.stats.totalRequests) * 100;
    }
    
    // Update tool usage
    for (const toolId of toolsUsed) {
      if (this.stats.toolUsage[toolId] !== undefined) {
        this.stats.toolUsage[toolId]++;
      }
    }
  }

  /**
   * Get agent statistics
   */
  async getStats(): Promise<AgentStats> {
    return { ...this.stats };
  }

  /**
   * Shutdown the agent and cleanup resources
   */
  async shutdown(): Promise<void> {
    try {
      // Perform agent-specific cleanup
      await this.onShutdown();
      
      // Clear tools
      this.tools.clear();
      
      this.initialized = false;
      console.log(`✅ ${this.name} agent shutdown complete`);
    } catch (error) {
      console.error(`❌ Error shutting down ${this.name} agent:`, error);
    }
  }

  /**
   * Abstract methods to be implemented by specific agents
   */
  protected abstract loadTools(): Promise<void>;
  protected abstract analyzeRequest(message: string, context: ConversationContext): Promise<any>;
  protected abstract selectTools(analysis: any, context: ConversationContext): Promise<string[]>;
  protected abstract generateResponse(
    message: string,
    context: ConversationContext,
    toolResults: Map<string, any>
  ): Promise<AgentResponse>;
  
  /**
   * Optional lifecycle hooks
   */
  protected async onInitialize(): Promise<void> {
    // Override in specific agents if needed
  }
  
  protected async onShutdown(): Promise<void> {
    // Override in specific agents if needed
  }

  /**
   * Get agent name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get agent description
   */
  getDescription(): string {
    return this.description;
  }

  /**
   * Check if agent is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}