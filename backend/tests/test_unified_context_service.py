"""Tests for UnifiedContextService - cross-feature AI context compilation."""
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.pam.context.unified_context_service import (
    CompiledUserContext,
    ContextDomain,
    UnifiedContextService,
)


@pytest.fixture
def user_id():
    return str(uuid.uuid4())


@pytest.fixture
def mock_financial_service():
    service = AsyncMock()
    service.get_financial_context.return_value = {
        "total_budget": 3000.0,
        "total_spent": 1800.0,
        "remaining_budget": 1200.0,
        "budget_utilization": 60.0,
        "top_categories": [
            {"category": "fuel", "amount": 800.0},
            {"category": "food", "amount": 500.0},
            {"category": "camping", "amount": 500.0},
        ],
        "over_budget_categories": ["dining_out"],
    }
    return service


@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client with chained query support for medical_records."""
    client = MagicMock()
    table_mock = MagicMock()
    client.table.return_value = table_mock
    table_mock.select.return_value = table_mock
    table_mock.eq.return_value = table_mock
    table_mock.order.return_value = table_mock
    table_mock.limit.return_value = table_mock

    execute_result = MagicMock()
    execute_result.data = [
        {"condition_name": "Type 2 Diabetes", "severity": "moderate"},
        {"condition_name": "Hypertension", "severity": "mild"},
    ]
    table_mock.execute.return_value = execute_result

    return client


@pytest.fixture
def location_data():
    return {"city": "Sedona", "lat": 34.8697, "lng": -111.7610}


@pytest.mark.asyncio
async def test_compile_context_returns_all_domains(
    user_id, mock_financial_service, mock_supabase_client, location_data
):
    """All four domain fields should be populated when services return data."""
    service = UnifiedContextService(
        financial_service=mock_financial_service,
        supabase_client=mock_supabase_client,
    )

    ctx = await service.compile_context(user_id, location=location_data)

    assert ctx.user_id == user_id
    assert ctx.financial is not None
    assert ctx.location is not None
    assert ctx.location["city"] == "Sedona"
    assert ctx.medical is not None
    assert len(ctx.medical["conditions"]) == 2
    # Social is passthrough None for now (no social service wired)
    assert ctx.social is None


@pytest.mark.asyncio
async def test_compile_context_generates_prompt_snippet(
    user_id, mock_financial_service, mock_supabase_client, location_data
):
    """Prompt snippet should contain financial and medical sections with real values."""
    service = UnifiedContextService(
        financial_service=mock_financial_service,
        supabase_client=mock_supabase_client,
    )

    ctx = await service.compile_context(user_id, location=location_data)
    snippet = ctx.to_prompt_snippet()

    # Financial section checks
    assert "FINANCIAL CONTEXT:" in snippet
    assert "$1,200" in snippet  # remaining budget (comma-formatted)
    assert "60%" in snippet  # utilization %
    assert "fuel" in snippet
    assert "dining_out" in snippet  # over-budget category

    # Location section checks
    assert "LOCATION CONTEXT:" in snippet
    assert "Sedona" in snippet

    # Medical section checks
    assert "MEDICAL CONTEXT:" in snippet
    assert "Type 2 Diabetes" in snippet
    assert "health needs" in snippet.lower()


@pytest.mark.asyncio
async def test_compile_context_handles_missing_financial(
    user_id, mock_supabase_client, location_data
):
    """When financial service raises an exception, financial should be None and snippet should omit the section."""
    failing_financial = AsyncMock()
    failing_financial.get_financial_context.side_effect = Exception(
        "Redis connection refused"
    )

    service = UnifiedContextService(
        financial_service=failing_financial,
        supabase_client=mock_supabase_client,
    )

    ctx = await service.compile_context(user_id, location=location_data)

    assert ctx.financial is None
    snippet = ctx.to_prompt_snippet()
    assert "FINANCIAL CONTEXT:" not in snippet
    # Other sections should still be present
    assert "LOCATION CONTEXT:" in snippet
    assert "MEDICAL CONTEXT:" in snippet


@pytest.mark.asyncio
async def test_compile_specific_domains(
    user_id, mock_financial_service, mock_supabase_client, location_data
):
    """When specific domains are requested, only those should be compiled."""
    service = UnifiedContextService(
        financial_service=mock_financial_service,
        supabase_client=mock_supabase_client,
    )

    ctx = await service.compile_context(
        user_id,
        location=location_data,
        domains=[ContextDomain.FINANCIAL],
    )

    assert ctx.financial is not None
    assert ctx.medical is None
    assert ctx.location is None
    assert ctx.social is None
