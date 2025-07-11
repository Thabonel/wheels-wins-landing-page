"""
AgentOps Integration Utilities
Workflow tracking and agent performance monitoring
"""

import functools
import time
from typing import Dict, Any, Optional, Callable, List
import agentops
from agentops import track_agent, record_action, end_session
from observability_config import observability

class AgentOpsMonitor:
    """Enhanced AgentOps monitoring utilities"""
    
    def __init__(self):
        self.session_active = False
        self.current_workflow = None
        
    def start_workflow(self, workflow_name: str, metadata: Dict[str, Any] = None):
        """Start a new AgentOps workflow tracking session"""
        try:
            self.current_workflow = agentops.start_session(
                tags=[workflow_name, "ai_agent_observability"],
                config=metadata or {}
            )
            self.session_active = True
            
            observability.logger.info(f"🔄 Started AgentOps workflow: {workflow_name}")
            return self.current_workflow
            
        except Exception as e:
            observability.logger.error(f"❌ Failed to start AgentOps workflow: {e}")
            raise
    
    def end_workflow(self, status: str = "Success"):
        """End the current AgentOps workflow session"""
        try:
            if self.session_active:
                agentops.end_session(status)
                self.session_active = False
                observability.logger.info(f"✅ Ended AgentOps workflow with status: {status}")
        except Exception as e:
            observability.logger.error(f"❌ Failed to end AgentOps workflow: {e}")
    
    @staticmethod
    def track_agent_action(action_name: str, agent_name: str = None):
        """
        Decorator to track individual agent actions
        
        Args:
            action_name: Name of the action being performed
            agent_name: Name of the agent performing the action
        """
        def decorator(func: Callable):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                action_metadata = {
                    "action_name": action_name,
                    "agent_name": agent_name or "unknown_agent",
                    "function_name": func.__name__,
                    "timestamp": time.time()
                }
                
                start_time = time.time()
                try:
                    # Record the start of the action
                    agentops.record_action({
                        "action_type": "function_call",
                        "action": action_name,
                        "agent": agent_name,
                        "status": "started",
                        **action_metadata
                    })
                    
                    result = func(*args, **kwargs)
                    execution_time = time.time() - start_time
                    
                    # Record successful completion
                    agentops.record_action({
                        "action_type": "function_call",
                        "action": action_name,
                        "agent": agent_name,
                        "status": "completed",
                        "execution_time": execution_time,
                        "result_type": type(result).__name__,
                        **action_metadata
                    })
                    
                    observability.logger.info(f"✅ Agent action completed: {action_name} in {execution_time:.2f}s")
                    return result
                    
                except Exception as e:
                    execution_time = time.time() - start_time
                    
                    # Record error
                    agentops.record_action({
                        "action_type": "function_call",
                        "action": action_name,
                        "agent": agent_name,
                        "status": "error",
                        "execution_time": execution_time,
                        "error_type": type(e).__name__,
                        "error_message": str(e),
                        **action_metadata
                    })
                    
                    observability.logger.error(f"❌ Agent action failed: {action_name} - {e}")
                    raise
                    
            return wrapper
        return decorator
    
    @staticmethod
    def track_llm_call(model: str = "gpt-4"):
        """
        Decorator to track LLM API calls through AgentOps
        
        Args:
            model: The LLM model being used
        """
        def decorator(func: Callable):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                
                try:
                    result = func(*args, **kwargs)
                    execution_time = time.time() - start_time
                    
                    # Extract token usage and cost if available
                    tokens_used = getattr(result, 'usage', {}).get('total_tokens', 0) if hasattr(result, 'usage') else 0
                    
                    agentops.record_action({
                        "action_type": "llm_call",
                        "model": model,
                        "status": "success",
                        "execution_time": execution_time,
                        "tokens_used": tokens_used,
                        "estimated_cost": tokens_used * 0.00003  # Rough estimate
                    })
                    
                    return result
                    
                except Exception as e:
                    execution_time = time.time() - start_time
                    
                    agentops.record_action({
                        "action_type": "llm_call",
                        "model": model,
                        "status": "error",
                        "execution_time": execution_time,
                        "error_type": type(e).__name__,
                        "error_message": str(e)
                    })
                    
                    raise
                    
            return wrapper
        return decorator
    
    @staticmethod
    def track_tool_usage(tool_name: str, tool_version: str = "1.0"):
        """
        Decorator to track tool usage through AgentOps
        
        Args:
            tool_name: Name of the tool
            tool_version: Version of the tool
        """
        def decorator(func: Callable):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                
                try:
                    result = func(*args, **kwargs)
                    execution_time = time.time() - start_time
                    
                    agentops.record_action({
                        "action_type": "tool_usage",
                        "tool_name": tool_name,
                        "tool_version": tool_version,
                        "status": "success",
                        "execution_time": execution_time,
                        "input_size": len(str(args) + str(kwargs)),
                        "output_type": type(result).__name__
                    })
                    
                    return result
                    
                except Exception as e:
                    execution_time = time.time() - start_time
                    
                    agentops.record_action({
                        "action_type": "tool_usage",
                        "tool_name": tool_name,
                        "tool_version": tool_version,
                        "status": "error",
                        "execution_time": execution_time,
                        "error_type": type(e).__name__,
                        "error_message": str(e)
                    })
                    
                    raise
                    
            return wrapper
        return decorator
    
    def record_agent_collaboration(self, source_agent: str, target_agent: str, 
                                 task: str, status: str = "initiated"):
        """Record agent-to-agent collaboration events"""
        try:
            agentops.record_action({
                "action_type": "agent_collaboration",
                "source_agent": source_agent,
                "target_agent": target_agent,
                "task": task,
                "status": status,
                "timestamp": time.time()
            })
            
            observability.logger.info(f"🤝 Agent collaboration: {source_agent} -> {target_agent} ({task})")
            
        except Exception as e:
            observability.logger.error(f"❌ Failed to record agent collaboration: {e}")
    
    def get_session_summary(self) -> Dict[str, Any]:
        """Get summary of the current session"""
        if not self.session_active:
            return {"error": "No active session"}
        
        try:
            # This would depend on AgentOps API capabilities
            # For now, return basic info
            return {
                "session_active": self.session_active,
                "workflow": self.current_workflow,
                "timestamp": time.time()
            }
        except Exception as e:
            observability.logger.error(f"❌ Failed to get session summary: {e}")
            return {"error": str(e)}

# Global monitor instance
agentops_monitor = AgentOpsMonitor()