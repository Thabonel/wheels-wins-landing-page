"""
Site-Agnostic Data Extraction - Pydantic Schemas
Defines data models for extraction pipeline
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class PageType(str, Enum):
    """Classification of page types"""
    PRODUCT = "product"
    CAMPGROUND = "campground"
    BUSINESS = "business"
    ARTICLE = "article"
    COMPARISON = "comparison"
    LISTING = "listing"
    FORM = "form"
    UNKNOWN = "unknown"


class PageState(BaseModel):
    """Captured state of a rendered web page"""
    url: str = Field(..., description="Original URL")
    html: str = Field(..., description="Rendered HTML content")
    snapshot: str = Field(..., description="Accessibility tree snapshot")
    screenshot: Optional[bytes] = Field(None, description="Page screenshot")
    title: str = Field("", description="Page title")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Page metadata")
    captured_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True


class ElementInfo(BaseModel):
    """Information about a DOM element from accessibility snapshot"""
    index: int = Field(..., description="Numeric index in snapshot")
    role: str = Field(..., description="ARIA role")
    name: str = Field("", description="Accessible name")
    text: str = Field("", description="Text content")
    attributes: Dict[str, str] = Field(default_factory=dict)
    children_indices: List[int] = Field(default_factory=list)


class ContentRegion(BaseModel):
    """Identified content region in the DOM"""
    name: str = Field(..., description="Region name")
    selector: str = Field(..., description="CSS selector")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score")
    content_type: str = Field(..., description="Type of content")
    element_count: int = Field(0, description="Number of elements")


class DOMAnalysis(BaseModel):
    """Analysis of DOM structure"""
    page_type: PageType = Field(..., description="Classified page type")
    content_regions: List[ContentRegion] = Field(default_factory=list)
    element_index: Dict[int, ElementInfo] = Field(default_factory=dict)
    primary_content_selector: Optional[str] = Field(None)
    navigation_structure: List[str] = Field(default_factory=list)
    form_fields: List[Dict[str, Any]] = Field(default_factory=list)


class ClassificationResult(BaseModel):
    """Result of page classification"""
    category: PageType = Field(..., description="Page category")
    confidence: float = Field(..., ge=0, le=1, description="Classification confidence")
    reasoning: str = Field("", description="Explanation for classification")
    key_elements: List[str] = Field(default_factory=list, description="Key elements found")
    available_fields: List[str] = Field(default_factory=list, description="Fields available for extraction")


class FieldExtraction(BaseModel):
    """Single extracted field with confidence"""
    field_name: str
    value: Any
    confidence: float = Field(..., ge=0, le=1)
    source_selector: Optional[str] = None


class ProductData(BaseModel):
    """Extracted product data"""
    name: Optional[str] = None
    price: Optional[str] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    rating: Optional[float] = None
    review_count: Optional[int] = None
    availability: Optional[str] = None
    brand: Optional[str] = None
    sku: Optional[str] = None
    categories: List[str] = Field(default_factory=list)
    specifications: Dict[str, str] = Field(default_factory=dict)
    variants: List[Dict[str, Any]] = Field(default_factory=list)


class CampgroundData(BaseModel):
    """Extracted campground data"""
    name: Optional[str] = None
    location: Optional[str] = None
    coordinates: Optional[Dict[str, float]] = None
    description: Optional[str] = None
    amenities: List[str] = Field(default_factory=list)
    site_types: List[str] = Field(default_factory=list)
    price_range: Optional[str] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    photos: List[str] = Field(default_factory=list)
    availability: Optional[str] = None
    contact_info: Dict[str, str] = Field(default_factory=dict)
    rv_specifics: Dict[str, Any] = Field(default_factory=dict)
    pet_policy: Optional[str] = None
    reservation_url: Optional[str] = None


class BusinessData(BaseModel):
    """Extracted business data"""
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    hours: Dict[str, str] = Field(default_factory=dict)
    rating: Optional[float] = None
    review_count: Optional[int] = None
    categories: List[str] = Field(default_factory=list)
    price_level: Optional[str] = None
    description: Optional[str] = None
    photos: List[str] = Field(default_factory=list)
    services: List[str] = Field(default_factory=list)
    coordinates: Optional[Dict[str, float]] = None


class ComparisonData(BaseModel):
    """Extracted comparison data"""
    title: Optional[str] = None
    items: List[Dict[str, Any]] = Field(default_factory=list)
    comparison_criteria: List[str] = Field(default_factory=list)
    winner: Optional[str] = None
    summary: Optional[str] = None


class ExtractionPattern(BaseModel):
    """Cached extraction pattern for a URL/domain"""
    url_pattern: str = Field(..., description="URL pattern matched")
    page_type: PageType
    field_selectors: Dict[str, str] = Field(default_factory=dict)
    confidence: float = Field(..., ge=0, le=1)
    success_rate: float = Field(1.0, ge=0, le=1)
    usage_count: int = Field(1)
    last_used: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ExtractionResult(BaseModel):
    """Final extraction result"""
    success: bool = Field(..., description="Whether extraction succeeded")
    url: str = Field(..., description="Source URL")
    page_type: PageType = Field(..., description="Detected page type")
    confidence: float = Field(..., ge=0, le=1, description="Overall confidence")
    data: Dict[str, Any] = Field(default_factory=dict, description="Extracted data")
    errors: List[str] = Field(default_factory=list, description="Any errors encountered")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Extraction metadata")
    extracted_at: datetime = Field(default_factory=datetime.utcnow)
    processing_time_ms: Optional[float] = None

    def to_formatted_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with formatted datetime"""
        result = self.model_dump()
        result["extracted_at"] = self.extracted_at.isoformat()
        return result
