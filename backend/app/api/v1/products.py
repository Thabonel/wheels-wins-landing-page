from fastapi import APIRouter, HTTPException
from typing import Dict, Any
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
