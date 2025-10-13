"""
Claude Conversation Adapter
Makes ClaudeAIService compatible with AdvancedIntelligentConversation interface
"""

import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from app.services.claude_ai_service import ClaudeAIService, ClaudeMessage

logger = logging.getLogger(__name__)


class ClaudeConversationAdapter:
    """
    Adapter that wraps ClaudeAIService to match the AdvancedIntelligentConversation interface.
    This allows using Claude Sonnet 4.5 as a drop-in replacement for OpenAI in the orchestrator.
    """

    def __init__(self, claude_service: ClaudeAIService):
        self.claude_service = claude_service
        logger.info("✅ Claude Conversation Adapter initialized (Claude Sonnet 4.5)")

    async def initialize(self):
        """Initialize (no-op for Claude service, already initialized)"""
        logger.info("Claude service already initialized, skipping")
        pass

    async def analyze_intent(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze user intent using Claude.
        Returns intent classification compatible with orchestrator expectations.
        """
        try:
            # Build intent analysis prompt
            intent_prompt = f"""Analyze this user message and determine their intent.
Consider the conversation context and classify into ONE of these categories:

Available intents:
- wheels: Travel planning, routes, campgrounds, fuel, maintenance, vehicle-related
- wins: Budget, expenses, income, financial tracking, spending, money management
- social: Community, friends, meetups, sharing experiences, social networking
- shop: Shopping, products, marketplace, buying/selling RV gear
- you: Profile, settings, personal preferences, account management
- admin: Admin tasks, system management (for admins only)
- general: General conversation, greetings, casual chat, help requests

User message: "{message}"

Context: {json.dumps(context, default=str)}

Respond with JSON only:
{{
    "intent": "category_name",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation",
    "entities": {{}}
}}"""

            # Get Claude's analysis
            messages = [ClaudeMessage(role="user", content=intent_prompt)]
            response = await self.claude_service.chat_completion(
                messages=messages,
                user_id=context.get('user_id'),
                user_context=context
            )

            # Parse Claude's JSON response
            try:
                intent_data = json.loads(response.content)
                logger.info(f"🎯 Claude intent analysis: {intent_data.get('intent')} (confidence: {intent_data.get('confidence')})")
                return intent_data
            except json.JSONDecodeError:
                # If Claude doesn't return valid JSON, extract intent from text
                logger.warning("Claude didn't return valid JSON, extracting intent from text")
                content_lower = response.content.lower()

                # Simple keyword matching as fallback
                if any(word in content_lower for word in ['route', 'travel', 'camp', 'fuel', 'maintenance']):
                    intent = 'wheels'
                elif any(word in content_lower for word in ['budget', 'expense', 'money', 'spend', 'income']):
                    intent = 'wins'
                elif any(word in content_lower for word in ['friend', 'social', 'community', 'meetup']):
                    intent = 'social'
                elif any(word in content_lower for word in ['shop', 'buy', 'product', 'gear']):
                    intent = 'shop'
                elif any(word in content_lower for word in ['profile', 'settings', 'account', 'preferences']):
                    intent = 'you'
                else:
                    intent = 'general'

                return {
                    'intent': intent,
                    'confidence': 0.7,
                    'reasoning': 'Extracted from Claude response (fallback)',
                    'entities': {}
                }

        except Exception as e:
            logger.error(f"❌ Intent analysis failed: {e}")
            # Return safe default
            return {
                'intent': 'general',
                'confidence': 0.5,
                'reasoning': f'Analysis failed: {str(e)}',
                'entities': {}
            }

    async def generate_response(
        self,
        message: str,
        context: Dict[str, Any],
        intent: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Generate a conversational response using Claude.
        Compatible with orchestrator's expected interface.
        """
        try:
            # Extract relevant context
            user_id = context.get('user_id')
            session_id = context.get('session_id')
            user_context = {
                'location': context.get('user_location'),
                'current_page': context.get('current_page'),
                'conversation_history': context.get('conversation_history', []),
            }

            # Add intent to system context if provided
            if intent and intent != 'general':
                user_context['detected_intent'] = intent

            logger.info(f"🤖 Generating Claude response for message: '{message[:50]}...'")

            # Use Claude's send_message method
            response = await self.claude_service.send_message(
                message=message,
                user_id=user_id,
                conversation_id=session_id,
                user_context=user_context,
                stream=False
            )

            logger.info(f"✅ Claude response generated ({len(response)} chars)")
            return response

        except Exception as e:
            logger.error(f"❌ Response generation failed: {e}")
            return f"I apologize, but I encountered an error processing your request: {str(e)}"

    def get_service_type(self) -> str:
        """Return service type identifier"""
        return "claude"

    def get_model_name(self) -> str:
        """Return Claude model name"""
        return self.claude_service.model

    def get_service_stats(self) -> Dict[str, Any]:
        """Get service performance statistics"""
        return self.claude_service.get_service_stats()
