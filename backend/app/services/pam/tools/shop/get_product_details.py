"""Get Product Details Tool for PAM

Retrieve detailed information about a specific product

Example usage:
- "Tell me more about the tire deflator"
- "Get details for product ID xyz"
"""

import logging
from typing import Any, Dict, Optional
from uuid import UUID

from app.integrations.supabase import get_supabase_client
from app.services.pam.tools.exceptions import (
    ValidationError,
    DatabaseError,
    ResourceNotFoundError,
)
from app.services.pam.tools.utils import (
    validate_uuid,
    safe_db_select,
)

logger = logging.getLogger(__name__)


async def get_product_details(
    user_id: str,
    product_id: Optional[str] = None,
    product_title: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Get detailed information about a specific product

    Args:
        user_id: UUID of the user
        product_id: UUID of the product
        product_title: Partial title to search for

    Returns:
        Dict with product details

    Raises:
        ValidationError: Invalid input parameters
        ResourceNotFoundError: Product not found
        DatabaseError: Database operation failed
    """
    try:
        validate_uuid(user_id, "user_id")

        if not product_id and not product_title:
            raise ValidationError(
                "Either product_id or product_title is required",
                context={"product_id": product_id, "product_title": product_title}
            )

        if product_id:
            validate_uuid(product_id, "product_id")

        supabase = get_supabase_client()

        db_query = supabase.table("affiliate_products").select("*")
        db_query = db_query.eq("is_active", True)

        if product_id:
            db_query = db_query.eq("id", product_id)
        elif product_title:
            db_query = db_query.ilike("title", f"%{product_title}%")

        response = db_query.limit(1).execute()

        if not response.data or len(response.data) == 0:
            raise ResourceNotFoundError(
                "Product not found",
                context={
                    "product_id": product_id,
                    "product_title": product_title,
                    "user_id": user_id
                }
            )

        product = response.data[0]

        logger.info(f"Retrieved product details for '{product['title']}' by user {user_id}")

        details = {
            "id": product.get("id"),
            "title": product.get("title"),
            "description": product.get("description"),
            "price": float(product.get("price", 0)),
            "category": product.get("category"),
            "url": product.get("affiliate_url"),
            "image": product.get("image_url"),
            "asin": product.get("asin"),
            "features": product.get("features", [])
        }

        message = f"""
Product: {details['title']}
Price: ${details['price']:.2f}
Category: {details['category'].replace('_', ' ').title()}

Description:
{details['description'][:200]}...

You can purchase this product through our affiliate link to support Wheels & Wins.
        """.strip()

        return {
            "success": True,
            "product": details,
            "message": message
        }

    except ValidationError:
        raise
    except ResourceNotFoundError:
        raise
    except DatabaseError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error getting product details",
            extra={
                "user_id": user_id,
                "product_id": product_id,
                "product_title": product_title
            },
            exc_info=True
        )
        raise DatabaseError(
            "Failed to retrieve product details",
            context={
                "user_id": user_id,
                "product_id": product_id,
                "product_title": product_title,
                "error": str(e)
            }
        )


# Tool metadata for registration
TOOL_METADATA = {
    "name": "get_product_details",
    "description": "Get detailed information about a specific product",
    "parameters": {
        "type": "object",
        "properties": {
            "product_id": {
                "type": "string",
                "description": "UUID of the product"
            },
            "product_title": {
                "type": "string",
                "description": "Partial title to search for the product"
            }
        }
    }
}