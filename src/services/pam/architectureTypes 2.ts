/**
 * PAM Architecture Type Definitions
 * Core types for the MCP + Supervisor pattern implementation
 */

export interface ConversationContext {
  userId: string;
  sessionId: string;
  messages: ContextMessage[];
  userProfile: UserProfile;
  startTime: Date;
  metadata?: Record<string, any>;
}

export interface ContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    agent?: string;
    confidence?: number;
    isSystem?: boolean;
    tools?: string[];
    [key: string]: any;
  };
}

export interface UserProfile {
  preferences?: UserPreferences;
  tripHistory?: TripRecord[];
  financialProfile?: FinancialProfile;
  socialConnections?: string[];
  lastActive?: Date;
  [key: string]: any;
}

export interface UserPreferences {
  favoriteDestinations?: string[];
  rvType?: string;
  budgetRange?: {
    min: number;
    max: number;
  };
  travelStyle?: string[];
  communicationStyle?: 'casual' | 'formal' | 'friendly';
  [key: string]: any;
}

export interface TripRecord {
  id: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  distance?: number;
  cost?: number;
  rating?: number;
}

export interface FinancialProfile {
  monthlyBudget?: number;
  totalExpenses?: number;
  savingsGoals?: SavingsGoal[];
  expenseCategories?: Record<string, number>;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
}

export interface Intent {
  category: string;
  confidence: number;
  entities?: Record<string, any>;
  subCategory?: string;
  requiresTools?: string[];
}

export interface AgentResponse {
  response: string;
  confidence: number;
  toolsUsed?: string[];
  context?: any;
  suggestions?: string[];
  metadata?: Record<string, any>;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  execute: (params: any) => Promise<any>;
  validate?: (params: any) => boolean;
}

export interface AgentStats {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  toolUsage: Record<string, number>;
  lastActive: Date;
}

export interface MCPToolResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    toolId: string;
    executionTime: number;
    [key: string]: any;
  };
}

export interface RouterClassification {
  intent: Intent;
  confidence: number;
  alternativeIntents?: Intent[];
  reasoning?: string;
}

export interface InteractionRecord {
  message: string;
  response: string;
  intent: Intent;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  feedback?: {
    helpful: boolean;
    rating?: number;
    comment?: string;
  };
}