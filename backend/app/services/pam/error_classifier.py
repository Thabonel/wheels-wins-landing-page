"""
PAM Error Classifier

Lightweight, standalone module that maps raw exception messages to user-readable
error categories and messages. Extracted from the dormant error_recovery.py so it
can be used by tool_registry and personalized_pam_agent without importing the full
(and currently unwired) recovery system.

No async, no state - just pure classification functions safe to call anywhere.
"""

from enum import Enum


class ErrorCategory(Enum):
    SERVICE_UNAVAILABLE = "service_unavailable"
    TIMEOUT = "timeout"
    AUTHENTICATION = "authentication"
    RATE_LIMIT = "rate_limit"
    DATA_VALIDATION = "data_validation"
    EXTERNAL_API = "external_api"
    RESOURCE_EXHAUSTION = "resource_exhaustion"
    CONFIGURATION = "configuration"
    DATABASE_UNAVAILABLE = "database_unavailable"
    UNKNOWN = "unknown"


# Keywords matched against the lowercased error string.
# Order matters: more specific checks first.
_CATEGORY_RULES: list[tuple[list[str], ErrorCategory]] = [
    # Database / configuration - highest priority so MockClient removal errors
    # are surfaced clearly rather than falling through to generic categories.
    (["supabase credentials", "database unavailable", "supabase_url", "service_role_key"],
     ErrorCategory.DATABASE_UNAVAILABLE),
    (["connection refused", "service unavailable", "502", "503"],
     ErrorCategory.SERVICE_UNAVAILABLE),
    (["timeout", "timed out", "time out"],
     ErrorCategory.TIMEOUT),
    (["unauthorized", "authentication", "invalid token", "401", "403"],
     ErrorCategory.AUTHENTICATION),
    (["rate limit", "throttled", "quota exceeded", "429"],
     ErrorCategory.RATE_LIMIT),
    (["memory", "disk", "cpu", "resource", "exhausted"],
     ErrorCategory.RESOURCE_EXHAUSTION),
    (["validation", "invalid", "malformed", "parse"],
     ErrorCategory.DATA_VALIDATION),
    # Broad API/HTTP check last so it doesn't swallow more specific matches.
    (["api", "external", "http", "404", "500"],
     ErrorCategory.EXTERNAL_API),
]

# Human-readable messages keyed by category.
# {tool} is substituted with the actual tool name at call time.
_USER_MESSAGES: dict[ErrorCategory, str] = {
    ErrorCategory.DATABASE_UNAVAILABLE: (
        "I can't reach my database right now. This is a configuration issue - "
        "please check that Supabase credentials are set correctly."
    ),
    ErrorCategory.SERVICE_UNAVAILABLE: (
        "{tool} can't reach its backend service right now. "
        "It usually recovers on its own - try again in a minute."
    ),
    ErrorCategory.TIMEOUT: (
        "{tool} took too long to respond. "
        "Try again - it's usually faster on the second attempt."
    ),
    ErrorCategory.AUTHENTICATION: (
        "{tool} has a permissions issue. "
        "This is a system configuration problem, not something you did wrong."
    ),
    ErrorCategory.RATE_LIMIT: (
        "{tool} hit its rate limit. "
        "Wait a moment and try again."
    ),
    ErrorCategory.RESOURCE_EXHAUSTION: (
        "{tool} is under heavy load right now. "
        "Try again in a few minutes."
    ),
    ErrorCategory.DATA_VALIDATION: (
        "{tool} received unexpected data. "
        "If this keeps happening, the request parameters may need adjusting."
    ),
    ErrorCategory.EXTERNAL_API: (
        "{tool} is having trouble connecting to an external service. "
        "Try again shortly."
    ),
    ErrorCategory.CONFIGURATION: (
        "{tool} is missing required configuration. "
        "Check that all API keys and environment variables are set."
    ),
    ErrorCategory.UNKNOWN: (
        "{tool} ran into an unexpected error. "
        "Try again - if it keeps failing, the issue may need investigation."
    ),
}


def classify_error(error_message: str) -> ErrorCategory:
    """Classify a raw error message string into an ErrorCategory.

    Uses keyword matching on the lowercased message. Falls back to UNKNOWN.
    """
    lowered = error_message.lower()
    for keywords, category in _CATEGORY_RULES:
        if any(kw in lowered for kw in keywords):
            return category
    return ErrorCategory.UNKNOWN


def get_user_message(tool_name: str, error_message: str) -> str:
    """Return a human-readable error message for the given tool failure.

    Args:
        tool_name: The tool that failed (e.g. "plan_trip").
        error_message: The raw exception or error string.

    Returns:
        A short, plain-English sentence suitable for display to the user.
    """
    category = classify_error(error_message)
    template = _USER_MESSAGES.get(category, _USER_MESSAGES[ErrorCategory.UNKNOWN])
    return template.format(tool=tool_name)
