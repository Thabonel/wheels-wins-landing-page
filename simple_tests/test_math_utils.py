import pytest

from app.utils.math_utils import add, subtract, multiply, divide

@pytest.mark.parametrize("a,b,expected", [
    (1, 2, 3),
    (-1, -1, -2),
    (0, 5, 5),
])
def test_add(a, b, expected):
    assert add(a, b) == expected


@pytest.mark.parametrize("a,b,expected", [
    (5, 2, 3),
    (-1, -1, 0),
    (0, 5, -5),
])
def test_subtract(a, b, expected):
    assert subtract(a, b) == expected


@pytest.mark.parametrize("a,b,expected", [
    (2, 3, 6),
    (-1, 5, -5),
    (0, 5, 0),
])
def test_multiply(a, b, expected):
    assert multiply(a, b) == expected


def test_divide():
    assert divide(10, 2) == 5
    with pytest.raises(ValueError):
        divide(1, 0)
