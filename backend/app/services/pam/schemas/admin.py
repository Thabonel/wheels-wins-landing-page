"""Admin Tool Validation Schemas

Pydantic schemas for PAM admin tool input validation.

Created: January 15, 2025 (Amendment #4)
"""

from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, validator, Field

from .base import BaseToolInput


# Enums for admin tools
class KnowledgeType(str, Enum):
    """Types of knowledge that can be added to PAM"""
    location_tip = "location_tip"
    travel_rule = "travel_rule"
    seasonal_advice = "seasonal_advice"
    general_knowledge = "general_knowledge"
    policy = "policy"
    warning = "warning"


class KnowledgeCategory(str, Enum):
    """Categories for organizing knowledge"""
    travel = "travel"
    budget = "budget"
    social = "social"
    shop = "shop"
    general = "general"


# Admin tool schemas
class AddKnowledgeInput(BaseToolInput):
    """Validation for add_knowledge tool

    Admin tool for teaching PAM new information with security validation.
    """
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=5000)
    knowledge_type: KnowledgeType
    category: KnowledgeCategory
    location_context: Optional[str] = None
    date_context: Optional[str] = None
    priority: int = Field(default=5, ge=1, le=10)
    tags: Optional[List[str]] = None

    @validator('title', 'content')
    def strip_whitespace(cls, v):
        """Strip leading/trailing whitespace"""
        return v.strip() if v else v

    @validator('tags')
    def validate_tags(cls, v):
        """Validate tags list"""
        if v is None:
            return v
        if len(v) > 20:
            raise ValueError('Maximum 20 tags allowed')
        return [tag.strip() for tag in v if tag.strip()]


class SearchKnowledgeInput(BaseToolInput):
    """Validation for search_knowledge tool

    Searches PAM's admin knowledge base with filtering.
    """
    query: Optional[str] = None
    category: Optional[KnowledgeCategory] = None
    knowledge_type: Optional[KnowledgeType] = None
    location_context: Optional[str] = None
    tags: Optional[List[str]] = None
    min_priority: int = Field(default=1, ge=1, le=10)
    limit: int = Field(default=10, ge=1, le=100)

    @validator('query')
    def strip_query(cls, v):
        """Strip whitespace from query"""
        return v.strip() if v else v
