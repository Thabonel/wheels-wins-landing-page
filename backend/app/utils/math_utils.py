"""Basic arithmetic utility functions."""

from __future__ import annotations


def add(a: float, b: float) -> float:
    """Return the sum of ``a`` and ``b``."""
    return a + b


def subtract(a: float, b: float) -> float:
    """Return the difference of ``a`` and ``b``."""
    return a - b


def multiply(a: float, b: float) -> float:
    """Return the product of ``a`` and ``b``."""
    return a * b


def divide(a: float, b: float) -> float:
    """Return the quotient of ``a`` and ``b``.

    Raises
    ------
    ValueError
        If ``b`` is ``0``.
    """
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b
