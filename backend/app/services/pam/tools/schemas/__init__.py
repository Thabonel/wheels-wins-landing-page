"""
Shared Tool Schemas for PAM

Centralizes function schemas to avoid duplication between tool classes
and the tool registry. Each schema is defined once and imported where needed.
"""

# Universal Extract Tool Schema
UNIVERSAL_EXTRACT_SCHEMA = {
    "name": "universal_extract",
    "description": """
    Extract structured data from any website URL.

    This tool uses AI-powered extraction to automatically:
    - Detect the page type (product, campground, business, article, etc.)
    - Extract relevant structured data based on page type
    - Format output as JSON, markdown, or natural language

    Use this when users want to:
    - Get product prices, reviews, or details
    - Find campground amenities and availability
    - Extract business information
    - Pull data from any webpage
    """.strip(),
    "parameters": {
        "type": "object",
        "properties": {
            "url": {
                "type": "string",
                "description": "The URL to extract data from"
            },
            "intent": {
                "type": "string",
                "description": "What specific information to extract (e.g., 'get the price', 'find amenities')"
            },
            "output_format": {
                "type": "string",
                "enum": ["json", "markdown", "natural_language"],
                "description": "Output format for extracted data",
                "default": "natural_language"
            },
            "expected_type": {
                "type": "string",
                "enum": ["product", "campground", "business", "article", "comparison", "listing"],
                "description": "Expected page type for optimized extraction (optional)"
            }
        },
        "required": ["url"]
    }
}

# Universal Browser Tool Schema
UNIVERSAL_BROWSER_SCHEMA = {
    "name": "universal_browser",
    "description": """
    Interact with any website through browser automation.

    Capabilities:
    - Navigate to URLs
    - Fill forms and input fields
    - Click buttons and links
    - Extract page content
    - Handle multi-step workflows

    Use this when users want to:
    - Fill out reservation forms
    - Complete booking processes
    - Interact with web applications
    - Automate repetitive web tasks
    """.strip(),
    "parameters": {
        "type": "object",
        "properties": {
            "url": {
                "type": "string",
                "description": "URL to navigate to (required for new sessions)"
            },
            "action": {
                "type": "string",
                "enum": ["navigate", "click", "type", "select", "extract", "screenshot", "wait"],
                "description": "Action to perform"
            },
            "selector": {
                "type": "string",
                "description": "CSS selector or element index for the target element"
            },
            "value": {
                "type": "string",
                "description": "Value to type or select"
            },
            "wait_for": {
                "type": "string",
                "description": "Condition to wait for (selector, navigation, network_idle)"
            },
            "timeout_ms": {
                "type": "integer",
                "description": "Timeout in milliseconds",
                "default": 30000
            }
        },
        "required": ["action"]
    }
}

# Universal Action Tool Schema (element-indexed interactions)
UNIVERSAL_ACTION_SCHEMA = {
    "name": "universal_action",
    "description": """
    Interact with any element on the current page using numeric element references.

    Workflow:
    1. navigate to URL
    2. index_page to see available elements with their [N] indices
    3. Use indices to click, type, or interact with elements

    Actions:
    - navigate: Go to a URL
    - index_page: Index visible interactive elements
    - click: Click element by index [N]
    - type: Type text into element by index
    - get_text: Extract text from element
    - scroll: Scroll the page
    - screenshot: Take a screenshot
    """.strip(),
    "parameters": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["navigate", "index_page", "click", "type", "get_text", "scroll", "screenshot", "pause", "resume"],
                "description": "Action to perform"
            },
            "url": {
                "type": "string",
                "description": "URL for navigate action"
            },
            "element_index": {
                "type": "integer",
                "description": "Element index [N] from index_page results"
            },
            "text": {
                "type": "string",
                "description": "Text to type for type action"
            },
            "direction": {
                "type": "string",
                "enum": ["up", "down"],
                "description": "Scroll direction"
            },
            "amount": {
                "type": "integer",
                "description": "Scroll amount in pixels",
                "default": 500
            }
        },
        "required": ["action"]
    }
}

__all__ = [
    "UNIVERSAL_EXTRACT_SCHEMA",
    "UNIVERSAL_BROWSER_SCHEMA",
    "UNIVERSAL_ACTION_SCHEMA",
]
