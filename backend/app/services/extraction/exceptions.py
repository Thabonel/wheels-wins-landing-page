"""
Site-Agnostic Data Extraction - Custom Exceptions
Provides meaningful exception classes for debugging and error handling
"""


class ExtractionError(Exception):
    """Base exception for extraction module"""

    def __init__(self, message: str, url: str = None, context: dict = None):
        self.url = url
        self.context = context or {}
        super().__init__(message)

    def __str__(self):
        base = super().__str__()
        if self.url:
            base = f"{base} (url={self.url})"
        if self.context:
            context_str = ", ".join(f"{k}={v}" for k, v in self.context.items())
            base = f"{base} [{context_str}]"
        return base


class BrowserError(ExtractionError):
    """Browser-related errors during page capture"""

    def __init__(self, message: str, url: str = None, context: dict = None):
        super().__init__(f"Browser error: {message}", url, context)


class BrowserInitializationError(BrowserError):
    """Failed to initialize or start the browser"""

    def __init__(self, message: str, context: dict = None):
        super().__init__(f"Initialization failed: {message}", context=context)


class NavigationError(BrowserError):
    """Page navigation failures (failed to load, timeout, etc.)"""

    def __init__(self, message: str, url: str, status_code: int = None, context: dict = None):
        ctx = context or {}
        if status_code:
            ctx["status_code"] = status_code
        super().__init__(f"Navigation failed: {message}", url, ctx)


class PageLoadError(NavigationError):
    """Page failed to load (no response received)"""

    def __init__(self, url: str, context: dict = None):
        super().__init__("Failed to load page - no response received", url, context=context)


class NavigationTimeoutError(BrowserError):
    """Operation timed out waiting for page or element"""

    def __init__(self, url: str, timeout_ms: int, operation: str = "navigation", context: dict = None):
        ctx = context or {}
        ctx["timeout_ms"] = timeout_ms
        ctx["operation"] = operation
        super().__init__(f"Timeout after {timeout_ms}ms during {operation}", url, ctx)


class ScreenshotError(BrowserError):
    """Failed to capture screenshot"""

    def __init__(self, url: str, reason: str = None, context: dict = None):
        msg = "Failed to capture screenshot"
        if reason:
            msg = f"{msg}: {reason}"
        super().__init__(msg, url, context)


class AccessibilitySnapshotError(BrowserError):
    """Failed to create accessibility snapshot"""

    def __init__(self, url: str, reason: str = None, context: dict = None):
        msg = "Failed to create accessibility snapshot"
        if reason:
            msg = f"{msg}: {reason}"
        super().__init__(msg, url, context)


class ContentExtractionError(ExtractionError):
    """Failed to extract content from page"""

    def __init__(self, message: str, url: str = None, page_type: str = None, context: dict = None):
        ctx = context or {}
        if page_type:
            ctx["page_type"] = page_type
        super().__init__(f"Content extraction failed: {message}", url, ctx)


class DOMAnalysisError(ExtractionError):
    """Failed to analyze DOM structure"""

    def __init__(self, message: str, url: str = None, context: dict = None):
        super().__init__(f"DOM analysis failed: {message}", url, context)


class ClassificationError(ExtractionError):
    """Failed to classify page type"""

    def __init__(self, message: str, url: str = None, context: dict = None):
        super().__init__(f"Classification failed: {message}", url, context)


class MetadataExtractionError(ExtractionError):
    """Failed to extract page metadata (non-critical, logged as warning)"""

    def __init__(self, message: str, url: str = None, field: str = None, context: dict = None):
        ctx = context or {}
        if field:
            ctx["field"] = field
        super().__init__(f"Metadata extraction failed: {message}", url, ctx)


class CacheError(ExtractionError):
    """Cache operation failed"""

    def __init__(self, message: str, operation: str = None, context: dict = None):
        ctx = context or {}
        if operation:
            ctx["operation"] = operation
        super().__init__(f"Cache error: {message}", context=ctx)
