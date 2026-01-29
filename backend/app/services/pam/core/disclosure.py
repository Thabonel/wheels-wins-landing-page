"""
Affiliate Revenue Transparency for PAM Financial Co-Pilot

Ensures transparent disclosure of affiliate relationships while maintaining user trust.
PAM's recommendations are based on RV expertise first, with clear disclosure of any
potential commissions earned through user actions.

Part of the Financial Co-Pilot MVP: Transparency & Affiliate Handling functionality.
"""

import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import re

logger = logging.getLogger(__name__)


class DisclosureType(Enum):
    """Types of affiliate disclosures"""
    FULL_TRANSPARENCY = "full_transparency"      # Complete disclosure for affiliate-heavy results
    BALANCED_DISCLOSURE = "balanced_disclosure"   # Standard disclosure for mixed results
    MINIMAL_DISCLOSURE = "minimal_disclosure"     # Brief disclosure for low affiliate content
    NO_DISCLOSURE = "no_disclosure"              # No affiliate content present


@dataclass
class DisclosureContext:
    """Context for generating appropriate disclosure"""
    has_affiliate_links: bool
    affiliate_link_count: int
    non_affiliate_link_count: int
    user_requested_specific_product: bool
    search_query: str
    result_source: str  # "web_search", "price_comparison", "internal_catalog"


class AffiliateDisclosureManager:
    """
    Manages transparent disclosure of affiliate relationships.

    Ensures PAM maintains trust through honest communication about
    commission potential while emphasizing that recommendations are
    based on RV expertise regardless of commission structure.
    """

    def __init__(self):
        """Initialize the disclosure manager"""
        self.disclosure_templates = self._build_disclosure_templates()
        self.affiliate_domains = self._build_affiliate_domains()

    def generate_disclosure(
        self,
        context: DisclosureContext,
        include_source_diversity_note: bool = True
    ) -> str:
        """
        Generate appropriate affiliate disclosure based on context.

        Args:
            context: Disclosure context with affiliate relationship details
            include_source_diversity_note: Whether to mention non-affiliate options

        Returns:
            Formatted disclosure text
        """
        disclosure_type = self._determine_disclosure_type(context)

        base_disclosure = self._get_base_disclosure(disclosure_type)

        # Add context-specific elements
        enhanced_disclosure = self._enhance_disclosure(
            base_disclosure=base_disclosure,
            context=context,
            disclosure_type=disclosure_type,
            include_source_diversity_note=include_source_diversity_note
        )

        return enhanced_disclosure

    def analyze_search_results(
        self,
        search_results: List[Dict],
        search_query: str = ""
    ) -> DisclosureContext:
        """
        Analyze search results to determine affiliate disclosure needs.

        Args:
            search_results: List of search result dictionaries
            search_query: Original search query

        Returns:
            DisclosureContext with affiliate analysis
        """
        affiliate_count = 0
        non_affiliate_count = 0

        for result in search_results:
            url = result.get('url', '')
            if self._is_affiliate_domain(url):
                affiliate_count += 1
            else:
                non_affiliate_count += 1

        # Determine if user requested specific product
        user_requested_specific = self._is_specific_product_request(search_query)

        return DisclosureContext(
            has_affiliate_links=(affiliate_count > 0),
            affiliate_link_count=affiliate_count,
            non_affiliate_link_count=non_affiliate_count,
            user_requested_specific_product=user_requested_specific,
            search_query=search_query,
            result_source="web_search"
        )

    def get_transparency_summary(
        self,
        disclosure_context: DisclosureContext
    ) -> Dict[str, any]:
        """
        Get transparency summary for displaying to users.

        Returns summary of affiliate vs non-affiliate content for full transparency.
        """
        total_links = disclosure_context.affiliate_link_count + disclosure_context.non_affiliate_link_count

        if total_links == 0:
            return {"transparency_level": "no_links", "message": "No external links provided"}

        affiliate_percentage = (disclosure_context.affiliate_link_count / total_links) * 100

        return {
            "transparency_level": self._get_transparency_level(affiliate_percentage),
            "total_links": total_links,
            "affiliate_links": disclosure_context.affiliate_link_count,
            "non_affiliate_links": disclosure_context.non_affiliate_link_count,
            "affiliate_percentage": round(affiliate_percentage, 1),
            "message": self._get_transparency_message(affiliate_percentage),
            "disclosure_type": self._determine_disclosure_type(disclosure_context).value
        }

    def _determine_disclosure_type(self, context: DisclosureContext) -> DisclosureType:
        """Determine appropriate disclosure level based on context"""

        if not context.has_affiliate_links:
            return DisclosureType.NO_DISCLOSURE

        total_links = context.affiliate_link_count + context.non_affiliate_link_count

        if total_links == 0:
            return DisclosureType.NO_DISCLOSURE

        affiliate_ratio = context.affiliate_link_count / total_links

        # High affiliate content
        if affiliate_ratio >= 0.7:
            return DisclosureType.FULL_TRANSPARENCY

        # Balanced content
        elif affiliate_ratio >= 0.3:
            return DisclosureType.BALANCED_DISCLOSURE

        # Low affiliate content
        else:
            return DisclosureType.MINIMAL_DISCLOSURE

    def _get_base_disclosure(self, disclosure_type: DisclosureType) -> str:
        """Get base disclosure text for the given type"""
        return self.disclosure_templates.get(disclosure_type, "")

    def _enhance_disclosure(
        self,
        base_disclosure: str,
        context: DisclosureContext,
        disclosure_type: DisclosureType,
        include_source_diversity_note: bool
    ) -> str:
        """Enhance base disclosure with context-specific information"""

        enhanced_parts = [base_disclosure]

        # Add source diversity note if requested and applicable
        if include_source_diversity_note and context.non_affiliate_link_count > 0:
            enhanced_parts.append(
                f"I've included {context.non_affiliate_link_count} non-commission sources "
                f"alongside {context.affiliate_link_count} commission-eligible options for comparison."
            )

        # Add specific product note if user requested something specific
        if context.user_requested_specific_product:
            enhanced_parts.append(
                "Your search was for a specific product, so I'm showing you the best options "
                "I found regardless of commission potential."
            )

        return " ".join(enhanced_parts)

    def _build_disclosure_templates(self) -> Dict[DisclosureType, str]:
        """Build disclosure templates for different scenarios"""
        return {
            DisclosureType.FULL_TRANSPARENCY: (
                "💡 **Full Transparency**: Most of these links earn us commission if you purchase. "
                "However, my recommendations are based on RV expertise and mobile living needs, "
                "not commission rates. I prioritize what works best for RV life."
            ),
            DisclosureType.BALANCED_DISCLOSURE: (
                "💡 **How PAM Works**: I recommend the best options for RV life based on mobile living needs. "
                "We may earn commission on some links, but recommendations are based on RV expertise regardless of source."
            ),
            DisclosureType.MINIMAL_DISCLOSURE: (
                "💡 **Transparency Note**: We may earn commission on some links, "
                "but recommendations are based on RV expertise."
            ),
            DisclosureType.NO_DISCLOSURE: ""
        }

    def _build_affiliate_domains(self) -> List[str]:
        """Build list of known affiliate domains"""
        return [
            # Major retailers with affiliate programs
            "amazon.com", "amazon.ca", "amazon.co.uk",
            "walmart.com", "target.com", "bestbuy.com",
            "homedepot.com", "lowes.com", "costco.com",

            # RV-specific retailers
            "campingworld.com", "rvupgradestore.com",
            "rvsuperstore.com", "rvgeeks.com",

            # Electronics retailers
            "newegg.com", "bhphotovideo.com", "adorama.com",

            # Outdoor/camping retailers
            "rei.com", "cabelas.com", "basspro.com",
            "sportsmans.com", "backcountry.com",

            # Tool retailers
            "harborfreight.com", "northerntool.com",

            # Placeholder for future affiliate relationships
            # Note: Only domains with actual affiliate relationships should be listed
        ]

    def _is_affiliate_domain(self, url: str) -> bool:
        """Check if URL is from a known affiliate domain"""
        try:
            # Extract domain from URL
            domain_pattern = r'https?://(?:www\.)?([^/]+)'
            match = re.search(domain_pattern, url)
            if not match:
                return False

            domain = match.group(1).lower()

            # Check against known affiliate domains
            for affiliate_domain in self.affiliate_domains:
                if affiliate_domain.lower() in domain:
                    return True

            return False

        except Exception as e:
            logger.warning(f"Error checking affiliate domain for URL {url}: {e}")
            return False

    def _is_specific_product_request(self, query: str) -> bool:
        """Determine if user requested a specific product"""
        specific_indicators = [
            # Specific product patterns
            r'\b\w+\s+\w+\s+\d+\w*\b',  # "iPad 9th gen", "iPhone 14", etc.
            r'\b\w+\s+model\s+\w+\b',     # "Honda model EU2200i"
            r'\b\w+\s+brand\b',           # "specific brand"

            # Specific model numbers/SKUs
            r'\b[A-Z]+[-_]?\d+[A-Z]*\b',  # "EU2200i", "CFX-45", etc.

            # Specific size/capacity requests
            r'\b\d+\s*(gb|tb|w|amp|volt|inch|ft)\b',  # "256GB", "2000W", etc.
        ]

        query_lower = query.lower()

        for pattern in specific_indicators:
            if re.search(pattern, query_lower, re.IGNORECASE):
                return True

        return False

    def _get_transparency_level(self, affiliate_percentage: float) -> str:
        """Get transparency level description based on affiliate percentage"""
        if affiliate_percentage >= 70:
            return "high_affiliate_content"
        elif affiliate_percentage >= 30:
            return "balanced_content"
        elif affiliate_percentage > 0:
            return "low_affiliate_content"
        else:
            return "no_affiliate_content"

    def _get_transparency_message(self, affiliate_percentage: float) -> str:
        """Get user-friendly transparency message"""
        if affiliate_percentage >= 70:
            return f"Most results ({affiliate_percentage:.0f}%) may earn commission"
        elif affiliate_percentage >= 30:
            return f"Some results ({affiliate_percentage:.0f}%) may earn commission"
        elif affiliate_percentage > 0:
            return f"Few results ({affiliate_percentage:.0f}%) may earn commission"
        else:
            return "No commission-earning links included"

    def get_source_diversity_analysis(
        self,
        search_results: List[Dict]
    ) -> Dict[str, any]:
        """
        Analyze source diversity to ensure balanced recommendations.

        Returns analysis of result source diversity for transparency.
        """
        sources = {}
        affiliate_sources = 0
        direct_sources = 0

        for result in search_results:
            url = result.get('url', '')
            domain = self._extract_domain(url)

            sources[domain] = sources.get(domain, 0) + 1

            if self._is_affiliate_domain(url):
                affiliate_sources += 1
            else:
                direct_sources += 1

        return {
            "unique_sources": len(sources),
            "source_distribution": sources,
            "affiliate_sources": affiliate_sources,
            "direct_sources": direct_sources,
            "diversity_score": self._calculate_diversity_score(sources),
            "is_well_diversified": len(sources) >= 3 and direct_sources >= 1
        }

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        try:
            domain_pattern = r'https?://(?:www\.)?([^/]+)'
            match = re.search(domain_pattern, url)
            return match.group(1).lower() if match else "unknown"
        except:
            return "unknown"

    def _calculate_diversity_score(self, source_distribution: Dict[str, int]) -> float:
        """Calculate diversity score (0.0-1.0) based on source distribution"""
        if not source_distribution:
            return 0.0

        total_results = sum(source_distribution.values())

        # Calculate entropy-based diversity score
        diversity = 0.0
        for count in source_distribution.values():
            proportion = count / total_results
            if proportion > 0:
                diversity -= proportion * (proportion ** 0.5)  # Modified entropy

        # Normalize to 0-1 scale
        max_possible_diversity = 1.0
        return min(diversity / max_possible_diversity, 1.0)


# Singleton instance for easy import
affiliate_disclosure_manager = AffiliateDisclosureManager()