"""RapidAPI Price Comparison Service

Simple, cost-effective product search and price comparison using RapidAPI.
Replaces the complex multi-provider marketplace_ecommerce.py system.

Free tier: 500-1000 requests/month
Paid: $15/mo for 50K requests

Usage:
    from app.services.external.rapidapi_price_search import search_products, compare_prices

    # Search for products
    results = await search_products("camping solar panel", max_results=10)

    # Compare prices across retailers
    comparison = await compare_prices("Goal Zero Yeti 500X")

Date: January 2026
"""

import os
import logging
import aiohttp
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# RapidAPI configuration
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
RAPIDAPI_HOST = "real-time-product-search.p.rapidapi.com"
BASE_URL = f"https://{RAPIDAPI_HOST}"


@dataclass
class ProductResult:
    """Standardized product result"""
    title: str
    price: float
    currency: str
    store: str
    url: str
    image_url: Optional[str] = None
    rating: Optional[float] = None
    reviews_count: Optional[int] = None
    in_stock: bool = True


async def search_products(
    query: str,
    country: str = "au",
    max_results: int = 20,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None
) -> Dict[str, Any]:
    """
    Search for products using RapidAPI Real-Time Product Search.

    Args:
        query: Search query (e.g., "camping solar panel")
        country: Country code (au, us, uk, etc.)
        max_results: Maximum number of results to return
        min_price: Optional minimum price filter
        max_price: Optional maximum price filter

    Returns:
        Dict with search results and metadata
    """
    if not RAPIDAPI_KEY:
        logger.warning("RAPIDAPI_KEY not configured, returning empty results")
        return {
            "success": False,
            "error": "RapidAPI key not configured",
            "products": []
        }

    try:
        headers = {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": RAPIDAPI_HOST
        }

        params = {
            "q": query,
            "country": country,
            "language": "en",
            "limit": str(max_results)
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{BASE_URL}/search",
                headers=headers,
                params=params,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status == 200:
                    data = await response.json()

                    # Parse and standardize results
                    products = []
                    for item in data.get("data", []):
                        try:
                            price = _parse_price(item.get("offer", {}).get("price", "0"))

                            # Apply price filters
                            if min_price and price < min_price:
                                continue
                            if max_price and price > max_price:
                                continue

                            product = ProductResult(
                                title=item.get("product_title", "Unknown"),
                                price=price,
                                currency=_get_currency(country),
                                store=item.get("offer", {}).get("store_name", "Unknown"),
                                url=item.get("offer", {}).get("offer_page_url", ""),
                                image_url=item.get("product_photos", [""])[0] if item.get("product_photos") else None,
                                rating=item.get("product_rating"),
                                reviews_count=item.get("product_num_reviews"),
                                in_stock=item.get("offer", {}).get("in_stock", True)
                            )
                            products.append(product)
                        except Exception as e:
                            logger.debug(f"Error parsing product: {e}")
                            continue

                    logger.info(f"RapidAPI search for '{query}' returned {len(products)} products")

                    return {
                        "success": True,
                        "query": query,
                        "country": country,
                        "products_found": len(products),
                        "products": [_product_to_dict(p) for p in products]
                    }

                elif response.status == 429:
                    logger.warning("RapidAPI rate limit exceeded")
                    return {
                        "success": False,
                        "error": "Rate limit exceeded. Try again later.",
                        "products": []
                    }

                else:
                    error_text = await response.text()
                    logger.error(f"RapidAPI error {response.status}: {error_text}")
                    return {
                        "success": False,
                        "error": f"API error: {response.status}",
                        "products": []
                    }

    except aiohttp.ClientError as e:
        logger.error(f"RapidAPI connection error: {e}")
        return {
            "success": False,
            "error": "Connection error",
            "products": []
        }
    except Exception as e:
        logger.error(f"RapidAPI search error: {e}")
        return {
            "success": False,
            "error": str(e),
            "products": []
        }


async def compare_prices(
    product_name: str,
    country: str = "au"
) -> Dict[str, Any]:
    """
    Compare prices for a specific product across retailers.

    Args:
        product_name: Product name to search for
        country: Country code

    Returns:
        Dict with price comparison results
    """
    # Search for the product
    results = await search_products(product_name, country=country, max_results=15)

    if not results.get("success") or not results.get("products"):
        return {
            "success": False,
            "error": results.get("error", "No products found"),
            "comparison": None
        }

    products = results["products"]

    # Sort by price
    sorted_products = sorted(products, key=lambda x: x["price"])

    cheapest = sorted_products[0]
    most_expensive = sorted_products[-1]

    # Calculate potential savings
    savings = most_expensive["price"] - cheapest["price"]
    savings_percentage = (savings / most_expensive["price"] * 100) if most_expensive["price"] > 0 else 0

    return {
        "success": True,
        "product_name": product_name,
        "comparison": {
            "cheapest": cheapest,
            "most_expensive": most_expensive,
            "potential_savings": round(savings, 2),
            "savings_percentage": round(savings_percentage, 1),
            "all_options": sorted_products,
            "stores_compared": len(set(p["store"] for p in products))
        },
        "message": f"Found {len(products)} listings. Save up to ${savings:.2f} ({savings_percentage:.0f}%) by buying from {cheapest['store']}!"
    }


def _parse_price(price_str: str) -> float:
    """Parse price string to float"""
    if not price_str:
        return 0.0
    # Remove currency symbols and commas
    cleaned = ''.join(c for c in str(price_str) if c.isdigit() or c == '.')
    try:
        return float(cleaned) if cleaned else 0.0
    except ValueError:
        return 0.0


def _get_currency(country: str) -> str:
    """Get currency code for country"""
    currencies = {
        "au": "AUD",
        "us": "USD",
        "uk": "GBP",
        "ca": "CAD",
        "nz": "NZD",
        "eu": "EUR"
    }
    return currencies.get(country.lower(), "USD")


def _product_to_dict(product: ProductResult) -> Dict[str, Any]:
    """Convert ProductResult to dict"""
    return {
        "title": product.title,
        "price": product.price,
        "currency": product.currency,
        "store": product.store,
        "url": product.url,
        "image_url": product.image_url,
        "rating": product.rating,
        "reviews_count": product.reviews_count,
        "in_stock": product.in_stock
    }


# Convenience function for PAM tools
async def search_rv_gear(
    query: str,
    max_price: Optional[float] = None
) -> Dict[str, Any]:
    """
    Search for RV and camping gear - convenience wrapper.

    Args:
        query: Search query
        max_price: Optional maximum price

    Returns:
        Search results
    """
    # Enhance query for RV-specific results
    enhanced_query = f"{query} camping RV caravan"

    return await search_products(
        query=enhanced_query,
        country="au",  # Default to Australia for Wheels & Wins
        max_price=max_price
    )
