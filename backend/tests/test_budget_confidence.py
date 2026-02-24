"""Tests for budget prediction confidence intervals."""
import pytest


def test_prediction_includes_confidence_range():
    """Budget predictions should include low/mid/high estimates."""
    from app.services.pam.context.budget_confidence import add_confidence_intervals

    prediction = {
        "projected_spend": 1800.0,
        "daily_rate": 60.0,
        "days_remaining": 10,
    }
    enriched = add_confidence_intervals(prediction)

    assert "confidence" in enriched
    assert enriched["confidence"]["low"] < enriched["confidence"]["mid"]
    assert enriched["confidence"]["mid"] < enriched["confidence"]["high"]
    assert enriched["confidence"]["mid"] == pytest.approx(1800.0, rel=0.01)


def test_prediction_includes_disclaimer():
    """Budget predictions should include a human-readable disclaimer."""
    from app.services.pam.context.budget_confidence import add_confidence_intervals

    prediction = {"projected_spend": 1800.0, "daily_rate": 60.0, "days_remaining": 10}
    enriched = add_confidence_intervals(prediction)

    assert "disclaimer" in enriched
    assert "estimate" in enriched["disclaimer"].lower()


def test_confidence_range_grows_with_time():
    """Longer time horizons should have wider confidence ranges."""
    from app.services.pam.context.budget_confidence import add_confidence_intervals

    short = add_confidence_intervals({"projected_spend": 1000.0, "days_remaining": 1})
    long = add_confidence_intervals({"projected_spend": 1000.0, "days_remaining": 30})

    short_range = short["confidence"]["high"] - short["confidence"]["low"]
    long_range = long["confidence"]["high"] - long["confidence"]["low"]
    assert long_range > short_range


def test_original_prediction_fields_preserved():
    """Enrichment should not remove original prediction fields."""
    from app.services.pam.context.budget_confidence import add_confidence_intervals

    prediction = {"projected_spend": 500.0, "daily_rate": 50.0, "days_remaining": 5}
    enriched = add_confidence_intervals(prediction)

    assert enriched["projected_spend"] == 500.0
    assert enriched["daily_rate"] == 50.0
    assert enriched["days_remaining"] == 5


def test_zero_projected_spend():
    """Should handle zero projected spend gracefully."""
    from app.services.pam.context.budget_confidence import add_confidence_intervals

    enriched = add_confidence_intervals({"projected_spend": 0, "days_remaining": 10})
    assert enriched["confidence"]["low"] == 0
    assert enriched["confidence"]["mid"] == 0
    assert enriched["confidence"]["high"] == 0
