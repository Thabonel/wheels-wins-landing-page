"""
Observability Decorators for Wheels and Wins
Simplified decorators that integrate with the existing system
"""

import functools
import time
from typing import Dict, Any, Optional, Callable
import logging

from .config import observability

logger = logging.getLogger(__name__)

def observe_agent(name: str = None, metadata: Dict[str, Any] = None):
    """
    Decorator for observing agent functions
    
    Args:
        name: Custom name for the observation
        metadata: Additional metadata to attach
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            if not observability.is_enabled():
                return func(*args, **kwargs)
                
            observation_name = name or f"agent_{func.__name__}"
            start_time = time.time()
            
            # Initialize observability if not done
            if not observability._initialized:
                observability.initialize_all()
            
            try:
                # Use Langfuse if available
                if observability.langfuse_client:
                    from langfuse.decorators import langfuse_context
                    
                    # Update context with metadata
                    if metadata:
                        langfuse_context.update_current_observation(metadata=metadata)
                
                # Use OpenTelemetry if available  
                if observability.tracer:
                    with observability.tracer.start_as_current_span(observation_name) as span:
                        if metadata:
                            for key, value in metadata.items():
                                span.set_attribute(key, str(value))
                        
                        result = func(*args, **kwargs)
                        
                        execution_time = time.time() - start_time
                        span.set_attribute("execution_time", execution_time)
                        span.set_attribute("status", "success")
                        
                        return result
                else:
                    result = func(*args, **kwargs)
                    execution_time = time.time() - start_time
                    logger.info(f"Agent function '{observation_name}' completed in {execution_time:.3f}s")
                    return result
                    
            except Exception as e:
                execution_time = time.time() - start_time
                
                # Log error with observability
                if observability.tracer:
                    with observability.tracer.start_as_current_span(f"{observation_name}_error") as span:
                        span.set_attribute("execution_time", execution_time)
                        span.set_attribute("status", "error")
                        span.set_attribute("error_type", type(e).__name__)
                        span.set_attribute("error_message", str(e))
                
                logger.error(f"Agent function '{observation_name}' failed after {execution_time:.3f}s: {e}")
                raise
                
        return wrapper
    return decorator

def observe_tool(tool_name: str, version: str = "1.0"):
    """
    Decorator for observing tool usage
    
    Args:
        tool_name: Name of the tool
        version: Version of the tool
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            if not observability.is_enabled():
                return func(*args, **kwargs)
                
            start_time = time.time()
            
            try:
                # Use AgentOps if available
                if observability.agentops_initialized:
                    import agentops
                    agentops.record_action({
                        "action_type": "tool_usage",
                        "tool_name": tool_name,
                        "tool_version": version,
                        "status": "started",
                        "timestamp": start_time
                    })
                
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                # Record success
                if observability.agentops_initialized:
                    import agentops
                    agentops.record_action({
                        "action_type": "tool_usage", 
                        "tool_name": tool_name,
                        "tool_version": version,
                        "status": "completed",
                        "execution_time": execution_time,
                        "result_type": type(result).__name__
                    })
                
                logger.info(f"Tool '{tool_name}' v{version} completed in {execution_time:.3f}s")
                return result
                
            except Exception as e:
                execution_time = time.time() - start_time
                
                # Record error
                if observability.agentops_initialized:
                    import agentops
                    agentops.record_action({
                        "action_type": "tool_usage",
                        "tool_name": tool_name, 
                        "tool_version": version,
                        "status": "error",
                        "execution_time": execution_time,
                        "error_type": type(e).__name__,
                        "error_message": str(e)
                    })
                
                logger.error(f"Tool '{tool_name}' v{version} failed after {execution_time:.3f}s: {e}")
                raise
                
        return wrapper
    return decorator

def observe_llm_call(model: str = "gpt-4", provider: str = "openai"):
    """
    Decorator for observing LLM API calls
    
    Args:
        model: Model name being used
        provider: LLM provider
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            if not observability.is_enabled():
                return func(*args, **kwargs)
                
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                # Extract token usage if available
                tokens_used = 0
                cost_estimate = 0.0
                
                if hasattr(result, 'usage') and result.usage:
                    tokens_used = result.usage.total_tokens
                    # Simple cost estimation based on model
                    model_costs = {
                        "gpt-4": 0.03,
                        "gpt-4-turbo": 0.01, 
                        "gpt-3.5-turbo": 0.0015
                    }
                    cost_per_1k = model_costs.get(model, 0.01)
                    cost_estimate = (tokens_used / 1000) * cost_per_1k
                
                # Record to observability platforms
                if observability.tracer:
                    with observability.tracer.start_as_current_span(f"llm_call_{model}") as span:
                        span.set_attribute("model", model)
                        span.set_attribute("provider", provider)
                        span.set_attribute("execution_time", execution_time)
                        span.set_attribute("tokens_used", tokens_used)
                        span.set_attribute("estimated_cost", cost_estimate)
                        span.set_attribute("status", "success")
                
                if observability.agentops_initialized:
                    import agentops
                    agentops.record_action({
                        "action_type": "llm_call",
                        "model": model,
                        "provider": provider,
                        "status": "success",
                        "execution_time": execution_time,
                        "tokens_used": tokens_used,
                        "estimated_cost": cost_estimate
                    })
                
                logger.info(f"LLM call to {model} completed in {execution_time:.3f}s, tokens: {tokens_used}, cost: ${cost_estimate:.4f}")
                return result
                
            except Exception as e:
                execution_time = time.time() - start_time
                
                # Record error
                if observability.tracer:
                    with observability.tracer.start_as_current_span(f"llm_call_{model}_error") as span:
                        span.set_attribute("model", model)
                        span.set_attribute("provider", provider)
                        span.set_attribute("execution_time", execution_time)
                        span.set_attribute("status", "error")
                        span.set_attribute("error_type", type(e).__name__)
                        span.set_attribute("error_message", str(e))
                
                if observability.agentops_initialized:
                    import agentops
                    agentops.record_action({
                        "action_type": "llm_call",
                        "model": model,
                        "provider": provider,
                        "status": "error",
                        "execution_time": execution_time,
                        "error_type": type(e).__name__,
                        "error_message": str(e)
                    })
                
                logger.error(f"LLM call to {model} failed after {execution_time:.3f}s: {e}")
                raise
                
        return wrapper
    return decorator