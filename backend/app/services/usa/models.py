"""
Data Models for Universal Site Access

All dataclasses and Pydantic models for the USA service.
"""

import os
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Dict, Any, Optional

from cryptography.fernet import Fernet

# Encryption key management - use environment variable or generate a session key
# In production, CREDENTIAL_ENCRYPTION_KEY should be set in environment
_ENCRYPTION_KEY: Optional[bytes] = None


def _get_encryption_key() -> bytes:
    """Get or generate the encryption key for sensitive data."""
    global _ENCRYPTION_KEY
    if _ENCRYPTION_KEY is None:
        env_key = os.environ.get("CREDENTIAL_ENCRYPTION_KEY")
        if env_key:
            _ENCRYPTION_KEY = env_key.encode()
        else:
            # Generate a session key if not configured
            # This means encrypted values won't persist across restarts
            _ENCRYPTION_KEY = Fernet.generate_key()
    return _ENCRYPTION_KEY


def _get_fernet() -> Fernet:
    """Get Fernet instance for encryption/decryption."""
    return Fernet(_get_encryption_key())


class ActionType(str, Enum):
    """Types of actions that can be performed on page elements"""
    CLICK = "click"
    TYPE = "type"
    SELECT = "select"
    SCROLL = "scroll"
    EXTRACT = "extract"
    WAIT = "wait"
    NAVIGATE = "navigate"
    SUBMIT = "submit"
    HOVER = "hover"
    FILL_FORM = "fill_form"


class WaitCondition(str, Enum):
    """Conditions to wait for after an action"""
    NONE = "none"
    NAVIGATION = "navigation"
    NETWORK_IDLE = "network_idle"
    ELEMENT_VISIBLE = "element_visible"
    ELEMENT_HIDDEN = "element_hidden"
    TEXT_PRESENT = "text_present"
    TIMEOUT = "timeout"


class FieldType(str, Enum):
    """Types of form fields that can be auto-detected"""
    EMAIL = "email"
    PHONE = "phone"
    NAME = "name"
    FIRST_NAME = "first_name"
    LAST_NAME = "last_name"
    ADDRESS = "address"
    CITY = "city"
    STATE = "state"
    ZIP_CODE = "zip_code"
    COUNTRY = "country"
    DATE = "date"
    DATE_CHECKIN = "date_checkin"
    DATE_CHECKOUT = "date_checkout"
    NUMBER = "number"
    GUESTS = "guests"
    ADULTS = "adults"
    CHILDREN = "children"
    PASSWORD = "password"
    CREDIT_CARD = "credit_card"
    CVV = "cvv"
    EXPIRY = "expiry"
    SEARCH = "search"
    MESSAGE = "message"
    UNKNOWN = "unknown"


class RecoveryStrategy(str, Enum):
    """Strategies for error recovery"""
    RETRY = "retry"
    ALTERNATIVE_SELECTOR = "alternative_selector"
    REINDEX_PAGE = "reindex_page"
    SCROLL_AND_RETRY = "scroll_and_retry"
    WAIT_AND_RETRY = "wait_and_retry"
    USER_NOTIFICATION = "user_notification"
    SKIP = "skip"
    ABORT = "abort"


@dataclass
class PageContext:
    """Context information about the current page state"""
    url: str
    title: str
    domain: str
    page_type: Optional[str] = None  # e.g., "search", "form", "listing", "checkout"
    element_count: int = 0
    forms_detected: int = 0
    has_captcha: bool = False
    requires_login: bool = False
    last_indexed: Optional[datetime] = None
    extra_context: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ActionStep:
    """A single step in an action plan"""
    action_type: ActionType
    target_element: Optional[int] = None  # Element index from indexer
    value: Optional[str] = None  # Value to type, select, etc.
    wait_condition: WaitCondition = WaitCondition.NONE
    wait_timeout_ms: int = 5000
    description: str = ""
    on_error: RecoveryStrategy = RecoveryStrategy.RETRY
    alternative_targets: List[int] = field(default_factory=list)


@dataclass
class ActionPlan:
    """A plan of actions to execute to fulfill user intent"""
    steps: List[ActionStep]
    estimated_time_ms: int
    confidence: float  # 0.0 to 1.0
    description: str = ""
    requires_confirmation: bool = False
    warnings: List[str] = field(default_factory=list)


@dataclass
class ActionResult:
    """Result of executing a single action"""
    success: bool
    action_type: ActionType
    element_index: Optional[int] = None
    error_message: Optional[str] = None
    execution_time_ms: int = 0
    page_changed: bool = False
    new_url: Optional[str] = None
    extracted_data: Optional[Any] = None
    screenshot_path: Optional[str] = None


@dataclass
class FormField:
    """
    Information about a detected form field.

    Security: Sensitive fields (passwords, credit cards, etc.) are encrypted
    at rest and redacted in logs/repr output.
    """
    index: int  # Element index from indexer
    field_type: FieldType
    label: str = ""
    placeholder: str = ""
    name_attr: str = ""
    id_attr: str = ""
    is_required: bool = False
    current_value: str = ""
    options: List[str] = field(default_factory=list)  # For select fields
    validation_pattern: Optional[str] = None
    sensitive: bool = False  # If True, value is encrypted and redacted in logs
    _encrypted_value: Optional[bytes] = field(default=None, repr=False)

    def __post_init__(self):
        """Auto-detect sensitive fields based on field type."""
        sensitive_types = {
            FieldType.PASSWORD,
            FieldType.CREDIT_CARD,
            FieldType.CVV,
        }
        if self.field_type in sensitive_types:
            self.sensitive = True
            # Encrypt current_value if it was provided and field is sensitive
            if self.current_value and self.sensitive:
                self.set_sensitive_value(self.current_value)
                self.current_value = ""  # Clear plaintext

    def __repr__(self) -> str:
        """Redact sensitive values in string representation."""
        value_display = "[REDACTED]" if self.sensitive else self.current_value
        return (
            f"FormField(index={self.index}, field_type={self.field_type}, "
            f"label='{self.label}', sensitive={self.sensitive}, "
            f"value='{value_display}')"
        )

    def set_sensitive_value(self, value: str) -> None:
        """
        Set a sensitive value with encryption.

        Args:
            value: The plaintext value to encrypt and store
        """
        if not value:
            self._encrypted_value = None
            return

        fernet = _get_fernet()
        self._encrypted_value = fernet.encrypt(value.encode())
        self.sensitive = True
        # Ensure plaintext is cleared
        self.current_value = ""

    def get_value(self) -> str:
        """
        Get the field value, decrypting if sensitive.

        Returns:
            The plaintext value (decrypted if sensitive)
        """
        if self.sensitive and self._encrypted_value:
            fernet = _get_fernet()
            return fernet.decrypt(self._encrypted_value).decode()
        return self.current_value


@dataclass
class FormResult:
    """Result of filling a form"""
    success: bool
    fields_filled: int
    fields_failed: int
    field_results: Dict[int, ActionResult] = field(default_factory=dict)
    error_message: Optional[str] = None
    submitted: bool = False


@dataclass
class WorkflowStep:
    """A step in a multi-step workflow"""
    name: str
    action: ActionType
    target: Optional[int] = None  # Element index or None for page-level actions
    value: Optional[str] = None
    wait_for: WaitCondition = WaitCondition.NONE
    wait_timeout_ms: int = 10000
    on_error: RecoveryStrategy = RecoveryStrategy.RETRY
    max_retries: int = 3
    conditions: Dict[str, Any] = field(default_factory=dict)  # Preconditions to check


@dataclass
class WorkflowResult:
    """Result of executing a workflow"""
    success: bool
    steps_completed: int
    total_steps: int
    step_results: List[ActionResult] = field(default_factory=list)
    error_step: Optional[int] = None
    error_message: Optional[str] = None
    execution_time_ms: int = 0
    final_url: Optional[str] = None
    extracted_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SitePattern:
    """Learned pattern for interacting with a specific site"""
    domain: str
    page_type: str
    pattern_id: str
    element_patterns: Dict[str, Dict] = field(default_factory=dict)  # role -> selector patterns
    form_mappings: Dict[str, int] = field(default_factory=dict)  # field_type -> typical element index
    navigation_flows: Dict[str, List[WorkflowStep]] = field(default_factory=dict)
    success_rate: float = 0.0
    total_uses: int = 0
    last_used: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class RecoveryResult:
    """Result of an error recovery attempt"""
    success: bool
    strategy_used: RecoveryStrategy
    new_element_index: Optional[int] = None
    should_continue: bool = True
    message: str = ""
    page_reindexed: bool = False


@dataclass
class ProductInfo:
    """Extracted product information from a page"""
    name: str
    price: Optional[float] = None
    currency: str = "USD"
    description: str = ""
    images: List[str] = field(default_factory=list)
    availability: str = ""
    rating: Optional[float] = None
    review_count: int = 0
    attributes: Dict[str, str] = field(default_factory=dict)
    url: str = ""


@dataclass
class CampgroundInfo:
    """Extracted campground/RV park information"""
    name: str
    address: str = ""
    city: str = ""
    state: str = ""
    phone: str = ""
    website: str = ""
    price_per_night: Optional[float] = None
    rating: Optional[float] = None
    review_count: int = 0
    amenities: List[str] = field(default_factory=list)
    site_types: List[str] = field(default_factory=list)  # full hookup, partial, tent, etc.
    max_rv_length: Optional[int] = None
    pet_friendly: Optional[bool] = None
    wifi: Optional[bool] = None
    availability: str = ""
    images: List[str] = field(default_factory=list)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
