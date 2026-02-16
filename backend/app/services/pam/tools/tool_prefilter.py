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
import asyncio
import logging
from typing import List, Dict, Set, Optional
from collections import OrderedDict, deque
from datetime import datetime
import signal

logger = logging.getLogger(__name__)


class ToolPrefilter:
    """Intelligent tool prefiltering to reduce token usage by 87%"""

    # Core tools that should ALWAYS be included
    # UPDATED: February 2026 - Added key trip tools to fix filtering issue
    CORE_TOOLS = {
        "analyze_budget",           # Core financial tool
        "get_spending_summary",     # Quick spending overview
        "get_weather_forecast",     # Location-aware weather
        "create_calendar_event",    # Calendar management
        "get_calendar_events",      # Calendar reading (CRITICAL for "what's planned")
        "search_knowledge",         # Knowledge base access
        "create_expense",           # Common expense logging
        # TRIP PLANNING CORE TOOLS (always available for travel queries)
        "plan_trip",                # Primary trip planning tool
        "find_rv_parks",            # RV park search
        "calculate_gas_cost",       # Fuel cost calculations
        # WEB SEARCH (always available as universal fallback)
        "web_search"                # General web search for anything
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
            r'\b(trip|trips|travel|traveling|travelling|trek|trekking)\b',
            r'\b(route|routes|routing|navigation|navigate)\b',
            r'\b(drive|driving|drove|journey|adventure)\b',
            r'\b(plan|planning|itinerary|properly|waypoints?)\b',
            r'\b(stop|stops|destination|destinations|location)\b',
            r'\b(optimize|optimization|best route|milestones?)\b',
            r'\b(distance|miles|kilometers|km|2200km|fuel stops?)\b',
            r'\b(fuel|gas|diesel|cost per mile|vehicle checks?|receipts?)\b',
            r'\b(upcoming|scheduled|planned|bookings?)\b',
            r'\b(map|maps|directions|outback|ranges|rv parks?)\b',
            r'\b(camping|camp|camps|bore|bores)\b',
            r'\b(recommendations?|sightseeing|explore|exploring)\b'
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
            r'\b(recommendation|recommendations|suggest|suggestions)\b',
            r'\b(find|find me|search for|look for|where can i)\b',
            r'\b(cheap|cheapest|affordable|best price|lowest price)\b',
            r'\b(tyre|tyres|tire|tires)\b',
            r'\b(parts|spares|accessories|gear|equipment)\b',
            r'\b(brand|model|size|fit|compatible)\b'
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
        ],
        "medical": [
            r'\b(medical|medicine|medicines|medic)\b',
            r'\b(health|healthy|healthcare)\b',
            r'\b(doctor|doctors|dr|physician|gp)\b',
            r'\b(medication|medications|meds|prescription|prescriptions)\b',
            r'\b(blood|blood type|blood test|bloodwork)\b',
            r'\b(allergy|allergies|allergic)\b',
            r'\b(emergency info|emergency contacts?|ice)\b',
            r'\b(lab results?|test results?|pathology)\b',
            r'\b(diagnosis|diagnosed|condition|conditions)\b',
            r'\b(hospital|clinic|specialist)\b',
            r'\b(refill|dosage|dose|tablet|tablets|pill|pills)\b',
            r'\b(scan|scans|x-ray|xray|mri|ct scan|imaging|ultrasound)\b',
            r'\b(surgery|surgical|operation)\b',
            r'\b(medical documents?|medical records?|health records?)\b',
            r'\b(neck|spine|cervical|lumbar|shoulder)\b',
        ],
        # CRITICAL: Calendar keywords for voice commands like "book an appointment"
        "calendar": [
            r'\b(calendar|calendars)\b',
            r'\b(appointment|appointments)\b',
            r'\b(schedule|scheduling|scheduled)\b',
            r'\b(book|booking|booked)\b',
            r'\b(reminder|reminders|remind)\b',
            r'\b(event|events)\b',
            r'\b(meeting|meetings)\b',
            r'\b(dentist|doctor|checkup|check-up)\b',
            r'\b(tomorrow|next week|next month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b',
            r'\b(add to|put on|set up|create a)\b',
            r'\b(at \d|for \d|\d pm|\d am|\d:)\b',  # Time patterns like "at 3", "for 2pm"
            r'\b(oil change|maintenance|service)\b'
        ]
    }

    # Map tool names to categories
    # UPDATED: December 2025 - Use ACTUAL tool names from pam.py
    TOOL_CATEGORIES = {
        # Budget tools (10 tools from pam.py)
        "create_expense": "budget",
        "track_savings": "budget",
        "analyze_budget": "budget",
        "get_spending_summary": "budget",
        "update_budget": "budget",
        "compare_vs_budget": "budget",
        "predict_end_of_month": "budget",
        "find_savings_opportunities": "budget",
        "categorize_transaction": "budget",
        "export_budget_report": "budget",

        # Trip tools (11 tools from pam.py)
        "plan_trip": "trip",
        "find_rv_parks": "trip",
        "get_weather_forecast": "trip",
        "calculate_gas_cost": "trip",
        "find_cheap_gas": "trip",
        "optimize_route": "trip",
        "get_road_conditions": "trip",
        "find_attractions": "trip",
        "estimate_travel_time": "trip",
        "save_favorite_spot": "trip",
        "update_vehicle_fuel_consumption": "trip",
        "scan_fuel_receipt": "trip",

        # Social tools (10 tools from pam.py)
        "create_post": "social",
        "message_friend": "social",
        "comment_on_post": "social",
        "search_posts": "social",
        "get_feed": "social",
        "like_post": "social",
        "follow_user": "social",
        "share_location": "social",
        "find_nearby_rvers": "social",
        "create_event": "social",

        # Shop tools (5 tools)
        "search_products": "shop",
        "get_product_details": "shop",
        "recommend_products": "shop",
        "compare_prices": "shop",
        "web_search": "shop",  # Worldwide product search

        # Profile tools (6 tools from pam.py)
        "update_profile": "profile",
        "update_settings": "profile",
        "manage_privacy": "profile",
        "get_user_stats": "profile",
        "export_data": "profile",
        "create_vehicle": "profile",

        # Calendar tools (4 tools from pam.py)
        "create_calendar_event": "calendar",
        "update_calendar_event": "calendar",
        "delete_calendar_event": "calendar",
        "get_calendar_events": "calendar",

        # Admin tools (2 tools from pam.py)
        "add_knowledge": "admin",
        "search_knowledge": "admin",

        # Medical tools (4 tools from pam.py)
        "get_medical_records": "medical",
        "search_medical_records": "medical",
        "get_medications": "medical",
        "get_emergency_info": "medical",
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
        "/campgrounds": "rv",
        "/calendar": "calendar",
        "/schedule": "calendar",
        "/appointments": "calendar",
        "/pam_chat": "calendar",  # Voice chat should include calendar tools
        "/medical": "medical",
        "/health": "medical",
    }

    def __init__(self, max_recent_tools: int = 5):
        """
        Initialize tool prefilter

        Args:
            max_recent_tools: Maximum number of recently used tools to track
        """
        self.recent_tools = deque(maxlen=max_recent_tools)
        self.last_filter_stats = {}

        # Thread safety for async operations
        self._lock = asyncio.Lock()

        # Memory management for recent tools per user
        self._user_recent_tools: OrderedDict = OrderedDict()
        self._max_cache_size = 1000  # Max users to track

    def filter_tools(
        self,
        user_message: str,
        all_tools: List[Dict],
        context: Optional[Dict] = None,
        max_tools: int = 15
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

        # DIAGNOSTIC: Log what we're filtering
        logger.info(f"🔍 PREFILTER: Message: {user_message[:100]}...")
        logger.info(f"🔍 PREFILTER: Total tools: {len(all_tools)}")
        logger.info(f"🔍 PREFILTER: CORE_TOOLS: {self.CORE_TOOLS}")

        # 1. Add core tools
        for tool in all_tools:
            # Support both formats: {"function": {"name": "..."}} and {"name": "..."}
            tool_name = tool.get("function", {}).get("name") or tool.get("name", "")
            if tool_name in self.CORE_TOOLS:
                filtered_tools.append(tool)
                tool_names_included.add(tool_name)

        # 2. Detect categories from user message
        detected_categories = self.detect_categories(user_message)
        logger.info(f"🔍 PREFILTER: Detected categories: {detected_categories}")

        # 3. Get context category (from current page)
        context_category = self.get_context_category(context)
        if context_category:
            detected_categories.add(context_category)
            logger.info(f"🔍 PREFILTER: Added context category: {context_category}")

        logger.info(f"🔍 PREFILTER: Final categories: {detected_categories}")

        # 4. Add tools from detected categories (with trip priority)
        # PRIORITY FIX: If trip is detected, prioritize trip tools first
        priority_categories = []
        if "trip" in detected_categories:
            priority_categories.append("trip")
        # Add remaining categories
        for cat in detected_categories:
            if cat not in priority_categories:
                priority_categories.append(cat)

        for category in priority_categories:
            for tool in all_tools:
                # Support both formats: {"function": {"name": "..."}} and {"name": "..."}
                tool_name = tool.get("function", {}).get("name") or tool.get("name", "")
                if tool_name in tool_names_included:
                    continue

                tool_category = self.TOOL_CATEGORIES.get(tool_name)
                if tool_category == category:
                    filtered_tools.append(tool)
                    tool_names_included.add(tool_name)

        # 5. Add recently used tools (for conversation continuity)
        for recent_tool_name in self.recent_tools:
            if recent_tool_name in tool_names_included:
                continue

            for tool in all_tools:
                # Support both formats: {"function": {"name": "..."}} and {"name": "..."}
                tool_name = tool.get("function", {}).get("name") or tool.get("name", "")
                if tool_name == recent_tool_name:
                    filtered_tools.append(tool)
                    tool_names_included.add(tool_name)
                    break

        # 6. Enforce max_tools limit
        if len(filtered_tools) > max_tools:
            # Prioritize: core tools > category tools > recent tools
            # Support both formats: {"function": {"name": "..."}} and {"name": "..."}
            core_tools_list = [t for t in filtered_tools
                             if (t.get("function", {}).get("name") or t.get("name", "")) in self.CORE_TOOLS]

            category_tools_list = [t for t in filtered_tools
                                 if (t.get("function", {}).get("name") or t.get("name", "")) not in self.CORE_TOOLS]

            # Keep all core tools + as many category tools as fit
            remaining_slots = max_tools - len(core_tools_list)
            filtered_tools = core_tools_list + category_tools_list[:remaining_slots]

        # Store stats for monitoring
        self.last_filter_stats = self.get_filtering_stats(all_tools, filtered_tools)

        # DIAGNOSTIC: Log final result
        logger.info(f"🔍 PREFILTER: Returning {len(filtered_tools)} tools (increased from 10 to 15 limit)")
        filtered_tool_names = [t.get('name', t.get('function', {}).get('name', 'UNKNOWN')) for t in filtered_tools]
        logger.info(f"🔍 PREFILTER: Tool names: {filtered_tool_names}")

        # Check if trip tools are included
        trip_tools_included = [name for name in filtered_tool_names if self.TOOL_CATEGORIES.get(name) == "trip"]
        if trip_tools_included:
            logger.info(f"🔍 PREFILTER: ✅ Trip tools included: {trip_tools_included}")
        elif "trip" in detected_categories:
            logger.warning(f"🔍 PREFILTER: ⚠️ Trip category detected but no trip tools included!")

        return filtered_tools

    def detect_categories(self, user_message: str) -> Set[str]:
        """
        Detect relevant categories from user message using keyword matching
        with regex timeout protection against ReDoS attacks

        Args:
            user_message: User's message text

        Returns:
            Set of detected category names
        """
        detected = set()
        message_lower = user_message.lower()

        for category, patterns in self.CATEGORY_KEYWORDS.items():
            for pattern in patterns:
                try:
                    # Regex timeout protection (1 second max)
                    def timeout_handler(signum, frame):
                        raise TimeoutError("Regex timeout")

                    # Set signal alarm for timeout
                    signal.signal(signal.SIGALRM, timeout_handler)
                    signal.alarm(1)  # 1 second timeout

                    try:
                        if re.search(pattern, message_lower, re.IGNORECASE):
                            detected.add(category)
                            break  # No need to check other patterns for this category
                    finally:
                        signal.alarm(0)  # Cancel alarm

                except (TimeoutError, Exception):
                    # Skip pattern if it times out or errors
                    continue

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

    def add_recent_tool(self, tool_name: str, user_id: Optional[str] = None):
        """
        Track a recently used tool for conversation continuity
        with memory management and LRU eviction

        Args:
            tool_name: Name of the tool that was just used
            user_id: Optional user ID for per-user tracking
        """
        # Global recent tools (for all users)
        self.recent_tools.append(tool_name)

        # Per-user tracking with LRU eviction
        if user_id:
            if user_id not in self._user_recent_tools:
                self._user_recent_tools[user_id] = deque(maxlen=5)

            self._user_recent_tools[user_id].append(tool_name)
            self._user_recent_tools.move_to_end(user_id)

            # LRU eviction - keep only most recent users
            while len(self._user_recent_tools) > self._max_cache_size:
                self._user_recent_tools.popitem(last=False)

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
