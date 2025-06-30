from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.core.config import settings
import stripe

router = APIRouter()

class CheckoutRequest(BaseModel):
    priceId: str
    successUrl: str | None = None
    cancelUrl: str | None = None

@router.post("/subscription/create-checkout")
async def create_checkout_session(request: CheckoutRequest):
    try:
        stripe.api_key = settings.STRIPE_SECRET_KEY
        session = stripe.checkout.Session.create(
            line_items=[{"price": request.priceId, "quantity": 1}],
            mode="subscription",
            success_url=request.successUrl or f"{settings.SITE_URL}/payment-success",
            cancel_url=request.cancelUrl or f"{settings.SITE_URL}/payment-canceled",
            allow_promotion_codes=True,
        )
        return {"url": session.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

