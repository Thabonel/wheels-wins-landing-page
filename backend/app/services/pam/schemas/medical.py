"""
Pydantic validation schemas for Medical tools
"""

from pydantic import Field, validator
from typing import Optional
from enum import Enum

from app.services.pam.schemas.base import BaseToolInput


class MedicalRecordType(str, Enum):
    """Valid medical record types"""
    LAB_RESULT = "lab_result"
    PRESCRIPTION = "prescription"
    DOCTOR_NOTE = "doctor_note"
    IMAGING = "imaging"
    VACCINATION = "vaccination"
    OTHER = "other"


class GetMedicalRecordsInput(BaseToolInput):
    """Validation for get_medical_records tool"""

    record_type: Optional[str] = Field(
        None,
        description="Filter by record type",
    )
    limit: int = Field(
        20,
        gt=0,
        le=50,
        description="Max records to return",
    )

    @validator("record_type")
    def validate_record_type(cls, v):
        if v is not None:
            valid = [t.value for t in MedicalRecordType]
            if v not in valid:
                raise ValueError(
                    f"record_type must be one of: {', '.join(valid)}"
                )
        return v


class SearchMedicalRecordsInput(BaseToolInput):
    """Validation for search_medical_records tool"""

    query: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Search term for medical documents",
    )
    limit: int = Field(
        10,
        gt=0,
        le=50,
        description="Max results to return",
    )

    @validator("query")
    def validate_query(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("query cannot be empty")
        return v


class GetMedicationsInput(BaseToolInput):
    """Validation for get_medications tool"""

    active_only: bool = Field(
        True,
        description="Only return active medications",
    )


class GetEmergencyInfoInput(BaseToolInput):
    """Validation for get_emergency_info tool - just user_id from base"""
    pass
