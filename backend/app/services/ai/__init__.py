"""
AI Services Module - Multi-Provider Strategy with Intelligent Failover
Supports OpenAI, Anthropic Claude, and future providers with automatic fallback
"""

# Safe imports with fallback handling
try:
    from .ai_orchestrator import ai_orchestrator, AIOrchestrator, AIMessage, AIResponse, AICapability
    from .provider_interface import AIProviderInterface, ProviderConfig, AIProviderStatus
    
    # Import providers with safe handling
    try:
        from .openai_provider import OpenAIProvider
    except ImportError:
        OpenAIProvider = None
    
    try:
        from .anthropic_provider import AnthropicProvider
    except ImportError:
        AnthropicProvider = None
    
    __all__ = [
        "ai_orchestrator",
        "AIOrchestrator",
        "AIMessage",
        "AIResponse", 
        "AICapability",
        "AIProviderInterface",
        "ProviderConfig",
        "AIProviderStatus",
        "OpenAIProvider",
        "AnthropicProvider"
    ]
    
except ImportError:
    # Fallback to legacy imports if new system not available
    try:
        from .ai_coordinator import AICoordinator
        from .openai_service import OpenAIService
        from .embedding_service import EmbeddingService
        
        # Try to import Claude but don't fail if unavailable
        try:
            from .claude_service import ClaudeService
        except ImportError:
            ClaudeService = None
        
        __all__ = [
            "AICoordinator",
            "ClaudeService", 
            "OpenAIService",
            "EmbeddingService"
        ]
    except ImportError:
        # No AI services available
        __all__ = []