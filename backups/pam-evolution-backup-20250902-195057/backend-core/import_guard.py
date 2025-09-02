"""
Import Guard System for Fault-Tolerant Module Loading

This module provides utilities to safely import modules without crashing
the entire application if a module fails to load. This is critical for
maintaining PAM availability even when other services fail.
"""

import importlib
import sys
from typing import Optional, Any, Dict, List, Callable
from app.core.logging import get_logger

logger = get_logger(__name__)


class ImportGuard:
    """
    Manages safe imports with fallback behavior and error tracking.
    Prevents cascading failures from module import errors.
    """
    
    def __init__(self):
        self.failed_modules: List[str] = []
        self.loaded_modules: Dict[str, Any] = {}
        self.import_attempts: Dict[str, int] = {}
        
    def safe_import(self, 
                   module_path: str, 
                   attribute_name: str = "router",
                   critical: bool = False,
                   max_retries: int = 1) -> Optional[Any]:
        """
        Safely import a module and return a specific attribute.
        
        Args:
            module_path: Full module path (e.g., 'app.api.v1.camping')
            attribute_name: Attribute to extract from module (default: 'router')
            critical: If True, re-raise exceptions (for critical modules like PAM)
            max_retries: Number of import attempts before giving up
            
        Returns:
            The requested attribute from the module, or None if import fails
        """
        # Check if we've already loaded this module
        cache_key = f"{module_path}.{attribute_name}"
        if cache_key in self.loaded_modules:
            return self.loaded_modules[cache_key]
            
        # Check if we've already failed too many times
        if self.import_attempts.get(module_path, 0) >= max_retries:
            logger.debug(f"Skipping {module_path} - max retries exceeded")
            return None
            
        try:
            # Track import attempt
            self.import_attempts[module_path] = self.import_attempts.get(module_path, 0) + 1
            
            # Attempt the import
            logger.info(f"🔄 Attempting to import {module_path}")
            module = importlib.import_module(module_path)
            
            # Extract the requested attribute
            if hasattr(module, attribute_name):
                attr = getattr(module, attribute_name)
                self.loaded_modules[cache_key] = attr
                logger.info(f"✅ Successfully loaded {module_path}.{attribute_name}")
                return attr
            else:
                logger.warning(f"⚠️ Module {module_path} has no attribute '{attribute_name}'")
                return None
                
        except ImportError as e:
            self._handle_import_error(module_path, e, critical)
            return None
        except Exception as e:
            self._handle_general_error(module_path, e, critical)
            return None
            
    def _handle_import_error(self, module_path: str, error: ImportError, critical: bool):
        """Handle ImportError with detailed logging"""
        self.failed_modules.append(module_path)
        
        # Extract the missing module from the error
        error_msg = str(error)
        if "No module named" in error_msg:
            missing = error_msg.split("'")[1] if "'" in error_msg else "unknown"
            logger.error(f"❌ Failed to import {module_path}: Missing module '{missing}'")
        else:
            logger.error(f"❌ Failed to import {module_path}: {error}")
            
        if critical:
            raise
            
    def _handle_general_error(self, module_path: str, error: Exception, critical: bool):
        """Handle general exceptions during import"""
        self.failed_modules.append(module_path)
        logger.error(f"❌ Unexpected error importing {module_path}: {type(error).__name__}: {error}")
        
        if critical:
            raise
            
    def get_status(self) -> Dict[str, Any]:
        """Get the current status of module imports"""
        return {
            "loaded": list(self.loaded_modules.keys()),
            "failed": self.failed_modules,
            "attempts": self.import_attempts,
            "total_loaded": len(self.loaded_modules),
            "total_failed": len(self.failed_modules)
        }
        
    def register_critical_modules(self, modules: List[str]):
        """
        Register modules that must load successfully.
        If any of these fail, the application should not start.
        """
        critical_failures = []
        
        for module_path in modules:
            try:
                result = self.safe_import(module_path, critical=True)
                if result is None:
                    critical_failures.append(module_path)
            except Exception as e:
                critical_failures.append(f"{module_path}: {str(e)}")
                
        if critical_failures:
            raise RuntimeError(f"Critical modules failed to load: {', '.join(critical_failures)}")


# Global import guard instance
import_guard = ImportGuard()


def safe_import_router(module_path: str, router_name: str = "router") -> Optional[Any]:
    """
    Convenience function to safely import a router from a module.
    
    Args:
        module_path: Full module path (e.g., 'app.api.v1.camping')
        router_name: Name of the router attribute (default: 'router')
        
    Returns:
        The router object, or None if import fails
    """
    return import_guard.safe_import(module_path, router_name, critical=False)


def require_module(module_path: str, attribute_name: str = "router") -> Any:
    """
    Import a required module that must load successfully.
    
    Args:
        module_path: Full module path
        attribute_name: Attribute to extract
        
    Returns:
        The requested attribute
        
    Raises:
        ImportError: If the module fails to load
    """
    result = import_guard.safe_import(module_path, attribute_name, critical=True)
    if result is None:
        raise ImportError(f"Required module {module_path} failed to load")
    return result


def import_with_fallback(primary_module: str, 
                        fallback_module: str,
                        attribute_name: str = "router") -> Optional[Any]:
    """
    Try to import from primary module, fall back to secondary if it fails.
    
    Args:
        primary_module: Primary module to try first
        fallback_module: Fallback module if primary fails
        attribute_name: Attribute to extract
        
    Returns:
        The requested attribute from whichever module loads successfully
    """
    result = import_guard.safe_import(primary_module, attribute_name)
    if result is not None:
        return result
        
    logger.info(f"🔄 Primary module {primary_module} failed, trying fallback {fallback_module}")
    return import_guard.safe_import(fallback_module, attribute_name)


def get_import_status() -> Dict[str, Any]:
    """Get the current status of all module imports"""
    return import_guard.get_status()