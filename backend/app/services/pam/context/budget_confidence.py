"""Budget prediction confidence intervals.

Enriches raw linear projections with uncertainty ranges so AI responses
communicate estimates rather than definitive predictions.
"""

from typing import Dict, Any


def add_confidence_intervals(prediction: Dict[str, Any]) -> Dict[str, Any]:
    """Add low/mid/high confidence intervals to a budget prediction.

    Uses a variance that grows with the time horizon since uncertainty
    compounds over time. Base variance is 10%, scaling up to 20% at 30 days.
    """
    projected = prediction.get("projected_spend", 0)
    days_remaining = prediction.get("days_remaining", 1)

    base_variance = 0.10
    time_factor = min(days_remaining / 30, 1.0)
    variance = base_variance + (0.10 * time_factor)

    result = dict(prediction)
    result["confidence"] = {
        "low": round(projected * (1 - variance), 2),
        "mid": round(projected, 2),
        "high": round(projected * (1 + variance), 2),
    }
    result["disclaimer"] = (
        f"This is an estimate based on your recent spending patterns. "
        f"Actual spending may range from ${result['confidence']['low']:.0f} "
        f"to ${result['confidence']['high']:.0f}."
    )
    return result
