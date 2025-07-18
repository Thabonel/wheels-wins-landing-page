from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional

class ThinkParams(BaseModel):
    problem_type: str = Field(default="general")
    context: Dict[str, Any] = Field(default_factory=dict)
    user_request: str

    @validator("problem_type")
    def check_problem_type(cls, v):
        allowed = {
            "trip_planning",
            "route_analysis",
            "budget_planning",
            "complex_logistics",
            "problem_solving",
            "decision_making",
            "general",
        }
        if v not in allowed:
            raise ValueError(f"Invalid problem_type: {v}")
        return v

class RecentMemoryParams(BaseModel):
    limit: int = Field(default=10, ge=1, le=100)
    days_back: int = Field(default=7, ge=1, le=365)


