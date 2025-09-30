"""
PAM Hybrid System - GPT-4o-mini + Claude Agent SDK

Cost-optimized AI assistant with complexity-based routing:
- Simple queries → GPT-4o-mini ($0.075/1M tokens)
- Complex tasks → Claude Agent SDK ($3/1M tokens)
- Expected cost reduction: 77-90%
"""

from .core.orchestrator import AgentOrchestrator
from .core.gateway import HybridGateway
from .core.classifier import ComplexityClassifier
from .agents.dashboard_agent import DashboardAgent
from .agents.budget_agent import BudgetAgent
from .agents.trip_agent import TripAgent
from .agents.community_agent import CommunityAgent
from .agents.shop_agent import ShopAgent

__all__ = [
    "AgentOrchestrator",
    "HybridGateway",
    "ComplexityClassifier",
    "DashboardAgent",
    "BudgetAgent",
    "TripAgent",
    "CommunityAgent",
    "ShopAgent",
]

__version__ = "3.0.0"