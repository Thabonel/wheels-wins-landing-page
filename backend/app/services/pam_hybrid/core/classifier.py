"""Complexity Classifier for PAM Hybrid System

Analyzes incoming queries and determines whether to route to:
- GPT-4o-mini (simple queries, 95% of requests)
- Claude Agent SDK (complex tasks, 5% of requests)
"""

import re
from typing import Optional
import logging

from .types import (
    QueryComplexity,
    AgentDomain,
    ClassificationResult,
    HybridRequest
)
from .config import config

logger = logging.getLogger(__name__)


class ComplexityClassifier:
    """Classifies query complexity and suggests routing"""

    def __init__(self):
        self.simple_patterns = [
            r"^(what|who|when|where|how much|show me|tell me)",
            r"(hello|hi|hey|thanks|thank you|bye|goodbye)",
            r"(navigate|open|go to|display|show)",
            r"^my (balance|budget|trips|expenses)",
            r"(status|summary|overview)",
        ]

        self.complex_patterns = [
            r"(plan|create|build|generate|design)",
            r"(optimize|improve|enhance|maximize|minimize)",
            r"(analyze|evaluate|compare|assess|calculate)",
            r"(recommend|suggest|advise|propose)",
            r"(predict|forecast|estimate|project)",
            r"(route|itinerary|schedule)",
        ]

        self.domain_patterns = {
            AgentDomain.DASHBOARD: [
                r"(overview|summary|dashboard|recent|activity|status)"
            ],
            AgentDomain.BUDGET: [
                r"(budget|expense|spending|money|cost|financial|save|savings)",
                r"(income|bills|payment|transaction)"
            ],
            AgentDomain.TRIP: [
                r"(trip|travel|route|rv|park|destination|journey)",
                r"(weather|forecast|road|highway|gas station)"
            ],
            AgentDomain.COMMUNITY: [
                r"(social|friend|post|share|community|feed)",
                r"(comment|like|follow|message)"
            ],
            AgentDomain.SHOP: [
                r"(shop|buy|purchase|product|order|store|cart)",
                r"(item|price|discount|deal)"
            ]
        }

    async def classify(
        self,
        request: HybridRequest
    ) -> ClassificationResult:
        """Classify query complexity and suggest routing"""

        message = request.message.lower()
        message_length = len(request.message.split())

        # Calculate complexity score
        complexity_score = 0.0
        simple_score = 0.0

        # Check simple patterns
        for pattern in self.simple_patterns:
            if re.search(pattern, message, re.IGNORECASE):
                simple_score += 0.3

        # Check complex patterns
        for pattern in self.complex_patterns:
            if re.search(pattern, message, re.IGNORECASE):
                complexity_score += 0.4

        # Check keyword-based hints
        for keyword in config.simple_query_keywords:
            if keyword in message:
                simple_score += 0.1

        for keyword in config.complex_query_keywords:
            if keyword in message:
                complexity_score += 0.2

        # Message length heuristic
        if message_length < 5:
            simple_score += 0.2
        elif message_length > 20:
            complexity_score += 0.2

        # Check for multiple questions or tasks
        if message.count("?") > 1 or message.count(" and ") > 2:
            complexity_score += 0.3

        # Determine domain
        domain = self._detect_domain(message)

        # Normalize scores
        total_score = simple_score + complexity_score
        if total_score > 0:
            simple_confidence = simple_score / total_score
            complex_confidence = complexity_score / total_score
        else:
            # Default to simple
            simple_confidence = 0.8
            complex_confidence = 0.2

        # Classify based on thresholds
        if simple_confidence >= config.simple_query_threshold:
            complexity = QueryComplexity.SIMPLE
            suggested_handler = "gpt4o-mini"
            estimated_cost = self._estimate_cost(message_length, "gpt4o-mini")
        elif complex_confidence >= config.complex_query_threshold:
            complexity = QueryComplexity.COMPLEX
            suggested_handler = "claude-agent"
            estimated_cost = self._estimate_cost(message_length, "claude-agent")
        else:
            complexity = QueryComplexity.MODERATE
            # Default to simple (cost-effective)
            suggested_handler = "gpt4o-mini" if config.default_to_simple else "claude-agent"
            estimated_cost = self._estimate_cost(message_length, suggested_handler)

        confidence = max(simple_confidence, complex_confidence)

        reasoning = self._build_reasoning(
            simple_confidence,
            complex_confidence,
            message_length,
            domain
        )

        return ClassificationResult(
            complexity=complexity,
            confidence=confidence,
            domain=domain,
            reasoning=reasoning,
            suggested_handler=suggested_handler,
            estimated_cost_usd=estimated_cost
        )

    def _detect_domain(self, message: str) -> Optional[AgentDomain]:
        """Detect which domain the query belongs to"""
        domain_scores = {}

        for domain, patterns in self.domain_patterns.items():
            score = 0
            for pattern in patterns:
                if re.search(pattern, message, re.IGNORECASE):
                    score += 1

            # Check config domain keywords
            for keyword in config.domain_keywords.get(domain.value, []):
                if keyword in message:
                    score += 0.5

            if score > 0:
                domain_scores[domain] = score

        if domain_scores:
            return max(domain_scores.items(), key=lambda x: x[1])[0]

        return None

    def _estimate_cost(
        self,
        message_length: int,
        handler: str
    ) -> float:
        """Estimate cost for processing this query"""
        # Rough estimation: 1 word ≈ 1.3 tokens
        input_tokens = int(message_length * 1.3)
        output_tokens = 150  # Average response

        if handler == "gpt4o-mini":
            cost = (
                (input_tokens / 1_000_000) * config.gpt_input_cost +
                (output_tokens / 1_000_000) * config.gpt_output_cost
            )
        else:  # claude-agent
            cost = (
                (input_tokens / 1_000_000) * config.claude_input_cost +
                (output_tokens / 1_000_000) * config.claude_output_cost
            )

        return round(cost, 6)

    def _build_reasoning(
        self,
        simple_score: float,
        complex_score: float,
        message_length: int,
        domain: Optional[AgentDomain]
    ) -> str:
        """Build human-readable reasoning for classification"""
        parts = []

        if simple_score > complex_score:
            parts.append(f"Simple query indicators (score: {simple_score:.2f})")
        else:
            parts.append(f"Complex task indicators (score: {complex_score:.2f})")

        parts.append(f"Message length: {message_length} words")

        if domain:
            parts.append(f"Detected domain: {domain.value}")

        return " | ".join(parts)


# Global classifier instance
classifier = ComplexityClassifier()