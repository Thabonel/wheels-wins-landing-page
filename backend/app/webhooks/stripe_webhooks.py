import json
import logging

from fastapi import APIRouter, Request, HTTPException
import stripe

from app.core.config import settings
from app.core.database import get_supabase_client

router = APIRouter(tags=["Webhooks"])

stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", None)
WEBHOOK_SECRET = getattr(settings, "STRIPE_WEBHOOK_SECRET", "")
logger = logging.getLogger(__name__)


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    try:
        if WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
        else:
            event = stripe.Event.construct_from(json.loads(payload.decode()), stripe.api_key)
    except Exception as exc:
        logger.error(f"Stripe webhook error: {exc}")
        raise HTTPException(status_code=400, detail="Invalid payload")

    if event.get("type") == "checkout.session.completed":
        session = event["data"]["object"]
        record = {
            "session_id": session.get("id"),
            "customer_email": session.get("customer_details", {}).get("email"),
            "amount_total": session.get("amount_total"),
            "currency": session.get("currency"),
            "affiliate_id": (session.get("metadata") or {}).get("affiliate_id"),
        }
        supabase = get_supabase_client()
        try:
            supabase.table("affiliate_sales").insert(record).execute()
        except Exception as exc:
            if 'does not exist' in str(exc).lower():
                logger.info(f"affiliate_sales table doesn't exist yet - skipping webhook storage")
            else:
                logger.error(f"Failed to store affiliate sale: {exc}")
                raise HTTPException(status_code=500, detail="Supabase insert failed")

    return {"status": "success"}
