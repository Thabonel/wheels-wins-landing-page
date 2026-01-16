"""PAM Shop Tools for Product Search and Price Comparison

Tools for searching, comparing prices, recommending, and getting details about products.
Uses internal affiliate products + RapidAPI for broader price comparison.

Amendment #6: Added compare_prices tool with RapidAPI integration
"""

from .search_products import search_products, TOOL_METADATA as SEARCH_METADATA
from .get_product_details import get_product_details, TOOL_METADATA as DETAILS_METADATA
from .recommend_products import recommend_products, TOOL_METADATA as RECOMMEND_METADATA
from .compare_prices import compare_prices, TOOL_METADATA as COMPARE_METADATA

# Export all shop tools
__all__ = [
    "search_products",
    "get_product_details",
    "recommend_products",
    "compare_prices"
]

# Export metadata for tool registration
SHOP_TOOLS_METADATA = {
    "search_products": SEARCH_METADATA,
    "get_product_details": DETAILS_METADATA,
    "recommend_products": RECOMMEND_METADATA,
    "compare_prices": COMPARE_METADATA
}