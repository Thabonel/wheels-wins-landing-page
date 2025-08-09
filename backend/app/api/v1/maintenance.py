from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.services.maintenance_service import maintenance_service

router = APIRouter()

@router.get("/maintenance/{user_id}")
async def list_records(user_id: str):
    return await maintenance_service.list_records(user_id)

@router.get("/maintenance/record/{record_id}")
async def get_record(record_id: str):
    record = await maintenance_service.get_record(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record

@router.post("/maintenance", status_code=201)
async def create_record(payload: Dict[str, Any]):
    return await maintenance_service.create_record(payload)

@router.put("/maintenance/{record_id}")
async def update_record(record_id: str, payload: Dict[str, Any]):
    record = await maintenance_service.update_record(record_id, payload)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record

@router.delete("/maintenance/{record_id}")
async def delete_record(record_id: str):
    success = await maintenance_service.delete_record(record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"success": True}
