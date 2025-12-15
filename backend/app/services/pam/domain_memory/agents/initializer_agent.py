"""
Initializer Agent for Domain Memory System.

Runs ONCE per task to bootstrap all artifacts:
- Parse user request into structured intent
- Break down into work items
- Define success criteria
- Set constraints
- Create test cases
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from ..models import (
    BudgetConstraint,
    DomainMemoryResponse,
    DomainTask,
    EntryType,
    ParsedIntent,
    ScopeConstraint,
    SuccessCriterion,
    TaskConstraints,
    TaskDefinition,
    TaskScope,
    TaskState,
    TaskStatus,
    TaskType,
    TestCase,
    TestCriteria,
    TimeConstraint,
    WorkItem,
    WorkItemStatus,
)
from ..storage.database_store import DomainMemoryStore
from .base_agent import BaseAgent

logger = logging.getLogger(__name__)


INITIALIZER_SYSTEM_PROMPT = """You are a task planning agent for PAM (Personal AI Manager), an RV travel assistant.

Your job is to analyze a user's request and create a structured execution plan.

You must output a valid JSON object with the following structure:
{
    "parsed_intent": {
        "goal": "The main goal of the request",
        "sub_goals": ["List of sub-goals to achieve"],
        "deliverables": ["List of expected outputs"],
        "extracted_constraints": {
            "budget": null or number,
            "deadline": null or ISO date string,
            "locations": [],
            "preferences": {}
        },
        "confidence_score": 0.0 to 1.0
    },
    "work_items": [
        {
            "id": "unique_id",
            "description": "What this work item does",
            "action_type": "tool_name or action type",
            "parameters": {},
            "depends_on": ["list of work item ids this depends on"],
            "estimated_effort": "low/medium/high"
        }
    ],
    "success_criteria": [
        {
            "id": "unique_id",
            "description": "What defines success",
            "how_to_verify": "How to check if this is met"
        }
    ],
    "constraints": {
        "budget": {
            "max_budget": null or number,
            "currency": "USD",
            "categories": {}
        },
        "time": {
            "deadline": null or ISO date string,
            "max_duration_hours": null or number,
            "preferred_times": []
        },
        "scope": {
            "included_regions": [],
            "excluded_regions": [],
            "included_categories": [],
            "excluded_categories": [],
            "custom_filters": {}
        },
        "safety_rules": ["List of safety rules to follow"]
    },
    "test_cases": [
        {
            "id": "unique_id",
            "description": "What this test validates",
            "work_item_id": "related work item id or null",
            "steps": ["Step 1", "Step 2"],
            "expected_outcome": "What should happen"
        }
    ]
}

Guidelines:
1. Break complex requests into atomic, executable work items
2. Identify dependencies between work items
3. Create measurable success criteria
4. Extract implicit constraints from the request
5. Design test cases to validate the work
6. Use action_type values that match available PAM tools when possible

Available action types for RV travel:
- plan_trip: Route planning
- find_rv_parks: Search campgrounds
- calculate_gas_cost: Estimate fuel costs
- find_cheap_gas: Locate gas stations
- get_weather_forecast: Weather data
- optimize_route: Route optimization
- create_expense: Log expenses
- analyze_budget: Budget analysis
- search_products: Shop for RV gear
- create_post: Social sharing
- custom: Any other action

Output ONLY valid JSON, no other text."""


class InitializerAgent(BaseAgent):
    """
    Initializer Agent - Runs ONCE to bootstrap a new task.

    Responsibilities:
    1. Parse user request using Claude
    2. Create structured work breakdown
    3. Define success criteria
    4. Set up constraints
    5. Create test cases
    6. Store all artifacts in database
    """

    async def run(
        self,
        user_id: UUID,
        request: str,
        task_type: TaskType = TaskType.CUSTOM,
        scope: TaskScope = TaskScope.USER,
        priority: int = 5,
        constraints: Optional[Dict[str, Any]] = None,
    ) -> DomainMemoryResponse:
        """
        Initialize a new domain memory task.

        Args:
            user_id: User who owns the task
            request: Natural language request
            task_type: Type of task
            scope: User or system scope
            priority: Task priority (1-10)
            constraints: Optional pre-defined constraints

        Returns:
            DomainMemoryResponse with task_id and status
        """
        worker_run_id = uuid4()
        task_id = None

        try:
            task = await self.store.create_task(
                user_id=user_id,
                task_type=task_type,
                scope=scope,
                priority=priority,
            )
            task_id = task.id

            await self.update_task_status(task_id, TaskStatus.INITIALIZING)

            await self.log_progress(
                task_id=task_id,
                worker_run_id=worker_run_id,
                entry_type=EntryType.ACTION,
                content=f"Starting initialization for request: {request[:100]}...",
            )

            plan = await self._generate_plan(request, constraints)

            if not plan:
                raise ValueError("Failed to generate execution plan")

            await self.log_progress(
                task_id=task_id,
                worker_run_id=worker_run_id,
                entry_type=EntryType.DECISION,
                content=f"Generated plan with {len(plan.get('work_items', []))} work items",
                metadata={"plan_summary": plan.get("parsed_intent", {}).get("goal")},
            )

            definition = await self._create_definition(task_id, request, plan)
            state = await self.store.create_state(task_id)
            task_constraints = await self._create_constraints(task_id, plan, constraints)
            tests = await self._create_tests(task_id, plan)

            await self.update_task_status(task_id, TaskStatus.PENDING)

            await self.log_progress(
                task_id=task_id,
                worker_run_id=worker_run_id,
                entry_type=EntryType.MILESTONE,
                content="Task initialization complete. Ready for worker execution.",
                metadata={
                    "work_items_count": len(definition.work_items),
                    "success_criteria_count": len(definition.success_criteria),
                    "test_cases_count": len(tests.test_cases),
                },
            )

            return DomainMemoryResponse(
                success=True,
                task_id=task_id,
                message="Task initialized successfully",
                data={
                    "task_type": task_type.value,
                    "work_items_count": len(definition.work_items),
                    "success_criteria_count": len(definition.success_criteria),
                    "goal": definition.parsed_intent.goal,
                },
            )

        except Exception as e:
            logger.error(f"Initialization failed: {e}")

            if task_id:
                await self.update_task_status(
                    task_id, TaskStatus.FAILED, str(e)
                )
                await self.log_progress(
                    task_id=task_id,
                    worker_run_id=worker_run_id,
                    entry_type=EntryType.ERROR,
                    content=f"Initialization failed: {str(e)}",
                )

            return DomainMemoryResponse(
                success=False,
                task_id=task_id,
                message=f"Initialization failed: {str(e)}",
                errors=[str(e)],
            )

    async def _generate_plan(
        self,
        request: str,
        constraints: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Use Claude to generate an execution plan.

        Args:
            request: User's natural language request
            constraints: Optional pre-defined constraints

        Returns:
            Parsed plan dictionary
        """
        user_message = f"Create an execution plan for this request:\n\n{request}"

        if constraints:
            user_message += f"\n\nPre-defined constraints:\n{json.dumps(constraints, indent=2)}"

        messages = [{"role": "user", "content": user_message}]

        response = await self.call_claude(
            system_prompt=INITIALIZER_SYSTEM_PROMPT,
            messages=messages,
            max_tokens=4096,
            temperature=0.3,
        )

        try:
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                return json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response as JSON: {e}")
            logger.debug(f"Response was: {response}")

        return self._create_fallback_plan(request)

    def _create_fallback_plan(self, request: str) -> Dict[str, Any]:
        """Create a minimal fallback plan if Claude fails."""
        return {
            "parsed_intent": {
                "goal": request[:200],
                "sub_goals": [],
                "deliverables": ["Complete the requested task"],
                "extracted_constraints": {},
                "confidence_score": 0.5,
            },
            "work_items": [
                {
                    "id": "wi_1",
                    "description": request[:200],
                    "action_type": "custom",
                    "parameters": {"original_request": request},
                    "depends_on": [],
                    "estimated_effort": "medium",
                }
            ],
            "success_criteria": [
                {
                    "id": "sc_1",
                    "description": "Task completed as requested",
                    "how_to_verify": "User confirms satisfaction",
                }
            ],
            "constraints": {
                "budget": None,
                "time": None,
                "scope": None,
                "safety_rules": [],
            },
            "test_cases": [
                {
                    "id": "tc_1",
                    "description": "Basic completion test",
                    "work_item_id": "wi_1",
                    "steps": ["Execute the task", "Verify completion"],
                    "expected_outcome": "Task completes without errors",
                }
            ],
        }

    async def _create_definition(
        self,
        task_id: UUID,
        request: str,
        plan: Dict[str, Any],
    ) -> TaskDefinition:
        """Create task definition from plan."""
        intent_data = plan.get("parsed_intent", {})
        parsed_intent = ParsedIntent(
            goal=intent_data.get("goal", request[:200]),
            sub_goals=intent_data.get("sub_goals", []),
            deliverables=intent_data.get("deliverables", []),
            extracted_constraints=intent_data.get("extracted_constraints", {}),
            confidence_score=intent_data.get("confidence_score", 0.5),
        )

        work_items = []
        for wi_data in plan.get("work_items", []):
            work_items.append(WorkItem(
                id=wi_data.get("id", f"wi_{len(work_items)+1}"),
                description=wi_data.get("description", ""),
                status=WorkItemStatus.PENDING,
                action_type=wi_data.get("action_type"),
                parameters=wi_data.get("parameters", {}),
                depends_on=wi_data.get("depends_on", []),
                estimated_effort=wi_data.get("estimated_effort"),
            ))

        success_criteria = []
        for sc_data in plan.get("success_criteria", []):
            success_criteria.append(SuccessCriterion(
                id=sc_data.get("id", f"sc_{len(success_criteria)+1}"),
                description=sc_data.get("description", ""),
                how_to_verify=sc_data.get("how_to_verify", ""),
            ))

        return await self.store.create_definition(
            task_id=task_id,
            original_request=request,
            parsed_intent=parsed_intent,
            work_items=work_items,
            success_criteria=success_criteria,
        )

    async def _create_constraints(
        self,
        task_id: UUID,
        plan: Dict[str, Any],
        user_constraints: Optional[Dict[str, Any]] = None,
    ) -> TaskConstraints:
        """Create task constraints from plan and user input."""
        plan_constraints = plan.get("constraints", {})

        budget = plan_constraints.get("budget")
        budget_constraint = None
        if budget and isinstance(budget, dict) and budget.get("max_budget"):
            budget_constraint = BudgetConstraint(
                max_budget=budget.get("max_budget"),
                currency=budget.get("currency", "USD"),
                categories=budget.get("categories", {}),
            )

        time = plan_constraints.get("time")
        time_constraint = None
        if time and isinstance(time, dict):
            deadline = time.get("deadline")
            time_constraint = TimeConstraint(
                deadline=datetime.fromisoformat(deadline) if deadline else None,
                max_duration_hours=time.get("max_duration_hours"),
                preferred_times=time.get("preferred_times", []),
            )

        scope = plan_constraints.get("scope")
        scope_constraint = None
        if scope and isinstance(scope, dict):
            scope_constraint = ScopeConstraint(
                included_regions=scope.get("included_regions", []),
                excluded_regions=scope.get("excluded_regions", []),
                included_categories=scope.get("included_categories", []),
                excluded_categories=scope.get("excluded_categories", []),
                custom_filters=scope.get("custom_filters", {}),
            )

        safety_rules = plan_constraints.get("safety_rules", [])

        if user_constraints:
            if user_constraints.get("budget") and not budget_constraint:
                budget_constraint = BudgetConstraint(**user_constraints["budget"])
            if user_constraints.get("time") and not time_constraint:
                time_constraint = TimeConstraint(**user_constraints["time"])
            if user_constraints.get("safety_rules"):
                safety_rules.extend(user_constraints["safety_rules"])

        return await self.store.create_constraints(
            task_id=task_id,
            budget_constraints=budget_constraint,
            time_constraints=time_constraint,
            scope_constraints=scope_constraint,
            safety_rules=safety_rules,
        )

    async def _create_tests(
        self,
        task_id: UUID,
        plan: Dict[str, Any],
    ) -> TestCriteria:
        """Create test criteria from plan."""
        test_cases = []
        for tc_data in plan.get("test_cases", []):
            test_cases.append(TestCase(
                id=tc_data.get("id", f"tc_{len(test_cases)+1}"),
                description=tc_data.get("description", ""),
                work_item_id=tc_data.get("work_item_id"),
                steps=tc_data.get("steps", []),
                expected_outcome=tc_data.get("expected_outcome", ""),
            ))

        return await self.store.create_tests(
            task_id=task_id,
            test_cases=test_cases,
            validation_queries=[],
        )
