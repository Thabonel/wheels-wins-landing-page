"""
Admin Tools for PAM
Tools that allow admins to manage PAM's long-term memory and knowledge base
"""

from .add_knowledge import add_knowledge
from .search_knowledge import search_knowledge

__all__ = [
    "add_knowledge",
    "search_knowledge",
]
