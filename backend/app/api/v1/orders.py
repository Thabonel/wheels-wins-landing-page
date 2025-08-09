from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.services.orders_service import orders_service

router = APIRouter()

@router.get("/orders")
async def list_orders():
    return await orders_service.list_orders()

@router.get("/orders/{order_id}")
async def get_order(order_id: str):
    order = await orders_service.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.post("/orders", status_code=201)
async def create_order(payload: Dict[str, Any]):
    return await orders_service.create_order(payload)

@router.put("/orders/{order_id}")
async def update_order(order_id: str, payload: Dict[str, Any]):
    order = await orders_service.update_order(order_id, payload)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.delete("/orders/{order_id}")
async def delete_order(order_id: str):
    success = await orders_service.delete_order(order_id)
    if not success:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"success": True}
