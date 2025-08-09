from __future__ import annotations

from typing import Any, Dict

from app.models.structured_responses import StructuredResponse
from app.services.pam.mcp.tools import suggest_affiliate_product, get_user_context

__all__ = ["shop_chain"]

async def _call_shop_tools(input_text: str, user_ctx: Dict[str, Any]) -> Dict[str, Any]:
    """Invoke shop micro-agent tools."""
    context = await get_user_context(user_ctx)
    # In a real agent we'd parse user input for vehicle type and region
    vehicle_type = user_ctx.get("vehicle_type", "car")
    region = user_ctx.get("region", "au")
    product = await suggest_affiliate_product(vehicle_type, region)
    return {"context": context, "product": product}


async def shop_chain(input_text: str, user_ctx: Dict[str, Any]) -> StructuredResponse:
    """Micro-agent chain for the shop node."""
    data = await _call_shop_tools(input_text, user_ctx)
    product = data.get("product", {})
    name = product.get("name", "a product")
    answer_speech = f"I found {name} you might like."
    return StructuredResponse(
        answer_display=f"Suggested product: {name}",
        answer_speech=answer_speech,
        answer_ssml=f"<speak>{answer_speech}</speak>",
        ui_actions=[{"type": "navigate", "url": "/shop"}],
        memory_updates=data,
    )
