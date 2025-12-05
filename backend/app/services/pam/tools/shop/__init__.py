"""PAM Shop Tools for Affiliate Products

Tools for searching, recommending, and getting details about Amazon affiliate products
"""

from .search_products import search_products, TOOL_METADATA as SEARCH_METADATA
from .get_product_details import get_product_details, TOOL_METADATA as DETAILS_METADATA
from .recommend_products import recommend_products, TOOL_METADATA as RECOMMEND_METADATA

# Export all shop tools
__all__ = [
    "search_products",
    "get_product_details",
    "recommend_products"
]

# Export metadata for tool registration
SHOP_TOOLS_METADATA = {
    "search_products": SEARCH_METADATA,
    "get_product_details": DETAILS_METADATA,
    "recommend_products": RECOMMEND_METADATA
}