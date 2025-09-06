from datetime import datetime, date
from enum import Enum
import json

class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles datetime objects and enums"""
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        elif isinstance(obj, Enum):
            return obj.value
        return super().default(obj)
