"""
Tool Prefiltering System for PAM AI Assistant

Intelligent tool filtering to reduce token usage by ~87% by sending only
relevant tools to the AI model based on user message content and context.

Strategy:
1. Core Tools: Always include essential tools (get_time, get_location, etc.)
2. Category Detection: Match keywords to identify intent (budget, trip, social, etc.)
3. Context Awareness: Use current page/location context
4. Recent Usage: Include recently used tools for conversation continuity
5. Max Tools: Limit to 7-10 tools per request

Token Impact:
- Before: 59 tools × 300 tokens = 17,700 tokens per request
- After: 7-10 tools × 300 tokens = 2,100-3,000 tokens per request
- Savings: ~15,000 tokens per request (87% reduction)
"""

import re
from typing import List, Dict, Set, Optional
from collections import deque
from datetime import datetime


class ToolPrefilter:
    """Intelligent tool prefiltering to reduce token usage by 87%"""

    # Core tools that should ALWAYS be included
    CORE_TOOLS = {
        "get_time",
        "get_location",
        "think",
        "load_user_profile",
        "get_user_context",
        "save_user_preference"
    }

    # Keyword patterns for detecting user intent (case-insensitive regex)
    CATEGORY_KEYWORDS = {
        "budget": [
            r'\b(expense|expenses|spend|spending|spent|cost|costs)\b',
            r'\b(budget|budgets|budgeting)\b',
            r'\b(track|tracking|log|logging|record|recording)\b',
            r'\b(money|cash|payment|payments|bill|bills)\b',
            r'\b(income|salary|earnings|revenue)\b',
            r'\b(save|saving|savings)\b',
            r'\b(financial|finance|finances)\b',
            r'\b(utilization|remaining|left|over)\b',
            r'\b(category|categories|categorize)\b',
            r'\b(monthly|weekly|daily)\b'
        ],
        "trip": [
            r'\b(trip|trips|travel|traveling|travelling)\b',
            r'\b(route|routes|routing|navigation)\b',
            r'\b(drive|driving|drove)\b',
            r'\b(plan|planning|itinerary)\b',
            r'\b(waypoint|waypoints|stop|stops|destination)\b',
            r'\b(optimize|optimization|best route)\b',
            r'\b(distance|miles|kilometers|km)\b',
            r'\b(fuel|gas|diesel|cost per mile)\b',
            r'\b(upcoming|scheduled|planned)\b',
            r'\b(map|maps|directions)\b'
        ],
        "social": [
            r'\b(friend|friends|buddy|buddies)\b',
            r'\b(share|sharing|shared)\b',
            r'\b(invite|invitation|inviting)\b',
            r'\b(group|groups|community)\b',
            r'\b(social|socialize|socializing)\b',
            r'\b(profile|profiles|user|users)\b',
            r'\b(message|messages|messaging|chat)\b',
            r'\b(follow|following|follower|followers)\b',
            r'\b(connect|connection|connections)\b',
            r'\b(activity|activities|event|events)\b'
        ],
        "shop": [
            r'\b(shop|shopping|store|stores)\b',
            r'\b(buy|buying|purchase|purchasing)\b',
            r'\b(product|products|item|items)\b',
            r'\b(price|prices|pricing|cost)\b',
            r'\b(deal|deals|discount|discounts|sale|sales)\b',
            r'\b(cart|basket|checkout)\b',
            r'\b(order|orders|ordering)\b',
            r'\b(wishlist|favorites|saved)\b',
            r'\b(nearby|local|close)\b',
            r'\b(recommendation|recommendations|suggest|suggestions)\b'
        ],
        "rv": [
            r'\b(rv|rvs|recreational vehicle|motorhome)\b',
            r'\b(campsite|campsites|campground|campgrounds)\b',
            r'\b(park|parks|parking)\b',
            r'\b(dump station|dump stations|dumping)\b',
            r'\b(amenities|amenity|facilities|facility)\b',
            r'\b(hookup|hookups|electric|electrical|water|sewer)\b',
            r'\b(camping|camp|camper|campers)\b',
            r'\b(site|sites|spot|spots)\b',
            r'\b(reservation|reservations|reserve|book|booking)\b',
            r'\b(rv park|rv parks|rv resort)\b'
        ]
    }

    # Map tool names to categories
    TOOL_CATEGORIES = {
        # Budget tools
        "add_expense": "budget",
        "get_expenses": "budget",
        "update_expense": "budget",
        "delete_expense": "budget",
        "get_budget": "budget",
        "update_budget": "budget",
        "get_budget_utilization": "budget",
        "add_income": "budget",
        "get_income": "budget",
        "get_savings_summary": "budget",
        "get_financial_overview": "budget",
        "categorize_expense": "budget",

        # Trip tools
        "plan_trip": "trip",
        "get_trips": "trip",
        "update_trip": "trip",
        "delete_trip": "trip",
        "optimize_route": "trip",
        "add_waypoint": "trip",
        "get_route_details": "trip",
        "calculate_trip_cost": "trip",
        "get_upcoming_trips": "trip",
        "save_favorite_route": "trip",
        "get_saved_routes": "trip",
        "share_trip": "trip",
        "get_trip_history": "trip",
        "estimate_fuel_cost": "trip",
        "get_traffic_info": "trip",

        # Social tools
        "get_friends": "social",
        "add_friend": "social",
        "remove_friend": "social",
        "share_trip_with_friend": "social",
        "get_shared_trips": "social",
        "invite_friend": "social",
        "get_friend_activity": "social",
        "send_message": "social",
        "get_messages": "social",
        "create_group": "social",

        # Shop tools
        "search_nearby_stores": "shop",
        "get_store_details": "shop",
        "get_product_recommendations": "shop",
        "compare_prices": "shop",
        "add_to_wishlist": "shop",
        "get_wishlist": "shop",
        "get_deals": "shop",
        "save_shopping_preference": "shop",

        # RV tools
        "find_campsite": "rv",
        "get_campsite_details": "rv",
        "check_campsite_availability": "rv",
        "reserve_campsite": "rv",
        "get_rv_parks": "rv",
        "find_dump_stations": "rv",
        "get_rv_amenities": "rv"
    }

    # Context page to category mapping
    CONTEXT_PAGE_CATEGORIES = {
        "/budget": "budget",
        "/expenses": "budget",
        "/income": "budget",
        "/trips": "trip",
        "/trip-planner": "trip",
        "/social": "social",
        "/friends": "social",
        "/shop": "shop",
        "/shopping": "shop",
        "/rv": "rv",
        "/campgrounds": "rv"
    }

    def __init__(self, max_recent_tools: int = 5):
        """
        Initialize tool prefilter

        Args:
            max_recent_tools: Maximum number of recently used tools to track
        """
        self.recent_tools = deque(maxlen=max_recent_tools)
        self.last_filter_stats = {}

    def filter_tools(
        self,
        user_message: str,
        all_tools: List[Dict],
        context: Optional[Dict] = None,
        max_tools: int = 10
    ) -> List[Dict]:
        """
        Filter tools based on relevance to reduce token usage

        Args:
            user_message: User's message text
            all_tools: Complete list of available tool definitions
            context: Optional context dict with keys like 'page', 'location', etc.
            max_tools: Maximum number of tools to return (default: 10)

        Returns:
            List of filtered tool definitions (typically 7-10 tools)
        """
        # Always include core tools
        filtered_tools = []
        tool_names_included = set()

        # 1. Add core tools
        for tool in all_tools:
            tool_name = tool.get("function", {}).get("name", "")
            if tool_name in self.CORE_TOOLS:
                filtered_tools.append(tool)
                tool_names_included.add(tool_name)

        # 2. Detect categories from user message
        detected_categories = self.detect_categories(user_message)

        # 3. Get context category (from current page)
        context_category = self.get_context_category(context)
        if context_category:
            detected_categories.add(context_category)

        # 4. Add tools from detected categories
        for tool in all_tools:
            tool_name = tool.get("function", {}).get("name", "")
            if tool_name in tool_names_included:
                continue

            tool_category = self.TOOL_CATEGORIES.get(tool_name)
            if tool_category in detected_categories:
                filtered_tools.append(tool)
                tool_names_included.add(tool_name)

        # 5. Add recently used tools (for conversation continuity)
        for recent_tool_name in self.recent_tools:
            if recent_tool_name in tool_names_included:
                continue

            for tool in all_tools:
                tool_name = tool.get("function", {}).get("name", "")
                if tool_name == recent_tool_name:
                    filtered_tools.append(tool)
                    tool_names_included.add(tool_name)
                    break

        # 6. Enforce max_tools limit
        if len(filtered_tools) > max_tools:
            # Prioritize: core tools > category tools > recent tools
            core_tools_list = [t for t in filtered_tools
                             if t.get("function", {}).get("name") in self.CORE_TOOLS]

            category_tools_list = [t for t in filtered_tools
                                 if t.get("function", {}).get("name") not in self.CORE_TOOLS]

            # Keep all core tools + as many category tools as fit
            remaining_slots = max_tools - len(core_tools_list)
            filtered_tools = core_tools_list + category_tools_list[:remaining_slots]

        # Store stats for monitoring
        self.last_filter_stats = self.get_filtering_stats(all_tools, filtered_tools)

        return filtered_tools

    def detect_categories(self, user_message: str) -> Set[str]:
        """
        Detect relevant categories from user message using keyword matching

        Args:
            user_message: User's message text

        Returns:
            Set of detected category names
        """
        detected = set()
        message_lower = user_message.lower()

        for category, patterns in self.CATEGORY_KEYWORDS.items():
            for pattern in patterns:
                if re.search(pattern, message_lower, re.IGNORECASE):
                    detected.add(category)
                    break  # No need to check other patterns for this category

        return detected

    def get_context_category(self, context: Optional[Dict]) -> Optional[str]:
        """
        Extract category from current page context

        Args:
            context: Context dict with 'page' key

        Returns:
            Category name or None
        """
        if not context:
            return None

        current_page = context.get("page", "")

        # Check exact matches
        if current_page in self.CONTEXT_PAGE_CATEGORIES:
            return self.CONTEXT_PAGE_CATEGORIES[current_page]

        # Check partial matches (e.g., /budget/overview → budget)
        for page_path, category in self.CONTEXT_PAGE_CATEGORIES.items():
            if current_page.startswith(page_path):
                return category

        return None

    def add_recent_tool(self, tool_name: str):
        """
        Track a recently used tool for conversation continuity

        Args:
            tool_name: Name of the tool that was just used
        """
        # Add to deque (automatically removes oldest if at max capacity)
        self.recent_tools.append(tool_name)

    def get_filtering_stats(self, all_tools: List[Dict], filtered_tools: List[Dict]) -> Dict:
        """
        Calculate filtering statistics for monitoring

        Args:
            all_tools: Complete tool list
            filtered_tools: Filtered tool list

        Returns:
            Dict with stats like reduction percentage, token savings, etc.
        """
        total_tools = len(all_tools)
        filtered_count = len(filtered_tools)

        # Estimate tokens (average 300 tokens per tool definition)
        TOKENS_PER_TOOL = 300
        tokens_before = total_tools * TOKENS_PER_TOOL
        tokens_after = filtered_count * TOKENS_PER_TOOL
        tokens_saved = tokens_before - tokens_after

        reduction_pct = (tokens_saved / tokens_before * 100) if tokens_before > 0 else 0

        return {
            "total_tools": total_tools,
            "filtered_tools": filtered_count,
            "tools_removed": total_tools - filtered_count,
            "reduction_percentage": round(reduction_pct, 2),
            "tokens_before": tokens_before,
            "tokens_after": tokens_after,
            "tokens_saved": tokens_saved,
            "timestamp": datetime.utcnow().isoformat()
        }

    def get_last_stats(self) -> Dict:
        """Get statistics from the last filtering operation"""
        return self.last_filter_stats


# Global instance (singleton pattern)
tool_prefilter = ToolPrefilter()
