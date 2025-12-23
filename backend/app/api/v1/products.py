from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from app.services.products_service import products_service

router = APIRouter()

@router.get("/products")
async def list_products():
    return await products_service.list_products()

@router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await products_service.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.post("/products", status_code=201)
async def create_product(payload: Dict[str, Any]):
    return await products_service.create_product(payload)

@router.put("/products/{product_id}")
async def update_product(product_id: str, payload: Dict[str, Any]):
    product = await products_service.update_product(product_id, payload)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    success = await products_service.delete_product(product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True}

@router.patch("/products/{product_id}/availability")
async def update_product_availability(
    product_id: str,
    availability_status: str = Body(..., embed=True),
    region: str = Body("AU", embed=True)
):
    """Manually update product availability status"""
    valid_statuses = ['available', 'unavailable', 'unknown', 'checking']
    if availability_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    result = await products_service.update_product_availability(
        product_id, availability_status, region
    )
    if not result:
        raise HTTPException(status_code=404, detail="Product not found")
    return result

@router.patch("/products/{product_id}/price")
async def update_product_price(
    product_id: str,
    region: str = Body(..., embed=True),
    new_price: float = Body(..., embed=True),
    currency: str = Body("AUD", embed=True)
):
    """Manually update product price"""
    if new_price < 0:
        raise HTTPException(status_code=400, detail="Price must be positive")

    result = await products_service.update_product_price(
        product_id, region, new_price, currency
    )
    if not result:
        raise HTTPException(status_code=404, detail="Product not found")
    return result

@router.get("/products/{product_id}/price-history")
async def get_product_price_history(
    product_id: str,
    region: str = "AU",
    days: int = 30
):
    """Get price history for a product in a specific region"""
    if days < 1 or days > 365:
        raise HTTPException(status_code=400, detail="Days must be between 1 and 365")

    history = await products_service.get_price_history(product_id, region, days)
    return {
        "product_id": product_id,
        "region": region,
        "days": days,
        "history": history
    }

@router.get("/products/{product_id}/availability-log")
async def get_product_availability_log(
    product_id: str,
    region: str = "AU",
    days: int = 30
):
    """Get availability log for a product"""
    if days < 1 or days > 365:
        raise HTTPException(status_code=400, detail="Days must be between 1 and 365")

    log = await products_service.get_availability_log(product_id, region, days)
    return {
        "product_id": product_id,
        "region": region,
        "days": days,
        "log": log
    }
