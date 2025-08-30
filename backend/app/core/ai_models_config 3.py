"""
Centralized AI Models Configuration
Always uses the latest available models with automatic fallbacks
"""

from typing import List, Dict, Any
from enum import Enum
from datetime import datetime

class ModelPurpose(Enum):
    """Different purposes for model selection"""
    GENERAL = "general"           # General conversation
    COMPLEX = "complex"           # Complex reasoning, trip planning
    QUICK = "quick"              # Quick responses, simple tasks
    ANALYSIS = "analysis"        # Data analysis, insights
    EMOTIONAL = "emotional"      # Emotional intelligence, empathy
    FUNCTION_CALL = "function"   # Function calling, tool use
    VISION = "vision"           # Image analysis
    EMBEDDING = "embedding"     # Text embeddings

class OpenAIModels:
    """
    Centralized OpenAI model configuration
    Updated: January 2025
    """
    
    # Latest models as of January 2025
    # These will be updated as OpenAI releases new models
    LATEST_MODELS = {
        # GPT-4 Omni series (multimodal, faster, cheaper)
        "gpt-4o": {
            "name": "gpt-4o",
            "context": 128000,
            "max_output": 16384,
            "supports_vision": True,
            "supports_functions": True,
            "cost_per_1k_input": 0.0025,
            "cost_per_1k_output": 0.01,
            "released": "2024-05"
        },
        "gpt-4o-mini": {
            "name": "gpt-4o-mini",
            "context": 128000,
            "max_output": 16384,
            "supports_vision": True,
            "supports_functions": True,
            "cost_per_1k_input": 0.00015,
            "cost_per_1k_output": 0.0006,
            "released": "2024-07"
        },
        # GPT-4 Turbo series
        "gpt-4-turbo": {
            "name": "gpt-4-turbo",
            "context": 128000,
            "max_output": 4096,
            "supports_vision": True,
            "supports_functions": True,
            "cost_per_1k_input": 0.01,
            "cost_per_1k_output": 0.03,
            "released": "2024-01"
        },
        "gpt-4-turbo-preview": {
            "name": "gpt-4-turbo-preview",
            "context": 128000,
            "max_output": 4096,
            "supports_vision": False,
            "supports_functions": True,
            "cost_per_1k_input": 0.01,
            "cost_per_1k_output": 0.03,
            "released": "2023-11"
        },
        # GPT-3.5 Turbo (fast, cheap)
        "gpt-3.5-turbo": {
            "name": "gpt-3.5-turbo",
            "context": 16385,
            "max_output": 4096,
            "supports_vision": False,
            "supports_functions": True,
            "cost_per_1k_input": 0.0005,
            "cost_per_1k_output": 0.0015,
            "released": "2023-06"
        }
    }
    
    # Model selection by purpose (in priority order)
    MODEL_SELECTION = {
        ModelPurpose.GENERAL: [
            "gpt-4o",           # Best overall model
            "gpt-4o-mini",      # Faster, cheaper alternative
            "gpt-4-turbo",      # Fallback
            "gpt-3.5-turbo"     # Emergency fallback
        ],
        ModelPurpose.COMPLEX: [
            "gpt-4o",           # Best for complex reasoning
            "gpt-4-turbo",      # Good alternative
            "gpt-4-turbo-preview",
            "gpt-4o-mini"       # Last resort
        ],
        ModelPurpose.QUICK: [
            "gpt-4o-mini",      # Fast and cheap
            "gpt-3.5-turbo",    # Even cheaper
            "gpt-4o"            # If others fail
        ],
        ModelPurpose.ANALYSIS: [
            "gpt-4o",           # Best for analysis
            "gpt-4-turbo",
            "gpt-4o-mini"
        ],
        ModelPurpose.EMOTIONAL: [
            "gpt-4o",           # Best emotional intelligence
            "gpt-4-turbo",
            "gpt-4o-mini"
        ],
        ModelPurpose.FUNCTION_CALL: [
            "gpt-4o",           # Best function calling
            "gpt-4o-mini",      # Good and cheap
            "gpt-4-turbo",
            "gpt-3.5-turbo"
        ],
        ModelPurpose.VISION: [
            "gpt-4o",           # Best vision model
            "gpt-4o-mini",      # Cheaper vision
            "gpt-4-turbo"       # Also supports vision
        ],
        ModelPurpose.EMBEDDING: [
            "text-embedding-3-large",
            "text-embedding-3-small",
            "text-embedding-ada-002"
        ]
    }
    
    @classmethod
    def get_model(cls, purpose: ModelPurpose = ModelPurpose.GENERAL, 
                  fallback_index: int = 0) -> str:
        """
        Get the appropriate model for a purpose
        
        Args:
            purpose: The purpose of the model usage
            fallback_index: Index in the fallback chain (0 = primary, 1 = first fallback, etc.)
        
        Returns:
            Model name string
        """
        models = cls.MODEL_SELECTION.get(purpose, cls.MODEL_SELECTION[ModelPurpose.GENERAL])
        
        if fallback_index >= len(models):
            # If we've exhausted all fallbacks, use the emergency model
            return "gpt-3.5-turbo"
        
        return models[fallback_index]
    
    @classmethod
    def get_model_info(cls, model_name: str) -> Dict[str, Any]:
        """Get detailed information about a model"""
        return cls.LATEST_MODELS.get(model_name, cls.LATEST_MODELS["gpt-4o"])
    
    @classmethod
    def get_default_model(cls) -> str:
        """Get the default model (latest and best)"""
        return "gpt-4o"
    
    @classmethod
    def get_fallback_chain(cls, purpose: ModelPurpose = ModelPurpose.GENERAL) -> List[str]:
        """Get the complete fallback chain for a purpose"""
        return cls.MODEL_SELECTION.get(purpose, cls.MODEL_SELECTION[ModelPurpose.GENERAL])
    
    @classmethod
    def estimate_cost(cls, model_name: str, input_tokens: int, output_tokens: int) -> float:
        """Estimate cost for a model usage"""
        model_info = cls.get_model_info(model_name)
        input_cost = (input_tokens / 1000) * model_info["cost_per_1k_input"]
        output_cost = (output_tokens / 1000) * model_info["cost_per_1k_output"]
        return input_cost + output_cost
    
    @classmethod
    def select_model_by_context_size(cls, required_context: int, 
                                     purpose: ModelPurpose = ModelPurpose.GENERAL) -> str:
        """Select a model based on required context size"""
        models = cls.get_fallback_chain(purpose)
        
        for model in models:
            model_info = cls.get_model_info(model)
            if model_info["context"] >= required_context:
                return model
        
        # If no model has enough context, return the one with largest context
        return max(models, key=lambda m: cls.get_model_info(m)["context"])
    
    @classmethod
    def supports_vision(cls, model_name: str) -> bool:
        """Check if a model supports vision/image inputs"""
        model_info = cls.get_model_info(model_name)
        return model_info.get("supports_vision", False)
    
    @classmethod
    def supports_functions(cls, model_name: str) -> bool:
        """Check if a model supports function calling"""
        model_info = cls.get_model_info(model_name)
        return model_info.get("supports_functions", False)


# Export convenience functions
def get_latest_model(purpose: ModelPurpose = ModelPurpose.GENERAL) -> str:
    """Get the latest model for a specific purpose"""
    return OpenAIModels.get_model(purpose)

def get_model_with_fallbacks(purpose: ModelPurpose = ModelPurpose.GENERAL) -> List[str]:
    """Get a list of models with fallbacks for a purpose"""
    return OpenAIModels.get_fallback_chain(purpose)

def get_cheap_model() -> str:
    """Get the cheapest available model for quick tasks"""
    return OpenAIModels.get_model(ModelPurpose.QUICK)

def get_smart_model() -> str:
    """Get the smartest available model for complex tasks"""
    return OpenAIModels.get_model(ModelPurpose.COMPLEX)

# Default model for backward compatibility
DEFAULT_MODEL = OpenAIModels.get_default_model()
FALLBACK_MODELS = OpenAIModels.get_fallback_chain(ModelPurpose.GENERAL)