"""
PAM Tools - Intelligent tools for enhanced conversation
"""
from .load_user_profile import LoadUserProfileTool
from .load_social_context import LoadSocialContextTool
from .load_recent_memory import LoadRecentMemoryTool
from .think import ThinkTool
# google_places_tool removed - Claude discusses locations through conversation
# webscraper_tool removed - Claude handles web research through conversation
# youtube_trip_tool removed - Claude suggests YouTube content through conversation

__all__ = [
    'LoadUserProfileTool',
    'LoadSocialContextTool',
    'LoadRecentMemoryTool', 
    'ThinkTool',
    # 'GooglePlacesTool',  # Removed - Claude discusses locations naturally
    # 'WebscraperTool',  # Removed - Claude handles web research
    # 'YouTubeTripTool',  # Removed - Claude suggests content naturally
    # 'google_places_tool',  # Removed - Claude discusses locations naturally
    # 'webscraper_tool',  # Removed - Claude handles web research
    # 'youtube_trip_tool'  # Removed - Claude suggests content naturally
]