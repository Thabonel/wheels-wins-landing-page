"""Configuration for PAM Hybrid System"""

import os
from typing import Dict, List
from pydantic_settings import BaseSettings
from pydantic import Field


class HybridConfig(BaseSettings):
    """Configuration for hybrid PAM system"""

    # API Keys
    anthropic_api_key: str = Field(default="", env="ANTHROPIC_API_KEY")
    openai_api_key: str = Field(default="", env="OPENAI_API_KEY")

    # Model Selection
    claude_model: str = "claude-sonnet-4-20250514"  # Claude Sonnet 4
    gpt_model: str = "gpt-4o-mini"  # GPT-4o-mini

    # Cost per 1M tokens (USD)
    claude_input_cost: float = 3.00
    claude_output_cost: float = 15.00
    gpt_input_cost: float = 0.075
    gpt_output_cost: float = 0.30

    # Routing Configuration
    simple_query_threshold: float = 0.7  # Confidence threshold for simple classification
    complex_query_threshold: float = 0.6  # Confidence threshold for complex classification
    default_to_simple: bool = True  # Default to GPT-4o-mini if uncertain

    # Performance Limits
    max_agent_iterations: int = 5
    agent_timeout_seconds: int = 30
    gpt_timeout_seconds: int = 10
    max_tokens_gpt: int = 1000
    max_tokens_claude: int = 4000

    # Caching
    enable_response_cache: bool = True
    cache_ttl_seconds: int = 3600  # 1 hour
    enable_tool_result_cache: bool = True
    tool_cache_ttl_seconds: int = 300  # 5 minutes

    # Monitoring
    enable_metrics: bool = True
    log_all_requests: bool = True
    log_tool_calls: bool = True

    # Graceful Degradation
    enable_fallback: bool = True
    max_retries: int = 3
    retry_delay_seconds: float = 1.0

    # Agent-Specific Settings
    agent_configs: Dict[str, Dict] = {
        "dashboard": {
            "description": "Dashboard overview and quick actions",
            "max_iterations": 3,
            "timeout": 15,
            "tools": ["load_user_profile", "load_recent_memory", "get_dashboard_metrics"]
        },
        "budget": {
            "description": "Financial management and budget optimization",
            "max_iterations": 5,
            "timeout": 30,
            "tools": ["load_expenses", "analyze_budget", "predict_spending", "optimize_budget"]
        },
        "trip": {
            "description": "Travel planning and route optimization",
            "max_iterations": 5,
            "timeout": 30,
            "tools": ["mapbox_tool", "weather_tool", "rv_park_search", "route_optimization"]
        },
        "community": {
            "description": "Social features and content management",
            "max_iterations": 4,
            "timeout": 20,
            "tools": ["load_user_connections", "content_moderation", "post_management"]
        },
        "shop": {
            "description": "E-commerce and product recommendations",
            "max_iterations": 4,
            "timeout": 20,
            "tools": ["product_search", "purchase_history", "recommendations"]
        }
    }

    # Classification Keywords
    simple_query_keywords: List[str] = [
        "what", "when", "where", "who", "how much", "show me",
        "tell me", "what is", "hello", "hi", "thanks", "bye",
        "navigate", "open", "go to", "display", "my balance"
    ]

    complex_query_keywords: List[str] = [
        "plan", "optimize", "analyze", "predict", "calculate",
        "recommend", "compare", "evaluate", "suggest", "create",
        "budget", "forecast", "strategy", "route", "itinerary"
    ]

    domain_keywords: Dict[str, List[str]] = {
        "dashboard": ["overview", "summary", "status", "recent", "activity"],
        "budget": ["expense", "budget", "spending", "money", "cost", "financial"],
        "trip": ["trip", "travel", "route", "rv", "park", "destination", "weather"],
        "community": ["social", "friend", "post", "share", "community", "feed"],
        "shop": ["shop", "buy", "purchase", "product", "order", "store"]
    }

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global config instance
config = HybridConfig()