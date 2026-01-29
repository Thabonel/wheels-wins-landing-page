"""
Unified Tool Capabilities - Shared enum for all PAM tools
Prevents circular imports and enum conflicts
"""
from enum import Enum


class ToolCapability(Enum):
    """
    Unified enumeration of tool capabilities for registration and discovery
    Used by both base_tool.py and tool_registry.py to prevent conflicts
    """
    # Location and Navigation
    LOCATION_SEARCH = "location_search"
    ROUTE_PLANNING = "route_planning"
    MAP_VISUALIZATION = "map_visualization"
    
    # Weather and Environment
    WEATHER_CHECK = "weather_check"
    WEATHER = "weather"
    
    # Financial and Data
    FINANCIAL_TRACKING = "financial_tracking"
    FINANCIAL = "financial"
    EXPENSE_MANAGEMENT = "expense_management"
    USER_DATA = "user_data"
    DATA_ANALYSIS = "data_analysis"
    
    # Media and Content
    MEDIA_SEARCH = "media_search"
    WEB_SCRAPING = "web_scraping"
    
    # Planning and Management
    TRIP_PLANNING = "trip_planning"
    
    # AI and Computing
    MEMORY = "memory"
    CALCULATION = "calculation"
    EXTERNAL_API = "external_api"

    # Social and Community
    SOCIAL = "social"

    # Shopping and Commerce
    SHOP = "shop"

    # Tool Actions
    ACTION = "action"  # Tools that perform actions (create, update, delete)
    WRITE = "write"    # Tools that write/modify data
    READ = "read"      # Tools that read data


# Compatibility mapping for migration
CAPABILITY_ALIASES = {
    # Old names -> New names
    "weather_check": ToolCapability.WEATHER,
    "financial_tracking": ToolCapability.FINANCIAL,
    "expense_management": ToolCapability.FINANCIAL,
}


def normalize_capability(capability_input) -> ToolCapability:
    """
    Normalize capability input to standard ToolCapability enum
    Handles string inputs and aliases for backward compatibility
    """
    if isinstance(capability_input, ToolCapability):
        return capability_input
    
    if isinstance(capability_input, str):
        # Try direct match first
        for cap in ToolCapability:
            if cap.value == capability_input:
                return cap
        
        # Try aliases
        if capability_input in CAPABILITY_ALIASES:
            return CAPABILITY_ALIASES[capability_input]
        
        # Default fallback
        return ToolCapability.EXTERNAL_API
    
    # Fallback for any other type
    return ToolCapability.EXTERNAL_API