# app/core/orchestrator.py
from typing import Dict, List, Any
from enum import Enum
import json
import logging
from app.core.config import settings
from app.nodes.wins_node import wins_node
from app.nodes.wheels_node import wheels_node
from app.nodes.social_node import social_node
from app.nodes.you_node import you_node
from app.nodes.memory_node import MemoryNode

# Import the enhanced route intelligence
from app.core.route_intelligence import route_intelligence

# Import the scraping function
try:
    from scraper_service.main import fetch_and_parse
    SCRAPER_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Scraper service not available: {e}")
    SCRAPER_AVAILABLE = False

logger = logging.getLogger("pam")

class Domain(Enum):
    WHEELS = "wheels"
    WINS = "wins"
    SOCIAL = "social"
    YOU = "you"
    SHOP = "shop"
    GENERAL = "general"

class ActionType(Enum):
    VIEW = "view"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    NAVIGATE = "navigate"
    HELP = "help"
    PLAN = "plan"
    TRACK = "track"
    ANALYZE = "analyze"

class Intent:
    def __init__(self, domain: Domain, action: ActionType, entities: Dict[str, Any], confidence: float):
        self.domain = domain
        self.action = action
        self.entities = entities
        self.confidence = confidence

class IntentClassifier:
    def __init__(self):
        pass
    
