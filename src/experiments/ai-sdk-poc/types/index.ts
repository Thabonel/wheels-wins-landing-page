/**
 * Type definitions for AI SDK POC
 */

import { Message } from 'ai';

export interface PamMessage extends Message {
  timestamp: Date;
  source: 'voice' | 'text';
  processingTime?: number;
  tokenCount?: number;
  model?: string;
}

export interface PamToolResult {
  toolName: string;
  executionTime: number;
  success: boolean;
  result: any;
  error?: string;
}

export interface PamMetrics {
  responseTime: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  model: string;
  tools?: PamToolResult[];
}

export interface WeatherToolParams {
  location: string;
}

export interface SearchWebToolParams {
  query: string;
  maxResults?: number;
}