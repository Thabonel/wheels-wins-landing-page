"""
JSON Serialization Utilities
Provides custom JSON encoders for handling Python objects that aren't natively JSON serializable.
"""

import json
from datetime import datetime, date
from typing import Any


class DateTimeEncoder(json.JSONEncoder):
    """
    Custom JSON encoder that handles datetime objects by converting them to ISO format strings.
    
    Usage:
        json.dumps(data, cls=DateTimeEncoder, ensure_ascii=False)
    """
    def default(self, obj: Any) -> Any:
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)


def safe_json_dumps(data: Any, **kwargs) -> str:
    """
    Safely serialize data to JSON string with datetime handling.
    
    Args:
        data: Data to serialize
        **kwargs: Additional arguments passed to json.dumps
        
    Returns:
        JSON string with datetime objects properly serialized
    """
    return json.dumps(data, cls=DateTimeEncoder, ensure_ascii=False, **kwargs)


def safe_json_loads(json_str: str, **kwargs) -> Any:
    """
    Safely deserialize JSON string to Python object.
    
    Args:
        json_str: JSON string to deserialize
        **kwargs: Additional arguments passed to json.loads
        
    Returns:
        Python object
    """
    return json.loads(json_str, **kwargs)