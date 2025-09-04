"""
Enhanced PAM Orchestrator with Phase 2 Integration
Extends the existing orchestrator with memory-enhanced capabilities
"""

import logging
from typing import Dict, Any, Optional
from .orchestrator import PAMAgentOrchestrator
from .phase2_integration import integrate_phase2_with_existing
from ..core.feature_flags import is_feature_enabled

logger = logging.getLogger(__name__)


class EnhancedPAMAgentOrchestrator(PAMAgentOrchestrator):
    """
    Enhanced orchestrator that extends the existing PAM orchestrator with Phase 2 capabilities
    Maintains full backward compatibility while adding intelligence features
    """
    
    def __init__(self, openai_api_key: str):
        # Initialize the base orchestrator
        super().__init__(openai_api_key)
        
        # Add Phase 2 integration
        self._integrate_phase2_capabilities()
    
    def _integrate_phase2_capabilities(self):
        """Integrate Phase 2 memory and context capabilities"""
        try:
            # Integrate Phase 2 with the existing orchestrator
            integrate_phase2_with_existing(self, self.openai_api_key)
            
            logger.info("✅ Phase 2 capabilities integrated successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to integrate Phase 2 capabilities: {e}")
            logger.info("Continuing with standard orchestrator functionality")
    
    async def process_message_enhanced(
        self, 
        message: str, 
        user_id: str,
        context: Dict[str, Any] = None,
        use_phase2: bool = True
    ):
        """
        Enhanced message processing that can use Phase 2 capabilities or fall back to standard processing
        
        Args:
            message: User's message
            user_id: User identifier  
            context: Additional context
            use_phase2: Whether to use Phase 2 enhancements
        
        Returns:
            PAMAgentResult with enhanced or standard processing
        """
        # Check if Phase 2 should be used
        should_use_phase2 = (
            use_phase2 and 
            hasattr(self, 'process_with_phase2_enhancement') and
            is_feature_enabled("ENABLE_PAM_PHASE2_MEMORY", user_id)
        )
        
        if should_use_phase2:
            try:
                logger.info(f"🧠 Using Phase 2 enhanced processing for user {user_id}")
                return await self.process_with_phase2_enhancement(
                    message=message,
                    user_id=user_id,
                    context=context
                )
            except Exception as e:
                logger.warning(f"⚠️ Phase 2 processing failed, falling back to standard: {e}")
                return await self.process_message(message, user_id, context)
        else:
            # Use standard processing
            logger.info(f"🤖 Using standard processing for user {user_id}")
            return await self.process_message(message, user_id, context)
    
    async def get_orchestrator_status(self) -> Dict[str, Any]:
        """Get status of the enhanced orchestrator"""
        try:
            base_status = {
                "orchestrator_type": "enhanced",
                "base_agent_initialized": self.main_agent is not None,
                "multi_agent_available": self.multi_agent_coordinator is not None,
                "proactive_intelligence_available": self.proactive_coordinator is not None,
            }
            
            # Add Phase 2 status if available
            phase2_status = {
                "phase2_integrated": hasattr(self, 'phase2_orchestrator'),
                "memory_enhancement_available": hasattr(self, 'process_with_phase2_enhancement'),
            }
            
            if hasattr(self, 'phase2_orchestrator'):
                phase2_orch = self.phase2_orchestrator
                phase2_status.update({
                    "enhanced_tools_count": len(phase2_orch.enhanced_tool_registry.tools),
                    "legacy_tools_count": len(phase2_orch.legacy_tool_registry.get_all_tools()),
                    "checkpointer_available": phase2_orch.checkpointer is not None,
                })
            
            return {
                **base_status,
                **phase2_status,
                "status": "ready",
                "capabilities": [
                    "trip_planning",
                    "expense_tracking", 
                    "budget_analysis",
                    "memory_search",
                    "context_enrichment",
                    "preference_learning",
                    "conversation_persistence"
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting orchestrator status: {e}")
            return {
                "status": "error",
                "error": str(e),
                "orchestrator_type": "enhanced"
            }


def create_enhanced_orchestrator(openai_api_key: str) -> EnhancedPAMAgentOrchestrator:
    """
    Create and return enhanced PAM orchestrator with Phase 2 capabilities
    
    Args:
        openai_api_key: OpenAI API key for model access
        
    Returns:
        Enhanced orchestrator with Phase 2 memory and context capabilities
    """
    try:
        orchestrator = EnhancedPAMAgentOrchestrator(openai_api_key)
        logger.info("✅ Enhanced PAM orchestrator created successfully")
        return orchestrator
        
    except Exception as e:
        logger.error(f"❌ Failed to create enhanced orchestrator: {e}")
        # Fallback to standard orchestrator
        logger.info("🔄 Falling back to standard orchestrator")
        return PAMAgentOrchestrator(openai_api_key)


# Helper functions for feature flag integration
def should_use_enhanced_processing(user_id: str) -> bool:
    """Check if enhanced processing should be used for a user"""
    return is_feature_enabled("ENABLE_PAM_PHASE2_MEMORY", user_id)


def get_processing_mode(user_id: str) -> str:
    """Get the processing mode for a user"""
    if should_use_enhanced_processing(user_id):
        return "phase2_enhanced"
    elif is_feature_enabled("ENABLE_PAM_MULTI_AGENT", user_id):
        return "multi_agent"
    else:
        return "standard"