from __future__ import annotations

import re
from typing import Any, Dict, Optional, Deque, List
from collections import deque
import logging

from langchain_core.runnables import Runnable, RunnableConfig
from langchain_core.callbacks import CallbackManagerForChainRun

# Import security guardrail
try:
    from app.services.pam.security import PAMSecurityGuardrail, create_pam_guardrail
    GUARDRAIL_AVAILABLE = True
except ImportError:
    GUARDRAIL_AVAILABLE = False

__all__ = ["PauterRouter", "pauter_router"]

logger = logging.getLogger(__name__)


class PauterRouter(Runnable[str, Dict[str, Any]]):
    """
    Intelligent heuristic router for PAM AI nodes with adaptive confidence scoring.
    
    This router analyzes user messages and routes them to specialized nodes based on:
    - Pattern matching using regex patterns for different domains
    - Historical feedback scores that adjust routing confidence
    - Fallback to memory node for unmatched queries
    
    Attributes:
        VALID_NODES: Set of available node types for routing
        _PATTERNS: Regex patterns for each node type to match user intent
        feedback_scores: Rolling window of feedback scores for each node
        
    Example:
        router = PauterRouter()
        result = router.invoke("How much did I spend on fuel?")
        # Returns: {"target_node": "wins", "confidence": 0.85}
    """

    VALID_NODES = {"wheels", "wins", "social", "memory", "shop"}
    
    # Pattern matching for different domains - these regex patterns identify
    # user intent based on keywords in their messages
    _PATTERNS = {
        "wheels": re.compile(r"\b(trip|vehicle|route|camp|travel|fuel|maintenance|rv|caravan)\b"),
        "wins": re.compile(r"\b(expense|budget|finance|savings|win|money|cost|spending|income)\b"),
        "social": re.compile(r"\b(friend|community|social|group|share|post|connect)\b"),
        "shop": re.compile(r"\b(shop|purchase|buy|product|marketplace|sell)\b"),
    }

    def __init__(self, feedback_window: int = 5, enable_guardrail: bool = True) -> None:
        self.feedback_window = feedback_window
        self.feedback_scores: Dict[str, Deque[float]] = {
            node: deque(maxlen=feedback_window) for node in self.VALID_NODES
        }
        
        # Initialize security guardrail
        self.guardrail = None
        if enable_guardrail and GUARDRAIL_AVAILABLE:
            try:
                self.guardrail = create_pam_guardrail(strict_mode=True)
                logger.info("PAM Security Guardrail initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize guardrail: {e}")
                self.guardrail = None
        elif not GUARDRAIL_AVAILABLE:
            logger.warning("PAM Security Guardrail not available - security module not found")

    def update_feedback(self, node: str, rating: float) -> None:
        """Record a rating for a node."""
        if node in self.feedback_scores:
            self.feedback_scores[node].append(rating)

    def _feedback_weight(self, node: str) -> float:
        scores = self.feedback_scores.get(node)
        if scores:
            avg = sum(scores) / len(scores)
            return max(0.5, min(1.5, avg / 3.0))
        return 1.0

    def _route(self, text: str) -> Dict[str, Any]:
        # Security check before routing
        if self.guardrail:
            try:
                # Check for security threats
                threat = self.guardrail._detect_threat(text)
                if threat:
                    logger.warning(f"Security threat detected in routing: {threat}")
                    if self.guardrail.block_on_detection:
                        # Route to safe memory node instead of executing risky request
                        return {
                            "target_node": "memory",
                            "confidence": 0.1,
                            "security_alert": True,
                            "threat_type": threat.get("type", "unknown")
                        }
            except Exception as e:
                logger.error(f"Guardrail check failed: {e}")
        
        text = text.lower()
        for node, pattern in self._PATTERNS.items():
            matches = pattern.findall(text)
            if matches:
                base = min(1.0, 0.6 + 0.1 * len(matches))
                confidence = min(1.0, base * self._feedback_weight(node))
                return {"target_node": node, "confidence": confidence}
        return {
            "target_node": "memory",
            "confidence": min(1.0, 0.4 * self._feedback_weight("memory")),
        }

    def invoke(self, input: str, config: Optional[RunnableConfig] = None) -> Dict[str, Any]:
        # Use guardrail callbacks if available
        callbacks = []
        if self.guardrail and config:
            callbacks = config.get("callbacks", [])
            if self.guardrail not in callbacks:
                callbacks.append(self.guardrail)
        
        result = self._route(input)
        
        # Log security alerts
        if result.get("security_alert"):
            logger.critical(f"SECURITY ALERT: Blocked {result.get('threat_type')} attempt in routing")
        
        return result

    async def ainvoke(self, input: str, config: Optional[RunnableConfig] = None, **kwargs: Any) -> Dict[str, Any]:
        # Use guardrail callbacks if available
        callbacks = []
        if self.guardrail and config:
            callbacks = config.get("callbacks", [])
            if self.guardrail not in callbacks:
                callbacks.append(self.guardrail)
        
        result = self._route(input)
        
        # Log security alerts
        if result.get("security_alert"):
            logger.critical(f"SECURITY ALERT: Blocked {result.get('threat_type')} attempt in routing")
        
        return result


pauter_router = PauterRouter()
