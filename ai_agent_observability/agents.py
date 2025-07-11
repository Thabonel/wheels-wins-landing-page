"""
Sample AI Agents with Full Observability
Demonstrates integration of OpenAI, Langfuse, and AgentOps
"""

from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from openai import OpenAI
from observability_config import observability
from langfuse_utils import langfuse_monitor
from agentops_utils import agentops_monitor

class BaseAgent:
    """Base class for all agents with observability built-in"""
    
    def __init__(self, name: str, role: str, model: str = "gpt-4"):
        self.name = name
        self.role = role
        self.model = model
        self.client = observability.openai_client or observability.initialize_openai()
        
    @langfuse_monitor.observe_agent(metadata={"agent_type": "base"})
    @agentops_monitor.track_agent_action("agent_initialization")
    def initialize(self):
        """Initialize the agent"""
        observability.logger.info(f"🤖 Initializing {self.name} ({self.role})")
        return {"status": "initialized", "agent": self.name}
    
    @langfuse_monitor.observe_llm_call()
    @agentops_monitor.track_llm_call()
    def _make_llm_call(self, messages: List[Dict[str, str]], temperature: float = 0.7):
        """Make an LLM API call with full observability"""
        try:
            with observability.get_tracer().start_as_current_span("llm_call") as span:
                span.set_attribute("model", self.model)
                span.set_attribute("agent", self.name)
                
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temperature
                )
                
                # Add span attributes
                if hasattr(response, 'usage'):
                    span.set_attribute("tokens_used", response.usage.total_tokens)
                    span.set_attribute("prompt_tokens", response.usage.prompt_tokens)
                    span.set_attribute("completion_tokens", response.usage.completion_tokens)
                
                return response
                
        except Exception as e:
            observability.logger.error(f"❌ LLM call failed for {self.name}: {e}")
            raise

class CEOAgent(BaseAgent):
    """CEO Agent that delegates tasks and oversees workflow"""
    
    def __init__(self):
        super().__init__("CEO Agent", "Task Delegation and Oversight", "gpt-4")
    
    @langfuse_monitor.observe_agent(name="ceo_delegate_task", metadata={"agent_role": "ceo"})
    @agentops_monitor.track_agent_action("delegate_task", "CEO")
    def delegate_task(self, target_agent: 'BaseAgent', task: str) -> Dict[str, Any]:
        """Delegate a task to another agent"""
        observability.logger.info(f"👔 CEO delegating task to {target_agent.name}: {task}")
        
        # Record the delegation in AgentOps
        agentops_monitor.record_agent_collaboration(
            source_agent=self.name,
            target_agent=target_agent.name,
            task=task,
            status="delegated"
        )
        
        # Generate delegation message using LLM
        messages = [
            {"role": "system", "content": f"You are a CEO delegating tasks. Be clear and professional."},
            {"role": "user", "content": f"Delegate this task to the {target_agent.role}: {task}"}
        ]
        
        response = self._make_llm_call(messages)
        delegation_message = response.choices[0].message.content
        
        return {
            "status": "delegated",
            "target_agent": target_agent.name,
            "task": task,
            "delegation_message": delegation_message
        }
    
    @langfuse_monitor.observe_agent(name="ceo_review_results", metadata={"agent_role": "ceo"})
    @agentops_monitor.track_agent_action("review_results", "CEO")
    def review_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Review results from other agents"""
        observability.logger.info(f"👔 CEO reviewing results")
        
        messages = [
            {"role": "system", "content": "You are a CEO reviewing work results. Provide constructive feedback."},
            {"role": "user", "content": f"Review these results and provide feedback: {results}"}
        ]
        
        response = self._make_llm_call(messages)
        review = response.choices[0].message.content
        
        return {
            "status": "reviewed",
            "review": review,
            "original_results": results
        }

class DeveloperAgent(BaseAgent):
    """Developer Agent that writes code and implements solutions"""
    
    def __init__(self):
        super().__init__("Developer Agent", "Code Development and Implementation", "gpt-4")
    
    @langfuse_monitor.observe_agent(name="developer_write_code", metadata={"agent_role": "developer"})
    @agentops_monitor.track_agent_action("write_code", "Developer")
    def write_code(self, requirements: str, language: str = "python") -> Dict[str, Any]:
        """Write code based on requirements"""
        observability.logger.info(f"💻 Developer writing {language} code")
        
        messages = [
            {"role": "system", "content": f"You are an expert {language} developer. Write clean, well-documented code."},
            {"role": "user", "content": f"Write {language} code for: {requirements}"}
        ]
        
        response = self._make_llm_call(messages)
        code = response.choices[0].message.content
        
        return {
            "status": "code_written",
            "language": language,
            "requirements": requirements,
            "code": code,
            "lines_of_code": len(code.split('\n'))
        }
    
    @langfuse_monitor.observe_agent(name="developer_review_code", metadata={"agent_role": "developer"})
    @agentops_monitor.track_agent_action("review_code", "Developer")
    def review_code(self, code: str) -> Dict[str, Any]:
        """Review and suggest improvements for code"""
        observability.logger.info(f"💻 Developer reviewing code")
        
        messages = [
            {"role": "system", "content": "You are a senior developer reviewing code. Look for bugs, improvements, and best practices."},
            {"role": "user", "content": f"Review this code and suggest improvements:\n\n{code}"}
        ]
        
        response = self._make_llm_call(messages)
        review = response.choices[0].message.content
        
        return {
            "status": "code_reviewed",
            "original_code": code,
            "review": review,
            "review_length": len(review)
        }

class DataAnalystAgent(BaseAgent):
    """Data Analyst Agent that analyzes datasets and provides insights"""
    
    def __init__(self):
        super().__init__("Data Analyst Agent", "Data Analysis and Insights", "gpt-4")
    
    @langfuse_monitor.observe_agent(name="analyst_analyze_data", metadata={"agent_role": "analyst"})
    @agentops_monitor.track_agent_action("analyze_data", "DataAnalyst")
    def analyze_dataset(self, data: pd.DataFrame, analysis_type: str = "general") -> Dict[str, Any]:
        """Analyze a dataset and provide insights"""
        observability.logger.info(f"📊 Data Analyst analyzing dataset ({analysis_type})")
        
        # Generate basic statistics
        stats = {
            "rows": len(data),
            "columns": len(data.columns),
            "missing_values": data.isnull().sum().sum(),
            "data_types": data.dtypes.value_counts().to_dict()
        }
        
        # Create summary for LLM
        summary = f"""
        Dataset Summary:
        - Rows: {stats['rows']}
        - Columns: {stats['columns']}
        - Missing values: {stats['missing_values']}
        - Column names: {list(data.columns)}
        - Data types: {stats['data_types']}
        
        First few rows:
        {data.head().to_string()}
        """
        
        messages = [
            {"role": "system", "content": f"You are a data analyst providing {analysis_type} insights about datasets."},
            {"role": "user", "content": f"Analyze this dataset and provide insights:\n{summary}"}
        ]
        
        response = self._make_llm_call(messages)
        insights = response.choices[0].message.content
        
        return {
            "status": "analysis_complete",
            "analysis_type": analysis_type,
            "statistics": stats,
            "insights": insights,
            "data_quality_score": (1 - stats['missing_values'] / (stats['rows'] * stats['columns'])) * 100
        }
    
    @langfuse_monitor.observe_agent(name="analyst_create_visualization", metadata={"agent_role": "analyst"})
    @agentops_monitor.track_agent_action("create_visualization", "DataAnalyst")
    def suggest_visualizations(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Suggest appropriate visualizations for the dataset"""
        observability.logger.info(f"📊 Data Analyst suggesting visualizations")
        
        numeric_cols = data.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = data.select_dtypes(include=['object']).columns.tolist()
        
        suggestions = []
        
        if len(numeric_cols) >= 2:
            suggestions.append("Scatter plot for correlation analysis")
            suggestions.append("Heatmap for correlation matrix")
        
        if len(categorical_cols) > 0:
            suggestions.append("Bar chart for categorical distribution")
            suggestions.append("Pie chart for category proportions")
        
        if len(numeric_cols) > 0:
            suggestions.append("Histogram for distribution analysis")
            suggestions.append("Box plot for outlier detection")
        
        return {
            "status": "visualizations_suggested",
            "numeric_columns": numeric_cols,
            "categorical_columns": categorical_cols,
            "suggestions": suggestions,
            "total_suggestions": len(suggestions)
        }

# Agent factory function
@langfuse_monitor.observe_agent(name="create_agent_team")
@agentops_monitor.track_agent_action("create_team", "AgentFactory")
def create_agent_team() -> Dict[str, BaseAgent]:
    """Create a team of agents with full observability"""
    observability.logger.info("🏭 Creating agent team")
    
    agents = {
        "ceo": CEOAgent(),
        "developer": DeveloperAgent(),
        "analyst": DataAnalystAgent()
    }
    
    # Initialize all agents
    for agent in agents.values():
        agent.initialize()
    
    observability.logger.info(f"✅ Created team of {len(agents)} agents")
    return agents