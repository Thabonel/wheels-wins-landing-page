"""
Advanced Natural Language Processing for Voice Commands
Enhanced command recognition, intent extraction, and context understanding.
"""

import re
import spacy
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import asyncio
from openai import AsyncOpenAI

from app.core.logging import get_logger
from app.core.config import settings

logger = get_logger(__name__)


class CommandType(Enum):
    """Voice command categories with enhanced classification."""
    
    # Navigation commands
    NAVIGATE = "navigate"
    OPEN = "open"
    CLOSE = "close"
    SWITCH = "switch"
    
    # Data operations
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    SEARCH = "search"
    FILTER = "filter"
    
    # Financial operations
    EXPENSE_ADD = "expense_add"
    EXPENSE_VIEW = "expense_view"
    BUDGET_CHECK = "budget_check"
    SAVINGS_ANALYSIS = "savings_analysis"
    
    # Travel operations
    TRIP_PLAN = "trip_plan"
    LOCATION_FIND = "location_find"
    MAINTENANCE_LOG = "maintenance_log"
    FUEL_TRACK = "fuel_track"
    
    # Social operations
    POST_CREATE = "post_create"
    FRIEND_CONNECT = "friend_connect"
    MESSAGE_SEND = "message_send"
    
    # System operations
    SETTINGS = "settings"
    HELP = "help"
    STATUS = "status"
    
    # Conversational
    QUESTION = "question"
    CONFIRMATION = "confirmation"
    CLARIFICATION = "clarification"


@dataclass
class VoiceCommand:
    """Enhanced voice command structure with confidence scoring."""
    
    command_type: CommandType
    intent: str
    entities: Dict[str, Any]
    confidence: float
    raw_text: str
    normalized_text: str
    context: Dict[str, Any]
    parameters: Dict[str, Any]
    urgency: float  # 0.0 to 1.0
    ambiguity_score: float  # 0.0 (clear) to 1.0 (ambiguous)


@dataclass
class EntityExtraction:
    """Extracted entities from voice command."""
    
    amounts: List[float]
    dates: List[str]
    locations: List[str]
    categories: List[str]
    names: List[str]
    numbers: List[float]
    durations: List[str]
    currencies: List[str]


class AdvancedNLPProcessor:
    """
    Advanced NLP processor for voice commands with context understanding.
    
    Features:
    - Multi-model intent classification
    - Contextual entity extraction
    - Ambiguity detection and resolution
    - Command chaining support
    - Conversational context management
    """
    
    def __init__(self):
        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.nlp = None  # Will load spaCy model
        self.conversation_context = {}
        self.command_patterns = self._initialize_command_patterns()
        self.entity_patterns = self._initialize_entity_patterns()
        
    async def initialize(self):
        """Initialize NLP models asynchronously."""
        try:
            # Load spaCy model in executor to avoid blocking
            loop = asyncio.get_event_loop()
            self.nlp = await loop.run_in_executor(None, self._load_spacy_model)
            logger.info("✅ Advanced NLP processor initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize NLP processor: {e}")
            # Fallback to basic pattern matching if spaCy fails
            self.nlp = None
    
    def _load_spacy_model(self):
        """Load spaCy model synchronously."""
        try:
            return spacy.load("en_core_web_sm")
        except OSError:
            logger.warning("spaCy model not found, using basic processing")
            return None
    
    def _initialize_command_patterns(self) -> Dict[CommandType, List[str]]:
        """Initialize comprehensive command patterns for intent classification."""
        return {
            # Navigation patterns
            CommandType.NAVIGATE: [
                r"\b(go to|navigate to|open|show me)\s+(.+)",
                r"\b(take me to|switch to|move to)\s+(.+)",
                r"\b(display|view|show)\s+(the\s+)?(.+)\s+(page|screen|section)"
            ],
            
            # Financial patterns
            CommandType.EXPENSE_ADD: [
                r"\b(add|record|log|create)\s+(an?\s+)?(expense|purchase|cost)",
                r"\b(spent|paid|bought)\s+(.+)\s+(for|on)\s+(.+)",
                r"\b(track|record)\s+(.+)\s+(expense|spending|cost)"
            ],
            
            CommandType.BUDGET_CHECK: [
                r"\b(check|show|what's)\s+(my\s+)?(budget|spending|expenses)",
                r"\b(how much)\s+(have\s+I\s+)?(spent|used)\s+(this\s+)?(month|week|year)",
                r"\b(budget\s+)?(status|summary|overview)"
            ],
            
            # Travel patterns
            CommandType.TRIP_PLAN: [
                r"\b(plan|create|organize)\s+(a\s+)?(trip|journey|travel)",
                r"\b(find|suggest|recommend)\s+(routes?|directions|path)",
                r"\b(where\s+)?(should|can)\s+(I|we)\s+(go|travel|visit)"
            ],
            
            CommandType.LOCATION_FIND: [
                r"\b(find|locate|search)\s+(for\s+)?(camping|fuel|food|accommodation)",
                r"\b(where\s+)?(is|are)\s+(the\s+)?(nearest|closest|best)\s+(.+)",
                r"\b(show\s+me)\s+(nearby|local|close)\s+(.+)"
            ],
            
            # Social patterns
            CommandType.POST_CREATE: [
                r"\b(create|make|write|post)\s+(a\s+)?(post|update|message)",
                r"\b(share|tell)\s+(everyone|friends|community)\s+(about|that)",
                r"\b(update\s+my\s+)?(status|feed|timeline)"
            ],
            
            # System patterns
            CommandType.HELP: [
                r"\b(help|assist|guide|tutorial)",
                r"\b(how\s+)?(do\s+I|can\s+I|to)\s+(.+)",
                r"\b(what\s+)?(can\s+you|are\s+you\s+able\s+to)\s+(do|help)"
            ],
            
            # Question patterns
            CommandType.QUESTION: [
                r"\b(what|when|where|why|how|who)\s+(.+)",
                r"\b(is|are|was|were|will|would|could|should)\s+(.+)",
                r"\b(tell\s+me|explain|describe)\s+(.+)"
            ]
        }
    
    def _initialize_entity_patterns(self) -> Dict[str, str]:
        """Initialize entity extraction patterns."""
        return {
            "amount": r"\$?(\d+(?:\.\d{2})?)",
            "date": r"\b(today|tomorrow|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b",
            "location": r"\b(at|near|in|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
            "category": r"\b(fuel|food|accommodation|entertainment|shopping|maintenance|groceries|dining)\b",
            "time": r"\b(\d{1,2}:\d{2}(?:\s*[ap]m)?|\d{1,2}\s*[ap]m)\b",
            "duration": r"\b(\d+\s*(?:minute|hour|day|week|month|year)s?)\b",
            "distance": r"\b(\d+(?:\.\d+)?\s*(?:km|mile|meter)s?)\b"
        }
    
    async def process_voice_command(
        self, 
        raw_text: str, 
        user_context: Optional[Dict[str, Any]] = None,
        conversation_id: Optional[str] = None
    ) -> VoiceCommand:
        """
        Process voice command with advanced NLP analysis.
        
        Args:
            raw_text: Raw transcribed text from voice input
            user_context: User context (location, preferences, etc.)
            conversation_id: ID for conversation context tracking
            
        Returns:
            VoiceCommand with extracted intent, entities, and metadata
        """
        try:
            # Normalize text
            normalized_text = self._normalize_text(raw_text)
            
            # Extract entities
            entities = await self._extract_entities(normalized_text)
            
            # Classify intent with confidence scoring
            command_type, confidence = await self._classify_intent(normalized_text, entities)
            
            # Extract parameters
            parameters = await self._extract_parameters(normalized_text, command_type, entities)
            
            # Calculate urgency and ambiguity
            urgency = self._calculate_urgency(normalized_text, command_type)
            ambiguity_score = self._calculate_ambiguity(normalized_text, entities, confidence)
            
            # Build context
            context = self._build_context(user_context, conversation_id, entities)
            
            # Generate intent description
            intent = await self._generate_intent_description(
                normalized_text, command_type, entities, parameters
            )
            
            command = VoiceCommand(
                command_type=command_type,
                intent=intent,
                entities=entities,
                confidence=confidence,
                raw_text=raw_text,
                normalized_text=normalized_text,
                context=context,
                parameters=parameters,
                urgency=urgency,
                ambiguity_score=ambiguity_score
            )
            
            # Update conversation context
            if conversation_id:
                self._update_conversation_context(conversation_id, command)
            
            logger.info(f"Processed voice command: {command_type.value} (confidence: {confidence:.2f})")
            return command
            
        except Exception as e:
            logger.error(f"Error processing voice command: {e}")
            # Return fallback command
            return VoiceCommand(
                command_type=CommandType.QUESTION,
                intent="Unknown command - please clarify",
                entities={},
                confidence=0.1,
                raw_text=raw_text,
                normalized_text=raw_text.lower().strip(),
                context=user_context or {},
                parameters={},
                urgency=0.0,
                ambiguity_score=1.0
            )
    
    def _normalize_text(self, text: str) -> str:
        """Normalize text for better processing."""
        # Convert to lowercase
        text = text.lower().strip()
        
        # Fix common speech-to-text errors
        corrections = {
            "there": "their",
            "to": "two",
            "for": "four",
            "won": "one",
            "ate": "eight",
            "buy": "by"
        }
        
        words = text.split()
        corrected_words = []
        
        for word in words:
            # Apply context-sensitive corrections
            if word in corrections and self._should_correct_word(word, words):
                corrected_words.append(corrections[word])
            else:
                corrected_words.append(word)
        
        return " ".join(corrected_words)
    
    def _should_correct_word(self, word: str, context_words: List[str]) -> bool:
        """Determine if a word should be corrected based on context."""
        # Simple heuristic - can be enhanced with more sophisticated logic
        numeric_context = any(w in ["dollars", "minutes", "miles", "spent"] for w in context_words)
        return word in ["to", "for", "won", "ate"] and numeric_context
    
    async def _extract_entities(self, text: str) -> Dict[str, Any]:
        """Extract entities using multiple approaches."""
        entities = {}
        
        # Pattern-based extraction
        for entity_type, pattern in self.entity_patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                entities[entity_type] = matches
        
        # spaCy-based extraction (if available)
        if self.nlp:
            doc = self.nlp(text)
            
            # Extract named entities
            entities["named_entities"] = [
                {"text": ent.text, "label": ent.label_, "start": ent.start_char, "end": ent.end_char}
                for ent in doc.ents
            ]
            
            # Extract numbers
            entities["numbers"] = [token.text for token in doc if token.like_num]
            
            # Extract proper nouns (potential locations/names)
            entities["proper_nouns"] = [token.text for token in doc if token.pos_ == "PROPN"]
        
        # AI-powered entity extraction for complex cases
        if self.openai_client and len(text.split()) > 5:
            try:
                ai_entities = await self._ai_extract_entities(text)
                entities.update(ai_entities)
            except Exception as e:
                logger.warning(f"AI entity extraction failed: {e}")
        
        return entities
    
    async def _ai_extract_entities(self, text: str) -> Dict[str, Any]:
        """Use AI model for sophisticated entity extraction."""
        prompt = f"""
        Extract relevant entities from this voice command: "{text}"
        
        Return a JSON object with these fields (only include if found):
        - financial_amount: monetary values
        - location_names: place names, addresses
        - date_references: dates, times, relative dates
        - category_mentions: expense categories, types
        - action_objects: what the user wants to act upon
        
        Example: "Add a $50 fuel expense for yesterday at Shell station"
        {{
          "financial_amount": ["$50"],
          "location_names": ["Shell station"],
          "date_references": ["yesterday"],
          "category_mentions": ["fuel"],
          "action_objects": ["expense"]
        }}
        """
        
        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.1
            )
            
            result_text = response.choices[0].message.content.strip()
            # Parse JSON response
            import json
            return json.loads(result_text)
            
        except Exception as e:
            logger.warning(f"AI entity extraction parsing failed: {e}")
            return {}
    
    async def _classify_intent(self, text: str, entities: Dict[str, Any]) -> Tuple[CommandType, float]:
        """Classify command intent with confidence scoring."""
        best_match = CommandType.QUESTION
        best_confidence = 0.0
        
        # Pattern-based classification
        for command_type, patterns in self.command_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    # Calculate confidence based on match quality
                    confidence = self._calculate_pattern_confidence(match, text)
                    if confidence > best_confidence:
                        best_match = command_type
                        best_confidence = confidence
        
        # Entity-based confidence boost
        entity_boost = self._calculate_entity_confidence_boost(best_match, entities)
        best_confidence = min(1.0, best_confidence + entity_boost)
        
        # AI-powered classification for ambiguous cases
        if best_confidence < 0.6:
            ai_classification = await self._ai_classify_intent(text, entities)
            if ai_classification[1] > best_confidence:
                best_match, best_confidence = ai_classification
        
        return best_match, best_confidence
    
    def _calculate_pattern_confidence(self, match, text: str) -> float:
        """Calculate confidence score for pattern match."""
        match_length = len(match.group(0))
        text_length = len(text)
        
        # Base confidence from match coverage
        coverage = match_length / text_length
        base_confidence = min(0.8, coverage * 2)
        
        # Bonus for exact keyword matches
        if any(keyword in text.lower() for keyword in ["add", "create", "show", "find", "plan"]):
            base_confidence += 0.2
        
        return min(1.0, base_confidence)
    
    def _calculate_entity_confidence_boost(self, command_type: CommandType, entities: Dict[str, Any]) -> float:
        """Calculate confidence boost based on relevant entities."""
        boost = 0.0
        
        # Financial command entity relevance
        if command_type in [CommandType.EXPENSE_ADD, CommandType.BUDGET_CHECK]:
            if "amount" in entities or "financial_amount" in entities:
                boost += 0.2
            if "category" in entities or "category_mentions" in entities:
                boost += 0.1
        
        # Travel command entity relevance
        elif command_type in [CommandType.TRIP_PLAN, CommandType.LOCATION_FIND]:
            if "location" in entities or "location_names" in entities:
                boost += 0.2
            if "distance" in entities:
                boost += 0.1
        
        # Temporal entity relevance
        if "date" in entities or "date_references" in entities:
            boost += 0.1
        
        return boost
    
    async def _ai_classify_intent(self, text: str, entities: Dict[str, Any]) -> Tuple[CommandType, float]:
        """Use AI model for intent classification."""
        command_types_desc = "\n".join([
            f"- {cmd.value}: {self._get_command_description(cmd)}"
            for cmd in CommandType
        ])
        
        prompt = f"""
        Classify this voice command intent: "{text}"
        
        Available command types:
        {command_types_desc}
        
        Entities found: {entities}
        
        Return only the command type (e.g., "expense_add") and confidence (0.0-1.0) separated by a comma.
        Example: "expense_add,0.85"
        """
        
        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=50,
                temperature=0.1
            )
            
            result = response.choices[0].message.content.strip()
            command_str, confidence_str = result.split(",")
            
            # Convert string to CommandType
            for cmd_type in CommandType:
                if cmd_type.value == command_str.strip():
                    return cmd_type, float(confidence_str.strip())
            
            return CommandType.QUESTION, 0.3
            
        except Exception as e:
            logger.warning(f"AI intent classification failed: {e}")
            return CommandType.QUESTION, 0.3
    
    def _get_command_description(self, command_type: CommandType) -> str:
        """Get human-readable description for command type."""
        descriptions = {
            CommandType.EXPENSE_ADD: "Add or record a new expense",
            CommandType.BUDGET_CHECK: "Check budget status or spending summary",
            CommandType.TRIP_PLAN: "Plan a trip or journey",
            CommandType.LOCATION_FIND: "Find locations, services, or points of interest",
            CommandType.POST_CREATE: "Create social media posts or updates",
            CommandType.NAVIGATE: "Navigate to different app sections",
            CommandType.HELP: "Get help or instructions",
            CommandType.QUESTION: "General questions or unclear commands"
        }
        return descriptions.get(command_type, "General command")
    
    async def _extract_parameters(
        self, 
        text: str, 
        command_type: CommandType, 
        entities: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Extract command-specific parameters."""
        parameters = {}
        
        # Command-specific parameter extraction
        if command_type == CommandType.EXPENSE_ADD:
            parameters.update(self._extract_expense_parameters(text, entities))
        elif command_type == CommandType.LOCATION_FIND:
            parameters.update(self._extract_location_parameters(text, entities))
        elif command_type == CommandType.TRIP_PLAN:
            parameters.update(self._extract_trip_parameters(text, entities))
        elif command_type == CommandType.BUDGET_CHECK:
            parameters.update(self._extract_budget_parameters(text, entities))
        
        return parameters
    
    def _extract_expense_parameters(self, text: str, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Extract parameters for expense commands."""
        params = {}
        
        # Extract amount
        if "amount" in entities:
            params["amount"] = entities["amount"][0]
        elif "financial_amount" in entities:
            params["amount"] = entities["financial_amount"][0]
        
        # Extract category
        if "category" in entities:
            params["category"] = entities["category"][0]
        elif "category_mentions" in entities:
            params["category"] = entities["category_mentions"][0]
        
        # Extract description from text
        params["description"] = self._extract_description_from_text(text)
        
        # Extract date
        if "date" in entities:
            params["date"] = entities["date"][0]
        elif "date_references" in entities:
            params["date"] = entities["date_references"][0]
        
        return params
    
    def _extract_location_parameters(self, text: str, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Extract parameters for location commands."""
        params = {}
        
        # Extract location
        if "location" in entities:
            params["location"] = entities["location"][0]
        elif "location_names" in entities:
            params["location"] = entities["location_names"][0]
        
        # Extract search radius
        if "distance" in entities:
            params["radius"] = entities["distance"][0]
        
        # Extract service type
        service_keywords = ["fuel", "food", "camping", "accommodation", "medical", "shopping"]
        for keyword in service_keywords:
            if keyword in text.lower():
                params["service_type"] = keyword
                break
        
        return params
    
    def _extract_trip_parameters(self, text: str, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Extract parameters for trip planning commands."""
        params = {}
        
        # Extract destinations
        if "location_names" in entities:
            locations = entities["location_names"]
            if len(locations) >= 2:
                params["origin"] = locations[0]
                params["destination"] = locations[1]
            elif len(locations) == 1:
                params["destination"] = locations[0]
        
        # Extract duration
        if "duration" in entities:
            params["duration"] = entities["duration"][0]
        
        # Extract dates
        if "date_references" in entities:
            params["travel_dates"] = entities["date_references"]
        
        return params
    
    def _extract_budget_parameters(self, text: str, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Extract parameters for budget commands."""
        params = {}
        
        # Extract time period
        time_keywords = {
            "month": "monthly",
            "week": "weekly", 
            "year": "yearly",
            "today": "daily",
            "this month": "monthly",
            "this year": "yearly"
        }
        
        for keyword, period in time_keywords.items():
            if keyword in text.lower():
                params["period"] = period
                break
        
        # Extract category filter
        if "category_mentions" in entities:
            params["category"] = entities["category_mentions"][0]
        
        return params
    
    def _extract_description_from_text(self, text: str) -> str:
        """Extract descriptive text for expense description."""
        # Remove command words and extract meaningful description
        command_words = ["add", "record", "log", "create", "spent", "paid", "bought", "for", "on", "at"]
        words = text.lower().split()
        
        # Find the start of description (after command words)
        start_idx = 0
        for i, word in enumerate(words):
            if word not in command_words:
                start_idx = i
                break
        
        # Extract description part
        description_words = words[start_idx:]
        return " ".join(description_words[:5])  # Limit to 5 words
    
    def _calculate_urgency(self, text: str, command_type: CommandType) -> float:
        """Calculate urgency score based on text and command type."""
        urgency_keywords = {
            "urgent": 0.9,
            "emergency": 1.0,
            "immediately": 0.8,
            "asap": 0.8,
            "now": 0.7,
            "quickly": 0.6,
            "soon": 0.4
        }
        
        max_urgency = 0.0
        for keyword, score in urgency_keywords.items():
            if keyword in text.lower():
                max_urgency = max(max_urgency, score)
        
        # Base urgency by command type
        type_urgency = {
            CommandType.HELP: 0.3,
            CommandType.EXPENSE_ADD: 0.1,
            CommandType.LOCATION_FIND: 0.5,
            CommandType.QUESTION: 0.2
        }
        
        base_urgency = type_urgency.get(command_type, 0.3)
        return max(max_urgency, base_urgency)
    
    def _calculate_ambiguity(self, text: str, entities: Dict[str, Any], confidence: float) -> float:
        """Calculate ambiguity score."""
        # Base ambiguity from confidence
        base_ambiguity = 1.0 - confidence
        
        # Ambiguity indicators
        ambiguous_words = ["maybe", "perhaps", "might", "could", "or", "either"]
        ambiguity_boost = sum(0.1 for word in ambiguous_words if word in text.lower())
        
        # Entity clarity
        entity_clarity = min(0.3, len(entities) * 0.1)
        
        return min(1.0, base_ambiguity + ambiguity_boost - entity_clarity)
    
    def _build_context(
        self, 
        user_context: Optional[Dict[str, Any]], 
        conversation_id: Optional[str],
        entities: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build comprehensive context for command processing."""
        context = user_context or {}
        
        # Add conversation context
        if conversation_id and conversation_id in self.conversation_context:
            context["conversation"] = self.conversation_context[conversation_id]
        
        # Add entity context
        context["entities"] = entities
        
        # Add timestamp
        from datetime import datetime
        context["timestamp"] = datetime.utcnow().isoformat()
        
        return context
    
    async def _generate_intent_description(
        self, 
        text: str, 
        command_type: CommandType, 
        entities: Dict[str, Any],
        parameters: Dict[str, Any]
    ) -> str:
        """Generate human-readable intent description."""
        # Simple template-based generation
        templates = {
            CommandType.EXPENSE_ADD: "Add expense of {amount} for {category}",
            CommandType.BUDGET_CHECK: "Check {period} budget status",
            CommandType.LOCATION_FIND: "Find {service_type} near {location}",
            CommandType.TRIP_PLAN: "Plan trip to {destination}",
            CommandType.HELP: "Request help with system functionality",
            CommandType.QUESTION: "General question: {text}"
        }
        
        template = templates.get(command_type, "Process: {text}")
        
        # Fill template with parameters
        try:
            return template.format(**parameters, text=text[:50])
        except KeyError:
            return f"Process {command_type.value}: {text[:50]}"
    
    def _update_conversation_context(self, conversation_id: str, command: VoiceCommand):
        """Update conversation context for future commands."""
        if conversation_id not in self.conversation_context:
            self.conversation_context[conversation_id] = {
                "commands": [],
                "entities": {},
                "last_command_type": None
            }
        
        context = self.conversation_context[conversation_id]
        
        # Add command to history (keep last 5)
        context["commands"].append({
            "type": command.command_type.value,
            "text": command.normalized_text,
            "timestamp": command.context.get("timestamp")
        })
        context["commands"] = context["commands"][-5:]
        
        # Update entities
        for key, value in command.entities.items():
            if key not in context["entities"]:
                context["entities"][key] = []
            if isinstance(value, list):
                context["entities"][key].extend(value)
            else:
                context["entities"][key].append(value)
        
        # Update last command type
        context["last_command_type"] = command.command_type.value
    
    async def resolve_ambiguous_command(
        self, 
        command: VoiceCommand,
        clarification_options: List[str]
    ) -> VoiceCommand:
        """Resolve ambiguous commands using AI assistance."""
        if command.ambiguity_score < 0.5:
            return command  # Not ambiguous enough to warrant resolution
        
        prompt = f"""
        The voice command "{command.raw_text}" is ambiguous (score: {command.ambiguity_score:.2f}).
        
        Current interpretation: {command.intent}
        Available options: {clarification_options}
        Context: {command.context}
        
        Suggest the most likely intended command and updated parameters.
        Return as JSON: {{"intent": "...", "parameters": {{...}}, "confidence": 0.0-1.0}}
        """
        
        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.2
            )
            
            result_text = response.choices[0].message.content.strip()
            import json
            resolution = json.loads(result_text)
            
            # Update command with resolved interpretation
            command.intent = resolution.get("intent", command.intent)
            command.parameters.update(resolution.get("parameters", {}))
            command.confidence = resolution.get("confidence", command.confidence)
            command.ambiguity_score = max(0.0, command.ambiguity_score - 0.3)
            
            logger.info(f"Resolved ambiguous command: {command.intent}")
            return command
            
        except Exception as e:
            logger.warning(f"Failed to resolve ambiguous command: {e}")
            return command


# Global instance
advanced_nlp = AdvancedNLPProcessor()


async def get_advanced_nlp() -> AdvancedNLPProcessor:
    """Get the global NLP processor instance."""
    if advanced_nlp.nlp is None:
        await advanced_nlp.initialize()
    return advanced_nlp