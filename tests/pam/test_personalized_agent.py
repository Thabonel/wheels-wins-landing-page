"""Tests for PersonalizedPamAgent - verifies initialization and tool registry integration"""
import sys
import os
import asyncio

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")


def test_agent_initializes():
    """PersonalizedPamAgent must initialize without errors"""
    from app.core.personalized_pam_agent import PersonalizedPamAgent
    agent = PersonalizedPamAgent()
    assert agent is not None
    assert agent.tool_registry is not None


def test_agent_has_ensure_registry():
    """Agent must have async _ensure_registry_initialized method"""
    from app.core.personalized_pam_agent import PersonalizedPamAgent
    agent = PersonalizedPamAgent()
    assert hasattr(agent, '_ensure_registry_initialized')
    assert asyncio.iscoroutinefunction(agent._ensure_registry_initialized)


def test_agent_registry_starts_empty():
    """Before initialization, registry should have 0 tools"""
    from app.core.personalized_pam_agent import PersonalizedPamAgent
    agent = PersonalizedPamAgent()
    # Fresh registry has no tools until async init
    assert len(agent.tool_registry.get_all_tools()) == 0
    assert not agent._registry_initialized


def test_agent_lazy_init_loads_tools():
    """After _ensure_registry_initialized, registry should have 50+ tools"""
    from app.core.personalized_pam_agent import PersonalizedPamAgent

    agent = PersonalizedPamAgent()
    asyncio.get_event_loop().run_until_complete(
        agent._ensure_registry_initialized()
    )

    tools = agent.tool_registry.get_all_tools()
    assert len(tools) > 50, f"Expected >50 tools after init, got {len(tools)}"
    assert agent._registry_initialized

    functions = agent.tool_registry.get_openai_functions()
    assert len(functions) > 50, f"Expected >50 functions, got {len(functions)}"


def test_agent_lazy_init_idempotent():
    """Calling _ensure_registry_initialized twice should not re-initialize"""
    from app.core.personalized_pam_agent import PersonalizedPamAgent

    agent = PersonalizedPamAgent()
    loop = asyncio.get_event_loop()
    loop.run_until_complete(agent._ensure_registry_initialized())
    count1 = len(agent.tool_registry.get_all_tools())

    loop.run_until_complete(agent._ensure_registry_initialized())
    count2 = len(agent.tool_registry.get_all_tools())

    assert count1 == count2, "Second init should not change tool count"


def test_agent_has_key_tools_after_init():
    """After init, registry should contain key tools (plan_trip, analyze_budget, etc.)"""
    from app.core.personalized_pam_agent import PersonalizedPamAgent

    agent = PersonalizedPamAgent()
    asyncio.get_event_loop().run_until_complete(
        agent._ensure_registry_initialized()
    )

    tool_names = set(agent.tool_registry.get_all_tools().keys())
    assert "plan_trip" in tool_names
    assert "analyze_budget" in tool_names
    assert "calculate_gas_cost" in tool_names
    assert "find_rv_parks" in tool_names
    assert "create_calendar_event" in tool_names
