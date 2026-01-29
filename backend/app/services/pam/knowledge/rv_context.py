"""
RV Context Knowledge Base for PAM Financial Co-Pilot

Provides mobile living expertise to enhance any purchase decision with RV-specific considerations.
Structural knowledge only - no vendor-specific claims or specific product recommendations.

Part of the Financial Co-Pilot MVP: Context Intelligence functionality.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

from app.services.pam.core.intent_classifier import SpendingCategory, RVRelevance


@dataclass
class ContextInsight:
    """A single RV context insight for a purchase category"""
    title: str
    description: str
    priority: str  # "high", "medium", "low"
    icon: str  # Emoji or icon identifier


@dataclass
class RVContextInfo:
    """Complete RV context information for a purchase decision"""
    category: SpendingCategory
    title: str
    summary: str
    key_considerations: List[ContextInsight]
    common_issues: List[str]
    community_notes: Optional[str] = None
    power_considerations: Optional[str] = None
    space_considerations: Optional[str] = None
    connectivity_considerations: Optional[str] = None


class RVContextProvider:
    """
    Provides RV-specific context for any purchase decision.

    Knowledge is structural and educational - no specific vendor recommendations.
    Based on common mobile living challenges and considerations.
    """

    def __init__(self):
        """Initialize the RV context knowledge base"""
        self._context_database = self._build_context_database()

    def get_context(self, category: SpendingCategory, rv_relevance: RVRelevance) -> RVContextInfo:
        """
        Get RV context information for a spending category.

        Args:
            category: The spending category (electronics, food, etc.)
            rv_relevance: How relevant to RV living (high, medium, low)

        Returns:
            RVContextInfo with mobile living considerations
        """
        base_context = self._context_database.get(category, self._get_default_context())

        # Adjust context depth based on RV relevance
        if rv_relevance == RVRelevance.LOW:
            # Minimal RV context for general purchases
            base_context.key_considerations = base_context.key_considerations[:2]
        elif rv_relevance == RVRelevance.HIGH:
            # Full context for RV-specific purchases
            base_context.community_notes = self._get_community_notes(category)

        return base_context

    def get_power_context(self, category: SpendingCategory) -> Optional[str]:
        """Get power-specific considerations for RV living"""
        power_contexts = {
            SpendingCategory.ELECTRONICS: (
                "Consider 12V compatibility, power draw impact on battery bank, "
                "inverter capacity requirements, and charging options while driving"
            ),
            SpendingCategory.COMMUNICATION: (
                "Factor in power consumption for extended use, especially for routers "
                "and signal boosters running 24/7 on limited battery power"
            ),
            SpendingCategory.RECREATION: (
                "Consider battery-operated options for off-grid activities, "
                "solar charging compatibility, and power-free entertainment"
            )
        }
        return power_contexts.get(category)

    def get_space_context(self, category: SpendingCategory) -> Optional[str]:
        """Get space/storage considerations for RV living"""
        space_contexts = {
            SpendingCategory.FOOD: (
                "Limited refrigerator/freezer space, pantry storage constraints, "
                "consider shelf-stable alternatives and meal planning"
            ),
            SpendingCategory.ELECTRONICS: (
                "Compact/foldable options preferred, secure mounting for travel, "
                "multi-purpose items to reduce clutter"
            ),
            SpendingCategory.RECREATION: (
                "Collapsible/stackable gear, outdoor vs indoor storage, "
                "weight distribution considerations"
            ),
            SpendingCategory.MAINTENANCE: (
                "Essential tools only, compact tool storage, "
                "prioritize multi-use items over specialty tools"
            )
        }
        return space_contexts.get(category)

    def get_connectivity_context(self, category: SpendingCategory) -> Optional[str]:
        """Get connectivity considerations for remote living"""
        connectivity_contexts = {
            SpendingCategory.ELECTRONICS: (
                "Cellular models preferred for GPS/navigation, offline capability important, "
                "consider data usage and rural signal strength"
            ),
            SpendingCategory.COMMUNICATION: (
                "Multi-carrier compatibility, signal boosting capability, "
                "hotspot vs dedicated router considerations"
            ),
            SpendingCategory.SERVICES: (
                "Remote accessibility required, online vs in-person options, "
                "mobile/temporary address compatibility"
            )
        }
        return connectivity_contexts.get(category)

    def _build_context_database(self) -> Dict[SpendingCategory, RVContextInfo]:
        """Build the complete RV context database"""
        return {
            SpendingCategory.ELECTRONICS: RVContextInfo(
                category=SpendingCategory.ELECTRONICS,
                title="Electronics & Technology",
                summary="Electronics for RV living require careful consideration of power consumption, durability, and connectivity in remote areas.",
                key_considerations=[
                    ContextInsight(
                        title="Power Compatibility",
                        description="Look for 12V options or efficient AC-to-DC converters to minimize inverter load",
                        priority="high",
                        icon="🔌"
                    ),
                    ContextInsight(
                        title="Cellular Connectivity",
                        description="Cellular models provide GPS and internet access in remote areas without WiFi",
                        priority="high",
                        icon="📶"
                    ),
                    ContextInsight(
                        title="Vibration Resistance",
                        description="Solid-state drives and rugged construction handle road vibration better",
                        priority="medium",
                        icon="🛣️"
                    ),
                    ContextInsight(
                        title="Mounting Solutions",
                        description="Consider secure mounting options for safe travel and easy access",
                        priority="medium",
                        icon="🔧"
                    )
                ],
                common_issues=[
                    "Power draw exceeding battery capacity",
                    "Poor signal reception in rural areas",
                    "Device damage from road vibration",
                    "Inadequate mounting/storage solutions"
                ]
            ),

            SpendingCategory.FOOD: RVContextInfo(
                category=SpendingCategory.FOOD,
                title="Food & Dining",
                summary="RV food planning involves balancing storage space, cooking fuel costs, and access to fresh supplies.",
                key_considerations=[
                    ContextInsight(
                        title="Refrigeration Limits",
                        description="Smaller fridge/freezer space requires strategic meal planning and preservation",
                        priority="high",
                        icon="❄️"
                    ),
                    ContextInsight(
                        title="Propane Usage",
                        description="Cooking and refrigeration consume propane - factor into operating costs",
                        priority="high",
                        icon="🔥"
                    ),
                    ContextInsight(
                        title="Pantry Storage",
                        description="Limited dry goods storage favors compact, multi-use ingredients",
                        priority="medium",
                        icon="📦"
                    ),
                    ContextInsight(
                        title="Fresh Produce",
                        description="Plan for shorter fresh food cycles and preservation methods",
                        priority="medium",
                        icon="🥬"
                    )
                ],
                common_issues=[
                    "Running out of fridge space",
                    "Fresh produce spoiling quickly",
                    "High propane costs for cooking",
                    "Limited pantry organization"
                ]
            ),

            SpendingCategory.FUEL: RVContextInfo(
                category=SpendingCategory.FUEL,
                title="Fuel & Energy",
                summary="RV fuel costs vary significantly by region, rig type, and driving patterns. Plan for multiple fuel types.",
                key_considerations=[
                    ContextInsight(
                        title="Regional Price Variation",
                        description="Fuel prices vary dramatically by state/region - plan route for savings",
                        priority="high",
                        icon="🗺️"
                    ),
                    ContextInsight(
                        title="Diesel vs Gasoline",
                        description="Different fuel types have different availability and pricing patterns",
                        priority="high",
                        icon="⛽"
                    ),
                    ContextInsight(
                        title="Propane Availability",
                        description="Not all gas stations have propane - plan refill stops in advance",
                        priority="medium",
                        icon="🔄"
                    ),
                    ContextInsight(
                        title="Fuel Efficiency Impact",
                        description="Towing, altitude, and weather significantly affect fuel consumption",
                        priority="medium",
                        icon="📊"
                    )
                ],
                common_issues=[
                    "Unexpected high fuel costs in remote areas",
                    "Difficulty finding propane refills",
                    "Poor fuel economy due to towing",
                    "Running low on fuel between stations"
                ]
            ),

            SpendingCategory.ACCOMMODATION: RVContextInfo(
                category=SpendingCategory.ACCOMMODATION,
                title="Accommodation & Camping",
                summary="RV accommodation involves balancing hookup needs, size restrictions, and seasonal availability.",
                key_considerations=[
                    ContextInsight(
                        title="Hookup Requirements",
                        description="Full hookups (electric/water/sewer) vs partial vs dry camping affects pricing",
                        priority="high",
                        icon="🔌"
                    ),
                    ContextInsight(
                        title="Size Restrictions",
                        description="Many parks have length/height limits - verify rig compatibility",
                        priority="high",
                        icon="📏"
                    ),
                    ContextInsight(
                        title="Seasonal Pricing",
                        description="Peak season rates can be 2-3x higher than off-season",
                        priority="medium",
                        icon="📅"
                    ),
                    ContextInsight(
                        title="Advance Booking",
                        description="Popular destinations require reservations weeks or months ahead",
                        priority="medium",
                        icon="📝"
                    )
                ],
                common_issues=[
                    "Rig too large for desired campground",
                    "No available sites during peak season",
                    "Hookup types don't match needs",
                    "Unexpected additional fees"
                ]
            ),

            SpendingCategory.MAINTENANCE: RVContextInfo(
                category=SpendingCategory.MAINTENANCE,
                title="Maintenance & Repairs",
                summary="RV maintenance requires specialized knowledge and can be expensive on the road. Preventive care is crucial.",
                key_considerations=[
                    ContextInsight(
                        title="Mobile Service Availability",
                        description="Find mobile mechanics or RV-specialized shops for complex repairs",
                        priority="high",
                        icon="🔧"
                    ),
                    ContextInsight(
                        title="Emergency Roadside",
                        description="Ensure roadside assistance covers RVs and your specific rig size",
                        priority="high",
                        icon="🚨"
                    ),
                    ContextInsight(
                        title="Parts Availability",
                        description="RV-specific parts may require special ordering or dealer visits",
                        priority="medium",
                        icon="🛠️"
                    ),
                    ContextInsight(
                        title="Preventive Maintenance",
                        description="Regular maintenance prevents expensive roadside breakdowns",
                        priority="medium",
                        icon="📋"
                    )
                ],
                common_issues=[
                    "Finding qualified RV mechanics on the road",
                    "Expensive emergency repairs",
                    "Parts unavailable in small towns",
                    "Towing limitations for large rigs"
                ]
            ),

            SpendingCategory.SERVICES: RVContextInfo(
                category=SpendingCategory.SERVICES,
                title="Services & Utilities",
                summary="Mobile living requires services that accommodate temporary/changing addresses and remote locations.",
                key_considerations=[
                    ContextInsight(
                        title="Address Requirements",
                        description="Many services require permanent addresses - use mail forwarding solutions",
                        priority="high",
                        icon="📮"
                    ),
                    ContextInsight(
                        title="Mobile Accessibility",
                        description="Choose providers with mobile apps, online access, and location flexibility",
                        priority="high",
                        icon="📱"
                    ),
                    ContextInsight(
                        title="Geographic Coverage",
                        description="Ensure service coverage across your travel areas, not just home state",
                        priority="medium",
                        icon="🗺️"
                    ),
                    ContextInsight(
                        title="Temporary vs Permanent",
                        description="Some services better for short-term vs long-term nomadic living",
                        priority="medium",
                        icon="⏱️"
                    )
                ],
                common_issues=[
                    "Services requiring permanent addresses",
                    "Poor coverage in rural/remote areas",
                    "Difficulty changing service locations frequently",
                    "Higher costs for temporary/mobile services"
                ]
            ),

            SpendingCategory.RECREATION: RVContextInfo(
                category=SpendingCategory.RECREATION,
                title="Recreation & Entertainment",
                summary="RV recreation often involves outdoor activities and seasonal/weather-dependent planning.",
                key_considerations=[
                    ContextInsight(
                        title="Outdoor Focus",
                        description="RV recreation typically emphasizes outdoor activities and nature access",
                        priority="high",
                        icon="🏔️"
                    ),
                    ContextInsight(
                        title="Weather Dependency",
                        description="Have backup indoor activities for bad weather days",
                        priority="medium",
                        icon="🌦️"
                    ),
                    ContextInsight(
                        title="Equipment Storage",
                        description="Compact, multi-use recreation gear fits limited storage space",
                        priority="medium",
                        icon="🎒"
                    ),
                    ContextInsight(
                        title="Seasonal Access",
                        description="Many recreation areas have seasonal closures or limited access",
                        priority="low",
                        icon="📅"
                    )
                ],
                common_issues=[
                    "Weather limiting outdoor activities",
                    "Seasonal closure of recreation areas",
                    "Limited storage for recreation equipment",
                    "Finding age-appropriate activities while traveling"
                ]
            ),

            SpendingCategory.SAFETY: RVContextInfo(
                category=SpendingCategory.SAFETY,
                title="Safety & Security",
                summary="RV safety involves protecting both the vehicle and occupants in various environments and situations.",
                key_considerations=[
                    ContextInsight(
                        title="Remote Emergency",
                        description="Prepare for emergencies where cell service and help may be limited",
                        priority="high",
                        icon="🆘"
                    ),
                    ContextInsight(
                        title="Theft Prevention",
                        description="RVs are targets for theft - secure valuable items and access points",
                        priority="high",
                        icon="🔒"
                    ),
                    ContextInsight(
                        title="Fire Safety",
                        description="Propane, electrical, and confined space fire risks require special preparation",
                        priority="medium",
                        icon="🔥"
                    ),
                    ContextInsight(
                        title="Medical Access",
                        description="Remote locations may have limited medical facility access",
                        priority="medium",
                        icon="🏥"
                    )
                ],
                common_issues=[
                    "No cell service in emergency situations",
                    "Theft of external equipment while unattended",
                    "Limited emergency response in remote areas",
                    "Medical emergencies far from hospitals"
                ]
            ),

            SpendingCategory.COMMUNICATION: RVContextInfo(
                category=SpendingCategory.COMMUNICATION,
                title="Communication & Connectivity",
                summary="Reliable communication is essential for safety, work, and staying connected while living mobile.",
                key_considerations=[
                    ContextInsight(
                        title="Rural Coverage",
                        description="Ensure communication solutions work in remote/rural areas you'll visit",
                        priority="high",
                        icon="📡"
                    ),
                    ContextInsight(
                        title="Data Limitations",
                        description="Manage data usage carefully - unlimited plans often have throttling limits",
                        priority="high",
                        icon="📊"
                    ),
                    ContextInsight(
                        title="Backup Solutions",
                        description="Have multiple communication options in case primary service fails",
                        priority="medium",
                        icon="🔄"
                    ),
                    ContextInsight(
                        title="Work Requirements",
                        description="Remote work needs may require higher bandwidth and reliability",
                        priority="medium",
                        icon="💼"
                    )
                ],
                common_issues=[
                    "Poor signal strength in remote areas",
                    "Data throttling after monthly limits",
                    "Single carrier dead zones",
                    "Insufficient bandwidth for video calls"
                ]
            )
        }

    def _get_community_notes(self, category: SpendingCategory) -> str:
        """Get community wisdom for high-relevance categories"""
        community_notes = {
            SpendingCategory.ELECTRONICS: "Popular with full-timers: iPad cellular for navigation, Verizon Jetpack for backup internet, Goal Zero for solar power",
            SpendingCategory.FUEL: "GasBuddy app commonly used for price comparison, diesel motorhomes typically get 6-10 MPG depending on size",
            SpendingCategory.ACCOMMODATION: "Harvest Hosts and Boondockers Welcome popular for free camping, KOA for family-friendly amenities",
            SpendingCategory.COMMUNICATION: "WeBoost signal boosters widely recommended, multiple carrier strategy common for coverage",
            SpendingCategory.MAINTENANCE: "Technician Finder app helpful for mobile repairs, preventive maintenance saves thousands in emergency costs"
        }
        return community_notes.get(category, "")

    def _get_default_context(self) -> RVContextInfo:
        """Default context for unknown categories"""
        return RVContextInfo(
            category=SpendingCategory.UNKNOWN,
            title="General Purchase",
            summary="Consider how this purchase fits into mobile living constraints and priorities.",
            key_considerations=[
                ContextInsight(
                    title="Storage Space",
                    description="Limited storage space requires prioritizing essential items",
                    priority="medium",
                    icon="📦"
                ),
                ContextInsight(
                    title="Weight Considerations",
                    description="Additional weight affects fuel economy and towing capacity",
                    priority="medium",
                    icon="⚖️"
                ),
                ContextInsight(
                    title="Durability",
                    description="Mobile lifestyle requires items that can handle vibration and temperature changes",
                    priority="low",
                    icon="🛡️"
                )
            ],
            common_issues=[
                "Running out of storage space",
                "Items damaged by travel vibration",
                "Weight distribution problems"
            ]
        )

    def format_context_for_response(self, context: RVContextInfo, brief: bool = False) -> str:
        """
        Format RV context for PAM's response.

        Args:
            context: The RV context information
            brief: If True, return shortened version

        Returns:
            Formatted string for inclusion in PAM responses
        """
        if brief:
            return f"**RV Context**: {context.summary}"

        # Full context formatting
        lines = [f"**RV Context for {context.title}**"]
        lines.append(f"{context.summary}")

        if context.key_considerations:
            lines.append("\n**Key Considerations:**")
            for consideration in context.key_considerations[:3]:  # Limit to top 3
                lines.append(f"• {consideration.icon} **{consideration.title}**: {consideration.description}")

        if context.community_notes:
            lines.append(f"\n**Community Insight**: {context.community_notes}")

        return "\n".join(lines)


# Singleton instance for easy import
rv_context_provider = RVContextProvider()