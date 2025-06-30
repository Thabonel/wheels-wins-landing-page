from enum import Enum
from typing import Dict, Any
import re

class IntentType(Enum):
    GENERAL = "general"
    WINS = "wins"
    WHEELS = "wheels"
    SOCIAL = "social"
    YOU = "you"
    SHOP = "shop"
    ADMIN = "admin"

class IntentResult:
    def __init__(self, intent: IntentType, confidence: float, entities: Dict[str, Any] | None = None):
        self.intent = intent
        self.confidence = confidence
        self.entities = entities or {}

class IntentClassifier:
    """Very simple pattern based intent classifier"""

    def __init__(self):
        self.patterns: Dict[IntentType, list[str]] = {
            IntentType.WHEELS: [r"\btrip\b", r"\broute\b", r"\bfuel\b", r"\bmaintenance\b"],
            IntentType.WINS: [r"\bbudget\b", r"\bexpense\b", r"\bincome\b"],
            IntentType.SOCIAL: [r"\bgroup\b", r"\bcommunity\b"],
            IntentType.YOU: [r"\bprofile\b", r"\bpreference\b"],
            IntentType.SHOP: [r"\bbuy\b", r"\bsell\b", r"\bshop\b"],
            IntentType.ADMIN: [r"\badmin\b", r"\bstatus\b"],
        }

    async def classify(self, message: str) -> IntentResult:
        msg = message.lower()
        for intent, patterns in self.patterns.items():
            for pattern in patterns:
                if re.search(pattern, msg):
                    return IntentResult(intent, 0.9)
        return IntentResult(IntentType.GENERAL, 0.5)
