/**
 * PAM Hybrid Service - Frontend Integration
 *
 * Cost-optimized AI assistant using:
 * - GPT-4o-mini for simple queries (95% of traffic)
 * - Claude Agent SDK for complex tasks (5% of traffic)
 *
 * Expected cost reduction: 77-90% compared to GPT-5 system
 */

import { logger } from '@/lib/logger';

export interface HybridRequest {
  message: string;
  context?: Record<string, any>;
  voice_input?: boolean;
}

export interface HybridResponse {
  response: string;
  handler: string; // "gpt4o-mini" or "claude-{agent}"
  complexity: 'simple' | 'moderate' | 'complex';
  agent_used: string | null;
  tools_called: string[];
  cost_usd: number;
  latency_ms: number;
  timestamp: string;
}

export interface HybridWebSocketMessage {
  type: 'message' | 'response' | 'error' | 'ping' | 'pong';
  content?: string;
  context?: Record<string, any>;
  voice_input?: boolean;

  // Response fields
  handler?: string;
  complexity?: string;
  agent_used?: string | null;
  tools_called?: string[];
  cost_usd?: number;
  latency_ms?: number;
  timestamp?: string;

  // Error fields
  message?: string;
}

export interface HybridMetrics {
  orchestrator_metrics: Record<string, any>;
  tools_loaded: number;
}

class PamHybridService {
  private baseUrl: string;
  private wsUrl: string;

  constructor() {
    // Use environment variable or default to backend URL
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://pam-backend.onrender.com';
    this.baseUrl = `${apiBase}/api/v1/pam-hybrid`;
    this.wsUrl = apiBase.replace('https://', 'wss://').replace('http://', 'ws://');

    logger.info('PAM Hybrid Service initialized', {
      baseUrl: this.baseUrl,
      wsUrl: this.wsUrl
    });
  }

  /**
   * Send a chat message via REST API
   */
  async sendMessage(
    message: string,
    token: string,
    context?: Record<string, any>
  ): Promise<HybridResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message,
          context: context || {}
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      logger.info('Hybrid chat response received', {
        handler: data.handler,
        complexity: data.complexity,
        latency: data.latency_ms,
        cost: data.cost_usd
      });

      return data;

    } catch (error) {
      logger.error('Hybrid chat request failed', { error });
      throw error;
    }
  }

  /**
   * Create WebSocket connection
   */
  createWebSocket(userId: string, token: string): WebSocket {
    const wsEndpoint = `${this.wsUrl}/api/v1/pam-hybrid/ws/${userId}?token=${encodeURIComponent(token)}`;

    logger.info('Creating hybrid WebSocket connection', { userId, wsEndpoint });

    return new WebSocket(wsEndpoint);
  }

  /**
   * Get system health
   */
  async getHealth(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      logger.error('Hybrid health check failed', { error });
      throw error;
    }
  }

  /**
   * Get system metrics
   */
  async getMetrics(token: string): Promise<HybridMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Metrics request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.metrics;

    } catch (error) {
      logger.error('Hybrid metrics request failed', { error });
      throw error;
    }
  }

  /**
   * Format cost for display
   */
  formatCost(costUsd: number): string {
    if (costUsd < 0.000001) {
      return '<$0.000001';
    }
    return `$${costUsd.toFixed(6)}`;
  }

  /**
   * Get handler display name
   */
  getHandlerDisplayName(handler: string): string {
    if (handler === 'gpt4o-mini') {
      return 'GPT-4o-mini (Simple)';
    }
    if (handler.startsWith('claude-')) {
      const agent = handler.replace('claude-', '');
      return `Claude ${agent.charAt(0).toUpperCase() + agent.slice(1)} Agent`;
    }
    if (handler.includes('fallback')) {
      return 'Fallback Handler';
    }
    return handler;
  }

  /**
   * Get complexity badge color
   */
  getComplexityColor(complexity: string): string {
    switch (complexity) {
      case 'simple':
        return 'green';
      case 'moderate':
        return 'yellow';
      case 'complex':
        return 'orange';
      default:
        return 'gray';
    }
  }
}

// Singleton instance
export const pamHybridService = new PamHybridService();