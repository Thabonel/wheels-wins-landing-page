"""
Site-Agnostic Data Extraction - Output Formatter
Formats extracted data for different output formats and contexts
"""

import json
from typing import Dict, Any, Optional
from datetime import datetime

from app.core.logging import get_logger
from .schemas import PageType

logger = get_logger(__name__)


class OutputFormatter:
    """
    Formats extraction results for various output formats
    Supports JSON, Markdown, and natural language formatting
    """

    def format_json(self, data: Dict[str, Any], pretty: bool = True) -> str:
        """
        Format extracted data as JSON

        Args:
            data: Extracted data dictionary
            pretty: Whether to use pretty formatting

        Returns:
            JSON string
        """
        try:
            # Remove internal fields (starting with _)
            clean_data = {k: v for k, v in data.items() if not k.startswith("_")}

            # Convert datetime objects to ISO strings
            clean_data = self._serialize_datetimes(clean_data)

            if pretty:
                return json.dumps(clean_data, indent=2, ensure_ascii=False)
            return json.dumps(clean_data, ensure_ascii=False)

        except Exception as e:
            logger.error(f"JSON formatting error: {str(e)}")
            return json.dumps({"error": str(e)})

    def format_markdown(self, data: Dict[str, Any], page_type: PageType) -> str:
        """
        Format extracted data as Markdown

        Args:
            data: Extracted data dictionary
            page_type: Type of page for type-specific formatting

        Returns:
            Markdown formatted string
        """
        try:
            if page_type == PageType.PRODUCT:
                return self._format_product_markdown(data)
            elif page_type == PageType.CAMPGROUND:
                return self._format_campground_markdown(data)
            elif page_type == PageType.BUSINESS:
                return self._format_business_markdown(data)
            elif page_type == PageType.COMPARISON:
                return self._format_comparison_markdown(data)
            else:
                return self._format_generic_markdown(data)

        except Exception as e:
            logger.error(f"Markdown formatting error: {str(e)}")
            return f"# Error\n\nFailed to format data: {str(e)}"

    def format_natural_language(
        self,
        data: Dict[str, Any],
        context: Dict[str, Any]
    ) -> str:
        """
        Format extracted data as natural language suitable for PAM responses

        Args:
            data: Extracted data dictionary
            context: Context including page_type, user_intent, etc.

        Returns:
            Natural language summary
        """
        try:
            page_type = context.get("page_type", PageType.UNKNOWN)
            user_intent = context.get("intent", "")

            if page_type == PageType.PRODUCT:
                return self._format_product_natural(data, user_intent)
            elif page_type == PageType.CAMPGROUND:
                return self._format_campground_natural(data, user_intent)
            elif page_type == PageType.BUSINESS:
                return self._format_business_natural(data, user_intent)
            else:
                return self._format_generic_natural(data, user_intent)

        except Exception as e:
            logger.error(f"Natural language formatting error: {str(e)}")
            return f"I found some information but had trouble formatting it: {str(e)}"

    def _serialize_datetimes(self, obj: Any) -> Any:
        """Recursively convert datetime objects to ISO strings"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, dict):
            return {k: self._serialize_datetimes(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._serialize_datetimes(item) for item in obj]
        return obj

    def _format_product_markdown(self, data: Dict[str, Any]) -> str:
        """Format product data as Markdown"""
        lines = []

        name = data.get("name", "Unknown Product")
        lines.append(f"# {name}\n")

        if data.get("price"):
            lines.append(f"**Price:** {data['price']}\n")

        if data.get("rating"):
            rating = data["rating"]
            review_count = data.get("review_count", "")
            review_text = f" ({review_count} reviews)" if review_count else ""
            lines.append(f"**Rating:** {'*' * int(rating)} {rating}/5{review_text}\n")

        if data.get("availability"):
            lines.append(f"**Availability:** {data['availability']}\n")

        if data.get("brand"):
            lines.append(f"**Brand:** {data['brand']}\n")

        if data.get("description"):
            lines.append(f"\n## Description\n\n{data['description']}\n")

        if data.get("specifications"):
            lines.append("\n## Specifications\n")
            for key, value in data["specifications"].items():
                lines.append(f"- **{key}:** {value}")
            lines.append("")

        if data.get("categories"):
            lines.append(f"\n**Categories:** {', '.join(data['categories'])}\n")

        return "\n".join(lines)

    def _format_campground_markdown(self, data: Dict[str, Any]) -> str:
        """Format campground data as Markdown"""
        lines = []

        name = data.get("name", "Unknown Campground")
        lines.append(f"# {name}\n")

        if data.get("location"):
            lines.append(f"**Location:** {data['location']}\n")

        if data.get("rating"):
            rating = data["rating"]
            review_count = data.get("review_count", "")
            review_text = f" ({review_count} reviews)" if review_count else ""
            lines.append(f"**Rating:** {'*' * int(rating)} {rating}/5{review_text}\n")

        if data.get("price_range"):
            lines.append(f"**Price:** {data['price_range']}\n")

        if data.get("description"):
            lines.append(f"\n## About\n\n{data['description']}\n")

        if data.get("amenities"):
            lines.append("\n## Amenities\n")
            for amenity in data["amenities"]:
                lines.append(f"- {amenity}")
            lines.append("")

        if data.get("rv_specifics"):
            rv = data["rv_specifics"]
            lines.append("\n## RV Information\n")
            if rv.get("max_length"):
                lines.append(f"- **Max RV Length:** {rv['max_length']}")
            if rv.get("hookups"):
                lines.append(f"- **Hookups:** {', '.join(rv['hookups'])}")
            if rv.get("pull_through") is not None:
                lines.append(f"- **Pull-Through Sites:** {'Yes' if rv['pull_through'] else 'No'}")
            lines.append("")

        if data.get("site_types"):
            lines.append(f"\n**Site Types:** {', '.join(data['site_types'])}\n")

        if data.get("pet_policy"):
            lines.append(f"\n**Pet Policy:** {data['pet_policy']}\n")

        if data.get("contact_info"):
            contact = data["contact_info"]
            lines.append("\n## Contact\n")
            if contact.get("phone"):
                lines.append(f"- **Phone:** {contact['phone']}")
            if contact.get("website"):
                lines.append(f"- **Website:** {contact['website']}")
            lines.append("")

        return "\n".join(lines)

    def _format_business_markdown(self, data: Dict[str, Any]) -> str:
        """Format business data as Markdown"""
        lines = []

        name = data.get("name", "Unknown Business")
        lines.append(f"# {name}\n")

        if data.get("rating"):
            rating = data["rating"]
            review_count = data.get("review_count", "")
            price_level = data.get("price_level", "")
            extra_info = []
            if review_count:
                extra_info.append(f"{review_count} reviews")
            if price_level:
                extra_info.append(price_level)
            extra_text = f" ({', '.join(extra_info)})" if extra_info else ""
            lines.append(f"**Rating:** {'*' * int(rating)} {rating}/5{extra_text}\n")

        if data.get("address"):
            lines.append(f"**Address:** {data['address']}\n")

        if data.get("phone"):
            lines.append(f"**Phone:** {data['phone']}\n")

        if data.get("description"):
            lines.append(f"\n## About\n\n{data['description']}\n")

        if data.get("hours"):
            lines.append("\n## Hours\n")
            for day, hours in data["hours"].items():
                lines.append(f"- **{day}:** {hours}")
            lines.append("")

        if data.get("services"):
            lines.append("\n## Services\n")
            for service in data["services"]:
                lines.append(f"- {service}")
            lines.append("")

        if data.get("categories"):
            lines.append(f"\n**Categories:** {', '.join(data['categories'])}\n")

        return "\n".join(lines)

    def _format_comparison_markdown(self, data: Dict[str, Any]) -> str:
        """Format comparison data as Markdown"""
        lines = []

        title = data.get("title", "Comparison")
        lines.append(f"# {title}\n")

        if data.get("summary"):
            lines.append(f"{data['summary']}\n")

        if data.get("items"):
            for item in data["items"]:
                lines.append(f"\n## {item.get('name', 'Item')}\n")
                if item.get("price"):
                    lines.append(f"**Price:** {item['price']}")
                if item.get("rating"):
                    lines.append(f"**Rating:** {item['rating']}/5")
                if item.get("pros"):
                    lines.append("\n**Pros:**")
                    for pro in item["pros"]:
                        lines.append(f"- {pro}")
                if item.get("cons"):
                    lines.append("\n**Cons:**")
                    for con in item["cons"]:
                        lines.append(f"- {con}")
                lines.append("")

        if data.get("winner"):
            lines.append(f"\n## Recommended: {data['winner']}\n")

        return "\n".join(lines)

    def _format_generic_markdown(self, data: Dict[str, Any]) -> str:
        """Format generic data as Markdown"""
        lines = []

        title = data.get("title", data.get("name", "Extracted Data"))
        lines.append(f"# {title}\n")

        # Add main content if available
        if data.get("main_content"):
            lines.append(f"{data['main_content']}\n")

        # Format remaining fields
        for key, value in data.items():
            if key in ["title", "name", "main_content"]:
                continue
            if key.startswith("_"):
                continue

            formatted_key = key.replace("_", " ").title()

            if isinstance(value, list):
                if value:
                    lines.append(f"\n## {formatted_key}\n")
                    for item in value:
                        if isinstance(item, dict):
                            lines.append(f"- {json.dumps(item)}")
                        else:
                            lines.append(f"- {item}")
            elif isinstance(value, dict):
                lines.append(f"\n## {formatted_key}\n")
                for k, v in value.items():
                    lines.append(f"- **{k}:** {v}")
            elif value:
                lines.append(f"**{formatted_key}:** {value}")

        return "\n".join(lines)

    def _format_product_natural(self, data: Dict[str, Any], intent: str) -> str:
        """Format product data as natural language"""
        parts = []

        name = data.get("name", "this product")
        parts.append(f"I found information about **{name}**.")

        if data.get("price"):
            parts.append(f"The price is {data['price']}.")

        if data.get("rating"):
            rating = data["rating"]
            review_count = data.get("review_count")
            if review_count:
                parts.append(f"It has a {rating}/5 rating based on {review_count} reviews.")
            else:
                parts.append(f"It has a {rating}/5 rating.")

        if data.get("availability"):
            parts.append(f"Availability: {data['availability']}.")

        if data.get("description"):
            desc = data["description"]
            if len(desc) > 200:
                desc = desc[:200] + "..."
            parts.append(f"\n\n{desc}")

        return " ".join(parts)

    def _format_campground_natural(self, data: Dict[str, Any], intent: str) -> str:
        """Format campground data as natural language"""
        parts = []

        name = data.get("name", "this campground")
        location = data.get("location", "")
        if location:
            parts.append(f"**{name}** is located at {location}.")
        else:
            parts.append(f"I found information about **{name}**.")

        if data.get("rating"):
            parts.append(f"It has a {data['rating']}/5 rating.")

        if data.get("price_range"):
            parts.append(f"Prices range {data['price_range']}.")

        if data.get("amenities"):
            amenities = data["amenities"][:5]  # First 5
            parts.append(f"Amenities include: {', '.join(amenities)}.")

        if data.get("rv_specifics"):
            rv = data["rv_specifics"]
            rv_parts = []
            if rv.get("max_length"):
                rv_parts.append(f"max RV length {rv['max_length']}")
            if rv.get("hookups"):
                rv_parts.append(f"{', '.join(rv['hookups'])} hookups")
            if rv_parts:
                parts.append(f"RV info: {', '.join(rv_parts)}.")

        return " ".join(parts)

    def _format_business_natural(self, data: Dict[str, Any], intent: str) -> str:
        """Format business data as natural language"""
        parts = []

        name = data.get("name", "this business")
        parts.append(f"**{name}**")

        if data.get("rating"):
            price = f" ({data.get('price_level', '')})" if data.get("price_level") else ""
            parts.append(f"is rated {data['rating']}/5{price}.")

        if data.get("address"):
            parts.append(f"Located at {data['address']}.")

        if data.get("phone"):
            parts.append(f"Phone: {data['phone']}.")

        if data.get("hours"):
            # Just mention hours are available
            parts.append("Hours of operation are listed on their page.")

        return " ".join(parts)

    def _format_generic_natural(self, data: Dict[str, Any], intent: str) -> str:
        """Format generic data as natural language"""
        parts = []

        title = data.get("title", data.get("name", ""))
        if title:
            parts.append(f"I found information about **{title}**.")

        if data.get("main_content"):
            content = data["main_content"]
            if len(content) > 300:
                content = content[:300] + "..."
            parts.append(content)

        if not parts:
            parts.append("I was able to extract some data from the page. Here's what I found:")

        return " ".join(parts)
