from typing import Any, Dict, Optional
from datetime import datetime, timedelta
from app.database.supabase_client import get_supabase_client

class ProductsService:
    def __init__(self):
        self.client = get_supabase_client()

    async def create_product(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        result = self.client.table("affiliate_products").insert(data).execute()
        return result.data[0] if result.data else None

    async def get_product(self, product_id: str) -> Optional[Dict[str, Any]]:
        result = (
            self.client.table("affiliate_products")
            .select("*")
            .eq("id", product_id)
            .single()
            .execute()
        )
        return result.data if result.data else None

    async def update_product(self, product_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        result = (
            self.client.table("affiliate_products")
            .update(data)
            .eq("id", product_id)
            .execute()
        )
        return result.data[0] if result.data else None

    async def delete_product(self, product_id: str) -> bool:
        result = self.client.table("affiliate_products").delete().eq("id", product_id).execute()
        return bool(result.data)

    async def list_products(self) -> list[Dict[str, Any]]:
        result = self.client.table("affiliate_products").select("*").execute()
        return result.data or []

    async def update_product_availability(
        self,
        product_id: str,
        availability_status: str,
        region: str = "AU"
    ) -> Optional[Dict[str, Any]]:
        """Update product availability status and log the change"""
        # Get current product data
        product_result = (
            self.client.table("affiliate_products")
            .select("*")
            .eq("id", product_id)
            .single()
            .execute()
        )

        if not product_result.data:
            return None

        current_product = product_result.data
        old_status = current_product.get("availability_status", "unknown")
        regional_asins = current_product.get("regional_asins", {})
        asin = regional_asins.get(region, "")

        # Update product availability
        update_result = (
            self.client.table("affiliate_products")
            .update({
                "availability_status": availability_status,
                "last_availability_check": datetime.utcnow().isoformat(),
                "availability_change_detected": old_status != availability_status
            })
            .eq("id", product_id)
            .execute()
        )

        # Log availability change
        self.client.table("product_availability_log").insert({
            "product_id": product_id,
            "region": region,
            "asin": asin,
            "was_available": old_status == "available",
            "is_available": availability_status == "available",
            "source": "manual"
        }).execute()

        return update_result.data[0] if update_result.data else None

    async def update_product_price(
        self,
        product_id: str,
        region: str,
        new_price: float,
        currency: str = "AUD"
    ) -> Optional[Dict[str, Any]]:
        """Update product price and log the change"""
        # Get current product data
        product_result = (
            self.client.table("affiliate_products")
            .select("*")
            .eq("id", product_id)
            .single()
            .execute()
        )

        if not product_result.data:
            return None

        current_product = product_result.data
        regional_prices = current_product.get("regional_prices", {})
        regional_asins = current_product.get("regional_asins", {})
        old_price = regional_prices.get(region, {}).get("amount", 0)
        asin = regional_asins.get(region, "")

        # Update regional prices
        regional_prices[region] = {"amount": new_price, "currency": currency}

        # Calculate price change percentage
        price_change_percent = 0.0
        if old_price > 0:
            price_change_percent = ((new_price - old_price) / old_price) * 100

        # Update product prices
        update_result = (
            self.client.table("affiliate_products")
            .update({
                "regional_prices": regional_prices,
                "last_price_check": datetime.utcnow().isoformat(),
                "price_change_detected": abs(price_change_percent) > 1.0
            })
            .eq("id", product_id)
            .execute()
        )

        # Log price change
        self.client.table("product_price_history").insert({
            "product_id": product_id,
            "region": region,
            "asin": asin,
            "old_price": old_price,
            "new_price": new_price,
            "currency": currency,
            "price_change_percent": round(price_change_percent, 2),
            "source": "manual"
        }).execute()

        return update_result.data[0] if update_result.data else None

    async def get_price_history(
        self,
        product_id: str,
        region: str = "AU",
        days: int = 30
    ) -> list[Dict[str, Any]]:
        """Get price history for a product"""
        since_date = datetime.utcnow() - timedelta(days=days)

        result = (
            self.client.table("product_price_history")
            .select("*")
            .eq("product_id", product_id)
            .eq("region", region)
            .gte("checked_at", since_date.isoformat())
            .order("checked_at", desc=True)
            .execute()
        )

        return result.data or []

    async def get_availability_log(
        self,
        product_id: str,
        region: str = "AU",
        days: int = 30
    ) -> list[Dict[str, Any]]:
        """Get availability log for a product"""
        since_date = datetime.utcnow() - timedelta(days=days)

        result = (
            self.client.table("product_availability_log")
            .select("*")
            .eq("product_id", product_id)
            .eq("region", region)
            .gte("checked_at", since_date.isoformat())
            .order("checked_at", desc=True)
            .execute()
        )

        return result.data or []

products_service = ProductsService()
