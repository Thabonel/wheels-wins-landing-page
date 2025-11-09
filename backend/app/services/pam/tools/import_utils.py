"""
Import utilities for PAM tools
Handles lazy imports and circular dependency detection
"""
import sys
import importlib
from typing import Optional, Any, Dict, Set
from app.core.logging import get_logger

logger = get_logger(__name__)


class LazyImporter:
    """
    Lazy importer to handle circular dependencies and optional imports
    """
    
    def __init__(self):
        self._import_cache: Dict[str, Any] = {}
        self._import_stack: Set[str] = set()
    
    def safe_import(self, module_name: str, class_name: Optional[str] = None, fallback: Any = None) -> Any:
        """
        Safely import a module or class with circular dependency detection
        
        Args:
            module_name: Full module path to import
            class_name: Optional specific class to import from module
            fallback: Value to return if import fails
            
        Returns:
            Imported module/class or fallback value
        """
        cache_key = f"{module_name}.{class_name}" if class_name else module_name
        
        # Return cached import if available
        if cache_key in self._import_cache:
            return self._import_cache[cache_key]
        
        # Detect circular imports
        if cache_key in self._import_stack:
            logger.warning(f"🔄 Circular import detected for {cache_key}, returning fallback")
            return fallback
        
        try:
            # Add to import stack to detect circular references
            self._import_stack.add(cache_key)
            
            # Attempt the import
            module = importlib.import_module(module_name)
            
            if class_name:
                imported_item = getattr(module, class_name, fallback)
            else:
                imported_item = module
            
            # Cache successful import
            self._import_cache[cache_key] = imported_item
            logger.debug(f"✅ Successfully imported {cache_key}")
            
            return imported_item
            
        except ImportError as e:
            logger.warning(f"📦 Import not available: {cache_key} - {e}")
            return fallback
        except Exception as e:
            logger.error(f"❌ Import failed: {cache_key} - {e}")
            return fallback
        finally:
            # Always remove from import stack
            self._import_stack.discard(cache_key)
    
    def is_module_available(self, module_name: str) -> bool:
        """Check if a module is available for import"""
        try:
            importlib.import_module(module_name)
            return True
        except ImportError:
            return False
    
    def get_import_stats(self) -> Dict[str, Any]:
        """Get statistics about imports"""
        return {
            "cached_imports": len(self._import_cache),
            "current_stack_depth": len(self._import_stack),
            "cached_modules": list(self._import_cache.keys())
        }


# Global lazy importer instance
_lazy_importer = LazyImporter()


def lazy_import(module_name: str, class_name: Optional[str] = None, fallback: Any = None) -> Any:
    """
    Convenience function for lazy imports
    
    Usage:
        # Import entire module
        wins_node = lazy_import("app.services.pam.nodes.wins_node")
        
        # Import specific class
        MapboxTool = lazy_import("app.services.pam.tools.mapbox_tool", "MapboxTool")
        
        # Import with fallback
        optional_tool = lazy_import("optional.module", "Tool", fallback=None)
    """
    return _lazy_importer.safe_import(module_name, class_name, fallback)


def check_circular_imports(modules: list) -> Dict[str, Any]:
    """
    Check for potential circular import issues in a list of modules
    
    Args:
        modules: List of module names to check
        
    Returns:
        Analysis results with potential issues
    """
    results = {
        "total_modules": len(modules),
        "available_modules": [],
        "missing_modules": [],
        "potential_issues": []
    }
    
    for module_name in modules:
        if _lazy_importer.is_module_available(module_name):
            results["available_modules"].append(module_name)
        else:
            results["missing_modules"].append(module_name)
    
    # Additional analysis could be added here to detect specific circular patterns
    
    return results


def get_import_diagnostics() -> Dict[str, Any]:
    """Get comprehensive import diagnostics"""
    return {
        "lazy_importer_stats": _lazy_importer.get_import_stats(),
        "python_modules_loaded": len(sys.modules),
        "pam_modules_loaded": len([m for m in sys.modules.keys() if "pam" in m])
    }