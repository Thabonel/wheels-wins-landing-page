from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

from langchain_core.tools import tool

CATALOG_FILE = Path(__file__).resolve().parents[6] / "data" / "affiliate_catalog.json"


@tool
async def suggest_affiliate_product(vehicle_type: str, region: str) -> Dict[str, Any]:
    """Suggest an affiliate product for a given vehicle type and region."""
    if not CATALOG_FILE.exists():
        return {}

    with open(CATALOG_FILE) as f:
        catalog: List[Dict[str, Any]] = json.load(f)

    for product in catalog:
        if product.get("vehicle_type") == vehicle_type and region in product.get("regions", []):
            return product

    for product in catalog:
        if product.get("vehicle_type") == vehicle_type:
            return product

    return {}
