"""Medical record and health tools for PAM"""

from .get_medical_records import get_medical_records
from .search_medical_records import search_medical_records
from .get_medications import get_medications
from .get_emergency_info import get_emergency_info

__all__ = [
    "get_medical_records",
    "search_medical_records",
    "get_medications",
    "get_emergency_info",
]
