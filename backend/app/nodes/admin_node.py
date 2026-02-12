from typing import Dict, Any
from app.database.supabase_client import get_supabase_client
from app.core.logging import setup_logging, get_logger

setup_logging()
logger = get_logger("admin_node")

class AdminNode:
    """Administrative utilities and dashboard data access."""

    def __init__(self):
        self.supabase = get_supabase_client()

    async def dashboard_overview(self) -> Dict[str, Any]:
        try:
            users = self.supabase.table("admin_users").select("id").execute()
            products = (
                self.supabase.table("affiliate_products").select("id").eq("is_active", True).execute()
            )
            return {
                "success": True,
                "data": {
                    "total_users": len(users.data) if users.data else 0,
                    "active_products": len(products.data) if products.data else 0,
                },
                "message": "Admin dashboard overview",
            }
        except Exception as e:
            logger.error(f"Error fetching dashboard overview: {e}")
            return {"success": False, "error": str(e)}

    async def process(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        if "overview" in message.lower():
            return await self.dashboard_overview()
        return {"success": False, "message": "Unknown admin command"}

admin_node = AdminNode()
