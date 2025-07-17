
"""
Service layer modules
"""

# Import service modules. These imports are wrapped in try/except blocks so that
# utilities which only need a subset of services can import this package without
# requiring optional dependencies (e.g. during lightweight sanity checks).
try:
    from .database import DatabaseService  # type: ignore
except Exception:  # pragma: no cover - optional dependency may be missing
    DatabaseService = None  # type: ignore

try:
    from .cache import CacheService  # type: ignore
except Exception:  # pragma: no cover - optional dependency may be missing
    CacheService = None  # type: ignore

try:
    from .pam.orchestrator import orchestrator  # type: ignore
except Exception:  # pragma: no cover - optional dependency may be missing
    orchestrator = None  # type: ignore

try:
    from .media_processing import MediaProcessingService  # type: ignore
except Exception:  # pragma: no cover - optional dependency may be missing
    MediaProcessingService = None  # type: ignore

__all__ = [
    'DatabaseService',
    'CacheService',
    'orchestrator',
    'MediaProcessingService'
]
