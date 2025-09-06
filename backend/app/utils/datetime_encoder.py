from datetime import datetime, date
from enum import Enum
import json

class DateTimeEncoder(json.JSONEncoder):
    """
    Custom JSON encoder that handles datetime objects and enums.
    Specifically designed to prevent PAMEventType and ErrorCode serialization errors.
    """
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        elif isinstance(obj, Enum):
            # Handle all enum types by returning their value
            return obj.value
        return super().default(obj)
