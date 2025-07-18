from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.services.custom_routes_service import custom_routes_service

router = APIRouter()

@router.get("/routes/{user_id}")
async def list_routes(user_id: str):
    return await custom_routes_service.list_routes(user_id)

@router.get("/route/{route_id}")
async def get_route(route_id: str):
    route = await custom_routes_service.get_route(route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return route

@router.post("/routes", status_code=201)
async def create_route(payload: Dict[str, Any]):
    return await custom_routes_service.create_route(payload)

@router.put("/route/{route_id}")
async def update_route(route_id: str, payload: Dict[str, Any]):
    route = await custom_routes_service.update_route(route_id, payload)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return route

@router.delete("/route/{route_id}")
async def delete_route(route_id: str):
    success = await custom_routes_service.delete_route(route_id)
    if not success:
        raise HTTPException(status_code=404, detail="Route not found")
    return {"success": True}
