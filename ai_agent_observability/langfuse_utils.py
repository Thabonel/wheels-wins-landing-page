"""
Langfuse Integration Utilities
Enhanced decorators and monitoring for AI agents
"""

import functools
import time
from typing import Dict, Any, Optional, Callable
from langfuse.decorators import observe, langfuse_context
from langfuse import Langfuse
from observability_config import observability

class LangfuseMonitor:
    """Enhanced Langfuse monitoring utilities"""
    
    def __init__(self):
        self.client = observability.langfuse_client
        
    @staticmethod
    def observe_agent(name: str = None, metadata: Dict[str, Any] = None):
        """
        Enhanced observe decorator for agent functions
        
        Args:
            name: Custom name for the trace
            metadata: Additional metadata to attach
        """
        def decorator(func: Callable):
            @observe(name=name or func.__name__)
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                # Add custom metadata
                if metadata:
                    langfuse_context.update_current_observation(metadata=metadata)
                
                # Track execution time
                start_time = time.time()
                try:
                    result = func(*args, **kwargs)
                    execution_time = time.time() - start_time
                    
                    # Update with performance metrics
                    langfuse_context.update_current_observation(
                        metadata={
                            **(metadata or {}),
                            "execution_time_seconds": execution_time,
                            "status": "success"
                        }
                    )
                    
                    return result
                    
                except Exception as e:
                    execution_time = time.time() - start_time
                    
                    # Log error details
                    langfuse_context.update_current_observation(
                        metadata={
                            **(metadata or {}),
                            "execution_time_seconds": execution_time,
                            "status": "error",
                            "error_type": type(e).__name__,
                            "error_message": str(e)
                        }
                    )
                    raise
                    
            return wrapper
        return decorator
    
    @staticmethod
    def observe_tool(tool_name: str, version: str = "1.0"):
        """
        Decorator specifically for observing tool usage
        
        Args:
            tool_name: Name of the tool
            version: Version of the tool
        """
        def decorator(func: Callable):
            @observe(name=f"tool_{tool_name}")
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                # Tool-specific metadata
                tool_metadata = {
                    "tool_name": tool_name,
                    "tool_version": version,
                    "tool_type": "function",
                    "input_args": str(args)[:500],  # Truncate long inputs
                    "input_kwargs": str(kwargs)[:500]
                }
                
                langfuse_context.update_current_observation(metadata=tool_metadata)
                
                start_time = time.time()
                try:
                    result = func(*args, **kwargs)
                    execution_time = time.time() - start_time
                    
                    # Success metrics
                    langfuse_context.update_current_observation(
                        metadata={
                            **tool_metadata,
                            "execution_time_seconds": execution_time,
                            "status": "success",
                            "output_type": type(result).__name__,
                            "output_preview": str(result)[:200] if result else None
                        }
                    )
                    
                    return result
                    
                except Exception as e:
                    execution_time = time.time() - start_time
                    
                    # Error metrics
                    langfuse_context.update_current_observation(
                        metadata={
                            **tool_metadata,
                            "execution_time_seconds": execution_time,
                            "status": "error",
                            "error_type": type(e).__name__,
                            "error_message": str(e)
                        }
                    )
                    raise
                    
            return wrapper
        return decorator
    
    @staticmethod
    def observe_llm_call(model: str = "gpt-4", provider: str = "openai"):
        """
        Decorator for observing LLM API calls
        
        Args:
            model: Model name being used
            provider: LLM provider (openai, anthropic, etc.)
        """
        def decorator(func: Callable):
            @observe(name=f"llm_call_{model}")
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                # LLM-specific metadata
                llm_metadata = {
                    "model": model,
                    "provider": provider,
                    "call_type": "completion"
                }
                
                langfuse_context.update_current_observation(metadata=llm_metadata)
                
                start_time = time.time()
                try:
                    result = func(*args, **kwargs)
                    execution_time = time.time() - start_time
                    
                    # Extract token usage if available
                    tokens_used = None
                    cost_estimate = None
                    
                    if hasattr(result, 'usage'):
                        tokens_used = result.usage.total_tokens
                        # Simple cost estimation (adjust based on actual pricing)
                        cost_estimate = tokens_used * 0.00003  # Rough estimate for GPT-4
                    
                    langfuse_context.update_current_observation(
                        metadata={
                            **llm_metadata,
                            "execution_time_seconds": execution_time,
                            "status": "success",
                            "tokens_used": tokens_used,
                            "estimated_cost_usd": cost_estimate
                        }
                    )
                    
                    return result
                    
                except Exception as e:
                    execution_time = time.time() - start_time
                    
                    langfuse_context.update_current_observation(
                        metadata={
                            **llm_metadata,
                            "execution_time_seconds": execution_time,
                            "status": "error",
                            "error_type": type(e).__name__,
                            "error_message": str(e)
                        }
                    )
                    raise
                    
            return wrapper
        return decorator
    
    def create_dataset(self, name: str, description: str = ""):
        """Create a new dataset in Langfuse"""
        try:
            dataset = self.client.create_dataset(
                name=name,
                description=description
            )
            observability.logger.info(f"✅ Created Langfuse dataset: {name}")
            return dataset
        except Exception as e:
            observability.logger.error(f"❌ Failed to create dataset {name}: {e}")
            raise
    
    def log_evaluation(self, trace_id: str, name: str, value: float, comment: str = ""):
        """Log an evaluation score for a trace"""
        try:
            self.client.score(
                trace_id=trace_id,
                name=name,
                value=value,
                comment=comment
            )
            observability.logger.info(f"✅ Logged evaluation {name}: {value}")
        except Exception as e:
            observability.logger.error(f"❌ Failed to log evaluation: {e}")

# Global monitor instance
langfuse_monitor = LangfuseMonitor()