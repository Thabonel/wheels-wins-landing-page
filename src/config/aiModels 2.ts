/**
 * Centralized AI Models Configuration for Frontend
 * Always uses the latest available models with automatic fallbacks
 */

export enum ModelPurpose {
  GENERAL = 'general',           // General conversation
  COMPLEX = 'complex',           // Complex reasoning, trip planning
  QUICK = 'quick',              // Quick responses, simple tasks
  ANALYSIS = 'analysis',        // Data analysis, insights
  EMOTIONAL = 'emotional',      // Emotional intelligence, empathy
  FUNCTION_CALL = 'function',   // Function calling, tool use
  VISION = 'vision',           // Image analysis
  EMBEDDING = 'embedding'      // Text embeddings
}

export interface ModelInfo {
  name: string;
  context: number;
  maxOutput: number;
  supportsVision: boolean;
  supportsFunctions: boolean;
  costPer1kInput: number;
  costPer1kOutput: number;
  released: string;
}

export class OpenAIModels {
  /**
   * Latest models as of January 2025
   * These will be updated as OpenAI releases new models
   */
  static readonly LATEST_MODELS: Record<string, ModelInfo> = {
    // GPT-4 Omni series (multimodal, faster, cheaper)
    'gpt-4o': {
      name: 'gpt-4o',
      context: 128000,
      maxOutput: 16384,
      supportsVision: true,
      supportsFunctions: true,
      costPer1kInput: 0.0025,
      costPer1kOutput: 0.01,
      released: '2024-05'
    },
    'gpt-4o-mini': {
      name: 'gpt-4o-mini',
      context: 128000,
      maxOutput: 16384,
      supportsVision: true,
      supportsFunctions: true,
      costPer1kInput: 0.00015,
      costPer1kOutput: 0.0006,
      released: '2024-07'
    },
    // GPT-4 Turbo series
    'gpt-4-turbo': {
      name: 'gpt-4-turbo',
      context: 128000,
      maxOutput: 4096,
      supportsVision: true,
      supportsFunctions: true,
      costPer1kInput: 0.01,
      costPer1kOutput: 0.03,
      released: '2024-01'
    },
    'gpt-4-turbo-preview': {
      name: 'gpt-4-turbo-preview',
      context: 128000,
      maxOutput: 4096,
      supportsVision: false,
      supportsFunctions: true,
      costPer1kInput: 0.01,
      costPer1kOutput: 0.03,
      released: '2023-11'
    },
    // GPT-3.5 Turbo (fast, cheap)
    'gpt-3.5-turbo': {
      name: 'gpt-3.5-turbo',
      context: 16385,
      maxOutput: 4096,
      supportsVision: false,
      supportsFunctions: true,
      costPer1kInput: 0.0005,
      costPer1kOutput: 0.0015,
      released: '2023-06'
    }
  };

  /**
   * Model selection by purpose (in priority order)
   */
  static readonly MODEL_SELECTION: Record<ModelPurpose, string[]> = {
    [ModelPurpose.GENERAL]: [
      'gpt-4o',           // Best overall model
      'gpt-4o-mini',      // Faster, cheaper alternative
      'gpt-4-turbo',      // Fallback
      'gpt-3.5-turbo'     // Emergency fallback
    ],
    [ModelPurpose.COMPLEX]: [
      'gpt-4o',           // Best for complex reasoning
      'gpt-4-turbo',      // Good alternative
      'gpt-4-turbo-preview',
      'gpt-4o-mini'       // Last resort
    ],
    [ModelPurpose.QUICK]: [
      'gpt-4o-mini',      // Fast and cheap
      'gpt-3.5-turbo',    // Even cheaper
      'gpt-4o'            // If others fail
    ],
    [ModelPurpose.ANALYSIS]: [
      'gpt-4o',           // Best for analysis
      'gpt-4-turbo',
      'gpt-4o-mini'
    ],
    [ModelPurpose.EMOTIONAL]: [
      'gpt-4o',           // Best emotional intelligence
      'gpt-4-turbo',
      'gpt-4o-mini'
    ],
    [ModelPurpose.FUNCTION_CALL]: [
      'gpt-4o',           // Best function calling
      'gpt-4o-mini',      // Good and cheap
      'gpt-4-turbo',
      'gpt-3.5-turbo'
    ],
    [ModelPurpose.VISION]: [
      'gpt-4o',           // Best vision model
      'gpt-4o-mini',      // Cheaper vision
      'gpt-4-turbo'       // Also supports vision
    ],
    [ModelPurpose.EMBEDDING]: [
      'text-embedding-3-large',
      'text-embedding-3-small',
      'text-embedding-ada-002'
    ]
  };

  /**
   * Get the appropriate model for a purpose
   */
  static getModel(purpose: ModelPurpose = ModelPurpose.GENERAL, fallbackIndex: number = 0): string {
    const models = this.MODEL_SELECTION[purpose] || this.MODEL_SELECTION[ModelPurpose.GENERAL];
    
    if (fallbackIndex >= models.length) {
      // If we've exhausted all fallbacks, use the emergency model
      return 'gpt-3.5-turbo';
    }
    
    return models[fallbackIndex];
  }

  /**
   * Get detailed information about a model
   */
  static getModelInfo(modelName: string): ModelInfo {
    return this.LATEST_MODELS[modelName] || this.LATEST_MODELS['gpt-4o'];
  }

  /**
   * Get the default model (latest and best)
   */
  static getDefaultModel(): string {
    return 'gpt-4o';
  }

  /**
   * Get the complete fallback chain for a purpose
   */
  static getFallbackChain(purpose: ModelPurpose = ModelPurpose.GENERAL): string[] {
    return this.MODEL_SELECTION[purpose] || this.MODEL_SELECTION[ModelPurpose.GENERAL];
  }

  /**
   * Estimate cost for a model usage
   */
  static estimateCost(modelName: string, inputTokens: number, outputTokens: number): number {
    const modelInfo = this.getModelInfo(modelName);
    const inputCost = (inputTokens / 1000) * modelInfo.costPer1kInput;
    const outputCost = (outputTokens / 1000) * modelInfo.costPer1kOutput;
    return inputCost + outputCost;
  }

  /**
   * Select a model based on required context size
   */
  static selectModelByContextSize(requiredContext: number, purpose: ModelPurpose = ModelPurpose.GENERAL): string {
    const models = this.getFallbackChain(purpose);
    
    for (const model of models) {
      const modelInfo = this.getModelInfo(model);
      if (modelInfo.context >= requiredContext) {
        return model;
      }
    }
    
    // If no model has enough context, return the one with largest context
    return models.reduce((best, current) => {
      const bestInfo = this.getModelInfo(best);
      const currentInfo = this.getModelInfo(current);
      return currentInfo.context > bestInfo.context ? current : best;
    }, models[0]);
  }

  /**
   * Check if a model supports vision/image inputs
   */
  static supportsVision(modelName: string): boolean {
    const modelInfo = this.getModelInfo(modelName);
    return modelInfo.supportsVision;
  }

  /**
   * Check if a model supports function calling
   */
  static supportsFunctions(modelName: string): boolean {
    const modelInfo = this.getModelInfo(modelName);
    return modelInfo.supportsFunctions;
  }
}

// Export convenience functions
export function getLatestModel(purpose: ModelPurpose = ModelPurpose.GENERAL): string {
  return OpenAIModels.getModel(purpose);
}

export function getModelWithFallbacks(purpose: ModelPurpose = ModelPurpose.GENERAL): string[] {
  return OpenAIModels.getFallbackChain(purpose);
}

export function getCheapModel(): string {
  return OpenAIModels.getModel(ModelPurpose.QUICK);
}

export function getSmartModel(): string {
  return OpenAIModels.getModel(ModelPurpose.COMPLEX);
}

// Default model for backward compatibility
export const DEFAULT_MODEL = OpenAIModels.getDefaultModel();
export const FALLBACK_MODELS = OpenAIModels.getFallbackChain(ModelPurpose.GENERAL);

// Environment variable override (if needed)
export function getConfiguredModel(): string {
  // Check if there's an environment variable override
  const envModel = import.meta.env.VITE_OPENAI_MODEL;
  if (envModel && OpenAIModels.LATEST_MODELS[envModel]) {
    return envModel;
  }
  return DEFAULT_MODEL;
}