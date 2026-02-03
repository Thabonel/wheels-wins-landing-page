"""
Universal Extract Tool - Site-Agnostic Data Extraction for PAM

Extracts structured data from ANY website using AI + DOM analysis.
Part of the OpenClaw-inspired universal capabilities.
"""

from typing import Dict, Any, Optional, List
from .base_tool import BaseTool, ToolResult
from .tool_capabilities import ToolCapability
from app.core.logging import get_logger
from app.core.url_validator import validate_url_safe, SSRFProtectionError

logger = get_logger(__name__)

# Tool function definition for Claude
UNIVERSAL_EXTRACT_FUNCTION = {
    "name": "universal_extract",
    "description": """Extract structured data from any website URL. Automatically detects page type (product, campground, business, article, comparison) and extracts relevant information. Use this when the user shares a URL and wants information from it, or asks you to 'look at' or 'check' a website.""",
    "parameters": {
        "type": "object",
        "properties": {
            "url": {
                "type": "string",
                "description": "The full URL to extract data from (must start with http:// or https://)"
            },
            "intent": {
                "type": "string",
                "description": "Optional natural language description of what to extract. Examples: 'get the price', 'find campground amenities', 'compare products'"
            },
            "expected_type": {
                "type": "string",
                "enum": ["product", "campground", "business", "article", "comparison", "listing", "auto"],
                "description": "Expected page type. Use 'auto' for automatic detection (recommended).",
                "default": "auto"
            },
            "output_format": {
                "type": "string",
                "enum": ["json", "markdown", "natural_language"],
                "description": "How to format the extracted data",
                "default": "natural_language"
            },
            "priority_fields": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Optional list of fields to prioritize (e.g., ['price', 'availability', 'rating'])"
            }
        },
        "required": ["url"]
    }
}


class UniversalExtractTool(BaseTool):
    """
    PAM tool for universal website data extraction.

    Capabilities:
    - Extract product info from e-commerce sites
    - Extract campground details from booking sites
    - Extract business info from directories
    - Extract comparison data from review sites
    - Extract article content from blogs
    """

    def __init__(self, user_jwt: Optional[str] = None):
        super().__init__(
            tool_name="universal_extract",
            description="Extract structured data from any website URL",
            capabilities=[ToolCapability.EXTERNAL_API, ToolCapability.DATA_EXTRACTION],
            user_jwt=user_jwt
        )
        self._extractor = None

    async def initialize(self):
        """Lazy initialization of the extractor"""
        try:
            from app.services.extraction import SiteAgnosticExtractor
            self._extractor = SiteAgnosticExtractor()
            self.is_initialized = True
            logger.info("UniversalExtractTool initialized successfully")
        except ImportError as e:
            logger.warning(f"Extraction service not available: {e}")
            self.is_initialized = False
        except Exception as e:
            logger.error(f"Failed to initialize UniversalExtractTool: {e}")
            self.is_initialized = False

    async def execute(self, user_id: str, parameters: Dict[str, Any] = None) -> ToolResult:
        """
        Execute data extraction from a URL.

        Args:
            user_id: The user requesting extraction
            parameters: {
                url: str - URL to extract from
                intent: Optional[str] - What to extract
                expected_type: str - Expected page type
                output_format: str - Output format
                priority_fields: Optional[List[str]] - Fields to prioritize
            }

        Returns:
            ToolResult with extracted data
        """
        parameters = parameters or {}

        # Validate URL
        url = parameters.get("url")
        if not url:
            return self._create_error_result("URL is required for extraction")

        if not url.startswith(("http://", "https://")):
            return self._create_error_result("URL must start with http:// or https://")

        # SSRF protection - validate URL before any network access
        try:
            validate_url_safe(url)
        except SSRFProtectionError:
            logger.warning(f"SSRF protection blocked extraction from: {url}")
            return self._create_error_result(
                "This URL is not accessible for security reasons. Only public websites can be accessed."
            )

        # Check initialization
        if not self._extractor:
            await self.initialize()
            if not self._extractor:
                return self._create_error_result(
                    "Extraction service is not available. Please try again later."
                )

        intent = parameters.get("intent")
        expected_type = parameters.get("expected_type", "auto")
        output_format = parameters.get("output_format", "natural_language")
        priority_fields = parameters.get("priority_fields")

        try:
            logger.info(f"Extracting data from {url} for user {user_id}")

            # Perform extraction
            result = await self._extractor.extract(
                url=url,
                intent=intent,
                expected_type=expected_type if expected_type != "auto" else None,
                output_format=output_format,
                priority_fields=priority_fields
            )

            if not result.success:
                error_msg = result.errors[0].get("message", "Extraction failed") if result.errors else "Extraction failed"
                return self._create_error_result(
                    f"Could not extract data from {url}: {error_msg}",
                    metadata={"url": url, "page_type": result.page_type}
                )

            # Format response for PAM
            response_data = {
                "url": url,
                "page_type": result.page_type,
                "confidence": result.confidence,
                "data": result.data,
                "formatted_output": result.formatted_output if hasattr(result, "formatted_output") else None
            }

            return self._create_success_result(
                data=response_data,
                metadata={
                    "extraction_method": result.metadata.get("method") if result.metadata else None,
                    "processing_time_ms": result.metadata.get("processing_time_ms") if result.metadata else None,
                    "cache_hit": result.metadata.get("cache_hit", False) if result.metadata else False
                }
            )

        except Exception as e:
            logger.error(f"Extraction error for {url}: {e}")
            return self._create_error_result(
                f"Error extracting data: {str(e)}",
                metadata={"url": url}
            )

    def _format_for_pam(self, data: Dict[str, Any], page_type: str) -> str:
        """Format extracted data for natural PAM response"""
        if page_type == "product":
            return self._format_product(data)
        elif page_type == "campground":
            return self._format_campground(data)
        elif page_type == "business":
            return self._format_business(data)
        elif page_type == "comparison":
            return self._format_comparison(data)
        else:
            return self._format_generic(data)

    def _format_product(self, data: Dict[str, Any]) -> str:
        """Format product data"""
        lines = []
        if data.get("name"):
            lines.append(f"**{data['name']}**")
        if data.get("price"):
            price = data["price"]
            if isinstance(price, dict):
                formatted = price.get('formatted') or f"${price.get('amount', 0):.2f}"
                lines.append(f"Price: {formatted}")
            else:
                lines.append(f"Price: ${price:.2f}")
        if data.get("availability"):
            avail = data["availability"]
            if isinstance(avail, dict):
                status = "In Stock" if avail.get("in_stock") else "Out of Stock"
                lines.append(f"Availability: {status}")
            else:
                lines.append(f"Availability: {avail}")
        if data.get("rating"):
            rating = data["rating"]
            if isinstance(rating, dict):
                lines.append(f"Rating: {rating.get('score', 'N/A')}/5 ({rating.get('count', 0)} reviews)")
            else:
                lines.append(f"Rating: {rating}")
        if data.get("features"):
            lines.append("\nKey Features:")
            for feature in data["features"][:5]:
                lines.append(f"  - {feature}")
        return "\n".join(lines)

    def _format_campground(self, data: Dict[str, Any]) -> str:
        """Format campground data"""
        lines = []
        if data.get("name"):
            lines.append(f"**{data['name']}**")
        if data.get("location"):
            loc = data["location"]
            if isinstance(loc, dict):
                lines.append(f"Location: {loc.get('address', loc.get('city', 'Unknown'))}")
            else:
                lines.append(f"Location: {loc}")
        if data.get("pricing"):
            pricing = data["pricing"]
            if isinstance(pricing, dict):
                lines.append(f"Nightly Rate: ${pricing.get('nightly_rate', 'N/A')}")
            else:
                lines.append(f"Price: {pricing}")
        if data.get("amenities"):
            lines.append("\nAmenities:")
            for amenity in data["amenities"][:8]:
                if isinstance(amenity, dict):
                    name = amenity.get("name", str(amenity))
                    available = amenity.get("available", True)
                    status = "Yes" if available else "No"
                    lines.append(f"  - {name}: {status}")
                else:
                    lines.append(f"  - {amenity}")
        if data.get("site_types"):
            lines.append("\nSite Types:")
            for site in data["site_types"][:5]:
                if isinstance(site, dict):
                    lines.append(f"  - {site.get('type', 'Unknown')}: {site.get('count', 'N/A')} sites")
                else:
                    lines.append(f"  - {site}")
        return "\n".join(lines)

    def _format_business(self, data: Dict[str, Any]) -> str:
        """Format business data"""
        lines = []
        if data.get("name"):
            lines.append(f"**{data['name']}**")
        if data.get("type"):
            lines.append(f"Type: {data['type']}")
        if data.get("address"):
            addr = data["address"]
            if isinstance(addr, dict):
                lines.append(f"Address: {addr.get('formatted', addr.get('street', 'Unknown'))}")
            else:
                lines.append(f"Address: {addr}")
        if data.get("contact"):
            contact = data["contact"]
            if isinstance(contact, dict):
                if contact.get("phone"):
                    lines.append(f"Phone: {contact['phone']}")
                if contact.get("website"):
                    lines.append(f"Website: {contact['website']}")
        if data.get("hours"):
            lines.append("\nHours:")
            hours = data["hours"]
            if isinstance(hours, dict):
                for day, time in hours.items():
                    if day not in ["timezone", "holiday_hours"]:
                        lines.append(f"  - {day.capitalize()}: {time}")
        if data.get("rating"):
            rating = data["rating"]
            if isinstance(rating, dict):
                lines.append(f"\nRating: {rating.get('score', 'N/A')}/5 ({rating.get('count', 0)} reviews)")
        return "\n".join(lines)

    def _format_comparison(self, data: Dict[str, Any]) -> str:
        """Format comparison table data"""
        lines = []
        if data.get("title"):
            lines.append(f"**{data['title']}**\n")

        items = data.get("items", [])
        if items:
            # Build simple comparison
            for item in items[:5]:
                name = item.get("name", "Unknown")
                lines.append(f"**{name}**")
                attrs = item.get("attributes", {})
                for key, value in list(attrs.items())[:6]:
                    lines.append(f"  - {key}: {value}")
                lines.append("")

        if data.get("recommendations"):
            recs = data["recommendations"]
            lines.append("Recommendations:")
            for category, item in recs.items():
                lines.append(f"  - {category.replace('_', ' ').title()}: {item}")

        return "\n".join(lines)

    def _format_generic(self, data: Dict[str, Any]) -> str:
        """Format generic extracted data"""
        lines = []
        for key, value in data.items():
            if key.startswith("_"):
                continue
            if isinstance(value, dict):
                lines.append(f"**{key.replace('_', ' ').title()}:**")
                for k, v in list(value.items())[:5]:
                    lines.append(f"  - {k}: {v}")
            elif isinstance(value, list):
                lines.append(f"**{key.replace('_', ' ').title()}:**")
                for item in value[:5]:
                    lines.append(f"  - {item}")
            else:
                lines.append(f"**{key.replace('_', ' ').title()}:** {value}")
        return "\n".join(lines)


# Export function definition for registration
def get_tool_definition() -> Dict[str, Any]:
    """Get the OpenAI function definition for this tool"""
    return UNIVERSAL_EXTRACT_FUNCTION


def create_tool(user_jwt: Optional[str] = None) -> UniversalExtractTool:
    """Factory function to create tool instance"""
    return UniversalExtractTool(user_jwt=user_jwt)
