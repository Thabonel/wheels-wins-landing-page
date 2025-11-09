"""
PAM Tools - Intelligent tools for enhanced conversation

IMPORTANT: This __init__.py is intentionally minimal to prevent import errors
from propagating. The tool_registry.py uses lazy_import to import tools
directly from their modules, so we don't need to export anything here.

If you need to import tools, import them directly from their modules:
  from app.services.pam.tools.create_calendar_event import CreateCalendarEventTool

NOT from the package:
  from app.services.pam.tools import CreateCalendarEventTool  # ❌ Don't do this
"""

# DO NOT add imports here - they cause cascade import failures
# Tools are imported via lazy_import in tool_registry.py

__all__ = []