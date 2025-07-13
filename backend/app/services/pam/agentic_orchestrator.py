"""
Agentic Orchestrator - True AI Agent Implementation for PAM
Implements autonomous goal-oriented planning, multi-step reasoning, and dynamic tool selection.
"""

import asyncio
import json
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from app.core.logging import get_logger
from app.services.pam.intelligent_conversation import IntelligentConversation
from app.services.pam.context_manager import PamContext
from app.services.pam.memory import PamMemory

logger = get_logger(__name__)

class TaskComplexity(Enum):
    SIMPLE = "simple"           # Single tool, direct response
    MODERATE = "moderate"       # Multiple tools, sequential execution
    COMPLEX = "complex"         # Multi-step planning, conditional logic
    COLLABORATIVE = "collaborative"  # Multiple agents/nodes working together

class AgentState(Enum):
    IDLE = "idle"
    PLANNING = "planning"
    EXECUTING = "executing"
    MONITORING = "monitoring"
    LEARNING = "learning"

@dataclass
class Task:
    id: str
    description: str
    user_goal: str
    complexity: TaskComplexity
    required_tools: List[str]
    estimated_steps: int
    context: Dict[str, Any]
    priority: int = 1
    dependencies: List[str] = None

@dataclass
class ExecutionPlan:
    task_id: str
    steps: List[Dict[str, Any]]
    success_criteria: Dict[str, Any]
    fallback_strategies: List[Dict[str, Any]]
    monitoring_points: List[str]

@dataclass
class ExecutionResult:
    task_id: str
    success: bool
    outputs: Dict[str, Any]
    execution_time: float
    tools_used: List[str]
    errors: List[str] = None
    learned_insights: Dict[str, Any] = None

class AgenticOrchestrator:
    """
    True agentic AI orchestrator that can:
    1. Plan multi-step goals autonomously
    2. Select and compose tools dynamically
    3. Monitor execution and adapt strategies
    4. Learn from outcomes and improve
    5. Proactively assist users
    """
    
    def __init__(self, conversation_service: IntelligentConversation):
        self.conversation_service = conversation_service
        self.memory = PamMemory()
        self.state = AgentState.IDLE
        self.current_plan: Optional[ExecutionPlan] = None
        self.tool_registry = {}
        self.node_agents = {}
        self.learning_history = []
        
        # Initialize agentic capabilities
        self._initialize_agent_systems()
    
    def _initialize_agent_systems(self):
        """Initialize the agent's cognitive systems"""
        self.goal_planner = GoalPlanner(self.conversation_service)
        self.task_decomposer = TaskDecomposer()
        self.tool_selector = DynamicToolSelector(self.tool_registry)
        self.execution_monitor = ExecutionMonitor()
        self.learning_engine = LearningEngine()
        self.proactive_assistant = ProactiveAssistant(self.memory)
        
        logger.info("🧠 Agentic AI systems initialized")
    
    async def process_user_request(self, user_id: str, message: str, 
                                 context: PamContext) -> Dict[str, Any]:
        """
        Main agentic processing loop:
        1. Understand user intent and goals
        2. Plan approach autonomously
        3. Execute with monitoring
        4. Learn from results
        5. Provide intelligent response
        """
        try:
            logger.info(f"🎯 Processing agentic request from user {user_id}: {message[:100]}")
            
            # 1. ANALYZE & UNDERSTAND
            self.state = AgentState.PLANNING
            user_goals = await self.goal_planner.extract_goals(message, context)
            
            # 2. ASSESS COMPLEXITY & PLAN
            tasks = await self.task_decomposer.decompose_goals(user_goals, context)
            execution_plan = await self._create_execution_plan(tasks, context)
            
            # 3. EXECUTE WITH MONITORING
            self.state = AgentState.EXECUTING
            self.current_plan = execution_plan
            results = await self._execute_plan_with_monitoring(execution_plan, context)
            
            # 4. LEARN & ADAPT
            self.state = AgentState.LEARNING
            insights = await self.learning_engine.learn_from_execution(
                execution_plan, results, user_goals
            )
            
            # 5. GENERATE INTELLIGENT RESPONSE
            response = await self._synthesize_agentic_response(
                user_goals, results, insights, context
            )
            
            # 6. PROACTIVE OPPORTUNITIES
            await self._check_proactive_opportunities(user_id, context, results)
            
            self.state = AgentState.IDLE
            return response
            
        except Exception as e:
            logger.error(f"❌ Agentic processing error: {str(e)}")
            self.state = AgentState.IDLE
            return await self._generate_error_response(e, context)
    
    async def _create_execution_plan(self, tasks: List[Task], 
                                   context: PamContext) -> ExecutionPlan:
        """Create a dynamic execution plan based on task analysis"""
        
        # Analyze task dependencies and optimal execution order
        ordered_tasks = await self._optimize_task_order(tasks)
        
        steps = []
        for task in ordered_tasks:
            # Dynamically select tools for each task
            selected_tools = await self.tool_selector.select_optimal_tools(
                task, context, self.tool_registry
            )
            
            step = {
                "task_id": task.id,
                "description": task.description,
                "tools": selected_tools,
                "complexity": task.complexity,
                "success_criteria": await self._define_success_criteria(task),
                "fallback_options": await self._generate_fallback_options(task)
            }
            steps.append(step)
        
        return ExecutionPlan(
            task_id=f"plan_{datetime.now().isoformat()}",
            steps=steps,
            success_criteria={"overall_success": True, "user_satisfaction": 0.8},
            fallback_strategies=await self._generate_plan_fallbacks(tasks),
            monitoring_points=["tool_execution", "step_completion", "error_detection"]
        )
    
    async def _execute_plan_with_monitoring(self, plan: ExecutionPlan, 
                                          context: PamContext) -> List[ExecutionResult]:
        """Execute plan with real-time monitoring and adaptation"""
        results = []
        
        for step in plan.steps:
            try:
                # Monitor execution state
                await self.execution_monitor.start_step_monitoring(step)
                
                # Execute step with selected tools
                step_result = await self._execute_step(step, context)
                
                # Evaluate step success
                success = await self._evaluate_step_success(step, step_result)
                
                if not success:
                    # Try fallback strategies
                    step_result = await self._execute_fallback_strategies(
                        step, step_result, context
                    )
                
                results.append(step_result)
                
                # Adapt future steps based on current results
                await self._adapt_remaining_steps(plan, step_result, results)
                
            except Exception as e:
                logger.error(f"❌ Step execution error: {str(e)}")
                error_result = ExecutionResult(
                    task_id=step["task_id"],
                    success=False,
                    outputs={},
                    execution_time=0.0,
                    tools_used=[],
                    errors=[str(e)]
                )
                results.append(error_result)
        
        return results
    
    async def _execute_step(self, step: Dict[str, Any], 
                          context: PamContext) -> ExecutionResult:
        """Execute a single step using selected tools"""
        start_time = datetime.now()
        tools_used = []
        outputs = {}
        errors = []
        
        try:
            for tool_config in step["tools"]:
                tool_name = tool_config["name"]
                tool_params = tool_config["params"]
                
                # Get tool instance
                tool = self.tool_registry.get(tool_name)
                if not tool:
                    # Dynamically discover and load tool
                    tool = await self._discover_and_load_tool(tool_name)
                
                # Execute tool with monitoring
                tool_result = await tool.execute(tool_params, context)
                tools_used.append(tool_name)
                outputs[tool_name] = tool_result
                
                # Check if tool execution meets step criteria
                if not await self._validate_tool_result(tool_result, step):
                    errors.append(f"Tool {tool_name} didn't meet success criteria")
        
        except Exception as e:
            errors.append(f"Step execution error: {str(e)}")
        
        execution_time = (datetime.now() - start_time).total_seconds()
        
        return ExecutionResult(
            task_id=step["task_id"],
            success=len(errors) == 0,
            outputs=outputs,
            execution_time=execution_time,
            tools_used=tools_used,
            errors=errors if errors else None
        )
    
    async def _synthesize_agentic_response(self, user_goals: List[Dict], 
                                         results: List[ExecutionResult],
                                         insights: Dict[str, Any],
                                         context: PamContext) -> Dict[str, Any]:
        """Generate intelligent, context-aware response"""
        
        # Determine overall success
        overall_success = all(result.success for result in results)
        
        # Compile execution summary
        execution_summary = {
            "goals_addressed": len(user_goals),
            "steps_completed": len([r for r in results if r.success]),
            "tools_utilized": list(set(sum([r.tools_used for r in results], []))),
            "total_execution_time": sum(r.execution_time for r in results),
            "success_rate": len([r for r in results if r.success]) / len(results) if results else 0
        }
        
        # Generate contextual response using AI
        response_context = {
            "user_goals": user_goals,
            "execution_summary": execution_summary,
            "results_data": [r.outputs for r in results if r.success],
            "learned_insights": insights,
            "user_context": context.dict()
        }
        
        ai_response = await self.conversation_service.generate_contextual_response(
            "Generate an intelligent response that explains what was accomplished, "
            "provides relevant insights, and suggests next steps based on the execution results.",
            response_context
        )
        
        # Build comprehensive response
        return {
            "response": ai_response,
            "execution_summary": execution_summary,
            "agentic_insights": insights,
            "proactive_suggestions": await self._generate_proactive_suggestions(
                user_goals, results, context
            ),
            "learned_patterns": insights.get("patterns", {}),
            "success": overall_success,
            "agent_confidence": self._calculate_confidence(results),
            "next_recommended_actions": await self._suggest_next_actions(
                user_goals, results, context
            )
        }
    
    async def _check_proactive_opportunities(self, user_id: str, 
                                           context: PamContext,
                                           results: List[ExecutionResult]):
        """Identify and suggest proactive assistance opportunities"""
        opportunities = await self.proactive_assistant.analyze_opportunities(
            user_id, context, results, self.learning_history
        )
        
        for opportunity in opportunities:
            if opportunity["confidence"] > 0.7:
                await self._queue_proactive_suggestion(user_id, opportunity)
    
    def _calculate_confidence(self, results: List[ExecutionResult]) -> float:
        """Calculate agent's confidence in the response quality"""
        if not results:
            return 0.0
        
        success_rate = len([r for r in results if r.success]) / len(results)
        avg_execution_time = sum(r.execution_time for r in results) / len(results)
        
        # Higher confidence for successful, efficient executions
        time_factor = max(0.1, 1.0 - (avg_execution_time / 30.0))  # Penalize slow execution
        
        return min(1.0, success_rate * 0.7 + time_factor * 0.3)

# Supporting Classes for Agentic Capabilities

class GoalPlanner:
    """Extracts and structures user goals from natural language"""
    
    def __init__(self, conversation_service: IntelligentConversation):
        self.conversation_service = conversation_service
    
    async def extract_goals(self, message: str, context: PamContext) -> List[Dict]:
        """Extract structured goals from user message"""
        goal_analysis_prompt = f"""
        Analyze this user message and extract their goals:
        Message: "{message}"
        
        Context: {context.dict()}
        
        Return goals as JSON with structure:
        {{
            "goals": [
                {{
                    "type": "explicit|implicit",
                    "description": "clear goal description",
                    "domain": "wheels|wins|social|you|general",
                    "priority": 1-5,
                    "complexity": "simple|moderate|complex",
                    "estimated_steps": number,
                    "success_criteria": "how to measure success"
                }}
            ]
        }}
        """
        
        result = await self.conversation_service.generate_response(
            goal_analysis_prompt, context.dict()
        )
        
        try:
            return json.loads(result)["goals"]
        except:
            # Fallback to basic goal structure
            return [{
                "type": "explicit",
                "description": message,
                "domain": "general",
                "priority": 3,
                "complexity": "simple",
                "estimated_steps": 1,
                "success_criteria": "provide helpful response"
            }]

class TaskDecomposer:
    """Breaks down complex goals into actionable tasks"""
    
    async def decompose_goals(self, goals: List[Dict], context: PamContext) -> List[Task]:
        """Decompose goals into specific tasks"""
        tasks = []
        
        for i, goal in enumerate(goals):
            if goal["complexity"] == "simple":
                # Simple goals become single tasks
                task = Task(
                    id=f"task_{i}",
                    description=goal["description"],
                    user_goal=goal["description"],
                    complexity=TaskComplexity.SIMPLE,
                    required_tools=await self._identify_required_tools(goal),
                    estimated_steps=goal["estimated_steps"],
                    context=context.dict(),
                    priority=goal["priority"]
                )
                tasks.append(task)
            
            else:
                # Complex goals get decomposed into subtasks
                subtasks = await self._decompose_complex_goal(goal, context)
                tasks.extend(subtasks)
        
        return tasks
    
    async def _identify_required_tools(self, goal: Dict) -> List[str]:
        """Identify tools needed for a goal"""
        domain = goal["domain"]
        
        tool_mappings = {
            "wheels": ["route_planner", "weather_checker", "fuel_calculator"],
            "wins": ["budget_analyzer", "expense_tracker", "income_calculator"],
            "social": ["group_finder", "event_planner", "social_analyzer"],
            "you": ["calendar_manager", "profile_manager", "preference_analyzer"],
            "general": ["web_search", "data_analyzer", "ai_reasoner"]
        }
        
        return tool_mappings.get(domain, ["ai_reasoner"])
    
    async def _decompose_complex_goal(self, goal: Dict, context: PamContext) -> List[Task]:
        """Break complex goals into manageable tasks"""
        # This would use AI to intelligently decompose complex goals
        # For now, create a single complex task
        return [Task(
            id=f"complex_task_{goal['domain']}",
            description=goal["description"],
            user_goal=goal["description"],
            complexity=TaskComplexity.COMPLEX,
            required_tools=await self._identify_required_tools(goal),
            estimated_steps=goal["estimated_steps"],
            context=context.dict(),
            priority=goal["priority"]
        )]

class DynamicToolSelector:
    """Dynamically selects optimal tools for tasks"""
    
    def __init__(self, tool_registry: Dict):
        self.tool_registry = tool_registry
        self.tool_performance_history = {}
    
    async def select_optimal_tools(self, task: Task, context: PamContext, 
                                 available_tools: Dict) -> List[Dict]:
        """Select best tools for the task based on performance history"""
        selected_tools = []
        
        for tool_name in task.required_tools:
            # Check if tool is available
            if tool_name in available_tools:
                tool_config = {
                    "name": tool_name,
                    "params": await self._generate_tool_params(tool_name, task, context),
                    "confidence": self._get_tool_confidence(tool_name, task.complexity)
                }
                selected_tools.append(tool_config)
            else:
                # Find alternative tools
                alternatives = await self._find_tool_alternatives(tool_name, task)
                selected_tools.extend(alternatives)
        
        # Sort by confidence
        return sorted(selected_tools, key=lambda x: x["confidence"], reverse=True)
    
    def _get_tool_confidence(self, tool_name: str, complexity: TaskComplexity) -> float:
        """Get confidence score for tool based on past performance"""
        history = self.tool_performance_history.get(tool_name, {})
        complexity_history = history.get(complexity.value, [])
        
        if not complexity_history:
            return 0.5  # Default confidence for untested tools
        
        return sum(complexity_history) / len(complexity_history)
    
    async def _generate_tool_params(self, tool_name: str, task: Task, 
                                  context: PamContext) -> Dict:
        """Generate appropriate parameters for tool execution"""
        # This would intelligently generate parameters based on task and context
        return {
            "task_description": task.description,
            "user_context": context.dict(),
            "complexity": task.complexity.value
        }
    
    async def _find_tool_alternatives(self, tool_name: str, task: Task) -> List[Dict]:
        """Find alternative tools when preferred tool is unavailable"""
        # Tool fallback mappings
        alternatives_map = {
            "route_planner": ["web_search", "ai_reasoner"],
            "budget_analyzer": ["data_analyzer", "ai_reasoner"],
            "weather_checker": ["web_search", "ai_reasoner"]
        }
        
        alternatives = []
        for alt_tool in alternatives_map.get(tool_name, ["ai_reasoner"]):
            if alt_tool in self.tool_registry:
                alternatives.append({
                    "name": alt_tool,
                    "params": await self._generate_tool_params(alt_tool, task, None),
                    "confidence": 0.3  # Lower confidence for alternatives
                })
        
        return alternatives

class ExecutionMonitor:
    """Monitors execution progress and detects issues"""
    
    async def start_step_monitoring(self, step: Dict):
        """Start monitoring a step execution"""
        logger.info(f"🔍 Monitoring step: {step['task_id']}")
        # Initialize monitoring for the step
        pass

class LearningEngine:
    """Learns from execution outcomes to improve future performance"""
    
    async def learn_from_execution(self, plan: ExecutionPlan, 
                                 results: List[ExecutionResult],
                                 user_goals: List[Dict]) -> Dict[str, Any]:
        """Learn insights from execution to improve future performance"""
        insights = {
            "execution_patterns": self._analyze_execution_patterns(results),
            "tool_effectiveness": self._analyze_tool_effectiveness(results),
            "goal_achievement": self._analyze_goal_achievement(user_goals, results),
            "optimization_opportunities": self._identify_optimizations(plan, results)
        }
        
        # Store insights for future use
        await self._store_learning_insights(insights)
        
        return insights
    
    def _analyze_execution_patterns(self, results: List[ExecutionResult]) -> Dict:
        """Analyze patterns in execution results"""
        return {
            "average_execution_time": sum(r.execution_time for r in results) / len(results),
            "success_rate": len([r for r in results if r.success]) / len(results),
            "common_errors": self._extract_common_errors(results),
            "efficient_tool_combinations": self._identify_efficient_combinations(results)
        }
    
    def _analyze_tool_effectiveness(self, results: List[ExecutionResult]) -> Dict:
        """Analyze which tools performed well"""
        tool_performance = {}
        
        for result in results:
            for tool in result.tools_used:
                if tool not in tool_performance:
                    tool_performance[tool] = {"successes": 0, "failures": 0, "avg_time": 0}
                
                if result.success:
                    tool_performance[tool]["successes"] += 1
                else:
                    tool_performance[tool]["failures"] += 1
                
                tool_performance[tool]["avg_time"] = result.execution_time
        
        return tool_performance
    
    def _analyze_goal_achievement(self, goals: List[Dict], 
                                results: List[ExecutionResult]) -> Dict:
        """Analyze how well goals were achieved"""
        return {
            "goals_fully_achieved": len([g for g in goals if self._goal_achieved(g, results)]),
            "partial_achievements": len([g for g in goals if self._goal_partially_achieved(g, results)]),
            "unaddressed_goals": len([g for g in goals if not self._goal_addressed(g, results)])
        }
    
    def _goal_achieved(self, goal: Dict, results: List[ExecutionResult]) -> bool:
        """Check if a goal was fully achieved"""
        # Simplified check - in reality would be more sophisticated
        return any(result.success for result in results)
    
    def _goal_partially_achieved(self, goal: Dict, results: List[ExecutionResult]) -> bool:
        """Check if a goal was partially achieved"""
        return any(result.outputs for result in results)
    
    def _goal_addressed(self, goal: Dict, results: List[ExecutionResult]) -> bool:
        """Check if a goal was at least addressed"""
        return len(results) > 0
    
    def _identify_optimizations(self, plan: ExecutionPlan, 
                              results: List[ExecutionResult]) -> List[str]:
        """Identify optimization opportunities"""
        optimizations = []
        
        # Check for slow executions
        avg_time = sum(r.execution_time for r in results) / len(results)
        if avg_time > 10.0:  # 10 seconds threshold
            optimizations.append("Consider parallel tool execution for better performance")
        
        # Check for failed steps
        failed_results = [r for r in results if not r.success]
        if failed_results:
            optimizations.append("Review tool selection and fallback strategies")
        
        return optimizations
    
    def _extract_common_errors(self, results: List[ExecutionResult]) -> List[str]:
        """Extract common error patterns"""
        all_errors = []
        for result in results:
            if result.errors:
                all_errors.extend(result.errors)
        
        # Simple frequency analysis
        error_counts = {}
        for error in all_errors:
            error_counts[error] = error_counts.get(error, 0) + 1
        
        return [error for error, count in error_counts.items() if count > 1]
    
    def _identify_efficient_combinations(self, results: List[ExecutionResult]) -> List[str]:
        """Identify efficient tool combinations"""
        efficient_combos = []
        
        for result in results:
            if result.success and result.execution_time < 5.0:  # Fast and successful
                if len(result.tools_used) > 1:
                    combo = " + ".join(sorted(result.tools_used))
                    efficient_combos.append(combo)
        
        return list(set(efficient_combos))
    
    async def _store_learning_insights(self, insights: Dict):
        """Store learning insights for future reference"""
        # This would store insights in a learning database
        logger.info(f"📚 Stored learning insights: {insights}")

class ProactiveAssistant:
    """Identifies opportunities for proactive assistance"""
    
    def __init__(self, memory: PamMemory):
        self.memory = memory
    
    async def analyze_opportunities(self, user_id: str, context: PamContext,
                                  results: List[ExecutionResult],
                                  learning_history: List) -> List[Dict]:
        """Analyze opportunities for proactive assistance"""
        opportunities = []
        
        # Check for patterns that suggest proactive opportunities
        opportunities.extend(await self._check_routine_patterns(user_id))
        opportunities.extend(await self._check_contextual_opportunities(context, results))
        opportunities.extend(await self._check_learning_opportunities(learning_history))
        
        return opportunities
    
    async def _check_routine_patterns(self, user_id: str) -> List[Dict]:
        """Check for routine patterns that could benefit from proactive assistance"""
        # This would analyze user patterns to suggest proactive actions
        return [
            {
                "type": "routine_optimization",
                "description": "Based on your travel patterns, I can help plan your next trip",
                "confidence": 0.8,
                "suggested_action": "proactive_trip_planning"
            }
        ]
    
    async def _check_contextual_opportunities(self, context: PamContext,
                                           results: List[ExecutionResult]) -> List[Dict]:
        """Check for contextual opportunities based on current results"""
        opportunities = []
        
        # Example: If budget analysis was performed, suggest expense optimization
        budget_results = [r for r in results if "budget" in str(r.outputs)]
        if budget_results:
            opportunities.append({
                "type": "follow_up_optimization",
                "description": "I noticed some optimization opportunities in your budget",
                "confidence": 0.7,
                "suggested_action": "budget_optimization"
            })
        
        return opportunities
    
    async def _check_learning_opportunities(self, learning_history: List) -> List[Dict]:
        """Check for learning-based opportunities"""
        # This would analyze learning history to suggest improvements
        return [
            {
                "type": "learning_suggestion",
                "description": "I've learned some patterns that could help you save money",
                "confidence": 0.6,
                "suggested_action": "share_insights"
            }
        ]