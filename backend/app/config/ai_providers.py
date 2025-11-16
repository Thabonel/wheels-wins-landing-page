"""
Single Source of Truth for AI Provider Configuration

DO NOT change these without verification!
See: /docs/VERIFIED_AI_MODELS.md for full documentation

Last Updated: November 16, 2025
"""

# =============================================================================
# PRIMARY PROVIDER (90% of traffic)
# =============================================================================

ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929"
ANTHROPIC_MAX_TOKENS = 4096
ANTHROPIC_TEMPERATURE = 0.7

# Costs (per 1M tokens)
ANTHROPIC_INPUT_COST = 3.00  # $3 per 1M input tokens
ANTHROPIC_OUTPUT_COST = 15.00  # $15 per 1M output tokens

# =============================================================================
# SECONDARY PROVIDER (10% of traffic - fallback)
# =============================================================================

OPENAI_MODEL = "gpt-5.1-instant"
OPENAI_MAX_COMPLETION_TOKENS = 4096  # Note: NOT max_tokens!
OPENAI_TEMPERATURE = 0.7

# Costs (per 1M tokens)
OPENAI_INPUT_COST = 1.25  # $1.25 per 1M input tokens
OPENAI_OUTPUT_COST = 10.00  # $10 per 1M output tokens

# =============================================================================
# OPTIONAL: GPT-5.1 THINKING (Complex reasoning)
# =============================================================================

OPENAI_THINKING_MODEL = "gpt-5.1-thinking"
OPENAI_THINKING_MAX_COMPLETION_TOKENS = 4096

# =============================================================================
# PROVIDER PRIORITY
# =============================================================================

PROVIDER_PRIORITY = ["anthropic", "openai"]

# =============================================================================
# DISABLE TERTIARY PROVIDER (Unstable)
# =============================================================================

GEMINI_ENABLED = False

# =============================================================================
# DEPRECATED MODELS (Never Use)
# =============================================================================

DEPRECATED_MODELS = [
    # Claude 3.5 variants
    "claude-3-5-sonnet-20241022",
    "claude-3-5-sonnet-20240620",
    "claude-3-5-haiku-20241022",

    # GPT-4 variants
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-3.5-turbo",

    # Gemini variants
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest",
    "gemini-2.0-flash-exp",
]

# =============================================================================
# VALIDATION
# =============================================================================

def validate_model(model: str, provider: str) -> None:
    """
    Validate that a model ID is not deprecated.

    Args:
        model: Model ID to validate
        provider: Provider name (anthropic, openai, gemini)

    Raises:
        ValueError: If model is deprecated
    """
    if model in DEPRECATED_MODELS:
        raise ValueError(
            f"Model {model} is deprecated. "
            f"See /docs/VERIFIED_AI_MODELS.md for current models."
        )

def get_provider_config(provider: str) -> dict:
    """
    Get configuration for a specific provider.

    Args:
        provider: Provider name (anthropic, openai)

    Returns:
        dict: Provider configuration

    Raises:
        ValueError: If provider is unknown or disabled
    """
    if provider == "anthropic":
        return {
            "model": ANTHROPIC_MODEL,
            "max_tokens": ANTHROPIC_MAX_TOKENS,
            "temperature": ANTHROPIC_TEMPERATURE,
            "input_cost": ANTHROPIC_INPUT_COST,
            "output_cost": ANTHROPIC_OUTPUT_COST,
        }
    elif provider == "openai":
        return {
            "model": OPENAI_MODEL,
            "max_completion_tokens": OPENAI_MAX_COMPLETION_TOKENS,
            "temperature": OPENAI_TEMPERATURE,
            "input_cost": OPENAI_INPUT_COST,
            "output_cost": OPENAI_OUTPUT_COST,
        }
    elif provider == "gemini":
        if not GEMINI_ENABLED:
            raise ValueError("Gemini provider is disabled. Use Anthropic or OpenAI.")
        raise ValueError("Gemini provider configuration not available")
    else:
        raise ValueError(f"Unknown provider: {provider}")
